import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { usePartner } from '@/context/PartnerContext'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  FileText,
  Play,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  QrCode,
  ExternalLink,
  Link as LinkIcon,
  Radio,
  BarChart3,
  Pencil,
  Eye,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * 파트너: 세션 목록 페이지
 * — 상태별 그룹 + 상태 맞춤 단일 CTA
 */
export default function Sessions() {
  const { user } = useAuth()
  const { partner, loading: partnerLoading } = usePartner()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // 검색 디바운스 (500ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 세션 목록 로드
  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      if (!user || !partner || !isMounted) return
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc('sp_partner_sessions_q', {
          p_partner_id: partner.id,
          p_status: statusFilter === 'all' ? null : statusFilter,
          p_search: debouncedSearch || null,
        })
        if (error) throw error
        if (isMounted) setSessions(data?.sessions || [])
      } catch (error) {
        console.error('Error loading sessions:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [user, partner, statusFilter, debouncedSearch])

  const reload = async () => {
    if (!partner) return
    const { data } = await supabase.rpc('sp_partner_sessions_q', {
      p_partner_id: partner.id,
      p_status: statusFilter === 'all' ? null : statusFilter,
      p_search: debouncedSearch || null,
    })
    setSessions(data?.sessions || [])
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success(t('session.codeCopied') || '코드가 복사되었습니다')
  }

  const copyPreviewLink = (code) => {
    const url = `${window.location.origin}/join/${code}?preview=true`
    navigator.clipboard.writeText(url)
    toast.success(t('session.previewLinkCopied') || '미리보기 링크가 복사되었습니다')
  }

  const handleDelete = async (sessionId) => {
    if (!confirm(t('session.deleteConfirm') || '정말 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
      toast.success(t('session.deleted') || '삭제되었습니다')
      reload()
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error(t('error.deleteFailed') || '삭제 실패')
    }
  }

  // 상태별 집계
  const stats = {
    total: sessions.length,
    active: sessions.filter((s) => s.status === 'active').length,
    published: sessions.filter((s) => s.status === 'published').length,
    draft: sessions.filter((s) => s.status === 'draft').length,
    ended: sessions.filter((s) => s.status === 'ended').length,
  }

  // 상태별 그룹
  const grouped = {
    active: sessions.filter((s) => s.status === 'active'),
    published: sessions.filter((s) => s.status === 'published'),
    draft: sessions.filter((s) => s.status === 'draft'),
    ended: sessions.filter((s) => s.status === 'ended'),
  }

  const showGrouped = statusFilter === 'all'

  if (loading || partnerLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('session.noPartner')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t('session.noPartnerDesc')}</p>
      </div>
    )
  }

  const handlers = { copyCode, copyPreviewLink, handleDelete, navigate }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('session.management') || '세션 관리'}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('session.managementDesc') || '강연·세미나 세션을 만들고 진행하세요'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/partner/sessions/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('session.create') || '새 세션 만들기'}
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill label="전체 세션" value={stats.total} />
        <StatPill label="진행중" value={stats.active} color="emerald" />
        <StatPill label="게시됨" value={stats.published} color="sky" />
        <StatPill label="준비중" value={stats.draft} color="amber" />
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t('session.searchPlaceholder') || '세션명 검색'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400 bg-white dark:bg-slate-900"
          />
        </div>
        <div className="flex gap-1.5 text-sm flex-wrap">
          {[
            ['all', '전체'],
            ['active', '진행중'],
            ['published', '게시됨'],
            ['draft', '준비중'],
            ['ended', '종료'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {sessions.length === 0 ? (
        <EmptyState onCreate={() => navigate('/partner/sessions/new')} t={t} />
      ) : showGrouped ? (
        <div className="space-y-8">
          {grouped.active.length > 0 && (
            <Section
              title="진행중"
              icon={<LiveDot />}
              accent="emerald"
              sessions={grouped.active}
              handlers={handlers}
            />
          )}
          {grouped.published.length > 0 && (
            <Section
              title="게시됨 · 시작 대기"
              accent="sky"
              sessions={grouped.published}
              handlers={handlers}
            />
          )}
          {grouped.draft.length > 0 && (
            <Section
              title="준비중 · 작성 진행"
              accent="amber"
              sessions={grouped.draft}
              handlers={handlers}
            />
          )}
          {grouped.ended.length > 0 && (
            <Section title="종료됨" accent="slate" sessions={grouped.ended} handlers={handlers} />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} handlers={handlers} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ----- 통계 칩 ----- */
function StatPill({ label, value, color = 'slate' }) {
  const colorMap = {
    slate: 'text-slate-900 dark:text-slate-100',
    emerald: 'text-emerald-600',
    sky: 'text-sky-600',
    amber: 'text-amber-600',
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</div>
    </div>
  )
}

/* ----- 라이브 점 ----- */
function LiveDot() {
  return (
    <span className="inline-flex w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
  )
}

/* ----- 섹션 ----- */
function Section({ title, icon, sessions, handlers }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">
        {icon} {title}
      </h2>
      <div className="space-y-3">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} handlers={handlers} />
        ))}
      </div>
    </section>
  )
}

/* ----- 세션 카드 ----- */
function SessionCard({ session, handlers }) {
  const { copyCode, copyPreviewLink, handleDelete, navigate } = handlers

  // 상태별 시각 강조
  const isActive = session.status === 'active'

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center gap-4 transition-all ${
        isActive
          ? 'border-2 border-emerald-300 shadow-sm'
          : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <StatusBadge status={session.status} />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            참여코드 <b className="text-slate-700 dark:text-slate-300 font-mono">{session.code}</b>
          </span>
        </div>
        <h3 className="font-bold text-lg leading-snug">{session.title}</h3>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateTime(session.start_at)}
          </span>
          {session.venue_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {session.venue_name}
            </span>
          )}
          <span
            className={`flex items-center gap-1 ${
              isActive ? 'text-emerald-600 font-semibold' : ''
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {session.participant_count} / {session.max_participants}
            {isActive ? ' 참여중' : ''}
          </span>
        </div>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2">
        <PrimaryAction session={session} navigate={navigate} />

        {/* 미리보기 */}
        <a
          href={`/join/${session.code}?preview=true`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          title="청중 화면 미리보기"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* 더보기 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => copyCode(session.code)}>
              <Copy className="w-4 h-4 mr-2" /> 참여코드 복사
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyPreviewLink(session.code)}>
              <LinkIcon className="w-4 h-4 mr-2" /> 미리보기 링크 복사
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <QrCode className="w-4 h-4 mr-2" /> QR 코드 보기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600"
              onClick={() => handleDelete(session.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/* ----- 상태 배지 ----- */
function StatusBadge({ status }) {
  const config = {
    draft: { label: '준비중', cls: 'bg-amber-100 text-amber-700' },
    published: { label: '게시됨', cls: 'bg-sky-100 text-sky-700' },
    active: { label: '● LIVE', cls: 'bg-emerald-100 text-emerald-700' },
    ended: { label: '종료', cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
    cancelled: { label: '취소됨', cls: 'bg-rose-100 text-rose-700' },
  }
  const c = config[status] || config.draft
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.cls}`}>{c.label}</span>
  )
}

/* ----- 상태별 주 CTA ----- */
function PrimaryAction({ session, navigate }) {
  const id = session.id
  switch (session.status) {
    case 'active':
      return (
        <button
          type="button"
          onClick={() => navigate(`/partner/sessions/${id}/console`)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Radio className="w-4 h-4" /> 진행 콘솔 열기
        </button>
      )
    case 'published':
      return (
        <>
          <button
            type="button"
            onClick={() => navigate(`/partner/sessions/${id}`)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            설정
          </button>
          <button
            type="button"
            onClick={() => navigate(`/partner/sessions/${id}/console`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Play className="w-4 h-4" /> 라이브 시작
          </button>
        </>
      )
    case 'draft':
      return (
        <button
          type="button"
          onClick={() => navigate(`/partner/sessions/${id}`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Pencil className="w-4 h-4" /> 준비 계속하기
        </button>
      )
    case 'ended':
      return (
        <button
          type="button"
          onClick={() => navigate(`/partner/sessions/${id}/report`)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <BarChart3 className="w-4 h-4" /> 리포트 보기
        </button>
      )
    default:
      return (
        <button
          type="button"
          onClick={() => navigate(`/partner/sessions/${id}`)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Edit className="w-4 h-4" /> 보기
        </button>
      )
  }
}

/* ----- 빈 상태 ----- */
function EmptyState({ onCreate, t }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center py-16">
      <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {t('session.noSessions') || '아직 세션이 없습니다'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-4">
        {t('session.noSessionsDesc') || '첫 세션을 만들어보세요'}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Plus className="h-4 w-4" /> {t('session.createFirst') || '첫 세션 만들기'}
      </button>
    </div>
  )
}

/* ----- 날짜 포맷 ----- */
function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}
