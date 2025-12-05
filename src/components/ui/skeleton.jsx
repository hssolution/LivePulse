import { cn } from "@/lib/utils"

/**
 * 스켈레톤 로딩 컴포넌트
 * 콘텐츠 로딩 중 플레이스홀더 역할
 */
function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

