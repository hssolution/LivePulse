import { useEffect, useRef, useState } from 'react'
import { Award, Download, Loader2, FileText, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { getAttendKey } from '@/lib/participant'
import { drawCertificate, ensureCertFonts, canvasToPdfBlob, canvasToPngBlob, downloadBlob } from '@/lib/certificate'

/** 수료증에 들어가는 고정 문구(언어별) */
export function certText(t) {
  return {
    heading: t('certificate.heading', '수 료 증'),
    subheading: t('certificate.subheading', 'CERTIFICATE OF COMPLETION'),
    body: (title) => t('certificate.body', { title }),
    recipientSuffix: t('certificate.recipientSuffix', ''),
    dateLabel: t('certificate.dateLabel', '일자'),
    issuerLabel: t('certificate.issuerLabel', '주최'),
    noLabel: t('certificate.noLabel', '제'),
  }
}

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'certificate'
}

/**
 * 청중 종료 화면의 수료증 카드 (028)
 * - 주최가 수료증을 켰을 때만 보인다.
 * - 출석한 브라우저면 «수료증 받기» → 서버가 발급 기록을 남기고 데이터를 준다 → 캔버스로 그려 PDF·PNG 로 내려받는다.
 */
export default function CertificateCard({ code }) {
  const { t, language } = useLanguage()
  const [status, setStatus] = useState({ loading: true, data: null })
  const [cert, setCert] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    supabase.rpc('sp_live_attendance_q', { p_code: code, p_key: getAttendKey(code) }).then(({ data, error: err }) => {
      if (!cancelled) setStatus({ loading: false, data: !err && data?.success ? data : null })
    })
    return () => {
      cancelled = true
    }
  }, [code])

  if (status.loading || !status.data?.certificate_enabled) return null

  const issue = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('sp_live_certificate_s', { p_code: code, p_key: getAttendKey(code) })
      if (err) throw err
      if (!data?.success) {
        setError(
          data?.error === 'not_attended'
            ? t('certificate.notAttended', '이 기기에는 출석 기록이 없어 수료증을 받을 수 없습니다')
            : t('certificate.failed', '수료증을 만들지 못했습니다. 잠시 후 다시 시도해 주세요')
        )
        return
      }
      const text = certText(t)
      await ensureCertFonts([data.name, data.affiliation, data.title, data.issuer, text.heading, text.subheading, text.body(data.title), text.dateLabel, text.issuerLabel])
      const canvas = canvasRef.current || document.createElement('canvas')
      canvasRef.current = canvas
      drawCertificate(canvas, data, text, language)
      setPreview(canvas.toDataURL('image/jpeg', 0.8))
      setCert(data)
    } catch (err) {
      console.error('Certificate failed:', err)
      setError(t('certificate.failed', '수료증을 만들지 못했습니다. 잠시 후 다시 시도해 주세요'))
    } finally {
      setBusy(false)
    }
  }

  const fileBase = () => `certificate-${code}-${safeName(cert?.name)}`
  const savePdf = () => downloadBlob(canvasToPdfBlob(canvasRef.current), `${fileBase()}.pdf`)
  const savePng = async () => downloadBlob(await canvasToPngBlob(canvasRef.current), `${fileBase()}.png`)

  return (
    <div className="w-full max-w-sm mx-auto bg-white text-slate-800 rounded-2xl shadow-lg p-5 text-left" data-testid="certificate-card">
      <p className="font-bold text-center flex items-center justify-center gap-1.5">
        <Award className="w-5 h-5 text-amber-500" /> {t('certificate.cardTitle', '수료증')}
      </p>
      {!status.data.checked_in ? (
        <p className="text-sm text-slate-500 text-center mt-2">
          {t('certificate.onlyAttendees', '출석 체크한 분만 받을 수 있습니다. 출석한 기기(브라우저)에서 열어 주세요.')}
        </p>
      ) : !cert ? (
        <>
          <p className="text-xs text-slate-500 text-center mt-1">
            {t('certificate.cardDesc', { name: status.data.name || '' })}
          </p>
          {error && <p className="text-xs text-rose-600 mt-2 text-center">{error}</p>}
          <button
            type="button"
            onClick={issue}
            disabled={busy}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
            data-testid="certificate-issue"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('certificate.issue', '수료증 받기')}
          </button>
        </>
      ) : (
        <>
          {preview && <img src={preview} alt={t('certificate.cardTitle', '수료증')} className="w-full rounded-lg border border-slate-200 mt-3" data-testid="certificate-preview" />}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={savePdf}
              className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-1.5"
              data-testid="certificate-pdf"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              type="button"
              onClick={savePng}
              className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-sm flex items-center justify-center gap-1.5"
              data-testid="certificate-png"
            >
              <ImageIcon className="w-4 h-4" /> {t('certificate.image', '이미지')}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">{cert.certificate_no}</p>
        </>
      )}
    </div>
  )
}
