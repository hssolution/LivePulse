import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Check, Monitor, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * 좌장 선택 화면 (강연자용 Q&A)
 * - 화면에 표시된 질문 목록
 * - 클릭으로 질문 송출 선택
 * - 송출 중인 질문은 빨간 버튼
 * - 이전에 송출했던 질문은 회색 배경
 */
export default function PresenterQnA() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [broadcastingId, setBroadcastingId] = useState(null)
  const [hasPermission, setHasPermission] = useState(false)
  
  // 이전에 송출했던 질문 ID 추적 (세션 스토리지 사용)
  const [previouslyBroadcasted, setPreviouslyBroadcasted] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`broadcasted_${code}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  /**
   * 권한 확인
   */
  const checkPermission = useCallback(async () => {
    if (!user || !session) return false
    
    try {
      // 세션 소유자 체크
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      
      if (partner) {
        // 세션 소유자인지
        if (session.partner_id === partner.id) return true
        
        // 협업 파트너인지
        const { data: collab } = await supabase
          .from('session_partners')
          .select('id')
          .eq('session_id', session.id)
          .eq('partner_id', partner.id)
          .eq('status', 'accepted')
          .single()
        
        if (collab) return true
        
        // 강연자인지
        const { data: presenter } = await supabase
          .from('session_presenters')
          .select('id')
          .eq('session_id', session.id)
          .eq('partner_id', partner.id)
          .eq('status', 'confirmed')
          .single()
        
        if (presenter) return true
      }
      
      // 팀원인지 체크
      const { data: memberPresenter } = await supabase
        .from('session_presenters')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .single()
      
      if (memberPresenter) return true
      
      // 관리자 체크
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()
      
      if (profile?.user_role === 'admin') return true
      
      return false
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }, [user, session])

  /**
   * 세션 로드
   */
  const loadSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single()
      
      if (error) throw error
      setSession(data)
    } catch (error) {
      console.error('Error loading session:', error)
      toast.error(t('error.sessionNotFound'))
      navigate('/')
    }
  }, [code, navigate, t])

  /**
   * 질문 목록 로드 (화면 표시된 것만)
   */
  const loadQuestions = useCallback(async () => {
    if (!session) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          presenter:session_presenters(display_name, manual_name)
        `)
        .eq('session_id', session.id)
        .in('status', ['approved', 'answered'])
        .eq('is_displayed', true)
        .order('display_order', { ascending: true })
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setQuestions(data || [])
      
      // 송출 중인 질문 찾기
      const broadcasting = data?.find(q => q.is_broadcasting)
      setBroadcastingId(broadcasting?.id || null)
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (session && !authLoading) {
      loadQuestions()
      checkPermission().then(setHasPermission)
    }
  }, [session, authLoading, loadQuestions, checkPermission])

  /**
   * 실시간 구독 + 자동 새로고침 (2초)
   */
  useEffect(() => {
    if (!session) return
    
    // 실시간 구독
    const channel = supabase
      .channel(`presenter-questions:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          loadQuestions()
        }
      )
      .subscribe()
    
    // 2초마다 자동 새로고침 (참고 소스처럼)
    const interval = setInterval(() => {
      loadQuestions()
    }, 2000)
    
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [session, loadQuestions])

  /**
   * 질문 송출 토글
   */
  const handleBroadcast = async (questionId) => {
    try {
      const { data, error } = await supabase.rpc('toggle_question_broadcast', {
        p_question_id: questionId
      })
      
      if (error) throw error
      
      if (data.success) {
        setBroadcastingId(data.is_broadcasting ? questionId : null)
        
        // 송출했으면 이전 송출 목록에 추가
        if (data.is_broadcasting && !previouslyBroadcasted.includes(questionId)) {
          const newList = [...previouslyBroadcasted, questionId]
          setPreviouslyBroadcasted(newList)
          sessionStorage.setItem(`broadcasted_${code}`, JSON.stringify(newList))
        }
      }
    } catch (error) {
      console.error('Error toggling broadcast:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  // 로딩 중
  if (authLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  // 권한 없음
  if (!hasPermission && !authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-gray-800 mb-4">{t('error.accessDenied')}</h1>
          <p className="text-gray-600 mb-6">{t('presenter.noPermission')}</p>
          <Button onClick={() => navigate(`/join/${code}`)}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 메인 컨테이너 */}
      <div className="max-w-6xl mx-auto my-8 bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 헤더 - 녹색 */}
        <div className="bg-green-500 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold">
              {t('presenter.selectQuestion')}
            </h1>
            <Link to={`/broadcast/${code}`} target="_blank">
              <Button 
                variant="outline" 
                className="bg-white/20 border-white/40 text-white hover:bg-white/30"
              >
                <Monitor className="h-4 w-4 mr-2" />
                {t('presenter.openBroadcast')}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-white/80 mt-1 text-sm">
            {t('presenter.selectQuestionDesc')}
          </p>
        </div>

        {/* 질문 리스트 */}
        {loading && questions.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {t('presenter.noDisplayedQuestions')}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {questions.map((question, index) => {
              const isBroadcasting = question.id === broadcastingId
              const wasBroadcasted = previouslyBroadcasted.includes(question.id)
              const presenterName = question.presenter?.display_name || question.presenter?.manual_name || ''
              
              return (
                <li 
                  key={question.id}
                  className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50 ${
                    wasBroadcasted && !isBroadcasting ? 'bg-gray-100' : ''
                  }`}
                >
                  {/* 번호 */}
                  <div className="w-12 flex-shrink-0 text-gray-500 font-medium">
                    {index + 1}
                  </div>
                  
                  {/* 질문 내용 */}
                  <div className={`flex-1 flex items-center min-w-0 mr-4 ${
                    isBroadcasting ? 'text-blue-600' : ''
                  }`}>
                    {/* 연자 이름 */}
                    {presenterName && (
                      <div className={`font-semibold min-w-[100px] max-w-[150px] pr-4 mr-4 border-r-2 ${
                        isBroadcasting ? 'text-blue-600 border-blue-200' : 'text-gray-700 border-gray-200'
                      }`}>
                        {presenterName}
                      </div>
                    )}
                    
                    {/* 작성자명 (연자가 없을 때) */}
                    {!presenterName && question.author_name && (
                      <div className={`font-semibold min-w-[100px] max-w-[150px] pr-4 mr-4 border-r-2 ${
                        isBroadcasting ? 'text-blue-600 border-blue-200' : 'text-gray-700 border-gray-200'
                      }`}>
                        {question.author_name}
                      </div>
                    )}
                    
                    {/* 질문 내용 */}
                    <div className={`text-lg flex-1 min-w-0 ${
                      isBroadcasting ? 'text-blue-600 font-medium' : 'text-gray-800'
                    }`}>
                      {question.content}
                    </div>
                  </div>
                  
                  {/* 선택 버튼 */}
                  <button
                    onClick={() => handleBroadcast(question.id)}
                    className={`px-5 py-2.5 rounded-full text-white font-medium text-sm min-w-[100px] transition-colors ${
                      isBroadcasting
                        ? 'bg-red-500 hover:bg-red-600'
                        : wasBroadcasted
                          ? 'bg-gray-500 hover:bg-gray-600'
                          : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    <Check className="h-4 w-4 inline-block mr-1" />
                    {isBroadcasting ? t('presenter.broadcasting') : t('presenter.select')}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
