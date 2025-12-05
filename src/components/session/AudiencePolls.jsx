import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { HtmlContent } from '@/components/ui/html-content'
import { toast } from 'sonner'
import { 
  Loader2, 
  BarChart3, 
  CheckCircle
} from 'lucide-react'

/**
 * 청중용 설문 응답 컴포넌트
 * - 모든 활성 설문 한 화면에 표시
 * - 단일/복수/주관식 응답
 * - 마지막에 "설문 등록" 버튼으로 한번에 제출
 * 
 * @param {string} sessionId - 세션 ID
 * @param {string} sessionTitle - 세션 제목 (상단 표시용)
 * @param {boolean} isPreview - 미리보기 모드 여부
 */
export default function AudiencePolls({ sessionId, sessionTitle, isPreview }) {
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [polls, setPolls] = useState([])
  const [responses, setResponses] = useState({}) // { pollId: { optionIds: [], text: '' } }
  const [allSubmitted, setAllSubmitted] = useState(false)
  const [pollResults, setPollResults] = useState({}) // { pollId: results }
  const [submitting, setSubmitting] = useState(false)

  // 익명 ID (디바이스 식별용)
  const [anonymousId] = useState(() => {
    let id = localStorage.getItem('anonymous_poll_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('anonymous_poll_id', id)
    }
    return id
  })

  /**
   * 활성 설문 로드
   */
  const loadPolls = useCallback(async () => {
    if (!sessionId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*, poll_options(id, option_text, display_order)')
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .order('display_order')
      
      if (error) throw error
      
      // 옵션도 정렬
      const sortedPolls = (data || []).map(poll => ({
        ...poll,
        poll_options: poll.poll_options?.sort((a, b) => a.display_order - b.display_order)
      }))
      
      setPolls(sortedPolls)
      
      // 이미 모든 설문에 응답했는지 체크
      if (sortedPolls.length > 0) {
        await checkIfAllResponded(sortedPolls)
      }
    } catch (error) {
      console.error('Error loading polls:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  /**
   * 모든 설문 응답 여부 확인
   */
  const checkIfAllResponded = async (pollList) => {
    // 미리보기 모드에서는 응답 여부 체크 안함
    if (isPreview) return

    try {
      const pollIds = pollList.map(p => p.id)
      
      const { data, error } = await supabase
        .from('poll_responses')
        .select('poll_id')
        .in('poll_id', pollIds)
        .eq('anonymous_id', anonymousId)
      
      if (error) throw error
      
      const respondedPollIds = new Set(data?.map(r => r.poll_id) || [])
      
      // 모든 설문에 응답했는지 체크
      const allResponded = pollList.every(p => respondedPollIds.has(p.id))
      
      if (allResponded) {
        setAllSubmitted(true)
        // 결과 로드
        for (const pollId of pollIds) {
          await loadResults(pollId)
        }
      }
    } catch (error) {
      console.error('Error checking responses:', error)
    }
  }

  /**
   * 결과 로드
   */
  const loadResults = async (pollId) => {
    // 미리보기 모드이고 이미 결과가 있다면(방금 제출해서 만든 가짜 결과), 새로 로드하지 않음
    if (isPreview && pollResults[pollId]) return

    try {
      const { data, error } = await supabase.rpc('get_poll_results', {
        p_poll_id: pollId
      })
      
      if (error) throw error
      
      setPollResults(prev => ({ ...prev, [pollId]: data }))
    } catch (error) {
      console.error('Error loading results:', error)
    }
  }

  useEffect(() => {
    loadPolls()
  }, [loadPolls])

  /**
   * 실시간 구독
   */
  useEffect(() => {
    if (!sessionId) return
    
    const channel = supabase
      .channel(`audience-polls:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          loadPolls()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, loadPolls])

  /**
   * 모든 응답 제출
   */
  const handleSubmitAll = async () => {
    // 필수 항목 검증
    const errors = []
    
    for (const poll of polls) {
      const response = responses[poll.id]
      
      if (poll.is_required) {
        if (poll.poll_type === 'open') {
          if (!response?.text?.trim()) {
            errors.push({ poll, message: 'required' })
          }
        } else {
          if (!response?.optionIds?.length) {
            errors.push({ poll, message: 'required' })
          }
        }
      }
    }
    
    if (errors.length > 0) {
      const firstError = errors[0]
      const pollIndex = polls.findIndex(p => p.id === firstError.poll.id) + 1
      toast.error(t('poll.requiredError', { num: pollIndex }))
      return
    }
    
    setSubmitting(true)
    try {
      // 각 설문에 대해 응답 제출
      for (const poll of polls) {
        const response = responses[poll.id]
        
        // 응답이 있는 경우에만 제출
        if (poll.poll_type === 'open' && response?.text?.trim()) {
          await submitResponse(poll, response)
        } else if (poll.poll_type !== 'open' && response?.optionIds?.length) {
          await submitResponse(poll, response)
        } else if (poll.is_required) {
          // 필수인데 응답 없음 - 이미 위에서 검증됨
        }
      }
      
      toast.success(t('poll.allSubmitted'))
      setAllSubmitted(true)
      
      // 결과 로드
      for (const poll of polls) {
        if (poll.show_results) {
          await loadResults(poll.id)
        }
      }
    } catch (error) {
      console.error('Error submitting responses:', error)
      toast.error(t('error.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 개별 응답 제출
   */
  const submitResponse = async (poll, response) => {
    // 미리보기 모드에서는 실제 제출 없이 성공 처리 (테스트용)
    if (isPreview) {
      await new Promise(resolve => setTimeout(resolve, 300)) // 약간의 지연 효과
      
      // 가짜 결과 업데이트 (화면에 반영하기 위함)
      setPollResults(prev => {
        const currentResults = prev[poll.id] || { total_responses: 0, results: [] }
        const newTotal = currentResults.total_responses + 1
        
        let newResults = []
        if (poll.poll_type === 'open') {
          // 주관식: 응답 추가
          newResults = [{ text: response.text }, ...(currentResults.results || [])]
        } else {
          // 객관식: 카운트 증가
          // 기존 옵션 정보가 없으면 polls에서 가져와야 함
          const pollOptions = poll.poll_options || []
          
          newResults = pollOptions.map(opt => {
            const existing = currentResults.results?.find(r => r.option_id === opt.id)
            const isSelected = response.optionIds.includes(opt.id)
            const count = (existing?.count || 0) + (isSelected ? 1 : 0)
            
            return {
              option_id: opt.id,
              option_text: opt.option_text,
              count: count,
              percentage: newTotal > 0 ? Math.round((count / newTotal) * 100) : 0
            }
          })
        }

        return {
          ...prev,
          [poll.id]: {
            poll_id: poll.id,
            poll_type: poll.poll_type,
            total_responses: newTotal,
            results: newResults
          }
        }
      })
      return
    }

    const { data, error } = await supabase.rpc('submit_poll_response', {
      p_poll_id: poll.id,
      p_option_ids: poll.poll_type !== 'open' ? response.optionIds : null,
      p_response_text: poll.poll_type === 'open' ? response.text : null,
      p_anonymous_id: anonymousId
    })
    
    if (error) throw error
    
    if (!data.success) {
      throw new Error(data.error)
    }
  }

  /**
   * 단일 선택 변경
   */
  const handleSingleSelect = (pollId, optionId) => {
    setResponses(prev => ({
      ...prev,
      [pollId]: { optionIds: [optionId] }
    }))
  }

  /**
   * 복수 선택 토글
   */
  const handleMultiSelect = (pollId, optionId, checked, maxSelections) => {
    setResponses(prev => {
      const current = prev[pollId]?.optionIds || []
      let newIds
      
      if (checked) {
        // 최대 선택 수 체크
        if (maxSelections && current.length >= maxSelections) {
          toast.error(t('poll.maxSelectionsReached', { max: maxSelections }))
          return prev
        }
        newIds = [...current, optionId]
      } else {
        newIds = current.filter(id => id !== optionId)
      }
      
      return {
        ...prev,
        [pollId]: { optionIds: newIds }
      }
    })
  }

  /**
   * 주관식 텍스트 변경
   */
  const handleTextChange = (pollId, text) => {
    setResponses(prev => ({
      ...prev,
      [pollId]: { text }
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{t('live.noPoll')}</p>
      </div>
    )
  }

  // 제출 완료 화면
  if (allSubmitted) {
    return (
      <div className="space-y-6">
        {/* 세션 타이틀 */}
        {sessionTitle && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-4">
              <h2 className="text-center font-bold text-lg">{sessionTitle}</h2>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <h3 className="text-xl font-bold">{t('poll.submitComplete')}</h3>
              <p className="text-muted-foreground">{t('poll.thankYou')}</p>
            </div>
          </CardContent>
        </Card>

        {/* 결과 표시 (show_results가 true인 설문만) */}
        {polls.filter(p => p.show_results && pollResults[p.id]).map((poll, index) => {
          const results = pollResults[poll.id]
          
          return (
            <Card key={poll.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start gap-1">
                  <span>{index + 1}.</span>
                  <HtmlContent html={poll.question} maxImageHeight={80} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {poll.poll_type === 'open' ? (
                  <div className="text-center text-muted-foreground">
                    <p>{t('poll.totalResponses')}: {results.total_responses}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.results?.map((r) => (
                      <div key={r.option_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{r.option_text}</span>
                          <span className="font-medium">{r.count} ({r.percentage}%)</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${r.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      {t('poll.totalResponses')}: {results.total_responses}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // 설문 입력 폼
  return (
    <div className="space-y-4">
      {/* 세션 타이틀 */}
      {sessionTitle && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-4">
            <h2 className="text-center font-bold text-lg">{sessionTitle}</h2>
          </CardContent>
        </Card>
      )}

      {/* 설문 목록 */}
      <Card>
        <CardContent className="py-6 space-y-8">
          {polls.map((poll, index) => (
            <div key={poll.id} className="space-y-3">
              {/* 질문 헤더 */}
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary shrink-0">
                  {poll.is_required && <span className="text-red-500">*</span>}
                  {index + 1}.
                </span>
                <div className="font-medium">
                  <HtmlContent html={poll.question} maxImageHeight={120} />
                </div>
              </div>
              
              {/* 복수 선택 안내 */}
              {poll.poll_type === 'multiple' && poll.max_selections && (
                <p className="text-sm text-muted-foreground ml-6">
                  ({t('poll.maxSelectionsHint', { max: poll.max_selections })})
                </p>
              )}
              
              {/* 응답 입력 */}
              <div className="ml-6">
                {poll.poll_type === 'single' && (
                  <RadioGroup
                    value={responses[poll.id]?.optionIds?.[0] || ''}
                    onValueChange={(value) => handleSingleSelect(poll.id, value)}
                  >
                    {poll.poll_options?.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 py-1">
                        <RadioGroupItem value={option.id} id={`${poll.id}-${option.id}`} />
                        <Label 
                          htmlFor={`${poll.id}-${option.id}`} 
                          className="cursor-pointer font-normal"
                        >
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                
                {poll.poll_type === 'multiple' && (
                  <div className="space-y-2">
                    {poll.poll_options?.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`${poll.id}-${option.id}`}
                          checked={responses[poll.id]?.optionIds?.includes(option.id) || false}
                          onCheckedChange={(checked) => 
                            handleMultiSelect(poll.id, option.id, checked, poll.max_selections)
                          }
                        />
                        <Label 
                          htmlFor={`${poll.id}-${option.id}`} 
                          className="cursor-pointer font-normal"
                        >
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                
                {poll.poll_type === 'open' && (
                  <Textarea
                    value={responses[poll.id]?.text || ''}
                    onChange={(e) => handleTextChange(poll.id, e.target.value)}
                    placeholder={t('poll.enterResponse')}
                    rows={3}
                    className="max-w-md"
                  />
                )}
              </div>
              
              {/* 구분선 */}
              {index < polls.length - 1 && (
                <hr className="border-border mt-6" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 설문 등록 버튼 */}
      <Button 
        className="w-full py-6 text-lg font-bold"
        size="lg"
        onClick={handleSubmitAll}
        disabled={submitting}
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
        {t('poll.submitAll')}
      </Button>
    </div>
  )
}
