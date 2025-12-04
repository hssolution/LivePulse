import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Zap, 
  ArrowLeft, 
  LogOut,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Building2,
  Users,
  Mic
} from 'lucide-react'

/**
 * 마이페이지 (일반 회원용)
 * - 내 정보 확인
 * - 파트너 신청 (팝업)
 * - 신청 상태 확인
 * - 언어팩 적용됨
 */
export default function MyPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  const [partnerRequest, setPartnerRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isPartnerInDB, setIsPartnerInDB] = useState(false) // DB에서 직접 확인한 파트너 여부
  
  // 팀원 초대 내역
  const [pendingInvites, setPendingInvites] = useState([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [processingInvite, setProcessingInvite] = useState(null) // 처리 중인 초대 ID
  
  // 파트너 신청 팝업
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  
  // 파트너 신청 폼
  const [formData, setFormData] = useState({
    partnerType: 'organizer',  // 'organizer' | 'agency' | 'instructor'
    representativeName: '',
    phone: '',
    purpose: '',
    // 행사자/대행업체 공통
    companyName: '',
    businessNumber: '',
    industry: '',
    expectedScale: '',
    // 대행업체 전용
    clientType: '',
    // 강사 전용
    displayName: '',
    specialty: '',
    bio: ''
  })
  
  // 폼 에러
  const [formErrors, setFormErrors] = useState({})

  /**
   * 전화번호 포맷팅 (자동 하이픈 추가)
   */
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/[^\d]/g, '')
    
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  /**
   * 전화번호 유효성 검사
   */
  const validatePhone = (phone) => {
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/
    return phoneRegex.test(phone)
  }

  /**
   * 전화번호 중복 체크
   */
  const checkPhoneDuplicate = async (phone) => {
    try {
      const { data, error } = await supabase
        .from('partner_requests')
        .select('id')
        .eq('phone', phone)
        .neq('user_id', user.id) // 본인 제외
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking phone duplicate:', error)
      return false
    }
  }

  /**
   * 폼 유효성 검사
   */
  const validateForm = async () => {
    const errors = {}
    
    // 공통 필수값
    if (!formData.representativeName.trim()) {
      errors.representativeName = t('mypage.nameRequired')
    }
    
    if (!formData.phone.trim()) {
      errors.phone = t('mypage.phoneRequired')
    } else if (!validatePhone(formData.phone)) {
      errors.phone = t('mypage.phoneInvalid')
    } else {
      // 전화번호 중복 체크
      const isDuplicate = await checkPhoneDuplicate(formData.phone)
      if (isDuplicate) {
        errors.phone = t('mypage.phoneDuplicate')
      }
    }
    
    if (!formData.purpose.trim()) {
      errors.purpose = t('mypage.purposeRequired')
    } else if (formData.purpose.trim().length < 10) {
      errors.purpose = t('mypage.purposeMinLength')
    }
    
    // 타입별 필수값
    if (formData.partnerType === 'organizer') {
      if (!formData.companyName.trim()) {
        errors.companyName = t('mypage.companyRequired')
      }
    } else if (formData.partnerType === 'agency') {
      if (!formData.companyName.trim()) {
        errors.companyName = t('mypage.companyRequired')
      }
      if (!formData.businessNumber.trim()) {
        errors.businessNumber = t('mypage.businessNumberRequired')
      }
    } else if (formData.partnerType === 'instructor') {
      // 강사는 활동명 필수
      if (!formData.displayName.trim()) {
        errors.displayName = t('mypage.displayNameRequired')
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
    
    if (user) {
      fetchPartnerRequest()
      fetchPendingInvites()
    }
  }, [user, authLoading, navigate])

  /**
   * 대기 중인 팀원 초대 내역 조회
   */
  const fetchPendingInvites = async () => {
    if (!user?.email) return
    
    setLoadingInvites(true)
    try {
      // RPC 함수로 초대 정보 조회 (파트너 정보 포함)
      const { data, error } = await supabase
        .from('partner_members')
        .select(`
          id,
          email,
          role,
          invite_token,
          invited_at,
          partner_id,
          partners (
            id,
            partner_type,
            representative_name,
            partner_organizers (company_name),
            partner_agencies (company_name)
          )
        `)
        .eq('email', user.email)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })
      
      if (error) throw error
      setPendingInvites(data || [])
    } catch (error) {
      console.error('Error fetching pending invites:', error)
    } finally {
      setLoadingInvites(false)
    }
  }

  /**
   * 초대 수락
   */
  const handleAcceptInvite = async (inviteToken) => {
    setProcessingInvite(inviteToken)
    try {
      const { data, error } = await supabase
        .rpc('accept_partner_invite', { p_token: inviteToken })
      
      if (error) throw error
      
      if (data.success) {
        toast.success(t('invite.acceptedSuccess'))
        fetchPendingInvites()
        await refreshProfile()
      } else {
        toast.error(t(`invite.error.${data.error}`) || t('error.generic'))
      }
    } catch (error) {
      console.error('Error accepting invite:', error)
      toast.error(t('error.generic'))
    } finally {
      setProcessingInvite(null)
    }
  }

  /**
   * 초대 거절
   */
  const handleDeclineInvite = async (inviteId) => {
    setProcessingInvite(inviteId)
    try {
      const { error } = await supabase
        .from('partner_members')
        .update({ status: 'rejected' })
        .eq('id', inviteId)
      
      if (error) throw error
      
      toast.success(t('invite.declinedSuccess'))
      fetchPendingInvites()
    } catch (error) {
      console.error('Error declining invite:', error)
      toast.error(t('error.generic'))
    } finally {
      setProcessingInvite(null)
    }
  }

  /**
   * 파트너 이름 가져오기
   */
  const getPartnerDisplayName = (invite) => {
    const partner = invite.partners
    if (!partner) return t('common.unknown')
    
    if (partner.partner_type === 'organizer' && partner.partner_organizers?.[0]?.company_name) {
      return partner.partner_organizers[0].company_name
    }
    if (partner.partner_type === 'agency' && partner.partner_agencies?.[0]?.company_name) {
      return partner.partner_agencies[0].company_name
    }
    return partner.representative_name || t('common.unknown')
  }

  /**
   * 파트너 신청 내역 조회
   * 승인된 경우 세션을 갱신하여 최신 JWT를 가져옴
   */
  const [refreshAttempted, setRefreshAttempted] = useState(false)
  
  const fetchPartnerRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      setPartnerRequest(data)
      
      // 승인된 경우 DB에서 직접 user_type 확인
      if (data?.status === 'approved') {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()
        
        if (profileData?.user_type === 'partner') {
          setIsPartnerInDB(true)
          
          // JWT가 아직 업데이트되지 않은 경우 세션 갱신 시도 (1회만)
          if (profile?.userType !== 'partner' && !refreshAttempted) {
            console.log('Partner approved, refreshing session...')
            setRefreshAttempted(true)
            await refreshProfile()
          }
        }
      }
    } catch (error) {
      console.error('Error fetching partner request:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 파트너 신청 제출
   */
  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    // 유효성 검사 (비동기 - 중복 체크 포함)
    const isValid = await validateForm()
    if (!isValid) {
      setSubmitting(false)
      return
    }

    try {
      // 타입별 데이터 구성
      const requestData = {
        user_id: user.id,
        partner_type: formData.partnerType,
        representative_name: formData.representativeName.trim(),
        phone: formData.phone,
        purpose: formData.purpose.trim(),
      }

      // 행사자/대행업체 공통
      if (formData.partnerType === 'organizer' || formData.partnerType === 'agency') {
        requestData.company_name = formData.companyName.trim() || null
        requestData.business_number = formData.businessNumber.trim() || null
        requestData.industry = formData.industry.trim() || null
        requestData.expected_scale = formData.expectedScale.trim() || null
      }

      // 대행업체 전용
      if (formData.partnerType === 'agency') {
        requestData.client_type = formData.clientType.trim() || null
      }

      // 강사 전용
      if (formData.partnerType === 'instructor') {
        requestData.display_name = formData.displayName.trim() || null
        requestData.specialty = formData.specialty.trim() || null
        requestData.bio = formData.bio.trim() || null
      }

      const { error } = await supabase
        .from('partner_requests')
        .insert(requestData)

      if (error) throw error

      toast.success(t('mypage.applySuccess'))
      setRequestDialogOpen(false)
      fetchPartnerRequest()
      setFormData({
        partnerType: 'organizer',
        representativeName: '',
        phone: '',
        purpose: '',
        companyName: '',
        businessNumber: '',
        industry: '',
        expectedScale: '',
        clientType: '',
        displayName: '',
        specialty: '',
        bio: ''
      })
      setFormErrors({})
    } catch (error) {
      console.error('Error submitting partner request:', error)
      toast.error(t('mypage.applyError'))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 로그아웃
   */
  const handleLogout = async () => {
    try {
      // 먼저 로컬 스토리지 정리
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
      
      // Supabase 로그아웃
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.warn('Logout error (ignored):', error)
    }
    // 에러가 나도 홈으로 이동 (window.location으로 강제 새로고침)
    window.location.href = '/'
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // 관리자인 경우 관리자 페이지로 리다이렉트
  if (profile?.role === 'admin') {
    navigate('/adm')
    return null
  }
  
  // 파트너인 경우에도 마이페이지 접근 허용 (파트너 센터 버튼 표시)

  /**
   * 신청 상태에 따른 UI 렌더링
   */
  const renderRequestStatus = () => {
    if (!partnerRequest) return null

    const statusConfig = {
      pending: {
        icon: Clock,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        label: t('mypage.pendingReview'),
        description: t('mypage.pendingReviewDesc')
      },
      approved: {
        icon: CheckCircle,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        label: t('partner.statusApproved'),
        description: t('mypage.approvedDesc'),
        // DB에서 직접 확인한 파트너 여부 또는 JWT의 userType으로 버튼 표시
        showPartnerButton: isPartnerInDB || profile?.userType === 'partner'
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: t('partner.statusRejected'),
        description: partnerRequest.reject_reason || t('mypage.rejectedDesc')
      }
    }

    const config = statusConfig[partnerRequest.status]
    const Icon = config.icon

    return (
      <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${config.color} mt-0.5`} />
          <div className="flex-1">
            <h4 className={`font-medium ${config.color}`}>{t('mypage.applyPartner')} {config.label}</h4>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('mypage.requestDate')}: {new Date(partnerRequest.created_at).toLocaleDateString('ko-KR')}
            </p>
            {config.showPartnerButton && (
              <Link to="/partner">
                <Button className="mt-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                  {t('nav.partnerCenter')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 파트너 신청 가능 여부
  const canApplyPartner = !partnerRequest || partnerRequest.status === 'rejected'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold">LivePulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToHome')}
        </Link>

        <h1 className="text-3xl font-bold mb-8">{t('mypage.title')}</h1>

        <div className="space-y-6">
          {/* 내 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('mypage.myInfo')}
              </CardTitle>
              <CardDescription>{t('mypage.myInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('mypage.email')}</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('mypage.memberType')}</p>
                    <p className="font-medium">
                      {profile?.userType === 'partner' ? t('partner.partner') : t('mypage.generalMember')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('mypage.joinDate')}</p>
                    <p className="font-medium">
                      {user?.created_at 
                        ? new Date(user.created_at).toLocaleDateString('ko-KR') 
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 파트너 신청 상태 */}
              {partnerRequest && renderRequestStatus()}

              {/* 파트너 신청 버튼 */}
              {canApplyPartner && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {t('mypage.applyPartner')}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('mypage.applyPartnerDesc')}
                      </p>
                    </div>
                    <Button 
                      onClick={() => setRequestDialogOpen(true)}
                      className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t('mypage.applyButton')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 팀원 초대 내역 */}
          {pendingInvites.length > 0 && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-orange-500" />
                  {t('mypage.pendingInvites')}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs">
                    {pendingInvites.length}
                  </span>
                </CardTitle>
                <CardDescription>{t('mypage.pendingInvitesDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingInvites ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  pendingInvites.map((invite) => (
                    <div 
                      key={invite.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-background border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getPartnerDisplayName(invite)}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {t(`team.${invite.role}`)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('mypage.invitedAt')}: {new Date(invite.invited_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineInvite(invite.id)}
                          disabled={processingInvite === invite.id || processingInvite === invite.invite_token}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {t('invite.decline')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvite(invite.invite_token)}
                          disabled={processingInvite === invite.id || processingInvite === invite.invite_token}
                          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('invite.accept')}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* 파트너 신청 팝업 */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t('mypage.applyPartner')}
            </DialogTitle>
            <DialogDescription>
              {t('mypage.dialogDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {/* 파트너 타입 선택 */}
            <div className="space-y-3">
              <Label>{t('partner.type')} <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partnerType: 'organizer' })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.partnerType === 'organizer'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('partner.typeOrganizer')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partnerType: 'agency' })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.partnerType === 'agency'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('partner.typeAgency')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partnerType: 'instructor' })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.partnerType === 'instructor'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Mic className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('partner.typeInstructor')}</span>
                </button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              {/* 공통 필수 필드 */}
              <div className="space-y-2">
                <Label htmlFor="representativeName">
                  {t('partner.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="representativeName"
                  placeholder={t('mypage.namePlaceholder')}
                  value={formData.representativeName}
                  onChange={(e) => {
                    setFormData({ ...formData, representativeName: e.target.value })
                    if (formErrors.representativeName) {
                      setFormErrors({ ...formErrors, representativeName: '' })
                    }
                  }}
                  className={formErrors.representativeName ? 'border-red-500' : ''}
                />
                {formErrors.representativeName && (
                  <p className="text-xs text-red-500">{formErrors.representativeName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t('partner.phone')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder={t('mypage.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    setFormData({ ...formData, phone: formatted })
                    if (formErrors.phone) {
                      setFormErrors({ ...formErrors, phone: '' })
                    }
                  }}
                  maxLength={13}
                  className={formErrors.phone ? 'border-red-500' : ''}
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-500">{formErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">
                  {t('partner.purpose')} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="purpose"
                  placeholder={t('mypage.purposePlaceholder')}
                  value={formData.purpose}
                  onChange={(e) => {
                    setFormData({ ...formData, purpose: e.target.value })
                    if (formErrors.purpose) {
                      setFormErrors({ ...formErrors, purpose: '' })
                    }
                  }}
                  rows={3}
                  className={formErrors.purpose ? 'border-red-500' : ''}
                />
                {formErrors.purpose && (
                  <p className="text-xs text-red-500">{formErrors.purpose}</p>
                )}
              </div>

              {/* 행사자/대행업체 필드 */}
              {(formData.partnerType === 'organizer' || formData.partnerType === 'agency') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      {formData.partnerType === 'organizer' ? t('partner.companyOrOrg') : t('partner.companyName')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      placeholder={t('mypage.companyPlaceholder')}
                      value={formData.companyName}
                      onChange={(e) => {
                        setFormData({ ...formData, companyName: e.target.value })
                        if (formErrors.companyName) {
                          setFormErrors({ ...formErrors, companyName: '' })
                        }
                      }}
                      className={formErrors.companyName ? 'border-red-500' : ''}
                    />
                    {formErrors.companyName && (
                      <p className="text-xs text-red-500">{formErrors.companyName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">
                      {t('partner.businessNumber')} {formData.partnerType === 'agency' && <span className="text-red-500">*</span>}
                      {formData.partnerType === 'organizer' && <span className="text-muted-foreground text-xs">({t('common.optional')})</span>}
                    </Label>
                    <Input
                      id="businessNumber"
                      placeholder={t('mypage.businessNumberPlaceholder')}
                      value={formData.businessNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, businessNumber: e.target.value })
                        if (formErrors.businessNumber) {
                          setFormErrors({ ...formErrors, businessNumber: '' })
                        }
                      }}
                      className={formErrors.businessNumber ? 'border-red-500' : ''}
                    />
                    {formErrors.businessNumber && (
                      <p className="text-xs text-red-500">{formErrors.businessNumber}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">
                        {t('partner.industry')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                      </Label>
                      <Input
                        id="industry"
                        placeholder={t('partner.industryPlaceholder')}
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedScale">
                        {t('partner.expectedScale')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                      </Label>
                      <Select
                        value={formData.expectedScale}
                        onValueChange={(value) => setFormData({ ...formData, expectedScale: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('partner.selectScale')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">{t('partner.scaleSmall')}</SelectItem>
                          <SelectItem value="medium">{t('partner.scaleMedium')}</SelectItem>
                          <SelectItem value="large">{t('partner.scaleLarge')}</SelectItem>
                          <SelectItem value="enterprise">{t('partner.scaleEnterprise')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* 대행업체 전용 필드 */}
              {formData.partnerType === 'agency' && (
                <div className="space-y-2">
                  <Label htmlFor="clientType">
                    {t('partner.clientType')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                  </Label>
                  <Input
                    id="clientType"
                    placeholder={t('partner.clientTypePlaceholder')}
                    value={formData.clientType}
                    onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                  />
                </div>
              )}

              {/* 강사 전용 필드 */}
              {formData.partnerType === 'instructor' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">
                      {t('partner.displayName')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      placeholder={t('partner.displayNamePlaceholder')}
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className={formErrors.displayName ? 'border-red-500' : ''}
                    />
                    {formErrors.displayName && (
                      <p className="text-red-500 text-sm">{formErrors.displayName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">
                      {t('partner.specialty')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                    </Label>
                    <Input
                      id="specialty"
                      placeholder={t('partner.specialtyPlaceholder')}
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">
                      {t('partner.bio')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder={t('partner.bioPlaceholder')}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRequestDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                {submitting ? t('mypage.applying') : t('mypage.applyButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
