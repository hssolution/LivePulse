import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import EnterScene from '@/components/audience/EnterScene'
import PreviewFrame from '@/components/session/PreviewFrame'
import SectionRenderer from '@/components/audience/SectionRenderer'
import SectionBand from '@/components/audience/SectionBand'
import { LobbyView, LiveView, EndedView, LobbyStatusBanner } from '@/pages/LiveSession'
import { deriveTokens, sceneSettings, joinCtaLabel } from '@/components/audience/sections/registry'
import {
  Smartphone, Tablet, Monitor, ArrowRight, X, ChevronRight, ChevronLeft,
  FileText, MessageCircle, BarChart3, Megaphone, Pause, Send, EyeOff,
} from 'lucide-react'

/**
 * 화면 디자인 시뮬레이터 — 청중·송출·좌장(콕핏)을 한 화면에서.
 *
 * 청중이 겪는 순서(참가→로비→라이브→송출→종료)를 실제 화면으로 미리보고,
 * 라이브에선 하단 "좌장 콕핏"(실제 StageControl UI 미러링)으로 강연자료·질문·투표·안내를
 * 조작하면 위의 청중·송출 화면이 실시간으로 바뀐다. 조작은 시뮬레이션 로컬 상태만
 * 바꾸며 실제 세션 DB에는 영향이 없다(발표자료·투표·질문은 세션의 실제 데이터를 읽어옴).
 */

// 강연 시작 전 → 진행 → 종료까지의 시간 흐름(단계).
// '송출'은 단계가 아니라 보기 방식(청중 폰 / 프로젝터)이므로 각 단계에서 토글로 본다.
const FLOW = [
  { key: 'enter', label: '참가', hint: '입장 전 — 청중은 참여 페이지, 스크린엔 참여 코드 안내' },
  { key: 'lobby', label: '로비', hint: '입장 완료 · 강연 시작 대기 — 스크린엔 "잠시 후 시작합니다"' },
  { key: 'live', label: '라이브', hint: '강연 중 — 아래 좌장 콕핏으로 자료·질문·투표를 조작' },
  { key: 'ended', label: '종료', hint: '강연 종료 — 청중·스크린 모두 종료 화면' },
]

const SAMPLE_Q = {
  content: 'AI 도입 초기에 구성원 저항을 줄이는 가장 효과적인 방법은?',
  category_name: '조직문화', category_color: '#e8641f',
  author_name: '이참가', is_anonymous: false, likes_count: 12,
}

// 업로드된 발표자료가 없을 때 송출 화면에 보여줄 내장 샘플 슬라이드 (16:9)
const SAMPLE_SLIDE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='960' height='540' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#ffffff'/>
      <rect width='960' height='96' fill='#0f172a'/>
      <text x='56' y='60' font-family='sans-serif' font-size='34' font-weight='700' fill='#ffffff'>AI 도입 성공의 3가지 조건</text>
      <text x='56' y='170' font-family='sans-serif' font-size='24' fill='#334155'>1. 명확한 목표와 측정 지표</text>
      <text x='56' y='230' font-family='sans-serif' font-size='24' fill='#334155'>2. 현장 구성원의 참여와 신뢰</text>
      <text x='56' y='290' font-family='sans-serif' font-size='24' fill='#334155'>3. 작게 시작해 빠르게 검증</text>
      <rect x='56' y='340' width='560' height='140' rx='12' fill='#eef2ff'/>
      <text x='84' y='400' font-family='sans-serif' font-size='20' fill='#4f46e5'>“기술보다 사람이 먼저입니다.”</text>
      <text x='800' y='510' font-family='sans-serif' font-size='18' fill='#94a3b8'>SLIDE / 24 (샘플)</text>
    </svg>`
  )

function stripHtml(s) {
  if (!s) return ''
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent || div.innerText || ''
}

// 결과 미리보기용 샘플 분포 (실제 응답이 없어도 결과 형태를 보여줌)
const SAMPLE_WEIGHTS = [38, 27, 19, 9, 4, 2, 1, 1]
function sampleResults(options) {
  const w = options.map((_, i) => SAMPLE_WEIGHTS[i] ?? 1)
  const sum = w.reduce((a, b) => a + b, 0) || 1
  return options.map((o, i) => ({ label: o.option_text, pct: Math.round((w[i] / sum) * 100) }))
}

function SampleJoinCard({ label }) {
  return (
    <button type="button" disabled className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 opacity-80 cursor-default">
      {label} <ArrowRight className="w-4 h-4" />
    </button>
  )
}

/** 송출(프로젝터) 배경 style — registry bgStyle 규칙과 동일 */
function simBroadcastBg(bg, tokens) {
  const brand = tokens?.brand || '#5157c9'
  const rgb = tokens?.cssVars?.['--lp-brand-rgb'] || '81,87,201'
  if (!bg || bg.type === 'none') return { background: '#0f172a' }
  if (bg.type === 'color') return { background: bg.color || '#0f172a' }
  if (bg.type === 'image' && bg.url) {
    const ov = Math.min(90, Math.max(0, bg.overlay ?? 45)) / 100
    return { backgroundColor: '#0f172a', backgroundImage: `linear-gradient(rgba(0,0,0,${ov}),rgba(0,0,0,${ov})),url(${bg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  if (bg.preset === 'custom') return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.from || brand}, ${bg.to || '#334155'})` }
  const presets = {
    brand: `linear-gradient(135deg, ${brand}, rgba(${rgb},0.65))`,
    night: 'linear-gradient(135deg,#0f172a,#334155)', sunset: 'linear-gradient(135deg,#e8641f,#e11d48)', forest: 'linear-gradient(135deg,#166534,#0d9488)',
  }
  return { background: presets[bg.preset] || presets.brand }
}

/** 송출(프로젝터) 화면 — 좌장 조작(activity)에 따라 발표자료/질문/투표/안내/대기 */
function SimBroadcast({ design, stage, activity, material, slidePage, broadcastQ, polls, pollOptions, selectedPollId, session }) {
  const dtok = deriveTokens(design?.tokens)
  const s = sceneSettings(design, 'broadcast')
  const header = design?.scenes?.broadcast?.headerSections || []
  const footer = design?.scenes?.broadcast?.footerSections || []
  const bandData = { session }
  const color = s.fontColor || '#ffffff'
  const total = material?.page_count || 24
  const slideUrl =
    activity === 'pdf' && material?.pages_path
      ? supabase.storage.from('session-assets').getPublicUrl(`${material.pages_path}/${slidePage}.webp`).data.publicUrl
      : null
  const q = broadcastQ || SAMPLE_Q

  let center
  // ── 강연 전/후 단계: 프로젝터는 행사 내내 켜져 있으므로 각 단계의 화면이 있다 ──
  if (stage === 'enter') {
    center = (
      <div style={{ color, textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.25, fontFamily: 'var(--lp-font-title)' }}>{session?.title}</div>
        <div style={{ opacity: 0.85, marginTop: 22, fontSize: 18 }}>휴대폰으로 참여 코드를 입력해 주세요</div>
        <div style={{ marginTop: 18, display: 'inline-block', padding: '14px 32px', borderRadius: 16, background: 'rgba(255,255,255,0.16)', fontSize: 44, fontWeight: 800, letterSpacing: '0.12em' }}>
          {session?.code}
        </div>
      </div>
    )
  } else if (stage === 'lobby') {
    center = (
      <div style={{ color, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.85 }}>잠시 후 시작합니다</div>
        <div style={{ fontSize: 40, fontWeight: 800, marginTop: 16, lineHeight: 1.25, fontFamily: 'var(--lp-font-title)' }}>{session?.title}</div>
        <div style={{ opacity: 0.75, marginTop: 20, fontSize: 16 }}>참여 코드 <b style={{ letterSpacing: '0.1em' }}>{session?.code}</b></div>
      </div>
    )
  } else if (stage === 'ended') {
    center = (
      <div style={{ color, textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'var(--lp-font-title)' }}>강연이 종료되었습니다</div>
        <div style={{ opacity: 0.82, marginTop: 18, fontSize: 20 }}>참여해 주셔서 감사합니다</div>
      </div>
    )
  } else if (activity === 'pdf') {
    center = (
      <div style={{ textAlign: 'center', width: '100%' }}>
        <img src={slideUrl || SAMPLE_SLIDE} alt="" style={{ maxWidth: '90%', maxHeight: '78%', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,.45)' }} />
        <div style={{ color, opacity: 0.85, marginTop: 12, fontSize: 14, fontWeight: 700 }}>{slidePage} / {total}</div>
      </div>
    )
  } else if (activity === 'qna') {
    center = (
      <div style={{ maxWidth: '90%', textAlign: s.align || 'center' }}>
        {q.category_name && <span style={{ fontSize: 14, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,.16)', color }}>{q.category_name}</span>}
        <div style={{ marginTop: 16, fontSize: Math.round((s.fontSize || 150) * 0.42), lineHeight: 1.25, fontWeight: 800, color, fontFamily: 'var(--lp-font-title)' }}>{stripHtml(q.content)}</div>
        {(q.author_name || q.likes_count) && <div style={{ marginTop: 14, color, opacity: 0.8, fontSize: 15 }}>{q.is_anonymous ? '익명' : q.author_name}{q.likes_count ? ` · ♥ ${q.likes_count}` : ''}</div>}
      </div>
    )
  } else if (activity === 'survey') {
    const selPoll = polls?.find((p) => p.id === selectedPollId)
    const opts = pollOptions?.[selectedPollId] || []
    if (selPoll && opts.length) {
      const results = sampleResults(opts)
      center = (
        <div style={{ width: '86%', maxWidth: 760 }}>
          <div style={{ color, fontSize: Math.round((s.fontSize || 150) * 0.3), lineHeight: 1.25, fontWeight: 800, textAlign: 'center', marginBottom: 28, fontFamily: 'var(--lp-font-title)' }}>
            {stripHtml(selPoll.question)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {results.map((r, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color, fontWeight: 700, fontSize: 20, marginBottom: 7 }}>
                  <span>{r.label}</span>
                  <span>{r.pct}%</span>
                </div>
                <div style={{ height: 16, borderRadius: 999, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: 999, background: color, transition: 'width .3s' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ color, opacity: 0.7, textAlign: 'center', marginTop: 20, fontSize: 14 }}>실시간 집계 · 샘플 미리보기</div>
        </div>
      )
    } else {
      center = <div style={{ color, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800 }}>📊 투표 진행 중</div><div style={{ opacity: 0.78, marginTop: 10 }}>띄울 투표를 선택하세요</div></div>
    }
  } else if (activity === 'notice') {
    center = <div style={{ color, textAlign: 'center', fontSize: 30, fontWeight: 800 }}>잠시 후 계속됩니다</div>
  } else {
    center = <div style={{ color, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800 }}>발표 진행 중</div><div style={{ opacity: 0.72, marginTop: 8 }}>대기 화면</div></div>
  }

  return (
    <div className="lp-audience" style={{ ...dtok.cssVars, ...simBroadcastBg(s.bg, dtok), minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--lp-font)' }}>
      {header.length ? <SectionBand sections={header} tokens={dtok} data={bandData} /> : null}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>{center}</div>
      {footer.length ? <SectionBand sections={footer} tokens={dtok} data={bandData} /> : null}
    </div>
  )
}

/** 좌장 콕핏 (하단 데크) — 실제 StageControl UI 미러링, 조작은 로컬 시뮬레이션 상태만 변경 */
function SimStageControl({ activity, setActivity, slidePage, setSlidePage, material, polls, selectedPollId, setSelectedPollId, questions, broadcastQ, setBroadcastQ }) {
  const total = material?.page_count || 24
  const MODES = [
    { key: 'pdf', label: '강연자료', icon: FileText },
    { key: 'qna', label: 'Q&A', icon: MessageCircle },
    { key: 'survey', label: '투표', icon: BarChart3 },
    { key: 'notice', label: '안내', icon: Megaphone },
  ]
  return (
    <div className="border-t-2 border-indigo-500/40 bg-white dark:bg-slate-900 flex-shrink-0 flex flex-col" style={{ maxHeight: '38vh' }}>
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">🎛 좌장 콕핏</span>
        <span className="text-[10px] text-slate-400 shrink-0">— 여기서 조작하면 위 청중·송출 화면이 바뀝니다</span>
        <div className="ml-auto flex gap-1">
          {MODES.map((m) => {
            const Icon = m.icon
            const on = activity === m.key
            return (
              <button key={m.key} type="button" onClick={() => setActivity(m.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors ${on ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <Icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            )
          })}
          <button type="button" onClick={() => setActivity('idle')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors ${activity === 'idle' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'}`}>
            <Pause className="w-3.5 h-3.5" /> 대기
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 overflow-y-auto">
        {activity === 'pdf' && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[40%]">{material?.title || '발표 자료 (샘플)'}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSlidePage(Math.max(1, slidePage - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold w-16 text-center">{slidePage} / {total}</span>
              <button type="button" onClick={() => setSlidePage(Math.min(total, slidePage + 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <span className="text-[11px] text-slate-400">페이지를 넘기면 송출 화면 슬라이드가 바뀝니다</span>
          </div>
        )}

        {activity === 'qna' && (
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">청중에 띄울 질문 선택</div>
            {questions.length === 0 ? (
              <p className="text-xs text-slate-400">등록된 질문이 없어 샘플 질문을 송출합니다.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {questions.map((q) => {
                  const on = broadcastQ?.id === q.id
                  return (
                    <button key={q.id} type="button" onClick={() => setBroadcastQ(q)}
                      className={`shrink-0 w-56 text-left rounded-xl border p-2.5 transition-colors ${on ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className="text-xs font-medium line-clamp-2 text-slate-800 dark:text-slate-100">{stripHtml(q.content)}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>{q.is_anonymous ? '익명' : q.author_name || '익명'}</span>
                        {q.likes_count > 0 && <span>· ♥ {q.likes_count}</span>}
                        {on && <span className="ml-auto inline-flex items-center gap-0.5 text-indigo-600 font-bold"><Send className="w-3 h-3" /> 송출 중</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activity === 'survey' && (
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">준비된 투표 ({polls.length})</div>
            {polls.length === 0 ? (
              <p className="text-xs text-slate-400">설정 에디터에서 투표를 만들면 여기서 띄울 수 있어요.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {polls.map((p, i) => {
                  const on = p.id === selectedPollId
                  return (
                    <div key={p.id} className={`shrink-0 w-64 rounded-xl border p-2.5 ${on ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className="text-xs font-semibold line-clamp-2 text-slate-800 dark:text-slate-100">{i + 1}. {stripHtml(p.question)}</div>
                      <button type="button" onClick={() => setSelectedPollId(on ? null : p.id)}
                        className={`mt-2 w-full text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 ${on ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {on ? (<><EyeOff className="w-3.5 h-3.5" /> 내리기</>) : (<><Send className="w-3.5 h-3.5" /> 청중에 띄우기</>)}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activity === 'notice' && <p className="text-xs text-slate-400">청중·송출 화면에 “잠시 후 계속됩니다” 안내가 표시됩니다.</p>}
        {activity === 'idle' && <p className="text-xs text-slate-400">대기 화면 — 발표 진행 중 안내가 표시됩니다.</p>}
      </div>
    </div>
  )
}

export default function DesignSimulator({
  session, template, assets,
  design: designProp = null, presenters: presentersProp = null, cues: cuesProp = null,
  previewDevice: deviceProp, setPreviewDevice: setDeviceProp, getPreviewSize: getSizeProp,
  onClose = null,
}) {
  const [scene, setScene] = useState('enter')
  const [liveView, setLiveView] = useState('both') // 라이브 표시: both | audience | broadcast
  const [liveTab, setLiveTab] = useState('now')
  const [activity, setActivity] = useState('idle') // 좌장 조작: idle|pdf|qna|survey|notice
  const [slidePage, setSlidePage] = useState(1)
  const [selectedPollId, setSelectedPollId] = useState(null)
  const [broadcastQ, setBroadcastQ] = useState(null)
  const [fetchedCues, setFetchedCues] = useState([])
  const [fetchedDesign, setFetchedDesign] = useState(null)
  const [material, setMaterial] = useState(null)
  const [polls, setPolls] = useState([])
  const [pollOptions, setPollOptions] = useState({}) // poll_id → [{option_text}]
  const [questions, setQuestions] = useState([])

  const [deviceState, setDeviceState] = useState('mobile')
  const previewDevice = deviceProp ?? deviceState
  const setPreviewDevice = setDeviceProp ?? setDeviceState
  const getPreviewSize = getSizeProp ?? (() => (previewDevice === 'mobile' ? 'max-w-[420px]' : previewDevice === 'tablet' ? 'max-w-[768px]' : 'max-w-[1100px]'))

  const simDesign = designProp || fetchedDesign
  const presenters = presentersProp || []

  useEffect(() => {
    if (designProp || !session?.id) return
    let cancelled = false
    supabase.rpc('sp_partner_design_s', { p_session_id: session.id, p_action: 'get' }).then(({ data }) => { if (!cancelled) setFetchedDesign(data?.draft || data?.published || null) })
    return () => { cancelled = true }
  }, [session?.id, designProp])

  useEffect(() => {
    if (cuesProp || !session?.id) return
    let cancelled = false
    supabase.rpc('sp_partner_cues_q', { p_session_id: session.id }).then(({ data }) => {
      if (cancelled || !Array.isArray(data)) return
      setFetchedCues(data.filter((c) => c.is_public !== false).map((c) => ({
        id: c.id, title: c.public_title || c.title, cue_type: c.cue_type,
        planned_start_at: c.planned_start_at, duration_min: c.duration_min, display_order: c.display_order, presenter_name: c.presenter_name,
      })))
    })
    return () => { cancelled = true }
  }, [session?.id, cuesProp])

  // 발표자료·투표·질문 실데이터 (좌장 콕핏용) — 없으면 샘플/안내 폴백
  useEffect(() => {
    if (!session?.id) return
    let cancelled = false
    supabase.from('lecture_files').select('id,title,file_url,pages_path,page_count').eq('session_id', session.id).order('display_order').limit(1).maybeSingle().then(({ data }) => { if (!cancelled) setMaterial(data || null) })
    supabase.from('polls').select('id,question,status').eq('session_id', session.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (cancelled) return
      const list = Array.isArray(data) ? data : []
      setPolls(list)
      if (list.length) {
        supabase.from('poll_options').select('poll_id,option_text,display_order').in('poll_id', list.map((p) => p.id)).order('display_order').then(({ data: opts }) => {
          if (cancelled || !Array.isArray(opts)) return
          const map = {}
          opts.forEach((o) => { (map[o.poll_id] ||= []).push(o) })
          setPollOptions(map)
        })
      }
    })
    supabase.from('questions').select('id,content,author_name,is_anonymous,likes_count').eq('session_id', session.id).order('created_at', { ascending: false }).limit(8).then(({ data }) => { if (!cancelled) setQuestions(Array.isArray(data) ? data : []) })
    return () => { cancelled = true }
  }, [session?.id])

  const cues = cuesProp || fetchedCues

  useEffect(() => { setLiveTab('now') }, [scene])
  useEffect(() => { if (activity === 'pdf') setSlidePage(1) }, [activity])
  // 투표 모드 진입 시 첫 투표 자동 선택 (빈 화면 방지)
  useEffect(() => {
    if (activity === 'survey' && !selectedPollId && polls.length) setSelectedPollId(polls[0].id)
  }, [activity, polls, selectedPollId])

  if (!session) return <p className="text-center text-sm text-slate-400 mt-10">세션 정보를 불러오는 중입니다.</p>

  const liveCommon = {
    session, presenters, template, assets, isPreview: true, embedded: true,
    activeTab: liveTab, setActiveTab: setLiveTab, cues, code: session.code,
    participantToken: null, offline: false, designTokens: simDesign?.tokens, design: simDesign,
    simulate: true, // 투표를 DB status와 무관하게 선택한 것으로 로드
  }

  const buildBroadcast = () => {
    switch (activity) {
      case 'pdf':
        return material
          ? { success: true, broadcast_mode: 'pdf', pdf: { page: slidePage, pages_path: material.pages_path, page_count: material.page_count, title: material.title, file_url: material.file_url }, categories: [] }
          : { success: true, broadcast_mode: 'idle', categories: [] }
      case 'qna':
        return { success: true, broadcast_mode: 'qna', question: broadcastQ || SAMPLE_Q, categories: [] }
      case 'survey':
        return selectedPollId ? { success: true, broadcast_mode: 'survey', active_poll_id: selectedPollId, categories: [] } : { success: true, broadcast_mode: 'idle', categories: [] }
      case 'notice':
        return { success: true, broadcast_mode: 'notice', broadcast_notice: '잠시 후 계속됩니다', categories: [] }
      default:
        return { success: true, broadcast_mode: 'idle', categories: [] }
    }
  }

  const audienceLive = <LiveView {...liveCommon} broadcast={buildBroadcast()} hasActivePoll={activity === 'survey' && !!selectedPollId} />
  const projector = (
    <SimBroadcast design={simDesign} stage={scene} activity={activity} material={material} slidePage={slidePage}
      broadcastQ={broadcastQ} polls={polls} pollOptions={pollOptions} selectedPollId={selectedPollId} session={session} />
  )

  const renderStatic = () => {
    switch (scene) {
      case 'enter':
        return simDesign ? (
          <SectionRenderer design={simDesign} scene="enter" data={{ session, presenters, cues }} slots={{ joinCard: <SampleJoinCard label={joinCtaLabel(simDesign)} /> }} />
        ) : (
          <EnterScene session={session} template={template} assets={assets} isPreview joinCard={<SampleJoinCard label="세션 참여하기" />} />
        )
      case 'lobby':
        return simDesign?.scenes?.lobby?.sections?.length ? (
          <SectionRenderer design={simDesign} scene="lobby" data={{ session, presenters, cues }} prepend={<LobbyStatusBanner code={session.code} />} />
        ) : (
          <LobbyView session={session} presenters={presenters} template={template} assets={assets} cues={cues} embedded designTokens={simDesign?.tokens} />
        )
      case 'ended': {
        const dtok = deriveTokens(simDesign?.tokens)
        const bandData = { session, presenters, cues }
        const eh = simDesign?.scenes?.ended?.headerSections || []
        const ef = simDesign?.scenes?.ended?.footerSections || []
        return (
          <EndedView session={session} navigate={() => {}} template={template} assets={assets} embedded designTokens={simDesign?.tokens}
            headerBand={eh.length ? <SectionBand sections={eh} tokens={dtok} data={bandData} className="!py-2" /> : null}
            footerBand={ef.length ? <SectionBand sections={ef} tokens={dtok} data={bandData} className="!py-2" /> : null}
          />
        )
      }
      default:
        return null
    }
  }

  const idx = FLOW.findIndex((s) => s.key === scene)
  const cur = FLOW[idx] || FLOW[0]
  const nextScene = FLOW[(idx + 1) % FLOW.length]
  const isLive = scene === 'live' // 좌장 콕핏은 강연 중에만
  const audience = isLive ? audienceLive : renderStatic()

  const AudienceFrame = ({ className = '' }) => (
    <PreviewFrame className={`bg-white rounded-lg shadow-lg border-0 ${className}`} style={{ height: '100%' }}>
      {audience}
    </PreviewFrame>
  )
  const ProjectorFrame = ({ className = '' }) => (
    <PreviewFrame className={`bg-white rounded-lg shadow-lg border-0 ${className}`} style={{ height: '100%' }}>
      {projector}
    </PreviewFrame>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 시간 흐름 스트립 (참가 → 로비 → 라이브 → 종료) */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {FLOW.map((s, i) => (
            <div key={s.key} className="flex items-center">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
              <button type="button" onClick={() => setScene(s.key)} title={s.hint}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${scene === s.key ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {s.label}
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* 보기: 모든 단계에서 청중 폰 / 프로젝터를 선택 */}
          <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {[['both', '나란히'], ['audience', '청중'], ['broadcast', '송출']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setLiveView(k)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${liveView === k ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {l}
              </button>
            ))}
          </div>
          {liveView === 'audience' && (
            <div className="flex gap-1 text-slate-400 dark:text-slate-500">
              <button type="button" onClick={() => setPreviewDevice('mobile')} className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="모바일"><Smartphone className="w-4 h-4" /></button>
              <button type="button" onClick={() => setPreviewDevice('tablet')} className={`p-1.5 rounded ${previewDevice === 'tablet' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="태블릿"><Tablet className="w-4 h-4" /></button>
              <button type="button" onClick={() => setPreviewDevice('desktop')} className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="PC"><Monitor className="w-4 h-4" /></button>
            </div>
          )}
          {onClose && <button type="button" onClick={onClose} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="닫기"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* 현재 단계 안내 + 다음 단계로 */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug min-w-0 truncate">
          <b className="text-slate-700 dark:text-slate-200">{cur.label}</b> · {cur.hint}
        </p>
        <button type="button" onClick={() => setScene(nextScene.key)} className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
          다음: {nextScene.label} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 프레임 영역 — 모든 단계에서 청중/송출/나란히 */}
      <div className="flex-1 min-h-0 p-3">
        {liveView === 'broadcast' ? (
          <div className="h-full flex flex-col">
            <p className="text-[10px] font-bold text-slate-400 mb-1 text-center">🖥 송출 화면 (프로젝터)</p>
            <div className="flex-1 min-h-0"><ProjectorFrame className="mx-auto block w-full max-w-[1100px] h-full" /></div>
          </div>
        ) : liveView === 'audience' ? (
          <div className="h-full flex flex-col items-center">
            <p className="text-[10px] font-bold text-slate-400 mb-1 text-center">📱 청중 화면</p>
            <div className="flex-1 min-h-0 w-full flex justify-center"><AudienceFrame className={`h-full ${getPreviewSize()}`} /></div>
          </div>
        ) : (
          <div className="h-full flex gap-3 justify-center">
            <div className="w-[340px] shrink-0 flex flex-col min-h-0">
              <p className="text-[10px] font-bold text-slate-400 mb-1 text-center">📱 청중 화면</p>
              <div className="flex-1 min-h-0"><AudienceFrame className="w-full h-full" /></div>
            </div>
            <div className="flex-1 min-w-[300px] flex flex-col min-h-0">
              <p className="text-[10px] font-bold text-slate-400 mb-1 text-center">🖥 송출 화면 (프로젝터)</p>
              <div className="flex-1 min-h-0"><ProjectorFrame className="w-full h-full" /></div>
            </div>
          </div>
        )}
      </div>

      {/* 좌장 콕핏 — 강연 중(라이브)에만 */}
      {isLive && (
        <SimStageControl
          activity={activity} setActivity={setActivity}
          slidePage={slidePage} setSlidePage={setSlidePage} material={material}
          polls={polls} selectedPollId={selectedPollId} setSelectedPollId={setSelectedPollId}
          questions={questions} broadcastQ={broadcastQ} setBroadcastQ={setBroadcastQ}
        />
      )}
    </div>
  )
}
