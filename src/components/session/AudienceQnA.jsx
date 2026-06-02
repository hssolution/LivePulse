import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Loader2,
  Send,
  ThumbsUp,
  MessageCircle,
  CheckCircle,
  Clock,
  Pin,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const POLL_INTERVAL_MS = 10000

/**
 * 청중용 Q&A 컴포넌트
 * - 질문 등록
 * - 질문 목록 보기
 * - 좋아요
 * - 실시간 업데이트
 */
export default function AudienceQnA({ sessionId, sessionStatus, isPreview = false, categories = [] }) {
  const { t, language } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [questions, setQuestions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [likedQuestions, setLikedQuestions] = useState(new Set())
  
  // 질문 폼
  const [questionText, setQuestionText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  // 정렬
  const [sortBy, setSortBy] = useState('popular') // 'newest' | 'popular' | 'oldest'

  // 카테고리 필터 ('all' | categoryId)
  const [catFilter, setCatFilter] = useState('all')
  
  // Device ID (비로그인 사용자용)
  const deviceIdRef = useRef(null)
  
  useEffect(() => {
    // Device ID 생성 또는 가져오기
    let deviceId = localStorage.getItem('device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_id', deviceId)
    }
    deviceIdRef.current = deviceId
  }, [])

  /**
   * 질문 목록 로드
   */
  const loadQuestions = useCallback(async (showLoading = true) => {
    if (!sessionId) return
    
    if (showLoading) setLoading(true)
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'approved') // 답변 완료된 질문은 숨김 (기획 미정)
      
      // 정렬
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true })
      } else {
        // 인기순: 고정 > 하이라이트 > 좋아요 순
        query = query
          .order('is_pinned', { ascending: false })
          .order('is_highlighted', { ascending: false })
          .order('likes_count', { ascending: false })
          .order('created_at', { ascending: false })
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setQuestions(data || [])
      
      // 내가 좋아요한 질문 확인
      await checkLikedQuestions(data || [])
      
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [sessionId, sortBy])

  /**
   * 내가 좋아요한 질문 확인
   */
  const checkLikedQuestions = async (questionsList) => {
    const liked = new Set()
    
    for (const q of questionsList) {
      const { data } = await supabase.rpc('check_question_liked', {
        p_question_id: q.id,
        p_device_id: deviceIdRef.current
      })
      if (data) {
        liked.add(q.id)
      }
    }
    
    setLikedQuestions(liked)
  }

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  /**
   * 주기 폴링 (청중은 realtime 대신 주기 갱신)
   */
  useEffect(() => {
    if (!sessionId) return

    const intervalId = setInterval(() => {
      loadQuestions(false)
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [sessionId, loadQuestions])

  /**
   * 수동 새로고침
   */
  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await loadQuestions(false)
    } finally {
      setRefreshing(false)
    }
  }

  /**
   * 질문 등록
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!questionText.trim()) {
      toast.error(t('error.questionEmpty'))
      return
    }
    
    if (questionText.length > 500) {
      toast.error(t('error.questionTooLong'))
      return
    }
    
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('questions')
        .insert({
          session_id: sessionId,
          content: questionText.trim(),
          author_name: isAnonymous ? null : (authorName.trim() || null),
          is_anonymous: isAnonymous,
          status: 'pending' // 관리자 승인 필요
        })
      
      if (error) throw error
      
      toast.success(t('qna.submitted'))
      setQuestionText('')
      setAuthorName('')
      
    } catch (error) {
      console.error('Error submitting question:', error)
      toast.error(t('error.questionSubmitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 좋아요 토글
   */
  const handleLike = async (questionId) => {
    try {
      const { data, error } = await supabase.rpc('toggle_question_like', {
        p_question_id: questionId,
        p_device_id: deviceIdRef.current
      })
      
      if (error) throw error
      
      if (data.success) {
        setLikedQuestions(prev => {
          const newSet = new Set(prev)
          if (data.liked) {
            newSet.add(questionId)
          } else {
            newSet.delete(questionId)
          }
          return newSet
        })
        
        // 로컬 상태 업데이트
        setQuestions(prev => 
          prev.map(q => {
            if (q.id === questionId) {
              return {
                ...q,
                likes_count: data.liked ? q.likes_count + 1 : Math.max(0, q.likes_count - 1)
              }
            }
            return q
          })
        )
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  /**
   * 시간 포맷
   */
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return language === 'ko' ? '방금 전' : 'Just now'
    if (diffMins < 60) return language === 'ko' ? `${diffMins}분 전` : `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return language === 'ko' ? `${diffHours}시간 전` : `${diffHours}h ago`
    
    return format(date, 'MM.dd HH:mm')
  }

  // 세션이 활성 상태가 아니면 질문 폼 숨김 (미리보기 모드에서는 항상 표시)
  const canSubmit = sessionStatus === 'active' || isPreview

  // 카테고리 노출 제어 + 필터
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const visibleQuestions = questions.filter((q) => {
    // 카테고리가 지정됐는데 노출 카테고리 목록에 없으면(=좌장이 끔) 숨김
    if (q.category_id && !catMap.has(q.category_id)) return false
    if (catFilter !== 'all' && q.category_id !== catFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* 질문 입력 폼 */}
      {canSubmit && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder={t('qna.placeholder')}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 익명 토글 */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={setIsAnonymous}
                    />
                    <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                      {t('qna.postAnonymously')}
                    </Label>
                  </div>
                  
                  {/* 이름 입력 (익명이 아닐 때만) */}
                  {!isAnonymous && (
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder={t('qna.namePlaceholder')}
                      className="w-40"
                      maxLength={20}
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {questionText.length}/500
                  </span>
                  <Button type="submit" disabled={submitting || !questionText.trim()}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {t('qna.submit')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 카테고리 필터 칩 */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCatFilter('all')}
            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
              catFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            전체
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
              style={
                catFilter === c.id
                  ? { backgroundColor: c.color || '#4f46e5', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 정렬 옵션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {visibleQuestions.length} {language === 'ko' ? '개의 질문' : 'questions'}
          </span>
        </div>
        
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'popular' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            {t('qna.sortPopular')}
          </Button>
          <Button
            variant={sortBy === 'newest' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('newest')}
          >
            {t('qna.sortNewest')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={language === 'ko' ? '새로고침' : 'Refresh'}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 질문 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibleQuestions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('qna.noQuestions')}</p>
            {canSubmit && (
              <p className="text-sm text-muted-foreground mt-1">{t('qna.beFirst')}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleQuestions.map((question) => (
            <Card 
              key={question.id}
              className={`transition-all ${
                question.is_highlighted 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : question.is_pinned 
                    ? 'border-yellow-500/50 bg-yellow-500/5' 
                    : ''
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  {/* 좋아요 버튼 */}
                  <div className="flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-10 w-10 p-0 ${
                        likedQuestions.has(question.id) 
                          ? 'text-primary bg-primary/10' 
                          : ''
                      }`}
                      onClick={() => handleLike(question.id)}
                    >
                      <ThumbsUp className={`h-5 w-5 ${
                        likedQuestions.has(question.id) ? 'fill-current' : ''
                      }`} />
                    </Button>
                    <span className="text-sm font-medium">{question.likes_count}</span>
                  </div>
                  
                  {/* 질문 내용 */}
                  <div className="flex-1 min-w-0">
                    {/* 배지 */}
                    <div className="flex items-center gap-2 mb-2">
                      {question.is_pinned && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          <Pin className="h-3 w-3 mr-1" />
                          {t('qna.pin')}
                        </Badge>
                      )}
                      {question.is_highlighted && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {t('qna.highlight')}
                        </Badge>
                      )}
                      {question.category_id && catMap.get(question.category_id) && (
                        <Badge
                          variant="outline"
                          style={{
                            color: catMap.get(question.category_id).color || '#4f46e5',
                            borderColor: `${catMap.get(question.category_id).color || '#4f46e5'}55`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: catMap.get(question.category_id).color || '#4f46e5' }}
                          />
                          {catMap.get(question.category_id).name}
                        </Badge>
                      )}
                    </div>
                    
                    {/* 질문 텍스트 */}
                    <p className="text-foreground whitespace-pre-wrap break-words">
                      {question.content}
                    </p>
                    
                    {/* 메타 정보 */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        {question.is_anonymous 
                          ? t('qna.anonymous') 
                          : (question.author_name || t('qna.anonymous'))
                        }
                      </span>
                      <span>·</span>
                      <span>{formatTime(question.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

