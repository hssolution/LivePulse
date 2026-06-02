import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Users,
  MessageCircle,
  BarChart3,
  Loader2,
  FileSpreadsheet,
  FileText,
  ThumbsUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { exportToExcel } from '@/utils/excel'

/**
 * 세션 리포트
 * /partner/sessions/:id/report
 *
 * 종료된 세션의 참여 요약 + Q&A 아카이브 + 투표 결과
 */
export default function SessionReport() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [polls, setPolls] = useState([])
  const [pollResults, setPollResults] = useState({})
  const [participantCount, setParticipantCount] = useState(0)
  const [authedCount, setAuthedCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [sessionRes, questionsRes, pollsRes, participantsRes] = await Promise.all([
          supabase.from('sessions').select('*').eq('id', id).single(),
          supabase
            .from('questions')
            .select('*')
            .eq('session_id', id)
            .order('likes_count', { ascending: false }),
          supabase.rpc('sp_partner_polls_q', { p_session_id: id }),
          supabase
            .from('session_participants')
            .select('user_id', { count: 'exact' })
            .eq('session_id', id),
        ])

        if (cancelled) return

        if (sessionRes.error || !sessionRes.data) {
          toast.error('세션을 찾을 수 없습니다')
          navigate('/partner/sessions')
          return
        }

        setSession(sessionRes.data)
        setQuestions(questionsRes.data || [])

        const pollList = pollsRes.data?.polls || []
        setPolls(pollList)

        // 참여자 통계
        const participants = participantsRes.data || []
        setParticipantCount(participants.length)
        setAuthedCount(participants.filter((p) => p.user_id).length)

        // 각 투표 결과 병렬 조회
        if (pollList.length > 0) {
          const results = await Promise.all(
            pollList.map((p) =>
              supabase.rpc('sp_partner_poll_results_q', { p_poll_id: p.id })
            )
          )
          if (cancelled) return
          const resultMap = {}
          pollList.forEach((p, i) => {
            resultMap[p.id] = results[i].data
          })
          setPollResults(resultMap)
        }
      } catch (err) {
        console.error('Error loading report:', err)
        toast.error('리포트 로드 실패')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  // Excel 다운로드: 참여자 + Q&A + 설문결과 (다중 시트)
  const handleExportExcel = async () => {
    try {
      const sheets = {}

      // 1) 참여자
      const { data: participants } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true })

      sheets['참여자'] = (participants || []).map((p) => ({
        '참여일시': p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
        '이름': p.display_name || '익명',
        '이메일': p.email || '',
        '전화': p.phone || '',
        '구분': p.user_id ? '회원' : '비회원',
        '디바이스ID': p.device_id || '',
      }))

      // 2) Q&A
      sheets['Q&A'] = questions.map((q) => ({
        '작성일시': q.created_at ? format(new Date(q.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
        '질문': q.content,
        '작성자': q.is_anonymous ? '익명' : q.author_name || '익명',
        '상태':
          q.status === 'approved'
            ? '승인됨'
            : q.status === 'answered'
            ? '답변완료'
            : q.status,
        '좋아요': q.likes_count || 0,
        '답변': q.answer || '',
        '답변일시': q.answered_at ? format(new Date(q.answered_at), 'yyyy-MM-dd HH:mm:ss') : '',
      }))

      // 3) 설문결과 (matrix 형식)
      const { data: pollsFull } = await supabase
        .from('polls')
        .select('*, poll_options(*)')
        .eq('session_id', id)
        .order('display_order')

      if (pollsFull && pollsFull.length > 0) {
        const { data: responses } = await supabase
          .from('poll_responses')
          .select('*, poll_options(id, option_text, poll_id)')
          .in('poll_id', pollsFull.map((p) => p.id))
          .order('created_at')

        const safeResponses = responses || []
        const respondentIds = [
          ...new Set(safeResponses.map((r) => r.user_id || r.anonymous_id).filter(Boolean)),
        ]

        const headerRow = ['번호', '종류', '필수여부', '응답 결과']
        respondentIds.forEach((_, i) => headerRow.push(`응답자${i + 1}`))

        const rows = pollsFull.map((p, idx) => {
          const pollResponses = safeResponses.filter((r) => r.poll_id === p.id)
          let resultSummary = ''

          if (p.poll_type === 'open' || p.poll_type === 'text') {
            const counts = {}
            pollResponses.forEach((r) => {
              const t = r.response_text || '(내용 없음)'
              counts[t] = (counts[t] || 0) + 1
            })
            const list = Object.entries(counts).map(([t, c]) => `- ${t} (${c}명)`)
            resultSummary = list.length ? list.join('\r\n') : '(응답 없음)'
          } else {
            const list = (p.poll_options || []).map((opt, i) => {
              const cnt = pollResponses.filter((r) => r.option_id === opt.id).length
              return `${i + 1}. ${opt.option_text} (${cnt}명)`
            })
            resultSummary = list.join('\r\n')
          }

          const row = [
            idx + 1,
            p.poll_type === 'single' ? '단일선택' : p.poll_type === 'multiple' ? '복수선택' : '주관식',
            p.is_required ? '필수' : '선택',
            stripHtmlText(p.question) + '\r\n\r\n' + resultSummary,
          ]
          respondentIds.forEach((rid) => {
            const userRes = pollResponses.filter((r) => (r.user_id || r.anonymous_id) === rid)
            if (userRes.length > 0) {
              const answers = userRes
                .map((r) => r.response_text || r.poll_options?.option_text || '')
                .filter(Boolean)
              row.push(answers.join(', '))
            } else {
              row.push('')
            }
          })
          return row
        })

        sheets['설문결과'] = [headerRow, ...rows]
      } else {
        sheets['설문결과'] = []
      }

      const baseName = (session.title || 'session').replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '').trim() || 'session'
      exportToExcel(sheets, `${baseName}_리포트`)
      toast.success('Excel 다운로드가 시작되었습니다')
    } catch (err) {
      console.error('Excel export error:', err)
      toast.error('Excel 내보내기 실패')
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  const broadcastedCount = questions.filter((q) => q.is_broadcasting || q.is_displayed).length
  const answeredCount = questions.filter((q) => q.answer).length
  const totalPollResponses = Object.values(pollResults).reduce((sum, r) => {
    const responses = r?.options?.reduce((s, o) => s + (o.vote_count || 0), 0) || 0
    return sum + responses
  }, 0)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800">
      {/* 상단 바 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/partner/sessions')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" /> 세션 목록
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
              종료
            </span>
            <span className="font-bold">{session.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            type="button"
            onClick={() => toast.info('PDF 리포트는 준비 중입니다')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF 리포트
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">세션 리포트</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatDateRange(session.start_at, session.end_at)}
            {session.venue_name && ` · ${session.venue_name}`}
          </p>
        </div>

        {/* 핵심 지표 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KeyMetric
            icon={Users}
            label="총 참가자"
            value={participantCount}
            unit="명"
            sub={`정원 ${session.max_participants}명 대비 ${pct(participantCount, session.max_participants)}%`}
          />
          <KeyMetric
            icon={MessageCircle}
            label="등록된 질문"
            value={questions.length}
            unit="개"
            sub={`송출 ${broadcastedCount}개 · 답변 ${answeredCount}개`}
          />
          <KeyMetric
            icon={BarChart3}
            label="투표 응답"
            value={totalPollResponses}
            unit="건"
            sub={`투표 ${polls.length}회 진행`}
          />
          <KeyMetric
            icon={Users}
            label="회원 참가"
            value={authedCount}
            unit="명"
            sub={`비회원 ${participantCount - authedCount}명`}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 투표 결과 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-bold mb-4">투표 결과</h2>
            {polls.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">진행된 투표가 없습니다</p>
            ) : (
              <div className="space-y-5">
                {polls.map((poll) => (
                  <PollResultBlock
                    key={poll.id}
                    poll={poll}
                    result={pollResults[poll.id]}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Q&A 아카이브 */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Q&amp;A 아카이브</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                좋아요순 · 전체 {questions.length}개
              </span>
            </div>
            {questions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">등록된 질문이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {questions.slice(0, 5).map((q) => (
                  <QuestionItem key={q.id} q={q} />
                ))}
                {questions.length > 5 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-2">
                    + {questions.length - 5}개 더 (Excel 다운로드로 전체 확인)
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

/* ----- 핵심 지표 카드 ----- */
function KeyMetric({ icon: Icon, label, value, unit, sub }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-3xl font-bold mt-2">
        {value}
        <span className="text-base text-slate-400 dark:text-slate-500 font-medium">{unit}</span>
      </div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

/* ----- 투표 결과 블록 ----- */
function PollResultBlock({ poll, result }) {
  const options = result?.options || []
  const total = options.reduce((sum, o) => sum + (o.vote_count || 0), 0)

  if (poll.poll_type === 'open') {
    return (
      <div>
        <div className="text-sm font-semibold mb-2">{stripHtml(poll.question)}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          주관식 응답 {result?.text_responses?.length || 0}건 · 상세는 Excel 다운로드에서 확인
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-sm font-semibold mb-2">{stripHtml(poll.question)}</div>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const percent = total > 0 ? Math.round(((opt.vote_count || 0) / total) * 100) : 0
          return (
            <div key={opt.id || i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{opt.option_text}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {opt.vote_count || 0} ({percent}%)
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-right">{total}명 응답</div>
    </div>
  )
}

/* ----- 질문 아이템 ----- */
function QuestionItem({ q }) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
      <div className="flex items-start gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
          <ThumbsUp className="w-3 h-3" /> {q.likes_count || 0}
        </span>
        <p className="text-sm leading-relaxed">{q.content}</p>
      </div>
      {q.answer ? (
        <div className="mt-2 pl-2 border-l-2 border-emerald-300 text-sm text-slate-600 dark:text-slate-300">
          <b className="text-emerald-700">답변</b> · {q.answer}
        </div>
      ) : (
        <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">미답변</div>
      )}
    </div>
  )
}

/* ----- 유틸 ----- */
function pct(num, denom) {
  if (!denom) return 0
  return Math.round((num / denom) * 100)
}

function formatDateRange(start, end) {
  if (!start) return ''
  const s = new Date(start)
  const e = end ? new Date(end) : null
  const dateStr = `${s.getFullYear()}.${pad(s.getMonth() + 1)}.${pad(s.getDate())}`
  const startTime = `${pad(s.getHours())}:${pad(s.getMinutes())}`
  if (!e) return `${dateStr} ${startTime}`
  const endTime = `${pad(e.getHours())}:${pad(e.getMinutes())}`
  return `${dateStr} ${startTime}–${endTime}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function stripHtml(s) {
  if (!s) return ''
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent || div.innerText || ''
}
