import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/**
 * 로딩 스피너 컴포넌트
 * @param {string} size - 크기: 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} text - 로딩 텍스트
 * @param {boolean} fullScreen - 전체 화면 로딩 여부
 */
export function Loading({ size = 'md', text, fullScreen = false, className }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    )
  }

  return content
}

/**
 * 페이지 로딩 컴포넌트
 */
export function PageLoading({ text = '로딩 중...' }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <Loading size="lg" text={text} />
    </div>
  )
}

/**
 * 스켈레톤 컴포넌트
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

/**
 * 카드 스켈레톤
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/**
 * 테이블 스켈레톤
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-0 p-4">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

