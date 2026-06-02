import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MessageCircle,
  BarChart3,
  ListVideo,
  Megaphone,
} from 'lucide-react'
import PdfPage from '@/components/PdfPage'

/**
 * 강연자 화면 (/speaker/:code)
 * - 현재 송출 중인 강연자료 페이지를 크게 표시
 * - 강연자가 직접 이전/다음 페이지로 넘김 (좌장과 동기화)
 * - 다음 송출 예정(좌장 큐: 송출 질문 / 활성 설문) 미리보기
 */
export default function SpeakerScreen() {
  const { code } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pdfFile, setPdfFile] = useState(null)
  const [live, setLive] = useState(null)
  const [syncedAt, setSyncedAt] = useState(0)

  const page = session?.broadcast_pdf_page || 1
  const total = pdfFile?.page_count || 0

  /** 세션 로드 */
  const loadSession = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('*').eq('code', code).single()
    setSession(data || null)
    setLoading(false)
  }, [code])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  /** 강연자료 로드 */
  useEffect(() => {
    if (session?.broadcast_pdf_id) {
      supabase
        .from('lecture_files')
        .select('*')
        .eq('id', session.broadcast_pdf_id)
        .single()
        .then(({ data }) => setPdfFile(data || null))
    } else {
      setPdfFile(null)
    }
  }, [session?.broadcast_pdf_id])

  /** 세션(모드/페이지) 실시간 구독 */
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`speaker-session:${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          setSession((prev) => ({ ...prev, ...payload.new }))
          setSyncedAt(Date.now())
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id])

  /** 다음 송출 큐 폴링 */
  const loadLive = useCallback(async () => {
    const { data } = await supabase.rpc('sp_live_broadcast_q', { p_code: code })
    if (data?.success) setLive(data)
  }, [code])

  useEffect(() => {
    loadLive()
    const i = setInterval(loadLive, 4000)
    return () => clearInterval(i)
  }, [loadLive])

  /** 페이지 이동 */
  const movePage = useCallback(
    async (next) => {
      if (!session?.id || !pdfFile) return
      const target = Math.min(Math.max(1, next), total || next)
      setSession((prev) => ({ ...prev, broadcast_pdf_page: target }))
      await supabase.rpc('sp_partner_pdf_page_s', { p_session_id: session.id, p_page: target })
    },
    [session?.id, pdfFile, total]
  )

  // 키보드 화살표
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') movePage(page + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') movePage(page - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [movePage, page])

  const justSynced = Date.now() - syncedAt < 1500

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d14]">
        <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d14] text-slate-400">
        세션을 찾을 수 없습니다
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d0d14] text-white overflow-hidden">
      {/* 헤더 */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-bold text-rose-300 bg-rose-500/15 px-3 py-1.5 rounded-full">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> LIVE
          </span>
          <h1 className="text-lg font-bold text-slate-200 truncate max-w-md">강연자 화면 · {session.title}</h1>
        </div>
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            justSynced ? 'text-indigo-200 bg-indigo-500/20' : 'text-emerald-300 bg-emerald-500/15'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" /> {justSynced ? '좌장과 동기화됨' : '실시간 동기화 중'}
        </span>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* 좌측: 슬라이드 + 페이지 제어 */}
        <main className="flex-1 flex flex-col p-6 min-w-0">
          {session.broadcast_mode === 'pdf' && pdfFile ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2 text-indigo-300 font-bold">
                  <FileText className="w-5 h-5" /> {pdfFile.title}
                </div>
                <div className="text-slate-400 font-semibold">
                  {page} <span className="text-slate-600">/</span> {total || '?'}
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <PdfPage
                  fileUrl={pdfFile.file_url}
                  pageNumber={page}
                  fit="contain"
                  pageClassName="rounded-xl overflow-hidden shadow-2xl"
                />
              </div>
              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => movePage(page - 1)}
                  className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold flex items-center gap-2 text-lg"
                >
                  <ChevronLeft className="w-6 h-6" /> 이전
                </button>
                <div className="text-center px-4">
                  <div className="text-2xl font-bold leading-none">
                    {page} / {total || '?'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">← → 키로도 넘길 수 있어요</div>
                </div>
                <button
                  type="button"
                  onClick={() => movePage(page + 1)}
                  className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold flex items-center gap-2 text-lg"
                >
                  다음 <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : session.broadcast_mode === 'notice' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="inline-flex items-center gap-2 text-amber-300 font-bold mb-6">
                <Megaphone className="w-5 h-5" /> 안내 중
              </div>
              <p className="text-3xl font-bold whitespace-pre-wrap text-slate-100">
                {session.broadcast_notice || '잠시 후 계속됩니다'}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-xl">현재 송출 중인 강연자료가 없습니다</p>
              <p className="text-sm mt-1">좌장이 강연자료를 띄우면 여기에 표시됩니다</p>
            </div>
          )}
        </main>

        {/* 우측: 다음 송출 예정 */}
        <aside className="w-[340px] border-l border-white/10 flex flex-col p-5 gap-4 shrink-0 overflow-y-auto">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5 mb-3 text-slate-200">
              <ListVideo className="w-4 h-4 text-indigo-300" /> 현재 / 다음 송출
            </h3>
            <div className="space-y-2.5">
              {live?.question ? (
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-400/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 mb-1">
                    <MessageCircle className="w-3.5 h-3.5" /> 송출 질문
                    {live.question.category_name && <span className="ml-1">· {live.question.category_name}</span>}
                  </div>
                  <p className="text-sm text-slate-200 leading-snug">{live.question.content}</p>
                </div>
              ) : (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-slate-400">
                  송출 중인 질문 없음
                </div>
              )}
              {live?.active_poll_id && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
                    <BarChart3 className="w-3.5 h-3.5" /> 설문 진행 중
                  </div>
                  <p className="text-sm text-slate-300 leading-snug">청중이 응답하고 있습니다</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/20 p-4 text-xs text-emerald-200 leading-relaxed mt-auto">
            <b className="flex items-center gap-1 mb-1">
              <RefreshCw className="w-3.5 h-3.5" /> 페이지 넘김
            </b>
            좌장과 강연자 모두 페이지를 넘길 수 있고, 변경은 송출 화면에 즉시 반영됩니다.
          </div>
        </aside>
      </div>
    </div>
  )
}
