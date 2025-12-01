import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { LogOut, User, Shield, Users, Menu, PanelLeftClose, PanelLeft, Home } from 'lucide-react'
import { ThemeCustomizer } from '@/components/admin/ThemeCustomizer'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { getHeaderTitleByRole } from '@/config/menuConfig'
import { Link } from 'react-router-dom'

/**
 * 관리자/파트너 페이지 헤더 컴포넌트
 * 사용자 정보와 로그아웃 버튼을 표시합니다.
 * 언어팩 적용됨
 */
export function Header({ onMenuClick, onToggleSidebar, sidebarCollapsed }) {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  
  // 역할에 따른 헤더 타이틀
  const headerTitle = profile?.role === 'admin' ? t('title.adminPanel') : t('title.partnerCenter')

  /**
   * 로그아웃 처리 함수
   */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.warn('Logout error (ignored):', error)
    }
    // 홈으로 이동
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
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
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
        <h1 className="text-base md:text-lg font-semibold">{headerTitle}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* 사용자 이메일 - hidden on small mobile */}
        <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[150px] md:max-w-none">
          {user?.email}
        </span>

        {/* 프로필 정보 배지들 - responsive */}
        {profile && (
          <div className="flex items-center gap-1 md:gap-2">
            {/* 역할 배지 */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
              profile.role === 'admin' 
                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                : 'bg-blue-100 text-blue-700 border-blue-200'
            }`}>
              {getRoleIcon()}
              <span className="hidden sm:inline">{profile.role}</span>
            </div>

            {/* 사용자 유형 배지 - hidden on mobile */}
            <div className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getUserTypeBadgeColor()}`}>
              <Users className="h-3 w-3" />
              <span>{profile.userType}</span>
            </div>

            {/* 상태 배지 - hidden on mobile */}
            <div className={`hidden md:block px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadgeColor()}`}>
              {profile.status}
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
