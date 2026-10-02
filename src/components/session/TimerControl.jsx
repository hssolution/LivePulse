import { useState } from 'react'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, Tv, EyeOff, ExternalLink, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import TimerFace from '@/components/session/TimerFace'

const PRESET_MIN = [1, 3, 5, 10, 15, 20, 30]
const WARN_OPTIONS = [0, 30, 60, 120, 300]

/**
 * 콘솔 «타이머» 탭 (028) — 시작·일시정지·리셋·시간 설정·경고 기준·송출 화면 띄우기
 * 상태 정본은 서버(sp_partner_timer_s). 응답을 바로 반영하고, 송출 화면은 sessions realtime 으로 따라온다.
 */
export default function TimerControl({ sessionId, sessionCode, onBroadcast }) {
  const { t } = useLanguage()
  const { timer, remaining, broadcastMode, applyTimer, setBroadcastMode } = useSessionTimer(sessionCode)
  const [busy, setBusy] = useState(false)
  const [min, setMin] = useState('')
  const [sec, setSec] = useState('')

  const act = async (action, seconds) => {
    setBusy(true)
    try {
      const params = { p_session_id: sessionId, p_action: action }
      if (seconds != null) params.p_seconds = seconds
      const { data, error } = await supabase.rpc('sp_partner_timer_s', params)
      if (error || !data?.success) throw error || new Error(data?.error)
      applyTimer(data.timer, data.server_now)
    } catch (err) {
      console.error('Timer action failed:', err)
      toast.error(t('timer.error', '타이머를 바꾸지 못했습니다'))
    } finally {
      setBusy(false)
    }
  }

  const setCustom = () => {
    const m = parseInt(min || '0', 10)
    const s = parseInt(sec || '0', 10)
    if (Number.isNaN(m) || Number.isNaN(s) || m < 0 || s < 0 || s > 59) {
      toast.error(t('timer.invalidTime', '시간을 다시 확인해 주세요'))
      return
    }
    const total = m * 60 + s
    if (total <= 0 || total > 86400) {
      toast.error(t('timer.invalidTime', '시간을 다시 확인해 주세요'))
      return
    }
    act('set', total)
  }

  const onAir = broadcastMode === 'timer'
  const toggleBroadcast = async () => {
    setBusy(true)
    try {
      const next = onAir ? 'idle' : 'timer'
      const { data, error } = await supabase.rpc('sp_partner_broadcast_mode_s', { p_session_id: sessionId, p_mode: next })
      if (error || !data?.success) throw error || new Error(data?.error)
      setBroadcastMode(next)
      toast.success(next === 'timer' ? t('timer.onAirDone', '송출 화면에 타이머를 띄웠습니다') : t('timer.offAirDone', '송출 화면을 대기 화면으로 돌렸습니다'))
      onBroadcast?.()
    } catch (err) {
      console.error('Timer broadcast toggle failed:', err)
      toast.error(t('timer.error', '타이머를 바꾸지 못했습니다'))
    } finally {
      setBusy(false)
    }
  }

  if (!timer) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  const btn = 'px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50'

  return (
    <div className="max-w-2xl mx-auto space-y-4" data-testid="timer-control">
      <TimerFace remaining={remaining} warnSec={timer.warn_sec} running={timer.running} size="preview" />

      {/* 시작/일시정지 · 리셋 · ±1분 */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act(timer.running ? 'pause' : 'start')}
          className={`col-span-2 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 ${timer.running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          data-testid="timer-toggle"
        >
          {timer.running ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          {timer.running ? t('timer.pause', '일시정지') : t('timer.start', '시작')}
        </button>
        <button type="button" disabled={busy} onClick={() => act('reset')} className={`${btn} flex items-center justify-center gap-1.5`} data-testid="timer-reset">
          <RotateCcw className="w-4 h-4" /> {t('timer.reset', '리셋')}
        </button>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" disabled={busy} onClick={() => act('add', -60)} className={btn} title={t('timer.minus1', '1분 빼기')}>−1m</button>
          <button type="button" disabled={busy} onClick={() => act('add', 60)} className={btn} title={t('timer.plus1', '1분 더하기')}>+1m</button>
        </div>
      </div>

      {/* 시간 설정 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="text-xs font-bold text-slate-400 mb-2">
          {t('timer.setTitle', '시간 설정')} · {t('timer.current', '설정값')} {Math.floor(timer.duration_sec / 60)}:{String(timer.duration_sec % 60).padStart(2, '0')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_MIN.map((m) => (
            <button key={m} type="button" disabled={busy} onClick={() => act('set', m * 60)} className={btn} data-testid={`timer-preset-${m}`}>
              {t('timer.minutes', { count: m })}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            min="0"
            max="1440"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={t('timer.minPlaceholder', '분')}
            className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
            data-testid="timer-min"
          />
          <span className="text-slate-400">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={sec}
            onChange={(e) => setSec(e.target.value)}
            placeholder={t('timer.secPlaceholder', '초')}
            className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
            data-testid="timer-sec"
          />
          <button type="button" disabled={busy} onClick={setCustom} className={`${btn} bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent`} data-testid="timer-set">
            {t('timer.apply', '설정')}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 text-sm">
          <span className="text-slate-500">{t('timer.warnLabel', '경고색(노랑) 기준')}</span>
          <select
            value={timer.warn_sec}
            disabled={busy}
            onChange={(e) => act('warn', parseInt(e.target.value, 10))}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
            data-testid="timer-warn"
          >
            {WARN_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w === 0 ? t('timer.warnOff', '끄기') : w < 60 ? t('timer.warnSec', { count: w }) : t('timer.warnMin', { count: w / 60 })}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2">{t('timer.colorHint', '남은 시간이 기준 이하면 노랑, 0이 되면 빨강, 넘기면 +로 초과 시간을 셉니다.')}</p>
      </div>

      {/* 송출 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={toggleBroadcast}
          className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 ${onAir ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          data-testid="timer-broadcast"
        >
          {onAir ? <EyeOff className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
          {onAir ? t('timer.offAir', '송출 화면에서 타이머 내리기') : t('timer.onAir', '송출 화면에 타이머 띄우기')}
        </button>
        <a
          href={`/timer/${sessionCode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
        >
          <ExternalLink className="w-4 h-4" /> {t('timer.openDisplay', '타이머 전용 화면 열기(발표자용 모니터)')}
        </a>
      </div>
    </div>
  )
}
