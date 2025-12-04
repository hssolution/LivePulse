import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Calendar,
  Shield,
  UserCheck,
  Clock,
  Activity,
  Users,
  Globe,
  FileText,
  Monitor,
  ExternalLink,
  Crown,
  UserCog,
  ChevronRight,
  Play,
  Video,
  ArrowRight,
  Hash
} from 'lucide-react'
import { format } from 'date-fns'
import PartnerInfoDialog from '@/components/common/PartnerInfoDialog'

/**
 * 사용자 상세 정보 팝업 (관리자용)
 * - 사용자 기본 정보
 * - 파트너인 경우 파트너 정보 및 소속 멤버 표시
 * - 로그인 이력
 * 
 * @param {object} user - 사용자 데이터 (profiles 테이블)
 * @param {boolean} open - 다이얼로그 열림 상태
 * @param {function} onOpenChange - 다이얼로그 상태 변경 핸들러
 */
export default function UserDetailDialog({ user: propUser, userId, open, onOpenChange }) {
  const { t } = useLanguage()
  const [user, setUser] = useState(propUser)
  const [loadingUser, setLoadingUser] = useState(false)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [partnerMembers, setPartnerMembers] = useState([])
  const [loginLogs, setLoginLogs] = useState([])
  const [memberOfPartners, setMemberOfPartners] = useState([])
  const [sessionCount, setSessionCount] = useState(0)
  const [sessions, setSessions] = useState([])
  
  // 파트너 상세 정보 팝업
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)

  /**
   * 파트너 상세 팝업 열기
   */
  const handleOpenPartnerInfo = (partnerId) => {
    setSelectedPartnerId(partnerId)
    setPartnerDialogOpen(true)
  }

  /**
   * userId로 사용자 정보 로드
   */
  useEffect(() => {
    if (!open || !userId || propUser) return
    
    const loadUser = async () => {
      setLoadingUser(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) throw error
        setUser(data)
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setLoadingUser(false)
      }
    }
    
    loadUser()
  }, [open, userId, propUser])

  /**
   * 상세 정보 로드
   */
  useEffect(() => {
    if (!open || !user) return
    loadDetails()
  }, [open, user])

  /**
   * 상세 정보 로드 함수
   */
  const loadDetails = async () => {
    setLoading(true)
    try {
      // 1. 파트너 정보 조회 (파트너인 경우)
      if (user.user_type === 'partner') {
        await loadPartnerInfo()
      } else {
        setPartnerInfo(null)
        setPartnerMembers([])
        setSessions([])
        setSessionCount(0)
      }
      
      // 2. 나머지 정보 병렬 로드
      await Promise.all([
        loadMemberOfPartners(),
        loadLoginLogs()
      ])
    } catch (err) {
      console.error('Error loading user details:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * partnerInfo가 로드된 후 세션 목록 로드
   */
  useEffect(() => {
    if (partnerInfo?.id) {
      loadSessions()
    }
  }, [partnerInfo?.id])

  /**
   * 파트너 정보 로드
   */
  const loadPartnerInfo = async () => {
    try {
      // 기본 파트너 정보
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select(`
          id,
          partner_type,
          representative_name,
          phone,
          purpose,
          is_active,
          created_at
        `)
        .eq('profile_id', user.id)
        .single()
      
      if (partnerError) {
        if (partnerError.code === 'PGRST116') {
          setPartnerInfo(null)
          return
        }
        throw partnerError
      }
      
      // 파트너 타입별 상세 정보 조회
      let details = null
      
      if (partnerData.partner_type === 'organizer') {
        const { data } = await supabase
          .from('partner_organizers')
          .select('company_name, business_number, address, industry, expected_scale')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      } else if (partnerData.partner_type === 'agency') {
        const { data } = await supabase
          .from('partner_agencies')
          .select('company_name, business_number, address, client_type')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      } else if (partnerData.partner_type === 'instructor') {
        const { data } = await supabase
          .from('partner_instructors')
          .select('specialty, bio')
          .eq('partner_id', partnerData.id)
          .single()
        details = { ...data, display_name: user.display_name }
      }
      
      setPartnerInfo({ ...partnerData, details })
      
      // 파트너 소속 멤버 조회
      const { data: membersData } = await supabase
        .from('partner_members')
        .select('id, email, role, status, invited_at, accepted_at, user_id')
        .eq('partner_id', partnerData.id)
        .order('role', { ascending: true })
        .order('created_at', { ascending: true })
      
      // 멤버 프로필 정보 조회
      if (membersData && membersData.length > 0) {
        const userIds = membersData.filter(m => m.user_id).map(m => m.user_id)
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds)
          
          // 프로필 정보 매핑
          const profileMap = {}
          profilesData?.forEach(p => {
            profileMap[p.id] = p
          })
          
          membersData.forEach(m => {
            if (m.user_id && profileMap[m.user_id]) {
              m.profile = profileMap[m.user_id]
            }
          })
        }
      }
      
      setPartnerMembers(membersData || [])
    } catch (err) {
      console.error('Error loading partner info:', err)
    }
  }

  /**
   * 소속된 파트너 목록 로드 (멤버로 참여 중인 파트너, 본인 소유 파트너 제외)
   */
  const loadMemberOfPartners = async () => {
    try {
      // 이 사용자가 멤버로 속한 파트너 조회
      const { data: membershipData } = await supabase
        .from('partner_members')
        .select(`
          id,
          role,
          status,
          accepted_at,
          partner:partners(
            id,
            profile_id,
            partner_type,
            representative_name,
            is_active,
            partner_organizers(company_name),
            partner_agencies(company_name),
            partner_instructors(specialty)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
      
      // 본인이 소유한 파트너는 제외 (이미 '소유 파트너' 섹션에서 표시)
      const filteredData = membershipData?.filter(m => m.partner?.profile_id !== user.id) || []
      setMemberOfPartners(filteredData)
    } catch (err) {
      console.error('Error loading member partnerships:', err)
    }
  }

  /**
   * 로그인 이력 로드
   */
  const loadLoginLogs = async () => {
    try {
      const { data } = await supabase
        .from('login_logs')
        .select('id, event_type, ip_address, user_agent, device_info, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setLoginLogs(data || [])
    } catch (err) {
      console.error('Error loading login logs:', err)
    }
  }

  /**
   * 세션 목록 및 수 로드
   */
  const loadSessions = async () => {
    try {
      // 파트너가 생성한 세션 목록 조회
      const { data, count } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          code,
          status,
          venue_name,
          start_at,
          end_at,
          participant_count,
          max_participants,
          partner:partners(
            id,
            representative_name,
            partner_organizers(company_name),
            partner_agencies(company_name)
          )
        `, { count: 'exact' })
        .eq('partner_id', partnerInfo?.id)
        .order('start_at', { ascending: false })
        .limit(20)
      
      setSessions(data || [])
      setSessionCount(count || 0)
    } catch (err) {
      console.error('Error loading sessions:', err)
    }
  }

  /**
   * 세션 상세 페이지로 이동
   */
  const handleNavigateToSession = (sessionId) => {
    onOpenChange(false) // 팝업 닫기
    navigate(`/partner/sessions/${sessionId}`)
  }

  /**
   * 세션 상태 라벨
   */
  const getSessionStatusLabel = (status) => {
    const labels = {
      draft: t('session.statusDraft'),
      published: t('session.statusPublished'),
      active: t('session.statusActive'),
      ended: t('session.statusEnded'),
      cancelled: t('session.statusCancelled'),
    }
    return labels[status] || status
  }

  /**
   * 세션 상태 색상
   */
  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
      case 'published': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'ended': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  /**
   * 파트너 타입 아이콘
   */
  const getPartnerTypeIcon = (type) => {
    switch (type) {
      case 'organizer': return <Briefcase className="h-4 w-4" />
      case 'agency': return <Building2 className="h-4 w-4" />
      case 'instructor': return <GraduationCap className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
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
   * 파트너 타입 색상
   */
  const getPartnerTypeColor = (type) => {
    switch (type) {
      case 'organizer': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'agency': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'instructor': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  /**
   * 멤버 역할 라벨
   */
  const getMemberRoleLabel = (role) => {
    const labels = {
      owner: t('team.roleOwner'),
      admin: t('team.roleAdmin'),
      member: t('team.roleMember'),
    }
    return labels[role] || role
  }

  /**
   * 멤버 역할 색상
   */
  const getMemberRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'admin': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  /**
   * 이벤트 타입 라벨
   */
  const getEventTypeLabel = (type) => {
    const labels = {
      login_success: t('admin.loginSuccess'),
      login_failed: t('admin.loginFailed'),
      logout: t('admin.logout'),
      session_expired: t('admin.sessionExpired'),
      forced_logout: t('admin.forcedLogout'),
    }
    return labels[type] || type
  }

  /**
   * 이벤트 타입 색상
   */
  const getEventTypeColor = (type) => {
    switch (type) {
      case 'login_success': return 'bg-green-500/10 text-green-600'
      case 'login_failed': return 'bg-red-500/10 text-red-600'
      case 'logout': return 'bg-gray-500/10 text-gray-600'
      case 'forced_logout': return 'bg-orange-500/10 text-orange-600'
      default: return 'bg-gray-500/10 text-gray-600'
    }
  }

  /**
   * 파트너 이름 가져오기
   */
  const getPartnerName = (membership) => {
    const partner = membership.partner
    if (!partner) return '-'
    
    if (partner.partner_type === 'organizer' && partner.partner_organizers?.[0]) {
      return partner.partner_organizers[0].company_name
    }
    if (partner.partner_type === 'agency' && partner.partner_agencies?.[0]) {
      return partner.partner_agencies[0].company_name
    }
    if (partner.partner_type === 'instructor') {
      return partner.representative_name
    }
    return partner.representative_name
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('admin.userDetail')}
          </DialogTitle>
        </DialogHeader>
        
        {(loading || loadingUser) ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="flex justify-center items-center py-12 text-muted-foreground">
            {t('error.notFound')}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 기본 정보 헤더 */}
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {user.display_name || user.email}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* 역할 */}
                  <Badge variant="outline" className={user.user_role === 'admin' 
                    ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' 
                    : 'bg-gray-500/10 text-gray-600 border-gray-500/20'}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user.user_role}
                  </Badge>
                  {/* 타입 */}
                  <Badge variant="outline" className={
                    user.user_type === 'admin' 
                      ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' 
                      : user.user_type === 'partner'
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                  }>
                    {user.user_type}
                  </Badge>
                  {/* 상태 */}
                  <Badge variant="outline" className={user.status === 'active' 
                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                    : 'bg-red-500/10 text-red-600 border-red-500/20'}>
                    {user.status === 'active' ? <UserCheck className="h-3 w-3 mr-1" /> : null}
                    {user.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0 mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info" className="text-xs sm:text-sm">
                  {t('admin.basicInfo')}
                </TabsTrigger>
                <TabsTrigger value="partner" className="text-xs sm:text-sm">
                  {t('admin.partnerInfo')}
                </TabsTrigger>
                <TabsTrigger value="sessions" className="text-xs sm:text-sm">
                  {t('admin.sessions')} {sessionCount > 0 && `(${sessionCount})`}
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm">
                  {t('admin.activityLog')}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 mt-4 overflow-auto max-h-[400px]">
                {/* 기본 정보 탭 */}
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="grid gap-3">
                    {/* 표시 이름 */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('common.displayName')}</p>
                        <p className="font-medium truncate">{user.display_name || '-'}</p>
                      </div>
                    </div>
                    
                    {/* 이메일 */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                        <p className="font-medium truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* 선호 언어 */}
                    {user.preferred_language && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('admin.preferredLanguage')}</p>
                          <p className="font-medium">{user.preferred_language.toUpperCase()}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 설명 */}
                    {user.description && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('admin.description')}</p>
                          <p className="font-medium text-sm">{user.description}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 가입일 */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('admin.colJoinDate')}</p>
                        <p className="font-medium">
                          {format(new Date(user.created_at), 'yyyy.MM.dd HH:mm')}
                        </p>
                      </div>
                    </div>
                    
                    {/* 마지막 로그인 */}
                    {user.lastLoginAt && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('team.lastLogin')}</p>
                          <p className="font-medium">
                            {format(new Date(user.lastLoginAt), 'yyyy.MM.dd HH:mm')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* 파트너 정보 탭 */}
                <TabsContent value="partner" className="mt-0 space-y-4">
                  {/* 본인이 소유한 파트너 정보 */}
                  {partnerInfo ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {t('admin.ownedPartner')}
                      </h4>
                      
                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPartnerTypeColor(partnerInfo.partner_type)}`}>
                            {getPartnerTypeIcon(partnerInfo.partner_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium truncate">
                              {partnerInfo.details?.company_name || 
                               partnerInfo.details?.display_name || 
                               partnerInfo.representative_name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getPartnerTypeColor(partnerInfo.partner_type)}>
                                {getPartnerTypeLabel(partnerInfo.partner_type)}
                              </Badge>
                              <Badge variant="outline" className={partnerInfo.is_active 
                                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                                : 'bg-red-500/10 text-red-600 border-red-500/20'}>
                                {partnerInfo.is_active ? t('partner.statusActive') : t('partner.statusInactive')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* 파트너 상세 정보 */}
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('partner.representativeName')}:</span>
                            <span>{partnerInfo.representative_name}</span>
                          </div>
                          {partnerInfo.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{t('common.phone')}:</span>
                              <span>{partnerInfo.phone}</span>
                            </div>
                          )}
                          {partnerInfo.details?.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{t('partner.address')}:</span>
                              <span>{partnerInfo.details.address}</span>
                            </div>
                          )}
                          {partnerInfo.details?.business_number && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{t('partner.businessNumber')}:</span>
                              <span>{partnerInfo.details.business_number}</span>
                            </div>
                          )}
                          {partnerInfo.details?.specialty && (
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{t('partner.specialty')}:</span>
                              <span>{partnerInfo.details.specialty}</span>
                            </div>
                          )}
                          {partnerInfo.purpose && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">{t('partner.purpose')}:</span>
                              <span className="flex-1">{partnerInfo.purpose}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 소속 멤버 목록 */}
                        {partnerMembers.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h5 className="font-medium text-sm flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4" />
                              {t('admin.teamMembers')} ({partnerMembers.length})
                            </h5>
                            <div className="space-y-2">
                              {partnerMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {member.profile?.display_name || member.email}
                                      </p>
                                      {member.profile?.display_name && (
                                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={getMemberRoleColor(member.role)}>
                                      {getMemberRoleLabel(member.role)}
                                    </Badge>
                                    {member.status !== 'accepted' && (
                                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                        {member.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : user.user_type === 'partner' ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.noPartnerData')}</p>
                    </div>
                  ) : null}

                  {/* 소속된 파트너 목록 (멤버로) */}
                  {memberOfPartners.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('admin.memberOfPartners')} ({memberOfPartners.length})
                      </h4>
                      
                      <div className="space-y-2">
                        {memberOfPartners.map((membership) => (
                          <div 
                            key={membership.id} 
                            className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleOpenPartnerInfo(membership.partner?.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPartnerTypeColor(membership.partner?.partner_type)}`}>
                                  {getPartnerTypeIcon(membership.partner?.partner_type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">
                                      {getPartnerName(membership)}
                                    </p>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={`text-xs ${getPartnerTypeColor(membership.partner?.partner_type)}`}>
                                      {getPartnerTypeLabel(membership.partner?.partner_type)}
                                    </Badge>
                                    {membership.partner?.is_active ? (
                                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                        {t('partner.statusActive')}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                                        {t('partner.statusInactive')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={getMemberRoleColor(membership.role)}>
                                  {membership.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                                  {membership.role === 'admin' && <UserCog className="h-3 w-3 mr-1" />}
                                  {getMemberRoleLabel(membership.role)}
                                </Badge>
                                {membership.accepted_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(membership.accepted_at), 'yyyy.MM.dd')} {t('admin.joined')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* 파트너 대표자 정보 */}
                            {membership.partner?.representative_name && (
                              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {t('partner.representativeName')}: {membership.partner.representative_name}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 파트너 정보 없음 */}
                  {!partnerInfo && memberOfPartners.length === 0 && user.user_type !== 'partner' && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.notPartner')}</p>
                    </div>
                  )}
                </TabsContent>

                {/* 세션 탭 */}
                <TabsContent value="sessions" className="mt-0 space-y-4">
                  {sessions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          {t('admin.createdSessions')} ({sessionCount})
                        </h4>
                      </div>
                      
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {session.title}
                                </span>
                                <Badge variant="outline" className={getSessionStatusColor(session.status)}>
                                  {getSessionStatusLabel(session.status)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {session.code}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.venue_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {session.participant_count || 0}/{session.max_participants}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(session.start_at), 'yyyy.MM.dd HH:mm')} ~ {format(new Date(session.end_at), 'HH:mm')}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNavigateToSession(session.id)}
                              className="flex-shrink-0"
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              {t('common.view')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.noSessions')}</p>
                    </div>
                  )}
                </TabsContent>

                {/* 활동 로그 탭 */}
                <TabsContent value="activity" className="mt-0 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('admin.recentLogins')}
                  </h4>
                  
                  {loginLogs.length > 0 ? (
                    <div className="space-y-2">
                      {loginLogs.map((log) => (
                        <div key={log.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className={getEventTypeColor(log.event_type)}>
                              {getEventTypeLabel(log.event_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'yyyy.MM.dd HH:mm:ss')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {log.ip_address && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                <span>IP: {log.ip_address}</span>
                              </div>
                            )}
                            {log.device_info?.browser && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Monitor className="h-3 w-3" />
                                <span>{log.device_info.browser}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.noLoginLogs')}</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </DialogContent>

      {/* 파트너 상세 정보 팝업 */}
      <PartnerInfoDialog
        partnerId={selectedPartnerId}
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
      />
    </Dialog>
  )
}

