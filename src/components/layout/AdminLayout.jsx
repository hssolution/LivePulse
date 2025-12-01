import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
