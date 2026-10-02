import { useState } from 'react'
import { Star, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { getSurveyKey, hasSubmittedSurvey, markSurveySubmitted } from '@/lib/participant'

const MAX_COMMENT = 200

/**
 * 세션 끝 만족도 설문 (026) — 1~5점 + 한 줄 의견.
 * 이름·연락처는 받지 않는다. 브라우저당 1회(서버도 같은 키로 중복을 막는다).
 * 종료 화면(EndedView) 안에 놓이므로 배경 위에서 읽히도록 흰 카드로 그린다.
 */
export default function SatisfactionSurvey({ code }) {
  const { t } = useLanguage()
  const sessionCode = code?.toUpperCase()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(() => hasSubmittedSurvey(sessionCode))
  const [error, setError] = useState(null)

  if (!sessionCode) return null

  if (done) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white text-slate-800 rounded-2xl shadow-lg p-5 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-bold">{t('survey.thanks', '응답해 주셔서 감사합니다')}</p>
        <p className="text-xs text-slate-500 mt-1">{t('survey.thanksDesc', '남겨 주신 의견은 강사와 주최자에게 전달됩니다')}</p>
      </div>
    )
  }

  const submit = async () => {
    if (!rating || sending) return
    setSending(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('sp_live_feedback_s', {
        p_code: sessionCode,
        p_key: getSurveyKey(sessionCode),
        p_rating: rating,
        p_comment: comment.trim() || null,
      })
      if (rpcError) throw rpcError
      if (data?.success || data?.error === 'already_submitted') {
        markSurveySubmitted(sessionCode)
        setDone(true)
        return
      }
      if (data?.error === 'survey_disabled') {
        setError(t('survey.disabled', '이 세션은 설문을 받지 않습니다'))
        return
      }
      throw new Error(data?.error || 'failed')
    } catch (err) {
      console.error('Survey submit failed:', err)
      setError(t('survey.failed', '보내지 못했습니다. 잠시 후 다시 시도해 주세요'))
    } finally {
      setSending(false)
    }
  }

  const shown = hover || rating
  const labels = [
    '',
    t('survey.rating1', '아쉬웠어요'),
    t('survey.rating2', '조금 아쉬웠어요'),
    t('survey.rating3', '보통이에요'),
    t('survey.rating4', '좋았어요'),
    t('survey.rating5', '아주 좋았어요'),
  ]

  return (
    <div className="w-full max-w-sm mx-auto bg-white text-slate-800 rounded-2xl shadow-lg p-5 text-left" data-testid="satisfaction-survey">
      <p className="font-bold text-center">{t('survey.title', '오늘 강연은 어떠셨나요?')}</p>
      <p className="text-xs text-slate-500 text-center mt-1">
        {t('survey.anonymous', '이름·연락처 없이 익명으로 남습니다')}
      </p>

      <div className="flex justify-center gap-1.5 mt-4" role="radiogroup" aria-label={t('survey.title', '오늘 강연은 어떠셨나요?')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
      <p className="text-center text-sm font-semibold text-slate-600 h-5 mt-1">{labels[shown]}</p>

      <input
        type="text"
        value={comment}
        maxLength={MAX_COMMENT}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('survey.commentPlaceholder', '한 줄 의견 (선택)')}
        className="w-full mt-3 px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-400"
      />
      <div className="text-[11px] text-slate-400 text-right mt-1">{comment.length}/{MAX_COMMENT}</div>

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!rating || sending}
        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {sending && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('survey.submit', '보내기')}
      </button>
    </div>
  )
}
