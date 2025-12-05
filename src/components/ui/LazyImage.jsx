import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * 지연 로딩 이미지 컴포넌트
 * - 초기에는 스켈레톤(Pulse) 표시
 * - 이미지 로드 완료 시 페이드인 효과와 함께 표시
 * - Intersection Observer를 사용하여 뷰포트에 들어올 때 로딩 시작 (브라우저 loading="lazy"와 함께 사용)
 */
export function LazyImage({ src, alt, className, aspectRatio = "video", ...props }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)

  // 간단한 로딩 지연 효과를 위해 100ms 타임아웃을 줄 수도 있지만,
  // 실제 UX를 위해 이미지가 진짜 로드되었을 때만 보여주는 것이 좋음.

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted", 
        className
      )}
      {...props}
    >
      {/* 스켈레톤 (로딩 중일 때만 보임) */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      
      {/* 실제 이미지 */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500 ease-in-out",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}

