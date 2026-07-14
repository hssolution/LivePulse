import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  FileText,
  MessageCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Send,
  EyeOff,
  RefreshCw,
  Info,
} from 'lucide-react'

const MODES = [
  { key: 'pdf', label: '강연자료', icon: FileText },
  { key: 'qna', label: 'Q&A', icon: MessageCircle },
  { key: 'survey', label: '설문', icon: BarChart3 },
]

function stripHtml(s) {
  if (!s) return ''
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent || div.innerText || ''
}

/**
 * 통합 무대 제어 (좌장/콘솔 공용)
 * 강연자료(PDF) / Q&A 카테고리 / 설문 3모드를 한 곳에서 제어.
 * props: sessionId
 */
export default function StageControl({ sessionId }) {
  const [mode, setMode] = useState('pdf')
  const [pdfId, setPdfId] = useState(null)
  const [page, setPage] = useState(1)
  const [lectures, setLectures] = useState([])
  const [categories, setCategories] = useState([])
  const [polls, setPolls] = useState([])
  const [activePollId, setActivePollId] = useState(null)
  const actionAt = useRef(0)

  const currentPdf = lectures.find((l) => l.id === pdfId) || null
  const pdfTotal = currentPdf?.page_count || 0

  /* ---------- 로드 ---------- */
  const loadState = useCallback(async () => {
    if (!sessionId) return
    if (Date.now() - actionAt.current < 2500) return
    const { data } = await supabase.rpc('sp_partner_broadcast_state_q', { p_session_id: sessionId })
    if (data) {
      if (data.broadcast_mode && data.broadcast_mode !== 'idle') setMode(data.broadcast_mode)
      setPdfId(data.broadcast_pdf_id || null)
      setPage(data.broadcast_pdf_page || 1)
      setActivePollId(data.active_poll_id || null)
    }
  }, [sessionId])

  const loadLectures = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_lectures_q', { p_session_id: sessionId })
    setLectures(Array.isArray(data) ? data : [])
  }, [sessionId])

  const loadCategories = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_qna_categories_q', { p_session_id: sessionId })
    setCategories(Array.isArray(data) ? data : [])
  }, [sessionId])

  const loadPolls = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_polls_q', { p_session_id: sessionId })
    const list = Array.isArray(data) ? data : (data?.polls || [])
    setPolls(list)
    const active = list.find((p) => p.status === 'active')
    setActivePollId(active?.id || null)
  }, [sessionId])

  useEffect(() => {
    loadState()
    loadLectures()
    loadCategories()
    loadPolls()
    const i = setInterval(() => {
      loadState()
      loadPolls()
    }, 5000)
    return () => clearInterval(i)
  }, [loadState, loadLectures, loadCategories, loadPolls])

  /* ---------- 제어 ---------- */
  const switchMode = async (m, lectureId = null) => {
    actionAt.current = Date.now()
    setMode(m)
    const params = { p_session_id: sessionId, p_mode: m }
    if (m === 'pdf') {
      const target = lectureId || pdfId || lectures[0]?.id || null
      if (target) {
        params.p_pdf_id = target
        if (target !== pdfId) { setPdfId(target); setPage(1) }
      }
    }
    const { data, error } = await supabase.rpc('sp_partner_broadcast_mode_s', params)
    if (error || !data?.success) toast.error('송출 전환 실패')
  }

  const selectPdf = (id) => switchMode('pdf', id)

  const movePage = async (next) => {
    if (!currentPdf) return
    const target = Math.min(Math.max(1, next), pdfTotal || next)
    actionAt.current = Date.now()
    setPage(target)
    await supabase.rpc('sp_partner_pdf_page_s', { p_session_id: sessionId, p_page: target })
  }

  const toggleCategory = async (cat) => {
    actionAt.current = Date.now()
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, is_visible: !c.is_visible } : c)))
    await supabase.rpc('sp_partner_qna_category_s', {
      p_action: 'update',
      p_session_id: sessionId,
      p_category_id: cat.id,
      p_is_visible: !cat.is_visible,
    })
  }

  const toggleSurvey = async (poll) => {
    const newStatus = poll.status === 'active' ? 'closed' : 'active'
    actionAt.current = Date.now()
    setActivePollId(newStatus === 'active' ? poll.id : null)
    // 015/016: 토글 프로시저가 broadcast_mode 전환(survey/idle 복귀)까지 원자 수행 —
    // 별도 switchMode RPC 이중 호출 제거, 로컬 UI 상태만 동기화
    const { error } = await supabase.rpc('sp_partner_poll_toggle_s', { p_poll_id: poll.id, p_status: newStatus })
    if (error) { toast.error('설문 상태 변경 실패'); loadPolls(); return }
    toast.success(newStatus === 'active' ? '청중 화면에 띄웠습니다' : '청중 화면에서 내렸습니다')
    setMode(newStatus === 'active' ? 'survey' : 'idle')
    loadPolls()
  }

  const clearStage = async () => {
    actionAt.current = Date.now()
    setMode('idle')
    await supabase.rpc('sp_partner_broadcast_mode_s', { p_session_id: sessionId, p_mode: 'idle' })
  }

  /* ---------- 지금 송출 중 요약 ---------- */
  let nowLabel = '대기 화면'
  let nowTitle = '송출 대기 중'
  if (mode === 'pdf' && currentPdf) {
    nowLabel = '지금 송출 · 강연자료'
    nowTitle = `${currentPdf.title} · ${page} / ${pdfTotal || '?'}`
  } else if (mode === 'qna') {
    nowLabel = '지금 송출 · Q&A'
    nowTitle = '송출 질문 / 카테고리 필터'
  } else if (mode === 'survey' && activePollId) {
    const p = polls.find((x) => x.id === activePollId)
    nowLabel = '지금 송출 · 설문'
    nowTitle = p ? stripHtml(p.question) : '설문 진행 중'
  }

  const active = mode !== 'idle'

  return (
    <div className="flex flex-col h-full">
      {/* 지금 송출 중 */}
      <div className="px-4 pt-4">
        <div className={`rounded-xl border-2 p-3.5 ${active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
          <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${active ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {nowLabel}
          </div>
          <div className={`font-bold text-sm leading-snug ${active ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>
            {nowTitle}
          </div>
        </div>
      </div>

      {/* 모드 탭 */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-sm">
          {MODES.map((m) => {
            const Icon = m.icon
            const on = mode === m.key
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => switchMode(m.key)}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  on ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 강연자료 */}
        {mode === 'pdf' && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">강연 자료 ({lectures.length})</h3>
            {lectures.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">설정 에디터에서 PDF를 업로드하세요</div>
            ) : (
              <div className="space-y-2">
                {lectures.map((l) => {
                  const on = l.id === pdfId
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => selectPdf(l.id)}
                      className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                        on ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm truncate text-slate-800 dark:text-slate-100">{l.title}</span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500">{l.page_count || '?'} 페이지</span>
                      </span>
                      {on && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">송출 중</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {currentPdf && (
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">페이지 제어</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> 강연자와 동기화
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => movePage(page - 1)} className="flex-1 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center px-2">
                    <div className="text-lg font-bold leading-none text-slate-900 dark:text-white">{page} <span className="text-slate-300 dark:text-slate-600">/</span> {pdfTotal || '?'}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">현재 페이지</div>
                  </div>
                  <button type="button" onClick={() => movePage(page + 1)} className="flex-1 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Q&A 카테고리 */}
        {mode === 'qna' && (
          <div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3">
              <div className="text-sm font-semibold mb-1 text-slate-800 dark:text-slate-100">Q&amp;A 모드 송출</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-3">
                질문 송출은 아래 Q&amp;A 목록에서, 청중 노출 카테고리는 여기서 제어합니다.
              </p>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">청중에게 보일 카테고리</div>
              {categories.length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-slate-500">설정 에디터에서 카테고리를 추가하세요</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        c.is_visible ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      style={c.is_visible ? { backgroundColor: c.color || '#4f46e5' } : undefined}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed flex gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              카테고리를 끄면 그 종류의 질문은 청중 목록에서 숨겨집니다.
            </div>
          </div>
        )}

        {/* 설문 */}
        {mode === 'survey' && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">준비된 설문 ({polls.length})</h3>
            {polls.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">설정 에디터에서 설문을 만드세요</div>
            ) : (
              <div className="space-y-2.5">
                {polls.map((poll, idx) => {
                  const on = poll.id === activePollId
                  return (
                    <div key={poll.id} className={`rounded-xl p-3 ${on ? 'border-2 border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-700' : 'border border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex items-start gap-2">
                        <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm leading-snug line-clamp-2 text-slate-800 dark:text-slate-100">{stripHtml(poll.question)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSurvey(poll)}
                        className={`mt-2.5 w-full text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 ${
                          on ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {on ? (<><EyeOff className="w-4 h-4" /> 청중 화면에서 내리기</>) : (<><Send className="w-4 h-4" /> 청중 화면에 띄우기</>)}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 대기 화면으로 */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={clearStage} className="w-full text-sm font-semibold py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          송출 비우고 대기 화면으로
        </button>
      </div>
    </div>
  )
}
