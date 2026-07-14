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
import SectionBand from '@/components/audience/SectionBand'
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

const LEGACY_POLL_INTERVAL_MS = 10000 // 015 미적용 폴백 전용 (qnaRev 신호가 없을 때)

/** 드래프트 저장 키 — LiveSession의 자동 포커스 예외 판정과 공유 (PRD §3.2) */
const draftKey = (code) => `lp_qna_draft:${code}`

/**
 * 청중용 Q&A 컴포넌트 (PRD §6 — P0 개편)
 * - 질문 등록 (참가자 토큰 포함 → 내 질문 "검토 중" 표시)
 * - 목록: sp_live_qna_q 단일 RPC (본인 pending 병합 + 좋아요 인라인)
 * - 갱신: 부모의 qna_rev 신호가 바뀔 때만 재조회 (자체 인터벌 제거)
 * - 드래프트: sessionStorage 보존 — 탭 전환·강제 장면 전환에도 유지
 * - 답변 완료: 사라지지 않고 접힌 "답변됨" 그룹으로
 */
export default function AudienceQnA({
  sessionId,
  sessionCode,
  sessionStatus,
  isPreview = false,
  categories = [],
  participantToken,
  qnaRev,
  qnaDesign = null, // 게시 디자인의 qna 장면 설정 (null이면 현행 동작 — 하위호환)
  bands = null, // { header, footer } 자유 섹션 밴드 (null이면 미표시)
  bandTokens = null,
  bandData = {}, // 밴드 섹션이 참조하는 데이터 (session·presenters·cues)
}) {
  const { t, language } = useLanguage()

  // 디자인 설정 소비 — qnaDesign 부재 시 전부 현행값(모두 표시·카드형)이 되도록 기본값 처리
  const dShowAuthor = qnaDesign ? qnaDesign.showAuthor !== false : true
  const dShowCategory = qnaDesign ? qnaDesign.showCategory !== false : true
  const dShowLikes = qnaDesign ? qnaDesign.showLikes !== false : true
  const dFlat = qnaDesign?.cardStyle === 'flat'
  const dHeaderText = qnaDesign?.headerText || ''
  const dEmptyText = qnaDesign?.emptyText || ''

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [questions, setQuestions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [likedQuestions, setLikedQuestions] = useState(new Set())
  const [showAnswered, setShowAnswered] = useState(false)

  // 질문 폼 — 드래프트는 sessionStorage에 미러링해 언마운트에도 보존
  const [questionText, setQuestionTextRaw] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey(sessionCode)) || ''
    } catch {
      return ''
    }
  })
  const setQuestionText = (text) => {
    setQuestionTextRaw(text)
    try {
      if (text) sessionStorage.setItem(draftKey(sessionCode), text)
      else sessionStorage.removeItem(draftKey(sessionCode))
    } catch { /* storage 불가 환경 무시 */ }
  }
  const [authorName, setAuthorName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  // 정렬
  const [sortBy, setSortBy] = useState('popular') // 'newest' | 'popular' | 'oldest'

  // 카테고리 필터 ('all' | categoryId)
  const [catFilter, setCatFilter] = useState('all')

  // 참가자 토큰 (부모 미전달 시 레거시 device_id 폴백)
  const tokenRef = useRef(participantToken)
  useEffect(() => {
    if (participantToken) {
      tokenRef.current = participantToken
      return
    }
    let deviceId = localStorage.getItem('device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_id', deviceId)
    }
    tokenRef.current = deviceId
  }, [participantToken])

  const legacyRef = useRef(false) // sp_live_qna_q 부재(015 미적용) 폴백
  const pendingLikesRef = useRef([]) // 최근 로컬 좋아요 토글 [{id, liked, ts}] — 재조회 경합 병합용

  /**
   * 질문 목록 로드 — 단일 RPC (본인 pending 병합 + liked_by_me 인라인)
   */
  const loadQuestions = useCallback(async (showLoading = true) => {
    if (!sessionId) return

    if (showLoading) setLoading(true)
    try {
      if (!legacyRef.current && sessionCode) {
        // STABLE 함수 — GET 호출 (캐시 가능성 보존, PRD §6). 인기순이 최신 창에
        // 갇히지 않도록 상한(200)까지 조회 후 클라이언트 정렬.
        // GET에서 null은 문자열 "null"로 직렬화되므로 토큰은 있을 때만 포함
        const params = { p_code: sessionCode, p_limit: 200 }
        if (tokenRef.current) params.p_token = tokenRef.current
        const { data, error } = await supabase.rpc('sp_live_qna_q', params, { get: true })
        if (error?.code === 'PGRST202') {
          legacyRef.current = true
          console.warn('[AudienceQnA] sp_live_qna_q 없음 — 레거시 조회 폴백 (015 적용 필요)')
        } else if (error) {
          throw error
        } else if (data?.success) {
          const list = data.questions || []
          setQuestions(list)
          // 서버 응답 + 직전 8초 내 로컬 좋아요 토글 병합 — 재조회가 in-flight인
          // 사이에 누른 좋아요가 롤백된 것처럼 보이는 경합 방지 (리뷰 S2)
          const serverLiked = new Set(list.filter((q) => q.liked_by_me).map((q) => q.id))
          const now = Date.now()
          pendingLikesRef.current = pendingLikesRef.current.filter((p) => now - p.ts < 8000)
          for (const p of pendingLikesRef.current) {
            if (p.liked) serverLiked.add(p.id)
            else serverLiked.delete(p.id)
          }
          setLikedQuestions(serverLiked)
          return
        } else {
          return
        }
      }
      // ── 레거시 폴백 (015 미적용): approved만 직접 조회, 좋아요 인라인 없음 ──
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [sessionId, sessionCode])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  // qna_rev 신호 기반 갱신 — 버전이 바뀔 때만 재조회 (PRD §6)
  const lastRevRef = useRef(null)
  useEffect(() => {
    if (qnaRev == null) return
    if (lastRevRef.current !== null && lastRevRef.current !== qnaRev) {
      loadQuestions(false)
    }
    lastRevRef.current = qnaRev
  }, [qnaRev, loadQuestions])

  // 레거시 폴백 전용 주기 갱신 (qnaRev 신호가 없을 때만)
  useEffect(() => {
    if (!sessionId || qnaRev != null) return
    const intervalId = setInterval(() => loadQuestions(false), LEGACY_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [sessionId, qnaRev, loadQuestions])

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
      let { error } = await supabase
        .from('questions')
        .insert({
          session_id: sessionId,
          content: questionText.trim(),
          author_name: isAnonymous ? null : (authorName.trim() || null),
          is_anonymous: isAnonymous,
          status: 'pending', // 관리자 승인 필요
          participant_token: tokenRef.current, // 내 질문 "검토 중" 표시용 (PRD §3.2)
        })

      // 015 미적용(컬럼 없음) 폴백 — 토큰 없이 재시도
      if (error?.code === 'PGRST204') {
        ;({ error } = await supabase.from('questions').insert({
          session_id: sessionId,
          content: questionText.trim(),
          author_name: isAnonymous ? null : (authorName.trim() || null),
          is_anonymous: isAnonymous,
          status: 'pending',
        }))
      }

      if (error) throw error

      toast.success(t('qna.submitted'))
      setQuestionText('') // 드래프트 저장분도 함께 제거
      setAuthorName('')
      loadQuestions(false) // 즉시 재조회 — 내 질문이 "검토 중"으로 바로 보이게
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
        p_device_id: tokenRef.current
      })
      
      if (error) throw error
      
      if (data.success) {
        pendingLikesRef.current.push({ id: questionId, liked: data.liked, ts: Date.now() })
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

  // 카테고리 노출 제어 + 필터 (내 질문은 카테고리 노출과 무관하게 항상 표시)
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const filteredQuestions = questions.filter((q) => {
    if (q.is_mine) return catFilter === 'all' || q.category_id === catFilter
    // 카테고리가 지정됐는데 노출 카테고리 목록에 없으면(=좌장이 끔) 숨김
    if (q.category_id && !catMap.has(q.category_id)) return false
    if (catFilter !== 'all' && q.category_id !== catFilter) return false
    return true
  })

  // 정렬 (RPC는 최신순 고정 반환 — 정렬은 클라이언트에서)
  const sortQuestions = (list) => {
    const arr = [...list]
    if (sortBy === 'newest') {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else {
      // 인기순: 고정 > 하이라이트 > 좋아요 > 최신
      arr.sort(
        (a, b) =>
          (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
          (b.is_highlighted ? 1 : 0) - (a.is_highlighted ? 1 : 0) ||
          (b.likes_count || 0) - (a.likes_count || 0) ||
          new Date(b.created_at) - new Date(a.created_at)
      )
    }
    return arr
  }

  // 답변 완료는 접힌 그룹으로 분리 (PRD §4 — 목록 오염 방지, 사라지지 않음)
  const visibleQuestions = sortQuestions(filteredQuestions.filter((q) => q.status !== 'answered'))
  const answeredQuestions = sortQuestions(filteredQuestions.filter((q) => q.status === 'answered'))

  return (
    <div className="space-y-4">
      {/* 상단 자유 섹션 밴드 (게시 디자인) */}
      {bands?.header?.length > 0 && (
        <SectionBand sections={bands.header} tokens={bandTokens} data={bandData} className="!py-0" />
      )}
      {/* 상단 안내 문구 (게시 디자인 headerText — 없으면 미표시, 현행 불변) */}
      {dHeaderText && (
        <p className="text-sm text-center text-slate-600 leading-relaxed">{dHeaderText}</p>
      )}

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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* 익명 토글 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={setIsAnonymous}
                    />
                    <Label htmlFor="anonymous" className="text-sm cursor-pointer whitespace-nowrap">
                      {t('qna.postAnonymously')}
                    </Label>
                  </div>

                  {/* 이름 입력 (익명이 아닐 때만) */}
                  {!isAnonymous && (
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder={t('qna.namePlaceholder')}
                      className="w-40 max-w-full"
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
            <p className="text-muted-foreground">{dEmptyText || t('qna.noQuestions')}</p>
            {canSubmit && (
              <p className="text-sm text-muted-foreground mt-1">{t('qna.beFirst')}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleQuestions.map(renderQuestionCard)}
        </div>
      )}

      {/* 답변 완료 — 접힌 그룹 (사라지지 않고 여기 남는다, PRD §4) */}
      {answeredQuestions.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAnswered((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2.5"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {language === 'ko' ? `답변 완료 ${answeredQuestions.length}개` : `Answered (${answeredQuestions.length})`}
            </span>
            <span className="text-xs">{showAnswered ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          {showAnswered && (
            <div className="space-y-3 mt-3">{answeredQuestions.map(renderQuestionCard)}</div>
          )}
        </div>
      )}

      {/* 하단 자유 섹션 밴드 (게시 디자인) */}
      {bands?.footer?.length > 0 && (
        <SectionBand sections={bands.footer} tokens={bandTokens} data={bandData} className="!py-0" />
      )}
    </div>
  )

  /** 질문 카드 렌더 (일반 목록·답변됨 그룹 공용) */
  function renderQuestionCard(question) {
    return (
      <Card
        key={question.id}
        className={`transition-all ${
          question.is_mine && question.status === 'pending'
            ? 'border-indigo-300 bg-indigo-50/50'
            : question.is_highlighted
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : question.is_pinned
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : dFlat
                  ? 'border-0 shadow-none bg-transparent'
                  : ''
        }`}
      >
        <CardContent className="pt-4">
          <div className="flex gap-3">
            {/* 좋아요 버튼 (게시 디자인에서 좋아요 숨김이면 미표시) */}
            {dShowLikes && (
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                className={`h-10 w-10 p-0 ${
                  likedQuestions.has(question.id) ? 'text-primary bg-primary/10' : ''
                }`}
                onClick={() => handleLike(question.id)}
                disabled={question.status === 'pending' || question.status === 'rejected'}
              >
                <ThumbsUp
                  className={`h-5 w-5 ${likedQuestions.has(question.id) ? 'fill-current' : ''}`}
                />
              </Button>
              <span className="text-sm font-medium">{question.likes_count}</span>
            </div>
            )}

            {/* 질문 내용 */}
            <div className="flex-1 min-w-0">
              {/* 배지 */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {/* 내 질문 상태 배지 (PRD §3.2 — 제출 직후 "검토 중"으로 즉시 표시) */}
                {question.is_mine && question.status === 'pending' && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    {language === 'ko' ? '내 질문 · 검토 중' : 'My question · In review'}
                  </Badge>
                )}
                {question.is_mine && question.status === 'rejected' && (
                  <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-300">
                    {language === 'ko' ? '내 질문 · 반려됨' : 'My question · Declined'}
                  </Badge>
                )}
                {question.status === 'answered' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {language === 'ko' ? '답변 완료' : 'Answered'}
                  </Badge>
                )}
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
                {dShowCategory && question.category_id && catMap.get(question.category_id) && (
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
              <p className="text-foreground whitespace-pre-wrap break-words">{question.content}</p>

              {/* 답변 (answered) */}
              {question.status === 'answered' && question.answer && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {question.answer}
                </div>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {dShowAuthor && (
                  <>
                    <span>
                      {question.is_anonymous ? t('qna.anonymous') : question.author_name || t('qna.anonymous')}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span>{formatTime(question.created_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
}

