import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)

  useEffect(() => {
    // 로그인 페이지에서 넘어왔을 때 설정된 preload 클래스 제거
    // 약간의 지연을 주어 테마가 완전히 적용된 후 트랜지션을 복구함
    const timer = setTimeout(() => {
      document.body.classList.remove('preload')
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#020617]">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar 
          isCollapsed={desktopSidebarCollapsed}
          onToggleCollapse={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar - shown via Sheet */}
      <Sidebar 
        isMobile={true} 
        isOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header 
          onMenuClick={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
          sidebarCollapsed={desktopSidebarCollapsed}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
