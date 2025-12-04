import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { 
  Users, 
  Search,
  Eye,
  Building2,
  Mic,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react'
import PartnerInfoDialog from '@/components/common/PartnerInfoDialog'

/**
 * 파트너 목록 관리 페이지 (관리자 전용)
 */
export default function Partners() {
  const { t } = useLanguage()
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'organizer', 'agency', 'instructor'
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [searchQuery, setSearchQuery] = useState('')
  
  // 상세 보기 모달
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  
  // 파트너 정보 팝업 (PartnerInfoDialog)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  
  // 비활성화 확인 모달
  const [toggleOpen, setToggleOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  /**
   * 파트너 정보 팝업 열기 (리스트 항목 클릭)
   */
  const handlePartnerInfoClick = (partnerId, e) => {
    e?.stopPropagation()
    setSelectedPartnerId(partnerId)
    setInfoDialogOpen(true)
  }

  useEffect(() => {
    fetchPartners()
  }, [filter, statusFilter])

  /**
   * 파트너 목록 조회
   */
  const fetchPartners = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('partners')
        .select(`
          *,
          profiles:profile_id (email, display_name),
          partner_organizers (*),
          partner_agencies (*),
          partner_instructors (specialty, bio)
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('partner_type', filter)
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      const { data, error } = await query

      if (error) throw error
      
      // 마지막 로그인 시간 조회
      if (data && data.length > 0) {
        const userIds = data.map(p => p.profile_id).filter(Boolean)
        const { data: loginLogsData } = await supabase
          .from('login_logs')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .eq('event_type', 'login_success')
          .order('created_at', { ascending: false })
        
        // 사용자별 마지막 로그인 시간 매핑
        const lastLoginMap = {}
        loginLogsData?.forEach(log => {
          if (!lastLoginMap[log.user_id]) {
            lastLoginMap[log.user_id] = log.created_at
          }
        })
        
        // 파트너에 마지막 로그인 시간 매핑
        data.forEach(p => {
          p.lastLoginAt = lastLoginMap[p.profile_id] || null
        })
      }
      
      setPartners(data || [])
    } catch (error) {
      console.error('Error fetching partners:', error)
      toast.error(t('error.generic'))
    } finally {
      setLoading(false)
    }
  }

  /**
   * 파트너 활성화/비활성화 토글
   */
  const handleToggleActive = async () => {
    if (!selectedPartner) return
    
    setProcessing(true)
    try {
      const newStatus = !selectedPartner.is_active

      // 1. partners 테이블 업데이트
      const { error: partnerError } = await supabase
        .from('partners')
        .update({ is_active: newStatus })
        .eq('id', selectedPartner.id)

      if (partnerError) throw partnerError

      // 2. 비활성화 시 profiles의 user_type도 변경
      if (!newStatus) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ user_type: 'user' })
          .eq('id', selectedPartner.profile_id)

        if (profileError) throw profileError
      } else {
        // 활성화 시 다시 partner로 변경
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ user_type: 'partner' })
          .eq('id', selectedPartner.profile_id)

        if (profileError) throw profileError
      }

      toast.success(newStatus ? t('partner.activated') : t('partner.deactivated'))
      setToggleOpen(false)
      setDetailOpen(false)
      fetchPartners()
    } catch (error) {
      console.error('Error toggling partner status:', error)
      toast.error(t('error.generic'))
    } finally {
      setProcessing(false)
    }
  }

  /**
   * 마지막 로그인 시간 포맷팅
   */
  const formatLastLogin = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return t('team.justNow')
    if (diffMins < 60) return t('team.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('team.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('team.daysAgo', { count: diffDays })
    return format(date, 'yyyy-MM-dd')
  }

  /**
   * 필터링된 파트너 목록
   */
  const filteredPartners = partners.filter(partner => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      partner.representative_name?.toLowerCase().includes(query) ||
      partner.profiles?.email?.toLowerCase().includes(query) ||
      partner.profiles?.display_name?.toLowerCase().includes(query) ||
      partner.partner_organizers?.[0]?.company_name?.toLowerCase().includes(query) ||
      partner.partner_agencies?.[0]?.company_name?.toLowerCase().includes(query) ||
      partner.phone?.includes(query)
    )
  })

  /**
   * 통계 계산
   */
  const stats = {
    total: partners.length,
    organizer: partners.filter(p => p.partner_type === 'organizer').length,
    agency: partners.filter(p => p.partner_type === 'agency').length,
    instructor: partners.filter(p => p.partner_type === 'instructor').length,
    active: partners.filter(p => p.is_active).length,
    inactive: partners.filter(p => !p.is_active).length
  }

  /**
   * 파트너 타입별 스타일
   */
  const getPartnerTypeStyle = (type) => {
    switch (type) {
      case 'organizer':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
      case 'agency':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
      case 'instructor':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getPartnerTypeLabel = (type) => {
    switch (type) {
      case 'organizer': return t('partner.typeOrganizer')
      case 'agency': return t('partner.typeAgency')
      case 'instructor': return t('partner.typeInstructor')
      default: return type
    }
  }

  const getPartnerTypeIcon = (type) => {
    switch (type) {
      case 'organizer': return Building2
      case 'agency': return Users
      case 'instructor': return Mic
      default: return Users
    }
  }

  /**
   * 파트너 상세 정보 가져오기
   */
  const getPartnerDetails = (partner) => {
    if (partner.partner_type === 'organizer' && partner.partner_organizers?.[0]) {
      return partner.partner_organizers[0]
    } else if (partner.partner_type === 'agency' && partner.partner_agencies?.[0]) {
      return partner.partner_agencies[0]
    } else if (partner.partner_type === 'instructor' && partner.partner_instructors?.[0]) {
      return partner.partner_instructors[0]
    }
    return null
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin.partnerList')}</h2>
          <p className="text-muted-foreground mt-1">{t('admin.partnerListDesc')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card 
            className={`cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilter('all')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('common.all')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === 'organizer' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter('organizer')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('partner.typeOrganizer')}</p>
                <p className="text-2xl font-bold">{stats.organizer}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === 'agency' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setFilter('agency')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('partner.typeAgency')}</p>
                <p className="text-2xl font-bold">{stats.agency}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === 'instructor' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setFilter('instructor')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Mic className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('partner.typeInstructor')}</p>
                <p className="text-2xl font-bold">{stats.instructor}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & List */}
        <Card className="flex-1">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle>{t('admin.partnerList')}</CardTitle>
                  <CardDescription>
                    {filteredPartners.length} {t('admin.partnersCount')}
                  </CardDescription>
                </div>
                {/* 상태 필터 */}
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    {t('common.all')}
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('partner.active')} ({stats.active})
                  </Button>
                  <Button
                    variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('inactive')}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    {t('partner.inactive')} ({stats.inactive})
                  </Button>
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t('admin.noPartners')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPartners.map((partner) => {
                  const TypeIcon = getPartnerTypeIcon(partner.partner_type)
                  const details = getPartnerDetails(partner)
                  return (
                    <div
                      key={partner.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        partner.is_active 
                          ? 'hover:bg-muted/50' 
                          : 'bg-muted/30 opacity-70'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span 
                            className="font-medium truncate text-primary hover:underline cursor-pointer"
                            onClick={(e) => handlePartnerInfoClick(partner.id, e)}
                          >
                            {partner.representative_name}
                          </span>
                          <Badge variant="outline" className={getPartnerTypeStyle(partner.partner_type)}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {getPartnerTypeLabel(partner.partner_type)}
                          </Badge>
                          {!partner.is_active && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                              {t('partner.inactive')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span 
                            className="text-primary hover:underline cursor-pointer"
                            onClick={(e) => handlePartnerInfoClick(partner.id, e)}
                          >
                            {partner.profiles?.email}
                          </span>
                          {details?.company_name && (
                            <span 
                              className="cursor-pointer hover:text-primary"
                              onClick={(e) => handlePartnerInfoClick(partner.id, e)}
                            >
                              · {details.company_name}
                            </span>
                          )}
                          {details?.display_name && <span>· {details.display_name}</span>}
                          <span>· {format(new Date(partner.created_at), 'yyyy-MM-dd')}</span>
                          <span>· {t('team.lastLogin')}: {partner.lastLoginAt ? formatLastLogin(partner.lastLoginAt) : '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handlePartnerInfoClick(partner.id, e)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('common.view')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPartner(partner)
                            setDetailOpen(true)
                          }}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {t('common.manage')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 상세 보기 모달 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.partnerDetail')}</DialogTitle>
            <DialogDescription>
              {t('admin.partnerDetailDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPartner && (
            <div className="space-y-4">
              {/* 파트너 타입 및 상태 */}
              <div className="flex items-center gap-2">
                {(() => {
                  const TypeIcon = getPartnerTypeIcon(selectedPartner.partner_type)
                  return (
                    <Badge variant="outline" className={`${getPartnerTypeStyle(selectedPartner.partner_type)} text-sm py-1`}>
                      <TypeIcon className="h-4 w-4 mr-1" />
                      {getPartnerTypeLabel(selectedPartner.partner_type)}
                    </Badge>
                  )
                })()}
                <Badge variant="outline" className={selectedPartner.is_active 
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                }>
                  {selectedPartner.is_active ? t('partner.active') : t('partner.inactive')}
                </Badge>
              </div>

              {/* 공통 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('partner.name')}</p>
                  <p className="font-medium">{selectedPartner.representative_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('auth.email')}</p>
                  <p className="font-medium">{selectedPartner.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('partner.phone')}</p>
                  <p className="font-medium">{selectedPartner.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.registeredDate')}</p>
                  <p className="font-medium">
                    {format(new Date(selectedPartner.created_at), 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              </div>

              {/* 행사자 전용 정보 */}
              {selectedPartner.partner_type === 'organizer' && selectedPartner.partner_organizers?.[0] && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.companyOrOrg')}</p>
                    <p className="font-medium">{selectedPartner.partner_organizers[0].company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.businessNumber')}</p>
                    <p className="font-medium">{selectedPartner.partner_organizers[0].business_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.industry')}</p>
                    <p className="font-medium">{selectedPartner.partner_organizers[0].industry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.expectedScale')}</p>
                    <p className="font-medium">{selectedPartner.partner_organizers[0].expected_scale || '-'}</p>
                  </div>
                </div>
              )}

              {/* 대행업체 전용 정보 */}
              {selectedPartner.partner_type === 'agency' && selectedPartner.partner_agencies?.[0] && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.companyName')}</p>
                    <p className="font-medium">{selectedPartner.partner_agencies[0].company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.businessNumber')}</p>
                    <p className="font-medium">{selectedPartner.partner_agencies[0].business_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.industry')}</p>
                    <p className="font-medium">{selectedPartner.partner_agencies[0].industry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.expectedScale')}</p>
                    <p className="font-medium">{selectedPartner.partner_agencies[0].expected_scale || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{t('partner.clientType')}</p>
                    <p className="font-medium">{selectedPartner.partner_agencies[0].client_type || '-'}</p>
                  </div>
                </div>
              )}

              {/* 강사 전용 정보 */}
              {selectedPartner.partner_type === 'instructor' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('partner.displayName')}</p>
                      <p className="font-medium">{selectedPartner.profiles?.display_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('partner.specialty')}</p>
                      <p className="font-medium">{selectedPartner.partner_instructors?.[0]?.specialty || '-'}</p>
                    </div>
                  </div>
                  {selectedPartner.partner_instructors?.[0]?.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('partner.bio')}</p>
                      <p className="p-3 rounded-lg bg-muted/50 text-sm">{selectedPartner.partner_instructors[0].bio}</p>
                    </div>
                  )}
                </div>
              )}
              
              {selectedPartner.purpose && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('partner.purpose')}</p>
                  <p className="p-3 rounded-lg bg-muted/50 text-sm">{selectedPartner.purpose}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t('common.close')}
            </Button>
            <Button
              variant={selectedPartner?.is_active ? 'destructive' : 'default'}
              onClick={() => setToggleOpen(true)}
            >
              {selectedPartner?.is_active ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  {t('partner.deactivate')}
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  {t('partner.activate')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 활성화/비활성화 확인 모달 */}
      <AlertDialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedPartner?.is_active ? t('partner.deactivateConfirm') : t('partner.activateConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPartner?.is_active 
                ? t('partner.deactivateDesc')
                : t('partner.activateDesc')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={processing}
              className={selectedPartner?.is_active ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processing ? t('common.processing') : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 파트너 정보 팝업 (PartnerInfoDialog) */}
      <PartnerInfoDialog
        partnerId={selectedPartnerId}
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </div>
  )
}

