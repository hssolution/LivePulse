import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Loader2, 
  Search,
  RefreshCw,
  LogIn,
  LogOut,
  XCircle,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  User,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

/**
 * 관리자 로그인 로그 조회 페이지
 */
export default function LoginLogs() {
  const { t, currentLanguage } = useLanguage()
  const dateLocale = currentLanguage === 'ko' ? ko : enUS
  
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  // 필터
  const [searchEmail, setSearchEmail] = useState('')
  const [filterEventType, setFilterEventType] = useState('all')
  const [filterDateRange, setFilterDateRange] = useState('7') // 일 수
  
  // 통계
  const [statistics, setStatistics] = useState(null)
  
  // 활성 세션
  const [activeSessions, setActiveSessions] = useState([])
  const [loadingActiveSessions, setLoadingActiveSessions] = useState(false)
  
  // 상세 보기 모달
  const [selectedLog, setSelectedLog] = useState(null)

  /**
   * 로그인 로그 로드
   */
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('login_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      
      // 날짜 범위 필터
      if (filterDateRange !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(filterDateRange))
        query = query.gte('created_at', daysAgo.toISOString())
      }
      
      // 이벤트 타입 필터
      if (filterEventType !== 'all') {
        query = query.eq('event_type', filterEventType)
      }
      
      // 이메일 검색
      if (searchEmail) {
        query = query.ilike('email', `%${searchEmail}%`)
      }
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading login logs:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filterDateRange, filterEventType, searchEmail])

  /**
   * 통계 로드
   */
  const loadStatistics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_login_statistics', {
        p_days: parseInt(filterDateRange) || 7
      })
      
      if (error) throw error
      setStatistics(data?.[0] || null)
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }, [filterDateRange])

  /**
   * 활성 세션 로드
   */
  const loadActiveSessions = async () => {
    setLoadingActiveSessions(true)
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select(`
          *,
          user:user_id (email)
        `)
        .order('last_activity_at', { ascending: false })
      
      if (error) throw error
      setActiveSessions(data || [])
    } catch (error) {
      console.error('Error loading active sessions:', error)
    } finally {
      setLoadingActiveSessions(false)
    }
  }

  useEffect(() => {
    loadLogs()
    loadStatistics()
  }, [loadLogs, loadStatistics])

  useEffect(() => {
    loadActiveSessions()
  }, [])

  /**
   * 이벤트 타입 뱃지
   */
  const getEventTypeBadge = (eventType) => {
    switch (eventType) {
      case 'login_success':
        return <Badge className="bg-green-500"><LogIn className="h-3 w-3 mr-1" />{t('loginLog.loginSuccess')}</Badge>
      case 'login_failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t('loginLog.loginFailed')}</Badge>
      case 'logout':
        return <Badge variant="secondary"><LogOut className="h-3 w-3 mr-1" />{t('loginLog.logout')}</Badge>
      case 'forced_logout':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertTriangle className="h-3 w-3 mr-1" />{t('loginLog.forcedLogout')}</Badge>
      case 'session_expired':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t('loginLog.sessionExpired')}</Badge>
      default:
        return <Badge variant="outline">{eventType}</Badge>
    }
  }

  /**
   * 실패 사유 표시
   */
  const getFailureReasonText = (reason) => {
    if (!reason) return '-'
    
    const reasonMap = {
      'invalid_password': t('loginLog.reasonInvalidPassword'),
      'user_not_found': t('loginLog.reasonUserNotFound'),
      'account_disabled': t('loginLog.reasonAccountDisabled'),
      'email_not_confirmed': t('loginLog.reasonEmailNotConfirmed'),
      'too_many_attempts': t('loginLog.reasonTooManyAttempts'),
      'too_many_requests': t('loginLog.reasonTooManyRequests'),
      'duplicate_login': t('loginLog.reasonDuplicateLogin'),
      'unknown_error': t('loginLog.reasonUnknown')
    }
    
    return reasonMap[reason] || reason
  }

  /**
   * 기기 아이콘
   */
  const getDeviceIcon = (deviceInfo) => {
    const device = deviceInfo?.device || 'Desktop'
    switch (device) {
      case 'Mobile':
        return <Smartphone className="h-4 w-4" />
      case 'Tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  /**
   * 세션 강제 종료
   */
  const handleForceEndSession = async (session) => {
    if (!confirm(t('loginLog.confirmForceLogout'))) return
    
    try {
      const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('id', session.id)
      
      if (error) throw error
      
      // 로그 기록
      await supabase.rpc('log_login_event', {
        p_email: session.user?.email || 'unknown',
        p_event_type: 'forced_logout',
        p_failure_reason: 'admin_action',
        p_ip_address: session.ip_address,
        p_user_agent: session.user_agent,
        p_device_info: session.device_info,
        p_session_id: session.session_token
      })
      
      loadActiveSessions()
      loadLogs()
    } catch (error) {
      console.error('Error force ending session:', error)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('loginLog.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('loginLog.desc')}</p>
      </div>

      {/* 통계 카드 */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.totalLogins')}</p>
                  <p className="text-2xl font-bold">{statistics.total_logins || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.successfulLogins')}</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.successful_logins || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.failedLogins')}</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.failed_logins || 0}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.uniqueUsers')}</p>
                  <p className="text-2xl font-bold">{statistics.unique_users || 0}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.forcedLogouts')}</p>
                  <p className="text-2xl font-bold text-amber-600">{statistics.forced_logouts || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 활성 세션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('loginLog.activeSessions')}</CardTitle>
              <CardDescription>{t('loginLog.activeSessionsDesc')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadActiveSessions} disabled={loadingActiveSessions}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingActiveSessions ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingActiveSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activeSessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t('loginLog.noActiveSessions')}</p>
          ) : (
            <div className="space-y-2">
              {activeSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(session.device_info)}
                    <div>
                      <p className="font-medium">{session.user?.email || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.device_info?.browser} · {session.device_info?.os} · {session.ip_address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(session.last_activity_at), 'MM/dd HH:mm', { locale: dateLocale })}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleForceEndSession(session)}
                    >
                      {t('loginLog.forceLogout')}
                    </Button>
                  </div>
                </div>
              ))}
              {activeSessions.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{activeSessions.length - 5} {t('loginLog.moreSessions')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('loginLog.searchEmail')}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('loginLog.eventType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="login_success">{t('loginLog.loginSuccess')}</SelectItem>
            <SelectItem value="login_failed">{t('loginLog.loginFailed')}</SelectItem>
            <SelectItem value="logout">{t('loginLog.logout')}</SelectItem>
            <SelectItem value="forced_logout">{t('loginLog.forcedLogout')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterDateRange} onValueChange={setFilterDateRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('loginLog.dateRange')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t('loginLog.last1Day')}</SelectItem>
            <SelectItem value="7">{t('loginLog.last7Days')}</SelectItem>
            <SelectItem value="30">{t('loginLog.last30Days')}</SelectItem>
            <SelectItem value="90">{t('loginLog.last90Days')}</SelectItem>
            <SelectItem value="all">{t('common.all')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={() => { loadLogs(); loadStatistics(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 로그 테이블 */}
      <Card className="flex-1">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('loginLog.time')}</TableHead>
                  <TableHead>{t('loginLog.email')}</TableHead>
                  <TableHead>{t('loginLog.eventType')}</TableHead>
                  <TableHead>{t('loginLog.failureReason')}</TableHead>
                  <TableHead>{t('loginLog.device')}</TableHead>
                  <TableHead>{t('loginLog.ip')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('loginLog.noLogs')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="font-medium">{log.email}</TableCell>
                      <TableCell>{getEventTypeBadge(log.event_type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getFailureReasonText(log.failure_reason)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(log.device_info)}
                          <span className="text-sm">{log.device_info?.browser || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.ip_address || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              {t('common.showing')} {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} {t('common.of')} {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('common.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 상세 보기 모달 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('loginLog.detail')}</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: dateLocale })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.email')}</p>
                  <p className="font-medium">{selectedLog.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.eventType')}</p>
                  <div className="mt-1">{getEventTypeBadge(selectedLog.event_type)}</div>
                </div>
              </div>
              
              {selectedLog.failure_reason && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.failureReason')}</p>
                  <p className="font-medium text-red-600">{getFailureReasonText(selectedLog.failure_reason)}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.ip')}</p>
                  <p className="font-medium">{selectedLog.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.device')}</p>
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(selectedLog.device_info)}
                    <span>{selectedLog.device_info?.device || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.browser')}</p>
                  <p className="font-medium">{selectedLog.device_info?.browser || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.os')}</p>
                  <p className="font-medium">{selectedLog.device_info?.os || '-'}</p>
                </div>
              </div>
              
              {selectedLog.session_id && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('loginLog.sessionId')}</p>
                  <p className="font-mono text-xs break-all">{selectedLog.session_id}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">{t('loginLog.userAgent')}</p>
                <p className="text-xs text-muted-foreground break-all">{selectedLog.user_agent || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

