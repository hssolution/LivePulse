import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Search, Users as UsersIcon, UserCheck, UserX, Clock, Building2, Crown, UserCog, User } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import UserDetailDialog from '@/components/common/UserDetailDialog'
import PartnerInfoDialog from '@/components/common/PartnerInfoDialog'

/**
 * 회원 관리 페이지
 * 언어팩 적용됨
 */
export default function Users() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  
  // 파트너 상세 팝업 상태
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  
  const { t } = useLanguage()

  /**
   * 유저 상세 팝업 열기
   */
  const handleUserClick = (user, e) => {
    e.stopPropagation()
    setSelectedUser(user)
    setDetailDialogOpen(true)
  }

  /**
   * 파트너 상세 팝업 열기
   */
  const handlePartnerClick = (partnerId, e) => {
    e.stopPropagation()
    if (partnerId) {
      setSelectedPartnerId(partnerId)
      setPartnerDialogOpen(true)
    }
  }

  /**
   * 마지막 로그인 시간 포맷팅
   */
  const formatLastLogin = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return t('team.justNow')
    if (diffMins < 60) return t('team.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('team.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('team.daysAgo', { count: diffDays })
    return format(date, 'yyyy-MM-dd')
  }

  // 컬럼 정의 (언어팩 적용)
  const columns = [
    {
      accessorKey: "email",
      header: () => t('admin.colEmail'),
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={(e) => handleUserClick(row.original, e)}
        >
          {row.getValue("email")}
        </span>
      ),
    },
    {
      accessorKey: "display_name",
      header: () => t('common.displayName'),
      cell: ({ row }) => (
        <span 
          className="text-sm text-primary hover:underline cursor-pointer"
          onClick={(e) => handleUserClick(row.original, e)}
        >
          {row.getValue("display_name") || '-'}
        </span>
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
      id: "partner_info",
      header: () => t('admin.colPartnerInfo'),
      cell: ({ row }) => {
        const ownedPartner = row.original.ownedPartner
        const memberOfPartners = row.original.memberOfPartners || []
        
        if (!ownedPartner && memberOfPartners.length === 0) {
          return <span className="text-sm text-muted-foreground">-</span>
        }
        
        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            {/* 소유 파트너 */}
            {ownedPartner && (
              <div 
                className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                onClick={(e) => handlePartnerClick(ownedPartner.id, e)}
              >
                <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate text-primary hover:underline" title={ownedPartner.name}>
                  {ownedPartner.name}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
                  {t('admin.owner')}
                </Badge>
              </div>
            )}
            {/* 소속 파트너 */}
            {memberOfPartners.map((p, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                onClick={(e) => handlePartnerClick(p.id, e)}
              >
                {p.role === 'owner' ? (
                  <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                ) : p.role === 'admin' ? (
                  <UserCog className="h-3 w-3 text-purple-500 flex-shrink-0" />
                ) : (
                  <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-sm truncate text-primary hover:underline" title={p.name}>
                  {p.name}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1 py-0 flex-shrink-0 ${
                  p.role === 'owner' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                  p.role === 'admin' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {p.role === 'owner' ? t('team.roleOwner') : 
                   p.role === 'admin' ? t('team.roleAdmin') : 
                   t('team.roleMember')}
                </Badge>
              </div>
            ))}
          </div>
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
      accessorKey: "lastLoginAt",
      header: () => t('team.lastLogin'),
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {formatLastLogin(row.getValue("lastLoginAt"))}
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
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (usersData && usersData.length > 0) {
        const userIds = usersData.map(u => u.id).filter(Boolean)
        
        // 1. 마지막 로그인 시간 조회
        const { data: loginLogsData } = await supabase
          .from('login_logs')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .eq('event_type', 'login_success')
          .order('created_at', { ascending: false })
        
        // 사용자별 마지막 로그인 시간 매핑
        const lastLoginMap = {}
        loginLogsData?.forEach(log => {
          if (!lastLoginMap[log.user_id]) {
            lastLoginMap[log.user_id] = log.created_at
          }
        })
        
        // 2. 소유한 파트너 정보 조회
        const { data: partnersData } = await supabase
          .from('partners')
          .select(`
            id,
            profile_id,
            partner_type,
            representative_name,
            is_active,
            partner_organizers(company_name),
            partner_agencies(company_name),
            partner_instructors(specialty)
          `)
          .in('profile_id', userIds)
        
        // 소유 파트너 매핑
        const ownedPartnerMap = {}
        partnersData?.forEach(p => {
          const partnerName = p.partner_organizers?.[0]?.company_name || 
                              p.partner_agencies?.[0]?.company_name || 
                              p.representative_name
          ownedPartnerMap[p.profile_id] = {
            id: p.id,
            name: partnerName,
            type: p.partner_type,
            is_active: p.is_active
          }
        })
        
        // 3. 소속된 파트너 정보 조회 (멤버로)
        const { data: membershipData } = await supabase
          .from('partner_members')
          .select(`
            user_id,
            role,
            status,
            partner:partners(
              id,
              profile_id,
              partner_type,
              representative_name,
              is_active,
              partner_organizers(company_name),
              partner_agencies(company_name)
            )
          `)
          .in('user_id', userIds)
          .eq('status', 'accepted')
        
        // 소속 파트너 매핑 (여러 개일 수 있음, 단 소유 파트너는 제외)
        const memberOfMap = {}
        membershipData?.forEach(m => {
          // 본인이 소유한 파트너는 memberOfPartners에서 제외 (ownedPartner에서 이미 표시)
          if (m.partner?.profile_id === m.user_id) {
            return
          }
          
          if (!memberOfMap[m.user_id]) {
            memberOfMap[m.user_id] = []
          }
          const partnerName = m.partner?.partner_organizers?.[0]?.company_name || 
                              m.partner?.partner_agencies?.[0]?.company_name || 
                              m.partner?.representative_name
          memberOfMap[m.user_id].push({
            id: m.partner?.id,
            name: partnerName,
            type: m.partner?.partner_type,
            role: m.role,
            is_active: m.partner?.is_active
          })
        })
        
        // 회원에 정보 매핑
        usersData.forEach(u => {
          u.lastLoginAt = lastLoginMap[u.id] || null
          u.ownedPartner = ownedPartnerMap[u.id] || null
          u.memberOfPartners = memberOfMap[u.id] || []
        })
      }
      
      setData(usersData || [])
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
                        className="hover:bg-muted/50 transition-colors"
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

      {/* 유저 상세 정보 다이얼로그 */}
      <UserDetailDialog
        user={selectedUser}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      {/* 파트너 상세 정보 다이얼로그 */}
      <PartnerInfoDialog
        partnerId={selectedPartnerId}
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
      />
    </div>
  )
}
