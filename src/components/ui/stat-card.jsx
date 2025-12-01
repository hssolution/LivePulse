/**
 * 통계 카드 컴포넌트 (미니 버전)
 */
export function StatCard({ title, value, description, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border bg-card ${className}`}>
      {Icon && (
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold">{value}</span>
          <span className="text-xs text-muted-foreground truncate">{title}</span>
        </div>
        {description && (
          <p className="text-[10px] text-muted-foreground truncate">{description}</p>
        )}
      </div>
    </div>
  )
}

export default StatCard

