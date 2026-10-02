import { useCallback, useEffect, useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Switch } from '@/components/ui/switch'

/** 세션 만족도 결과 조회 (주최자·협업 파트너·관리자만 — 서버가 확인) */
function useSessionFeedback(sessionId) {
  const [state, setState] = useState({ loading: true, data: null })
  const load = useCallback(async () => {
    if (!sessionId) return
    const { data, error } = await supabase.rpc('sp_partner_session_feedback_q', { p_session_id: sessionId })
    setState({ loading: false, data: !error && data?.success ? data : null })
  }, [sessionId])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: load, setData: (d) => setState((s) => ({ ...s, data: d })) }
}

/**
 * 끝나면 만족도 설문 띄우기 — 기본 켬, 주최자가 끈다 (026)
 * 함수가 없는 DB(마이그레이션 전)에서는 그리지 않는다.
 */
export function SurveyToggle({ sessionId }) {
  const { t } = useLanguage()
  const { loading, data, setData } = useSessionFeedback(sessionId)
  const [saving, setSaving] = useState(false)

  if (loading || !data) return null
  const enabled = data.survey_enabled !== false

  const onChange = async (next) => {
    setSaving(true)
    try {
      const { data: res, error } = await supabase.rpc('sp_partner_session_survey_s', {
        p_session_id: sessionId,
        p_enabled: next,
      })
      if (error || !res?.success) throw error || new Error(res?.error)
      setData({ ...data, survey_enabled: res.survey_enabled })
      toast.success(next ? t('survey.settingOn', '설문을 켰습니다') : t('survey.settingOff', '설문을 껐습니다'))
    } catch (err) {
      console.error('Survey toggle failed:', err)
      toast.error(t('error.saveFailed', '저장 실패'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mt-5 flex items-start gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold">{t('survey.settingTitle', '끝나면 만족도 설문 띄우기')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {t('survey.settingDesc', '세션이 끝나면 청중 화면에 1~5점 + 한 줄 의견 설문이 뜹니다. 이름·연락처는 받지 않습니다.')}
        </p>
      </div>
      <Switch checked={enabled} disabled={saving} onCheckedChange={onChange} aria-label={t('survey.settingTitle', '끝나면 만족도 설문 띄우기')} />
    </div>
  )
}

/** 세션 리포트용 만족도 요약 — 평균·분포·한 줄 의견 */
export function FeedbackSummary({ sessionId }) {
  const { t } = useLanguage()
  const { loading, data } = useSessionFeedback(sessionId)

  if (loading) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      </section>
    )
  }
  if (!data) return null

  const count = data.count || 0
  const avg = data.avg != null ? Number(data.avg) : null
  const dist = data.distribution || {}

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">{t('survey.reportTitle', '만족도 설문')}</h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {t('survey.reportCount', { count })}
        </span>
      </div>
      {data.survey_enabled === false && count === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">{t('survey.reportOff', '이 세션은 설문이 꺼져 있습니다')}</p>
      ) : count === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">{t('survey.reportEmpty', '아직 응답이 없습니다')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-6">
          <div className="text-center sm:pr-6 sm:border-r border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              <span className="text-4xl font-bold">{avg?.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">/ 5</p>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => {
              const c = Number(dist[r] || 0)
              const pct = count ? Math.round((c / count) * 100) : 0
              return (
                <div key={r} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-slate-500">{r}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-slate-500">{c}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {data.comments?.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-slate-500 mb-2">{t('survey.reportComments', '한 줄 의견')}</p>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {data.comments.map((c, i) => (
              <li key={i} className="text-sm border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 flex gap-2">
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {c.rating}
                </span>
                <span className="break-words">{c.comment}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
