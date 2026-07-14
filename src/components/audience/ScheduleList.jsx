import { Clock, FileText, BarChart3, MessageCircle, Megaphone } from 'lucide-react'

/**
 * 청중 스케줄표 (PRD §5 — 큐시트 = 단일 진실 공급원)
 *
 * 판정 규칙 (PRD §5 일정 탭 판정 규칙):
 * - 지난/지금/다음은 벽시계가 아니라 display_order 기준
 * - 지금 = current_cue_id가 공개 목록에 있을 때만 하이라이트
 *   (비공개 큐 송출 중이면 하이라이트 무표시 — 내부 큐 존재를 유추시키지 않음)
 * - 지연: current_cue_fired_at이 계획보다 10분 이상 늦으면 "예정보다 늦게 진행 중"
 *   배지 + 미래 항목 시각은 디엠퍼시스("예정 HH:mm")
 * - 시간 미입력 큐가 섞여 있어도 순서 목록으로 자연 강등 (시간은 있으면 표시)
 *
 * @param {Array}  cues            공개 큐 목록 (sp_live_state_q의 cues_public)
 * @param {string} currentCueId    지금 송출 중인 큐 id (없으면 하이라이트 없음)
 * @param {string} currentCueFiredAt 큐 송출 시각 (지연 판정 기준)
 * @param {boolean} isLive         라이브 중 여부 (로비에서는 진행 표시 없음)
 */

const CUE_ICONS = {
  pdf: FileText,
  survey: BarChart3,
  qna: MessageCircle,
  notice: Megaphone,
}

const DELAY_THRESHOLD_MS = 10 * 60 * 1000

const formatTime = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ScheduleList({ cues = [], currentCueId, currentCueFiredAt, isLive = false }) {
  if (!cues.length) return null

  const sorted = [...cues].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const currentIdx = currentCueId ? sorted.findIndex((c) => c.id === currentCueId) : -1
  const showProgress = isLive && currentIdx >= 0

  // 지연 판정: 송출 시각이 현재 큐의 계획 시각보다 임계 초과로 늦음
  const current = currentIdx >= 0 ? sorted[currentIdx] : null
  const isDelayed =
    showProgress &&
    current?.planned_start_at &&
    currentCueFiredAt &&
    new Date(currentCueFiredAt) - new Date(current.planned_start_at) > DELAY_THRESHOLD_MS

  return (
    <div role="list" aria-label="오늘의 순서">
      {sorted.map((cue, idx) => {
        const Icon = CUE_ICONS[cue.cue_type] || Clock
        const isPast = showProgress && idx < currentIdx
        const isNow = showProgress && idx === currentIdx
        const isFuture = showProgress && idx > currentIdx
        const time = formatTime(cue.planned_start_at)

        return (
          <div
            key={cue.id}
            role="listitem"
            className={`flex items-start gap-3 px-3 py-2.5 border-b border-dashed border-slate-200 last:border-b-0 ${
              isNow ? 'bg-indigo-50 rounded-xl border-b-transparent' : ''
            }`}
          >
            {/* 시간 열 — 없으면 순서 번호로 강등 */}
            <div
              className={`w-12 shrink-0 pt-0.5 text-xs font-mono tabular-nums ${
                isNow ? 'text-indigo-600 font-bold' : 'text-slate-400'
              }`}
            >
              {time ? (
                isFuture && isDelayed ? (
                  // 지연 중 미래 시각은 "계획값"임을 명시 (PRD §5 — 시각이 거짓말하지 않게)
                  <span className="opacity-60">
                    예정
                    <br />
                    {time}
                  </span>
                ) : (
                  time
                )
              ) : (
                <span className="opacity-60">{idx + 1}</span>
              )}
            </div>

            <Icon
              className={`w-4 h-4 mt-0.5 shrink-0 ${isNow ? 'text-indigo-600' : 'text-slate-300'}`}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-semibold leading-snug ${
                  isPast
                    ? 'text-slate-400 line-through decoration-1'
                    : isNow
                      ? 'text-indigo-700'
                      : 'text-slate-700'
                }`}
              >
                {cue.title}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                {isNow && (
                  <span className="inline-flex items-center gap-1 font-bold text-indigo-600">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    지금 진행 중
                  </span>
                )}
                {isNow && isDelayed && (
                  <span className="font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    예정보다 늦게 진행 중
                  </span>
                )}
                {cue.presenter_name && <span>{cue.presenter_name}</span>}
                {cue.duration_min ? <span>· {cue.duration_min}분</span> : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
