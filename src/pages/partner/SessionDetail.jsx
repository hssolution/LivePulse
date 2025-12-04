import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Save, 
  Loader2,
  Copy,
  QrCode,
  Eye,
  Play,
  Square,
  Trash2,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Link as LinkIcon,
  Settings,
  FileText,
  Users2,
  UserCheck,
  Mic,
  MessageCircle,
  BarChart3,
  GripHorizontal,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw
} from 'lucide-react'
import CollaborationPanel from '@/components/session/CollaborationPanel'
import ManagerQnA from '@/components/session/ManagerQnA'
import ManagerPolls from '@/components/session/ManagerPolls'
import ParticipantManager from '@/components/session/ParticipantManager'
import DynamicTemplateRenderer, { getDefaultSampleValue } from '@/components/template/DynamicTemplateRenderer'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import QRCode from 'qrcode'

/**
 * 파트너: 세션 상세/수정 페이지
 */
export default function SessionDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState(null)
  const [template, setTemplate] = useState(null)
  const [templateFields, setTemplateFields] = useState([])
  const [assets, setAssets] = useState({})
  const [templates, setTemplates] = useState([])
  const [qnaTemplates, setQnaTemplates] = useState([])
  const [pollTemplates, setPollTemplates] = useState([])
  const [partner, setPartner] = useState(null)
  
  // QR 코드
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [showQR, setShowQR] = useState(false)
  
  // 삭제 다이얼로그
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // 디자인 탭 미리보기 설정
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [leftWidth, setLeftWidth] = useState(45) // 퍼센트
  const containerRef = useRef(null)
  const isResizing = useRef(false)
  const [previewData, setPreviewData] = useState({}) // 미리보기용 데이터
  const [adminDefaultData, setAdminDefaultData] = useState({}) // 관리자 기본값
  
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
    qna_template_id: '',
    poll_template_id: '',
    status: 'draft',
  })

  /**
   * 리사이즈 핸들러
   */
  const handleMouseDown = (e) => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e) => {
    if (!isResizing.current || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    
    // 최소 30%, 최대 70%
    if (newWidth >= 30 && newWidth <= 70) {
      setLeftWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  /**
   * 미리보기 디바이스 크기
   */
  const getPreviewSize = () => {
    switch (previewDevice) {
      case 'mobile': return 'max-w-[375px]'
      case 'tablet': return 'max-w-[768px]'
      default: return 'max-w-full'
    }
  }

  /**
   * 세션 데이터 로드
   */
  const loadSession = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    try {
      // 세션 정보
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()
      
      if (sessionError) throw sessionError
      setSession(sessionData)
      
      // 폼 데이터 설정
      setFormData({
        title: sessionData.title || '',
        venue_name: sessionData.venue_name || '',
        venue_address: sessionData.venue_address || '',
        start_at: sessionData.start_at ? sessionData.start_at.slice(0, 16) : '',
        end_at: sessionData.end_at ? sessionData.end_at.slice(0, 16) : '',
        contact_phone: sessionData.contact_phone || '',
        contact_email: sessionData.contact_email || '',
        max_participants: sessionData.max_participants || 100,
        description: sessionData.description || '',
        template_id: sessionData.template_id || '',
        qna_template_id: sessionData.qna_template_id || '',
        poll_template_id: sessionData.poll_template_id || '',
        status: sessionData.status || 'draft',
      })
      
      // 템플릿 목록 - 메인 화면용
      const { data: templatesData } = await supabase
        .from('session_templates')
        .select('*')
        .eq('is_active', true)
        .eq('screen_type', 'main')
        .order('sort_order')
      setTemplates(templatesData || [])
      
      // 템플릿 목록 - Q&A용
      const { data: qnaTemplatesData } = await supabase
        .from('session_templates')
        .select('*')
        .eq('is_active', true)
        .eq('screen_type', 'qna')
        .order('sort_order')
      setQnaTemplates(qnaTemplatesData || [])
      
      // 템플릿 목록 - 설문용
      const { data: pollTemplatesData } = await supabase
        .from('session_templates')
        .select('*')
        .eq('is_active', true)
        .eq('screen_type', 'poll')
        .order('sort_order')
      setPollTemplates(pollTemplatesData || [])
      
      // 템플릿 필드
      if (sessionData.template_id) {
        const { data: fieldsData } = await supabase
          .from('session_template_fields')
          .select('*')
          .eq('template_id', sessionData.template_id)
          .order('sort_order')
        setTemplateFields(fieldsData || [])
        
        const selectedTemplate = templatesData?.find(t => t.id === sessionData.template_id)
        setTemplate(selectedTemplate)
      }
      
      // 에셋 (이미지 등)
      const { data: assetsData } = await supabase
        .from('session_assets')
        .select('*')
        .eq('session_id', id)
      
      const assetsMap = {}
      const previewMap = {}
      assetsData?.forEach(asset => {
        assetsMap[asset.field_key] = asset
        // 미리보기용 데이터 (이미지는 value, URL 필드는 url)
        if (asset.value) previewMap[asset.field_key] = asset.value
      })
      setAssets(assetsMap)
      setPreviewData(previewMap)
      
      // 관리자 기본값 설정 (템플릿 필드에서 샘플값 생성)
      if (sessionData.template_id) {
        const { data: fieldsData } = await supabase
          .from('session_template_fields')
          .select('*')
          .eq('template_id', sessionData.template_id)
          .order('sort_order')
        
        const defaultMap = {}
        fieldsData?.forEach(field => {
          defaultMap[field.field_key] = getDefaultSampleValue(field)
        })
        setAdminDefaultData(defaultMap)
      }
      
      // QR 코드 생성
      const joinUrl = `${window.location.origin}/join/${sessionData.code}`
      const qr = await QRCode.toDataURL(joinUrl, { width: 256, margin: 2 })
      setQrCodeUrl(qr)
      
      // 파트너 정보 로드
      const { data: partnerData } = await supabase
        .from('partners')
        .select('id, partner_type')
        .eq('id', sessionData.partner_id)
        .single()
      setPartner(partnerData)
      
    } catch (error) {
      console.error('Error loading session:', error)
      toast.error(t('error.loadFailed'))
      navigate('/partner/sessions')
    } finally {
      setLoading(false)
    }
  }, [id, t, navigate])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  /**
   * 템플릿 변경 시 필드 로드
   */
  const handleTemplateChange = async (templateId) => {
    setFormData(prev => ({ ...prev, template_id: templateId }))
    
    if (templateId) {
      const { data: fieldsData } = await supabase
        .from('session_template_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order')
      setTemplateFields(fieldsData || [])
      
      const selectedTemplate = templates.find(t => t.id === templateId)
      setTemplate(selectedTemplate)
    } else {
      setTemplateFields([])
      setTemplate(null)
    }
  }

  /**
   * 기본 정보 저장
   */
  const handleSaveBasic = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          title: formData.title,
          venue_name: formData.venue_name,
          venue_address: formData.venue_address || null,
          start_at: formData.start_at,
          end_at: formData.end_at,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          max_participants: formData.max_participants,
          description: formData.description || null,
          template_id: formData.template_id || null,
          qna_template_id: formData.qna_template_id || null,
          poll_template_id: formData.poll_template_id || null,
        })
        .eq('id', id)
      
      if (error) throw error
      toast.success(t('common.saved'))
      loadSession()
    } catch (error) {
      console.error('Error saving session:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * 이미지 업로드
   */
  const handleImageUpload = async (fieldKey, file) => {
    if (!file) return
    
    try {
      // 파일 확장자
      const ext = file.name.split('.').pop()
      const fileName = `${id}/${fieldKey}_${Date.now()}.${ext}`
      
      // Supabase Storage 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-assets')
        .upload(fileName, file, { upsert: true })
      
      if (uploadError) throw uploadError
      
      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('session-assets')
        .getPublicUrl(fileName)
      
      const imageUrl = urlData.publicUrl
      
      // DB에 저장
      const { error: dbError } = await supabase
        .from('session_assets')
        .upsert({
          session_id: id,
          field_key: fieldKey,
          value: imageUrl,
        }, { onConflict: 'session_id,field_key' })
      
      if (dbError) throw dbError
      
      // 상태 업데이트
      setAssets(prev => ({
        ...prev,
        [fieldKey]: { ...prev[fieldKey], value: imageUrl }
      }))
      
      // 미리보기 데이터 업데이트
      setPreviewData(prev => ({
        ...prev,
        [fieldKey]: imageUrl
      }))
      
      toast.success(t('session.imageUploaded'))
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(t('error.uploadFailed'))
    }
  }

  /**
   * 이미지 삭제
   */
  const handleImageDelete = async (fieldKey) => {
    try {
      const { error } = await supabase
        .from('session_assets')
        .delete()
        .eq('session_id', id)
        .eq('field_key', fieldKey)
      
      if (error) throw error
      
      setAssets(prev => {
        const newAssets = { ...prev }
        delete newAssets[fieldKey]
        return newAssets
      })
      
      // 미리보기 데이터에서도 삭제
      setPreviewData(prev => {
        const newData = { ...prev }
        delete newData[fieldKey]
        return newData
      })
      
      toast.success(t('session.imageDeleted'))
    } catch (error) {
      console.error('Error deleting image:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * URL 저장 (배너 클릭 URL)
   */
  const handleUrlSave = async (fieldKey, url) => {
    try {
      const { error } = await supabase
        .from('session_assets')
        .upsert({
          session_id: id,
          field_key: fieldKey,
          url: url || null,
        }, { onConflict: 'session_id,field_key' })
      
      if (error) throw error
      
      setAssets(prev => ({
        ...prev,
        [fieldKey]: { ...prev[fieldKey], url }
      }))
      
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error saving URL:', error)
      toast.error(t('error.saveFailed'))
    }
  }

  /**
   * 상태 변경
   */
  const handleStatusChange = async (newStatus) => {
    try {
      const updates = { status: newStatus }
      
      if (newStatus === 'published' && !session.published_at) {
        updates.published_at = new Date().toISOString()
      }
      if (newStatus === 'active' && !session.started_at) {
        updates.started_at = new Date().toISOString()
      }
      if (newStatus === 'ended' && !session.ended_at) {
        updates.ended_at = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      
      toast.success(t('session.statusChanged'))
      loadSession()
    } catch (error) {
      console.error('Error changing status:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 세션 삭제
   */
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success(t('session.deleted'))
      navigate('/partner/sessions')
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 참여 코드 복사
   */
  const copyCode = () => {
    navigator.clipboard.writeText(session.code)
    toast.success(t('session.codeCopied'))
  }

  /**
   * 참여 링크 복사
   */
  const copyLink = () => {
    const joinUrl = `${window.location.origin}/join/${session.code}`
    navigator.clipboard.writeText(joinUrl)
    toast.success(t('session.linkCopied'))
  }

  /**
   * 미리보기 링크 복사
   */
  const copyPreviewLink = () => {
    const previewUrl = `${window.location.origin}/join/${session.code}?preview=true`
    navigator.clipboard.writeText(previewUrl)
    toast.success(t('session.previewLinkCopied'))
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      draft: { label: t('session.statusDraft'), className: 'bg-gray-500' },
      published: { label: t('session.statusPublished'), className: 'bg-blue-500' },
      active: { label: t('session.statusActive'), className: 'bg-green-500' },
      ended: { label: t('session.statusEnded'), className: 'bg-gray-500' },
      cancelled: { label: t('session.statusCancelled'), className: 'bg-red-500' },
    }
    const c = config[status] || config.draft
    return <Badge className={c.className}>{c.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/partner/sessions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {getStatusBadge(session.status)}
              <h1 className="text-2xl font-bold">{session.title}</h1>
            </div>
            <p className="text-muted-foreground">
              {format(new Date(session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 참여 코드 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">{t('session.code')}:</span>
            <span className="font-mono font-bold">{session.code}</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyCode}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                  <p className="font-medium">{t('session.copyCode')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowQR(true)}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                <p className="font-medium">{t('session.showQR')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyPreviewLink}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                <p className="font-medium">{t('session.copyPreviewLink')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
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
        </div>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">
            <FileText className="h-4 w-4 mr-2" />
            {t('session.basicInfo')}
          </TabsTrigger>
          <TabsTrigger value="design">
            <ImageIcon className="h-4 w-4 mr-2" />
            {t('session.design')}
          </TabsTrigger>
          <TabsTrigger value="collaboration">
            <Users2 className="h-4 w-4 mr-2" />
            {t('session.collaboration')}
          </TabsTrigger>
          <TabsTrigger value="participants">
            <UserCheck className="h-4 w-4 mr-2" />
            {t('participant.title')}
          </TabsTrigger>
          <TabsTrigger value="qna">
            <MessageCircle className="h-4 w-4 mr-2" />
            {t('session.qna')}
          </TabsTrigger>
          <TabsTrigger value="poll">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('session.poll')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            {t('session.settings')}
          </TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>{t('session.basicInfo')}</CardTitle>
              <CardDescription>{t('session.basicInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 세션명 */}
              <div className="space-y-2">
                <Label>{t('session.title')}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* 장소 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('session.venueName')}</Label>
                  <Input
                    value={formData.venue_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('session.venueAddress')}</Label>
                  <Input
                    value={formData.venue_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue_address: e.target.value }))}
                  />
                </div>
              </div>

              {/* 일시 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('session.startAt')}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('session.endAt')}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                  />
                </div>
              </div>

              {/* 연락처 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('session.contactPhone')}</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('session.contactEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  />
                </div>
              </div>

              {/* 최대 참여자 */}
              <div className="space-y-2">
                <Label>{t('session.maxParticipants')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 0 }))}
                  className="w-32"
                />
              </div>

              {/* 설명 */}
              <div className="space-y-2">
                <Label>{t('session.description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <Button onClick={handleSaveBasic} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 디자인 탭 - 분할 레이아웃 */}
        <TabsContent value="design" className="mt-0">
          <div ref={containerRef} className="flex h-[calc(100vh-280px)] gap-0 overflow-hidden rounded-lg border bg-background">
            {/* 좌측: 설정 패널 */}
            <div 
              className="overflow-y-auto border-r bg-card"
              style={{ width: `${leftWidth}%` }}
            >
              <div className="p-4 space-y-4">
                {/* 템플릿 선택 */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{t('session.template')}</h3>
                    <p className="text-xs text-muted-foreground">{t('session.templateDesc')}</p>
                  </div>
                  <Select value={formData.template_id} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('session.selectTemplate')} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tmpl) => (
                        <SelectItem key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Q&A 템플릿 선택 */}
                {qnaTemplates.length > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <div>
                      <h4 className="font-medium text-sm">{t('session.qnaTemplate')}</h4>
                      <p className="text-xs text-muted-foreground">{t('session.qnaTemplateDesc')}</p>
                    </div>
                    <Select 
                      value={formData.qna_template_id || 'none'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, qna_template_id: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('session.useMainTemplate')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('session.useMainTemplate')}</SelectItem>
                        {qnaTemplates.map((tmpl) => (
                          <SelectItem key={tmpl.id} value={tmpl.id}>
                            {tmpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 설문 템플릿 선택 */}
                {pollTemplates.length > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <div>
                      <h4 className="font-medium text-sm">{t('session.pollTemplate')}</h4>
                      <p className="text-xs text-muted-foreground">{t('session.pollTemplateDesc')}</p>
                    </div>
                    <Select 
                      value={formData.poll_template_id || 'none'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, poll_template_id: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('session.useMainTemplate')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('session.useMainTemplate')}</SelectItem>
                        {pollTemplates.map((tmpl) => (
                          <SelectItem key={tmpl.id} value={tmpl.id}>
                            {tmpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 이미지/배너 업로드 */}
                {templateFields.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h3 className="font-semibold">{t('session.assets')}</h3>
                      <p className="text-xs text-muted-foreground">{t('session.assetsDesc')}</p>
                    </div>
                    
                    {templateFields.filter(f => f.field_type === 'image').map((field) => (
                      <Card key={field.id} className="group">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              {field.field_name}
                              {field.is_required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {field.max_width && (
                              <span className="text-muted-foreground text-[10px]">
                                {t('session.maxWidthPx').replace('{width}', field.max_width)}
                              </span>
                            )}
                          </div>
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded block">{field.field_key}</code>
                          {field.description && (
                            <p className="text-[11px] text-muted-foreground">{field.description}</p>
                          )}
                          
                          {/* URL 입력 (실시간 미리보기용) */}
                          <div className="flex items-center gap-2">
                            <Input
                              value={previewData[field.field_key] || ''}
                              onChange={(e) => setPreviewData(prev => ({
                                ...prev,
                                [field.field_key]: e.target.value
                              }))}
                              placeholder={t('session.imageUrlPlaceholder')}
                              className="h-7 text-xs flex-1"
                            />
                            {previewData[field.field_key] && (
                              <img 
                                src={previewData[field.field_key]} 
                                alt={field.field_name}
                                className="h-7 w-10 object-cover rounded flex-shrink-0"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                          </div>
                          
                          {/* 파일 업로드 */}
                          {assets[field.field_key]?.value ? (
                            <div className="relative">
                              <img 
                                src={assets[field.field_key].value} 
                                alt={field.field_name}
                                className="w-full h-20 object-cover rounded-lg border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-5 w-5"
                                onClick={() => handleImageDelete(field.field_key)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(field.field_key, e.target.files?.[0])}
                              className="text-xs h-8"
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {/* URL 필드 */}
                    {templateFields.filter(f => f.field_type === 'url').map((field) => (
                      <Card key={field.id}>
                        <CardContent className="p-3 space-y-2">
                          <Label className="text-sm">{field.field_name}</Label>
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded block">{field.field_key}</code>
                          {field.description && (
                            <p className="text-[11px] text-muted-foreground">{field.description}</p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              type="url"
                              placeholder="https://"
                              value={previewData[field.field_key] || assets[field.field_key]?.url || ''}
                              onChange={(e) => {
                                // 실시간 미리보기 업데이트
                                setPreviewData(prev => ({
                                  ...prev,
                                  [field.field_key]: e.target.value
                                }))
                                // assets도 업데이트 (저장용)
                                setAssets(prev => ({
                                  ...prev,
                                  [field.field_key]: { ...prev[field.field_key], url: e.target.value }
                                }))
                              }}
                              className="text-xs"
                            />
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleUrlSave(field.field_key, assets[field.field_key]?.url)}
                            >
                              {t('common.save')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* 새 창에서 미리보기 버튼 */}
                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/join/${session.code}?preview=true`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('session.openPreview')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* 리사이즈 핸들 */}
            <div
              className="w-2 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0"
              onMouseDown={handleMouseDown}
            >
              <GripHorizontal className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* 우측: 실시간 미리보기 */}
            <div 
              className="flex-1 flex flex-col overflow-hidden bg-muted/30"
              style={{ width: `${100 - leftWidth}%` }}
            >
              {/* 미리보기 헤더 */}
              <div className="flex items-center justify-between p-3 border-b bg-card flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-semibold text-sm">{t('session.preview')}</span>
                </div>
                {/* 디바이스 선택 */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewDevice('tablet')}
                  >
                    <Tablet className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              {/* 미리보기 영역 */}
              <div className="flex-1 overflow-auto p-4">
                <div className={`mx-auto bg-background rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${getPreviewSize()}`}>
                  {/* 동적 템플릿 렌더러 */}
                  <DynamicTemplateRenderer
                    fields={templateFields}
                    data={previewData}
                    defaultData={adminDefaultData}
                    device={previewDevice}
                    sessionInfo={{
                      title: formData.title,
                      date: formData.start_at ? format(new Date(formData.start_at), 'yyyy년 MM월 dd일 (EEE)', { locale: ko }) : '',
                      time: formData.start_at && formData.end_at ? `${format(new Date(formData.start_at), 'HH:mm')} - ${format(new Date(formData.end_at), 'HH:mm')}` : '',
                      venue: formData.venue_name,
                      venueAddress: formData.venue_address,
                      phone: formData.contact_phone,
                      email: formData.contact_email,
                      participantInfo: t('session.participantInfo').replace('{count}', session?.participant_count || 0).replace('{max}', formData.max_participants)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 협업 탭 */}
        <TabsContent value="collaboration">
          {partner && (
            <CollaborationPanel 
              sessionId={id}
              partnerId={partner.id}
              partnerType={partner.partner_type}
              onUpdate={loadSession}
            />
          )}
        </TabsContent>

        {/* 참가자 탭 */}
        <TabsContent value="participants">
          <ParticipantManager sessionId={id} sessionCode={session?.code} />
        </TabsContent>

        {/* Q&A 탭 */}
        <TabsContent value="qna">
          <ManagerQnA sessionId={id} sessionCode={session?.code} />
        </TabsContent>

        {/* 설문 탭 */}
        <TabsContent value="poll">
          <ManagerPolls sessionId={id} sessionCode={session?.code} />
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* 상태 변경 */}
            <Card>
              <CardHeader>
                <CardTitle>{t('session.statusManagement')}</CardTitle>
                <CardDescription>{t('session.statusManagementDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('session.currentStatus')}:</span>
                  {getStatusBadge(session.status)}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {session.status === 'draft' && (
                    <Button onClick={() => handleStatusChange('published')}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('session.publish')}
                    </Button>
                  )}
                  {session.status === 'published' && (
                    <>
                      <Button onClick={() => handleStatusChange('active')} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        {t('session.start')}
                      </Button>
                      <Button variant="outline" onClick={() => handleStatusChange('draft')}>
                        {t('session.unpublish')}
                      </Button>
                    </>
                  )}
                  {session.status === 'active' && (
                    <Button onClick={() => handleStatusChange('ended')} variant="secondary">
                      <Square className="h-4 w-4 mr-2" />
                      {t('session.end')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 위험 영역 */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600">{t('session.dangerZone')}</CardTitle>
                <CardDescription>{t('session.dangerZoneDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('session.delete')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR 코드 모달 */}
      <AlertDialog open={showQR} onOpenChange={setShowQR}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('session.qrCode')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('session.qrCodeDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-bold">{session.code}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {window.location.origin}/join/{session.code}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.close')}</AlertDialogCancel>
            <AlertDialogAction onClick={copyLink}>
              <Copy className="h-4 w-4 mr-2" />
              {t('session.copyLink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 모달 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('session.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('session.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

