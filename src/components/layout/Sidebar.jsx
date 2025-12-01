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
 * 언어팩 적용됨
 */
export function Sidebar({ isMobile = false, isOpen = false, onClose = () => {}, isCollapsed = false, onToggleCollapse = () => {} }) {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState({})
  const { profile } = useAuth()
  const { t } = useLanguage()

  // 역할에 따른 메뉴 가져오기
  const menuItems = getMenuByRole(profile?.role)
  const titleKey = getTitleKeyByRole(profile?.role)
  const basePath = profile?.role === 'admin' ? '/adm' : '/partner'

  /**
   * 현재 경로가 활성화된 메뉴인지 확인
   * - 정확히 일치하거나 하위 경로인 경우 활성화
   */
  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path
    }
    // 정확히 일치하거나 하위 경로인 경우 (예: /partner/sessions/xxx)
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  /**
   * 서브메뉴 중 현재 활성화된 것이 있는지 확인
   * - 서브메뉴가 있는 경우 해당 메뉴 자동으로 펼침
   */
  const hasActiveInSubItems = (subItems) => {
    if (!subItems) return false
    return subItems.some(subItem => isActive(subItem.to))
  }

  /**
   * 서브메뉴 토글
   */
  const toggleMenu = (menuId) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  /**
   * 메뉴 라벨 가져오기 (언어팩 적용)
   */
  const getLabel = (item) => {
    return item.labelKey ? t(item.labelKey) : item.label
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center border-b px-6">
        <Link to={basePath} className="flex items-center gap-2 font-semibold" onClick={isMobile ? onClose : undefined}>
          {!isCollapsed && <span className="text-lg">{t(titleKey)}</span>}
          {isCollapsed && (profile?.role === 'admin' ? <Package className="h-6 w-6" /> : <Building2 className="h-6 w-6" />)}
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const label = getLabel(item)
            
            // 하위 메뉴가 있는 경우
            if (item.subItems) {
              const hasActiveChild = hasActiveInSubItems(item.subItems)
              const isMenuOpen = openMenus[item.id] ?? hasActiveChild // 활성 하위 메뉴가 있으면 기본으로 열기
              
              // 접힌 상태: Popover로 표시
              if (isCollapsed) {
                return (
                  <Popover key={item.id}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary hover:bg-muted/50",
                          hasActiveChild ? "text-primary bg-muted" : "text-muted-foreground"
                        )}
                        title={label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-56 p-2">
                      <div className="space-y-1">
                        <div className="px-2 py-1.5 text-sm font-semibold">{label}</div>
                        {item.subItems.map((subItem) => {
                          const active = isActive(subItem.to)
                          const subLabel = getLabel(subItem)
                          return (
                            <Link
                              key={subItem.to}
                              to={subItem.to}
                              className={cn(
                                "flex items-center rounded-md px-2 py-1.5 text-sm transition-all hover:bg-muted",
                                active ? "bg-muted text-primary font-medium" : "text-muted-foreground"
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
              
              // 펼쳐진 상태: Collapsible로 표시
              return (
                <Collapsible
                  key={item.id}
                  open={isMenuOpen}
                  onOpenChange={() => toggleMenu(item.id)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary hover:bg-muted/50",
                      hasActiveChild ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {isMenuOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-7 space-y-1 mt-1">
                    {item.subItems.map((subItem) => {
                      const active = isActive(subItem.to)
                      const subLabel = getLabel(subItem)
                      return (
                        <Link
                          key={subItem.to}
                          to={subItem.to}
                          onClick={isMobile ? onClose : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                            active ? "bg-muted text-primary font-medium" : "text-muted-foreground"
                          )}
                        >
                          {subLabel}
                        </Link>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )
            }
            
            // 일반 메뉴 아이템
            const active = isActive(item.to, item.isExact)
            
            // 접힌 상태: Popover로 표시 (서브메뉴와 동일한 스타일)
            if (isCollapsed) {
              return (
                <Popover key={item.to}>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary hover:bg-muted/50",
                        active ? "text-primary bg-muted" : "text-muted-foreground"
                      )}
                      title={label}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-56 p-2">
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center rounded-md px-2 py-1.5 text-sm transition-all hover:bg-muted",
                        active ? "bg-muted text-primary font-medium" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2 shrink-0" />
                      {label}
                    </Link>
                  </PopoverContent>
                </Popover>
              )
            }
            
            // 펼쳐진 상태: 일반 Link
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  active ? "bg-muted text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col bg-card text-card-foreground">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop version
  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r bg-card text-card-foreground transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent />
    </div>
  )
}
