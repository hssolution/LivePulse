import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import {
  MessageCircle,
  Info,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Radio,
  Hourglass,
  CheckCircle2,
  Home,
  Presentation,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import AudienceQnA from '@/components/session/AudienceQnA'
import AudiencePolls from '@/components/session/AudiencePolls'
import SEO from '@/components/common/SEO'
import PdfPage from '@/components/PdfPage'
import { useLiveState } from '@/hooks/useLiveState'
import { getParticipantToken } from '@/lib/participant'
import ScheduleList from '@/components/audience/ScheduleList'
import SectionRenderer from '@/components/audience/SectionRenderer'
import { sceneSettings, deriveTokens } from '@/components/audience/sections/registry'
import SectionBand from '@/components/audience/SectionBand'
import { deriveAudienceTheme } from '@/components/audience/theme'
import { CalendarDays } from 'lucide-react'

/** Q&A 작성 드래프트 저장 키 (AudienceQnA와 공유 — 자동 포커스 예외 판정에 사용) */
export const qnaDraftKey = (code) => `lp_qna_draft:${code}`

/**
 * 자동 포커스 예외 판정 (PRD §3.2)
 * 텍스트 입력에 포커스가 있거나 Q&A 드래프트가 남아 있으면
 * 좌장 주도 장면 전환이 탭을 강제로 빼앗지 않는다.
 */
function isAudienceTyping(code) {
  const el = document.activeElement
  if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) {
    return true
  }
  try {
    return !!(sessionStorage.getItem(qnaDraftKey(code)) || '').trim()
  } catch {
    return false
  }
}

/**
 * 청중용 라이브 페이지 — 발표자 주도형
 * /live/:code
 *
 * 상태별 화면:
 * - status='published' → 대기 로비 (곧 시작)
 * - status='active'    → 라이브 (탭: 현재/Q&A/정보)
 * - status='ended'     → 종료 화면
 *
 * '현재' 탭은 polls.status='active' 여부에 따라 자동으로 투표 또는
 * 대기 스테이지를 보여줍니다. 발표자가 새 투표를 띄우면 다른 탭에
 * 있어도 '현재'로 자동 전환됩니다.
 */
export default function LiveSession() {
  const { code } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isPreview = searchParams.get('preview') === 'true'
  // iframe 임베드 모드: 파트너 화면설계 에디터에서 라이브 화면을 미리보기로 삽입할 때 사용.
  // JoinSession과 달리 LiveSession에는 미리보기 배너/상단 패딩 같은 별도 chrome이 없으므로,
  // embed 모드에서 숨길 chrome 자체가 없어 미리보기와 동일하게 렌더된다.
  // (향후 미리보기 chrome이 추가되면 isPreview && !isEmbed 조건으로 감싼다.)
  const isEmbed = searchParams.get('embed') === 'true'
  const initialTabParam = searchParams.get('tab')

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [presenters, setPresenters] = useState([])
  const [template, setTemplate] = useState(null)
  const [assets, setAssets] = useState({})
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTabParam === 'qna' || initialTabParam === 'info') return initialTabParam
    return 'now' // 'poll'도 'now'로 매핑 (발표자 주도)
  })

  // activeTab을 ref로도 보관해 폴링 효과의 deps churn 방지
  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // 참가자 토큰 (내 질문 표시·중복 참여 판별 — PRD §3.2)
  const participantToken = getParticipantToken(code?.toUpperCase())

  // 이 페이지는 항상 라이트 모드
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    return () => {
      document.documentElement.classList.remove('light')
    }
  }, [])

  // 세션 로드
  const loadSession = useCallback(async () => {
    if (!code) {
      setError('invalid_code')
      setLoading(false)
      return
    }

    try {
      let query = supabase.from('sessions').select('*').eq('code', code.toUpperCase())

      // 미리보기가 아닌 경우 draft는 제외 (게시/진행/종료만 허용)
      if (!isPreview) {
        query = query.in('status', ['published', 'active', 'ended'])
      }

      const { data: sessionData, error: sessionError } = await query.single()

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          setError(isPreview ? 'not_found' : 'not_active')
        } else {
          throw sessionError
        }
        setLoading(false)
        return
      }

      setSession(sessionData)

      // 발표자 + 템플릿/에셋 병렬 로드
      const tasks = [
        supabase
          .from('session_presenters')
          .select('*')
          .eq('session_id', sessionData.id)
          .eq('status', 'confirmed')
          .order('display_order'),
        supabase.from('session_assets').select('*').eq('session_id', sessionData.id),
      ]
      if (sessionData.template_id) {
        tasks.push(
          supabase.from('session_templates').select('*').eq('id', sessionData.template_id).single()
        )
      }
      const [presRes, assetsRes, tplRes] = await Promise.all(tasks)

      setPresenters(presRes.data || [])

      const assetMap = {}
      ;(assetsRes.data || []).forEach((a) => {
        assetMap[a.field_key] = a
      })
      setAssets(assetMap)

      if (tplRes?.data) setTemplate(tplRes.data)
    } catch (err) {
      console.error('Error loading session:', err)
      setError('load_failed')
    } finally {
      setLoading(false)
    }
  }, [code, isPreview])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // ── 게시된 디자인 로드 (E0) — 마운트 시 1회, published만 옴 (019 보안 설계) ──
  // 실패/없음이면 null 유지 → 기존 템플릿 렌더 그대로 (기존 세션 시각 불변)
  const [design, setDesign] = useState(null)
  useEffect(() => {
    if (!code) return
    let cancelled = false
    supabase
      .rpc('sp_live_design_q', { p_code: code.toUpperCase() })
      .then(({ data }) => {
        if (!cancelled && data?.design) setDesign(data.design)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  // ── 단일 폴링 (PRD §6) — 상태·송출·투표·큐·Q&A 버전을 한 신호로 ──
  // 기존 3개 인터벌(status 10s / poll 5s / broadcast 4s)을 대체한다.
  const { state: live, offline } = useLiveState(code?.toUpperCase(), {
    enabled: !!session?.id && session?.status !== 'ended',
  })

  // 거시 상태 전환 (published→active, active→ended) + participant_count 상시 병합
  useEffect(() => {
    if (!live?.success || !live.status) return
    setSession((prev) => {
      if (!prev) return prev
      if (prev.status === live.status) {
        // status가 그대로여도 참가자 수는 매 폴링 반영 (리뷰 S2 — 헤더 'N명 참여' 동결 방지)
        if (live.participant_count != null && prev.participant_count !== live.participant_count) {
          return { ...prev, participant_count: live.participant_count }
        }
        return prev
      }
      // 스테일 복귀(오래 잠들었다 깨어남)면 알림 없이 조용히 점프 (§6 라이프사이클)
      if (!live.stale) {
        if (prev.status !== 'ended' && live.status === 'ended') {
          toast.info(t('live.sessionEnded') || '강연이 종료되었습니다')
        }
        if (prev.status === 'published' && live.status === 'active') {
          toast.info('강연이 시작되었습니다')
        }
      }
      return { ...prev, status: live.status, participant_count: live.participant_count ?? prev.participant_count }
    })
  }, [live, t])

  // 라이브 중 디자인 게시 반영 (021) — design_version이 바뀌면 게시본 1회 재조회
  // 최초 수신은 "마운트 로드가 실제로 디자인을 받았을 때만" 건너뛴다
  // (입장 시 디자인 없음 → 라이브 중 첫 게시 케이스 누락 방지 — 검증 라운드 반영)
  const designVersionRef = useRef(undefined)
  useEffect(() => {
    if (!live?.success || live.design_version == null) return
    if (designVersionRef.current === live.design_version) return
    const isFirst = designVersionRef.current === undefined
    designVersionRef.current = live.design_version
    if (isFirst && design) return // 마운트 로드가 이미 이 버전을 반영함
    supabase.rpc('sp_live_design_q', { p_code: code?.toUpperCase() }).then(({ data }) => {
      if (data?.design) setDesign(data.design)
    })
  }, [live, code, design])

  // 장면 자동 포커스 — 트리거당 최초 1회 + 입력 중 예외 (PRD §3.2)
  // 초기값 null: 최초 폴링 성공은 "이미 진행 중이던 장면"이므로 기록만 하고
  // 탭 강탈·알림을 하지 않는다 (리뷰 S3 — ?tab=qna 딥링크 진입 시 오판 방지)
  const lastTriggerRef = useRef(null)
  useEffect(() => {
    if (!live?.success) return
    const mode = live.broadcast_mode
    if (!['pdf', 'notice', 'survey', 'qna'].includes(mode)) {
      lastTriggerRef.current = `${mode || 'idle'}:`
      return
    }
    const trigger = `${mode}:${live.active_poll_id || ''}:${live.current_cue_id || ''}`
    if (trigger === lastTriggerRef.current) return
    const isFirstReception = lastTriggerRef.current === null
    lastTriggerRef.current = trigger
    if (isFirstReception) return // 입장 시점의 기존 장면 — 새 트리거 아님

    if (live.stale) return // 스테일 복귀: 포커스 강탈·알림 생략, 조용한 점프
    if (activeTabRef.current === 'now') return

    if (isAudienceTyping(code?.toUpperCase())) {
      // 입력 중 — 강제 전환하지 않고 비침습 알림 + 탭 배지로 대체
      toast.info('발표자가 새 활동을 띄웠습니다 — 작성이 끝나면 \'현재\' 탭에서 확인하세요')
      return
    }
    setActiveTab('now')
    toast.info('발표자가 새 활동을 띄웠습니다')
  }, [live, code])

  // 파생값 — 투표 노출 트리거는 broadcast_mode='survey' 하나로 일원화 (PRD §6)
  const broadcast = session?.status === 'active' && live?.success ? live : null
  const hasActivePoll = broadcast?.broadcast_mode === 'survey' && !!broadcast?.active_poll_id

  // 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // 에러
  if (error) {
    return <ErrorView error={error} code={code} navigate={navigate} t={t} />
  }

  // 상태별 라우팅
  if (session.status === 'ended') {
    const endedBandTokens = design ? deriveTokens(design.tokens) : null
    const endedHeader = design?.scenes?.ended?.headerSections || []
    const endedFooter = design?.scenes?.ended?.footerSections || []
    return (
      <EndedView
        session={session}
        navigate={navigate}
        template={template}
        assets={assets}
        designTokens={design?.tokens}
        headerBand={
          endedHeader.length > 0 ? (
            <SectionBand sections={endedHeader} tokens={endedBandTokens} data={{ session }} className="!py-2" />
          ) : null
        }
        footerBand={
          endedFooter.length > 0 ? (
            <SectionBand sections={endedFooter} tokens={endedBandTokens} data={{ session }} className="!py-2" />
          ) : null
        }
      />
    )
  }

  if (session.status === 'published' && !isPreview) {
    // 로비 섹션화 (E2) — 게시 디자인에 lobby 장면이 있으면 섹션 렌더러가 LobbyView를 대체
    if (design?.scenes?.lobby?.sections?.length) {
      return (
        <>
          <SEO title={session.title} description={`곧 시작합니다 - ${session.title}`} />
          <SectionRenderer
            design={design}
            scene="lobby"
            data={{ session, presenters, cues: live?.cues_public || [] }}
            prepend={<LobbyStatusBanner code={session.code} />}
          />
        </>
      )
    }
    return (
      <LobbyView
        session={session}
        presenters={presenters}
        template={template}
        assets={assets}
        cues={live?.cues_public || []}
        designTokens={design?.tokens}
      />
    )
  }

  // active (또는 isPreview로 어떤 상태든)
  return (
    <LiveView
      session={session}
      presenters={presenters}
      template={template}
      assets={assets}
      isPreview={isPreview}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      hasActivePoll={hasActivePoll}
      broadcast={broadcast}
      cues={live?.cues_public || []}
      code={code?.toUpperCase()}
      participantToken={participantToken}
      offline={offline}
      designTokens={design?.tokens}
      design={design}
    />
  )
}

/* ============================================================
 * 로비 상태 배너 — 섹션화된 로비 상단 고정 (SectionRenderer prepend)
 * 기존 LobbyView 상단 요소(입장 완료 칩·참여코드·자동 전환 안내)의 축약형.
 * SectionRenderer 컨테이너의 토큰 CSS 변수(--lp-*)를 그대로 사용한다.
 * ============================================================ */
export function LobbyStatusBanner({ code }) {
  return (
    <div className="w-full max-w-lg sm:max-w-2xl mx-auto px-4 pt-4 pb-1">
      <div
        className="rounded-[var(--lp-radius)] border px-4 py-3"
        style={{ background: 'var(--lp-card)', borderColor: 'var(--lp-line)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ color: 'var(--lp-on-brand)', background: 'var(--lp-brand)' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> 입장 완료
          </span>
          <span className="text-xs" style={{ color: 'var(--lp-mut)' }}>
            참여코드 {code}
          </span>
        </div>
        <div className="mt-2 text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--lp-ink)' }}>
          <Hourglass className="w-4 h-4 animate-pulse" style={{ color: 'var(--lp-brand)' }} />
          곧 시작합니다
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--lp-mut)' }}>
          발표자가 시작하면 이 화면이 자동으로 전환됩니다
        </p>
      </div>
    </div>
  )
}

/* ============================================================
 * 대기 로비 (status='published') — 참가 템플릿 브랜딩 지원
 * ============================================================ */
export function LobbyView({ session, presenters, template, assets, cues = [], embedded = false, designTokens = null }) {
  // 테마 파생 단일화 — designTokens 있으면 브랜드 토큰이 폴백 배경까지 관통 (E0)
  // 없으면 기존 템플릿 폴백 그라데이션 클래스 그대로 (기존 세션 시각 불변)
  const theme = deriveAudienceTheme(template, assets, designTokens)
  const { bgImage, logo, fallbackBg, isDarkBg, bgStyle, fallbackStyle } = theme

  return (
    <div
      className={`min-h-screen ${bgImage || fallbackStyle ? '' : fallbackBg}`}
      style={bgImage ? bgStyle : fallbackStyle}
    >
      {!embedded && <SEO title={session.title} description={`곧 시작합니다 - ${session.title}`} />}

      {/* 배경 이미지가 있으면 가독성을 위한 다크 오버레이 */}
      <div
        className={`min-h-screen flex flex-col ${
          bgImage ? 'bg-black/50 backdrop-blur-sm' : ''
        }`}
      >
        <header className="px-5 pt-8 pb-4 flex items-center justify-between">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isDarkBg
                ? 'text-white bg-white/15 backdrop-blur border border-white/20'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> 입장 완료
          </div>
          <div className={`text-xs ${isDarkBg ? 'text-white/70' : 'text-slate-400'}`}>
            참여코드 {session.code}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {logo && (
            <img
              src={logo}
              alt=""
              className="h-14 object-contain mb-6 max-w-[60%]"
            />
          )}

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse ${
              isDarkBg ? 'bg-white/15 backdrop-blur' : 'bg-indigo-100'
            }`}
          >
            <Hourglass
              className={`w-10 h-10 ${isDarkBg ? 'text-white' : 'text-indigo-600'}`}
            />
          </div>

          <h1
            className={`text-xl font-bold ${isDarkBg ? 'text-white' : 'text-slate-800'}`}
          >
            곧 시작합니다
          </h1>
          <p
            className={`text-sm mt-2 leading-relaxed ${
              isDarkBg ? 'text-white/80' : 'text-slate-500'
            }`}
          >
            발표자가 강연을 시작하면
            <br />
            이 화면이 자동으로 전환됩니다
          </p>

          {/* 강연 카드 — 어떤 배경에서도 가독성을 위해 흰색 카드 유지 */}
          <div className="mt-5 bg-white rounded-2xl shadow-lg border border-slate-100 p-4 w-full max-w-sm">
            <div className="text-xs font-semibold text-indigo-500 mb-1">
              참여 중인 강연
            </div>
            <div className="font-bold text-slate-800">{session.title}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{' '}
              {format(new Date(session.start_at), 'HH:mm')} 시작 예정
            </div>
          </div>

          {/* 오늘의 순서 — 큐시트 공개분 자동 렌더 (PRD §5, 공개 큐 없으면 미표시) */}
          {cues.length > 0 && (
            <div className="mt-4 bg-white rounded-2xl shadow-lg border border-slate-100 p-4 w-full max-w-sm text-left">
              <div className="text-xs font-semibold text-indigo-500 mb-2 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> 오늘의 순서
              </div>
              <ScheduleList cues={cues} isLive={false} />
            </div>
          )}
        </div>

        {presenters.length > 0 && (
          <div className="px-5 pb-8 max-w-sm mx-auto w-full">
            <h2
              className={`text-xs font-bold mb-2 ${
                isDarkBg ? 'text-white/70' : 'text-slate-400'
              }`}
            >
              오늘의 발표자
            </h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg divide-y divide-slate-100">
              {presenters.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3.5">
                  <div className="w-11 h-11 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                    {p.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{p.display_name}</div>
                    {p.display_title && (
                      <div className="text-xs text-slate-500">{p.display_title}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
 * 라이브 (status='active') — 발표자 주도형
 * ============================================================ */
export function LiveView({ session, presenters, template, assets, isPreview, activeTab, setActiveTab, hasActivePoll, broadcast, cues = [], code, participantToken, offline, embedded = false, designTokens = null, design = null, simulate = false }) {
  const bMode = broadcast?.broadcast_mode
  const liveCategories = broadcast?.categories || []
  // 게시 디자인의 장면 설정 소비 (E-scene) — design 없으면 null로 넘겨 각 컴포넌트가 현행 동작 유지
  const qnaDesign = design ? sceneSettings(design, 'qna') : null
  const pollDesign = design ? sceneSettings(design, 'poll') : null
  // 기능 화면 상/하단 자유 섹션 밴드 (없으면 null → 현행 불변)
  const bandTokens = design ? deriveTokens(design.tokens) : null
  const bandData = { session, presenters, cues }
  const qnaBands = design
    ? { header: design.scenes?.qna?.headerSections || [], footer: design.scenes?.qna?.footerSections || [] }
    : null
  const pollBands = design
    ? { header: design.scenes?.poll?.headerSections || [], footer: design.scenes?.poll?.footerSections || [] }
    : null
  // 테마 연속 (PRD §4) — 로비까지만 적용되던 브랜딩을 라이브 헤더로 확장
  // designTokens 있으면 헤더 밴드가 브랜드 그라데이션 style로 대체 (E0)
  const theme = deriveAudienceTheme(template, assets, designTokens)
  const hasSchedule = cues.length > 0
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!embedded && (
        <SEO
          title={session.title}
          description={`[Live] ${session.title} - ${session.venue_name || ''}`}
        />
      )}

      {/* 연결 불안정 배너 (비차단 — §6 라이프사이클) */}
      {offline && (
        <div className="bg-amber-500 text-white text-center text-xs font-semibold py-1.5 px-4" role="status">
          연결이 불안정해요 — 마지막으로 받은 화면을 보여주고 있어요
        </div>
      )}

      {/* 헤더 — 세션 테마 밴드 (입장~종료 테마 연속) · 게시 디자인이 있으면 브랜드 style */}
      <header className={`sticky top-0 z-30 ${theme.heroBand}`} style={theme.heroBandStyle}>
        <div className="container mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                theme.isDarkBand ? 'text-white bg-white/15 backdrop-blur' : 'text-rose-600 bg-rose-50'
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />{' '}
              LIVE
            </span>
            {session.participant_count > 0 && (
              <span className={`text-[11px] ${theme.isDarkBand ? 'text-white/60' : 'text-slate-400'}`}>
                {session.participant_count}명 참여
              </span>
            )}
            {theme.logo && (
              <img src={theme.logo} alt="" className="h-4 object-contain ml-auto opacity-90" />
            )}
          </div>
          <h1 className="font-bold text-sm mt-1 leading-tight line-clamp-1">{session.title}</h1>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-4 pb-24">
        {activeTab === 'now' &&
          (bMode === 'notice' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="inline-flex items-center gap-1.5 text-amber-600 font-bold text-sm mb-4">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> 안내
              </div>
              <p className="text-xl font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">
                {broadcast?.broadcast_notice || '잠시 후 계속됩니다'}
              </p>
            </div>
          ) : bMode === 'pdf' && broadcast?.pdf ? (
            <PdfStage pdf={broadcast.pdf} />
          ) : hasActivePoll ? (
            <AudiencePolls
              sessionId={session.id}
              sessionTitle={session.title}
              isPreview={isPreview}
              activePollId={broadcast?.active_poll_id}
              participantToken={participantToken}
              livePollResults={broadcast?.poll_results}
              pollDesign={pollDesign}
              bands={pollBands}
              bandTokens={bandTokens}
              bandData={bandData}
              simPollId={simulate ? broadcast?.active_poll_id : null}
            />
          ) : bMode === 'qna' ? (
            <QnaStage question={broadcast?.question} onAskQna={() => setActiveTab('qna')} />
          ) : (
            <IdleStage onAskQna={() => setActiveTab('qna')} />
          ))}

        {activeTab === 'qna' && (
          <AudienceQnA
            sessionId={session.id}
            sessionCode={code}
            sessionStatus={session.status}
            isPreview={isPreview}
            categories={liveCategories}
            participantToken={participantToken}
            qnaRev={broadcast?.qna_rev}
            qnaDesign={qnaDesign}
            bands={qnaBands}
            bandTokens={bandTokens}
            bandData={bandData}
          />
        )}

        {/* 일정 탭 (신규 — PRD §3.2) : 큐시트 공개분 + 지금 진행 중 하이라이트 */}
        {activeTab === 'schedule' &&
          (hasSchedule ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-indigo-500 mb-2 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> 오늘의 순서
              </div>
              <ScheduleList
                cues={cues}
                currentCueId={broadcast?.current_cue_id}
                currentCueFiredAt={broadcast?.current_cue_fired_at}
                isLive
              />
            </div>
          ) : (
            // 라이브 중 공개 큐가 모두 내려간 엣지 — 빈 화면 방지
            <IdleStage onAskQna={() => setActiveTab('qna')} />
          ))}

        {activeTab === 'info' && <InfoPanel session={session} presenters={presenters} />}
      </main>

      {/* 하단 탭 — 공개 큐가 있으면 4탭, 없으면 3탭 폴백 (PRD §3.2) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
        <div className={`container mx-auto max-w-2xl grid ${hasSchedule ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabButton
            active={activeTab === 'now'}
            onClick={() => setActiveTab('now')}
            icon={Radio}
            label="현재"
            badge={['pdf', 'notice', 'survey', 'qna'].includes(bMode) && activeTab !== 'now'}
          />
          {hasSchedule && (
            <TabButton
              active={activeTab === 'schedule'}
              onClick={() => setActiveTab('schedule')}
              icon={CalendarDays}
              label="일정"
            />
          )}
          <TabButton
            active={activeTab === 'qna'}
            onClick={() => setActiveTab('qna')}
            icon={MessageCircle}
            label="Q&A"
          />
          <TabButton
            active={activeTab === 'info'}
            onClick={() => setActiveTab('info')}
            icon={Info}
            label="정보"
          />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2.5 flex flex-col items-center gap-0.5 relative transition-colors ${
        active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-semibold">{label}</span>
      {badge && (
        <span className="absolute top-1.5 right-1/2 -mr-5 w-2 h-2 bg-rose-500 rounded-full" />
      )}
    </button>
  )
}

function PdfStage({ pdf }) {
  const page = pdf.page || 1
  // 이미지 로드 실패한 페이지 — 해당 페이지만 PdfPage(클라 렌더) 폴백
  const [failedPage, setFailedPage] = useState(null)

  // PRD §3.4: 사전 변환된 페이지 이미지(WebP)가 있으면 이미지 렌더 우선
  const pagesBaseUrl = pdf.pages_path
    ? supabase.storage.from('session-assets').getPublicUrl(pdf.pages_path).data.publicUrl
    : null
  const useImage = !!pagesBaseUrl && failedPage !== page

  // 현재±1 페이지 프리페치 (페이지 넘김 시 지연 최소화)
  useEffect(() => {
    if (!pagesBaseUrl) return
    ;[page - 1, page + 1].forEach((p) => {
      if (p < 1) return
      if (pdf.page_count && p > pdf.page_count) return
      const img = new Image()
      img.src = `${pagesBaseUrl}/${p}.webp`
    })
  }, [pagesBaseUrl, page, pdf.page_count])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> 발표 자료 진행 중
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {useImage ? (
          <img
            src={`${pagesBaseUrl}/${page}.webp`}
            alt={`${pdf.title || '발표 자료'} ${page}페이지`}
            className="w-full h-auto block"
            onError={() => setFailedPage(page)}
          />
        ) : (
          <PdfPage fileUrl={pdf.file_url} pageNumber={page} />
        )}
        <div className="p-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
          <span className="truncate">{pdf.title}</span>
          <span className="font-semibold text-slate-500 shrink-0">
            {page} / {pdf.page_count || '?'}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Q&A 세그먼트 장면 (mode='qna', PRD §3.2 — v1.0에서 누락됐던 장면)
 * 송출 중 질문을 크게 보여주고 Q&A 탭으로 유도한다.
 */
function QnaStage({ question, onAskQna }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Q&A 진행 중
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {question ? (
          <>
            {question.category_name && (
              <span
                className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-3"
                style={{
                  color: question.category_color || '#4f46e5',
                  backgroundColor: `${question.category_color || '#4f46e5'}18`,
                }}
              >
                {question.category_name}
              </span>
            )}
            <p className="text-lg font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">
              {question.content}
            </p>
            <p className="text-xs text-slate-400 mt-3">
              {question.is_anonymous ? '익명' : question.author_name || '익명'}
              {question.likes_count > 0 && ` · 공감 ${question.likes_count}`}
            </p>
          </>
        ) : (
          <p className="text-center text-slate-500 py-4">질문을 선정하고 있습니다</p>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600 mb-2.5">지금 질문을 남겨보세요</p>
        <button
          type="button"
          onClick={onAskQna}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> 질문하러 가기
        </button>
      </div>
    </div>
  )
}

function IdleStage({ onAskQna }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
          <Presentation className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="font-bold">발표가 진행 중입니다</h2>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
          발표자가 투표나 활동을 띄우면
          <br />
          이 화면에 바로 나타납니다
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600 mb-2.5">그동안 궁금한 점이 있다면?</p>
        <button
          type="button"
          onClick={onAskQna}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> Q&A에 질문 남기기
        </button>
      </div>
    </div>
  )
}

function InfoPanel({ session, presenters }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold mb-3">{session.title}</h2>
        {session.description && (
          <p className="text-sm text-slate-600 mb-4">{session.description}</p>
        )}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>
              {format(new Date(session.start_at), 'yyyy.MM.dd (EEE)', { locale: ko })}{' '}
              {format(new Date(session.start_at), 'HH:mm')}–
              {format(new Date(session.end_at), 'HH:mm')}
            </span>
          </div>
          {session.venue_name && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>{session.venue_name}</span>
            </div>
          )}
        </div>
      </div>

      {presenters.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-sm mb-3">발표자</h3>
          <div className="space-y-3">
            {presenters.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                  {p.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-semibold text-sm">{p.display_name}</div>
                  {p.display_title && (
                    <div className="text-xs text-slate-500">{p.display_title}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * 종료 (status='ended')
 * ============================================================ */
export function EndedView({ session, navigate, template, assets, embedded = false, designTokens = null, headerBand = null, footerBand = null }) {
  // 테마 연속 (PRD §4) — 종료 화면까지 세션 브랜딩 유지.
  // 콘텐츠가 흰색 텍스트이므로 어두운 테마(배경 이미지·심포지엄·컨퍼런스)만
  // 테마 배경을 쓰고, 밝은 테마는 기존 인디고 그라데이션을 유지한다.
  // E0: 게시 디자인 토큰이 있으면 브랜드 배경/텍스트(endedStyle)로 대체.
  //     배경 이미지 에셋이 있으면 이미지 우선 (입장·로비와 시각 연속).
  const theme = deriveAudienceTheme(template, assets, designTokens)
  const brandEnded = !theme.bgImage && theme.endedStyle ? theme.endedStyle : null
  const useThemeBg = theme.bgImage || theme.isDarkBg
  return (
    <div
      className={`min-h-screen flex flex-col ${
        !brandEnded && useThemeBg && !theme.bgImage ? theme.fallbackBg : ''
      } ${!brandEnded && !useThemeBg ? 'bg-gradient-to-b from-indigo-600 to-purple-800' : ''}`}
      style={brandEnded || theme.bgStyle}
    >
      {!embedded && <SEO title={`${session.title} - 종료`} />}

      {headerBand}

      <div
        className={`flex-1 flex flex-col items-center justify-center px-7 text-center ${
          brandEnded ? '' : 'text-white'
        } ${theme.bgImage ? 'bg-black/50 backdrop-blur-sm' : ''}`}
      >
        {theme.logo && (
          <img src={theme.logo} alt="" className="h-12 object-contain mb-6 max-w-[55%]" />
        )}
        <div
          className={`w-20 h-20 rounded-full backdrop-blur flex items-center justify-center mb-5 ${
            brandEnded && theme.endedInkDark ? 'bg-black/10' : 'bg-white/15'
          }`}
        >
          <CheckCircle2 className={`w-10 h-10 ${brandEnded ? '' : 'text-white'}`} />
        </div>
        <h1 className="text-2xl font-bold">강연이 종료되었습니다</h1>
        <p className={`text-sm mt-2 leading-relaxed ${brandEnded ? 'opacity-80' : 'text-indigo-200'}`}>
          참여해 주셔서 감사합니다
          <br />
          오늘 함께한 시간이 도움이 되었길 바랍니다
        </p>
      </div>

      <div className="px-5 pb-8 max-w-sm w-full mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`w-full bg-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors ${
            brandEnded ? '' : 'text-indigo-700'
          }`}
          style={brandEnded ? { color: theme.brand } : undefined}
        >
          <Home className="w-4 h-4" /> LivePulse 홈으로
        </button>
      </div>

      {footerBand}
    </div>
  )
}

/* ============================================================
 * 에러
 * ============================================================ */
function ErrorView({ error, code, navigate, t }) {
  const errors = {
    invalid_code: {
      title: t('join.error.invalidCode') || '잘못된 참여 코드',
      desc: t('join.error.invalidCodeDesc') || '코드를 다시 확인해주세요',
    },
    not_active: {
      title: t('live.error.notActive') || '강연이 게시되지 않았습니다',
      desc: t('live.error.notActiveDesc') || '발표자가 게시한 후에 입장할 수 있습니다',
    },
    not_found: {
      title: '세션을 찾을 수 없습니다',
      desc: '참여 코드를 다시 확인해주세요',
    },
    load_failed: {
      title: t('join.error.loadFailed') || '불러오기 실패',
      desc: t('join.error.loadFailedDesc') || '잠시 후 다시 시도해주세요',
    },
  }

  const err = errors[error] || errors.load_failed

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center p-8">
        <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">{err.title}</h2>
        <p className="text-slate-500 mb-6">{err.desc}</p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => navigate(`/join/${code}`)}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {t('live.backToJoin') || '참가 화면으로'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {t('common.goHome') || '홈으로'}
          </button>
        </div>
      </div>
    </div>
  )
}
