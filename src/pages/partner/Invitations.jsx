import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Loader2, 
  Building2,
  Mic,
  Check,
  X,
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Users
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 파트너: 초대 관리 페이지
 * - 받은 세션 초대 (파트너 초대)
 * - 받은 강사 초대 (강사 파트너용)
 */
export default function Invitations() {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState(null)
  const [partnerDetails, setPartnerDetails] = useState(null)
  const [sessionInvites, setSessionInvites] = useState([])
  const [presenterInvites, setPresenterInvites] = useState([])
  
  // 응답 다이얼로그
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectingInvite, setRejectingInvite] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [responding, setResponding] = useState(false)

  /**
   * 데이터 로드
   */
  const loadData = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // 내 파트너 정보
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, partner_type, representative_name, phone, profile:profiles(email)')
        .eq('profile_id', user.id)
        .single()
      
      if (partnerError) throw partnerError
      setPartner(partnerData)
      
      // 내 파트너 상세 정보 (타입별)
      let details = null
      if (partnerData.partner_type === 'organizer') {
        const { data } = await supabase
          .from('partner_organizers')
          .select('company_name, industry')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      } else if (partnerData.partner_type === 'agency') {
        const { data } = await supabase
          .from('partner_agencies')
          .select('company_name, industry')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      } else if (partnerData.partner_type === 'instructor') {
        const { data } = await supabase
          .from('partner_instructors')
          .select('display_name, specialty')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      }
      setPartnerDetails(details)
      
      // 받은 세션 초대 (파트너 협업)
      const { data: sessionInvitesData, error: sessionError } = await supabase
        .from('session_partners')
        .select(`
          *,
          session:sessions(
            id,
            title,
            code,
            status,
            start_at,
            venue_name,
            max_participants,
            partner_id
          )
        `)
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false })
      
      if (sessionError) throw sessionError
      
      // 세션 소유자 정보 로드
      const invitesWithDetails = await Promise.all(
        (sessionInvitesData || []).map(async (invite) => {
          if (invite.session?.partner_id) {
            // 세션 소유자 파트너 정보 조회
            const { data: ownerPartner } = await supabase
              .from('partners')
              .select('id, partner_type, representative_name, profile:profiles(email)')
              .eq('id', invite.session.partner_id)
              .single()
            
            let ownerDetails = null
            if (ownerPartner) {
              if (ownerPartner.partner_type === 'organizer') {
                const { data } = await supabase
                  .from('partner_organizers')
                  .select('company_name')
                  .eq('partner_id', ownerPartner.id)
                  .single()
                ownerDetails = data
              } else if (ownerPartner.partner_type === 'agency') {
                const { data } = await supabase
                  .from('partner_agencies')
                  .select('company_name')
                  .eq('partner_id', ownerPartner.id)
                  .single()
                ownerDetails = data
              }
            }
            return { 
              ...invite, 
              sessionOwner: ownerPartner,
              ownerDetails 
            }
          }
          return invite
        })
      )
      
      setSessionInvites(invitesWithDetails)
      
      // 받은 강사 초대 (강사 파트너용)
      if (partnerData.partner_type === 'instructor') {
        const { data: presenterData, error: presenterError } = await supabase
          .from('session_presenters')
          .select(`
            *,
            session:sessions(
              id,
              title,
              code,
              status,
              start_at,
              venue_name,
              partner:partners(
                id,
                partner_type,
                representative_name,
                profile:profiles(email)
              )
            )
          `)
          .eq('partner_id', partnerData.id)
          .eq('presenter_type', 'partner')
          .order('created_at', { ascending: false })
        
        if (presenterError) throw presenterError
        setPresenterInvites(presenterData || [])
      }
      
    } catch (error) {
      console.error('Error loading invitations:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  /**
   * 세션 초대 응답
   */
  const handleSessionResponse = async (inviteId, accept) => {
    if (!accept && !rejectReason && showRejectDialog) {
      // 거절 사유 입력 다이얼로그 표시
      return
    }
    
    setResponding(true)
    try {
      const { data, error } = await supabase.rpc('respond_to_session_invite', {
        p_invite_id: inviteId,
        p_accept: accept,
        p_reject_reason: accept ? null : rejectReason
      })
      
      if (error) throw error
      
      if (!data.success) {
        if (data.error === 'invite_not_found') {
          toast.error(t('error.inviteNotFound'))
        } else if (data.error === 'already_responded') {
          toast.error(t('error.alreadyResponded'))
        } else {
          toast.error(t('error.responseFailed'))
        }
        return
      }
      
      toast.success(accept ? t('invitation.accepted') : t('invitation.rejected'))
      setShowRejectDialog(false)
      setRejectingInvite(null)
      setRejectReason('')
      loadData()
    } catch (error) {
      console.error('Error responding to invite:', error)
      toast.error(t('error.responseFailed'))
    } finally {
      setResponding(false)
    }
  }

  /**
   * 강사 초대 응답
   */
  const handlePresenterResponse = async (inviteId, accept) => {
    setResponding(true)
    try {
      const { error } = await supabase
        .from('session_presenters')
        .update({
          status: accept ? 'confirmed' : 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', inviteId)
      
      if (error) throw error
      
      toast.success(accept ? t('invitation.accepted') : t('invitation.rejected'))
      loadData()
    } catch (error) {
      console.error('Error responding to presenter invite:', error)
      toast.error(t('error.responseFailed'))
    } finally {
      setResponding(false)
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      pending: { 
        label: t('session.invitePending'), 
        icon: Clock,
        className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
      },
      accepted: { 
        label: t('session.inviteAccepted'), 
        icon: Check,
        className: 'bg-green-500/10 text-green-500 border-green-500/20' 
      },
      rejected: { 
        label: t('session.inviteRejected'), 
        icon: XCircle,
        className: 'bg-red-500/10 text-red-500 border-red-500/20' 
      },
      confirmed: { 
        label: t('presenter.confirmed'), 
        icon: Check,
        className: 'bg-green-500/10 text-green-500 border-green-500/20' 
      },
    }
    const c = config[status] || config.pending
    const Icon = c.icon
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    )
  }

  /**
   * 파트너 타입 라벨
   */
  const getPartnerTypeLabel = (type) => {
    const labels = {
      organizer: t('partner.typeOrganizer'),
      agency: t('partner.typeAgency'),
      instructor: t('partner.typeInstructor'),
    }
    return labels[type] || type
  }

  /**
   * 거절 다이얼로그 열기
   */
  const openRejectDialog = (invite, type) => {
    setRejectingInvite({ ...invite, type })
    setShowRejectDialog(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('menu.invitations')}</h1>
        <p className="text-muted-foreground">{t('invitation.receivedDesc')}</p>
      </div>

      {/* 내 파트너 정보 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {partner?.partner_type === 'instructor' ? (
                <Mic className="h-6 w-6 text-primary" />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-lg">
                  {partnerDetails?.company_name || partnerDetails?.display_name || partner?.representative_name}
                </span>
                <Badge variant="secondary">
                  {getPartnerTypeLabel(partner?.partner_type)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>{partner?.profile?.email}</span>
                {partner?.phone && <span>• {partner.phone}</span>}
                {(partnerDetails?.industry || partnerDetails?.specialty) && (
                  <span>• {partnerDetails?.industry || partnerDetails?.specialty}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="session" className="space-y-6">
        <TabsList>
          <TabsTrigger value="session">
            <Building2 className="h-4 w-4 mr-2" />
            {t('invitation.received')}
            {sessionInvites.filter(i => i.status === 'pending').length > 0 && (
              <Badge className="ml-2 bg-primary">
                {sessionInvites.filter(i => i.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          {partner?.partner_type === 'instructor' && (
            <TabsTrigger value="presenter">
              <Mic className="h-4 w-4 mr-2" />
              {t('presenterInvite.title')}
              {presenterInvites.filter(i => i.status === 'pending').length > 0 && (
                <Badge className="ml-2 bg-primary">
                  {presenterInvites.filter(i => i.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* 세션 초대 탭 */}
        <TabsContent value="session">
          {sessionInvites.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('invitation.noInvitations')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessionInvites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-4 flex-1">
                        {/* 상태 배지 */}
                        <div>
                          {getStatusBadge(invite.status)}
                        </div>
                        
                        {/* 초대한 파트너 - 항상 표시 */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {invite.ownerDetails?.company_name || invite.sessionOwner?.representative_name || t('common.unknown')}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {getPartnerTypeLabel(invite.sessionOwner?.partner_type) || t('common.unknown')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {t('invitation.from')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* 세션 정보 */}
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            {invite.session?.title || t('common.untitled')}
                          </h3>
                          
                          {/* 세션 상세 */}
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {invite.session?.start_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(invite.session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
                              </div>
                            )}
                            {invite.session?.venue_name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {invite.session.venue_name}
                              </div>
                            )}
                            {invite.session?.max_participants && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {t('session.maxParticipants')}: {invite.session.max_participants}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 초대일 */}
                        <p className="text-xs text-muted-foreground">
                          {t('invitation.invitedAt')}: {format(new Date(invite.invited_at), 'yyyy.MM.dd HH:mm')}
                        </p>
                        
                        {/* 거절 사유 */}
                        {invite.status === 'rejected' && invite.reject_reason && (
                          <p className="text-sm text-red-500">
                            {t('invitation.rejectReason')}: {invite.reject_reason}
                          </p>
                        )}
                      </div>
                      
                      {/* 액션 버튼 */}
                      {invite.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleSessionResponse(invite.id, true)}
                            disabled={responding}
                          >
                            {responding ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            {t('invitation.accept')}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => openRejectDialog(invite, 'session')}
                            disabled={responding}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t('invitation.reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 강사 초대 탭 */}
        {partner?.partner_type === 'instructor' && (
          <TabsContent value="presenter">
            {presenterInvites.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mic className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t('presenterInvite.noInvitations')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {presenterInvites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          {/* 세션 정보 */}
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{invite.session?.title}</h3>
                            {getStatusBadge(invite.status)}
                          </div>
                          
                          {/* 세션 상세 */}
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {invite.session?.start_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(invite.session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
                              </div>
                            )}
                            {invite.session?.venue_name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {invite.session.venue_name}
                              </div>
                            )}
                          </div>
                          
                          {/* 초대일 */}
                          <p className="text-xs text-muted-foreground">
                            {t('invitation.invitedAt')}: {format(new Date(invite.invited_at), 'yyyy.MM.dd HH:mm')}
                          </p>
                        </div>
                        
                        {/* 액션 버튼 */}
                        {invite.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handlePresenterResponse(invite.id, true)}
                              disabled={responding}
                            >
                              {responding ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              {t('invitation.accept')}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handlePresenterResponse(invite.id, false)}
                              disabled={responding}
                            >
                              <X className="h-4 w-4 mr-2" />
                              {t('invitation.reject')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* 거절 사유 입력 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invitation.reject')}</DialogTitle>
            <DialogDescription>
              {t('invitation.rejectReasonDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('invitation.rejectReason')}</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('invitation.rejectReasonPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (rejectingInvite?.type === 'session') {
                  handleSessionResponse(rejectingInvite.id, false)
                } else {
                  handlePresenterResponse(rejectingInvite.id, false)
                }
              }}
              disabled={responding}
            >
              {responding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('invitation.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

