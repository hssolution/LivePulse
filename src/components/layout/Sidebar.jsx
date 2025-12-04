import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Package, Building2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { getMenuByRole, getTitleKeyByRole } from '@/config/menuConfig'

/**
 * 사이드바 컴포넌트
 * 관리자/파트너 메뉴를 표시합니다.
 * Theme-Aware Design: 테마 설정에 따라 색상이 자동으로 변경됩니다.
 */
export function Sidebar({ isMobile = false, isOpen = false, onClose = () => {}, isCollapsed = false, onToggleCollapse = () => {} }) {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState({})
  const { profile } = useAuth()
  const { t } = useLanguage()

  const menuItems = getMenuByRole(profile?.role)
  const titleKey = getTitleKeyByRole(profile?.role)
  const basePath = profile?.role === 'admin' ? '/adm' : '/partner'

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const hasActiveInSubItems = (subItems) => {
    if (!subItems) return false
    return subItems.some(subItem => isActive(subItem.to))
  }

  const toggleMenu = (menuId) => {
    setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }))
  }

  const getLabel = (item) => {
    return item.labelKey ? t(item.labelKey) : item.label
  }

  // 메뉴 아이템 렌더링
  const renderMenuItem = (item) => {
    const Icon = item.icon
    const label = getLabel(item)
    const hasActiveChild = hasActiveInSubItems(item.subItems)
    const active = isActive(item.to, item.isExact)
    
    if (item.subItems) {
      const isMenuOpen = openMenus[item.id] ?? hasActiveChild
      
      if (isCollapsed && !isMobile) {
        return (
          <Popover key={item.id}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all duration-300 group relative",
                  hasActiveChild 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={label}
              >
                <Icon className="h-6 w-6 shrink-0" />
                {hasActiveChild && <div className="absolute -right-1 -top-1 w-3 h-3 bg-background rounded-full border-2 border-primary" />}
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-56 p-2">
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
                {item.subItems.map((subItem) => {
                  const subActive = isActive(subItem.to)
                  const subLabel = getLabel(subItem)
                  return (
                    <Link
                      key={subItem.to}
                      to={subItem.to}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-sm transition-all",
                        subActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {subLabel}
                    </Link>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        )
      }

      return (
        <Collapsible
          key={item.id}
          open={isMenuOpen}
          onOpenChange={() => toggleMenu(item.id)}
          className="group/collapsible"
        >
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 group relative",
              hasActiveChild 
                ? "text-primary font-semibold bg-primary/5" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0 transition-colors", hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="flex-1 text-left">{label}</span>
            <ChevronRight className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200", 
              isMenuOpen ? "rotate-90 text-foreground" : "text-muted-foreground"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 pb-2 space-y-1">
            {item.subItems.map((subItem) => {
              const subActive = isActive(subItem.to)
              const subLabel = getLabel(subItem)
              return (
                <Link
                  key={subItem.to}
                  to={subItem.to}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg pl-12 pr-4 py-2.5 text-sm transition-all relative",
                    subActive 
                      ? "text-primary font-medium bg-primary/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {subActive && (
                    <div className="absolute left-7 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  {subLabel}
                </Link>
              )
            })}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    // 일반 메뉴 아이템
    if (isCollapsed && !isMobile) {
      return (
        <Popover key={item.to}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all duration-300 group relative",
                active 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={label}
            >
              <Icon className="h-6 w-6 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-auto px-3 py-2 font-medium text-sm">
            {label}
          </PopoverContent>
        </Popover>
      )
    }

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={isMobile ? onClose : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-300 group relative overflow-hidden",
          active 
            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25" 
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {/* Active 상태일 때 화려한 반사 효과 */}
        {active && (
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        
        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="font-medium">{label}</span>
      </Link>
    )
  }

  // Desktop version
  const DesktopSidebar = () => (
    <div 
      className={cn(
        "flex flex-col bg-card border-r transition-all duration-300 h-screen shadow-2xl z-20 relative overflow-hidden",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* 테마 연동 오로라 배경 (Theme-Aware Aurora) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[-10%] right-[-50%] w-[300px] h-[300px] rounded-full bg-primary blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[200px] h-[200px] rounded-full bg-accent blur-[60px]" />
      </div>

      {/* 로고 영역 */}
      <div className="relative z-10 flex h-20 items-center px-6 mb-2 shrink-0">
        <Link to={basePath} className="flex items-center gap-3 font-bold" onClick={isMobile ? onClose : undefined}>
          {isCollapsed ? (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              {profile?.role === 'admin' ? <Package className="h-6 w-6 text-primary-foreground" /> : <Building2 className="h-6 w-6 text-primary-foreground" />}
            </div>
          ) : (
            <>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {profile?.role === 'admin' ? <Package className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {t(titleKey)}
              </span>
            </>
          )}
        </Link>
      </div>

      {/* 메뉴 영역 */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar px-4 space-y-1">
        <nav className="grid items-start gap-1 text-sm font-medium">
          {menuItems.map(renderMenuItem)}
        </nav>
      </div>
    </div>
  )

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-72 p-0 bg-card border-r">
          <div className="flex h-full flex-col relative overflow-hidden">
             {/* Mobile Aurora */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-[-10%] right-[-50%] w-[200px] h-[200px] rounded-full bg-primary blur-[50px]" />
            </div>
            
            <div className="relative z-10 flex h-20 items-center px-6 border-b">
              <Link to={basePath} className="flex items-center gap-3 font-bold" onClick={onClose}>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {profile?.role === 'admin' ? <Package className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <span className="text-xl font-bold text-foreground">{t(titleKey)}</span>
              </Link>
            </div>
            <div className="relative z-10 flex-1 overflow-auto py-4 px-4">
              <nav className="grid items-start gap-1 text-sm font-medium">
                {menuItems.map(renderMenuItem)}
              </nav>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return <DesktopSidebar />
}
