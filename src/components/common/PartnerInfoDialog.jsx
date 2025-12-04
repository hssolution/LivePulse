import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
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
  Users,
  Video,
  Hash,
  ArrowRight,
  Crown,
  UserCog,
  FileText,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'

/**
 * 파트너 정보 팝업 (공용 컴포넌트)
 * - 파트너 ID를 받아서 정보를 조회하여 표시
 * - 다양한 곳에서 재사용 가능
 * - 관리자 모드에서는 추가 정보 표시
 * 
 * @param {string} partnerId - 조회할 파트너 ID
 * @param {boolean} open - 다이얼로그 열림 상태
 * @param {function} onOpenChange - 다이얼로그 상태 변경 핸들러
 * @param {boolean} isAdmin - 관리자 모드 여부 (추가 정보 표시)
 */
export default function PartnerInfoDialog({ partnerId, open, onOpenChange, isAdmin = false }) {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [partner, setPartner] = useState(null)
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionCount, setSessionCount] = useState(0)
  const [error, setError] = useState(null)

  // 관리자 여부 확인 (prop 또는 프로필에서)
  const showAdminFeatures = isAdmin || profile?.role === 'admin'

  /**
   * 파트너 정보 로드
   */
  useEffect(() => {
    if (!open || !partnerId) return
    loadAllData()
  }, [open, partnerId])

  /**
   * 모든 데이터 로드
   */
  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        loadPartner(),
        loadMembers(),
        loadSessions()
      ])
    } catch (err) {
      console.error('Error loading partner data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 파트너 기본 정보 로드
   */
  const loadPartner = async () => {
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select(`
        id,
        partner_type,
        representative_name,
        phone,
        purpose,
        is_active,
        created_at,
        profile:profiles(id, email, display_name)
      `)
      .eq('id', partnerId)
      .single()
    
    if (partnerError) throw partnerError
    
    // 파트너 타입별 상세 정보 조회
    let details = null
    
    if (partnerData.partner_type === 'organizer') {
      const { data } = await supabase
        .from('partner_organizers')
        .select('company_name, business_number, address, industry, expected_scale')
        .eq('partner_id', partnerId)
        .single()
      details = data
    } else if (partnerData.partner_type === 'agency') {
      const { data } = await supabase
        .from('partner_agencies')
        .select('company_name, business_number, address, client_type, industry, expected_scale')
        .eq('partner_id', partnerId)
        .single()
      details = data
    } else if (partnerData.partner_type === 'instructor') {
      const { data } = await supabase
        .from('partner_instructors')
        .select('specialty, bio')
        .eq('partner_id', partnerId)
        .single()
      details = { ...data, display_name: partnerData.profile?.display_name }
    }
    
    setPartner({ ...partnerData, details })
  }

  /**
   * 팀 멤버 목록 로드
   */
  const loadMembers = async () => {
    const { data: membersData } = await supabase
      .from('partner_members')
      .select('id, email, role, status, invited_at, accepted_at, user_id')
      .eq('partner_id', partnerId)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true })
    
    // 멤버 프로필 정보 조회
    if (membersData && membersData.length > 0) {
      const userIds = membersData.filter(m => m.user_id).map(m => m.user_id)
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds)
        
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
    
    setMembers(membersData || [])
  }

  /**
   * 세션 목록 로드
   */
  const loadSessions = async () => {
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
        max_participants
      `, { count: 'exact' })
      .eq('partner_id', partnerId)
      .order('start_at', { ascending: false })
      .limit(10)
    
    setSessions(data || [])
    setSessionCount(count || 0)
  }

  /**
   * 세션 상세 페이지로 이동
   */
  const handleNavigateToSession = (sessionId) => {
    onOpenChange(false)
    navigate(`/partner/sessions/${sessionId}`)
  }

  /**
   * 파트너 타입 아이콘
   */
  const getTypeIcon = (type) => {
    switch (type) {
      case 'organizer': return <Briefcase className="h-5 w-5" />
      case 'agency': return <Building2 className="h-5 w-5" />
      case 'instructor': return <GraduationCap className="h-5 w-5" />
      default: return <User className="h-5 w-5" />
    }
  }

  /**
   * 파트너 타입 라벨
   */
  const getTypeLabel = (type) => {
    const labels = {
      organizer: t('partner.typeOrganizer'),
      agency: t('partner.typeAgency'),
      instructor: t('partner.typeInstructor'),
    }
    return labels[type] || type
  }

  /**
   * 파트너 타입별 색상
   */
  const getTypeColor = (type) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('partner.info')}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{t('error.loadFailed')}</p>
          </div>
        ) : partner ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getTypeColor(partner.partner_type)}`}>
                {getTypeIcon(partner.partner_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {partner.details?.company_name || 
                   partner.details?.display_name || 
                   partner.representative_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{partner.profile?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={getTypeColor(partner.partner_type)}>
                    {getTypeLabel(partner.partner_type)}
                  </Badge>
                  {partner.is_active ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      {t('partner.statusActive')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                      {t('partner.statusInactive')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0 mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info" className="text-xs sm:text-sm">
                  {t('admin.basicInfo')}
                </TabsTrigger>
                <TabsTrigger value="sessions" className="text-xs sm:text-sm">
                  {t('admin.sessions')} {sessionCount > 0 && `(${sessionCount})`}
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs sm:text-sm">
                  {t('admin.teamMembers')} {members.length > 0 && `(${members.length})`}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 mt-4 overflow-auto max-h-[400px]">
                {/* 기본 정보 탭 */}
                <TabsContent value="info" className="mt-0 space-y-3">
                  {/* 대표자명 */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('partner.representativeName')}</p>
                      <p className="font-medium">{partner.representative_name}</p>
                    </div>
                  </div>

                  {/* 이메일 */}
                  {partner.profile?.email && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                        <p className="font-medium truncate">{partner.profile.email}</p>
                      </div>
                    </div>
                  )}

                  {/* 전화번호 */}
                  {partner.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('common.phone')}</p>
                        <p className="font-medium">{partner.phone}</p>
                      </div>
                    </div>
                  )}

                  {/* 회사명/기관명 (행사자/대행사만) */}
                  {partner.details?.company_name && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.companyName')}</p>
                        <p className="font-medium">{partner.details.company_name}</p>
                      </div>
                    </div>
                  )}

                  {/* 사업자번호 */}
                  {partner.details?.business_number && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.businessNumber')}</p>
                        <p className="font-medium">{partner.details.business_number}</p>
                      </div>
                    </div>
                  )}

                  {/* 주소 */}
                  {partner.details?.address && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.address')}</p>
                        <p className="font-medium">{partner.details.address}</p>
                      </div>
                    </div>
                  )}

                  {/* 전문 분야 (강사만) */}
                  {partner.details?.specialty && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.specialty')}</p>
                        <p className="font-medium">{partner.details.specialty}</p>
                      </div>
                    </div>
                  )}

                  {/* 업종 */}
                  {partner.details?.industry && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.industry')}</p>
                        <p className="font-medium">{partner.details.industry}</p>
                      </div>
                    </div>
                  )}

                  {/* 예상 규모 */}
                  {partner.details?.expected_scale && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.expectedScale')}</p>
                        <p className="font-medium">{partner.details.expected_scale}</p>
                      </div>
                    </div>
                  )}

                  {/* 가입 목적 */}
                  {partner.purpose && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.purpose')}</p>
                        <p className="font-medium text-sm">{partner.purpose}</p>
                      </div>
                    </div>
                  )}

                  {/* 소개 (강사만) */}
                  {partner.details?.bio && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t('partner.bio')}</p>
                        <p className="font-medium text-sm">{partner.details.bio}</p>
                      </div>
                    </div>
                  )}

                  {/* 가입일 */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('partner.joinedAt')}</p>
                      <p className="font-medium">{format(new Date(partner.created_at), 'yyyy.MM.dd')}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* 세션 탭 */}
                <TabsContent value="sessions" className="mt-0 space-y-3">
                  {sessions.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          {t('admin.sessions')} ({sessionCount})
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
                      
                      {sessionCount > 10 && (
                        <p className="text-xs text-center text-muted-foreground">
                          {t('admin.showingRecent', { count: 10, total: sessionCount })}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.noSessions')}</p>
                    </div>
                  )}
                </TabsContent>

                {/* 팀원 탭 */}
                <TabsContent value="members" className="mt-0 space-y-3">
                  {members.length > 0 ? (
                    <>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('admin.teamMembers')} ({members.length})
                      </h4>
                      
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              {member.role === 'owner' ? (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              ) : member.role === 'admin' ? (
                                <UserCog className="h-4 w-4 text-purple-500" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {member.profile?.display_name || member.email}
                              </p>
                              {member.profile?.display_name && (
                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                              )}
                              {member.accepted_at && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(member.accepted_at), 'yyyy.MM.dd')} {t('admin.joined')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={getMemberRoleColor(member.role)}>
                              {getMemberRoleLabel(member.role)}
                            </Badge>
                            {member.status !== 'accepted' && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                                {member.status === 'pending' ? t('team.pending') : member.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.noTeamMembers')}</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
