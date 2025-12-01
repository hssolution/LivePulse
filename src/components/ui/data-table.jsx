import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

/**
 * 서버 사이드 페이징을 지원하는 DataTable 컴포넌트
 * 
 * @param {Object} props
 * @param {Array} props.columns - 컬럼 정의 배열
 * @param {Array} props.data - 현재 페이지 데이터
 * @param {number} props.totalCount - 전체 데이터 개수
 * @param {number} props.pageIndex - 현재 페이지 인덱스 (0부터 시작)
 * @param {number} props.pageSize - 페이지당 행 수
 * @param {Function} props.onPageChange - 페이지 변경 콜백 (pageIndex) => void
 * @param {Function} props.onPageSizeChange - 페이지 크기 변경 콜백 (pageSize) => void
 * @param {boolean} props.loading - 로딩 상태
 * @param {string} props.emptyMessage - 데이터 없을 때 메시지
 */
export function DataTable({
  columns,
  data,
  totalCount = 0,
  pageIndex = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
}) {
  const pageCount = Math.ceil(totalCount / pageSize)
  
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex, pageSize })
        if (newState.pageIndex !== pageIndex) {
          onPageChange?.(newState.pageIndex)
        }
        if (newState.pageSize !== pageSize) {
          onPageSizeChange?.(newState.pageSize)
        }
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // 서버 사이드 페이징
  })

  const startRow = pageIndex * pageSize + 1
  const endRow = Math.min((pageIndex + 1) * pageSize, totalCount)

  /**
   * 페이지 번호 목록 생성
   */
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    const currentPage = pageIndex + 1
    
    if (pageCount <= maxVisiblePages) {
      for (let i = 1; i <= pageCount; i++) {
        pages.push(i)
      }
    } else {
      const half = Math.floor(maxVisiblePages / 2)
      let start = currentPage - half
      let end = currentPage + half

      if (start < 1) {
        start = 1
        end = maxVisiblePages
      }
      if (end > pageCount) {
        end = pageCount
        start = pageCount - maxVisiblePages + 1
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  return (
    <div className="flex flex-col h-full">
      {/* 테이블 */}
      <div className="rounded-md border flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    style={{ width: header.column.columnDef.size }}
                    className={header.column.columnDef.meta?.headerClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">로딩 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`${index % 2 === 1 ? "bg-muted/70" : ""} hover:bg-primary/20 transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className={cell.column.columnDef.meta?.cellClassName}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이징 */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              총 {totalCount.toLocaleString()}개 중 {startRow.toLocaleString()}-{endRow.toLocaleString()}개 표시
            </span>
            <Select 
              value={String(pageSize)} 
              onValueChange={(v) => {
                onPageSizeChange?.(Number(v))
                onPageChange?.(0) // 페이지 크기 변경 시 첫 페이지로
              }}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개</SelectItem>
                <SelectItem value="20">20개</SelectItem>
                <SelectItem value="50">50개</SelectItem>
                <SelectItem value="100">100개</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {pageCount > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange?.(0)}
                disabled={pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange?.(pageIndex - 1)}
                disabled={pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {getPageNumbers().map((page) => (
                <Button
                  key={page}
                  variant={pageIndex + 1 === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange?.(page - 1)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange?.(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange?.(pageCount - 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DataTable

