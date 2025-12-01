import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
} from "@tanstack/react-table"
import { format } from 'date-fns'
import { Search, Users as UsersIcon, UserCheck, UserX, Clock } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

/**
 * 회원 관리 페이지
 * 언어팩 적용됨
 */
export default function Users() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useLanguage()

  // 컬럼 정의 (언어팩 적용)
  const columns = [
    {
      accessorKey: "email",
      header: () => t('admin.colEmail'),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "user_role",
      header: () => t('admin.colRole'),
      cell: ({ row }) => {
        const role = row.getValue("user_role")
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            role === 'admin' 
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {role || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: "user_type",
      header: () => t('admin.colUserType'),
      cell: ({ row }) => {
        const type = row.getValue("user_type")
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            type === 'admin' 
              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' 
              : type === 'partner'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            {type || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: () => t('admin.colStatus'),
      cell: ({ row }) => {
        const status = row.getValue("status")
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'active' 
              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
              : status === 'pending'
              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            {status || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: "description",
      header: () => t('admin.colDescription'),
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
            {row.getValue("description") || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: () => t('admin.colJoinDate'),
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.getValue("created_at")), 'yyyy-MM-dd HH:mm')}
          </span>
        )
      },
    },
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setData(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  // 통계 계산
  const stats = {
    total: data.length,
    active: data.filter(u => u.status === 'active').length,
    pending: data.filter(u => u.status === 'pending').length,
    admin: data.filter(u => u.user_role === 'admin').length,
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin.usersTitle')}</h2>
          <p className="text-muted-foreground mt-1">{t('admin.usersDesc')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.allMembers')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.activeMembers')}</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.pendingApproval')}</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <UserX className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.administrators')}</p>
                <p className="text-2xl font-bold">{stats.admin}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="flex-1">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{t('admin.userList')}</CardTitle>
                <CardDescription>{t('admin.userListDesc').replace('{count}', stats.total.toString())}</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.searchPlaceholder')}
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="hover:bg-muted/50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>{t('common.loading')}</span>
                          </div>
                        ) : (
                          t('common.noData')
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
