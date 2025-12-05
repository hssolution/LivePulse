import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Type,
  Link as LinkIcon,
  ToggleLeft,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  RefreshCw,
  GripHorizontal
} from 'lucide-react'

// 샘플 이미지 URL (플레이스홀더) - placehold.co 사용
const SAMPLE_IMAGES = {
  background_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  background: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  cover_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  logo: 'https://placehold.co/200x80/4F46E5/FFFFFF?text=LOGO',
  hero_banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=400&fit=crop',
  title_banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=400&fit=crop',
  schedule_banner: 'https://placehold.co/1200x300/10B981/FFFFFF?text=Schedule',
  sponsor_banner: 'https://placehold.co/1200x150/F59E0B/FFFFFF?text=Sponsors',
  footer_banner: 'https://placehold.co/1200x100/6B7280/FFFFFF?text=Footer',
  bottom_banner: 'https://placehold.co/1200x100/6B7280/FFFFFF?text=Footer',
}

// 샘플 텍스트 키 매핑
const SAMPLE_TEXT_KEYS = {
  title: 'sample.conferenceTitle',
  subtitle: 'sample.conferenceSubtitle',
  description: 'sample.conferenceDesc',
  date: 'sample.date',
  location: 'sample.location',
}

// 템플릿 코드별 번역 키 매핑 (SessionTemplates와 동일)
const TEMPLATE_TRANS_KEYS = {
  'symposium': { name: 'template.symposium', desc: 'template.symposiumDesc' },
  'conference': { name: 'template.conference', desc: 'template.conferenceDesc' },
  'workshop': { name: 'template.workshop', desc: 'template.workshopDesc' },
  'qna_default': { name: 'template.qnaDefault', desc: 'template.qnaDefaultDesc' },
  'qna_minimal': { name: 'template.qnaMinimal', desc: 'template.qnaMinimalDesc' },
  'poll_default': { name: 'template.pollDefault', desc: 'template.pollDefaultDesc' },
  'poll_chart': { name: 'template.pollChart', desc: 'template.pollChartDesc' },
}

/**
 * 템플릿 미리보기/편집 페이지
 * - 좌측: 필드 설정
 * - 우측: 실시간 미리보기
 * - 중앙: 리사이즈 핸들
 */
export default function TemplatePreview() {
  const { id, screenType = 'main' } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 미리보기 설정
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [sampleData, setSampleData] = useState({})
  
  // 패널 리사이즈
  const [leftWidth, setLeftWidth] = useState(40) // 퍼센트
  const containerRef = useRef(null)
  const isResizing = useRef(false)
  
  // 새 필드 추가 폼
  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState({
    field_key: '',
    field_name: '',
    field_type: 'image',
    is_required: false,
    max_width: null,
    description: ''
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
    
    // 최소 20%, 최대 70%
    if (newWidth >= 20 && newWidth <= 70) {
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
   * 템플릿 및 필드 로드
   */
  const loadTemplate = useCallback(async () => {
    setLoading(true)
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('session_templates')
        .select('*')
        .eq('id', id)
        .single()
      
      if (templateError) throw templateError
      setTemplate(templateData)
      
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('session_template_fields')
        .select('*')
        .eq('template_id', id)
        .order('sort_order')
      
      if (fieldsError) throw fieldsError
      setFields(fieldsData || [])
      
      // 샘플 데이터 초기화
      const initialSampleData = {}
      fieldsData?.forEach(field => {
        initialSampleData[field.field_key] = getDefaultSampleValue(field)
      })
      setSampleData(initialSampleData)
      
    } catch (error) {
      console.error('Error loading template:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  /**
   * 필드 타입에 따른 기본 샘플 값
   */
  const getDefaultSampleValue = (field) => {
    if (field.field_type === 'image') {
      return SAMPLE_IMAGES[field.field_key] || `https://placehold.co/800x400/3B82F6/FFFFFF?text=${encodeURIComponent(field.field_name)}`
    } else if (field.field_type === 'text') {
      return SAMPLE_TEXT_KEYS[field.field_key] ? t(SAMPLE_TEXT_KEYS[field.field_key]) : t('template.samplePrefix', { name: field.field_name })
    } else if (field.field_type === 'boolean') {
      return true
    } else if (field.field_type === 'url') {
      return 'https://example.com'
    }
    return ''
  }

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  /**
   * 필드 추가
   */
  const handleAddField = async () => {
    if (!newField.field_key.trim() || !newField.field_name.trim()) {
      toast.error(t('template.error.fieldRequired'))
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('session_template_fields')
        .insert({
          template_id: id,
          field_key: newField.field_key,
          field_name: newField.field_name,
          field_type: newField.field_type,
          is_required: newField.is_required,
          max_width: newField.max_width || null,
          description: newField.description || null,
          sort_order: fields.length
        })
        .select()
        .single()
      
      if (error) throw error
      
      const newFields = [...fields, data]
      setFields(newFields)
      
      // 새 필드에 대한 샘플 데이터 추가
      setSampleData(prev => ({
        ...prev,
        [data.field_key]: getDefaultSampleValue(data)
      }))
      
      setNewField({
        field_key: '',
        field_name: '',
        field_type: 'image',
        is_required: false,
        max_width: null,
        description: ''
      })
      setShowAddField(false)
      
      toast.success(t('template.fieldCreated'))
    } catch (error) {
      console.error('Error adding field:', error)
      toast.error(t('error.saveFailed'))
    }
  }

  /**
   * 필드 삭제
   */
  const handleDeleteField = async (fieldId, fieldKey) => {
    try {
      const { error } = await supabase
        .from('session_template_fields')
        .delete()
        .eq('id', fieldId)
      
      if (error) throw error
      
      setFields(fields.filter(f => f.id !== fieldId))
      setSampleData(prev => {
        const newData = { ...prev }
        delete newData[fieldKey]
        return newData
      })
      toast.success(t('template.fieldDeleted'))
    } catch (error) {
      console.error('Error deleting field:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 필드 순서 변경
   */
  const moveField = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= fields.length) return
    
    const newFields = [...fields]
    const temp = newFields[index]
    newFields[index] = newFields[newIndex]
    newFields[newIndex] = temp
    
    try {
      await Promise.all([
        supabase.from('session_template_fields').update({ sort_order: newIndex }).eq('id', temp.id),
        supabase.from('session_template_fields').update({ sort_order: index }).eq('id', newFields[index].id)
      ])
      setFields(newFields.map((f, i) => ({ ...f, sort_order: i })))
    } catch (error) {
      console.error('Error reordering fields:', error)
    }
  }

  /**
   * 필드 타입 아이콘
   */
  const getFieldTypeIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'text': return <Type className="h-4 w-4" />
      case 'url': return <LinkIcon className="h-4 w-4" />
      case 'boolean': return <ToggleLeft className="h-4 w-4" />
      default: return <Type className="h-4 w-4" />
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('template.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/adm/templates/${screenType}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-[calc(100vh-140px)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/adm/templates/${screenType}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {template && TEMPLATE_TRANS_KEYS[template.code] 
                ? t(TEMPLATE_TRANS_KEYS[template.code].name) 
                : template?.name}
            </h1>
            <p className="text-sm text-muted-foreground">{t('template.previewAndEdit')}</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadTemplate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 메인 컨텐츠 - 리사이즈 가능한 2컬럼 레이아웃 */}
      <div ref={containerRef} className="flex h-full gap-0 overflow-hidden rounded-lg border bg-background">
        {/* 좌측: 필드 설정 */}
        <div 
          className="overflow-y-auto border-r bg-card"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-card py-2 z-10">
              <div>
                <h2 className="font-semibold">{t('template.fieldSettings')}</h2>
                <p className="text-xs text-muted-foreground">{t('template.fieldCount', { count: fields.length })}</p>
              </div>
              <Button size="sm" onClick={() => setShowAddField(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('template.addField')}
              </Button>
            </div>

            {/* 새 필드 추가 폼 */}
            {showAddField && (
              <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('template.fieldName')}</Label>
                      <Input
                        value={newField.field_name}
                        onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                        placeholder={t('template.fieldNameExample')}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('template.fieldKey')}</Label>
                      <Input
                        value={newField.field_key}
                        onChange={(e) => setNewField({ ...newField, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        placeholder={t('template.fieldKeyExample')}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('template.fieldType')}</Label>
                      <Select
                        value={newField.field_type}
                        onValueChange={(value) => setNewField({ ...newField, field_type: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">{t('template.typeImage')}</SelectItem>
                          <SelectItem value="text">{t('template.typeText')}</SelectItem>
                          <SelectItem value="url">{t('template.typeUrl')}</SelectItem>
                          <SelectItem value="boolean">{t('template.typeBoolean')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Switch
                        checked={newField.is_required}
                        onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
                      />
                      <Label className="text-xs">{t('template.required')}</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddField(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button size="sm" onClick={handleAddField}>
                      {t('common.add')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 필드 목록 */}
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('template.noFields')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {/* 순서 버튼 */}
                        <div className="flex flex-col items-center gap-0.5 pt-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                          >
                            <span className="text-[10px]">▲</span>
                          </Button>
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === fields.length - 1}
                          >
                            <span className="text-[10px]">▼</span>
                          </Button>
                        </div>

                        {/* 필드 정보 */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {getFieldTypeIcon(field.field_type)}
                              <span className="font-medium text-sm truncate">{field.field_name}</span>
                              {field.is_required && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">{t('common.required')}</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                              onClick={() => handleDeleteField(field.id, field.field_key)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                          
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded block truncate">{field.field_key}</code>

                          {/* 샘플 데이터 입력 */}
                          {field.field_type === 'image' && (
                            <div className="flex items-center gap-2">
                              <Input
                                value={sampleData[field.field_key] || ''}
                                onChange={(e) => setSampleData({ ...sampleData, [field.field_key]: e.target.value })}
                                placeholder={t('template.imageUrlPlaceholder')}
                                className="h-7 text-xs flex-1"
                              />
                              {sampleData[field.field_key] && (
                                <img 
                                  src={sampleData[field.field_key]} 
                                  alt={field.field_name}
                                  className="h-7 w-10 object-cover rounded flex-shrink-0"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                            </div>
                          )}
                          {field.field_type === 'text' && (
                            <Input
                              value={sampleData[field.field_key] || ''}
                              onChange={(e) => setSampleData({ ...sampleData, [field.field_key]: e.target.value })}
                              placeholder={t('template.sampleTextPlaceholder')}
                              className="h-7 text-xs"
                            />
                          )}
                          {field.field_type === 'boolean' && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={sampleData[field.field_key] || false}
                                onCheckedChange={(checked) => setSampleData({ ...sampleData, [field.field_key]: checked })}
                              />
                              <span className="text-xs text-muted-foreground">
                                {sampleData[field.field_key] ? t('common.enabled') : t('common.disabled')}
                              </span>
                            </div>
                          )}
                          {field.field_type === 'url' && (
                            <Input
                              value={sampleData[field.field_key] || ''}
                              onChange={(e) => setSampleData({ ...sampleData, [field.field_key]: e.target.value })}
                              placeholder="https://example.com"
                              className="h-7 text-xs"
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
          <div className="flex items-center justify-between p-3 border-b bg-card flex-shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="font-semibold text-sm">{t('template.preview')}</span>
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
          
          <div className="flex-1 overflow-auto p-4">
            <div className={`mx-auto bg-background rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${getPreviewSize()}`}>
              <DynamicTemplateRenderer 
                fields={fields} 
                sampleData={sampleData}
                device={previewDevice}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 동적 템플릿 렌더러 컴포넌트
 * 필드 목록을 기반으로 자동으로 렌더링
 */
function DynamicTemplateRenderer({ fields, sampleData, device }) {
  const { t } = useLanguage()
  
  // 필드 값 가져오기
  const getFieldValue = (key) => sampleData[key] || null
  
  // 필드 타입별 그룹화
  const imageFields = fields.filter(f => f.field_type === 'image')
  const textFields = fields.filter(f => f.field_type === 'text')
  const booleanFields = fields.filter(f => f.field_type === 'boolean')
  
  // 배경 이미지 찾기 (키워드 기반)
  const backgroundField = imageFields.find(f => 
    f.field_key.includes('background') || f.field_key.includes('cover')
  )
  const backgroundImage = backgroundField ? getFieldValue(backgroundField.field_key) : null
  
  // 로고 찾기
  const logoField = imageFields.find(f => f.field_key.includes('logo'))
  const logoImage = logoField ? getFieldValue(logoField.field_key) : null
  
  // 배너 이미지들 (배경, 로고 제외)
  const bannerFields = imageFields.filter(f => 
    !f.field_key.includes('background') && 
    !f.field_key.includes('cover') && 
    !f.field_key.includes('logo')
  )

  if (fields.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-muted/50">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="font-medium">{t('template.noFieldsPreview')}</p>
          <p className="text-sm">{t('template.addFieldsToPreview')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[400px] relative">
      {/* 배경 이미지 */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* 콘텐츠 */}
      <div className={`relative z-10 p-6 space-y-4 ${!backgroundImage ? 'bg-gradient-to-br from-slate-800 to-slate-900' : ''}`}>
        {/* 로고 */}
        {logoImage && (
          <div className="flex justify-center">
            <img 
              src={logoImage} 
              alt="Logo" 
              className={`${device === 'mobile' ? 'h-8' : 'h-12'} object-contain`}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        {/* 배너 이미지들 (순서대로) */}
        {bannerFields.map((field) => {
          const value = getFieldValue(field.field_key)
          if (!value) return null
          
          return (
            <div key={field.id} className="rounded-lg overflow-hidden shadow-lg">
              <img 
                src={value} 
                alt={field.field_name} 
                className="w-full h-auto object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {field.field_name}
              </div>
            </div>
          )
        })}

        {/* 텍스트 필드들 */}
        {textFields.length > 0 && (
          <div className="text-center space-y-2">
            {textFields.map((field) => {
              const value = getFieldValue(field.field_key)
              if (!value) return null
              
              // 키워드에 따라 스타일 결정
              const isTitle = field.field_key.includes('title')
              const isSubtitle = field.field_key.includes('subtitle')
              const isDescription = field.field_key.includes('description') || field.field_key.includes('desc')
              
              if (isTitle) {
                return (
                  <h1 key={field.id} className={`font-bold text-white ${device === 'mobile' ? 'text-xl' : 'text-3xl'}`}>
                    {value}
                  </h1>
                )
              }
              if (isSubtitle) {
                return (
                  <p key={field.id} className={`text-white/80 ${device === 'mobile' ? 'text-sm' : 'text-lg'}`}>
                    {value}
                  </p>
                )
              }
              if (isDescription) {
                return (
                  <p key={field.id} className={`text-white/70 ${device === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                    {value}
                  </p>
                )
              }
              
              // 기타 텍스트
              return (
                <div key={field.id} className="flex items-center justify-center gap-2 text-white/90">
                  <span className={device === 'mobile' ? 'text-sm' : ''}>{value}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* 참여 버튼 (boolean 필드 중 show_join_button 등) */}
        {booleanFields.some(f => f.field_key.includes('button') && getFieldValue(f.field_key)) && (
          <div className="flex justify-center pt-4">
            <button className={`bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-full shadow-lg ${device === 'mobile' ? 'px-6 py-2 text-sm' : 'px-8 py-3 text-lg'}`}>
              {t('session.joinNow')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
