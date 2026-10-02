import { useLanguage } from '@/context/LanguageContext'

/** 초 → "m:ss" / "h:mm:ss" (음수면 앞에 +) */
export function formatTimer(sec) {
  if (sec == null) return '--:--'
  const over = sec < 0
  const s = Math.abs(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const body = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return over ? `+${body}` : body
}

/** 남은 시간 → 단계: normal / warn(경고 기준 이하) / zero(0초) / over(초과) */
export function timerPhase(remaining, warnSec) {
  if (remaining == null) return 'normal'
  if (remaining < 0) return 'over'
  if (remaining === 0) return 'zero'
  if (warnSec > 0 && remaining <= warnSec) return 'warn'
  return 'normal'
}

const PHASE_COLOR = {
  normal: '#ffffff',
  warn: '#facc15', // 노랑
  zero: '#ef4444', // 빨강
  over: '#ef4444',
}

/**
 * 큰 숫자 타이머 — 송출 화면(timer 모드)·타이머 전용 화면·콘솔 미리보기가 같이 쓴다.
 * size: 'full'(화면 가득) | 'preview'(콘솔 안)
 */
export default function TimerFace({ remaining, warnSec = 60, running = false, title = '', size = 'full' }) {
  const { t } = useLanguage()
  const phase = timerPhase(remaining, warnSec)
  const color = PHASE_COLOR[phase]
  const full = size === 'full'
  const text = formatTimer(remaining)
  // 글자 수가 늘면(+초과·시간 단위) 화면 폭을 넘지 않게 줄인다
  const fullSize = `min(${(148 / Math.max(5, text.length)).toFixed(1)}vw, 62vh)`
  const status =
    phase === 'over'
      ? t('timer.statusOver', '시간 초과')
      : phase === 'zero'
      ? t('timer.statusZero', '시간 종료')
      : running
      ? ''
      : t('timer.statusPaused', '일시정지')

  return (
    <div
      className={`${full ? 'min-h-screen' : 'rounded-2xl py-6'} relative w-full flex flex-col items-center justify-center select-none transition-colors duration-500`}
      style={{ backgroundColor: phase === 'over' ? '#2a0909' : '#0d0d14' }}
      data-testid="timer-face"
      data-phase={phase}
    >
      {full && title && (
        <div className="absolute top-6 left-0 right-0 text-center text-slate-400 font-semibold text-2xl truncate px-8">{title}</div>
      )}
      <div
        className={`font-black tabular-nums leading-none ${phase === 'zero' || phase === 'over' ? 'animate-pulse' : ''}`}
        style={{
          color,
          fontSize: full ? fullSize : text.length > 5 ? '72px' : '84px',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
        data-testid="timer-digits"
      >
        {text}
      </div>
      <div
        className={`${full ? 'text-4xl mt-6' : 'text-sm mt-2'} font-bold h-[1.2em]`}
        style={{ color: phase === 'normal' ? '#94a3b8' : color }}
      >
        {status}
      </div>
    </div>
  )
}
