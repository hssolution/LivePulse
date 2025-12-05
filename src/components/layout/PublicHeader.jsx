import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { useAuth } from '@/context/AuthContext'
import { usePublicTheme } from '@/context/PublicThemeContext'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { 
  Zap, 
  Sun, 
  Moon,
  Menu,
  X,
  Search,
  Users,
  Building2,
  PlayCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * 공용 헤더 컴포넌트
 * - 메인 로고
 * - 주요 메뉴 (강의, 강사, 대행사)
 * - 다크모드 토글
 * - 언어 선택
 * - 로그인/회원가입/대시보드 접근
 */
export function PublicHeader() {
  const { user, profile } = useAuth()
  const { theme, toggleTheme } = usePublicTheme()
  const { t } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPartnerInDB, setIsPartnerInDB] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // DB에서 직접 user_type 확인
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

  const isPartner = profile?.userType === 'partner' || isPartnerInDB

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.warn('Logout error:', error)
    }
    window.location.href = '/'
  }

  const navLinks = [
    { name: '강연 찾기', href: '/lectures', label: 'nav.lectures', icon: PlayCircle },
    { name: '강연가 찾기', href: '/instructors', label: 'nav.instructors', icon: Users },
    { name: '대행사 찾기', href: '/agencies', label: 'nav.agencies', icon: Building2 },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled || isMenuOpen 
        ? 'bg-background/95 backdrop-blur-md border-b shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center transition-transform group-hover:scale-105">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                LivePulse
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                to={link.href}
                className="group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
              >
                <link.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>{t(link.label) !== link.label ? t(link.label) : link.name}</span>
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector />
            {/* Theme toggle removed as per request - force dark mode */}
            
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                {profile?.role === 'admin' && (
                  <Link to="/adm">
                    <Button variant="ghost" size="sm">{t('nav.adminPage')}</Button>
                  </Link>
                )}
                {isPartner && profile?.role !== 'admin' && (
                  <Link to="/partner">
                    <Button variant="ghost" size="sm">{t('nav.partnerCenter')}</Button>
                  </Link>
                )}
                {!isPartner && profile?.role !== 'admin' && (
                  <Link to="/mypage">
                    <Button variant="ghost" size="sm">{t('nav.mypage')}</Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>{t('auth.logout')}</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">{t('auth.login')}</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0">
                    {t('nav.getStartedFree')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="px-4 pt-2 pb-6 space-y-4">
            <div className="grid gap-2 py-4">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  to={link.href}
                  className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="p-2 rounded-md bg-background/50 shadow-sm">
                    <link.icon className="w-5 h-5 text-primary" />
                  </div>
                  {t(link.label) !== link.label ? t(link.label) : link.name}
                </Link>
              ))}
            </div>
            
            <div className="border-t pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between px-4">
                <span className="text-sm text-muted-foreground">Language</span>
                <div className="flex items-center gap-2">
                  <LanguageSelector />
                </div>
              </div>

              {user ? (
                <div className="grid gap-2 px-4">
                  {profile?.role === 'admin' && (
                    <Link to="/adm" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full" variant="secondary">{t('nav.adminPage')}</Button>
                    </Link>
                  )}
                  {isPartner && profile?.role !== 'admin' && (
                    <Link to="/partner" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full" variant="secondary">{t('nav.partnerCenter')}</Button>
                    </Link>
                  )}
                  {!isPartner && profile?.role !== 'admin' && (
                    <Link to="/mypage" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full" variant="secondary">{t('nav.mypage')}</Button>
                    </Link>
                  )}
                  <Button variant="outline" onClick={handleLogout} className="w-full">{t('auth.logout')}</Button>
                </div>
              ) : (
                <div className="grid gap-2 px-4">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">{t('auth.login')}</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0">
                      {t('nav.getStartedFree')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

