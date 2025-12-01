import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, MapPin, Phone, Mail, Users, Save, Loader2, Eye, ExternalLink } from 'lucide-react'

/**
 * 파트너: 세션 생성 페이지
 */
export default function SessionCreate() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [partner, setPartner] = useState(null)
  const [templates, setTemplates] = useState([])
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    title: '',
    venue_name: '',
    venue_address: '',
    start_at: '',
    end_at: '',
    contact_phone: '',
    contact_email: '',
    max_participants: 100,
    description: '',
    template_id: '',
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadInitialData()
  }, [user])

  /**
   * 초기 데이터 로드
   */
  const loadInitialData = async () => {
    if (!user) return
    
    try {
      // 파트너 정보 조회
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('profile_id', user.id)
        .single()
      
      if (partnerError) throw partnerError
      setPartner(partnerData)
      
      // 템플릿 목록 조회 (메인 화면용만)
      const { data: templatesData, error: templatesError } = await supabase
        .from('session_templates')
        .select('*')
        .eq('is_active', true)
        .eq('screen_type', 'main')
        .order('sort_order')
      
      if (templatesError) throw templatesError
      setTemplates(templatesData || [])
      
      // 기본 템플릿 설정
      if (templatesData && templatesData.length > 0) {
        setFormData(prev => ({ ...prev, template_id: templatesData[0].id }))
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(t('error.loadFailed'))
    }
  }

  /**
   * 폼 유효성 검사
   */
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = t('session.error.titleRequired')
    }
    if (!formData.venue_name.trim()) {
      newErrors.venue_name = t('session.error.venueRequired')
    }
    if (!formData.start_at) {
      newErrors.start_at = t('session.error.startRequired')
    }
    if (!formData.end_at) {
      newErrors.end_at = t('session.error.endRequired')
    }
    if (formData.start_at && formData.end_at && new Date(formData.start_at) >= new Date(formData.end_at)) {
      newErrors.end_at = t('session.error.endAfterStart')
    }
    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = t('session.error.phoneRequired')
    }
    if (!formData.contact_email.trim()) {
      newErrors.contact_email = t('session.error.emailRequired')
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = t('session.error.emailInvalid')
    }
    if (formData.max_participants < 1) {
      newErrors.max_participants = t('session.error.maxParticipantsInvalid')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * 세션 생성
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!partner) {
      toast.error(t('session.noPartner'))
      return
    }
    
    setLoading(true)
    try {
      // 세션 생성
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          partner_id: partner.id,
          template_id: formData.template_id || null,
          title: formData.title.trim(),
          venue_name: formData.venue_name.trim(),
          venue_address: formData.venue_address.trim() || null,
          start_at: formData.start_at,
          end_at: formData.end_at,
          contact_phone: formData.contact_phone.trim(),
          contact_email: formData.contact_email.trim(),
          max_participants: formData.max_participants,
          description: formData.description.trim() || null,
          status: 'draft',
        })
        .select('id')
        .single()
      
      if (error) {
        console.error('Insert error:', error)
        throw error
      }
      
      console.log('Session created:', data)
      toast.success(t('session.created'))
      
      // 생성된 세션 상세 페이지로 이동
      if (data?.id) {
        navigate(`/partner/sessions/${data.id}`)
      } else {
        // data가 없으면 목록으로
        navigate('/partner/sessions')
      }
      
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error(error.message || t('error.createFailed'))
      setLoading(false)
    }
    // 성공 시에는 setLoading(false)를 호출하지 않음 (페이지 이동하므로)
  }

  /**
   * 입력 핸들러
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/partner/sessions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('session.create')}</h1>
          <p className="text-muted-foreground mt-1">{t('session.createDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 기본 정보 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('session.basicInfo')}</CardTitle>
              <CardDescription>{t('session.basicInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 세션명 */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t('session.title')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder={t('session.titlePlaceholder')}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* 장소 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venue_name">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    {t('session.venueName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="venue_name"
                    value={formData.venue_name}
                    onChange={(e) => handleChange('venue_name', e.target.value)}
                    placeholder={t('session.venueNamePlaceholder')}
                    className={errors.venue_name ? 'border-red-500' : ''}
                  />
                  {errors.venue_name && <p className="text-sm text-red-500">{errors.venue_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue_address">{t('session.venueAddress')}</Label>
                  <Input
                    id="venue_address"
                    value={formData.venue_address}
                    onChange={(e) => handleChange('venue_address', e.target.value)}
                    placeholder={t('session.venueAddressPlaceholder')}
                  />
                </div>
              </div>

              {/* 일시 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_at">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    {t('session.startAt')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => handleChange('start_at', e.target.value)}
                    className={errors.start_at ? 'border-red-500' : ''}
                  />
                  {errors.start_at && <p className="text-sm text-red-500">{errors.start_at}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_at">
                    {t('session.endAt')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="end_at"
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => handleChange('end_at', e.target.value)}
                    className={errors.end_at ? 'border-red-500' : ''}
                  />
                  {errors.end_at && <p className="text-sm text-red-500">{errors.end_at}</p>}
                </div>
              </div>

              {/* 연락처 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">
                    <Phone className="inline h-4 w-4 mr-1" />
                    {t('session.contactPhone')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    placeholder="02-1234-5678"
                    className={errors.contact_phone ? 'border-red-500' : ''}
                  />
                  {errors.contact_phone && <p className="text-sm text-red-500">{errors.contact_phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">
                    <Mail className="inline h-4 w-4 mr-1" />
                    {t('session.contactEmail')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="contact@example.com"
                    className={errors.contact_email ? 'border-red-500' : ''}
                  />
                  {errors.contact_email && <p className="text-sm text-red-500">{errors.contact_email}</p>}
                </div>
              </div>

              {/* 최대 참여자 수 */}
              <div className="space-y-2">
                <Label htmlFor="max_participants">
                  <Users className="inline h-4 w-4 mr-1" />
                  {t('session.maxParticipants')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || 0)}
                  className={errors.max_participants ? 'border-red-500' : ''}
                />
                {errors.max_participants && <p className="text-sm text-red-500">{errors.max_participants}</p>}
              </div>

              {/* 설명 */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('session.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder={t('session.descriptionPlaceholder')}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 템플릿 선택 */}
            <Card>
              <CardHeader>
                <CardTitle>{t('session.template')}</CardTitle>
                <CardDescription>{t('session.templateDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select 
                  value={formData.template_id} 
                  onValueChange={(value) => handleChange('template_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('session.selectTemplate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 선택된 템플릿 정보 */}
                {formData.template_id && (() => {
                  const selectedTemplate = templates.find(t => t.id === formData.template_id)
                  if (!selectedTemplate) return null
                  
                  return (
                    <div className="space-y-2">
                      {/* 설명 */}
                      {selectedTemplate.description && (
                        <p className="text-sm text-muted-foreground">
                          {selectedTemplate.description}
                        </p>
                      )}
                      
                      {/* 미리보기 버튼 */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(`/template-preview/${selectedTemplate.code}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('session.previewTemplate')}
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* 저장 버튼 */}
            <Card>
              <CardContent className="pt-6">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.processing')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('session.createButton')}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {t('session.createNote')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

