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
import { exportToExcel } from '@/utils/excel'
import * as XLSX from 'xlsx'
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
  RefreshCw,
  Download
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
  const [activeTab, setActiveTab] = useState('basic')
  
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

  /**
   * 데이터 엑셀 다운로드
   */
  const handleExportData = async () => {
    try {
      const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
      let fileName = `${session.title}`
      const sheets = {}

      // 탭별 데이터 로드 및 시트 구성
      if (activeTab === 'participants') {
        fileName += '_참여자목록'
        const { data: participants } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: false })
        
        sheets['참여자'] = participants?.map(p => ({
          '참여일시': format(new Date(p.created_at), 'yyyy-MM-dd HH:mm:ss'),
          '닉네임': p.display_name || '익명',
          '디바이스ID': p.device_id
        })) || []

      } else if (activeTab === 'qna') {
        fileName += '_Q&A'
        const { data: questions } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true })

        sheets['Q&A'] = questions?.map(q => ({
          '작성일시': format(new Date(q.created_at), 'yyyy-MM-dd HH:mm:ss'),
          '질문내용': q.content,
          '작성자': q.is_anonymous ? '익명' : (q.author_name || '익명'),
          '상태': q.status === 'approved' ? '승인됨' : (q.status === 'answered' ? '답변완료' : q.status),
          '좋아요': q.likes_count,
          '답변': q.answer || '',
          '답변일시': q.answered_at ? format(new Date(q.answered_at), 'yyyy-MM-dd HH:mm:ss') : ''
        })) || []

      } else if (activeTab === 'poll') {
        fileName += '_설문결과'
        
        // 1. 설문 문항 및 옵션 로드
        const { data: polls } = await supabase
          .from('polls')
          .select('*, poll_options(*)')
          .eq('session_id', id)
          .order('display_order')

        if (!polls || polls.length === 0) {
          toast.info(t('session.noPolls', '등록된 설문이 없습니다.'))
          return
        }
        
        // 2. 설문 응답 전체 로드
        const { data: responses, error: responsesError } = await supabase
          .from('poll_responses')
          .select(`
            *,
            poll_options(id, option_text, poll_id)
          `)
          .in('poll_id', polls.map(p => p.id))
          .order('created_at')

        if (responsesError) throw responsesError

        const safeResponses = responses || []

        // 3. 응답자 식별 및 정렬 (1, 2, 3... 컬럼 생성을 위해)
        const respondentIds = [...new Set(safeResponses.map(r => r.user_id || r.anonymous_id).filter(id => id))]
        const respondentMap = {}
        respondentIds.forEach((id, index) => {
          respondentMap[id] = index + 1
        })

        // --- 통합 시트 생성 (Array of Arrays 방식) ---
        
        // 1. 헤더 구성
        const headerRow = ['넘버링', '종류', '필수선택', '보기 및 응답 결과']
        // 응답자 컬럼 추가 (1, 2, 3...)
        respondentIds.forEach((_, idx) => {
          headerRow.push(`${idx + 1}`)
        })

        // 2. 데이터 행 구성
        const dataRows = polls.map((p, index) => {
          const pollResponses = safeResponses.filter(r => r.poll_id === p.id)
          
          // [보기 및 응답 결과] 구성
          let resultSummary = ''
          
          // poll_type 확인: DB에는 'open'으로 저장됨 (ManagerPolls.jsx 참조)
          if (p.poll_type === 'open' || p.poll_type === 'text') {
            // 주관식
            const textCounts = {}
            pollResponses.forEach(r => {
              const text = r.response_text || '(내용 없음)'
              textCounts[text] = (textCounts[text] || 0) + 1
            })
            
            const summaryList = Object.entries(textCounts)
              .map(([text, count]) => `- ${text} (${count}명)`)
            
            resultSummary = summaryList.length > 0 ? summaryList.join('\r\n') : '(응답 없음)'
            
          } else {
            // 객관식
            const summaryList = p.poll_options.map((opt, optIdx) => {
              const count = pollResponses.filter(r => r.option_id === opt.id).length
              return `${optIdx + 1}. ${opt.option_text} (${count}명)`
            })
            resultSummary = summaryList.join('\r\n')
          }

          // 기본 행 데이터
          const row = [
            index + 1, // 넘버링
            p.poll_type === 'single' ? '단일 선택' : (p.poll_type === 'multiple' ? '복수 선택' : '주관식'), // 종류
            p.is_required ? '필수' : '선택', // 필수선택
            resultSummary // 보기 및 응답 결과
          ]

          // 응답자별 답변 추가
          respondentIds.forEach(respondentId => {
            // 해당 응답자의 해당 문항에 대한 답변 찾기
            const userResponses = pollResponses.filter(r => (r.user_id || r.anonymous_id) === respondentId)
            
            if (userResponses.length > 0) {
              const answers = userResponses.map(r => r.response_text || r.poll_options?.option_text || '').filter(t => t)
              row.push(answers.join(', '))
            } else {
              row.push('') // 응답 없음
            }
          })

          return row
        })

        // 헤더와 데이터를 합쳐서 시트 생성
        const wsData = [headerRow, ...dataRows]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        
        // 컬럼 너비 설정 (대략적인 값)
        const colWidths = [
          { wch: 8 },  // 넘버링
          { wch: 12 }, // 종류
          { wch: 10 }, // 필수선택
          { wch: 50 }, // 보기 및 응답 결과 (넓게)
        ]
        // 응답자 컬럼 너비
        respondentIds.forEach(() => colWidths.push({ wch: 15 }))
        ws['!cols'] = colWidths

        // utils/excel.js의 exportToExcel은 객체 배열을 받도록 되어 있으므로,
        // 여기서는 직접 워크북을 만들어서 내보내거나 exportToExcel을 수정해야 함.
        // 기존 exportToExcel 함수는 json_to_sheet를 사용하므로,
        // 여기서는 sheets 객체에 ws를 직접 넣는 꼼수보다는
        // exportToExcel 함수가 Worksheet 객체도 처리할 수 있게 하거나,
        // 이 로직 안에서 바로 다운로드 처리.
        
        // 하지만 기존 구조를 유지하기 위해 sheets 객체에 '설문결과': wsData (배열의 배열)를 넣고
        // exportToExcel 함수를 조금 수정하여 배열 데이터도 처리하게 하는 것이 좋음.
        sheets['설문결과'] = wsData // 이제 객체 배열이 아니라 2차원 배열임

      } else {
        // 지원하지 않는 탭에서는 동작 안함
        return
      }

      // 엑셀 생성 및 다운로드
      exportToExcel(sheets, fileName)

      toast.success(t('common.downloadSuccess', '다운로드가 완료되었습니다.'))
    } catch (error) {
      console.error('Export error:', error)
      toast.error(t('error.exportFailed', '데이터 내보내기에 실패했습니다.'))
    }
  }

  // 다운로드 가능 여부
  const canExport = ['participants', 'qna', 'poll'].includes(activeTab)

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
                <div className={!canExport ? "cursor-not-allowed opacity-50" : ""}>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className={canExport ? "hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all" : ""}
                    onClick={handleExportData}
                    disabled={!canExport}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 shadow-xl">
                <p className="font-medium">
                  {canExport 
                    ? t('session.exportData', '데이터 엑셀 다운로드')
                    : t('session.exportDisabled', '다운로드할 데이터가 없습니다')
                  }
                </p>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                <div className="pt-4 border-t space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/join/${session.code}?preview=true`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('session.openPreview')}
                    </Link>
                  </Button>
                  
                  {/* 좌장 화면 */}
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/presenter/${session.code}`} target="_blank">
                      <Mic className="h-4 w-4 mr-2" />
                      {t('session.presenterScreen')}
                    </Link>
                  </Button>
                  
                  {/* 송출 화면 */}
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/broadcast/${session.code}`} target="_blank">
                      <Monitor className="h-4 w-4 mr-2" />
                      {t('session.broadcastScreen')}
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

