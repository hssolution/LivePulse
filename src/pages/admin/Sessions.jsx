import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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
import { toast } from 'sonner'
import { 
  Search, 
  Calendar, 
  MapPin, 
  Users, 
  Video,
  FileText,
  Play,
  CheckCircle,
  Edit,
  Copy,
  Eye,
  Building2,
  Hash,
  Clock,
  ExternalLink,
  MoreVertical,
  XCircle,
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
import PartnerInfoDialog from '@/components/common/PartnerInfoDialog'

/**
 * 관리자: 세션 관리 페이지
 * - 모든 파트너의 세션을 조회
 * - 파트너별, 상태별 필터링
 * - 세션 상세 정보 표시
 */
export default function AdminSessions() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [sessions, setSessions] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 필터
  const [statusFilter, setStatusFilter] = useState('all')
  const [partnerFilter, setPartnerFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 파트너 상세 팝업
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)

  /**
   * 데이터 로드
   */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 파트너 목록 조회 (필터 드롭다운용)
      const { data: partnersData } = await supabase
        .from('partners')
        .select(`
          id,
          representative_name,
          partner_type,
          partner_organizers(company_name),
          partner_agencies(company_name)
        `)
        .eq('is_active', true)
        .order('representative_name')
      
      // 파트너 이름 가공
      const processedPartners = (partnersData || []).map(p => ({
        id: p.id,
        name: p.partner_organizers?.[0]?.company_name || 
              p.partner_agencies?.[0]?.company_name || 
              p.representative_name,
        type: p.partner_type
      }))
      setPartners(processedPartners)
      
      // 세션 목록 조회
      let query = supabase
        .from('sessions')
        .select(`
          *,
          partner:partners(
            id,
            representative_name,
            partner_type,
            is_active,
            profile:profiles(email, display_name),
            partner_organizers(company_name),
            partner_agencies(company_name)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      if (partnerFilter !== 'all') {
        query = query.eq('partner_id', partnerFilter)
      }
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,venue_name.ilike.%${searchQuery}%`)
      }
      
      const { data: sessionsData, error: sessionsError } = await query
      
      if (sessionsError) throw sessionsError
      
      setSessions(sessionsData || [])
      
    } catch (error) {
      console.error('Error loading sessions:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, partnerFilter, searchQuery, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  /**
   * 파트너 이름 가져오기
   */
  const getPartnerName = (partner) => {
    if (!partner) return '-'
    return partner.partner_organizers?.[0]?.company_name || 
           partner.partner_agencies?.[0]?.company_name || 
           partner.representative_name
  }

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
   * 파트너 상세 팝업 열기
   */
  const handleOpenPartnerInfo = (partnerId, e) => {
    e?.stopPropagation()
    setSelectedPartnerId(partnerId)
    setPartnerDialogOpen(true)
  }

  /**
   * 세션 상세 페이지로 이동 (파트너 페이지)
   */
  const handleViewSession = (sessionId) => {
    navigate(`/partner/sessions/${sessionId}`)
  }

  /**
   * 상태 배지 렌더링
   */
  const getStatusBadge = (status) => {
    const config = {
      draft: { label: t('session.statusDraft'), className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
      published: { label: t('session.statusPublished'), className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      active: { label: t('session.statusActive'), className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      ended: { label: t('session.statusEnded'), className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      cancelled: { label: t('session.statusCancelled'), className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    }
    const c = config[status] || config.draft
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>
  }

  /**
   * 파트너 타입 배지
   */
  const getPartnerTypeBadge = (type) => {
    const config = {
      organizer: { label: t('partner.typeOrganizer'), className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      agency: { label: t('partner.typeAgency'), className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      instructor: { label: t('partner.typeInstructor'), className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    }
    const c = config[type] || { label: type, className: 'bg-gray-500/10 text-gray-600' }
    return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>
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
    totalParticipants: sessions.reduce((sum, s) => sum + (s.participant_count || 0), 0),
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6 min-w-0">
      {/* 헤더 */}
      <div className="flex flex-col gap-2 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{t('admin.sessionManagement')}</h2>
        <p className="text-sm text-muted-foreground line-clamp-2">{t('admin.sessionManagementDesc')}</p>
      </div>

      <div className="flex-1 overflow-auto space-y-4 sm:space-y-6 min-w-0">
        {/* 통계 카드 - 세로 레이아웃 */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* 전체 */}
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg border bg-card text-center">
            <Video className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mb-1" />
            <span className="text-lg sm:text-2xl font-bold">{stats.total}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('session.total')}</span>
          </div>
          {/* 초안 */}
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg border bg-card text-center">
            <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mb-1" />
            <span className="text-lg sm:text-2xl font-bold text-gray-600">{stats.draft}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('session.statusDraft')}</span>
          </div>
          {/* 공개 */}
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg border bg-card text-center">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mb-1" />
            <span className="text-lg sm:text-2xl font-bold text-blue-600">{stats.published}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('session.statusPublished')}</span>
          </div>
          {/* 진행중 */}
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg border bg-card text-center">
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mb-1" />
            <span className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('session.statusActive')}</span>
          </div>
          {/* 종료됨 */}
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg border bg-card text-center">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mb-1" />
            <span className="text-lg sm:text-2xl font-bold text-purple-600">{stats.ended}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('session.statusEnded')}</span>
          </div>
          {/* 총 참여자 */}
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg border bg-card text-center">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 mb-1" />
            <span className="text-lg sm:text-2xl font-bold text-orange-600">{stats.totalParticipants}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('admin.totalParticipants')}</span>
          </div>
        </div>

        {/* 필터 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.sessionSearchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-4">
                <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px]">
                    <SelectValue placeholder={t('admin.filterByPartner')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.allPartners')}</SelectItem>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] md:w-[160px]">
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
            </div>
          </CardContent>
        </Card>

        {/* 세션 목록 */}
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">{t('admin.sessionList')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t('admin.sessionListDesc', { count: sessions.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mb-4 opacity-20" />
                <p>{t('admin.noSessions')}</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {/* 세션 정보 */}
                      <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                        {/* 제목 및 상태 */}
                        <div className="flex flex-wrap items-start gap-2">
                          {getStatusBadge(session.status)}
                          <h3 className="font-semibold text-sm sm:text-base md:text-lg break-words">{session.title}</h3>
                        </div>
                        
                        {/* 파트너 정보 */}
                        <div 
                          className="flex flex-wrap items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-80"
                          onClick={(e) => handleOpenPartnerInfo(session.partner?.id, e)}
                        >
                          <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-primary hover:underline">
                            {getPartnerName(session.partner)}
                          </span>
                          {session.partner?.partner_type && getPartnerTypeBadge(session.partner.partner_type)}
                          {session.partner?.profile?.email && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              ({session.partner.profile.email})
                            </span>
                          )}
                        </div>
                        
                        {/* 세션 상세 정보 */}
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="font-mono">{session.code}</span>
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 sm:h-6 sm:w-6" 
                                    onClick={() => copyCode(session.code)}
                                  >
                                    <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                                  <p className="font-medium">{t('session.copyCode')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {format(new Date(session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate max-w-[100px] sm:max-w-none">{session.venue_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span>{session.participant_count || 0} / {session.max_participants}</span>
                          </div>
                        </div>
                        
                        {/* 생성일 */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{t('admin.createdAt')}: {format(new Date(session.created_at), 'yyyy.MM.dd HH:mm')}</span>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                          onClick={() => handleViewSession(session.id)}
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                          {t('common.view')}
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
                            <DropdownMenuItem asChild>
                              <a 
                                href={`/join/${session.code}?preview=true`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {t('session.openPreview')}
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleOpenPartnerInfo(session.partner?.id, e)}>
                              <Building2 className="h-4 w-4 mr-2" />
                              {t('admin.viewPartner')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 파트너 상세 팝업 */}
      <PartnerInfoDialog
        partnerId={selectedPartnerId}
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        isAdmin={true}
      />
    </div>
  )
}

