import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function InitialLoading({ 
  title = "LivePulse",
  messages = [
    '시스템 초기화 중...',
    '서비스를 준비하고 있습니다...'
  ],
  speed = 1
}) {
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(messages[0])

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        const increment = (prev < 50 ? Math.random() * 10 : Math.random() * 5) * speed
        return Math.min(prev + increment, 100)
      })
    }, 100)

    let msgIndex = 0
    const msgTimer = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length
      setCurrentMessage(messages[msgIndex])
    }, 800)

    return () => {
      clearInterval(timer)
      clearInterval(msgTimer)
    }
  }, [messages, speed])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* 배경: CSS 그리드 패턴 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xs w-full px-6">
        {/* 로고 영역: 크기 축소 및 과한 효과 제거 */}
        <div className="relative flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" className="animate-[draw_2s_ease-in-out_infinite]" />
          </svg>
        </div>

        {/* 텍스트 영역: 간결하게 */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 h-4 transition-all duration-300">
            {currentMessage}
          </p>
        </div>

        {/* 프로그레스 바: 심플한 라인 형태 */}
        <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* 퍼센트 표시 (선택적 - 너무 심플한걸 원하면 제거 가능하지만 정보 제공 차원에서 작게 유지) */}
        <div className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  )
}
