import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { LogOut, User, Shield, Users, Menu, PanelLeftClose, PanelLeft, Home } from 'lucide-react'
import { ThemeCustomizer } from '@/components/admin/ThemeCustomizer'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { Link } from 'react-router-dom'
import InitialLoading from '@/components/ui/InitialLoading'

/**
 * 관리자/파트너 페이지 헤더 컴포넌트
 * 사용자 정보와 로그아웃 버튼을 표시합니다.
 * 언어팩 적용됨
 */
export function Header({ onMenuClick, onToggleSidebar, sidebarCollapsed }) {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // 역할에 따른 헤더 타이틀
  const headerTitle = profile?.role === 'admin' ? t('title.adminPanel') : t('title.partnerCenter')

  /**
   * 로그아웃 처리 함수
   */
  const handleLogout = async () => {
    console.log('🔴 [LOGOUT] 로그아웃 시도:', { user: user?.email, profile })
    
    // 1. 로그아웃 UI 표시 (전체 화면 덮음)
    setIsLoggingOut(true)
    
    try {
      // 2. 로컬 스토리지 수동 정리 (Supabase 토큰 등)
      // signOut이 멈추는 경우를 대비해 확실하게 정리
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })

      // 3. 로그아웃 요청 (타임아웃 적용)
      // 네트워크 문제 등으로 signOut이 응답하지 않을 경우를 대비해 2초 제한
      const signOutPromise = supabase.auth.signOut({ scope: 'local' })
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000))
      
      await Promise.race([signOutPromise, timeoutPromise])
    } catch (err) {
      console.warn('Logout error (ignored):', err)
    }

    // 4. 홈으로 이동 (새로고침 발생)
    window.location.href = '/'
  }

  /**
   * 역할(role)에 따른 아이콘 반환
   */
  const getRoleIcon = () => {
    if (profile?.role === 'admin') return <Shield className="h-3 w-3" />
    return <User className="h-3 w-3" />
  }

  /**
   * 사용자 유형(userType)에 따른 배지 색상 반환
   */
  const getUserTypeBadgeColor = () => {
    switch (profile?.userType) {
      case 'partner':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'general':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  /**
   * 상태(status)에 따른 배지 색상 반환
   */
  const getStatusBadgeColor = () => {
    switch (profile?.status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <header className="flex h-16 items-center gap-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md px-6 md:px-8 z-10 sticky top-0 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      {/* 로그아웃 중일 때 전체 화면 로딩 표시 */}
      {isLoggingOut && createPortal(
        <InitialLoading 
          title="Signing Out" 
          messages={['안전하게 로그아웃 중입니다...', '세션을 정리하고 있습니다...']}
          speed={3}
        />,
        document.body
      )}

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label={t('header.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? t('header.expandSidebar') : t('header.collapseSidebar')}
      >
        {sidebarCollapsed ? (
          <PanelLeft className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </Button>

      <div className="flex-1">
        <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors duration-300">{headerTitle}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* 사용자 이메일 - hidden on small mobile */}
        <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[150px] md:max-w-none">
          {user?.email}
        </span>

        {/* 프로필 정보 배지들 - responsive */}
        {profile && (
          <div className="flex items-center gap-2">
            {/* 역할 배지 */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all hover:shadow-md ${
              profile.role === 'admin' 
                ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200'
            }`}>
              {getRoleIcon()}
              <span className="hidden sm:inline">{t('user.type.' + profile.role, profile.role)}</span>
            </div>

            {/* 사용자 유형 배지 - hidden on mobile */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${getUserTypeBadgeColor()}`}>
              <Users className="h-3 w-3" />
              <span>{t('user.type.' + (profile.userType === 'general' ? 'user' : profile.userType), profile.userType)}</span>
            </div>

            {/* 상태 배지 - hidden on mobile */}
            <div className={`hidden md:block px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${getStatusBadgeColor()}`}>
              {t('status.' + profile.status, profile.status)}
            </div>
          </div>
        )}

        {/* 언어 선택 */}
        <LanguageSelector />

        {/* 테마 커스터마이저 */}
        <ThemeCustomizer />

        {/* 메인 화면 이동 버튼 */}
        <Button variant="ghost" size="icon" asChild title={t('header.goToMain')}>
          <Link to="/">
            <Home className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </Button>

        {/* 로그아웃 버튼 */}
        <Button variant="ghost" size="icon" onClick={handleLogout} title={t('auth.logout')}>
          <LogOut className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>
    </header>
  )
}
