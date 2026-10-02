import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, Users, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Switch } from '@/components/ui/switch'
import { CERT_TEMPLATES, drawCertificate, ensureCertFonts } from '@/lib/certificate'
import { certText } from '@/components/session/CertificateCard'

/** 주최 출석 명단·설정 조회 (서버가 권한 확인) */
function useAttendance(sessionId, pollMs = 0) {
  const [state, setState] = useState({ loading: true, data: null })
  const load = useCallback(async () => {
    if (!sessionId) return
    const { data, error } = await supabase.rpc('sp_partner_attendance_q', { p_session_id: sessionId })
    setState({ loading: false, data: !error && data?.success ? data : null })
  }, [sessionId])
  useEffect(() => {
    load()
    if (!pollMs) return
    const i = setInterval(load, pollMs)
    return () => clearInterval(i)
  }, [load, pollMs])
  return { ...state, reload: load, setData: (d) => setState((s) => ({ ...s, data: d })) }
}

async function saveSettings(sessionId, patch) {
  const { data, error } = await supabase.rpc('sp_partner_session_attendance_s', { p_session_id: sessionId, ...patch })
  if (error || !data?.success) throw error || new Error(data?.error)
  return data
}

/** CSV 한 칸 — 따옴표 이스케이프 + 수식 주입 방지 */
function csvCell(v) {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

function fmtTime(iso, lang) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * 콘솔 «출석» 탭 (028) — 출석 인원·명단·CSV 내려받기, 출석 체크 켜고 끄기
 */
export default function AttendancePanel({ sessionId, sessionCode }) {
  const { t, language } = useLanguage()
  const { loading, data, setData, reload } = useAttendance(sessionId, 10000)
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    )
  }
  if (!data) {
    return <div className="text-center py-16 text-sm text-slate-400">{t('attendance.loadFailed', '출석 명단을 불러오지 못했습니다')}</div>
  }

  const toggle = async (next) => {
    setSaving(true)
    try {
      const res = await saveSettings(sessionId, { p_attendance_enabled: next })
      setData({ ...data, ...res })
      toast.success(next ? t('attendance.turnedOn', '출석 체크를 켰습니다') : t('attendance.turnedOff', '출석 체크를 껐습니다'))
    } catch (err) {
      console.error('Attendance toggle failed:', err)
      toast.error(t('error.saveFailed', '저장 실패'))
    } finally {
      setSaving(false)
    }
  }

  const downloadCsv = () => {
    const header = [
      t('attendance.colNo', '번호'),
      t('attendance.colName', '이름'),
      t('attendance.colAffiliation', '소속'),
      t('attendance.colCheckedIn', '출석 시각'),
      t('attendance.colCertificate', '수료증 발급'),
    ]
    const lines = [header.map(csvCell).join(',')]
    data.rows.forEach((r, i) => {
      lines.push([i + 1, r.name, r.affiliation || '', fmtTime(r.checked_in_at, language), fmtTime(r.certificate_issued_at, language)].map(csvCell).join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    a.href = url
    a.download = `attendance-${sessionCode || 'session'}-${ymd}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4" data-testid="attendance-panel">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <span className="text-sm text-slate-500">{t('attendance.count', '출석')}</span>
          <b className="text-2xl" data-testid="attendance-count">{data.count}</b>
          <span className="text-sm text-slate-500">{t('attendance.people', '명')}</span>
        </div>
        {data.certificate_enabled && (
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Award className="w-4 h-4 text-amber-500" />
            {t('attendance.issuedCount', { count: data.issued_count })}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm ml-auto">
          {t('attendance.enable', '출석 체크 받기')}
          <Switch checked={!!data.attendance_enabled} disabled={saving} onCheckedChange={toggle} data-testid="attendance-switch" />
        </label>
        <button
          type="button"
          onClick={downloadCsv}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          data-testid="attendance-csv"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
        <button type="button" onClick={reload} className="text-xs text-slate-400 hover:text-slate-600">
          {t('attendance.refresh', '새로고침')}
        </button>
      </div>

      {!data.attendance_enabled && (
        <p className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
          {t('attendance.offHint', '출석 체크가 꺼져 있습니다. 켜면 청중 화면에 이름·소속 입력 칸이 뜹니다(전화번호는 받지 않습니다).')}
        </p>
      )}

      {data.rows.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">{t('attendance.empty', '아직 출석한 사람이 없습니다')}</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm" data-testid="attendance-table">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 w-12">#</th>
                <th className="text-left px-3 py-2">{t('attendance.colName', '이름')}</th>
                <th className="text-left px-3 py-2">{t('attendance.colAffiliation', '소속')}</th>
                <th className="text-left px-3 py-2">{t('attendance.colCheckedIn', '출석 시각')}</th>
                {data.certificate_enabled && <th className="text-left px-3 py-2">{t('attendance.colCertificate', '수료증 발급')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.affiliation || '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{fmtTime(r.checked_in_at, language)}</td>
                  {data.certificate_enabled && <td className="px-3 py-2 text-slate-500">{r.certificate_issued_at ? fmtTime(r.certificate_issued_at, language) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** 템플릿 미리보기(작은 캔버스) */
function TemplateThumb({ template, issuer, selected, onSelect, label }) {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  useEffect(() => {
    let cancelled = false
    const sample = {
      template,
      name: t('certificate.sampleName', '홍길동'),
      affiliation: t('certificate.sampleAffiliation', '소속 예시'),
      title: t('certificate.sampleTitle', '행사 이름'),
      start_at: new Date().toISOString(),
      issuer: issuer || 'LivePulse',
      certificate_no: 'LP-SAMPLE-000000',
    }
    const text = certText(t)
    const draw = () => {
      if (!cancelled && ref.current) drawCertificate(ref.current, sample, text, language)
    }
    draw()
    ensureCertFonts([...Object.values(sample), text.heading, text.subheading, text.body(sample.title)]).then(draw)
    return () => {
      cancelled = true
    }
  }, [template, issuer, t, language])
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border-2 p-1.5 text-left transition-colors ${selected ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
      data-testid={`cert-template-${template}`}
    >
      <canvas ref={ref} className="w-full h-auto rounded-md block" style={{ aspectRatio: '2000 / 1414' }} />
      <span className="block text-xs font-semibold mt-1 px-1">{label}</span>
    </button>
  )
}

/**
 * 세션 설정 카드 (028) — 출석 체크·수료증 켜기, 템플릿·주최명
 * 함수가 없는 DB(마이그레이션 전)에서는 그리지 않는다.
 */
export function AttendanceSettings({ sessionId }) {
  const { t } = useLanguage()
  const { loading, data, setData } = useAttendance(sessionId)
  const [saving, setSaving] = useState(false)
  const [issuer, setIssuer] = useState(null)

  if (loading || !data) return null
  const issuerValue = issuer ?? (data.certificate_issuer || '')

  const save = async (patch, okMsg) => {
    setSaving(true)
    try {
      const res = await saveSettings(sessionId, patch)
      setData({ ...data, ...res })
      if (okMsg) toast.success(okMsg)
    } catch (err) {
      console.error('Attendance settings failed:', err)
      toast.error(t('error.saveFailed', '저장 실패'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mt-5 space-y-5" data-testid="attendance-settings">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold">{t('attendance.settingTitle', '출석 체크 받기')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {t('attendance.settingDesc', '참여 코드로 들어온 청중이 이름(필수)·소속(선택)으로 출석합니다. 전화번호·이메일은 받지 않습니다. 명단은 콘솔 «출석» 탭에서 보고 CSV 로 내려받습니다.')}
          </p>
        </div>
        <Switch
          checked={!!data.attendance_enabled}
          disabled={saving}
          onCheckedChange={(v) => save({ p_attendance_enabled: v }, v ? t('attendance.turnedOn', '출석 체크를 켰습니다') : t('attendance.turnedOff', '출석 체크를 껐습니다'))}
          aria-label={t('attendance.settingTitle', '출석 체크 받기')}
          data-testid="attendance-setting-switch"
        />
      </div>

      <div className="flex items-start gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
        <div className="flex-1">
          <p className="text-sm font-semibold">{t('certificate.settingTitle', '끝나면 수료증 주기')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {t('certificate.settingDesc', '세션이 끝나면 출석한 사람이 청중 화면에서 자기 수료증을 PDF·이미지로 받습니다(브라우저에서 만들어 비용이 들지 않습니다).')}
          </p>
        </div>
        <Switch
          checked={!!data.certificate_enabled}
          disabled={saving}
          onCheckedChange={(v) => save({ p_certificate_enabled: v }, v ? t('certificate.turnedOn', '수료증을 켰습니다') : t('certificate.turnedOff', '수료증을 껐습니다'))}
          aria-label={t('certificate.settingTitle', '끝나면 수료증 주기')}
          data-testid="certificate-setting-switch"
        />
      </div>

      {data.certificate_enabled && (
        <div className="space-y-4">
          {!data.attendance_enabled && (
            <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 rounded-lg px-3 py-2">
              {t('certificate.needAttendance', '수료증은 출석한 사람만 받습니다. 출석 체크도 켜 주세요.')}
            </p>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">{t('certificate.template', '템플릿')}</p>
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {CERT_TEMPLATES.map((tpl) => (
                <TemplateThumb
                  key={tpl}
                  template={tpl}
                  issuer={data.certificate_issuer || data.default_issuer}
                  selected={data.certificate_template === tpl}
                  onSelect={() => data.certificate_template !== tpl && save({ p_certificate_template: tpl })}
                  label={tpl === 'classic' ? t('certificate.templateClassic', '클래식') : t('certificate.templateModern', '모던')}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">{t('certificate.issuer', '주최명')}</p>
            <div className="flex gap-2 max-w-lg">
              <input
                type="text"
                value={issuerValue}
                maxLength={100}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder={data.default_issuer}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                data-testid="certificate-issuer"
              />
              <button
                type="button"
                disabled={saving || issuerValue === (data.certificate_issuer || '')}
                onClick={() => save({ p_certificate_issuer: issuerValue }, t('common.saved', '저장했습니다')).then(() => setIssuer(null))}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white"
              >
                {t('common.save', '저장')}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t('certificate.issuerHint', '비우면 주최 단체명이 들어갑니다.')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
