import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Loader2, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Save,
  Lock
} from 'lucide-react'

/**
 * 파트너 정보 수정 페이지
 * - 소유자(owner): 수정 가능
 * - 팀원(member): 조회만 가능
 */
export default function PartnerProfile() {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [partner, setPartner] = useState(null)
  const [partnerDetails, setPartnerDetails] = useState(null)
  const [myRole, setMyRole] = useState(null) // 'owner' | 'member'
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    representativeName: '',
    phone: '',
    // 행사자/대행사
    companyName: '',
    businessNumber: '',
    address: '',
    industry: '',
    expectedScale: '',
    clientType: '',
    // 강사
    displayName: '',
    specialty: '',
    bio: ''
  })

  /**
   * 데이터 로드
   */
  const loadData = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // 내 파트너 정보 조회
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*, profile:profiles(email)')
        .eq('profile_id', user.id)
        .single()
      
      if (partnerError) {
        if (partnerError.code === 'PGRST116') {
          // 파트너가 아닌 경우
          setPartner(null)
          setLoading(false)
          return
        }
        throw partnerError
      }
      
      setPartner(partnerData)
      
      // 내 역할 확인 (partner_members에서)
      const { data: memberData } = await supabase
        .from('partner_members')
        .select('role')
        .eq('partner_id', partnerData.id)
        .eq('user_id', user.id)
        .single()
      
      setMyRole(memberData?.role || 'owner')
      
      // 파트너 타입별 상세 정보 조회
      let details = null
      if (partnerData.partner_type === 'organizer') {
        const { data } = await supabase
          .from('partner_organizers')
          .select('*')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      } else if (partnerData.partner_type === 'agency') {
        const { data } = await supabase
          .from('partner_agencies')
          .select('*')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      } else if (partnerData.partner_type === 'instructor') {
        const { data } = await supabase
          .from('partner_instructors')
          .select('*')
          .eq('partner_id', partnerData.id)
          .single()
        details = data
      }
      
      setPartnerDetails(details)
      
      // 폼 데이터 초기화
      setFormData({
        representativeName: partnerData.representative_name || '',
        phone: partnerData.phone || '',
        // 행사자/대행사
        companyName: details?.company_name || '',
        businessNumber: details?.business_number || '',
        address: details?.address || '',
        industry: details?.industry || '',
        expectedScale: details?.expected_scale || '',
        clientType: details?.client_type || '',
        // 강사
        displayName: details?.display_name || '',
        specialty: details?.specialty || '',
        bio: details?.bio || ''
      })
      
    } catch (error) {
      console.error('Error loading partner data:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  /**
   * 전화번호 포맷팅
   */
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  /**
   * 저장
   */
  const handleSave = async () => {
    if (myRole !== 'owner') {
      toast.error(t('partner.noEditPermission'))
      return
    }
    
    setSaving(true)
    try {
      // 기본 파트너 정보 업데이트
      const { error: partnerError } = await supabase
        .from('partners')
        .update({
          representative_name: formData.representativeName.trim(),
          phone: formData.phone.trim()
        })
        .eq('id', partner.id)
      
      if (partnerError) throw partnerError
      
      // 타입별 상세 정보 업데이트
      if (partner.partner_type === 'organizer') {
        const { error } = await supabase
          .from('partner_organizers')
          .update({
            company_name: formData.companyName.trim(),
            business_number: formData.businessNumber.trim() || null,
            address: formData.address.trim() || null,
            industry: formData.industry.trim() || null,
            expected_scale: formData.expectedScale || null
          })
          .eq('partner_id', partner.id)
        if (error) throw error
      } else if (partner.partner_type === 'agency') {
        const { error } = await supabase
          .from('partner_agencies')
          .update({
            company_name: formData.companyName.trim(),
            business_number: formData.businessNumber.trim(),
            address: formData.address.trim() || null,
            industry: formData.industry.trim() || null,
            expected_scale: formData.expectedScale || null,
            client_type: formData.clientType.trim() || null
          })
          .eq('partner_id', partner.id)
        if (error) throw error
      } else if (partner.partner_type === 'instructor') {
        const { error } = await supabase
          .from('partner_instructors')
          .update({
            display_name: formData.displayName.trim(),
            specialty: formData.specialty.trim() || null,
            bio: formData.bio.trim() || null
          })
          .eq('partner_id', partner.id)
        if (error) throw error
      }
      
      toast.success(t('partner.updateSuccess'))
      loadData()
    } catch (error) {
      console.error('Error saving partner data:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
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

  // 수정 가능 여부
  const canEdit = myRole === 'owner'

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">{t('partner.notFound')}</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('partner.profileTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('partner.profileDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={
            partner.partner_type === 'organizer' ? 'bg-blue-500/10 text-blue-600' :
            partner.partner_type === 'agency' ? 'bg-purple-500/10 text-purple-600' :
            'bg-orange-500/10 text-orange-600'
          }>
            {getTypeIcon(partner.partner_type)}
            <span className="ml-1">{getTypeLabel(partner.partner_type)}</span>
          </Badge>
          {myRole === 'owner' ? (
            <Badge variant="secondary">{t('partner.roleOwner')}</Badge>
          ) : (
            <Badge variant="outline">{t('partner.roleMember')}</Badge>
          )}
        </div>
      </div>

      {/* 수정 불가 안내 */}
      {!canEdit && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Lock className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-600">{t('partner.viewOnlyNotice')}</p>
          </CardContent>
        </Card>
      )}

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('partner.basicInfo')}
          </CardTitle>
          <CardDescription>{t('partner.basicInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 이메일 (읽기 전용) */}
            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input value={partner.profile?.email || ''} disabled />
              </div>
            </div>
            
            {/* 대표자명 */}
            <div className="space-y-2">
              <Label htmlFor="representativeName">{t('partner.representativeName')}</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="representativeName"
                  value={formData.representativeName}
                  onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            </div>
            
            {/* 연락처 */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="010-1234-5678"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 행사자/대행사 상세 정보 */}
      {(partner.partner_type === 'organizer' || partner.partner_type === 'agency') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {partner.partner_type === 'organizer' ? <Briefcase className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              {partner.partner_type === 'organizer' ? t('partner.organizerInfo') : t('partner.agencyInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 회사명 */}
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('partner.companyName')}</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              
              {/* 사업자번호 */}
              <div className="space-y-2">
                <Label htmlFor="businessNumber">{t('partner.businessNumber')}</Label>
                <Input
                  id="businessNumber"
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                  placeholder="123-45-67890"
                  disabled={!canEdit}
                />
              </div>
              
              {/* 주소 */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">{t('partner.address')}</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t('partner.addressPlaceholder')}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              
              {/* 업종 */}
              <div className="space-y-2">
                <Label htmlFor="industry">{t('partner.industry')}</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder={t('partner.industryPlaceholder')}
                  disabled={!canEdit}
                />
              </div>
              
              {/* 대행업체: 클라이언트 유형 */}
              {partner.partner_type === 'agency' && (
                <div className="space-y-2">
                  <Label htmlFor="clientType">{t('partner.clientType')}</Label>
                  <Input
                    id="clientType"
                    value={formData.clientType}
                    onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                    placeholder={t('partner.clientTypePlaceholder')}
                    disabled={!canEdit}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 강사 상세 정보 */}
      {partner.partner_type === 'instructor' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {t('partner.instructorInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 활동명 */}
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('partner.displayName')}</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder={t('partner.displayNamePlaceholder')}
                  disabled={!canEdit}
                />
              </div>
              
              {/* 전문 분야 */}
              <div className="space-y-2">
                <Label htmlFor="specialty">{t('partner.specialty')}</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder={t('partner.specialtyPlaceholder')}
                  disabled={!canEdit}
                />
              </div>
              
              {/* 소개 */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">{t('partner.bio')}</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={t('partner.bioPlaceholder')}
                  rows={4}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 저장 버튼 */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('common.save')}
          </Button>
        </div>
      )}
    </div>
  )
}

