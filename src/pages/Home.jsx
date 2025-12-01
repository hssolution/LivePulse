import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { usePublicTheme } from '@/context/PublicThemeContext'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  Zap, 
  QrCode, 
  Smartphone,
  ArrowRight,
  CheckCircle,
  Play,
  Sun,
  Moon
} from 'lucide-react'

/**
 * 홈 페이지 (랜딩 페이지)
 * 언어팩 적용됨
 */
export default function Home() {
  const { user, profile } = useAuth()
  const { mode, toggleMode } = usePublicTheme()
  const { t } = useLanguage()
  const [isPartnerInDB, setIsPartnerInDB] = useState(false)

  // DB에서 직접 user_type 확인 (JWT 갱신 지연 대응)
  useEffect(() => {
    const checkPartnerStatus = async () => {
      if (!user) {
        setIsPartnerInDB(false)
        return
      }
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()
        
        setIsPartnerInDB(data?.user_type === 'partner')
      } catch (error) {
        console.error('Error checking partner status:', error)
      }
    }
    
    checkPartnerStatus()
  }, [user])

  // 파트너 여부 (JWT 또는 DB에서 확인)
  const isPartner = profile?.userType === 'partner' || isPartnerInDB

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.warn('Logout error (ignored):', error)
    }
    // 에러가 나도 홈으로 이동
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">LivePulse</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Button variant="ghost" size="icon" onClick={toggleMode}>
                {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              {user ? (
                <>
                  {/* 관리자: 관리자 페이지 버튼 */}
                  {profile?.role === 'admin' && (
                    <Link to="/adm">
                      <Button variant="ghost">{t('nav.adminPage')}</Button>
                    </Link>
                  )}
                  {/* 파트너: 파트너 센터 버튼 */}
                  {isPartner && profile?.role !== 'admin' && (
                    <Link to="/partner">
                      <Button variant="ghost">{t('nav.partnerCenter')}</Button>
                    </Link>
                  )}
                  {/* 일반 회원: 마이페이지 버튼 */}
                  {!isPartner && profile?.role !== 'admin' && (
                    <Link to="/mypage">
                      <Button variant="ghost">{t('nav.mypage')}</Button>
                    </Link>
                  )}
                  <Button variant="outline" onClick={handleLogout}>{t('auth.logout')}</Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">{t('auth.login')}</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                      {t('nav.getStartedFree')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-500 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium">{t('home.heroTag')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            {t('home.heroTitle1')}{' '}
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t('home.heroTitle2')}
            </span>
            {' '}{t('home.heroTitle3')}
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            {t('home.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-lg px-8 h-14">
                {t('nav.getStartedFree')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 h-14">
              <Play className="mr-2 h-5 w-5" />
              {t('home.watchDemo')}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground">10K+</div>
              <div className="text-sm text-muted-foreground">{t('home.statSessions')}</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground">500K+</div>
              <div className="text-sm text-muted-foreground">{t('home.statParticipants')}</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground">98%</div>
              <div className="text-sm text-muted-foreground">{t('home.statSatisfaction')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('home.featuresTitle')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.featuresDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('home.featurePoll')}</h3>
                <p className="text-muted-foreground">
                  {t('home.featurePollDesc')}
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('home.featureQnA')}</h3>
                <p className="text-muted-foreground">
                  {t('home.featureQnADesc')}
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('home.featureFeedback')}</h3>
                <p className="text-muted-foreground">
                  {t('home.featureFeedbackDesc')}
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('home.featureQR')}</h3>
                <p className="text-muted-foreground">
                  {t('home.featureQRDesc')}
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('home.featureMobile')}</h3>
                <p className="text-muted-foreground">
                  {t('home.featureMobileDesc')}
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('home.featureScale')}</h3>
                <p className="text-muted-foreground">
                  {t('home.featureScaleDesc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('home.howItWorks')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('home.howItWorksDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.step1Title')}</h3>
              <p className="text-muted-foreground">
                {t('home.step1Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.step2Title')}</h3>
              <p className="text-muted-foreground">
                {t('home.step2Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.step3Title')}</h3>
              <p className="text-muted-foreground">
                {t('home.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-orange-500 to-pink-500 border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <CardContent className="p-8 sm:p-12 text-center relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {t('home.ctaTitle')}
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                {t('home.ctaDesc')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button size="lg" variant="secondary" className="text-lg px-8 h-14">
                    {t('nav.getStartedFree')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('home.ctaFree')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('home.ctaNoInstall')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('home.ctaInstant')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">LivePulse</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.features')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.pricing')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.cases')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.help')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.contact')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.faq')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.about')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.blog')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.careers')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t('footer.copyright')}
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">{t('auth.termsOfService')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('auth.privacyPolicy')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
