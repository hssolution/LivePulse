import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * 발표 타이머 상태 훅 (028)
 *
 * - 정본은 서버: 도는 중이면 ends_at(0초가 되는 서버 시각), 멈춰 있으면 remaining_sec(초과면 음수).
 * - sp_live_timer_q 의 server_now 로 이 화면 시계와 서버 시계의 차이(offset)를 잰다(왕복 절반 보정).
 * - 동기화는 송출 화면과 같은 방식: sessions 행 realtime(UPDATE) 구독 + 15초 폴링(구독이 끊겨도 따라잡게).
 * - 도는 중에만 250ms 마다 다시 그린다.
 */

const POLL_MS = 15000

/** 서버 timer JSON + 화면 시계 보정값으로 지금 남은 초(올림, 초과면 음수) */
export function remainingSeconds(timer, offsetMs = 0, nowMs = Date.now()) {
  if (!timer) return null
  if (timer.running && timer.ends_at) {
    return Math.ceil((new Date(timer.ends_at).getTime() - (nowMs + offsetMs)) / 1000)
  }
  return timer.remaining_sec ?? 0
}

/** sessions 행(realtime payload) → timer JSON */
function timerFromRow(row) {
  if (!row || row.timer_duration_sec === undefined) return null
  return {
    duration_sec: row.timer_duration_sec,
    remaining_sec: row.timer_remaining_sec,
    running: row.timer_running,
    ends_at: row.timer_ends_at,
    warn_sec: row.timer_warn_sec,
    changed_at: row.timer_changed_at,
  }
}

export function useSessionTimer(code, { enabled = true } = {}) {
  const [timer, setTimer] = useState(null)
  const [meta, setMeta] = useState({ sessionId: null, title: '', broadcastMode: null })
  const [error, setError] = useState(null)
  const [, setTick] = useState(0)
  const offsetRef = useRef(0)

  const applyServerNow = (serverNow, t0, t1) => {
    if (!serverNow) return
    const mid = t1 ? (t0 + t1) / 2 : t0
    offsetRef.current = new Date(serverNow).getTime() - mid
  }

  const load = useCallback(async () => {
    if (!code) return
    const t0 = Date.now()
    const { data, error: err } = await supabase.rpc('sp_live_timer_q', { p_code: String(code).toUpperCase() })
    const t1 = Date.now()
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'load_failed')
      return
    }
    setError(null)
    applyServerNow(data.server_now, t0, t1)
    setTimer(data.timer)
    setMeta({ sessionId: data.session_id, title: data.title, broadcastMode: data.broadcast_mode })
  }, [code])

  /** 조작 RPC 응답을 바로 반영(구독 이벤트를 기다리지 않는다) */
  const applyTimer = useCallback((t, serverNow) => {
    if (serverNow) applyServerNow(serverNow, Date.now())
    if (t) setTimer(t)
  }, [])

  const setBroadcastMode = useCallback((mode) => {
    setMeta((m) => ({ ...m, broadcastMode: mode }))
  }, [])

  // 최초 로드 + 폴링
  useEffect(() => {
    if (!enabled || !code) return
    load()
    const i = setInterval(load, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(i)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, code, load])

  // realtime — 송출 화면과 같은 sessions 행 구독
  useEffect(() => {
    if (!enabled || !meta.sessionId) return
    const channel = supabase
      .channel(`session-timer:${meta.sessionId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${meta.sessionId}` },
        (payload) => {
          const t = timerFromRow(payload.new)
          if (t) setTimer(t)
          if (payload.new?.broadcast_mode !== undefined) {
            setMeta((m) => ({ ...m, broadcastMode: payload.new.broadcast_mode, title: payload.new.title ?? m.title }))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, meta.sessionId])

  // 도는 중에만 다시 그리기
  useEffect(() => {
    if (!timer?.running) return
    const i = setInterval(() => setTick((n) => n + 1), 250)
    return () => clearInterval(i)
  }, [timer?.running])

  return {
    timer,
    remaining: remainingSeconds(timer, offsetRef.current),
    sessionId: meta.sessionId,
    title: meta.title,
    broadcastMode: meta.broadcastMode,
    error,
    reload: load,
    applyTimer,
    setBroadcastMode,
  }
}
