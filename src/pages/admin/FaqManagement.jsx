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
  Plus, 
  Loader2, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Building2, 
  Briefcase, 
  Mic, 
  Globe, 
  GripVertical, 
  Search
} from 'lucide-react'
import { format } from 'date-fns'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/**
 * 드래그 가능한 FAQ 카드
 */
function SortableFaqCard({ faq, onEdit, onDelete, onToggle, t }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`transition-all ${!faq.is_active ? 'opacity-60' : ''}`}
    >
      <CardContent className="pt-4">
        <div className="flex gap-3">
          {/* 드래그 핸들 */}
          <div 
            {...attributes} 
            {...listeners}
            className="flex items-center cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {!faq.is_active && (
                <Badge variant="outline" className="bg-gray-500/10 text-gray-600">
                  {t('faq.inactive')}
                </Badge>
              )}
            </div>
            
            <p className="font-medium mb-2">{faq.question}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{format(new Date(faq.created_at), 'yyyy.MM.dd')}</span>
            </div>
          </div>
          
          {/* 액션 버튼 */}
          <div className="flex items-start gap-1">
            <Button 
              variant={faq.is_active ? "default" : "ghost"}
              size="icon"
              onClick={() => onToggle(faq)}
              title={faq.is_active ? t('faq.hide') : t('faq.show')}
              className={faq.is_active 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "text-muted-foreground"
              }
            >
              {faq.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => onEdit(faq)}>
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:bg-red-50"
              onClick={() => onDelete(faq)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 관리자 FAQ 관리 페이지
 */
export default function FaqManagement() {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [faqs, setFaqs] = useState([])
  const [activeCategory, setActiveCategory] = useState('common')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 편집 다이얼로그
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingFaq, setEditingFaq] = useState(null)
  const [faqForm, setFaqForm] = useState({
    category: 'common',
    question: '',
    answer: '',
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  
  // 삭제 확인
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingFaq, setDeletingFaq] = useState(null)

  // 드래그 센서
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const categories = [
    { id: 'common', labelKey: 'faq.categoryCommon', icon: Globe, colorClass: 'text-blue-500' },
    { id: 'organizer', labelKey: 'faq.categoryOrganizer', icon: Briefcase, colorClass: 'text-purple-500' },
    { id: 'agency', labelKey: 'faq.categoryAgency', icon: Building2, colorClass: 'text-orange-500' },
    { id: 'instructor', labelKey: 'faq.categoryInstructor', icon: Mic, colorClass: 'text-green-500' },
  ]

  /**
   * FAQ 목록 로드
   */
  const loadFaqs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('category', activeCategory)
        .order('display_order', { ascending: true })
      
      if (error) throw error
      setFaqs(data || [])
    } catch (error) {
      console.error('Error loading FAQs:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [activeCategory, t])

  useEffect(() => {
    loadFaqs()
  }, [loadFaqs])

  /**
   * 새 FAQ 다이얼로그 열기
   */
  const openNewDialog = () => {
    setEditingFaq(null)
    setFaqForm({
      category: activeCategory,
      question: '',
      answer: '',
      is_active: true
    })
    setShowEditDialog(true)
  }

  /**
   * 편집 다이얼로그 열기
   */
  const openEditDialog = (faq) => {
    setEditingFaq(faq)
    setFaqForm({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active
    })
    setShowEditDialog(true)
  }

  /**
   * FAQ 저장
   */
  const handleSave = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error(t('error.requiredFields'))
      return
    }

    setSaving(true)
    try {
      if (editingFaq) {
        // 수정
        const { error } = await supabase
          .from('faqs')
          .update({
            category: faqForm.category,
            question: faqForm.question,
            answer: faqForm.answer,
            is_active: faqForm.is_active
          })
          .eq('id', editingFaq.id)
        
        if (error) throw error
        toast.success(t('common.saved'))
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('faqs')
          .insert({
            category: faqForm.category,
            question: faqForm.question,
            answer: faqForm.answer,
            is_active: faqForm.is_active,
            display_order: faqs.length,
            created_by: user.id
          })
        
        if (error) throw error
        toast.success(t('faq.created'))
      }
      
      setShowEditDialog(false)
      loadFaqs()
    } catch (error) {
      console.error('Error saving FAQ:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * 활성화 토글
   */
  const handleToggle = async (faq) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ is_active: !faq.is_active })
        .eq('id', faq.id)
      
      if (error) throw error
      toast.success(faq.is_active ? t('faq.hidden') : t('faq.shown'))
      loadFaqs()
    } catch (error) {
      console.error('Error toggling FAQ:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * FAQ 삭제
   */
  const handleDelete = async () => {
    if (!deletingFaq) return
    
    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', deletingFaq.id)
      
      if (error) throw error
      toast.success(t('common.deleted'))
      setShowDeleteDialog(false)
      setDeletingFaq(null)
      loadFaqs()
    } catch (error) {
      console.error('Error deleting FAQ:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 드래그 앤 드랍 완료
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const oldIndex = faqs.findIndex(f => f.id === active.id)
    const newIndex = faqs.findIndex(f => f.id === over.id)
    
    const newFaqs = arrayMove(faqs, oldIndex, newIndex)
    setFaqs(newFaqs)
    
    try {
      for (let i = 0; i < newFaqs.length; i++) {
        await supabase
          .from('faqs')
          .update({ display_order: i })
          .eq('id', newFaqs[i].id)
      }
      toast.success(t('faq.orderUpdated'))
    } catch (error) {
      console.error('Error updating order:', error)
      loadFaqs()
    }
  }

  // 검색 필터링
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 탭 아이템 컴포넌트
  const TabItem = ({ id, label, icon: Icon, colorClass }) => (
    <button
      onClick={() => setActiveCategory(id)}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
        ${activeCategory === id 
          ? `border-primary text-primary bg-primary/5` 
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}
      `}
    >
      <Icon className={`h-4 w-4 ${activeCategory === id ? colorClass : 'text-muted-foreground'}`} />
      {label}
    </button>
  )

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('faq.management')}</h2>
            <p className="text-muted-foreground mt-1">{t('faq.managementDesc')}</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('faq.create')}
          </Button>
        </div>

        {/* Compact Tabs */}
        <div className="flex items-center border-b overflow-x-auto">
          {categories.map(cat => (
            <TabItem 
              key={cat.id}
              id={cat.id} 
              label={t(cat.labelKey)} 
              icon={cat.icon}
              colorClass={cat.colorClass}
            />
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mb-4 w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* FAQ 리스트 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('faq.noFaqs')}</p>
              <Button variant="outline" className="mt-4" onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t('faq.createFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredFaqs.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredFaqs.map((faq) => (
                  <SortableFaqCard
                    key={faq.id}
                    faq={faq}
                    onEdit={openEditDialog}
                    onDelete={(f) => { setDeletingFaq(f); setShowDeleteDialog(true) }}
                    onToggle={handleToggle}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 편집 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? t('faq.edit') : t('faq.create')}
            </DialogTitle>
            <DialogDescription>
              {editingFaq ? t('faq.editDesc') : t('faq.createDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 카테고리 */}
            <div className="space-y-2">
              <Label>{t('faq.category')}</Label>
              <Select
                value={faqForm.category}
                onValueChange={(value) => setFaqForm({ ...faqForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {t(cat.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 질문 */}
            <div className="space-y-2">
              <Label>{t('faq.question')}</Label>
              <Input
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder={t('faq.questionPlaceholder')}
              />
            </div>
            
            {/* 답변 */}
            <div className="space-y-2">
              <Label>{t('faq.answer')}</Label>
              <Textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder={t('faq.answerPlaceholder')}
                rows={5}
              />
            </div>
            
            {/* 활성화 */}
            <div className="flex items-center justify-between">
              <Label>{t('faq.isActive')}</Label>
              <Switch
                checked={faqForm.is_active}
                onCheckedChange={(checked) => setFaqForm({ ...faqForm, is_active: checked })}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('faq.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('faq.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
