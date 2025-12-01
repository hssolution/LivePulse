import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  Eye,
  UserCheck,
  UserX,
  Building2,
  Mic
} from 'lucide-react'

/**
 * 파트너 신청 관리 페이지 (관리자 전용)
 */
export default function PartnerRequests() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('')
  
  // 상세 보기 모달
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  
  // 거부 사유 모달
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [filter])

  /**
   * 파트너 신청 목록 조회
   */
  const fetchRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('partner_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      // 각 신청의 user_id로 프로필 이메일 조회
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)

        const profileMap = {}
        profiles?.forEach(p => {
          profileMap[p.id] = p.email
        })

        // 각 request에 email 추가
        data.forEach(r => {
          r.email = profileMap[r.user_id] || ''
        })
      }

      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error(t('error.generic'))
    } finally {
      setLoading(false)
    }
  }

  /**
   * 파트너 신청 승인
   */
  const handleApprove = async (request) => {
    setProcessing(true)
    try {
      // 1. 신청 상태 업데이트
      const { error: requestError } = await supabase
        .from('partner_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id)

      if (requestError) throw requestError

      // 2. 프로필 user_type을 partner로 변경 (강연자는 display_name도 저장)
      const profileUpdate = { user_type: 'partner' }
      if (request.partner_type === 'instructor' && request.display_name) {
        profileUpdate.display_name = request.display_name
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', request.user_id)

      if (profileError) throw profileError

      // 3. partners 테이블에 공통 정보 추가
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .insert({
          profile_id: request.user_id,
          partner_type: request.partner_type,
          representative_name: request.representative_name,
          phone: request.phone,
          purpose: request.purpose
        })
        .select()
        .single()

      if (partnerError) throw partnerError

      // 4. 타입별 테이블에 추가 정보 저장
      if (request.partner_type === 'organizer') {
        const { error: orgError } = await supabase
          .from('partner_organizers')
          .insert({
            partner_id: partnerData.id,
            company_name: request.company_name,
            business_number: request.business_number,
            industry: request.industry,
            expected_scale: request.expected_scale
          })
        if (orgError) throw orgError
      } else if (request.partner_type === 'agency') {
        const { error: agencyError } = await supabase
          .from('partner_agencies')
          .insert({
            partner_id: partnerData.id,
            company_name: request.company_name,
            business_number: request.business_number,
            industry: request.industry,
            client_type: request.client_type,
            expected_scale: request.expected_scale
          })
        if (agencyError) throw agencyError
      } else if (request.partner_type === 'instructor') {
        const { error: instructorError } = await supabase
          .from('partner_instructors')
          .insert({
            partner_id: partnerData.id,
            display_name: request.display_name,
            specialty: request.specialty,
            bio: request.bio
          })
        if (instructorError) throw instructorError
      }

      toast.success(t('partner.applySuccess'))
      setDetailOpen(false)
      fetchRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error(t('error.generic'))
    } finally {
      setProcessing(false)
    }
  }

  /**
   * 파트너 신청 거부
   */
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t('admin.rejectReasonPlaceholder'))
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reject_reason: rejectReason
        })
        .eq('id', selectedRequest.id)

      if (error) throw error

      toast.success(t('admin.reject'))
      setRejectOpen(false)
      setDetailOpen(false)
      setRejectReason('')
      fetchRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error(t('error.generic'))
    } finally {
      setProcessing(false)
    }
  }

  /**
   * 필터링된 신청 목록
   */
  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      req.representative_name?.toLowerCase().includes(query) ||
      req.email?.toLowerCase().includes(query) ||
      req.company_name?.toLowerCase().includes(query) ||
      req.phone?.includes(query)
    )
  })

  /**
   * 통계 계산
   */
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }

  /**
   * 상태별 스타일
   */
  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
      case 'approved':
        return 'bg-green-500/10 text-green-600 dark:text-green-400'
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:text-red-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return t('admin.pendingRequests')
      case 'approved': return t('admin.approvedRequests')
      case 'rejected': return t('admin.rejectedRequests')
      default: return status
    }
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

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin.partnerRequestsTitle')}</h2>
          <p className="text-muted-foreground mt-1">{t('admin.partnerRequestsDesc')}</p>
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
            className={`cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.pendingRequests')}</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setFilter('approved')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.approvedRequests')}</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.rejectedRequests')}</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & List */}
        <Card className="flex-1">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{t('admin.partnerRequests')}</CardTitle>
                <CardDescription>
                  {filter === 'all' ? t('common.all') : getStatusLabel(filter)} {filteredRequests.length}
                </CardDescription>
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
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t('admin.noRequests')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => {
                  const TypeIcon = getPartnerTypeIcon(request.partner_type)
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium truncate">{request.representative_name}</p>
                          <Badge variant="outline" className={getPartnerTypeStyle(request.partner_type)}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {getPartnerTypeLabel(request.partner_type)}
                          </Badge>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{request.email}</span>
                          {request.company_name && <span>· {request.company_name}</span>}
                          {request.display_name && <span>· {request.display_name}</span>}
                          <span>· {format(new Date(request.created_at), 'yyyy-MM-dd HH:mm')}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('admin.viewAll')}
                      </Button>
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
            <DialogTitle>{t('admin.partnerRequests')}</DialogTitle>
            <DialogDescription>
              {t('admin.partnerRequestsDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              {/* 파트너 타입 */}
              <div className="flex items-center gap-2">
                {(() => {
                  const TypeIcon = getPartnerTypeIcon(selectedRequest.partner_type)
                  return (
                    <Badge variant="outline" className={`${getPartnerTypeStyle(selectedRequest.partner_type)} text-sm py-1`}>
                      <TypeIcon className="h-4 w-4 mr-1" />
                      {getPartnerTypeLabel(selectedRequest.partner_type)}
                    </Badge>
                  )
                })()}
                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(selectedRequest.status)}`}>
                  {getStatusLabel(selectedRequest.status)}
                </span>
              </div>

              {/* 공통 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('partner.name')}</p>
                  <p className="font-medium">{selectedRequest.representative_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('auth.email')}</p>
                  <p className="font-medium">{selectedRequest?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('partner.phone')}</p>
                  <p className="font-medium">{selectedRequest.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.requestDate')}</p>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              </div>

              {/* 행사자/대행업체 전용 정보 */}
              {(selectedRequest.partner_type === 'organizer' || selectedRequest.partner_type === 'agency') && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.companyName')}</p>
                    <p className="font-medium">{selectedRequest.company_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.businessNumber')}</p>
                    <p className="font-medium">{selectedRequest.business_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.industry')}</p>
                    <p className="font-medium">{selectedRequest.industry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('partner.expectedScale')}</p>
                    <p className="font-medium">{selectedRequest.expected_scale || '-'}</p>
                  </div>
                  {selectedRequest.partner_type === 'agency' && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">{t('partner.clientType')}</p>
                      <p className="font-medium">{selectedRequest.client_type || '-'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 강사 전용 정보 */}
              {selectedRequest.partner_type === 'instructor' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('partner.displayName')}</p>
                      <p className="font-medium">{selectedRequest.display_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('partner.specialty')}</p>
                      <p className="font-medium">{selectedRequest.specialty || '-'}</p>
                    </div>
                  </div>
                  {selectedRequest.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('partner.bio')}</p>
                      <p className="p-3 rounded-lg bg-muted/50 text-sm">{selectedRequest.bio}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('partner.purpose')}</p>
                <p className="p-3 rounded-lg bg-muted/50 text-sm">{selectedRequest.purpose}</p>
              </div>

              {selectedRequest.status === 'rejected' && selectedRequest.reject_reason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('admin.rejectReason')}</p>
                  <p className="p-3 rounded-lg bg-red-500/10 text-sm text-red-600">
                    {selectedRequest.reject_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={processing}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  {t('admin.reject')}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {processing ? t('common.processing') : t('admin.approve')}
                </Button>
              </>
            )}
            {selectedRequest?.status !== 'pending' && (
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                {t('common.close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거부 사유 모달 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.rejectConfirm')}</DialogTitle>
            <DialogDescription>
              {t('admin.rejectReasonPlaceholder')}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder={t('admin.rejectReasonPlaceholder')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
            >
              {processing ? t('common.processing') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
