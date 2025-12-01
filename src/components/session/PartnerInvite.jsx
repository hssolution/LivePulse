import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { 
  Loader2, 
  Search, 
  UserPlus, 
  Building2, 
  X,
  Check,
  Clock,
  XCircle
} from 'lucide-react'

/**
 * 세션에 파트너 초대 컴포넌트
 * - 행사자(organizer)는 대행업체(agency)만 초대 가능
 * - 대행업체(agency)는 행사자(organizer)만 초대 가능
 * - 강사(instructor)는 초대 불가
 * - 세션당 1개의 파트너만 초대 가능
 */
export default function PartnerInvite({ sessionId, partnerId, partnerType, onUpdate }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [invitedPartner, setInvitedPartner] = useState(null)
  
  // 초대 다이얼로그
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState(false)
  
  // 취소 다이얼로그
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [canceling, setCanceling] = useState(false)

  /**
   * 초대된 파트너 로드
   */
  const loadInvitedPartner = async () => {
    if (!sessionId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('session_partners')
        .select(`
          *,
          partner:partners(
            id,
            partner_type,
            representative_name,
            phone,
            profile:profiles(email)
          )
        `)
        .eq('session_id', sessionId)
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        // 파트너 타입별 상세 정보 로드
        let partnerDetails = null
        if (data.partner?.partner_type === 'organizer') {
          const { data: orgData } = await supabase
            .from('partner_organizers')
            .select('company_name')
            .eq('partner_id', data.partner.id)
            .single()
          partnerDetails = orgData
        } else if (data.partner?.partner_type === 'agency') {
          const { data: agencyData } = await supabase
            .from('partner_agencies')
            .select('company_name')
            .eq('partner_id', data.partner.id)
            .single()
          partnerDetails = agencyData
        }
        
        setInvitedPartner({
          ...data,
          partnerDetails
        })
      } else {
        setInvitedPartner(null)
      }
    } catch (error) {
      console.error('Error loading invited partner:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvitedPartner()
  }, [sessionId])

  /**
   * 파트너 검색
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      // 초대 가능한 파트너 타입 결정
      const targetType = partnerType === 'organizer' ? 'agency' : 'organizer'
      
      // 파트너 검색
      const { data: partners, error } = await supabase
        .from('partners')
        .select(`
          id,
          partner_type,
          representative_name,
          phone,
          is_active,
          profile:profiles(email)
        `)
        .eq('partner_type', targetType)
        .eq('is_active', true)
        .neq('id', partnerId) // 자기 자신 제외
      
      if (error) throw error
      
      // 타입별 상세 정보 로드 및 검색 필터링
      const resultsWithDetails = await Promise.all(
        partners.map(async (partner) => {
          let details = null
          if (partner.partner_type === 'organizer') {
            const { data } = await supabase
              .from('partner_organizers')
              .select('company_name')
              .eq('partner_id', partner.id)
              .single()
            details = data
          } else if (partner.partner_type === 'agency') {
            const { data } = await supabase
              .from('partner_agencies')
              .select('company_name')
              .eq('partner_id', partner.id)
              .single()
            details = data
          }
          return { ...partner, details }
        })
      )
      
      // 검색어로 필터링
      const query = searchQuery.toLowerCase()
      const filtered = resultsWithDetails.filter(p => 
        p.details?.company_name?.toLowerCase().includes(query) ||
        p.representative_name?.toLowerCase().includes(query) ||
        p.profile?.email?.toLowerCase().includes(query)
      )
      
      setSearchResults(filtered)
    } catch (error) {
      console.error('Error searching partners:', error)
      toast.error(t('error.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  /**
   * 파트너 초대
   */
  const handleInvite = async (targetPartnerId) => {
    setInviting(true)
    try {
      const { data, error } = await supabase.rpc('invite_partner_to_session', {
        p_session_id: sessionId,
        p_partner_id: targetPartnerId
      })
      
      if (error) throw error
      
      if (!data.success) {
        if (data.error === 'already_has_partner') {
          toast.error(t('error.alreadyHasPartner'))
        } else if (data.error === 'incompatible_partner_type') {
          toast.error(t('error.incompatiblePartnerType'))
        } else {
          toast.error(t('error.inviteFailed'))
        }
        return
      }
      
      toast.success(t('session.partnerInvited'))
      setShowInviteDialog(false)
      setSearchQuery('')
      setSearchResults([])
      loadInvitedPartner()
      onUpdate?.()
    } catch (error) {
      console.error('Error inviting partner:', error)
      toast.error(t('error.inviteFailed'))
    } finally {
      setInviting(false)
    }
  }

  /**
   * 초대 취소
   */
  const handleCancelInvite = async () => {
    setCanceling(true)
    try {
      const { error } = await supabase
        .from('session_partners')
        .delete()
        .eq('session_id', sessionId)
      
      if (error) throw error
      
      toast.success(t('session.inviteCanceled'))
      setShowCancelDialog(false)
      setInvitedPartner(null)
      onUpdate?.()
    } catch (error) {
      console.error('Error canceling invite:', error)
      toast.error(t('error.cancelFailed'))
    } finally {
      setCanceling(false)
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

  // 강사는 파트너 초대 불가
  if (partnerType === 'instructor') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('session.invitePartner')}</CardTitle>
          <CardDescription>{t('session.invitePartnerDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t('session.instructorCannotInvite')}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('session.invitePartner')}</CardTitle>
          <CardDescription>{t('session.invitePartnerDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invitedPartner ? (
            // 초대된 파트너 정보 표시
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {invitedPartner.partnerDetails?.company_name || invitedPartner.partner?.representative_name}
                      </span>
                      {getStatusBadge(invitedPartner.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getPartnerTypeLabel(invitedPartner.partner?.partner_type)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invitedPartner.partner?.representative_name} · {invitedPartner.partner?.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invitedPartner.partner?.profile?.email}
                    </p>
                    {invitedPartner.reject_reason && (
                      <p className="text-sm text-red-500 mt-2">
                        {t('invitation.rejectReason')}: {invitedPartner.reject_reason}
                      </p>
                    )}
                  </div>
                </div>
                
                {invitedPartner.status !== 'accepted' && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {t('session.onlyOnePartner')}
              </p>
            </div>
          ) : (
            // 초대 버튼
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('session.noPartnerInvited')}
              </p>
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('session.invitePartner')}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                {partnerType === 'organizer' 
                  ? t('session.canInviteAgency')
                  : t('session.canInviteOrganizer')
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 파트너 초대 다이얼로그 */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('session.selectPartner')}</DialogTitle>
            <DialogDescription>
              {partnerType === 'organizer' 
                ? t('session.searchAgencyDesc')
                : t('session.searchOrganizerDesc')
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 검색 입력 */}
            <div className="flex gap-2">
              <Input
                placeholder={t('session.searchPartnerPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* 검색 결과 */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? t('session.noPartnersFound') : t('session.searchToFind')}
                </p>
              ) : (
                searchResults.map((partner) => (
                  <div 
                    key={partner.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">
                        {partner.details?.company_name || partner.representative_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {partner.representative_name} · {partner.profile?.email}
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleInvite(partner.id)}
                      disabled={inviting}
                    >
                      {inviting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          {t('common.invite')}
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 초대 취소 확인 다이얼로그 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('session.cancelInvite')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('session.cancelInviteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelInvite}
              disabled={canceling}
              className="bg-red-600 hover:bg-red-700"
            >
              {canceling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('session.cancelInvite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

