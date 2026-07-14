import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  Users
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/** 참가(Enter) 장면 — 템플릿 4종 레이아웃 (P2 편집기 시뮬레이터가 동일 렌더러를 import) */
export default function EnterScene({ session, template, assets, joinCard, isPreview = false }) {
  const { t } = useLanguage()

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
                {joinCard}
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
                    {joinCard}
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
              {joinCard}

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

              {joinCard}

              <p className="text-center text-sm text-muted-foreground mt-3">
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
