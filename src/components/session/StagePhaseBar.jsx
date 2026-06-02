import { Megaphone, Play, FileText, MessageCircle, BarChart3, Pause, CheckCircle2, Clock, ChevronRight } from 'lucide-react'

/**
 * 세션 진행 단계 바 (좌장 콕핏 공용)
 *
 * 세션 status + broadcast_mode 를 사람이 읽는 "지금 단계 · 다음 할 일"로 풀어
 * 좌장이 "지금 어디에 있고 다음에 뭘 해야 하는지"를 한눈에 보게 한다.
 *
 * props:
 *  - status: 'draft' | 'published' | 'active' | 'ended' | 'cancelled'
 *  - broadcastMode: 'idle' | 'pdf' | 'qna' | 'survey' | null  (status==='active'일 때만 의미)
 *  - compact?: boolean  (좁은 폭에서 스텝퍼 숨김)
 */

// 거시 단계(세션 일생) 스텝퍼
const MACRO_STEPS = [
  { key: 'draft', label: '초안' },
  { key: 'published', label: '게시·모집' },
  { key: 'active', label: '라이브' },
  { key: 'ended', label: '종료' },
]

function resolvePhase(status, broadcastMode) {
  if (status === 'draft') {
    return { tone: 'amber', icon: Clock, label: '준비 중', next: '준비 마법사에서 내용을 채우고 게시하세요' }
  }
  if (status === 'published') {
    return { tone: 'sky', icon: Megaphone, label: '게시·모집 중', next: '"라이브 시작"을 누르면 청중 화면이 라이브로 전환됩니다' }
  }
  if (status === 'active') {
    const m = broadcastMode || 'idle'
    if (m === 'pdf') return { tone: 'emerald', icon: FileText, label: '라이브 · 강연 중', next: '질문이 쌓이면 Q&A 모드로 전환해 송출하세요' }
    if (m === 'qna') return { tone: 'emerald', icon: MessageCircle, label: '라이브 · Q&A', next: '질문을 승인하고 "송출"로 청중 화면에 올리세요' }
    if (m === 'survey') return { tone: 'emerald', icon: BarChart3, label: '라이브 · 설문', next: '실시간 결과를 확인하고 마무리되면 다음 단계로' }
    return { tone: 'emerald', icon: Pause, label: '라이브 · 대기 화면', next: '강연자료를 선택해 송출하면 강연이 시작됩니다' }
  }
  if (status === 'ended') {
    return { tone: 'slate', icon: CheckCircle2, label: '종료', next: '리포트에서 참여·Q&A 결과를 확인하세요' }
  }
  if (status === 'cancelled') {
    return { tone: 'rose', icon: Pause, label: '취소됨', next: '이 세션은 취소되었습니다' }
  }
  return { tone: 'slate', icon: Clock, label: '—', next: '' }
}

const TONES = {
  amber: { dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  sky: { dot: 'bg-sky-400', chip: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  emerald: { dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  slate: { dot: 'bg-slate-400', chip: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  rose: { dot: 'bg-rose-400', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
}

export default function StagePhaseBar({ status, broadcastMode, compact = false }) {
  const phase = resolvePhase(status, broadcastMode)
  const tone = TONES[phase.tone] || TONES.slate
  const Icon = phase.icon
  // 스텝퍼에서 cancelled는 draft 위치로 취급
  const activeIdx = MACRO_STEPS.findIndex((s) => s.key === (status === 'cancelled' ? 'draft' : status))

  return (
    <div className="bg-[#0e0e18] border-b border-slate-800 px-5 py-2.5 flex items-center gap-4 flex-shrink-0">
      {/* 지금 단계 */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${tone.chip}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${tone.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
        <Icon className="w-4 h-4" />
        {phase.label}
      </div>

      {/* 다음 할 일 */}
      {phase.next && (
        <div className="flex items-center gap-1.5 text-sm text-slate-300 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wide text-amber-300/90 shrink-0">다음 할 일</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="truncate text-slate-300">{phase.next}</span>
        </div>
      )}

      {/* 거시 진행 스텝퍼 */}
      {!compact && (
        <div className="ml-auto hidden md:flex items-center gap-1.5 shrink-0">
          {MACRO_STEPS.map((s, i) => {
            const done = i < activeIdx
            const on = i === activeIdx
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    on
                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50'
                      : done
                        ? 'bg-slate-700/40 text-slate-400 border-transparent'
                        : 'text-slate-600 border-transparent'
                  }`}
                >
                  {s.label}
                </span>
                {i < MACRO_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
