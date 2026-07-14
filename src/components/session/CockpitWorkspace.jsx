import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  FileText,
  MessageCircle,
  BarChart3,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  EyeOff,
  ListChecks,
} from 'lucide-react'
import ManagerQnA from '@/components/session/ManagerQnA'

/**
 * 좌장 콕핏 우측 탭 작업판
 * 탭: 현재 큐 / Q&A / 설문 / 강연자료
 * - 좌측 진행 플랜에서 큐를 선택하면 부모가 activeTab='cue'로 전환하고 selectedCue 전달
 * - 각 탭에서 "송출" + 수동 제어 가능 (즉석 조정)
 *
 * props: sessionId, sessionCode, selectedCue, activeTab, onTabChange, onBroadcast
 */

function stripHtml(s) {
  if (!s) return ''
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent || div.innerText || ''
}

const TABS = [
  { key: 'cue', label: '현재 큐', icon: ListChecks },
  { key: 'qna', label: 'Q&A', icon: MessageCircle },
  { key: 'survey', label: '설문', icon: BarChart3 },
  { key: 'pdf', label: '강연자료', icon: FileText },
]

export default function CockpitWorkspace({ sessionId, sessionCode, selectedCue, activeTab, onTabChange, onBroadcast }) {
  const [state, setState] = useState({ broadcast_mode: 'idle', broadcast_pdf_id: null, broadcast_pdf_page: 1, active_poll_id: null })
  const [lectures, setLectures] = useState([])
  const [polls, setPolls] = useState([])
  const actionAt = useRef(0)

  const loadState = useCallback(async () => {
    if (!sessionId) return
    if (Date.now() - actionAt.current < 2500) return
    const { data } = await supabase.rpc('sp_partner_broadcast_state_q', { p_session_id: sessionId })
    if (data) setState((prev) => ({ ...prev, ...data }))
  }, [sessionId])

  const loadLectures = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_lectures_q', { p_session_id: sessionId })
    setLectures(Array.isArray(data) ? data : [])
  }, [sessionId])

  const loadPolls = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_polls_q', { p_session_id: sessionId })
    setPolls(Array.isArray(data) ? data : (data?.polls || []))
  }, [sessionId])

  useEffect(() => {
    loadState(); loadLectures(); loadPolls()
    const i = setInterval(() => { loadState(); loadPolls() }, 5000)
    return () => clearInterval(i)
  }, [loadState, loadLectures, loadPolls])

  /* ---------- 제어 ---------- */
  const broadcastCue = async (cue) => {
    if (!cue) return
    actionAt.current = Date.now()
    const { data, error } = await supabase.rpc('sp_partner_cue_broadcast_s', { p_session_id: sessionId, p_cue_id: cue.id })
    if (error || !data?.success) { toast.error('송출 실패'); return }
    toast.success('청중 화면에 송출했습니다')
    loadState(); loadPolls()
    onBroadcast?.(cue)
  }

  const selectPdf = async (lectureId) => {
    actionAt.current = Date.now()
    setState((s) => ({ ...s, broadcast_mode: 'pdf', broadcast_pdf_id: lectureId }))
    const { error } = await supabase.rpc('sp_partner_broadcast_mode_s', { p_session_id: sessionId, p_mode: 'pdf', p_pdf_id: lectureId })
    if (error) toast.error('송출 전환 실패')
  }

  const movePage = async (next) => {
    const cur = lectures.find((l) => l.id === state.broadcast_pdf_id)
    const total = cur?.page_count || 0
    const target = Math.min(Math.max(1, next), total || next)
    actionAt.current = Date.now()
    setState((s) => ({ ...s, broadcast_pdf_page: target }))
    await supabase.rpc('sp_partner_pdf_page_s', { p_session_id: sessionId, p_page: target })
  }

  const toggleSurvey = async (poll) => {
    const newStatus = poll.status === 'active' ? 'closed' : 'active'
    actionAt.current = Date.now()
    // 015: sp_partner_poll_toggle_s가 broadcast_mode 전환(survey 설정/idle 복귀)까지
    // 프로시저 내부에서 원자적으로 수행 — 이중 RPC 제거 (PRD §6)
    const { error } = await supabase.rpc('sp_partner_poll_toggle_s', { p_poll_id: poll.id, p_status: newStatus })
    if (error) { toast.error('설문 상태 변경 실패'); loadPolls(); return }
    toast.success(newStatus === 'active' ? '청중 화면에 띄웠습니다' : '청중 화면에서 내렸습니다')
    loadState(); loadPolls()
  }

  const clearStage = async () => {
    actionAt.current = Date.now()
    setState((s) => ({ ...s, broadcast_mode: 'idle' }))
    await supabase.rpc('sp_partner_broadcast_mode_s', { p_session_id: sessionId, p_mode: 'idle' })
    loadState()
  }

  const currentPdf = lectures.find((l) => l.id === state.broadcast_pdf_id) || null

  /* ---------- 렌더 ---------- */
  const renderCueTab = () => {
    if (!selectedCue) {
      return (
        <div className="text-center py-16 text-sm text-slate-400 dark:text-slate-500">
          왼쪽 진행 플랜에서 큐를 선택하면<br />여기서 미리보고 송출할 수 있습니다.
        </div>
      )
    }
    const c = selectedCue
    const isPdf = c.cue_type === 'pdf'
    const isSurvey = c.cue_type === 'survey'
    const isQna = c.cue_type === 'qna'
    const isNotice = c.cue_type === 'notice'
    const TypeIcon = isPdf ? FileText : isSurvey ? BarChart3 : isQna ? MessageCircle : Megaphone
    const pollObj = isSurvey ? polls.find((p) => p.id === c.poll_id) : null

    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
            <TypeIcon className="w-4 h-4" />
            {isPdf ? '강연자료' : isSurvey ? '설문' : isQna ? 'Q&A 세그먼트' : '안내'}
            {c.presenter_name && <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{c.presenter_name}</span>}
          </div>
          {c.title && <div className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{c.title}</div>}

          {isPdf && (
            <div className="text-slate-700 dark:text-slate-200">
              <div className="font-semibold">{c.lecture_title || '자료 미지정'}</div>
              <div className="text-sm text-slate-400 mt-1">시작 페이지 p.{c.start_page || 1} / {c.lecture_page_count || '?'}</div>
            </div>
          )}
          {isSurvey && (
            <div className="text-slate-700 dark:text-slate-200 font-semibold">{stripHtml(c.poll_question) || '설문 미지정'}</div>
          )}
          {isQna && (
            <div className="text-slate-700 dark:text-slate-200">{c.qna_category_name ? `카테고리: ${c.qna_category_name}` : '전체 질문 받기'}</div>
          )}
          {isNotice && (
            <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{c.notice_text || '안내 문구 없음'}</div>
          )}

          {/* 송출 버튼 */}
          <button
            type="button"
            onClick={() => broadcastCue(c)}
            className="mt-5 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" /> 이 큐 청중 화면에 송출하기
          </button>

          {/* 맥락 수동 제어 */}
          {isPdf && currentPdf && state.broadcast_pdf_id === c.lecture_file_id && (
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => movePage(state.broadcast_pdf_page - 1)} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
              <div className="text-center px-3"><div className="text-lg font-bold">{state.broadcast_pdf_page} / {currentPdf.page_count || '?'}</div><div className="text-[10px] text-slate-400">현재 페이지</div></div>
              <button type="button" onClick={() => movePage(state.broadcast_pdf_page + 1)} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
          {isSurvey && pollObj && (
            <button
              type="button"
              onClick={() => toggleSurvey(pollObj)}
              className={`mt-3 w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 ${pollObj.status === 'active' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {pollObj.status === 'active' ? (<><EyeOff className="w-4 h-4" /> 설문 내리기</>) : (<><Send className="w-4 h-4" /> 설문만 띄우기</>)}
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderPdfTab = () => (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">강연 자료 ({lectures.length})</h3>
      {lectures.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-400">설정 에디터에서 PDF를 업로드하세요</div>
      ) : (
        <div className="space-y-2">
          {lectures.map((l) => {
            const on = l.id === state.broadcast_pdf_id && state.broadcast_mode === 'pdf'
            return (
              <button key={l.id} type="button" onClick={() => selectPdf(l.id)}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 ${on ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><FileText className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-sm truncate">{l.title}</span><span className="block text-xs text-slate-400">{l.page_count || '?'} 페이지</span></span>
                {on && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">송출 중</span>}
              </button>
            )
          })}
        </div>
      )}
      {currentPdf && state.broadcast_mode === 'pdf' && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 flex items-center gap-2">
          <button type="button" onClick={() => movePage(state.broadcast_pdf_page - 1)} className="flex-1 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
          <div className="text-center px-2"><div className="text-lg font-bold">{state.broadcast_pdf_page} / {currentPdf.page_count || '?'}</div><div className="text-[10px] text-slate-400">현재 페이지</div></div>
          <button type="button" onClick={() => movePage(state.broadcast_pdf_page + 1)} className="flex-1 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  )

  const renderSurveyTab = () => (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">준비된 설문 ({polls.length})</h3>
      {polls.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-400">설정 에디터에서 설문을 만드세요</div>
      ) : (
        <div className="space-y-2.5">
          {polls.map((poll, idx) => {
            const on = poll.status === 'active'
            return (
              <div key={poll.id} className={`rounded-xl p-3 ${on ? 'border-2 border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-700' : 'border border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-start gap-2">
                  <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0"><div className="font-semibold text-sm leading-snug line-clamp-2">{stripHtml(poll.question)}</div></div>
                </div>
                <button type="button" onClick={() => toggleSurvey(poll)} className={`mt-2.5 w-full text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 ${on ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {on ? (<><EyeOff className="w-4 h-4" /> 청중 화면에서 내리기</>) : (<><Send className="w-4 h-4" /> 청중 화면에 띄우기</>)}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* 탭 헤더 */}
      <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {TABS.map((tb) => {
            const Icon = tb.icon
            const on = activeTab === tb.key
            return (
              <button key={tb.key} type="button" onClick={() => onTabChange?.(tb.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${on ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <Icon className="w-4 h-4" /> {tb.label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto">
          <button type="button" onClick={clearStage} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
            대기 화면으로
          </button>
        </div>
      </div>

      {/* 탭 본문 */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'cue' && renderCueTab()}
        {activeTab === 'qna' && <ManagerQnA sessionId={sessionId} sessionCode={sessionCode} />}
        {activeTab === 'survey' && renderSurveyTab()}
        {activeTab === 'pdf' && renderPdfTab()}
      </div>
    </div>
  )
}
