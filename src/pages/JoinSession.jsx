import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 청중 등록 페이지 (템플릿 기반)
 * /join/:code
 * 
 * 쿼리 파라미터:
 * - preview=true: 미리보기 모드 (관리자/파트너만 접근 가능)
 */
export default function JoinSession() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const isEmbed = searchParams.get('embed') === 'true' // iframe 임베드 모드
  
  const { t, language } = useLanguage()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [template, setTemplate] = useState(null)
  const [assets, setAssets] = useState({})
  const [error, setError] = useState(null)
  const [isOwner, setIsOwner] = useState(false) // 세션 소유자 여부

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
      // 세션 정보 조회 - 미리보기 모드면 상태 필터 없이 조회
      let query = supabase
        .from('sessions')
        .select(`
          *,
          template:session_templates(*),
          partner:partners(profile_id)
        `)
        .eq('code', code.toUpperCase())
      
      // 미리보기 모드가 아니면 공개된 세션만 조회
      if (!isPreview) {
        query = query.in('status', ['published', 'active'])
      }
      
      const { data: sessionData, error: sessionError } = await query.single()
      
      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          setError('not_found')
        } else {
          throw sessionError
        }
        setLoading(false)
        return
      }
      
      // 미리보기 모드인데 비공개 세션인 경우, 권한 확인
      if (isPreview && !['published', 'active'].includes(sessionData.status)) {
        const isAdmin = profile?.role === 'admin'
        const isSessionOwner = sessionData.partner?.profile_id === user?.id
        
        if (!isAdmin && !isSessionOwner) {
          setError('not_found')
          setLoading(false)
          return
        }
        
        setIsOwner(isSessionOwner || isAdmin)
      }
      
      setSession(sessionData)
      setTemplate(sessionData.template)
      
      // 에셋 로드
      const { data: assetsData } = await supabase
        .from('session_assets')
        .select('*')
        .eq('session_id', sessionData.id)
      
      const assetsMap = {}
      assetsData?.forEach(asset => {
        assetsMap[asset.field_key] = asset
      })
      setAssets(assetsMap)
      
    } catch (err) {
      console.error('Error loading session:', err)
      setError('load_failed')
    } finally {
      setLoading(false)
    }
  }, [code, isPreview, user, profile])

  useEffect(() => {
    loadSession()
  }, [loadSession])

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
      not_found: {
        icon: AlertCircle,
        title: t('join.error.notFound'),
        desc: t('join.error.notFoundDesc'),
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
            <Button onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  /**
   * 로딩 페이지
   */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  /**
   * 에러 페이지
   */
  if (error) {
    return renderError()
  }

  /**
   * 심포지엄 템플릿 렌더링
   */
  const renderSymposiumTemplate = () => {
    const bgImage = assets.background_image?.value
    const logo = assets.logo?.value
    const titleBanner = assets.title_banner?.value
    const scheduleBanner = assets.schedule_banner?.value
    const scheduleBannerUrl = assets.schedule_banner_url?.url
    const bottomBanner = assets.bottom_banner?.value
    const bottomBannerUrl = assets.bottom_banner_url?.url
    
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: bgImage ? `url(${bgImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="min-h-screen bg-black/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* 로고 */}
            {logo && (
              <div className="mb-6">
                <img src={logo} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            
            {/* 타이틀 배너 */}
            {titleBanner ? (
              <div className="mb-8">
                <img src={titleBanner} alt="Title" className="w-full rounded-lg shadow-lg" />
              </div>
            ) : (
              <div className="mb-8 text-white text-center">
                <h1 className="text-4xl font-bold mb-4">{session.title}</h1>
                <p className="text-xl opacity-90">{session.description}</p>
              </div>
            )}
            
            {/* 세션 정보 카드 */}
            <Card className="mb-8 shadow-xl">
              <CardHeader>
                <CardTitle>{t('join.sessionInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.start_at), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.start_at), 'HH:mm')} - {format(new Date(session.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{session.venue_name}</p>
                    {session.venue_address && (
                      <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <p>{session.contact_phone}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <p>{session.contact_email}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* 일정표 배너 */}
            {scheduleBanner && (
              <div className="mb-8">
                {scheduleBannerUrl ? (
                  <a href={scheduleBannerUrl} target="_blank" rel="noopener noreferrer">
                    <img src={scheduleBanner} alt="Schedule" className="w-full rounded-lg shadow-lg hover:opacity-90 transition-opacity cursor-pointer" />
                  </a>
                ) : (
                  <img src={scheduleBanner} alt="Schedule" className="w-full rounded-lg shadow-lg" />
                )}
              </div>
            )}
            
            {/* 참여 버튼 */}
            <Card className="mb-8 shadow-xl">
              <CardContent className="pt-6">
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6"
                  onClick={() => navigate(`/live/${session.code}`)}
                >
                  {t('join.enterSession')}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-3">
                  {t('join.participantCount', { count: session.participant_count, max: session.max_participants })}
                </p>
              </CardContent>
            </Card>
            
            {/* 하단 배너 */}
            {bottomBanner && (
              <div className="mb-8">
                {bottomBannerUrl ? (
                  <a href={bottomBannerUrl} target="_blank" rel="noopener noreferrer">
                    <img src={bottomBanner} alt="Banner" className="w-full rounded-lg shadow-lg hover:opacity-90 transition-opacity cursor-pointer" />
                  </a>
                ) : (
                  <img src={bottomBanner} alt="Banner" className="w-full rounded-lg shadow-lg" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * 컨퍼런스 템플릿 렌더링
   */
  const renderConferenceTemplate = () => {
    const bgImage = assets.background_image?.value
    const logo = assets.logo?.value
    const heroBanner = assets.hero_banner?.value
    const sponsorBanner = assets.sponsor_banner?.value
    
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: bgImage ? `url(${bgImage})` : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        }}
      >
        <div className="min-h-screen">
          {/* 헤더 */}
          <header className="bg-black/50 py-4">
            <div className="container mx-auto px-4 flex items-center justify-between">
              {logo && <img src={logo} alt="Logo" className="h-12 object-contain" />}
              <div className="text-white text-right">
                <p className="text-sm opacity-75">{t('join.code')}: {session.code}</p>
              </div>
            </div>
          </header>
          
          {/* 히어로 섹션 */}
          <section className="py-12">
            <div className="container mx-auto px-4 max-w-5xl">
              {heroBanner ? (
                <img src={heroBanner} alt="Hero" className="w-full rounded-xl shadow-2xl" />
              ) : (
                <div className="text-white text-center py-16">
                  <h1 className="text-5xl font-bold mb-6">{session.title}</h1>
                  <p className="text-xl opacity-90 max-w-2xl mx-auto">{session.description}</p>
                </div>
              )}
            </div>
          </section>
          
          {/* 정보 섹션 */}
          <section className="py-12 bg-white/95 backdrop-blur">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* 세션 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('join.sessionInfo')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{session.venue_name}</p>
                        {session.venue_address && (
                          <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* 참여 카드 */}
                <Card className="bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle>{t('join.joinNow')}</CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      {t('join.joinDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      size="lg" 
                      variant="secondary"
                      className="w-full text-lg"
                      onClick={() => navigate(`/live/${session.code}`)}
                    >
                      {t('join.enterSession')}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                    <p className="text-center text-sm mt-3 opacity-80">
                      {t('join.participantCount', { count: session.participant_count, max: session.max_participants })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          
          {/* 스폰서 섹션 */}
          {sponsorBanner && (
            <section className="py-8 bg-white">
              <div className="container mx-auto px-4 max-w-4xl">
                <img src={sponsorBanner} alt="Sponsors" className="w-full" />
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  /**
   * 워크숍 템플릿 렌더링 (심플)
   */
  const renderWorkshopTemplate = () => {
    const logo = assets.logo?.value
    const coverImage = assets.cover_image?.value
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          {/* 로고 */}
          {logo && (
            <div className="text-center mb-8">
              <img src={logo} alt="Logo" className="h-12 object-contain mx-auto" />
            </div>
          )}
          
          {/* 커버 이미지 */}
          {coverImage && (
            <div className="mb-8">
              <img src={coverImage} alt="Cover" className="w-full rounded-xl shadow-lg" />
            </div>
          )}
          
          {/* 메인 카드 */}
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              {session.description && (
                <CardDescription className="text-base">{session.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 세션 정보 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  <p className="font-medium">{session.venue_name}</p>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <p>{t('join.participantCount', { count: session.participant_count, max: session.max_participants })}</p>
                </div>
              </div>
              
              {/* 참여 버튼 */}
              <Button 
                size="lg" 
                className="w-full text-lg py-6"
                onClick={() => navigate(`/live/${session.code}`)}
              >
                {t('join.enterSession')}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              {/* 문의 정보 */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>{t('join.contact')}: {session.contact_phone} / {session.contact_email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /**
   * 기본 템플릿 (템플릿 미선택 시)
   */
  const renderDefaultTemplate = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              {session.description && (
                <CardDescription className="text-base">{session.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
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
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{session.venue_name}</p>
                    {session.venue_address && (
                      <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <p>{session.contact_phone}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <p>{session.contact_email}</p>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="w-full text-lg py-6"
                onClick={() => navigate(`/live/${session.code}`)}
              >
                {t('join.enterSession')}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                {t('join.participantCount', { count: session.participant_count, max: session.max_participants })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /**
   * 템플릿에 따른 렌더링
   */
  const renderTemplate = () => {
    if (!template) {
      return renderDefaultTemplate()
    }
    
    switch (template.code) {
      case 'symposium':
        return renderSymposiumTemplate()
      case 'conference':
        return renderConferenceTemplate()
      case 'workshop':
        return renderWorkshopTemplate()
      default:
        return renderDefaultTemplate()
    }
  }

  /**
   * 미리보기 배너 (embed 모드에서는 숨김)
   */
  const renderPreviewBanner = () => {
    if (!isPreview || isEmbed) return null
    
    const statusLabels = {
      draft: t('session.statusDraft'),
      published: t('session.statusPublished'),
      active: t('session.statusActive'),
      ended: t('session.statusEnded'),
      cancelled: t('session.statusCancelled'),
    }
    
    const statusColors = {
      draft: 'bg-yellow-500',
      published: 'bg-blue-500',
      active: 'bg-green-500',
      ended: 'bg-gray-500',
      cancelled: 'bg-red-500',
    }
    
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 py-2 px-4 flex items-center justify-center gap-3 shadow-md">
        <Eye className="h-5 w-5" />
        <span className="font-medium">{t('session.previewMode')}</span>
        <Badge className={`${statusColors[session.status]} text-white`}>
          {statusLabels[session.status] || session.status}
        </Badge>
        <span className="text-sm">- {t('session.previewModeDesc')}</span>
        <Button 
          size="sm" 
          variant="outline" 
          className="ml-4 bg-white hover:bg-yellow-50"
          onClick={() => navigate(`/partner/sessions/${session.id}`)}
        >
          {t('session.backToManage')}
        </Button>
      </div>
    )
  }

  return (
    <>
      {renderPreviewBanner()}
      <div className={isPreview && !isEmbed ? 'pt-12' : ''}>
        {renderTemplate()}
      </div>
    </>
  )
}

