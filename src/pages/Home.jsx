import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { PublicHeader } from '@/components/layout/PublicHeader'
import SEO from '@/components/common/SEO'
import { OpenFreeNotice } from '@/components/common/OpenFreeNotice'
import { PAGE_META, SERVICE_JSONLD } from '@/config/seo'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  ListChecks,
  LogIn,
  Megaphone,
  MessageCircle,
  MonitorPlay,
  Palette,
  Pin,
  Play,
  Radio,
  ThumbsUp,
  Tv,
  Zap,
} from 'lucide-react'

/** 참여 코드: 영문 대문자·숫자 6자리 (sessions.code, generate_session_code) */
const JOIN_CODE_LENGTH = 6
const normalizeJoinCode = (value) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, JOIN_CODE_LENGTH)

/**
 * 스크롤 시 요소가 나타나는 애니메이션
 */
const ScrollReveal = ({ children, className = '', delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 화면 목업 — 실제 콘솔 UI(파트너 세션 화면)를 본뜬 코드 그림.              */
/* 사람 이름·연락처·회사명은 넣지 않는다. 숫자는 건수·비율만.               */
/* ------------------------------------------------------------------ */

const CUE_STYLE = {
  pdf: { icon: FileText, chip: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40' },
  survey: { icon: BarChart3, chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  qna: { icon: MessageCircle, chip: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  notice: { icon: Megaphone, chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
}

function MockFrame({ title, icon: Icon, right, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 shadow-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 bg-[#11111b] px-4 h-11 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0 text-xs font-bold text-slate-200">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-indigo-300" />}
          <span className="truncate">{title}</span>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function LiveChip() {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full shrink-0">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
      LIVE
    </span>
  )
}

/** 큐시트(진행 플랜) — 큐 종류 칩 + 큐마다 송출 버튼 */
function CueList({ t }) {
  const cues = [
    { type: 'notice', label: t('home.mockCueNotice'), title: t('home.mockCue1') },
    { type: 'pdf', label: t('home.mockCueDeck'), title: t('home.mockCue2'), onAir: true },
    { type: 'survey', label: t('home.mockCuePoll'), title: t('home.mockCue3') },
    { type: 'qna', label: t('home.mockCueQna'), title: t('home.mockCue4') },
  ]
  return (
    <ul className="p-3 space-y-2">
      {cues.map((cue, i) => {
        const style = CUE_STYLE[cue.type]
        return (
          <li
            key={cue.type}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              cue.onAir ? 'border-rose-500/50 bg-rose-500/10' : 'border-slate-800 bg-slate-800/40'
            }`}
          >
            <span className="w-5 text-center text-xs font-mono text-slate-500 shrink-0">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.chip}`}>
                <style.icon className="w-3 h-3" />
                {cue.label}
              </span>
              <p className="mt-1 text-sm text-slate-100 truncate">{cue.title}</p>
            </div>
            {cue.onAir ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 shrink-0">
                <Radio className="w-3.5 h-3.5" />
                {t('home.mockOnAir')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 rounded-lg px-2.5 py-1.5 shrink-0">
                <Play className="w-3 h-3 fill-current" />
                {t('home.mockBroadcast')}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 송출 화면 — 강연자료 / Q&A / 설문 3모드 전환 */
function StageScreen({ t, compact = false }) {
  const modes = [
    { key: 'pdf', icon: FileText, label: t('home.mockCueDeck') },
    { key: 'qna', icon: MessageCircle, label: t('home.mockCueQna'), active: true },
    { key: 'survey', icon: BarChart3, label: t('home.mockCuePoll') },
  ]
  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <span
            key={m.key}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              m.active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <m.icon className="w-3.5 h-3.5" />
            {m.label}
          </span>
        ))}
      </div>
      <div className={`aspect-video rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 border border-slate-800 flex flex-col items-center justify-center text-center ${compact ? 'px-4' : 'px-6 sm:px-10'}`}>
        <span className="text-[10px] font-bold tracking-widest text-indigo-300 mb-2">Q&amp;A</span>
        <p className={`font-bold text-white leading-snug ${compact ? 'text-sm' : 'text-base sm:text-xl'}`}>
          {t('home.mockQuestion1')}
        </p>
      </div>
    </div>
  )
}

/** Q&A 모더레이션 — 승인 대기 / 승인됨 / 고정 */
function QnaBoard({ t }) {
  const rows = [
    { text: t('home.mockQuestion1'), likes: 12, pinned: true },
    { text: t('home.mockQuestion2'), likes: 7 },
    { text: t('home.mockQuestion3'), likes: 3, pending: true },
  ]
  return (
    <ul className="p-3 space-y-2">
      {rows.map((q) => (
        <li key={q.text} className="rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5">
          <div className="flex items-start gap-3">
            <span className="flex flex-col items-center text-slate-400 shrink-0 pt-0.5">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{q.likes}</span>
            </span>
            <p className="flex-1 min-w-0 text-sm text-slate-100 leading-snug">{q.text}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
            {q.pending ? (
              <>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                  {t('home.mockPending')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                  <Check className="w-3 h-3" />
                  {t('home.mockApprove')}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                {t('home.mockApproved')}
              </span>
            )}
            {q.pinned && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">
                <Pin className="w-3 h-3" />
                {t('home.mockPinned')}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 설문 결과 막대 */
function PollBars({ t }) {
  const options = [
    { label: t('home.mockOption1'), pct: 48 },
    { label: t('home.mockOption2'), pct: 31 },
    { label: t('home.mockOption3'), pct: 21 },
  ]
  return (
    <div className="p-4">
      <p className="text-sm font-bold text-white mb-3">{t('home.mockPollQuestion')}</p>
      <div className="space-y-3">
        {options.map((o) => (
          <div key={o.label}>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>{o.label}</span>
              <span className="font-mono">{o.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${o.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 디자인 에디터 — 장면 탭 + 청중 화면 미리보기 */
function DesignMock({ t }) {
  const scenes = [
    t('home.mockSceneEnter'),
    t('home.mockSceneLobby'),
    t('home.mockBroadcast'),
    t('home.mockCueQna'),
    t('home.mockCuePoll'),
    t('home.mockSceneEnded'),
  ]
  return (
    <div className="p-3">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {scenes.map((s, i) => (
          <span
            key={s}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              i === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 rounded-xl bg-[#14161d] border border-slate-800 py-5 px-3">
        <div className="w-28 sm:w-32 rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-orange-500 to-pink-600 p-2.5">
          <div className="h-10 rounded-lg bg-white/25 mb-2" />
          <div className="h-2 w-4/5 rounded bg-white/80 mb-1.5" />
          <div className="h-2 w-3/5 rounded bg-white/50 mb-4" />
          <div className="h-6 rounded-md bg-white/90" />
        </div>
        <div className="space-y-2 w-24 sm:w-32">
          {['bg-orange-500', 'bg-indigo-500', 'bg-emerald-500'].map((c) => (
            <div key={c} className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full shrink-0 ${c}`} />
              <span className="h-2 flex-1 rounded bg-slate-700" />
            </div>
          ))}
          <div className="h-6 rounded-md border border-dashed border-slate-600" />
        </div>
      </div>
    </div>
  )
}

/** 리포트 — 요약 수치 + 설문 결과 + Excel */
function ReportMock({ t }) {
  const stats = [
    { label: t('home.mockReportVotes'), value: 96 },
    { label: t('home.mockReportQuestions'), value: 24 },
  ]
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5">
            <p className="text-[11px] text-slate-400">{s.label}</p>
            <p className="text-xl font-bold text-white">
              {t('home.mockCount', { count: s.value })}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-800/40">
        <PollBars t={t} />
      </div>
    </div>
  )
}

/** 첫 화면용 — 콘솔 전체(좌: 큐시트, 우: 송출 화면) */
function ConsoleMock({ t }) {
  return (
    <MockFrame title={t('home.mockConsoleTitle')} icon={MonitorPlay} right={<LiveChip />}>
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="border-b md:border-b-0 md:border-r border-slate-800">
          <p className="px-4 pt-3 text-[11px] font-bold text-slate-400">{t('home.mockCueSheet')}</p>
          <CueList t={t} />
        </div>
        <div>
          <p className="px-4 pt-3 text-[11px] font-bold text-slate-400">{t('home.mockScreen')}</p>
          <StageScreen t={t} />
        </div>
      </div>
    </MockFrame>
  )
}

/**
 * 홈 (랜딩) — 행사 당일 진행 콘솔
 * 대행사·학회 사무국·기업 교육 담당이 세션을 만들고 큐시트·송출·Q&A·설문을 돌린다.
 */
export default function Home() {
  const { t } = useLanguage()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [joinCode, setJoinCode] = useState('')

  // 헤더·푸터의 구역 앵커(/#features, /#flow)로 들어오면 그 구역으로 스크롤
  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.key, location.hash])

  // 세션 만들기: 파트너(관리자 포함) → 만들기 화면, 일반 회원 → 파트너 신청(마이페이지), 비로그인 → 가입
  const canRunSessions = profile?.userType === 'partner' || profile?.role === 'admin'
  const createSessionTo = !user
    ? `/signup?redirect=${encodeURIComponent('/mypage')}`
    : canRunSessions
      ? '/partner/sessions/new'
      : '/mypage'

  const joinReady = joinCode.length === JOIN_CODE_LENGTH
  const handleJoin = (e) => {
    e.preventDefault()
    if (joinReady) navigate(`/join/${joinCode}`)
  }

  const audiences = [
    { icon: Briefcase, title: t('home.who1Title'), desc: t('home.who1Desc') },
    { icon: GraduationCap, title: t('home.who2Title'), desc: t('home.who2Desc') },
    { icon: Building2, title: t('home.who3Title'), desc: t('home.who3Desc') },
  ]

  const features = [
    {
      icon: ListChecks,
      title: t('home.feature1Title'),
      desc: t('home.feature1Desc'),
      mockTitle: t('home.mockCueSheet'),
      mock: <CueList t={t} />,
    },
    {
      icon: Tv,
      title: t('home.feature2Title'),
      desc: t('home.feature2Desc'),
      mockTitle: t('home.mockScreen'),
      mock: <StageScreen t={t} compact />,
    },
    {
      icon: MessageCircle,
      title: t('home.feature3Title'),
      desc: t('home.feature3Desc'),
      mockTitle: t('home.mockCueQna'),
      mock: <QnaBoard t={t} />,
    },
    {
      icon: BarChart3,
      title: t('home.feature4Title'),
      desc: t('home.feature4Desc'),
      mockTitle: t('home.mockCuePoll'),
      mock: <PollBars t={t} />,
    },
    {
      icon: Palette,
      title: t('home.feature5Title'),
      desc: t('home.feature5Desc'),
      mockTitle: t('home.mockDesignTitle'),
      mock: <DesignMock t={t} />,
    },
    {
      icon: FileSpreadsheet,
      title: t('home.feature6Title'),
      desc: t('home.feature6Desc'),
      mockTitle: t('home.mockReportTitle'),
      mock: <ReportMock t={t} />,
      mockRight: (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel
        </span>
      ),
    },
  ]

  const steps = [
    { title: t('home.flow1Title'), desc: t('home.flow1Desc') },
    { title: t('home.flow2Title'), desc: t('home.flow2Desc') },
    { title: t('home.flow3Title'), desc: t('home.flow3Desc') },
  ]

  const primaryButton =
    'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-orange-500/20'

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-orange-100 selection:text-orange-900 dark:selection:bg-orange-900 dark:selection:text-orange-100 overflow-x-hidden">
      <SEO url={PAGE_META.home.path} description={PAGE_META.home.description} jsonLd={SERVICE_JSONLD} />
      <PublicHeader />

      {/* ① 첫 화면 */}
      <section className="relative pt-28 pb-16 sm:pt-36 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute top-[10%] right-[-15%] w-[600px] h-[600px] rounded-full bg-rose-600/15 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <ScrollReveal>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 break-keep">
                <span className="block">{t('home.heroTitle1')}</span>
                <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                  {t('home.heroTitle2')}
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 break-keep">
                {t('home.heroDesc1')}
                <br className="hidden sm:block" />{' '}
                {t('home.heroDesc2')}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div
                id="join"
                className="scroll-mt-24 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xl mx-auto"
              >
                <Button asChild size="lg" className={`h-12 px-6 text-base font-bold ${primaryButton}`}>
                  <Link to={createSessionTo}>
                    {t('home.createSession')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <form onSubmit={handleJoin} className="flex flex-1 items-center gap-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(normalizeJoinCode(e.target.value))}
                    placeholder={t('home.joinPlaceholder')}
                    aria-label={t('home.joinLabel')}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={JOIN_CODE_LENGTH}
                    className="h-12 flex-1 min-w-0 text-base font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                  />
                  <Button type="submit" variant="outline" size="lg" disabled={!joinReady} className="h-12 px-5 text-base shrink-0">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('home.joinButton')}
                  </Button>
                </form>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t('home.joinHint')}</p>
              <OpenFreeNotice className="mt-8" />
            </ScrollReveal>
          </div>

          <ScrollReveal delay={200} className="mt-12 lg:mt-16 max-w-5xl mx-auto">
            <ConsoleMock t={t} />
          </ScrollReveal>
        </div>
      </section>

      {/* ② 누가 쓰나 */}
      <section className="py-16 lg:py-24 border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 lg:mb-14 break-keep">{t('home.whoTitle')}</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-5 lg:gap-8">
            {audiences.map((a, i) => (
              <ScrollReveal key={a.title} delay={i * 100} className="h-full">
                <div className="h-full rounded-2xl border bg-card p-6 lg:p-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-500 flex items-center justify-center mb-5">
                    <a.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{a.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed break-keep">{a.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 무엇을 하나 */}
      <section id="features" className="scroll-mt-16 py-16 lg:py-24 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-20">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 break-keep">{t('home.featuresTitle')}</h2>
              <p className="text-muted-foreground break-keep">{t('home.featuresDesc')}</p>
            </div>
          </ScrollReveal>

          <div className="space-y-14 lg:space-y-24">
            {features.map((f, i) => (
              <ScrollReveal key={f.title}>
                <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-center">
                  <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 break-keep">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed break-keep">{f.desc}</p>
                  </div>
                  <MockFrame title={f.mockTitle} icon={f.icon} right={f.mockRight} className="w-full max-w-xl mx-auto lg:max-w-none">
                    {f.mock}
                  </MockFrame>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ④ 하루의 흐름 */}
      <section id="flow" className="scroll-mt-16 py-16 lg:py-24 border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 lg:mb-14 break-keep">{t('home.flowTitle')}</h2>
          </ScrollReveal>
          <ol className="grid md:grid-cols-3 gap-5 lg:gap-8">
            {steps.map((s, i) => (
              <li key={s.title}>
                <ScrollReveal delay={i * 100} className="h-full">
                  <div className="h-full rounded-2xl border bg-card p-6 lg:p-8">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white text-sm font-bold mb-4">
                      {i + 1}
                    </span>
                    <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed break-keep">{s.desc}</p>
                  </div>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ⑤ 마지막 CTA */}
      <section className="py-16 lg:py-24 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center px-6 py-12 md:p-16">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 to-pink-500/15 pointer-events-none" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-keep">{t('home.finalCtaTitle')}</h2>
                <p className="text-slate-300 mb-8 break-keep">{t('home.finalCtaDesc')}</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <Button asChild size="lg" className="h-12 px-8 text-base font-bold bg-white text-slate-900 hover:bg-slate-100 border-0">
                    <Link to={createSessionTo}>{t('home.createSession')}</Link>
                  </Button>
                  {!user && (
                    <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white">
                      <Link to="/login">{t('auth.login')}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 푸터 — 실제 있는 라우트만 */}
      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">LivePulse</span>
              </div>
              <p className="text-sm text-muted-foreground break-keep">{t('home.footerTagline')}</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">{t('home.footerStart')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/#features" className="hover:text-primary">{t('nav.features')}</Link></li>
                <li><Link to="/#flow" className="hover:text-primary">{t('nav.flow')}</Link></li>
                <li><Link to="/login" className="hover:text-primary">{t('auth.login')}</Link></li>
                <li><Link to="/signup" className="hover:text-primary">{t('auth.signup')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">{t('home.footerLegal')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/legal/terms" className="hover:text-primary">{t('footer.terms')}</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-primary">{t('footer.privacy')}</Link></li>
                <li><Link to="/legal/refund" className="hover:text-primary">{t('home.footerRefund')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8">
            <p className="text-xs text-muted-foreground">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
