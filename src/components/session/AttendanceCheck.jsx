import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, ClipboardCheck, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { getAttendKey } from '@/lib/participant'

const dismissKey = (code) => `lp_attend_dismissed:${code}`

/**
 * 청중 출석 체크 (028) — 주최가 출석을 켠 세션에서만 뜬다.
 * 이름(또는 닉네임) 필수 + 소속 선택. 전화번호·이메일은 받지 않는다.
 * 출석 전: 화면 아래 카드(«나중에»로 접으면 작은 버튼) / 출석 뒤: 작은 «출석 완료» 칩(눌러서 이름 고치기)
 */
export default function AttendanceCheck({ code, status, bottomClass = 'bottom-4' }) {
  const { t } = useLanguage()
  const [info, setInfo] = useState(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!code) return
    const { data, error: err } = await supabase.rpc('sp_live_attendance_q', { p_code: code, p_key: getAttendKey(code) })
    if (err || !data?.success) return
    setInfo(data)
    if (data.checked_in) {
      setName(data.name || '')
      setAffiliation(data.affiliation || '')
    } else if (data.attendance_enabled) {
      let dismissed = false
      try {
        dismissed = sessionStorage.getItem(dismissKey(code)) === '1'
      } catch { /* 무시 */ }
      setOpen(!dismissed)
    }
  }, [code])

  useEffect(() => {
    load()
  }, [load, status])

  if (!info?.attendance_enabled || !['published', 'active'].includes(status)) return null

  const submit = async (e) => {
    e?.preventDefault()
    const n = name.trim()
    if (!n) {
      setError(t('attendance.nameRequired', '이름을 적어 주세요'))
      return
    }
    setSending(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('sp_live_attendance_s', {
        p_code: code,
        p_key: getAttendKey(code),
        p_name: n,
        p_affiliation: affiliation.trim() || null,
      })
      if (err) throw err
      if (!data?.success) {
        if (data?.error === 'attendance_disabled') setError(t('attendance.disabled', '지금은 출석을 받지 않습니다'))
        else if (data?.error === 'session_not_open') setError(t('attendance.closed', '출석 시간이 지났습니다'))
        else setError(t('attendance.failed', '출석하지 못했습니다. 잠시 후 다시 시도해 주세요'))
        return
      }
      setInfo({ ...info, checked_in: true, name: data.name, affiliation: data.affiliation })
      setOpen(false)
      toast.success(t('attendance.done', '출석했습니다'))
    } catch (err) {
      console.error('Attendance failed:', err)
      setError(t('attendance.failed', '출석하지 못했습니다. 잠시 후 다시 시도해 주세요'))
    } finally {
      setSending(false)
    }
  }

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(code), '1')
    } catch { /* 무시 */ }
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed ${bottomClass} left-3 z-40 px-3 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-1.5 ${
          info.checked_in ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white animate-pulse'
        }`}
        data-testid={info.checked_in ? 'attendance-done-chip' : 'attendance-open'}
      >
        {info.checked_in ? <CheckCircle2 className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
        {info.checked_in ? t('attendance.chipDone', '출석 완료') : t('attendance.chipOpen', '출석 체크')}
      </button>
    )
  }

  return (
    <div className={`fixed ${bottomClass} left-3 right-3 z-40 flex justify-center`}>
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-4"
        data-testid="attendance-form"
      >
        <div className="flex items-center justify-between">
          <p className="font-bold flex items-center gap-1.5">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            {info.checked_in ? t('attendance.editTitle', '출석 정보 고치기') : t('attendance.title', '출석 체크')}
          </p>
          <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-600 p-1" aria-label={t('attendance.later', '나중에')}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">{t('attendance.desc', '이름(또는 닉네임)만 적으면 됩니다. 전화번호는 받지 않습니다.')}</p>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('attendance.namePlaceholder', '이름 또는 닉네임 (필수)')}
          className="w-full mt-3 px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-400"
          data-testid="attendance-name"
          autoComplete="name"
        />
        <input
          type="text"
          value={affiliation}
          maxLength={100}
          onChange={(e) => setAffiliation(e.target.value)}
          placeholder={t('attendance.affiliationPlaceholder', '소속 (선택)')}
          className="w-full mt-2 px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-400"
          data-testid="attendance-affiliation"
          autoComplete="organization"
        />
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          {!info.checked_in && (
            <button type="button" onClick={dismiss} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50">
              {t('attendance.later', '나중에')}
            </button>
          )}
          <button
            type="submit"
            disabled={sending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
            data-testid="attendance-submit"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {info.checked_in ? t('common.save', '저장') : t('attendance.submit', '출석하기')}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * 참여 코드 입장 화면용 출석 폼 (028) — 주최가 출석을 켠 세션에서 비로그인 청중의 입장 수단.
 * 이름(필수)·소속(선택)만 받고 출석과 동시에 입장한다(기존 전화번호 입력 폼 대신).
 */
export function AttendanceJoinForm({ code, ctaLabel, onDone }) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      setError(t('attendance.nameRequired', '이름을 적어 주세요'))
      return
    }
    setSending(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('sp_live_attendance_s', {
        p_code: code,
        p_key: getAttendKey(code),
        p_name: n,
        p_affiliation: affiliation.trim() || null,
      })
      if (err) throw err
      if (!data?.success) {
        setError(
          data?.error === 'attendance_disabled'
            ? t('attendance.disabled', '지금은 출석을 받지 않습니다')
            : t('attendance.failed', '출석하지 못했습니다. 잠시 후 다시 시도해 주세요')
        )
        return
      }
      toast.success(t('attendance.done', '출석했습니다'))
      onDone?.()
    } catch (err) {
      console.error('Attendance join failed:', err)
      setError(t('attendance.failed', '출석하지 못했습니다. 잠시 후 다시 시도해 주세요'))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 text-left" data-testid="attendance-join-form">
      <p className="text-xs text-slate-500 flex items-center gap-1">
        <ClipboardCheck className="w-4 h-4 text-indigo-600" />
        {t('attendance.joinDesc', '이 행사는 출석을 받습니다. 이름(또는 닉네임)만 적고 입장하세요.')}
      </p>
      <input
        type="text"
        value={name}
        maxLength={50}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('attendance.namePlaceholder', '이름 또는 닉네임 (필수)')}
        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400"
        data-testid="attendance-join-name"
        autoComplete="name"
      />
      <input
        type="text"
        value={affiliation}
        maxLength={100}
        onChange={(e) => setAffiliation(e.target.value)}
        placeholder={t('attendance.affiliationPlaceholder', '소속 (선택)')}
        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400"
        data-testid="attendance-join-affiliation"
        autoComplete="organization"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full text-lg bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
        data-testid="attendance-join-submit"
      >
        {sending && <Loader2 className="w-5 h-5 animate-spin" />}
        {ctaLabel || t('attendance.joinSubmit', '출석하고 입장')}
      </button>
    </form>
  )
}
