import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Calendar, Activity, TrendingUp, PieChart as PieIcon, BarChart3, Radio, Briefcase, Clock, ShieldAlert, Trophy, Globe, CheckCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Link } from 'react-router-dom'
import { 
  ComposedChart, Line, Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'
import { useLanguage } from '@/context/LanguageContext'
import { format, subDays, startOfDay, endOfDay, parseISO, getHours, startOfMonth, subMonths } from 'date-fns'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_COLORS = { 
  approved: '#10b981', // Green
  pending: '#f59e0b',  // Yellow
  rejected: '#ef4444'  // Red
}

export default function Dashboard() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  
  const [stats, setStats] = useState({
    liveSessions: 0,
    todaySessions: 0,
    totalParticipants: 0,
    activePartners: 0,
    newUsersThisMonth: 0,
    avgParticipants: 0,
    loginFailureRate: 0
  })

  const [sessionTrend, setSessionTrend] = useState([])
  const [partnerTypeDist, setPartnerTypeDist] = useState([])
  const [sessionStatusDist, setSessionStatusDist] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [topSessions, setTopSessions] = useState([])
  const [topPartners, setTopPartners] = useState([])
  const [languageDist, setLanguageDist] = useState([])
  const [approvalStats, setApprovalStats] = useState([])
  const [userTypeDist, setUserTypeDist] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const today = new Date()
        const todayStart = startOfDay(today).toISOString()
        const todayEnd = endOfDay(today).toISOString()
        const twoWeeksAgo = startOfDay(subDays(today, 13)).toISOString()
        const monthStart = startOfDay(startOfMonth(today)).toISOString()

        const [
          activeSessions, 
          todaySessionsData,
          todayLogins,
          allProfiles,
          allSessions,
          allPartners,
          partnerRequests,
          loginLogs,
          monthUsers
        ] = await Promise.all([
          supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('sessions').select('participant_count').gte('start_at', todayStart).lte('start_at', todayEnd),
          supabase.from('login_logs').select('user_id, profiles!inner(user_type)').eq('profiles.user_type', 'partner').gte('created_at', todayStart),
          supabase.from('profiles').select('user_type, preferred_language'),
          supabase.from('sessions').select('id, title, status, participant_count, partner_id, partners(representative_name)'),
          supabase.from('partners').select('id, partner_type, representative_name'),
          supabase.from('partner_requests').select('status'),
          supabase.from('login_logs').select('created_at, event_type').order('created_at', { ascending: false }).limit(1000),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthStart)
        ])

        // Stats Calculation
        const totalPart = todaySessionsData.data?.reduce((sum, s) => sum + (s.participant_count || 0), 0) || 0
        const activePartnerIds = new Set(todayLogins.data?.map(l => l.user_id))
        const failures = loginLogs.data?.filter(l => l.event_type === 'login_failed').length || 0
        const totalLogs = loginLogs.data?.length || 1
        const failureRate = Math.round((failures / totalLogs) * 100)
        const totalSessionCount = allSessions.data?.length || 1
        const globalTotalPart = allSessions.data?.reduce((sum, s) => sum + (s.participant_count || 0), 0) || 0
        const avgPart = Math.round(globalTotalPart / totalSessionCount)

        setStats({
          liveSessions: activeSessions.count || 0,
          todaySessions: todaySessionsData.data?.length || 0,
          totalParticipants: totalPart,
          activePartners: activePartnerIds.size,
          newUsersThisMonth: monthUsers.count || 0,
          avgParticipants: avgPart,
          loginFailureRate: failureRate
        })

        // Data Processing
        const uTypeCounts = { user: 0, partner: 0, admin: 0 }
        const langCounts = {}
        allProfiles.data?.forEach(p => {
          if (uTypeCounts[p.user_type] !== undefined) uTypeCounts[p.user_type]++
          const lang = p.preferred_language || 'ko'
          langCounts[lang] = (langCounts[lang] || 0) + 1
        })
        // 사용자 유형 번역 적용
        setUserTypeDist([
          { name: t('user.type.user', '일반 사용자'), value: uTypeCounts.user },
          { name: t('user.type.partner', '파트너'), value: uTypeCounts.partner },
          { name: t('user.type.admin', '관리자'), value: uTypeCounts.admin }
        ])
        setLanguageDist(Object.entries(langCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5))

        const sStatusCounts = { draft: 0, published: 0, active: 0, ended: 0 }
        allSessions.data?.forEach(s => {
          const st = s.status || 'draft'
          if (sStatusCounts[st] !== undefined) sStatusCounts[st]++
        })
        setSessionStatusDist([
          { name: t('status.draft', '준비중'), value: sStatusCounts.draft },
          { name: t('status.published', '공개됨'), value: sStatusCounts.published },
          { name: t('status.active', '진행중'), value: sStatusCounts.active },
          { name: t('status.ended', '종료됨'), value: sStatusCounts.ended }
        ])

        setTopSessions([...(allSessions.data || [])].sort((a, b) => (b.participant_count || 0) - (a.participant_count || 0)).slice(0, 5))

        const partnerSessionCounts = {}
        allSessions.data?.forEach(s => {
          if (s.partner_id) {
            const pName = s.partners?.representative_name || 'Unknown'
            partnerSessionCounts[pName] = (partnerSessionCounts[pName] || 0) + 1
          }
        })
        setTopPartners(Object.entries(partnerSessionCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5))

        const hours = new Array(24).fill(0)
        loginLogs.data?.forEach(l => {
          const h = getHours(parseISO(l.created_at))
          hours[h]++
        })
        setPeakHours(hours.map((count, hour) => ({ hour: `${hour}시`, count })))

        const reqCounts = { pending: 0, approved: 0, rejected: 0 }
        partnerRequests.data?.forEach(r => {
          if (reqCounts[r.status] !== undefined) reqCounts[r.status]++
        })
        // 승인 상태 번역 적용
        setApprovalStats([
          { name: t('status.approved', '승인됨'), value: reqCounts.approved, fill: STATUS_COLORS.approved },
          { name: t('status.pending', '대기중'), value: reqCounts.pending, fill: STATUS_COLORS.pending },
          { name: t('status.rejected', '거절됨'), value: reqCounts.rejected, fill: STATUS_COLORS.rejected }
        ].filter(item => item.value > 0))

        const { data: sessionsHistory } = await supabase
          .from('sessions').select('start_at, participant_count').gte('start_at', twoWeeksAgo).lte('start_at', todayEnd)
        
        const sessionMap = new Map()
        for (let i = 0; i < 14; i++) {
          const d = subDays(today, 13 - i); const dateStr = format(d, 'MM/dd')
          sessionMap.set(dateStr, { date: dateStr, sessions: 0, participants: 0 })
        }
        sessionsHistory?.forEach(s => {
          const dateStr = format(parseISO(s.start_at), 'MM/dd')
          if (sessionMap.has(dateStr)) {
            const c = sessionMap.get(dateStr)
            c.sessions++; c.participants += (s.participant_count || 0)
          }
        })
        setSessionTrend(Array.from(sessionMap.values()))

      } catch (error) {
        console.error('Dashboard Data Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [t])

  if (loading) return <div className="p-8 flex justify-center"><Activity className="animate-spin h-8 w-8 text-primary" /></div>

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-100 font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm" style={{ color: entry.fill || entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }}></span>
              <span>{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title', '세션 현황 및 파트너 분석')}</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.liveSessions', 'Live 세션')}</CardTitle>
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveSessions}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.liveDesc', '현재 진행 중인 세션')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.todaySessions', '오늘의 세션')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySessions}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.scheduledDesc', '오늘 예정된 세션')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.newUsers', '이번 달 신규 가입')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.growthDesc', '지속적인 성장세')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.security', '로그인 실패율')}</CardTitle>
            <ShieldAlert className={`h-4 w-4 ${stats.loginFailureRate > 5 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loginFailureRate}%</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.securityDesc', '전체 시도 대비 실패')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Session Trend */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('dashboard.sessionTrend', '세션 추이')}</CardTitle>
            <CardDescription>{t('dashboard.sessionTrendDesc', '최근 14일간의 세션 수와 참여자 규모')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sessionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="sessions" name={t('common.sessions', '세션 수')} barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="participants" name={t('common.participants', '참여자 수')} stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.peakHours', '시간대별 활동량')}</CardTitle>
            <CardDescription>{t('dashboard.peakHoursDesc', '사용자 접속 집중 시간대')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={3} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name={t('common.activity', '활동량')} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* User Types */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userTypes', '사용자 유형')}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={userTypeDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {userTypeDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.sessionStatus', '세션 상태')}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sessionStatusDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {sessionStatusDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.languages', '언어 분포')}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               {languageDist.map((item, index) => (
                 <div key={index} className="flex items-center gap-2">
                   <div className="w-16 text-sm text-muted-foreground uppercase">{item.name}</div>
                   <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-primary" style={{ width: `${stats.totalUsers > 0 ? (item.value / stats.totalUsers) * 100 : 0}%` }} />
                   </div>
                   <div className="text-sm font-bold">{item.value}</div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Sessions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.topSessions', '인기 세션 TOP 5')}</CardTitle>
            <CardDescription>{t('dashboard.topSessionsDesc', '참여자가 가장 많은 세션')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSessions.map((session, index) => (
                <div key={session.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-800 text-slate-400'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium line-clamp-1 text-sm">{session.title}</p>
                      <p className="text-xs text-muted-foreground">{session.partners?.representative_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    {session.participant_count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Partners */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.topPartners', '우수 파트너')}</CardTitle>
            <CardDescription>{t('dashboard.topPartnersDesc', '세션 개최 순위')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPartners.map((partner, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className={`w-4 h-4 ${index === 0 ? 'text-yellow-500' : 'text-slate-500'}`} />
                    <span className="text-sm font-medium">{partner.name}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{partner.count}회</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Approval Status (Modified) */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.approvalStatus', '파트너 승인 현황')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {approvalStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
