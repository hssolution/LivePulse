import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { HtmlContent } from '@/components/ui/html-content'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  MoreVertical,
  Trash2,
  Edit,
  BarChart3,
  ListChecks,
  MessageSquare,
  CheckSquare,
  GripVertical,
  X,
  ExternalLink,
  ClipboardList,
  Eye,
  EyeOff
} from 'lucide-react'
import { format } from 'date-fns'

/**
 * 파트너용 설문 관리 컴포넌트
 * - 설문 CRUD
 * - 동적 보기 추가/삭제
 * - 설문 결과 보기
 * - 결과 보기
 */
export default function ManagerPolls({ sessionId, sessionCode }) {
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [polls, setPolls] = useState([])
  
  // 설문 편집 다이얼로그
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPoll, setEditingPoll] = useState(null)
  const [pollForm, setPollForm] = useState({
    question: '',
    poll_type: 'single',
    is_required: false,
    show_results: true,
    allow_anonymous: true,
    max_selections: null,
  })
  const [options, setOptions] = useState([{ text: '' }, { text: '' }])
  const [saving, setSaving] = useState(false)
  
  // 결과 다이얼로그
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState(null)
  const [pollResults, setPollResults] = useState(null)
  
  // 삭제 확인
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingPoll, setDeletingPoll] = useState(null)

  /**
   * 설문 목록 로드
   */
  const loadPolls = useCallback(async () => {
    if (!sessionId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*, poll_options(id, option_text, display_order)')
        .eq('session_id', sessionId)
        .order('display_order')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPolls(data || [])
    } catch (error) {
      console.error('Error loading polls:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadPolls()
  }, [loadPolls])

  /**
   * 새 설문 다이얼로그 열기
   */
  const openNewDialog = () => {
    setEditingPoll(null)
    setPollForm({
      question: '',
      poll_type: 'single',
      is_required: false,
      show_results: true,
      allow_anonymous: true,
      max_selections: null,
    })
    setOptions([{ text: '' }, { text: '' }])
    setShowEditDialog(true)
  }

  /**
   * 편집 다이얼로그 열기
   */
  const openEditDialog = (poll) => {
    setEditingPoll(poll)
    setPollForm({
      question: poll.question,
      poll_type: poll.poll_type,
      is_required: poll.is_required,
      show_results: poll.show_results,
      allow_anonymous: poll.allow_anonymous,
      max_selections: poll.max_selections,
    })
    setOptions(
      poll.poll_options?.length > 0 
        ? poll.poll_options.map(o => ({ id: o.id, text: o.option_text }))
        : [{ text: '' }, { text: '' }]
    )
    setShowEditDialog(true)
  }

  /**
   * 보기 추가
   */
  const addOption = () => {
    setOptions([...options, { text: '' }])
  }

  /**
   * 보기 삭제
   */
  const removeOption = (index) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  /**
   * 보기 텍스트 변경
   */
  const updateOption = (index, text) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], text }
    setOptions(newOptions)
  }

  /**
   * 설문 저장
   */
  const handleSave = async () => {
    if (!pollForm.question.trim()) {
      toast.error(t('poll.error.questionRequired'))
      return
    }
    
    // 선택형은 최소 2개 보기 필요
    if (pollForm.poll_type !== 'open') {
      const validOptions = options.filter(o => o.text.trim())
      if (validOptions.length < 2) {
        toast.error(t('poll.error.minOptions'))
        return
      }
    }
    
    setSaving(true)
    try {
      if (editingPoll) {
        // 수정
        const { error: pollError } = await supabase
          .from('polls')
          .update({
            question: pollForm.question,
            poll_type: pollForm.poll_type,
            is_required: pollForm.is_required,
            show_results: pollForm.show_results,
            allow_anonymous: pollForm.allow_anonymous,
            max_selections: pollForm.poll_type === 'multiple' ? pollForm.max_selections : null,
          })
          .eq('id', editingPoll.id)
        
        if (pollError) throw pollError
        
        // 보기 업데이트 (삭제 후 재생성)
        if (pollForm.poll_type !== 'open') {
          await supabase.from('poll_options').delete().eq('poll_id', editingPoll.id)
          
          const validOptions = options.filter(o => o.text.trim())
          if (validOptions.length > 0) {
            const { error: optionsError } = await supabase
              .from('poll_options')
              .insert(validOptions.map((o, i) => ({
                poll_id: editingPoll.id,
                option_text: o.text.trim(),
                display_order: i
              })))
            
            if (optionsError) throw optionsError
          }
        }
        
        toast.success(t('common.saved'))
      } else {
        // 새로 생성 (기본 상태: active - 노출)
        const { data: newPoll, error: pollError } = await supabase
          .from('polls')
          .insert({
            session_id: sessionId,
            question: pollForm.question,
            poll_type: pollForm.poll_type,
            is_required: pollForm.is_required,
            show_results: pollForm.show_results,
            allow_anonymous: pollForm.allow_anonymous,
            max_selections: pollForm.poll_type === 'multiple' ? pollForm.max_selections : null,
            display_order: polls.length,
            status: 'active', // 기본 노출
          })
          .select()
          .single()
        
        if (pollError) throw pollError
        
        // 보기 생성
        if (pollForm.poll_type !== 'open') {
          const validOptions = options.filter(o => o.text.trim())
          if (validOptions.length > 0) {
            const { error: optionsError } = await supabase
              .from('poll_options')
              .insert(validOptions.map((o, i) => ({
                poll_id: newPoll.id,
                option_text: o.text.trim(),
                display_order: i
              })))
            
            if (optionsError) throw optionsError
          }
        }
        
        toast.success(t('poll.created'))
      }
      
      setShowEditDialog(false)
      loadPolls()
    } catch (error) {
      console.error('Error saving poll:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * 결과 보기
   */
  const handleViewResults = async (poll) => {
    setSelectedPoll(poll)
    
    try {
      const { data, error } = await supabase.rpc('get_poll_results', {
        p_poll_id: poll.id
      })
      
      if (error) throw error
      setPollResults(data)
      setShowResultsDialog(true)
    } catch (error) {
      console.error('Error getting results:', error)
      toast.error(t('error.loadFailed'))
    }
  }

  /**
   * 노출/비노출 토글
   */
  const handleToggleVisibility = async (poll) => {
    const newStatus = poll.status === 'active' ? 'draft' : 'active'
    
    try {
      const { error } = await supabase
        .from('polls')
        .update({ status: newStatus })
        .eq('id', poll.id)
      
      if (error) throw error
      
      toast.success(newStatus === 'active' ? t('poll.shown') : t('poll.hidden'))
      loadPolls()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 설문 삭제
   */
  const handleDelete = async () => {
    if (!deletingPoll) return
    
    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', deletingPoll.id)
      
      if (error) throw error
      
      toast.success(t('common.deleted'))
      setShowDeleteDialog(false)
      setDeletingPoll(null)
      loadPolls()
    } catch (error) {
      console.error('Error deleting poll:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 설문 타입 아이콘
   */
  const getPollTypeIcon = (type) => {
    switch (type) {
      case 'single': return <ListChecks className="h-4 w-4" />
      case 'multiple': return <CheckSquare className="h-4 w-4" />
      case 'open': return <MessageSquare className="h-4 w-4" />
      default: return <ListChecks className="h-4 w-4" />
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      draft: { label: t('poll.statusDraft'), className: 'bg-gray-500/10 text-gray-600' },
      active: { label: t('poll.statusActive'), className: 'bg-green-500/10 text-green-600' },
      closed: { label: t('poll.statusClosed'), className: 'bg-red-500/10 text-red-600' },
    }
    const c = config[status] || config.draft
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{t('poll.management')}</h3>
          <p className="text-sm text-muted-foreground">{t('poll.managementDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 청중 응답 화면 버튼 (미리보기 모드) */}
          {sessionCode && (
            <Link to={`/live/${sessionCode}?tab=poll&preview=true`} target="_blank">
              <Button variant="outline" className="bg-purple-500 hover:bg-purple-600 text-white border-purple-500">
                <ClipboardList className="h-4 w-4 mr-2" />
                {t('poll.responseScreen')}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          )}
          
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('poll.create')}
          </Button>
        </div>
      </div>

      {/* 설문 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : polls.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('poll.noPolls')}</p>
            <Button variant="outline" className="mt-4" onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t('poll.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <Card key={poll.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* 상태 및 타입 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getStatusBadge(poll.status)}
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                        {getPollTypeIcon(poll.poll_type)}
                        <span className="ml-1">{t(`poll.type.${poll.poll_type}`)}</span>
                      </Badge>
                      {poll.is_required && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                          {t('poll.required')}
                        </Badge>
                      )}
                      {poll.poll_options?.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {poll.poll_options.length} {t('poll.options')}
                        </span>
                      )}
                    </div>
                    
                    {/* 질문 */}
                    <div className="font-medium">
                      <HtmlContent 
                        html={poll.question}
                        expandable={true}
                        maxImageHeight={100}
                        showImagePreview={true}
                      />
                    </div>
                    
                    {/* 보기 전체 표시 */}
                    {poll.poll_type !== 'open' && poll.poll_options?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {poll.poll_options.map((opt, i) => (
                          <Badge key={i} variant="secondary" className="font-normal text-xs">
                            {opt.option_text}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* 메타 */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(poll.created_at), 'MM.dd HH:mm')}</span>
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1">
                    {/* 노출/비노출 토글 버튼 */}
                    <Button 
                      variant={poll.status === 'active' ? "default" : "ghost"}
                      size="icon"
                      onClick={() => handleToggleVisibility(poll)}
                      title={poll.status === 'active' ? t('poll.hide') : t('poll.show')}
                      className={poll.status === 'active' 
                        ? "bg-green-500 hover:bg-green-600 text-white" 
                        : "text-muted-foreground hover:bg-muted"
                      }
                    >
                      {poll.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleViewResults(poll)}
                      title={t('poll.viewResults')}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(poll)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => { setDeletingPoll(poll); setShowDeleteDialog(true) }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 편집 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPoll ? t('poll.edit') : t('poll.create')}
            </DialogTitle>
            <DialogDescription>
              {t('poll.editDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 질문 */}
            <div className="space-y-2">
              <Label>{t('poll.question')}</Label>
              <RichTextEditor
                value={pollForm.question}
                onChange={(html) => setPollForm({ ...pollForm, question: html })}
                placeholder={t('poll.questionPlaceholder')}
                minHeight={100}
                maxHeight={200}
                enableImage={true}
                simple={true}
              />
            </div>
            
            {/* 타입 */}
            <div className="space-y-2">
              <Label>{t('poll.pollType')}</Label>
              <Select
                value={pollForm.poll_type}
                onValueChange={(value) => setPollForm({ ...pollForm, poll_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t('poll.type.single')}</SelectItem>
                  <SelectItem value="multiple">{t('poll.type.multiple')}</SelectItem>
                  <SelectItem value="open">{t('poll.type.open')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 복수선택 시 최대 선택 수 */}
            {pollForm.poll_type === 'multiple' && (
              <div className="space-y-2">
                <Label>{t('poll.maxSelections')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={pollForm.max_selections || ''}
                  onChange={(e) => setPollForm({ ...pollForm, max_selections: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder={t('poll.maxSelectionsPlaceholder')}
                />
              </div>
            )}
            
            {/* 보기 (주관식 제외) */}
            {pollForm.poll_type !== 'open' && (
              <div className="space-y-2">
                <Label>{t('poll.options')}</Label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`${t('poll.option')} ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('poll.addOption')}
                  </Button>
                </div>
              </div>
            )}
            
            {/* 옵션 */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>{t('poll.showResults')}</Label>
                <Switch
                  checked={pollForm.show_results}
                  onCheckedChange={(checked) => setPollForm({ ...pollForm, show_results: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('poll.allowAnonymous')}</Label>
                <Switch
                  checked={pollForm.allow_anonymous}
                  onCheckedChange={(checked) => setPollForm({ ...pollForm, allow_anonymous: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('poll.isRequired')}</Label>
                <Switch
                  checked={pollForm.is_required}
                  onCheckedChange={(checked) => setPollForm({ ...pollForm, is_required: checked })}
                />
              </div>
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

      {/* 결과 다이얼로그 */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('poll.results')}</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2">
                <HtmlContent html={selectedPoll?.question || ''} />
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {pollResults && (
            <div className="space-y-4">
              <div className="text-center text-muted-foreground">
                {t('poll.totalResponses')}: <span className="font-bold text-foreground">{pollResults.total_responses}</span>
              </div>
              
              {pollResults.poll_type === 'open' ? (
                // 주관식 응답 목록
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pollResults.results?.length > 0 ? (
                    pollResults.results.map((r, i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          {/* 응답 내용이 HTML일 수 있으므로 HtmlContent 사용하거나 텍스트로 처리 */}
                          <p className="text-sm whitespace-pre-wrap">{r.text}</p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">{t('poll.noResponses')}</p>
                  )}
                </div>
              ) : (
                // 선택형 차트
                <div className="space-y-3">
                  {pollResults.results?.map((r) => (
                    <div key={r.option_id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{r.option_text}</span>
                        <span className="font-medium">{r.count} ({r.percentage}%)</span>
                      </div>
                      <div className="h-6 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('poll.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('poll.deleteConfirmDesc')}
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

