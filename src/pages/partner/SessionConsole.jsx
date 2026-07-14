import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Users,
  Clock,
  Tv,
  Presentation,
  Square,
  Loader2,
  MonitorPlay,
  Play,
} from 'lucide-react'
import RunOfShowPanel from '@/components/session/RunOfShowPanel'
import CockpitWorkspace from '@/components/session/CockpitWorkspace'
import StagePhaseBar from '@/components/session/StagePhaseBar'

/**
 * 라이브 진행 콘솔
 * /partner/sessions/:id/console
 *
 * 강연 당일 운영 화면 — 통합 무대 제어(강연자료/Q&A/설문) + Q&A 모더레이션.
 */
export default function SessionConsole() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState('00:00:00')
  // 진행 플랜 ↔ 작업판 연동
  const [selectedCue, setSelectedCue] = useState(null)
  const [activeTab, setActiveTab] = useState('cue')

  // 송출 후 세션(현재 큐/모드) 즉시 갱신
  const refreshSession = async () => {
    if (!id) return
    const { data } = await supabase.from('sessions').select('*').eq('id', id).single()
    if (data) setSession((prev) => ({ ...prev, ...data }))
  }

  // 세션 로드
  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()
      if (cancelled) return
      if (error || !data) {
        toast.error('세션을 찾을 수 없습니다')
        navigate('/partner/sessions')
        return
      }
      setSession(data)
      setLoading(false)
    }
    fetch()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  // 세션 폴링 (참가자 수 등 업데이트)
  useEffect(() => {
    if (!session?.id) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session.id)
        .single()
      if (data) setSession((prev) => ({ ...prev, ...data }))
    }, 10000)
    return () => clearInterval(interval)
  }, [session?.id])

  // 경과 시간
  useEffect(() => {
    if (!session?.started_at) return
    const start = new Date(session.started_at).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [session?.started_at])

  // 라이브 시작 (published → active)
  const handleStart = async () => {
    if (!confirm('라이브를 시작하시겠습니까? 청중 화면이 라이브 모드로 전환됩니다.')) return
    try {
      const { error } = await supabase.rpc('sp_partner_session_status_s', {
        p_session_id: session.id,
        p_status: 'active',
      })
      if (error) throw error
      toast.success('라이브가 시작되었습니다')
      const { data } = await supabase.from('sessions').select('*').eq('id', session.id).single()
      if (data) setSession(data)
    } catch (err) {
      console.error('Error starting session:', err)
      toast.error('시작 실패')
    }
  }

  // 세션 종료 (active → ended)
  const handleEnd = async () => {
    if (!confirm('세션을 종료하시겠습니까? 청중 화면이 종료 화면으로 전환됩니다.')) return
    try {
      const { error } = await supabase.rpc('sp_partner_session_status_s', {
        p_session_id: session.id,
        p_status: 'ended',
      })
      if (error) throw error
      toast.success('세션이 종료되었습니다')
      navigate('/partner/sessions')
    } catch (err) {
      console.error('Error ending session:', err)
      toast.error('종료 실패')
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col bg-slate-100 dark:bg-slate-800 overflow-hidden"
      style={{ height: 'calc(100vh - var(--view-as-banner-height, 0px))' }}
    >
      {/* 상단 바 */}
      <header className="bg-[#11111b] text-white px-5 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/partner/sessions')}
            className="text-slate-400 hover:text-white transition-colors"
            title="세션 목록으로"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-full">
            <MonitorPlay className="w-3.5 h-3.5" /> 좌장 콕핏
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-full">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {session.status === 'active' ? 'LIVE' : session.status === 'published' ? '게시됨' : '종료'}
            </span>
            <span className="font-bold truncate max-w-md">{session.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users className="w-4 h-4" />{' '}
            <b className="text-white">{session.participant_count || 0}</b>명
          </div>
          {session.started_at && (
            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Clock className="w-4 h-4" /> {elapsed}
            </div>
          )}
          <a
            href={`/speaker/${session.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Presentation className="w-4 h-4" /> 강연자 화면
          </a>
          <a
            href={`/broadcast/${session.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Tv className="w-4 h-4" /> 송출 화면
          </a>
          {session.status === 'published' && (
            <button
              type="button"
              onClick={handleStart}
              className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" /> 라이브 시작
            </button>
          )}
          {session.status === 'active' && (
            <button
              type="button"
              onClick={handleEnd}
              className="bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" /> 세션 종료
            </button>
          )}
        </div>
      </header>

      {/* 진행 단계 바 — 지금 단계 · 다음 할 일 */}
      <StagePhaseBar status={session.status} broadcastMode={session.broadcast_mode} />

      {/* 본문 — 좌: 진행 플랜 · 우: 탭 작업판 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 진행 플랜 (큐시트) */}
        <aside className="w-[340px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
          <RunOfShowPanel
            sessionId={session.id}
            live
            editable={false}
            selectedCueId={selectedCue?.id || null}
            currentCueId={session.current_cue_id || null}
            onSelect={(cue) => { setSelectedCue(cue); setActiveTab('cue') }}
            onBroadcast={refreshSession}
          />
        </aside>

        {/* 우측: 탭 작업판 (현재 큐 / Q&A / 설문 / 강연자료) */}
        <main className="flex-1 bg-slate-50 dark:bg-slate-800/50 overflow-hidden flex flex-col min-w-0">
          <CockpitWorkspace
            sessionId={session.id}
            sessionCode={session.code}
            selectedCue={selectedCue}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBroadcast={refreshSession}
          />
        </main>
      </div>
    </div>
  )
}
