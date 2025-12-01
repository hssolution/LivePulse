import { cn } from '@/lib/utils'
import { Button } from './button'
import { FileQuestion, Plus, Search, Inbox } from 'lucide-react'

/**
 * 빈 상태 컴포넌트
 * 데이터가 없을 때 표시하는 UI
 * 
 * @param {string} title - 제목
 * @param {string} description - 설명
 * @param {React.ReactNode} icon - 아이콘 (기본: Inbox)
 * @param {string} actionLabel - 액션 버튼 텍스트
 * @param {function} onAction - 액션 버튼 클릭 핸들러
 */
export function EmptyState({
  title = '데이터가 없습니다',
  description = '아직 등록된 데이터가 없습니다.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * 검색 결과 없음 컴포넌트
 */
export function NoSearchResults({ query, onClear }) {
  return (
    <EmptyState
      icon={Search}
      title="검색 결과가 없습니다"
      description={`"${query}"에 대한 검색 결과를 찾을 수 없습니다. 다른 검색어를 시도해보세요.`}
      actionLabel={onClear ? "검색 초기화" : undefined}
      onAction={onClear}
    />
  )
}

/**
 * 에러 상태 컴포넌트
 */
export function ErrorState({ title = '오류가 발생했습니다', description, onRetry }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={title}
      description={description || '데이터를 불러오는 중 문제가 발생했습니다. 다시 시도해주세요.'}
      actionLabel={onRetry ? "다시 시도" : undefined}
      onAction={onRetry}
    />
  )
}

