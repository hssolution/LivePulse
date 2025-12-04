import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Loader2, 
  ThumbsUp,
  MessageCircle,
  CheckCircle,
  Clock,
  Pin,
  PinOff,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  Radio,
  Monitor,
  MonitorOff,
  Mic,
  User,
  Plus,
  ExternalLink,
  Settings,
  GripVertical
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
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
 * 드래그 가능한 질문 카드 컴포넌트
 */
function SortableQuestionCard({ 
  question, 
  getStatusBadge,
  presenters,
  handleToggleBroadcast,
  handleToggleDisplay,
  handleTogglePin,
  handleToggleHighlight,
  handleToggleHide,
  handleDelete,
  handleApprove,
  handleAssignPresenter,
  openAnswerDialog,
  openRejectDialog,
  t
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`transition-all ${
        question.is_highlighted 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : question.is_pinned 
            ? 'border-yellow-500/50 bg-yellow-500/5' 
            : question.is_broadcasting
              ? 'border-red-500/50 bg-red-500/5 ring-2 ring-red-500/20'
              : question.status === 'pending'
                ? 'border-yellow-500/30'
                : ''
      }`}
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
          
          {/* 좋아요 수 */}
          <div className="flex flex-col items-center min-w-[50px]">
            <ThumbsUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{question.likes_count}</span>
          </div>
          
          {/* 질문 내용 */}
          <div className="flex-1 min-w-0">
            {/* 상태 및 배지 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {getStatusBadge(question.status)}
              {question.is_pinned && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                  <Pin className="h-3 w-3 mr-1" />
                  {t('qna.pin')}
                </Badge>
              )}
              {question.is_highlighted && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('qna.highlight')}
                </Badge>
              )}
              {question.is_broadcasting && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  {t('qna.broadcasting')}
                </Badge>
              )}
              {question.is_displayed && !question.is_broadcasting && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                  <Monitor className="h-3 w-3 mr-1" />
                  {t('qna.displayed')}
                </Badge>
              )}
              {question.presenter && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                  <Mic className="h-3 w-3 mr-1" />
                  {question.presenter.display_name}
                </Badge>
              )}
            </div>
            
            {/* 질문 내용 */}
            <p className="text-foreground">{question.content}</p>
            
            {/* 답변 */}
            {question.answer && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                <p className="text-sm font-medium text-primary mb-1">
                  {t('qna.answer')}
                </p>
                <p className="text-sm text-foreground">{question.answer}</p>
              </div>
            )}
            
            {/* 거부 사유 */}
            {question.status === 'rejected' && question.reject_reason && (
              <div className="mt-2 p-2 bg-red-500/10 rounded text-sm text-red-600">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {t('qna.rejectReason')}: {question.reject_reason}
              </div>
            )}
            
            {/* 메타 정보 */}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>
                {question.is_anonymous 
                  ? t('qna.anonymous') 
                  : (question.author_name || t('qna.anonymous'))
                }
              </span>
              <span>·</span>
              <span>{format(new Date(question.created_at), 'MM.dd HH:mm')}</span>
            </div>
          </div>
          
          {/* 액션 버튼 */}
          <div className="flex items-start gap-1">
            {/* 대기 중인 질문: 승인/거부 버튼 */}
            {question.status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-green-600 hover:bg-green-500/10"
                  onClick={() => handleApprove(question.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => openRejectDialog(question)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {/* 송출 버튼 (승인됨/답변됨 상태만) */}
            {(question.status === 'approved' || question.status === 'answered') && (
              <Button
                variant={question.is_broadcasting ? "default" : "ghost"}
                size="icon"
                className={question.is_broadcasting 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "text-blue-600 hover:bg-blue-500/10"
                }
                onClick={() => handleToggleBroadcast(question)}
                title={question.is_broadcasting ? t('qna.stopBroadcast') : t('qna.startBroadcast')}
              >
                <Radio className="h-4 w-4" />
              </Button>
            )}
            
            {/* 화면 표시 버튼 (승인됨/답변됨 상태만) */}
            {(question.status === 'approved' || question.status === 'answered') && (
              <Button
                variant={question.is_displayed ? "default" : "ghost"}
                size="icon"
                className={question.is_displayed 
                  ? "bg-blue-500 hover:bg-blue-600 text-white" 
                  : "text-muted-foreground hover:bg-blue-500/10"
                }
                onClick={() => handleToggleDisplay(question)}
                title={question.is_displayed ? t('qna.hideFromScreen') : t('qna.showOnScreen')}
              >
                {question.is_displayed ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
              </Button>
            )}
            
            {/* 답변 버튼 */}
            {(question.status === 'approved' || question.status === 'answered') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openAnswerDialog(question)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            
            {/* 더보기 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleTogglePin(question)}>
                  {question.is_pinned ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2" />
                      {t('qna.unpin')}
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2" />
                      {t('qna.pin')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleHighlight(question)}>
                  {question.is_highlighted ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('qna.unhighlight')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('qna.highlight')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleHide(question)}>
                  {question.status === 'hidden' ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('qna.unhide')}
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      {t('qna.hide')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* 강연자 지정 */}
                {presenters?.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {t('qna.assignPresenter')}
                    </div>
                    <DropdownMenuItem onClick={() => handleAssignPresenter(question.id, null)}>
                      <User className="h-4 w-4 mr-2" />
                      {t('qna.noPresenter')}
                    </DropdownMenuItem>
                    {presenters.map(p => (
                      <DropdownMenuItem 
                        key={p.id}
                        onClick={() => handleAssignPresenter(question.id, p.id)}
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        {p.display_name || p.manual_name}
                        {question.presenter_id === p.id && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => handleDelete(question.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('qna.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 파트너/관리자용 Q&A 관리 컴포넌트
 * - 질문 승인/거부
 * - 답변 작성
 * - 질문 관리 (고정, 하이라이트, 숨기기)
 * - 실시간 업데이트
 */
export default function ManagerQnA({ sessionId, sessionCode }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState([])
  const [presenters, setPresenters] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'approved' | 'answered'
  
  // 답변 다이얼로그
  const [showAnswerDialog, setShowAnswerDialog] = useState(false)
  const [answeringQuestion, setAnsweringQuestion] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  
  // 거부 다이얼로그
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectingQuestion, setRejectingQuestion] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  
  // 송출 중인 질문 ID
  const [broadcastingId, setBroadcastingId] = useState(null)
  
  // 질문 추가 다이얼로그
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    authorName: '',
    content: '',
    isAnonymous: false,
    autoApprove: true,
    presenterId: ''  // 강연자 선택 (선택사항)
  })
  
  // 송출 화면 설정 다이얼로그
  const [showBroadcastSettings, setShowBroadcastSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [broadcastSettings, setBroadcastSettings] = useState({
    width: 0,
    fontSize: 150,
    fontColor: '#c0392b',
    backgroundColor: '#ffffff',
    borderColor: '',
    innerBackgroundColor: '',
    textAlign: 'center',
    verticalAlign: 'center'
  })

  // 드래그 앤 드랍 센서
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /**
   * 드래그 앤 드랍 완료 핸들러
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const oldIndex = questions.findIndex(q => q.id === active.id)
    const newIndex = questions.findIndex(q => q.id === over.id)
    
    const newQuestions = arrayMove(questions, oldIndex, newIndex)
    setQuestions(newQuestions)
    
    // DB에 순서 저장
    try {
      const updates = newQuestions.map((q, index) => ({
        id: q.id,
        display_order: index
      }))
      
      for (const update of updates) {
        await supabase
          .from('questions')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
      
      toast.success(t('qna.orderUpdated'))
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error(t('error.updateFailed'))
      loadQuestions() // 실패 시 원래 순서로 복원
    }
  }

  /**
   * 송출 설정 로드
   */
  const loadBroadcastSettings = useCallback(async () => {
    if (!sessionId) return
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('broadcast_settings')
        .eq('id', sessionId)
        .single()
      
      if (error) throw error
      if (data?.broadcast_settings) {
        setBroadcastSettings(prev => ({ ...prev, ...data.broadcast_settings }))
      }
    } catch (error) {
      console.error('Error loading broadcast settings:', error)
    }
  }, [sessionId])

  /**
   * 송출 설정 저장
   */
  const handleSaveBroadcastSettings = async () => {
    setSavingSettings(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ broadcast_settings: broadcastSettings })
        .eq('id', sessionId)
      
      if (error) throw error
      toast.success(t('common.saved'))
      setShowBroadcastSettings(false)
    } catch (error) {
      console.error('Error saving broadcast settings:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSavingSettings(false)
    }
  }

  /**
   * 강사 목록 로드
   */
  const loadPresenters = useCallback(async () => {
    if (!sessionId) return
    
    try {
      const { data, error } = await supabase
        .from('session_presenters')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'confirmed')
        .order('display_order')
      
      if (error) throw error
      setPresenters(data || [])
    } catch (error) {
      console.error('Error loading presenters:', error)
    }
  }, [sessionId])

  /**
   * 질문 목록 로드
   */
  const loadQuestions = useCallback(async () => {
    if (!sessionId) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('questions')
        .select('*, presenter:session_presenters(id, display_name)')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true })
        .order('is_pinned', { ascending: false })
        .order('is_highlighted', { ascending: false })
        .order('created_at', { ascending: false })
      
      // 필터 적용
      if (filter === 'pending') {
        query = query.eq('status', 'pending')
      } else if (filter === 'approved') {
        query = query.eq('status', 'approved')
      } else if (filter === 'answered') {
        query = query.eq('status', 'answered')
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setQuestions(data || [])
      
      // 송출 중인 질문 확인
      const broadcasting = data?.find(q => q.is_broadcasting)
      setBroadcastingId(broadcasting?.id || null)
      
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId, filter])

  useEffect(() => {
    loadPresenters()
    loadQuestions()
    loadBroadcastSettings()
  }, [loadPresenters, loadQuestions, loadBroadcastSettings])

  /**
   * 실시간 구독
   */
  useEffect(() => {
    if (!sessionId) return
    
    const channel = supabase
      .channel(`manager-questions:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQuestions(prev => [payload.new, ...prev])
            if (payload.new.status === 'pending') {
              toast.info(t('qna.newQuestion'))
            }
          } else if (payload.eventType === 'UPDATE') {
            setQuestions(prev => 
              prev.map(q => q.id === payload.new.id ? payload.new : q)
            )
          } else if (payload.eventType === 'DELETE') {
            setQuestions(prev => prev.filter(q => q.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, t])

  /**
   * 질문 상태 변경
   */
  const updateQuestionStatus = async (questionId, status, additionalData = {}) => {
    try {
      const updateData = {
        status,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        ...additionalData
      }
      
      const { error } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', questionId)
      
      if (error) throw error
      
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error updating question:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 질문 승인
   */
  const handleApprove = (questionId) => {
    updateQuestionStatus(questionId, 'approved')
  }

  /**
   * 질문 거부
   */
  const handleReject = async () => {
    if (!rejectingQuestion) return
    
    await updateQuestionStatus(rejectingQuestion.id, 'rejected', {
      reject_reason: rejectReason || null
    })
    
    setShowRejectDialog(false)
    setRejectingQuestion(null)
    setRejectReason('')
  }

  /**
   * 질문 숨기기/보이기
   */
  const handleToggleHide = (question) => {
    const newStatus = question.status === 'hidden' ? 'approved' : 'hidden'
    updateQuestionStatus(question.id, newStatus)
  }

  /**
   * 고정/고정해제
   */
  const handleTogglePin = async (question) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_pinned: !question.is_pinned })
        .eq('id', question.id)
      
      if (error) throw error
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error toggling pin:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 하이라이트/해제
   */
  const handleToggleHighlight = async (question) => {
    try {
      // 다른 질문의 하이라이트 해제
      if (!question.is_highlighted) {
        await supabase
          .from('questions')
          .update({ is_highlighted: false })
          .eq('session_id', sessionId)
          .eq('is_highlighted', true)
      }
      
      const { error } = await supabase
        .from('questions')
        .update({ is_highlighted: !question.is_highlighted })
        .eq('id', question.id)
      
      if (error) throw error
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error toggling highlight:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 답변 등록
   */
  const handleSubmitAnswer = async () => {
    if (!answeringQuestion || !answerText.trim()) return
    
    setSubmittingAnswer(true)
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          answer: answerText.trim(),
          answered_by: user.id,
          answered_at: new Date().toISOString(),
          status: 'answered'
        })
        .eq('id', answeringQuestion.id)
      
      if (error) throw error
      
      toast.success(t('qna.answerSubmitted'))
      setShowAnswerDialog(false)
      setAnsweringQuestion(null)
      setAnswerText('')
    } catch (error) {
      console.error('Error submitting answer:', error)
      toast.error(t('error.answerSubmitFailed'))
    } finally {
      setSubmittingAnswer(false)
    }
  }

  /**
   * 질문 삭제
   */
  const handleDelete = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)
      
      if (error) throw error
      
      // 로컬 상태에서 즉시 제거
      setQuestions(prev => prev.filter(q => q.id !== questionId))
      toast.success(t('common.deleted'))
    } catch (error) {
      console.error('Error deleting question:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 질문 직접 등록
   */
  const handleAddQuestion = async () => {
    if (!newQuestion.content.trim()) {
      toast.error(t('qna.contentRequired'))
      return
    }
    
    setAddingQuestion(true)
    try {
      const insertData = {
        session_id: sessionId,
        content: newQuestion.content.trim(),
        author_name: newQuestion.isAnonymous ? null : (newQuestion.authorName.trim() || null),
        is_anonymous: newQuestion.isAnonymous,
        status: newQuestion.autoApprove ? 'approved' : 'pending',
        created_by_manager: true,
        presenter_id: newQuestion.presenterId || null  // 강연자 지정 (선택사항)
      }
      
      // 자동 승인인 경우 승인 정보 추가
      if (newQuestion.autoApprove) {
        insertData.moderated_by = user.id
        insertData.moderated_at = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('questions')
        .insert(insertData)
      
      if (error) throw error
      
      toast.success(t('qna.questionAdded'))
      setShowAddDialog(false)
      setNewQuestion({
        authorName: '',
        content: '',
        isAnonymous: false,
        autoApprove: true,
        presenterId: ''
      })
    } catch (error) {
      console.error('Error adding question:', error)
      toast.error(t('error.addFailed'))
    } finally {
      setAddingQuestion(false)
    }
  }

  /**
   * 강사 지정
   */
  const handleAssignPresenter = async (questionId, presenterId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ presenter_id: presenterId || null })
        .eq('id', questionId)
      
      if (error) throw error
      toast.success(t('qna.presenterAssigned'))
    } catch (error) {
      console.error('Error assigning presenter:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 질문 송출 토글
   */
  const handleToggleBroadcast = async (question) => {
    try {
      const { data, error } = await supabase.rpc('toggle_question_broadcast', {
        p_question_id: question.id
      })
      
      if (error) throw error
      
      if (data.success) {
        setBroadcastingId(data.is_broadcasting ? question.id : null)
        toast.success(data.is_broadcasting ? t('qna.broadcastStarted') : t('qna.broadcastStopped'))
      }
    } catch (error) {
      console.error('Error toggling broadcast:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 화면 표시 토글
   */
  const handleToggleDisplay = async (question) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_displayed: !question.is_displayed })
        .eq('id', question.id)
      
      if (error) throw error
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error toggling display:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      pending: { label: t('qna.statusPending'), icon: Clock, className: 'bg-yellow-500/10 text-yellow-600' },
      approved: { label: t('qna.statusApproved'), icon: Check, className: 'bg-blue-500/10 text-blue-600' },
      answered: { label: t('qna.statusAnswered'), icon: CheckCircle, className: 'bg-green-500/10 text-green-600' },
      hidden: { label: t('qna.statusHidden'), icon: EyeOff, className: 'bg-gray-500/10 text-gray-600' },
      rejected: { label: t('qna.statusRejected'), icon: X, className: 'bg-red-500/10 text-red-600' },
    }
    const c = config[status] || config.pending
    const Icon = c.icon
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    )
  }

  /**
   * 통계
   */
  const stats = {
    total: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    answered: questions.filter(q => q.status === 'answered').length,
  }

  /**
   * 답변 다이얼로그 열기
   */
  const openAnswerDialog = (question) => {
    setAnsweringQuestion(question)
    setAnswerText(question.answer || '')
    setShowAnswerDialog(true)
  }

  /**
   * 거부 다이얼로그 열기
   */
  const openRejectDialog = (question) => {
    setRejectingQuestion(question)
    setShowRejectDialog(true)
  }

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">{t('qna.totalQuestions')}</div>
          </CardContent>
        </Card>
        <Card className={stats.pending > 0 ? 'border-yellow-500/50' : ''}>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">{t('qna.pendingQuestions')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.answered}</div>
            <div className="text-xs text-muted-foreground">{t('qna.answeredQuestions')}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 탭 + 추가 버튼 */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">
              {t('qna.filterAll')} ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              {t('qna.filterPending')}
              {stats.pending > 0 && (
                <Badge className="ml-2 bg-yellow-500">{stats.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              {t('qna.filterUnanswered')}
            </TabsTrigger>
            <TabsTrigger value="answered">
              {t('qna.filterAnswered')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          {/* 송출 설정 버튼 */}
          <Button 
            variant="outline" 
            onClick={() => setShowBroadcastSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('broadcast.settings')}
          </Button>
          
          {/* 좌장 선택 버튼 */}
          {sessionCode && (
            <Link to={`/presenter/${sessionCode}`} target="_blank">
              <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white border-green-500">
                <Monitor className="h-4 w-4 mr-2" />
                {t('presenter.selectScreen')}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          )}
          
          {/* 송출 화면 버튼 */}
          {sessionCode && (
            <Link to={`/broadcast/${sessionCode}`} target="_blank">
              <Button variant="outline" className="bg-red-500 hover:bg-red-600 text-white border-red-500">
                <Radio className="h-4 w-4 mr-2" />
                {t('broadcast.screen')}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          )}
          
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('qna.addQuestion')}
          </Button>
        </div>
      </div>

      {/* 질문 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('qna.noQuestions')}</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map(q => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {questions.map((question) => (
                <SortableQuestionCard
                  key={question.id}
                  question={question}
                  getStatusBadge={getStatusBadge}
                  presenters={presenters}
                  handleToggleBroadcast={handleToggleBroadcast}
                  handleToggleDisplay={handleToggleDisplay}
                  handleTogglePin={handleTogglePin}
                  handleToggleHighlight={handleToggleHighlight}
                  handleToggleHide={handleToggleHide}
                  handleDelete={handleDelete}
                  handleApprove={handleApprove}
                  handleAssignPresenter={handleAssignPresenter}
                  openAnswerDialog={openAnswerDialog}
                  openRejectDialog={openRejectDialog}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 답변 다이얼로그 */}
      <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {answeringQuestion?.answer ? t('qna.editAnswer') : t('qna.answer')}
            </DialogTitle>
            <DialogDescription>
              {answeringQuestion?.content}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder={t('qna.answerPlaceholder')}
            rows={4}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnswerDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmitAnswer}
              disabled={submittingAnswer || !answerText.trim()}
            >
              {submittingAnswer && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('qna.submitAnswer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거부 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('qna.reject')}</DialogTitle>
            <DialogDescription>
              {rejectingQuestion?.content}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('qna.rejectReasonPlaceholder')}
            rows={3}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
            >
              {t('qna.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 질문 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('qna.addQuestion')}</DialogTitle>
            <DialogDescription>{t('qna.addQuestionDesc')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 익명 여부 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isAnonymous">{t('qna.anonymous')}</Label>
              <Switch
                id="isAnonymous"
                checked={newQuestion.isAnonymous}
                onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, isAnonymous: checked }))}
              />
            </div>
            
            {/* 작성자명 (익명 아닐 때만) */}
            {!newQuestion.isAnonymous && (
              <div className="space-y-2">
                <Label htmlFor="authorName">{t('qna.authorName')}</Label>
                <Input
                  id="authorName"
                  value={newQuestion.authorName}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, authorName: e.target.value }))}
                  placeholder={t('qna.authorNamePlaceholder')}
                />
              </div>
            )}
            
            {/* 강연자 선택 (선택사항) */}
            {presenters.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="presenterId">{t('qna.assignPresenter')}</Label>
                <Select
                  value={newQuestion.presenterId || 'none'}
                  onValueChange={(value) => setNewQuestion(prev => ({ ...prev, presenterId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.select')}</SelectItem>
                    {presenters.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name || p.manual_name || t('common.unknown')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* 질문 내용 */}
            <div className="space-y-2">
              <Label>{t('qna.questionContent')} *</Label>
              <Textarea
                value={newQuestion.content}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, content: e.target.value }))}
                placeholder={t('qna.questionPlaceholder')}
                rows={4}
              />
            </div>
            
            {/* 자동 승인 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoApprove">{t('qna.autoApprove')}</Label>
                <p className="text-xs text-muted-foreground">{t('qna.autoApproveDesc')}</p>
              </div>
              <Switch
                id="autoApprove"
                checked={newQuestion.autoApprove}
                onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, autoApprove: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAddQuestion}
              disabled={addingQuestion || !newQuestion.content.trim()}
            >
              {addingQuestion && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 송출 화면 설정 다이얼로그 */}
      <Dialog open={showBroadcastSettings} onOpenChange={setShowBroadcastSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('broadcast.settingsTitle')}</DialogTitle>
            <DialogDescription>
              {t('broadcast.settingsDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 너비 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.width')}</Label>
              <Input
                type="number"
                className="col-span-3"
                value={broadcastSettings.width}
                onChange={(e) => setBroadcastSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                placeholder="0 (자동)"
              />
            </div>
            
            {/* 폰트 크기 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.fontSize')}</Label>
              <Input
                type="number"
                className="col-span-3"
                value={broadcastSettings.fontSize}
                onChange={(e) => setBroadcastSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 100 }))}
              />
            </div>
            
            {/* 폰트 색상 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.fontColor')}</Label>
              <div className="col-span-3 flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 rounded border cursor-pointer"
                  value={broadcastSettings.fontColor || '#c0392b'}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, fontColor: e.target.value }))}
                />
                <Input
                  value={broadcastSettings.fontColor}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, fontColor: e.target.value }))}
                  placeholder="#c0392b"
                />
              </div>
            </div>
            
            {/* 배경 색상 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.backgroundColor')}</Label>
              <div className="col-span-3 flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 rounded border cursor-pointer"
                  value={broadcastSettings.backgroundColor || '#ffffff'}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                />
                <Input
                  value={broadcastSettings.backgroundColor}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  placeholder="#ffffff"
                />
              </div>
            </div>
            
            {/* 테두리 색상 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.borderColor')}</Label>
              <div className="col-span-3 flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 rounded border cursor-pointer"
                  value={broadcastSettings.borderColor || '#cccccc'}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, borderColor: e.target.value }))}
                />
                <Input
                  value={broadcastSettings.borderColor}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, borderColor: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>
            
            {/* 테두리 안 배경 색상 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.innerBgColor')}</Label>
              <div className="col-span-3 flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 rounded border cursor-pointer"
                  value={broadcastSettings.innerBackgroundColor || '#ffffff'}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, innerBackgroundColor: e.target.value }))}
                />
                <Input
                  value={broadcastSettings.innerBackgroundColor}
                  onChange={(e) => setBroadcastSettings(prev => ({ ...prev, innerBackgroundColor: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>
            
            {/* 폰트 정렬 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.textAlign')}</Label>
              <Select
                value={broadcastSettings.textAlign}
                onValueChange={(value) => setBroadcastSettings(prev => ({ ...prev, textAlign: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">{t('broadcast.alignLeft')}</SelectItem>
                  <SelectItem value="center">{t('broadcast.alignCenter')}</SelectItem>
                  <SelectItem value="right">{t('broadcast.alignRight')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 세로 정렬 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('broadcast.verticalAlign')}</Label>
              <Select
                value={broadcastSettings.verticalAlign}
                onValueChange={(value) => setBroadcastSettings(prev => ({ ...prev, verticalAlign: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">{t('broadcast.alignTop')}</SelectItem>
                  <SelectItem value="center">{t('broadcast.alignMiddle')}</SelectItem>
                  <SelectItem value="bottom">{t('broadcast.alignBottom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastSettings(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSaveBroadcastSettings}
              disabled={savingSettings}
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

