import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { 
  Plus, 
  Edit, 
  Trash2, 
  LayoutTemplate,
  Image,
  Type,
  Link as LinkIcon,
  ToggleLeft,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  MonitorPlay
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * 화면 유형별 타이틀 및 설명
 */
const SCREEN_TYPE_CONFIG = {
  main: {
    titleKey: 'template.mainScreen',
    descKey: 'template.mainScreenDesc',
    title: '메인 화면 템플릿',
    desc: '세션 참여 페이지에 표시되는 메인 화면 템플릿을 관리합니다.'
  },
  qna: {
    titleKey: 'template.qnaScreen',
    descKey: 'template.qnaScreenDesc',
    title: '질문 화면 템플릿',
    desc: '질문 송출 시 프로젝터/대형 스크린에 표시되는 템플릿을 관리합니다.'
  },
  poll: {
    titleKey: 'template.pollScreen',
    descKey: 'template.pollScreenDesc',
    title: '설문 화면 템플릿',
    desc: '설문 진행 시 표시되는 화면 템플릿을 관리합니다.'
  }
}

/**
 * 관리자: 세션 템플릿 관리 페이지
 * @param {string} screenType - URL 파라미터로 받는 화면 유형 (main/qna/poll)
 */
export default function SessionTemplates() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { screenType = 'main' } = useParams()
  
  // 화면 유형 설정
  const screenConfig = SCREEN_TYPE_CONFIG[screenType] || SCREEN_TYPE_CONFIG.main
  
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 템플릿 편집 모달
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
    sort_order: 0
  })
  
  // 필드 관리 모달
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [fields, setFields] = useState([])
  
  // 필드 편집
  const [editFieldDialogOpen, setEditFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [fieldForm, setFieldForm] = useState({
    field_key: '',
    field_name: '',
    field_type: 'image',
    is_required: false,
    max_width: null,
    description: '',
    sort_order: 0
  })
  
  // 삭제 확인
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [deleteType, setDeleteType] = useState('template') // 'template' | 'field'

  /**
   * 템플릿 목록 로드 (screen_type 필터링)
   */
  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*, session_template_fields(count)')
        .eq('screen_type', screenType)
        .order('sort_order')
      
      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t, screenType])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  /**
   * 템플릿 필드 로드
   */
  const loadFields = async (templateId) => {
    try {
      const { data, error } = await supabase
        .from('session_template_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order')
      
      if (error) throw error
      setFields(data || [])
    } catch (error) {
      console.error('Error loading fields:', error)
      toast.error(t('error.loadFailed'))
    }
  }

  /**
   * 템플릿 저장
   */
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.code.trim()) {
      toast.error(t('template.error.required'))
      return
    }
    
    try {
      if (editingTemplate) {
        // 수정
        const { error } = await supabase
          .from('session_templates')
          .update({
            name: templateForm.name,
            code: templateForm.code,
            description: templateForm.description || null,
            is_active: templateForm.is_active,
            sort_order: templateForm.sort_order
          })
          .eq('id', editingTemplate.id)
        
        if (error) throw error
        toast.success(t('common.saved'))
      } else {
        // 생성 (screen_type 포함)
        const { error } = await supabase
          .from('session_templates')
          .insert({
            name: templateForm.name,
            code: templateForm.code,
            description: templateForm.description || null,
            is_active: templateForm.is_active,
            sort_order: templateForm.sort_order,
            screen_type: screenType
          })
        
        if (error) throw error
        toast.success(t('template.created'))
      }
      
      setEditDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(t('error.saveFailed'))
    }
  }

  /**
   * 필드 저장
   */
  const handleSaveField = async () => {
    if (!fieldForm.field_key.trim() || !fieldForm.field_name.trim()) {
      toast.error(t('template.error.fieldRequired'))
      return
    }
    
    try {
      if (editingField) {
        // 수정
        const { error } = await supabase
          .from('session_template_fields')
          .update({
            field_key: fieldForm.field_key,
            field_name: fieldForm.field_name,
            field_type: fieldForm.field_type,
            is_required: fieldForm.is_required,
            max_width: fieldForm.max_width || null,
            description: fieldForm.description || null,
            sort_order: fieldForm.sort_order
          })
          .eq('id', editingField.id)
        
        if (error) throw error
        toast.success(t('common.saved'))
      } else {
        // 생성
        const { error } = await supabase
          .from('session_template_fields')
          .insert({
            template_id: selectedTemplate.id,
            field_key: fieldForm.field_key,
            field_name: fieldForm.field_name,
            field_type: fieldForm.field_type,
            is_required: fieldForm.is_required,
            max_width: fieldForm.max_width || null,
            description: fieldForm.description || null,
            sort_order: fieldForm.sort_order
          })
        
        if (error) throw error
        toast.success(t('template.fieldCreated'))
      }
      
      setEditFieldDialogOpen(false)
      loadFields(selectedTemplate.id)
      loadTemplates() // 필드 수 업데이트
    } catch (error) {
      console.error('Error saving field:', error)
      toast.error(t('error.saveFailed'))
    }
  }

  /**
   * 삭제 처리
   */
  const handleDelete = async () => {
    try {
      if (deleteType === 'template') {
        const { error } = await supabase
          .from('session_templates')
          .delete()
          .eq('id', deletingItem.id)
        
        if (error) throw error
        toast.success(t('template.deleted'))
        loadTemplates()
      } else {
        const { error } = await supabase
          .from('session_template_fields')
          .delete()
          .eq('id', deletingItem.id)
        
        if (error) throw error
        toast.success(t('template.fieldDeleted'))
        loadFields(selectedTemplate.id)
        loadTemplates()
      }
      
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 템플릿 활성화 토글
   */
  const handleToggleActive = async (template) => {
    try {
      const { error } = await supabase
        .from('session_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)
      
      if (error) throw error
      toast.success(template.is_active ? t('template.deactivated') : t('template.activated'))
      loadTemplates()
    } catch (error) {
      console.error('Error toggling active:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 편집 모달 열기
   */
  const openEditDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateForm({
        name: template.name,
        code: template.code,
        description: template.description || '',
        is_active: template.is_active,
        sort_order: template.sort_order
      })
    } else {
      setEditingTemplate(null)
      setTemplateForm({
        name: '',
        code: '',
        description: '',
        is_active: true,
        sort_order: templates.length
      })
    }
    setEditDialogOpen(true)
  }

  /**
   * 필드 관리 모달 열기
   */
  const openFieldsDialog = async (template) => {
    setSelectedTemplate(template)
    await loadFields(template.id)
    setFieldsDialogOpen(true)
  }

  /**
   * 필드 편집 모달 열기
   */
  const openFieldEditDialog = (field = null) => {
    if (field) {
      setEditingField(field)
      setFieldForm({
        field_key: field.field_key,
        field_name: field.field_name,
        field_type: field.field_type,
        is_required: field.is_required,
        max_width: field.max_width,
        description: field.description || '',
        sort_order: field.sort_order
      })
    } else {
      setEditingField(null)
      setFieldForm({
        field_key: '',
        field_name: '',
        field_type: 'image',
        is_required: false,
        max_width: null,
        description: '',
        sort_order: fields.length
      })
    }
    setEditFieldDialogOpen(true)
  }

  /**
   * 필드 타입 아이콘
   */
  const getFieldTypeIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />
      case 'text': return <Type className="h-4 w-4" />
      case 'url': return <LinkIcon className="h-4 w-4" />
      case 'boolean': return <ToggleLeft className="h-4 w-4" />
      default: return <Type className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t(screenConfig.titleKey) || screenConfig.title}</h1>
          <p className="text-muted-foreground mt-1">{t(screenConfig.descKey) || screenConfig.desc}</p>
        </div>
        <Button onClick={() => openEditDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('template.create')}
        </Button>
      </div>

      {/* 템플릿 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('template.list')}</CardTitle>
          <CardDescription>{t('template.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('template.noTemplates')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('template.name')}</TableHead>
                  <TableHead>{t('template.code')}</TableHead>
                  <TableHead>{t('template.fields')}</TableHead>
                  <TableHead>{t('template.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template, index) => (
                  <TableRow key={template.id} className="odd:bg-muted/50">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{template.code}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.session_template_fields?.[0]?.count || 0} {t('template.fieldsCount')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <Badge className="bg-green-500">{t('template.active')}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">{t('template.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/adm/templates/${screenType}/${template.id}/preview`)}
                          title={t('template.preview')}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <MonitorPlay className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openFieldsDialog(template)}
                          title={t('template.manageFields')}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(template)}
                          title={template.is_active ? t('template.deactivate') : t('template.activate')}
                        >
                          {template.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(template)}
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingItem(template)
                            setDeleteType('template')
                            setDeleteDialogOpen(true)
                          }}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 템플릿 편집 모달 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('template.edit') : t('template.create')}
            </DialogTitle>
            <DialogDescription>
              {t('template.editDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('template.name')} *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder={t('template.namePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('template.code')} *</Label>
              <Input
                value={templateForm.code}
                onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder={t('template.codePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('template.codeHint')}</p>
            </div>
            
            <div className="space-y-2">
              <Label>{t('template.description')}</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder={t('template.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('template.isActive')}</Label>
              <Switch
                checked={templateForm.is_active}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('template.sortOrder')}</Label>
              <Input
                type="number"
                value={templateForm.sort_order}
                onChange={(e) => setTemplateForm({ ...templateForm, sort_order: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveTemplate}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 필드 관리 모달 */}
      <Dialog open={fieldsDialogOpen} onOpenChange={setFieldsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.name} - {t('template.manageFields')}
            </DialogTitle>
            <DialogDescription>
              {t('template.manageFieldsDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => openFieldEditDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('template.addField')}
              </Button>
            </div>
            
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('template.noFields')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('template.fieldName')}</TableHead>
                    <TableHead>{t('template.fieldKey')}</TableHead>
                    <TableHead>{t('template.fieldType')}</TableHead>
                    <TableHead>{t('template.required')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id} className="odd:bg-muted/50">
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{field.field_name}</p>
                          {field.description && (
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{field.field_key}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFieldTypeIcon(field.field_type)}
                          <span className="text-sm">{field.field_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {field.is_required ? (
                          <Badge variant="destructive" className="text-xs">{t('common.required')}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{t('common.optional')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openFieldEditDialog(field)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingItem(field)
                              setDeleteType('field')
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldsDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 필드 편집 모달 */}
      <Dialog open={editFieldDialogOpen} onOpenChange={setEditFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? t('template.editField') : t('template.addField')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('template.fieldName')} *</Label>
              <Input
                value={fieldForm.field_name}
                onChange={(e) => setFieldForm({ ...fieldForm, field_name: e.target.value })}
                placeholder={t('template.fieldNamePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('template.fieldKey')} *</Label>
              <Input
                value={fieldForm.field_key}
                onChange={(e) => setFieldForm({ ...fieldForm, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder={t('template.fieldKeyPlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('template.fieldType')}</Label>
              <Select
                value={fieldForm.field_type}
                onValueChange={(value) => setFieldForm({ ...fieldForm, field_type: value })}
              >
                <SelectTrigger>
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
            
            {fieldForm.field_type === 'image' && (
              <div className="space-y-2">
                <Label>{t('template.maxWidth')} (px)</Label>
                <Input
                  type="number"
                  value={fieldForm.max_width || ''}
                  onChange={(e) => setFieldForm({ ...fieldForm, max_width: parseInt(e.target.value) || null })}
                  placeholder="1920"
                  className="w-32"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>{t('template.fieldDescription')}</Label>
              <Input
                value={fieldForm.description}
                onChange={(e) => setFieldForm({ ...fieldForm, description: e.target.value })}
                placeholder={t('template.fieldDescriptionPlaceholder')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('template.isRequired')}</Label>
              <Switch
                checked={fieldForm.is_required}
                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, is_required: checked })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('template.sortOrder')}</Label>
              <Input
                type="number"
                value={fieldForm.sort_order}
                onChange={(e) => setFieldForm({ ...fieldForm, sort_order: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFieldDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveField}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'template' 
                ? t('template.deleteConfirm')
                : t('template.deleteFieldConfirm')
              }
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

