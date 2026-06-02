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
  const [hasActivePoll, setHasActivePoll] = useState(false)
  const [broadcast, setBroadcast] = useState(null)

  // activeTab을 ref로도 보관해 폴링 효과의 deps churn 방지
  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

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

  // 세션 상태 폴링 (10초) — 게시→진행, 진행→종료 전환 감지
  useEffect(() => {
    if (!session?.id) return

    const intervalId = setInterval(async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session.id)
        .single()

      if (error || !data) return

      setSession((prev) => {
        if (prev?.status !== 'ended' && data.status === 'ended') {
          toast.info(t('live.sessionEnded') || '강연이 종료되었습니다')
        }
        if (prev?.status === 'published' && data.status === 'active') {
          toast.info('강연이 시작되었습니다')
        }
        return { ...prev, ...data }
      })
    }, 10000)

    return () => clearInterval(intervalId)
  }, [session?.id, t])

  // 활성 투표 폴링 (라이브 중 5초) — 발표자 주도 핵심 신호
  useEffect(() => {
    if (!session?.id || session.status !== 'active') {
      setHasActivePoll(false)
      return
    }

    let cancelled = false

    const checkPolls = async () => {
      const { data } = await supabase
        .from('polls')
        .select('id')
        .eq('session_id', session.id)
        .eq('status', 'active')
        .limit(1)

      if (cancelled) return
      const has = (data?.length || 0) > 0

      setHasActivePoll((prevHas) => {
        // 새 투표 등장: 다른 탭에 있어도 '현재'로 자동 전환
        if (!prevHas && has && activeTabRef.current !== 'now') {
          setActiveTab('now')
          toast.info('발표자가 새 활동을 띄웠습니다')
        }
        return has
      })
    }

    checkPolls()
    const intervalId = setInterval(checkPolls, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [session?.id, session?.status])

  // 송출 상태 폴링 (라이브 중 4초) — 강연자료(PDF)/질문 카테고리
  useEffect(() => {
    if (!session?.id || session.status !== 'active') {
      setBroadcast(null)
      return
    }
    let cancelled = false
    const load = async () => {
      const { data } = await supabase.rpc('sp_live_broadcast_q', { p_code: code })
      if (cancelled || !data?.success) return
      setBroadcast((prev) => {
        // 강연자료·안내가 새로 등장하면 '현재' 탭으로 자동 전환
        if (
          ['pdf', 'notice'].includes(data.broadcast_mode) &&
          prev?.broadcast_mode !== data.broadcast_mode &&
          activeTabRef.current !== 'now'
        ) {
          setActiveTab('now')
        }
        return data
      })
    }
    load()
    const intervalId = setInterval(load, 4000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [session?.id, session?.status, code])

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
    return <EndedView session={session} navigate={navigate} />
  }

  if (session.status === 'published' && !isPreview) {
    return <LobbyView session={session} presenters={presenters} template={template} assets={assets} />
  }

  // active (또는 isPreview로 어떤 상태든)
  return (
    <LiveView
      session={session}
      presenters={presenters}
      isPreview={isPreview}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      hasActivePoll={hasActivePoll}
      broadcast={broadcast}
    />
  )
}

/* ============================================================
 * 대기 로비 (status='published') — 참가 템플릿 브랜딩 지원
 * ============================================================ */
function LobbyView({ session, presenters, template, assets }) {
  const bgImage = assets?.background_image?.value
  const logo = assets?.logo?.value
  const templateCode = template?.code

  // 템플릿별 폴백 그라데이션 (배경 이미지 미설정 시)
  const fallbackBg = (() => {
    switch (templateCode) {
      case 'symposium':
        return 'bg-gradient-to-b from-indigo-600 via-indigo-700 to-purple-800'
      case 'conference':
        return 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700'
      case 'workshop':
        return 'bg-gradient-to-br from-slate-100 to-slate-200'
      default:
        return 'bg-gradient-to-b from-slate-50 to-indigo-50'
    }
  })()

  // 어두운 배경(이미지 또는 dark 템플릿) → 흰색 텍스트, 밝은 배경 → 어두운 텍스트
  const isDarkBg =
    !!bgImage || templateCode === 'symposium' || templateCode === 'conference'

  const bgStyle = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <div className={`min-h-screen ${bgImage ? '' : fallbackBg}`} style={bgStyle}>
      <SEO title={session.title} description={`곧 시작합니다 - ${session.title}`} />

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
function LiveView({ session, presenters, isPreview, activeTab, setActiveTab, hasActivePoll, broadcast }) {
  const bMode = broadcast?.broadcast_mode
  const liveCategories = broadcast?.categories || []
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SEO
        title={session.title}
        description={`[Live] ${session.title} - ${session.venue_name || ''}`}
      />

      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="container mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />{' '}
              LIVE
            </span>
            {session.participant_count > 0 && (
              <span className="text-[11px] text-slate-400">{session.participant_count}명 참여</span>
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
            />
          ) : (
            <IdleStage onAskQna={() => setActiveTab('qna')} />
          ))}

        {activeTab === 'qna' && (
          <AudienceQnA
            sessionId={session.id}
            sessionStatus={session.status}
            isPreview={isPreview}
            categories={liveCategories}
          />
        )}

        {activeTab === 'info' && <InfoPanel session={session} presenters={presenters} />}
      </main>

      {/* 하단 탭 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
        <div className="container mx-auto max-w-2xl grid grid-cols-3">
          <TabButton
            active={activeTab === 'now'}
            onClick={() => setActiveTab('now')}
            icon={Radio}
            label="현재"
            badge={(hasActivePoll || bMode === 'pdf') && activeTab !== 'now'}
          />
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
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> 발표 자료 진행 중
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <PdfPage fileUrl={pdf.file_url} pageNumber={pdf.page || 1} />
        <div className="p-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
          <span className="truncate">{pdf.title}</span>
          <span className="font-semibold text-slate-500 shrink-0">
            {pdf.page || 1} / {pdf.page_count || '?'}
          </span>
        </div>
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
function EndedView({ session, navigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex flex-col">
      <SEO title={`${session.title} - 종료`} />

      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center text-white">
        <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold">강연이 종료되었습니다</h1>
        <p className="text-sm text-indigo-200 mt-2 leading-relaxed">
          참여해 주셔서 감사합니다
          <br />
          오늘 함께한 시간이 도움이 되었길 바랍니다
        </p>
      </div>

      <div className="px-5 pb-8 max-w-sm w-full mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
        >
          <Home className="w-4 h-4" /> LivePulse 홈으로
        </button>
      </div>
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
