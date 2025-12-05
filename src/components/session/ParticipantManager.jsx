import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import UserDetailDialog from '@/components/common/UserDetailDialog'
import ParticipantStats from '@/components/session/ParticipantStats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * 세션 참가자 관리 컴포넌트
 * 세션 상세 페이지의 탭으로 사용
 */
export default function ParticipantManager({ sessionId, sessionCode }) {
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [participants, setParticipants] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, authenticated, anonymous
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month

  // 통계
  const [stats, setStats] = useState({
    total: 0,
    authenticated: 0,
    anonymous: 0,
    today: 0
  })

  // 사용자 상세 다이얼로그
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showUserDetail, setShowUserDetail] = useState(false)

  /**
   * 참가자 목록 로드
   */
  const loadParticipants = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)
    
    try {
      // 인증된 참가자 (session_members) - user_id만 가져오기
      const { data: authMembers, error: authError } = await supabase
        .from('session_members')
        .select('id, created_at, role, user_id')
        .eq('session_id', sessionId)
        .eq('role', 'participant')
        .order('created_at', { ascending: false })

      if (authError) throw authError

      // user_id 목록 추출
      const userIds = (authMembers || [])
        .map(m => m.user_id)
        .filter(id => id != null)

      // profiles 정보 별도로 가져오기
      let profilesMap = {}
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .in('id', userIds)

        if (profileError) throw profileError

        // Map으로 변환
        profilesMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile
          return acc
        }, {})
      }

      // 익명 참가자 (anonymous_participants)
      const { data: anonMembers, error: anonError } = await supabase
        .from('anonymous_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (anonError) throw anonError

      // 데이터 합치기
      const authList = (authMembers || []).map(member => {
        const profile = profilesMap[member.user_id]
        return {
          id: member.id,
          type: 'authenticated',
          name: profile?.display_name || t('participant.noName'),
          email: profile?.email || '',
          phone: '',
          userId: member.user_id,
          createdAt: member.created_at
        }
      })

      const anonList = (anonMembers || []).map(member => ({
        id: member.id,
        type: 'anonymous',
        name: member.name,
        email: member.email,
        phone: member.phone,
        userId: null,
        createdAt: member.created_at
      }))

      const allParticipants = [...authList, ...anonList]
      setParticipants(allParticipants)
      setFilteredParticipants(allParticipants)

      // 통계 계산
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      setStats({
        total: allParticipants.length,
        authenticated: authList.length,
        anonymous: anonList.length,
        today: allParticipants.filter(p => new Date(p.createdAt) >= today).length
      })
    } catch (err) {
      console.error('Error loading participants:', err)
      console.error('Error details:', err.message, err.details, err.hint)
      toast.error(t('error.loadFailed') + ': ' + (err.message || ''))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  /**
   * 필터 적용
   */
  useEffect(() => {
    let filtered = [...participants]

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.phone.includes(term)
      )
    }

    // 타입 필터
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType)
    }

    // 날짜 필터
    if (dateFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(p => {
        const createdAt = new Date(p.createdAt)
        switch (dateFilter) {
          case 'today':
            return createdAt.toDateString() === now.toDateString()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return createdAt >= weekAgo
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return createdAt >= monthAgo
          default:
            return true
        }
      })
    }

    setFilteredParticipants(filtered)
  }, [searchTerm, filterType, dateFilter, participants])

  /**
   * 사용자 상세 보기
   */
  const handleUserClick = (participant) => {
    console.log('Participant clicked:', participant)
    if (participant.type === 'authenticated' && participant.userId) {
      console.log('Opening user detail for:', participant.userId)
      setSelectedUserId(participant.userId)
      setShowUserDetail(true)
    } else {
      console.log('Cannot open detail - type:', participant.type, 'userId:', participant.userId)
    }
  }

  useEffect(() => {
    if (sessionId) {
      loadParticipants()
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('participant.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('participant.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadParticipants(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">
            <Users className="h-4 w-4 mr-2" />
            {t('participant.list')}
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('participant.statistics')}
          </TabsTrigger>
        </TabsList>

        {/* 목록 탭 */}
        <TabsContent value="list" className="space-y-6 mt-0">
          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.totalCount')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.authenticated')}</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.authenticated}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.anonymous')}</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.anonymous}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.todayCount')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('participant.filter')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 검색 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('participant.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 타입 필터 */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('participant.filterAll')}</SelectItem>
                <SelectItem value="authenticated">{t('participant.filterAuth')}</SelectItem>
                <SelectItem value="anonymous">{t('participant.filterAnon')}</SelectItem>
              </SelectContent>
            </Select>

            {/* 날짜 필터 */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('participant.dateAll')}</SelectItem>
                <SelectItem value="today">{t('participant.dateToday')}</SelectItem>
                <SelectItem value="week">{t('participant.dateWeek')}</SelectItem>
                <SelectItem value="month">{t('participant.dateMonth')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 참가자 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('participant.list')}</CardTitle>
            <Badge variant="outline">
              {filteredParticipants.length} / {stats.total}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t('participant.no')}</TableHead>
                  <TableHead>{t('participant.name')}</TableHead>
                  <TableHead>{t('participant.email')}</TableHead>
                  <TableHead>{t('participant.phone')}</TableHead>
                  <TableHead>{t('participant.type')}</TableHead>
                  <TableHead>{t('participant.joinDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('participant.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {participant.type === 'authenticated' && participant.userId ? (
                          <button
                            onClick={() => handleUserClick(participant)}
                            className="text-primary hover:underline cursor-pointer font-medium"
                          >
                            {participant.name}
                          </button>
                        ) : (
                          <span>{participant.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {participant.type === 'authenticated' && participant.userId ? (
                              <button
                                onClick={() => handleUserClick(participant)}
                                className="text-sm text-primary hover:underline cursor-pointer"
                              >
                                {participant.email}
                              </button>
                            ) : (
                              <span className="text-sm">{participant.email}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{participant.phone}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={participant.type === 'authenticated' ? 'default' : 'secondary'}>
                          {participant.type === 'authenticated' ? t('participant.member') : t('participant.guest')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(participant.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* 통계 탭 */}
        <TabsContent value="stats" className="mt-0">
          <ParticipantStats participants={participants} />
        </TabsContent>
      </Tabs>

      {/* 사용자 상세 다이얼로그 */}
      <UserDetailDialog
        userId={selectedUserId}
        open={showUserDetail}
        onOpenChange={setShowUserDetail}
      />
    </div>
  )
}

