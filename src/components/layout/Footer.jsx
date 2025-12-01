import { useAuth } from '@/context/AuthContext'
import { useAdminTheme } from '@/context/AdminThemeContext'
import { useLanguage } from '@/context/LanguageContext'
import { Server, Database, Clock, User } from 'lucide-react'
import { useState, useEffect } from 'react'

/**
 * 관리자/파트너 페이지 푸터 컴포넌트
 * 사용자 정보, 서버 상태, 시간을 표시합니다.
 * 언어팩 적용됨
 */
export function Footer() {
  const { profile } = useAuth()
  const { theme } = useAdminTheme()
  const { t, language } = useLanguage()
  const [currentTime, setCurrentTime] = useState(new Date())

  // 1초마다 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  /**
   * 시간 포맷팅 (언어에 따라)
   */
  const formatTime = (date) => {
    return date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <footer className="flex h-7 min-h-[28px] shrink-0 items-center justify-between border-t bg-muted/30 px-2 md:px-4 text-[10px] md:text-xs overflow-hidden">
      {/* 왼쪽: 사용자 정보 */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <User className="h-3 w-3 shrink-0" />
          <span className="font-medium truncate max-w-[100px] md:max-w-[200px]">{profile?.email}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{profile?.role}</span>
        </div>
      </div>

      {/* 오른쪽: 시스템 정보 */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* 서버 상태 - 아이콘만 모바일에서 표시 */}
        <div className="flex items-center gap-1">
          <Server className="h-3 w-3 text-green-500 shrink-0" />
          <span className="hidden md:inline text-muted-foreground">{t('footer.connected')}</span>
        </div>
        {/* 테마 - 태블릿 이상에서만 표시 */}
        <div className="hidden md:flex items-center gap-1">
          <Database className="h-3 w-3 shrink-0" />
          <span className="text-muted-foreground">{theme?.preset?.replace('theme-', '')?.toUpperCase()}</span>
        </div>
        {/* 시간 - 항상 표시 */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
        </div>
      </div>
    </footer>
  )
}
