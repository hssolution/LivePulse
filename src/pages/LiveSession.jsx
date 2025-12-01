import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  MessageCircle,
  BarChart3,
  Info,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Mic
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import AudienceQnA from '@/components/session/AudienceQnA'
import AudiencePolls from '@/components/session/AudiencePolls'

/**
 * 청중용 실시간 참여 페이지
 * /live/:code
 */
export default function LiveSession() {
  const { code } = useParams()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // URL 파라미터에서 preview 모드와 초기 탭 확인
  const isPreview = searchParams.get('preview') === 'true'
  const initialTab = searchParams.get('tab') || 'qna'
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [presenters, setPresenters] = useState([])
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(initialTab)

  /**
   * 세션 데이터 로드
   */
  const loadSession = useCallback(async () => {
    if (!code) {
      setError('invalid_code')
      setLoading(false)
      return
    }
    
    try {
      // 세션 정보 조회 (미리보기 모드에서는 상태 체크 안함)
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase())
      
      // 미리보기가 아닌 경우에만 활성 상태 체크
      if (!isPreview) {
        query = query.in('status', ['active'])
      }
      
      const { data: sessionData, error: sessionError } = await query.single()
      
      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          setError(isPreview ? 'not_found' : 'not_active')
        } else {
          throw sessionError
        }
        setLoading(false)
        return
      }
      
      setSession(sessionData)
      
      // 강사 목록 로드
      const { data: presenterData } = await supabase
        .from('session_presenters')
        .select('*')
        .eq('session_id', sessionData.id)
        .eq('status', 'confirmed')
        .order('display_order')
      
      setPresenters(presenterData || [])
      
    } catch (err) {
      console.error('Error loading session:', err)
      setError('load_failed')
    } finally {
      setLoading(false)
    }
  }, [code, isPreview])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  /**
   * 세션 상태 실시간 구독
   */
  useEffect(() => {
    if (!session?.id) return
    
    const channel = supabase
      .channel(`session-status:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          setSession(prev => ({ ...prev, ...payload.new }))
          
          // 세션이 종료되면 알림
          if (payload.new.status === 'ended') {
            toast.info(t('live.sessionEnded'))
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id, t])

  /**
   * 에러 페이지 렌더링
   */
  const renderError = () => {
    const errors = {
      invalid_code: {
        icon: AlertCircle,
        title: t('join.error.invalidCode'),
        desc: t('join.error.invalidCodeDesc'),
      },
      not_active: {
        icon: AlertCircle,
        title: t('live.error.notActive'),
        desc: t('live.error.notActiveDesc'),
      },
      load_failed: {
        icon: AlertCircle,
        title: t('join.error.loadFailed'),
        desc: t('join.error.loadFailedDesc'),
      },
    }
    
    const err = errors[error] || errors.load_failed
    const Icon = err.icon
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Icon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{err.title}</h2>
            <p className="text-muted-foreground mb-6">{err.desc}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate(`/join/${code}`)}>
                {t('live.backToJoin')}
              </Button>
              <Button onClick={() => navigate('/')}>
                {t('common.goHome')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return renderError()
  }

  // 세션이 종료된 경우
  if (session.status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('live.sessionEnded')}</h2>
            <p className="text-muted-foreground mb-6">{t('live.sessionEndedDesc')}</p>
            <Button onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(`/join/${code}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold line-clamp-1">{session.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge className="bg-green-500">{t('live.live')}</Badge>
                  <span>{session.venue_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="qna">
              <MessageCircle className="h-4 w-4 mr-2" />
              Q&A
            </TabsTrigger>
            <TabsTrigger value="poll">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('live.poll')}
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="h-4 w-4 mr-2" />
              {t('live.info')}
            </TabsTrigger>
          </TabsList>

          {/* Q&A 탭 */}
          <TabsContent value="qna" className="mt-4">
            <AudienceQnA 
              sessionId={session.id} 
              sessionStatus={session.status}
            />
          </TabsContent>

          {/* 설문 탭 */}
          <TabsContent value="poll" className="mt-4">
            <AudiencePolls 
              sessionId={session.id} 
              sessionTitle={session.title}
            />
          </TabsContent>

          {/* 정보 탭 */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{session.title}</CardTitle>
                {session.description && (
                  <CardDescription>{session.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 일시 */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.start_at), 'yyyy.MM.dd (EEE)', { locale: ko })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.start_at), 'HH:mm')} - {format(new Date(session.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                {/* 장소 */}
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{session.venue_name}</p>
                    {session.venue_address && (
                      <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                    )}
                  </div>
                </div>
                
                {/* 강사 */}
                {presenters.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      {t('live.presenters')}
                    </h3>
                    <div className="space-y-2">
                      {presenters.map((presenter) => (
                        <div key={presenter.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mic className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{presenter.display_name}</p>
                            {presenter.display_title && (
                              <p className="text-sm text-muted-foreground">{presenter.display_title}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

