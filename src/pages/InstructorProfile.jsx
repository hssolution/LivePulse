import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Loader2, CalendarDays, MessageSquareQuote, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import SEO from '@/components/common/SEO'

/**
 * 강사 공개 프로필 (026) — /instructor/:id
 * 행사에 묶이지 않는 한 사람의 프로필 + 여러 세션에 걸친 누적 평점(평균·응답 수).
 * 데이터는 sp_instructor_profile_q 하나로 받는다(의견 본문·응답자 정보는 주지 않음).
 */
export default function InstructorProfile() {
  const { id } = useParams()
  const { t, language } = useLanguage()
  const [state, setState] = useState({ loading: true, data: null })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, data: null })
    supabase
      .rpc('sp_instructor_profile_q', { p_profile_id: id })
      .then(({ data, error }) => {
        if (cancelled) return
        setState({ loading: false, data: !error && data?.success ? data : null })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const fmtDate = (v) => {
    if (!v) return ''
    try {
      return new Date(v).toLocaleDateString(language === 'en' ? 'en-US' : 'ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    } catch {
      return ''
    }
  }

  const { loading, data } = state
  const profile = data?.profile
  const rating = data?.rating
  const avg = rating?.avg != null ? Number(rating.avg) : null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <SEO
        title={profile ? `${profile.display_name} — ${t('instructor.profile', '강사 프로필')}` : t('instructor.profile', '강사 프로필')}
        description={profile?.title || t('instructor.profileDesc', '여러 행사에 걸쳐 쌓인 강사 평점')}
      />
      <PublicHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-10">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : !profile ? (
            <div className="text-center py-24">
              <UserRound className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-lg">{t('instructor.notFound', '강사 프로필을 찾을 수 없습니다')}</p>
              <Link to="/" className="inline-block mt-4 text-sm font-semibold text-indigo-600 hover:underline">
                {t('common.goHome', '홈으로')}
              </Link>
            </div>
          ) : (
            <>
              {/* 프로필 머리 */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                  <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/40 overflow-hidden flex items-center justify-center shrink-0">
                    {profile.image_url ? (
                      <img src={profile.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-indigo-600">{profile.display_name?.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                      {t('instructor.profile', '강사 프로필')}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold mt-1 break-words">{profile.display_name}</h1>
                    {profile.title && <p className="text-slate-600 dark:text-slate-300 mt-1">{profile.title}</p>}
                  </div>
                  {/* 누적 평점 */}
                  <div className="sm:text-right shrink-0" data-testid="instructor-rating">
                    <div className="flex sm:justify-end items-center gap-1.5">
                      <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
                      <span className="text-4xl font-bold">{avg != null ? avg.toFixed(2) : '—'}</span>
                      <span className="text-slate-400 text-lg font-medium">/ 5</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('instructor.ratingSummary', {
                        count: rating?.count ?? 0,
                        sessions: data.session_count ?? 0,
                      })}
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <p className="mt-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {profile.bio}
                  </p>
                )}
              </section>

              {/* 세션별 평점 */}
              <section className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h2 className="font-bold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  {t('instructor.sessions', '강연 이력')}
                </h2>
                {data.sessions?.length ? (
                  <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {data.sessions.map((s, i) => (
                      <li key={i} className="py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{fmtDate(s.start_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {s.response_count > 0 ? (
                            <>
                              <span className="inline-flex items-center gap-1 font-bold">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                {Number(s.avg_rating).toFixed(2)}
                              </span>
                              <p className="text-xs text-slate-400">
                                {t('instructor.responses', { count: s.response_count })}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">{t('instructor.noResponses', '응답 없음')}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">{t('instructor.noSessions', '아직 공개된 강연이 없습니다')}</p>
                )}
                <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  {t('instructor.ratingNote', '평점은 세션이 끝난 뒤 청중이 익명으로 남긴 만족도(1~5점)입니다')}
                </p>
              </section>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
