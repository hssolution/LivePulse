import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * 청중 원-앱 단일 폴링 훅 (PRD §6 — 신호·동기화 모델)
 *
 * sp_live_state_q 하나를 단일 인터벌로 폴링한다.
 * - 기본 4.5초, mode=pdf(강연 장면) 동안 2초 (페이지 추종 p95 ≤ 3초)
 * - 폴링 지터 ±15% (동기화된 요청 스파이크 방지)
 * - 실패 시 지수 백오프(상한 30초, full jitter) + 연속 2회부터 offline 표시
 * - visibilitychange/pageshow/online 복귀 시 0~500ms 랜덤 지연 후 즉시 1회 폴링
 * - 스테일 복귀(마지막 성공이 인터벌 3배 초과) 시 { stale: true }로 알려
 *   호출부가 전환 애니메이션·자동 포커스·알림을 생략하고 조용히 점프하게 한다
 * - status='ended' 수신 시 폴링 중단
 * - cues_public은 서버가 rev 불일치 시에만 보내므로 클라이언트에서 병합 유지
 */

const BASE_INTERVAL = 4500
const PDF_INTERVAL = 2000
const BACKOFF_MAX = 30000
const jitter = (ms) => ms * (0.85 + Math.random() * 0.3) // ±15%

export function useLiveState(code, { enabled = true } = {}) {
  const [state, setState] = useState(null)   // 마지막 성공 응답 (cues 병합됨)
  const [offline, setOffline] = useState(false)
  const staleRef = useRef(false)             // 이번 갱신이 스테일 복귀인지
  const lastSuccessRef = useRef(0)
  const failCountRef = useRef(0)
  const cuesRevRef = useRef(null)
  const cuesRef = useRef([])
  const timerRef = useRef(null)
  const stoppedRef = useRef(false)
  const inFlightRef = useRef(false)
  const stateRef = useRef(null)

  const legacyRef = useRef(false) // 015 미적용 환경 폴백 (sp_live_state_q 부재 시)

  const poll = useCallback(async () => {
    if (!code || stoppedRef.current || inFlightRef.current) return
    inFlightRef.current = true
    try {
      let data, error
      if (!legacyRef.current) {
        // STABLE 함수 — GET 호출로 캐시 가능성 보존 (PRD §6 불변 규칙)
        // 주의: GET에서 null 파라미터는 문자열 "null"로 직렬화돼 BIGINT 캐스팅
        // 오류를 내므로, 값이 있을 때만 포함한다 (없으면 서버 DEFAULT NULL)
        const params = { p_code: code }
        if (cuesRevRef.current != null) params.p_cues_rev = cuesRevRef.current
        ;({ data, error } = await supabase.rpc('sp_live_state_q', params, { get: true }))
        // PGRST202: 함수 없음 → 015 미적용 환경. 구 RPC로 폴백
        if (error?.code === 'PGRST202') {
          legacyRef.current = true
          console.warn('[useLiveState] sp_live_state_q 없음 — sp_live_broadcast_q 폴백 (015 적용 필요)')
          error = null
        }
      }
      if (legacyRef.current) {
        // 구 신호 합성: broadcast + 세션 status를 병렬 조회해 동일 형태로 맞춘다
        const [bRes, sRes] = await Promise.all([
          supabase.rpc('sp_live_broadcast_q', { p_code: code }),
          supabase.from('sessions').select('status, participant_count').eq('code', code).maybeSingle(),
        ])
        error = bRes.error
        if (bRes.data?.success) {
          data = {
            ...bRes.data,
            status: sRes.data?.status || 'active',
            participant_count: sRes.data?.participant_count,
            qna_rev: null, // 레거시: 버전 신호 없음 → 소비측이 자체 주기 갱신
            cues_rev: null,
            cues_public: null,
          }
        } else if (sRes.data?.status === 'ended') {
          // 구 RPC는 ended 세션을 not_found로 반환 — 세션 조회로 종료를 합성해
          // 폴링 중단·종료 화면 전환이 레거시 환경에서도 동작하게 한다
          data = { success: true, status: 'ended' }
          error = null
        } else {
          data = bRes.data
        }
      }
      if (error) throw error
      if (!data?.success) {
        // session_not_found 등 — 실패로 취급하지 않고 상태만 전달
        setState((prev) => ({ ...(prev || {}), success: false, error: data?.error }))
        return
      }

      const interval = data.broadcast_mode === 'pdf' ? PDF_INTERVAL : BASE_INTERVAL
      // 스테일 판정: 마지막 성공에서 인터벌 3배 이상 경과 후의 성공 → 조용한 점프
      staleRef.current =
        lastSuccessRef.current > 0 && Date.now() - lastSuccessRef.current > interval * 3
      lastSuccessRef.current = Date.now()
      failCountRef.current = 0
      setOffline(false)

      // cues_public 병합 (rev 불일치 때만 서버가 보냄)
      if (data.cues_public != null) {
        cuesRef.current = data.cues_public
        cuesRevRef.current = data.cues_rev ?? null
      }
      const merged = { ...data, cues_public: cuesRef.current, stale: staleRef.current }
      stateRef.current = merged
      setState(merged)

      if (data.status === 'ended') stoppedRef.current = true // 종료 — 폴링 중단
    } catch {
      failCountRef.current += 1
      if (failCountRef.current >= 2) setOffline(true) // 연속 2회부터 비차단 배너
    } finally {
      inFlightRef.current = false
    }
  }, [code])

  // 단일 인터벌 루프 (지터 + 백오프 + 체인 세대 가드)
  useEffect(() => {
    if (!enabled || !code) return
    stoppedRef.current = false

    // 세션(code) 기준 상태 리셋 — 같은 라우트에서 다른 세션으로 이동 시
    // 이전 세션의 큐 목록·rev·상태가 잔존하지 않도록
    cuesRef.current = []
    cuesRevRef.current = null
    stateRef.current = null
    failCountRef.current = 0
    lastSuccessRef.current = 0
    setState(null)
    setOffline(false)

    // 체인 세대: resync가 이전 체인을 무효화 — in-flight 중 resync가 발생해도
    // 폴링 루프가 복제되어 누적되지 않는다
    let gen = 0
    const tick = async (id) => {
      if (stoppedRef.current || id !== gen) return
      await poll()
      if (stoppedRef.current || id !== gen) return // in-flight 중 새 체인으로 대체됐으면 종료
      const mode = stateRef.current?.broadcast_mode
      let next = mode === 'pdf' ? PDF_INTERVAL : BASE_INTERVAL
      if (failCountRef.current > 0) {
        // 지수 백오프 + full jitter
        const backoff = Math.min(BASE_INTERVAL * 2 ** failCountRef.current, BACKOFF_MAX)
        next = Math.random() * backoff
      } else {
        next = jitter(next)
      }
      timerRef.current = setTimeout(() => tick(id), next)
    }
    const start = (delay = 0) => {
      gen += 1
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => tick(gen), delay)
    }
    start(0)

    // 복귀 즉시 재동기화 (0~500ms 랜덤 지연 — 동시 복귀 스파이크 분산)
    const resync = () => {
      if (stoppedRef.current) return
      start(Math.random() * 500)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', resync)
    window.addEventListener('online', resync)

    return () => {
      stoppedRef.current = true
      clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', resync)
      window.removeEventListener('online', resync)
    }
  }, [enabled, code, poll])

  /** 즉시 1회 폴링 (제출 직후 등 강제 갱신용) */
  const refresh = useCallback(() => poll(), [poll])

  return { state, offline, refresh }
}
