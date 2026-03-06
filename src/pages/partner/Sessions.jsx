import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { usePartner } from '@/context/PartnerContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  FileText,
  Play,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  QrCode,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 파트너: 세션 목록 페이지
 */
export default function Sessions() {
  const { user } = useAuth()
  const { partner, loading: partnerLoading } = usePartner()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 필터
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  
  // 검색어 디바운스 (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  /**
   * 세션 목록 로드 (단일 RPC 호출로 최적화)
   */
  const loadData = useCallback(async () => {
    if (!user || !partner) return
    
    setLoading(true)
    try {
      // 세션 목록 조회 (프로시저 사용)
      const { data: sessionsData, error: sessionsError } = await supabase.rpc('sp_partner_sessions_q', {
        p_partner_id: partner.id,
        p_status: statusFilter === 'all' ? null : statusFilter,
        p_search: debouncedSearchQuery || null
      })
      
      if (sessionsError) throw sessionsError
      
      // 프로시저는 { sessions: [...], total: N } 형태로 반환
      setSessions(sessionsData?.sessions || [])
      
    } catch (error) {
      console.error('Error loading sessions:', error)
      // toast.error는 여기서 직접 호출하지 않음 (t 의존성 제거)
    } finally {
      setLoading(false)
    }
  }, [user, partner, statusFilter, debouncedSearchQuery])

  useEffect(() => {
    let isMounted = true
    
    const fetchData = async () => {
      if (!user || !partner || !isMounted) return
      
      setLoading(true)
      try {
        const { data: sessionsData, error: sessionsError } = await supabase.rpc('sp_partner_sessions_q', {
          p_partner_id: partner.id,
          p_status: statusFilter === 'all' ? null : statusFilter,
          p_search: debouncedSearchQuery || null
        })
        
        if (sessionsError) throw sessionsError
        
        if (isMounted) {
          setSessions(sessionsData?.sessions || [])
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      isMounted = false
    }
  }, [user, partner, statusFilter, debouncedSearchQuery])

  /**
   * 참여 코드 복사
   */
  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success(t('session.codeCopied'))
  }

  /**
   * 미리보기 링크 복사
   */
  const copyPreviewLink = (code) => {
    const url = `${window.location.origin}/join/${code}?preview=true`
    navigator.clipboard.writeText(url)
    toast.success(t('session.previewLinkCopied'))
  }

  /**
   * 세션 삭제
   */
  const handleDelete = async (sessionId) => {
    if (!confirm(t('session.deleteConfirm'))) return
    
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
      
      if (error) throw error
      
      toast.success(t('session.deleted'))
      loadData()
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 상태 배지 렌더링
   */
  const getStatusBadge = (status) => {
    const config = {
      draft: { label: t('session.statusDraft'), variant: 'outline', className: 'text-gray-600' },
      published: { label: t('session.statusPublished'), variant: 'outline', className: 'text-blue-600' },
      active: { label: t('session.statusActive'), variant: 'default', className: 'bg-green-500' },
      ended: { label: t('session.statusEnded'), variant: 'outline', className: 'text-gray-500' },
      cancelled: { label: t('session.statusCancelled'), variant: 'outline', className: 'text-red-600' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>
  }

  /**
   * 통계 계산
   */
  const stats = {
    total: sessions.length,
    draft: sessions.filter(s => s.status === 'draft').length,
    published: sessions.filter(s => s.status === 'published').length,
    active: sessions.filter(s => s.status === 'active').length,
    ended: sessions.filter(s => s.status === 'ended').length,
  }

  if (loading || partnerLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('session.noPartner')}</h2>
        <p className="text-muted-foreground">{t('session.noPartnerDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('session.management')}</h1>
          <p className="text-muted-foreground mt-1">{t('session.managementDesc')}</p>
        </div>
        <Button onClick={() => navigate('/partner/sessions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('session.create')}
        </Button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title={t('session.total')} value={stats.total} icon={FileText} />
        <StatCard title={t('session.statusDraft')} value={stats.draft} icon={Edit} />
        <StatCard title={t('session.statusPublished')} value={stats.published} icon={Eye} />
        <StatCard title={t('session.statusActive')} value={stats.active} icon={Play} />
        <StatCard title={t('session.statusEnded')} value={stats.ended} icon={CheckCircle} />
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('session.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('session.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="draft">{t('session.statusDraft')}</SelectItem>
                <SelectItem value="published">{t('session.statusPublished')}</SelectItem>
                <SelectItem value="active">{t('session.statusActive')}</SelectItem>
                <SelectItem value="ended">{t('session.statusEnded')}</SelectItem>
                <SelectItem value="cancelled">{t('session.statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 세션 목록 */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('session.noSessions')}</h3>
            <p className="text-muted-foreground mb-4">{t('session.noSessionsDesc')}</p>
            <Button onClick={() => navigate('/partner/sessions/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('session.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* 세션 정보 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(session.status)}
                      <h3 className="font-semibold text-lg">{session.title}</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{session.venue_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{session.participant_count} / {session.max_participants}</span>
                      </div>
                    </div>
                  </div>

                  {/* 참여 코드 */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">{t('session.code')}:</span>
                    <span className="font-mono font-bold">{session.code}</span>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(session.code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                          <p className="font-medium">{t('session.copyCode')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* 주요 액션 버튼 */}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/partner/sessions/${session.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
                            asChild
                          >
                            <a 
                              href={`/join/${session.code}?preview=true`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                          <p className="font-medium">{t('session.openPreview')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* 추가 액션 메뉴 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => copyCode(session.code)}>
                          <Copy className="h-4 w-4 mr-2" />
                          {t('session.copyCode')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyPreviewLink(session.code)}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {t('session.copyPreviewLink')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <QrCode className="h-4 w-4 mr-2" />
                          {t('session.showQR')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(session.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

