import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { usePartner } from '@/context/PartnerContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  ArrowLeft,
  Save,
  Loader2,
  Copy,
  QrCode,
  Eye,
  Play,
  Square,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  Users2,
  Mic,
  BarChart3,
  GripHorizontal,
  Monitor,
  Tablet,
  Smartphone,
  Radio,
  Megaphone,
  Sliders,
  Users,
  Check,
  Pencil,
  Tag,
  ListChecks,
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import AssetField from '@/components/session/AssetField'
import CollaborationPanel from '@/components/session/CollaborationPanel'
import ManagerPolls from '@/components/session/ManagerPolls'
import ParticipantManager from '@/components/session/ParticipantManager'
import LectureManager from '@/components/session/LectureManager'
import QnaCategoryManager from '@/components/session/QnaCategoryManager'
import RunOfShowPanel from '@/components/session/RunOfShowPanel'
import { getDefaultSampleValue } from '@/components/template/DynamicTemplateRenderer'
import QRCode from 'qrcode'
import { formatKoreanPhone } from '@/utils/phone'

/**
 * 파트너: 세션 설정 에디터 (풀스크린, 좌측 6섹션 네비)
 *
 * 섹션 구성 (강연 준비를 위한 흐름):
 *   1. 기본 정보       — 제목·일시·장소·연락처
 *   2. 화면 디자인     — 템플릿 선택 + 에셋 업로드 + 라이브 미리보기
 *   3. 발표자 & 협업   — CollaborationPanel
 *   4. 콘텐츠 준비     — 미리 만들 투표 (Q&A 모더는 라이브 콘솔에서)
 *   5. 참가자          — ParticipantManager
 *   6. 게시 & 공유     — 상태 워크플로 + QR + 위험구역
 *
 * Q&A 실시간 모더레이션은 라이브 콘솔(/partner/sessions/:id/console)로 이전.
 */
export default function SessionDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { partner, loading: partnerLoading } = usePartner()
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

  // QR 모달
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [showQR, setShowQR] = useState(false)

  // 삭제 다이얼로그
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // 디자인 미리보기
  const [previewDevice, setPreviewDevice] = useState('mobile')
  const [leftWidth, setLeftWidth] = useState(45)
  const containerRef = useRef(null)
  const isResizing = useRef(false)
  const [previewData, setPreviewData] = useState({})
  const [adminDefaultData, setAdminDefaultData] = useState({})
  // 미리보기 iframe 강제 리로드용 키. 저장/에셋 변경 성공 시 +1 하여 최신 저장본 반영.
  const [iframeNonce, setIframeNonce] = useState(0)

  // 섹션 네비
  const [section, setSection] = useState('basic')

  // 관리자/파트너 구분
  const [sessionPartner, setSessionPartner] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const effectivePartner = partner || sessionPartner

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

  /* ----- 리사이즈 ----- */
  const handleMouseDown = () => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }
  const handleMouseMove = (e) => {
    if (!isResizing.current || !containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    const w = ((e.clientX - r.left) / r.width) * 100
    if (w >= 30 && w <= 70) setLeftWidth(w)
  }
  const handleMouseUp = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const getPreviewSize = () => {
    switch (previewDevice) {
      case 'mobile':
        return 'max-w-[375px]'
      case 'tablet':
        return 'max-w-[768px]'
      default:
        return 'max-w-full'
    }
  }

  /* ----- 데이터 로드 ----- */
  const loadSession = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const adminCheck = profile?.role === 'admin'
      setIsAdmin(adminCheck)
      const { data, error } = await supabase.rpc('sp_partner_session_complete_q', {
        p_session_id: id,
      })
      if (error) throw error

      const sessionData = data.session
      const partnerData = data.partner
      const templatesData = data.templates
      const qnaTemplatesData = data.qna_templates
      const pollTemplatesData = data.poll_templates
      const fieldsData = data.template_fields
      const assetsData = data.assets

      setSession(sessionData)
      if (adminCheck && partnerData) {
        setSessionPartner({
          id: partnerData.id,
          partner_type: partnerData.partner_type || 'organizer',
          representative_name: partnerData.representative_name,
        })
      }

      setFormData({
        title: sessionData.title || '',
        venue_name: sessionData.venue_name || '',
        venue_address: sessionData.venue_address || '',
        start_at: sessionData.start_at ? sessionData.start_at.slice(0, 16) : '',
        end_at: sessionData.end_at ? sessionData.end_at.slice(0, 16) : '',
        contact_phone: formatKoreanPhone(sessionData.contact_phone || ''),
        contact_email: sessionData.contact_email || '',
        max_participants: sessionData.max_participants || 100,
        description: sessionData.description || '',
        template_id: sessionData.template_id || '',
        qna_template_id: sessionData.qna_template_id || '',
        poll_template_id: sessionData.poll_template_id || '',
        status: sessionData.status || 'draft',
      })

      setTemplates(templatesData || [])
      setQnaTemplates(qnaTemplatesData || [])
      setPollTemplates(pollTemplatesData || [])
      setTemplateFields(fieldsData || [])
      const selected = templatesData?.find((tp) => tp.id === sessionData.template_id)
      setTemplate(selected)

      const assetsMap = {}
      const previewMap = {}
      assetsData?.forEach((a) => {
        assetsMap[a.field_key] = a
        if (a.value) previewMap[a.field_key] = a.value
      })
      setAssets(assetsMap)
      setPreviewData(previewMap)

      const defaultMap = {}
      fieldsData?.forEach((f) => {
        defaultMap[f.field_key] = getDefaultSampleValue(f)
      })
      setAdminDefaultData(defaultMap)

      const joinUrl = `${window.location.origin}/join/${sessionData.code}`
      const qr = await QRCode.toDataURL(joinUrl, { width: 256, margin: 2 })
      setQrCodeUrl(qr)
    } catch (error) {
      console.error('Error loading session:', error)
      toast.error(t('error.loadFailed') || '불러오기 실패')
      navigate('/partner/sessions')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, profile?.role, t])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  /* ----- 핸들러 (기존 로직 유지) ----- */
  const handleTemplateChange = async (templateId) => {
    setFormData((prev) => ({ ...prev, template_id: templateId }))
    if (templateId) {
      const { data: fields, error } = await supabase.rpc('sp_template_fields_q', {
        p_template_id: templateId,
      })
      if (error) {
        console.error('Error loading fields:', error)
        return
      }
      setTemplateFields(fields || [])
      const sel = templates.find((tp) => tp.id === templateId)
      setTemplate(sel)
    } else {
      setTemplateFields([])
      setTemplate(null)
    }
  }

  const handleSaveBasic = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('sp_partner_session_basic_s', {
        p_session_id: id,
        p_title: formData.title,
        p_venue_name: formData.venue_name,
        p_venue_address: formData.venue_address || null,
        p_start_at: formData.start_at,
        p_end_at: formData.end_at,
        p_contact_phone: formData.contact_phone,
        p_contact_email: formData.contact_email,
        p_max_participants: formData.max_participants,
        p_description: formData.description || null,
        p_template_id: formData.template_id || null,
        p_qna_template_id: formData.qna_template_id || null,
        p_poll_template_id: formData.poll_template_id || null,
      })
      if (error) throw error
      if (!data?.success) throw new Error('Failed to save')
      toast.success(t('common.saved') || '저장되었습니다')
      loadSession()
      setIframeNonce((n) => n + 1)
    } catch (error) {
      console.error('Error saving:', error)
      toast.error(t('error.saveFailed') || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (fieldKey, file) => {
    if (!file) return
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${id}/${fieldKey}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('session-assets')
        .upload(fileName, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('session-assets').getPublicUrl(fileName)
      const imageUrl = urlData.publicUrl
      const { data, error } = await supabase.rpc('sp_partner_session_asset_s', {
        p_action: 'upsert',
        p_session_id: id,
        p_field_key: fieldKey,
        p_value: imageUrl,
        p_url: null,
      })
      if (error) throw error
      if (!data?.success) throw new Error('Failed to save asset')
      setAssets((prev) => ({ ...prev, [fieldKey]: { ...prev[fieldKey], value: imageUrl } }))
      setPreviewData((prev) => ({ ...prev, [fieldKey]: imageUrl }))
      setIframeNonce((n) => n + 1)
      toast.success(t('session.imageUploaded') || '이미지가 업로드되었습니다')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(t('error.uploadFailed') || '업로드 실패')
    }
  }

  const handleImageDelete = async (fieldKey) => {
    try {
      const { data, error } = await supabase.rpc('sp_partner_session_asset_s', {
        p_action: 'delete',
        p_session_id: id,
        p_field_key: fieldKey,
        p_value: null,
        p_url: null,
      })
      if (error) throw error
      if (!data?.success) throw new Error('Failed to delete')
      setAssets((prev) => {
        const c = { ...prev }
        delete c[fieldKey]
        return c
      })
      setPreviewData((prev) => {
        const c = { ...prev }
        delete c[fieldKey]
        return c
      })
      setIframeNonce((n) => n + 1)
      toast.success(t('session.imageDeleted') || '이미지가 삭제되었습니다')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('error.deleteFailed') || '삭제 실패')
    }
  }

  const handleUrlSave = async (fieldKey, url) => {
    try {
      const { data, error } = await supabase.rpc('sp_partner_session_asset_s', {
        p_action: 'upsert',
        p_session_id: id,
        p_field_key: fieldKey,
        p_value: null,
        p_url: url || null,
      })
      if (error) throw error
      if (!data?.success) throw new Error('Failed to save URL')
      setAssets((prev) => ({ ...prev, [fieldKey]: { ...prev[fieldKey], url } }))
      setIframeNonce((n) => n + 1)
      toast.success(t('common.saved') || '저장되었습니다')
    } catch (error) {
      console.error('URL save error:', error)
      toast.error(t('error.saveFailed') || '저장 실패')
    }
  }

  // 이미지 필드에 붙여넣은 URL을 value 슬롯에 저장 (파일 업로드와 동일 슬롯 → 청중 화면 반영)
  const handleImageUrlSave = async (fieldKey, url) => {
    if (!url) return
    try {
      const { data, error } = await supabase.rpc('sp_partner_session_asset_s', {
        p_action: 'upsert',
        p_session_id: id,
        p_field_key: fieldKey,
        p_value: url,
        p_url: null,
      })
      if (error) throw error
      if (!data?.success) throw new Error('Failed to save image url')
      setAssets((prev) => ({ ...prev, [fieldKey]: { ...prev[fieldKey], value: url } }))
      setPreviewData((prev) => ({ ...prev, [fieldKey]: url }))
      setIframeNonce((n) => n + 1)
      toast.success(t('common.saved') || '저장되었습니다')
    } catch (error) {
      console.error('Image URL save error:', error)
      toast.error(t('error.saveFailed') || '저장 실패')
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const { data, error } = await supabase.rpc('sp_partner_session_status_s', {
        p_session_id: id,
        p_status: newStatus,
      })
      if (error) throw error
      if (!data?.success) throw new Error('Failed to change status')
      toast.success(t('session.statusChanged') || '상태가 변경되었습니다')
      loadSession()
    } catch (error) {
      console.error('Status change error:', error)
      toast.error(t('error.updateFailed') || '변경 실패')
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
      toast.success(t('session.deleted') || '삭제되었습니다')
      navigate('/partner/sessions')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('error.deleteFailed') || '삭제 실패')
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(session.code)
    toast.success(t('session.codeCopied') || '코드가 복사되었습니다')
  }
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${session.code}`)
    toast.success(t('session.linkCopied') || '링크가 복사되었습니다')
  }
  const copyPreviewLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${session.code}?preview=true`)
    toast.success(t('session.previewLinkCopied') || '미리보기 링크가 복사되었습니다')
  }

  /* ----- 준비 완료도 계산 ----- */
  const completionScore = (() => {
    let done = 0
    let total = 5
    // 1. 기본 정보
    if (formData.title && formData.venue_name && formData.start_at && formData.end_at && formData.contact_phone && formData.contact_email) done++
    // 2. 템플릿
    if (formData.template_id) done++
    // 3. 에셋 (이미지 하나라도)
    if (Object.values(assets).some((a) => a?.value)) done++
    // 4. 게시
    if (session?.status && session.status !== 'draft') done++
    // 5. 코드/QR (항상 존재)
    if (session?.code) done++
    return Math.round((done / total) * 100)
  })()

  /* ----- 로딩 ----- */
  const showLoading = loading || (!isAdmin && partnerLoading)

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }
  if (!session) return null

  /* ----- 헤더 CTA: 상태별 ----- */
  const renderHeaderCTA = () => {
    const consoleUrl = `/partner/sessions/${id}/console`
    if (session.status === 'active') {
      return (
        <Link
          to={consoleUrl}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Radio className="w-4 h-4" /> 진행 콘솔 열기
        </Link>
      )
    }
    if (session.status === 'published') {
      return (
        <Link
          to={consoleUrl}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Play className="w-4 h-4" /> 라이브 시작
        </Link>
      )
    }
    if (session.status === 'ended') {
      return (
        <Link
          to={`/partner/sessions/${id}/report`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <BarChart3 className="w-4 h-4" /> 리포트 보기
        </Link>
      )
    }
    // draft
    return (
      <button
        type="button"
        onClick={() => handleStatusChange('published')}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <Megaphone className="w-4 h-4" /> 게시하기
      </button>
    )
  }

  const statusInfo = STATUS_CONFIG[session.status] || STATUS_CONFIG.draft

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 flex flex-col">
      {/* 상단 바 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/partner/sessions')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> 세션 목록
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusInfo.cls} flex-shrink-0`}>
              {statusInfo.label}
            </span>
            <span className="font-bold truncate">{session.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* 준비 완료도 */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">준비</span>
            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${completionScore}%` }}
              />
            </div>
            <span className="font-bold text-emerald-600 w-9 text-right">{completionScore}%</span>
          </div>
          <a
            href={`/join/${session.code}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4" /> 미리보기
          </a>
          {renderHeaderCTA()}
        </div>
      </header>

      {/* 본문: 좌측 네비 + 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        <SectionNav
          current={section}
          onChange={setSection}
          completionScore={completionScore}
          status={session.status}
        />

        <main className="flex-1 overflow-y-auto">
          {section === 'basic' && (
            <BasicSection
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveBasic}
              saving={saving}
            />
          )}

          {section === 'design' && (
            <DesignSection
              session={session}
              formData={formData}
              templates={templates}
              qnaTemplates={qnaTemplates}
              pollTemplates={pollTemplates}
              template={template}
              templateFields={templateFields}
              assets={assets}
              previewData={previewData}
              setPreviewData={setPreviewData}
              setAssets={setAssets}
              adminDefaultData={adminDefaultData}
              previewDevice={previewDevice}
              setPreviewDevice={setPreviewDevice}
              iframeNonce={iframeNonce}
              leftWidth={leftWidth}
              containerRef={containerRef}
              onMouseDown={handleMouseDown}
              getPreviewSize={getPreviewSize}
              onTemplateChange={handleTemplateChange}
              onQnaTemplateChange={(v) => setFormData((p) => ({ ...p, qna_template_id: v }))}
              onPollTemplateChange={(v) => setFormData((p) => ({ ...p, poll_template_id: v }))}
              onImageUpload={handleImageUpload}
              onImageDelete={handleImageDelete}
              onUrlSave={handleUrlSave}
              onImageUrlSave={handleImageUrlSave}
              onSave={handleSaveBasic}
              saving={saving}
            />
          )}

          {section === 'people' && (
            <div className="p-8 max-w-5xl">
              <SectionHeader title="발표자 & 협업" desc="강연자를 등록하고, 함께 운영할 협업 파트너를 초대하세요." />
              {effectivePartner ? (
                <CollaborationPanel
                  sessionId={id}
                  partnerId={effectivePartner.id}
                  partnerType={effectivePartner.partner_type}
                  onUpdate={loadSession}
                />
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  파트너 정보를 불러올 수 없습니다.
                </div>
              )}
            </div>
          )}

          {section === 'content' && (
            <div className="p-8 max-w-5xl">
              <SectionHeader title="콘텐츠 준비" desc="강연 자료(PDF)·Q&A 카테고리·설문을 미리 준비해 두면, 라이브 콘솔에서 클릭 한 번으로 송출할 수 있습니다." />
              <Tabs defaultValue="lectures" className="w-full">
                <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-slate-200 dark:border-slate-800 bg-transparent p-0">
                  <TabsTrigger value="lectures" className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 -mb-px font-semibold text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-none">
                    <FileText className="w-4 h-4 mr-1.5" /> 강연 자료
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 -mb-px font-semibold text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-none">
                    <Tag className="w-4 h-4 mr-1.5" /> QnA 카테고리
                  </TabsTrigger>
                  <TabsTrigger value="polls" className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 -mb-px font-semibold text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-none">
                    <BarChart3 className="w-4 h-4 mr-1.5" /> 설문 관리
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="lectures" className="mt-4">
                  <LectureManager sessionId={id} />
                </TabsContent>
                <TabsContent value="categories" className="mt-4 space-y-4">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 flex items-center gap-3">
                    <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">실시간 Q&amp;A 모더레이션은 라이브 콘솔에서</div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300/80">여기서는 카테고리만 준비합니다. 강연 당일 질문 승인·송출은 라이브 진행 콘솔에서 진행됩니다.</div>
                    </div>
                    <Link
                      to={`/partner/sessions/${id}/console`}
                      className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
                    >
                      콘솔 열기 <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <QnaCategoryManager sessionId={id} />
                </TabsContent>
                <TabsContent value="polls" className="mt-4">
                  <ManagerPolls sessionId={id} sessionCode={session.code} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {section === 'rundown' && (
            <div className="p-8 max-w-5xl">
              <SectionHeader title="진행 순서" desc="강사별로 강연자료·설문·Q&A·안내 큐를 순서대로 짜 두면, 라이브 콘솔에서 큐마다 '송출' 버튼으로 진행합니다. 여기서 초기 순서를 구성하세요." />
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 mb-4 flex items-center gap-3">
                <ListChecks className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <div className="flex-1 text-xs text-indigo-700 dark:text-indigo-300/80">큐를 추가·정렬하는 곳입니다. 실제 송출은 라이브 진행 콘솔의 진행 플랜에서 큐별 "송출" 버튼으로 합니다.</div>
                <Link
                  to={`/partner/sessions/${id}/console`}
                  className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
                >
                  콘솔 열기 <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden" style={{ minHeight: '460px' }}>
                <RunOfShowPanel sessionId={id} live={false} editable />
              </div>
            </div>
          )}

          {section === 'participants' && (
            <div className="p-8 max-w-5xl">
              <SectionHeader title="참가자" desc="현재까지 등록된 참가자 명단입니다." />
              <ParticipantManager sessionId={id} sessionCode={session.code} />
            </div>
          )}

          {section === 'publish' && (
            <PublishSection
              session={session}
              qrCodeUrl={qrCodeUrl}
              onShowQR={() => setShowQR(true)}
              onCopyCode={copyCode}
              onCopyLink={copyLink}
              onCopyPreviewLink={copyPreviewLink}
              onStatusChange={handleStatusChange}
              onDelete={() => setShowDeleteDialog(true)}
            />
          )}
        </main>
      </div>

      {/* QR 모달 */}
      <AlertDialog open={showQR} onOpenChange={setShowQR}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>참여 QR 코드</AlertDialogTitle>
            <AlertDialogDescription>
              청중이 휴대폰으로 스캔하면 참가 화면으로 이동합니다
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <img src={qrCodeUrl} alt="QR" className="w-64 h-64" />
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-bold tracking-widest">{session.code}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {window.location.origin}/join/{session.code}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction onClick={copyLink}>
              <Copy className="h-4 w-4 mr-2" /> 링크 복사
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>세션을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 참가자·질문·투표 데이터가 모두 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ============================================================
 * 좌측 섹션 네비
 * ============================================================ */
const SECTIONS = [
  { key: 'basic', label: '기본 정보', icon: FileText },
  { key: 'design', label: '화면 디자인', icon: Sliders },
  { key: 'people', label: '발표자 & 협업', icon: Users2 },
  { key: 'content', label: '콘텐츠 준비', icon: BarChart3 },
  { key: 'rundown', label: '진행 순서', icon: ListChecks },
  { key: 'participants', label: '참가자', icon: Users },
  { key: 'publish', label: '게시 & 공유', icon: Megaphone },
]

function SectionNav({ current, onChange, completionScore, status }) {
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto flex-shrink-0">
      <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-2 mb-2">준비 단계</div>
      <nav className="space-y-1 text-sm">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const active = current === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChange(s.key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="font-semibold">{s.label}</span>
            </button>
          )
        })}
      </nav>

      {status === 'draft' && (
        <div className="mt-6 bg-indigo-50 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-1">
            <Megaphone className="w-4 h-4" /> {completionScore < 100 ? '준비 진행 중' : '준비 완료!'}
          </div>
          <p className="text-xs text-indigo-600 leading-relaxed">
            {completionScore < 60
              ? '기본 정보·화면 디자인을 마치면 게시할 수 있어요.'
              : completionScore < 100
              ? '거의 다 됐습니다. 게시 & 공유 섹션에서 게시하세요.'
              : '게시 & 공유 섹션에서 청중에게 공개하세요.'}
          </p>
        </div>
      )}
    </aside>
  )
}

/* ============================================================
 * 섹션 헤더
 * ============================================================ */
function SectionHeader({ title, desc }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {desc && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{desc}</p>}
    </div>
  )
}

/* ============================================================
 * Section 1: 기본 정보
 * ============================================================ */
function BasicSection({ formData, setFormData, onSave, saving }) {
  const upd = (field, value) => setFormData((p) => ({ ...p, [field]: value }))
  return (
    <div className="p-8 max-w-3xl">
      <SectionHeader title="기본 정보" desc="청중 참가 화면에 표시되는 세션 정보입니다." />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <Field label="세션명" required>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => upd('title', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="시작 일시" required>
            <input
              type="datetime-local"
              value={formData.start_at}
              onChange={(e) => upd('start_at', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="종료 일시" required>
            <input
              type="datetime-local"
              value={formData.end_at}
              onChange={(e) => upd('end_at', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="장소명" required>
            <input
              type="text"
              value={formData.venue_name}
              onChange={(e) => upd('venue_name', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="최대 참가 인원" required>
            <input
              type="number"
              min="1"
              value={formData.max_participants}
              onChange={(e) => upd('max_participants', parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </Field>
        </div>
        <Field label="장소 주소" hint="(선택)">
          <input
            type="text"
            value={formData.venue_address}
            onChange={(e) => upd('venue_address', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="담당자 연락처" required>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => upd('contact_phone', formatKoreanPhone(e.target.value))}
              placeholder="010-1234-5678"
              maxLength={13}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="담당자 이메일" required>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => upd('contact_email', e.target.value)}
              placeholder="contact@example.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </Field>
        </div>
        <Field label="설명" hint="(선택)">
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => upd('description', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-400"
          />
        </Field>
      </div>
      <div className="flex justify-end mt-5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          저장
        </button>
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
        {hint && <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

/* ============================================================
 * Section 2: 화면 디자인 (템플릿 + 에셋 + 미리보기)
 * ============================================================ */
function DesignSection(props) {
  const {
    session,
    formData,
    templates,
    qnaTemplates,
    pollTemplates,
    template,
    templateFields,
    assets,
    previewData,
    setPreviewData,
    setAssets,
    adminDefaultData,
    previewDevice,
    setPreviewDevice,
    iframeNonce,
    leftWidth,
    containerRef,
    onMouseDown,
    getPreviewSize,
    onTemplateChange,
    onQnaTemplateChange,
    onPollTemplateChange,
    onImageUpload,
    onImageDelete,
    onUrlSave,
    onImageUrlSave,
    onSave,
    saving,
  } = props

  // 우측 미리보기 탭: 'join'(참가) | 'qna'(Q&A 송출) | 'poll'(투표)
  const [previewTab, setPreviewTab] = useState('join')

  // 좌측 아코디언 상태 배지 계산
  const imageFields = templateFields.filter((f) => f.field_type === 'image')
  const urlFields = templateFields.filter((f) => f.field_type === 'url')
  const requiredImageMissing = imageFields.filter(
    (f) => f.is_required && !assets[f.field_key]?.value,
  ).length
  const templateChosen = !!formData.template_id

  const code = session?.code
  // 각 탭은 실제 청중 라우트를 embed 모드로 iframe 렌더한다. iframeNonce로 저장 시 강제 리로드.
  // poll 전용 송출 라우트가 없어 투표는 청중 라이브 뷰(tab=now, 활성 투표 시 표시)로 매핑.
  const previewSrc = {
    join: `/join/${code}?preview=true&embed=true&n=${iframeNonce}`,
    qna: `/broadcast/${code}?embed=true&n=${iframeNonce}`,
    poll: `/live/${code}?preview=true&embed=true&tab=now&n=${iframeNonce}`,
  }
  const previewTabs = [
    { key: 'join', label: '참가' },
    { key: 'qna', label: 'Q&A' },
    { key: 'poll', label: '투표' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <SectionHeader title="화면 디자인" desc="템플릿을 고르고 로고·배너를 올린 뒤 오른쪽 미리보기로 확인하세요. 변경 후 좌측 하단 저장 버튼을 누르면 미리보기가 갱신됩니다." />
      </div>

      <div
        ref={containerRef}
        className="flex h-[calc(100vh-260px)] gap-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        {/* 좌측: 설정 (아코디언) */}
        <div className="flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800" style={{ width: `${leftWidth}%` }}>
          <div className="flex-1 overflow-y-auto">
            <Accordion type="multiple" defaultValue={['tpl', 'asset']} className="px-4">
              {/* ① 템플릿 */}
              <AccordionItem value="tpl">
                <AccordionTrigger>
                  <div className="flex flex-1 items-center justify-between pr-2">
                    <span className="font-bold text-sm">① 템플릿</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${templateChosen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                      {templateChosen ? '✓ 선택됨' : '⚠ 미선택'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2.5 text-sm">
                    {/* 참가 화면 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-300 flex-shrink-0">참가 화면</span>
                      <div className="flex items-center gap-1">
                        <Select value={formData.template_id} onValueChange={onTemplateChange}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((tp) => (
                              <SelectItem key={tp.id} value={tp.id}>
                                {tp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          title="전체화면으로 실제 화면 보기"
                          onClick={() => code && window.open(`/join/${code}?preview=true`, '_blank', 'noopener,noreferrer')}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 flex-shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Q&A 화면 */}
                    {qnaTemplates.length > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-300 flex-shrink-0">Q&amp;A 화면</span>
                        <div className="flex items-center gap-1">
                          <Select
                            value={formData.qna_template_id || 'none'}
                            onValueChange={(v) => onQnaTemplateChange(v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="참가 따름" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">참가 템플릿 따름</SelectItem>
                              {qnaTemplates.map((tp) => (
                                <SelectItem key={tp.id} value={tp.id}>
                                  {tp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            title="전체화면으로 실제 화면 보기"
                            onClick={() => code && window.open(`/broadcast/${code}`, '_blank', 'noopener,noreferrer')}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {/* 투표 화면 */}
                    {pollTemplates.length > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-300 flex-shrink-0">투표 화면</span>
                        <div className="flex items-center gap-1">
                          <Select
                            value={formData.poll_template_id || 'none'}
                            onValueChange={(v) => onPollTemplateChange(v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="참가 따름" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">참가 템플릿 따름</SelectItem>
                              {pollTemplates.map((tp) => (
                                <SelectItem key={tp.id} value={tp.id}>
                                  {tp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            title="전체화면으로 실제 화면 보기"
                            onClick={() => code && window.open(`/live/${code}?preview=true&tab=now`, '_blank', 'noopener,noreferrer')}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ② 이미지 / 에셋 */}
              <AccordionItem value="asset">
                <AccordionTrigger>
                  <div className="flex flex-1 items-center justify-between pr-2">
                    <span className="font-bold text-sm">② 이미지 / 에셋</span>
                    {imageFields.length > 0 && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${requiredImageMissing === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                        {requiredImageMissing === 0 ? '✓ 완료' : `⚠ 필수 ${requiredImageMissing}건 누락`}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {imageFields.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">참가 화면 템플릿을 먼저 선택하면 업로드할 이미지가 표시됩니다.</p>
                  ) : (
                    imageFields.map((field) => (
                      <AssetField
                        key={field.id}
                        field={field}
                        value={assets[field.field_key]?.value}
                        urlValue={previewData[field.field_key]}
                        onUploadFile={(file) => onImageUpload(field.field_key, file)}
                        onUrlChange={(v) => setPreviewData((p) => ({ ...p, [field.field_key]: v }))}
                        onUrlSave={() => onImageUrlSave(field.field_key, previewData[field.field_key])}
                        onDelete={() => onImageDelete(field.field_key)}
                      />
                    ))
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* ③ 링크 / 기타 설정 */}
              <AccordionItem value="links" className="border-b-0">
                <AccordionTrigger>
                  <span className="font-bold text-sm">③ 링크 / 기타 설정</span>
                </AccordionTrigger>
                <AccordionContent>
                  {urlFields.map((field) => (
                    <Card key={field.id} className="mb-3">
                      <CardContent className="p-3 space-y-2">
                        <Label className="text-sm">{field.field_name}</Label>
                        {field.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{field.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://"
                            value={previewData[field.field_key] || assets[field.field_key]?.url || ''}
                            onChange={(e) => {
                              setPreviewData((p) => ({ ...p, [field.field_key]: e.target.value }))
                              setAssets((p) => ({
                                ...p,
                                [field.field_key]: { ...p[field.field_key], url: e.target.value },
                              }))
                            }}
                            className="text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUrlSave(field.field_key, assets[field.field_key]?.url)}
                          >
                            저장
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      실제 화면 새 창으로 열기
                    </p>
                    <div className="space-y-1">
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to={`/join/${session.code}?preview=true`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" /> 참가 화면 (입장 페이지)
                        </Link>
                      </Button>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-2 leading-relaxed">
                        청중이 QR/링크로 처음 접속했을 때 보는 <b>입장 페이지</b>입니다. 이름·연락처를 입력하고 세션에 들어가는 화면이에요.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to={`/live/${session.code}?preview=true`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" /> 라이브 화면 (청중용)
                        </Link>
                      </Button>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-2 leading-relaxed">
                        입장 후 청중이 보는 <b>실제 참여 화면</b>입니다. 질문 작성, 투표 참여, 공지/일정 확인 탭이 표시돼요. (참가자 휴대폰 화면)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to={`/broadcast/${session.code}`} target="_blank">
                          <Monitor className="h-4 w-4 mr-2 flex-shrink-0" /> 송출 화면 (프로젝터/대형 모니터)
                        </Link>
                      </Button>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-2 leading-relaxed">
                        강연장 <b>프로젝터·대형 스크린</b>에 띄우는 송출용 화면입니다. 채택된 질문이 크게 표시되며, 청중이 자기 질문이 올라온 걸 볼 수 있어요.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 하단 sticky 저장 바 */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 flex-shrink-0">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
          </div>
        </div>

        {/* 리사이즈 핸들 */}
        <div
          className="w-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-300 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0"
          onMouseDown={onMouseDown}
        >
          <GripHorizontal className="h-5 w-5 text-slate-400 dark:text-slate-500 rotate-90" />
        </div>

        {/* 우측: 실제 화면 미리보기 (iframe 3탭) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-800/50" style={{ width: `${100 - leftWidth}%` }}>
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 gap-2">
            {/* 화면 탭 */}
            <div className="flex gap-1">
              {previewTabs.map((tabDef) => (
                <button
                  key={tabDef.key}
                  type="button"
                  onClick={() => setPreviewTab(tabDef.key)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    previewTab === tabDef.key
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tabDef.label}
                </button>
              ))}
            </div>
            {/* 기기 토글 */}
            <div className="flex gap-1 text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1.5 rounded ${previewDevice === 'tablet' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {code ? (
              <div className={`mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${getPreviewSize()}`} style={{ height: 'min(720px, calc(100vh - 360px))' }}>
                <iframe
                  key={`${previewTab}-${iframeNonce}`}
                  src={previewSrc[previewTab]}
                  title="청중 화면 미리보기"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 mt-10">세션 코드가 없어 미리보기를 표시할 수 없습니다.</p>
            )}
          </div>
          <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            미리보기는 <b>저장된 내용</b>을 보여줍니다. 변경 후 저장하면 자동으로 갱신돼요.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Section 6: 게시 & 공유
 * ============================================================ */
function PublishSection({
  session,
  qrCodeUrl,
  onShowQR,
  onCopyCode,
  onCopyLink,
  onCopyPreviewLink,
  onStatusChange,
  onDelete,
}) {
  return (
    <div className="p-8 max-w-3xl">
      <SectionHeader title="게시 & 공유" desc="세션을 게시하면 청중이 QR·코드로 입장할 수 있습니다." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* QR */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
          <h3 className="font-bold text-sm mb-3 text-left">참여 QR 코드</h3>
          {qrCodeUrl ? (
            <button
              type="button"
              onClick={onShowQR}
              className="block mx-auto rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img src={qrCodeUrl} alt="QR" className="w-40 h-40" />
            </button>
          ) : (
            <div className="w-40 h-40 bg-slate-100 dark:bg-slate-800 rounded-xl mx-auto flex items-center justify-center text-slate-400 dark:text-slate-500">
              <QrCode className="w-12 h-12" />
            </div>
          )}
          <button
            type="button"
            onClick={onShowQR}
            className="mt-3 text-sm font-semibold text-indigo-600 flex items-center gap-1 mx-auto hover:text-indigo-700"
          >
            <Eye className="w-4 h-4" /> 크게 보기
          </button>
        </div>

        {/* 참여 코드 & 링크 */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold text-sm mb-2">참여 코드</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-widest bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg flex-1 text-center">
                {session.code}
              </span>
              <button
                type="button"
                onClick={onCopyCode}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                title="코드 복사"
              >
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">청중은 이 코드로 입장</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
            <h3 className="font-bold text-sm mb-1">공유 링크</h3>
            <button
              type="button"
              onClick={onCopyLink}
              className="w-full text-left text-sm bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <LinkIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              <span className="truncate text-slate-700 dark:text-slate-300">참가 링크 복사</span>
            </button>
            <button
              type="button"
              onClick={onCopyPreviewLink}
              className="w-full text-left text-sm bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              <span className="truncate text-slate-700 dark:text-slate-300">미리보기 링크 복사</span>
            </button>
          </div>
        </div>
      </div>

      {/* 상태 워크플로 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-5">
        <h3 className="font-bold mb-1">상태 관리</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          현재 상태:{' '}
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_CONFIG[session.status]?.cls || ''}`}>
            {STATUS_CONFIG[session.status]?.label || session.status}
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          {session.status === 'draft' && (
            <button
              type="button"
              onClick={() => onStatusChange('published')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" /> 게시하기
            </button>
          )}
          {session.status === 'published' && (
            <>
              <Link
                to={`/partner/sessions/${session.id}/console`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> 라이브 시작 (콘솔)
              </Link>
              <button
                type="button"
                onClick={() => onStatusChange('draft')}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg"
              >
                게시 취소
              </button>
            </>
          )}
          {session.status === 'active' && (
            <>
              <Link
                to={`/partner/sessions/${session.id}/console`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Radio className="w-4 h-4" /> 진행 콘솔 열기
              </Link>
              <button
                type="button"
                onClick={() => onStatusChange('ended')}
                className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" /> 종료
              </button>
            </>
          )}
          {session.status === 'ended' && (
            <Link
              to={`/partner/sessions/${session.id}/report`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> 리포트 보기
            </Link>
          )}
        </div>
      </div>

      {/* 위험 구역 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 p-6">
        <h3 className="font-bold mb-1 text-rose-600">위험 구역</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">삭제하면 모든 데이터가 사라지며 되돌릴 수 없습니다.</p>
        <button
          type="button"
          onClick={onDelete}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> 세션 삭제
        </button>
      </div>
    </div>
  )
}

/* ============================================================
 * 상태 라벨 설정
 * ============================================================ */
const STATUS_CONFIG = {
  draft: { label: '준비중', cls: 'bg-amber-100 text-amber-700' },
  published: { label: '게시됨', cls: 'bg-sky-100 text-sky-700' },
  active: { label: '● LIVE', cls: 'bg-emerald-100 text-emerald-700' },
  ended: { label: '종료', cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  cancelled: { label: '취소됨', cls: 'bg-rose-100 text-rose-700' },
}
