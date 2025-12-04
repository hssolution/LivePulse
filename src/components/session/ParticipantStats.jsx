import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/LanguageContext'
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  Clock,
  BarChart3,
  PieChart
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { format, parseISO, startOfDay, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 참가자 통계 컴포넌트
 * 다양한 차트와 통계 정보 제공
 */
export default function ParticipantStats({ participants }) {
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    total: 0,
    authenticated: 0,
    anonymous: 0,
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    lastWeek: 0,
    peakHour: 0,
    peakHourCount: 0,
    avgPerDay: 0,
    firstParticipant: null,
    lastParticipant: null,
    authRate: 0
  })
  const [dailyData, setDailyData] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [typeData, setTypeData] = useState([])
  const [weekdayData, setWeekdayData] = useState([])
  const [growthData, setGrowthData] = useState([])

  const COLORS = {
    authenticated: '#3b82f6', // blue
    anonymous: '#8b5cf6', // purple
    primary: '#6366f1', // indigo
    secondary: '#ec4899' // pink
  }

  /**
   * 통계 계산
   */
  useEffect(() => {
    if (!participants || participants.length === 0) {
      setStats({
        total: 0,
        authenticated: 0,
        anonymous: 0,
        today: 0,
        yesterday: 0,
        thisWeek: 0,
        lastWeek: 0,
        peakHour: 0,
        peakHourCount: 0,
        avgPerDay: 0,
        firstParticipant: null,
        lastParticipant: null,
        authRate: 0
      })
      setDailyData([])
      setHourlyData([])
      setTypeData([])
      setWeekdayData([])
      setGrowthData([])
      return
    }

    const now = new Date()
    const today = startOfDay(now)
    const yesterday = startOfDay(subDays(now, 1))
    const weekAgo = startOfDay(subDays(now, 7))
    const twoWeeksAgo = startOfDay(subDays(now, 14))

    // 기본 통계
    const authCount = participants.filter(p => p.type === 'authenticated').length
    const anonCount = participants.filter(p => p.type === 'anonymous').length
    const todayCount = participants.filter(p => new Date(p.createdAt) >= today).length
    const yesterdayCount = participants.filter(p => {
      const date = new Date(p.createdAt)
      return date >= yesterday && date < today
    }).length
    const thisWeekCount = participants.filter(p => new Date(p.createdAt) >= weekAgo).length
    const lastWeekCount = participants.filter(p => {
      const date = new Date(p.createdAt)
      return date >= twoWeeksAgo && date < weekAgo
    }).length

    // 일자별 데이터 (최근 7일) - 먼저 생성
    const dailyMap = new Map()
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(now, i))
      const dateStr = format(date, 'yyyy-MM-dd')
      dailyMap.set(dateStr, {
        date: dateStr,
        dateLabel: format(date, 'MM/dd (EEE)', { locale: ko }),
        authenticated: 0,
        anonymous: 0,
        total: 0
      })
    }

    participants.forEach(p => {
      const dateStr = format(startOfDay(new Date(p.createdAt)), 'yyyy-MM-dd')
      if (dailyMap.has(dateStr)) {
        const data = dailyMap.get(dateStr)
        if (p.type === 'authenticated') {
          data.authenticated++
        } else {
          data.anonymous++
        }
        data.total++
      }
    })

    setDailyData(Array.from(dailyMap.values()))

    // 최초/최근 참가자
    const sortedByDate = [...participants].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )
    const firstParticipant = sortedByDate[0]
    const lastParticipant = sortedByDate[sortedByDate.length - 1]

    // 회원 비율
    const authRate = participants.length > 0 
      ? Math.round((authCount / participants.length) * 100) 
      : 0

    // 일평균
    const avgPerDay = dailyMap.size > 0 
      ? Math.round(participants.length / dailyMap.size) 
      : 0

    setStats({
      total: participants.length,
      authenticated: authCount,
      anonymous: anonCount,
      today: todayCount,
      yesterday: yesterdayCount,
      thisWeek: thisWeekCount,
      lastWeek: lastWeekCount,
      peakHour: 0, // 아래에서 계산
      peakHourCount: 0,
      avgPerDay,
      firstParticipant,
      lastParticipant,
      authRate
    })

    // 시간대별 데이터 (0-23시)
    const hourlyMap = new Map()
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, {
        hour: i,
        hourLabel: `${i}시`,
        count: 0
      })
    }

    participants.forEach(p => {
      const hour = new Date(p.createdAt).getHours()
      const data = hourlyMap.get(hour)
      data.count++
    })

    const hourlyArray = Array.from(hourlyMap.values())
    setHourlyData(hourlyArray)

    // 피크 시간대 찾기
    const peakHourData = hourlyArray.reduce((max, curr) => 
      curr.count > max.count ? curr : max
    , { hour: 0, count: 0 })

    // stats 업데이트 (피크 시간)
    setStats(prev => ({
      ...prev,
      peakHour: peakHourData.hour,
      peakHourCount: peakHourData.count
    }))

    // 타입별 데이터 (파이 차트용)
    setTypeData([
      { name: t('participant.member'), value: authCount, color: COLORS.authenticated },
      { name: t('participant.guest'), value: anonCount, color: COLORS.anonymous }
    ])

    // 요일별 데이터
    const weekdayMap = new Map([
      [0, { day: 0, dayLabel: '일', count: 0 }],
      [1, { day: 1, dayLabel: '월', count: 0 }],
      [2, { day: 2, dayLabel: '화', count: 0 }],
      [3, { day: 3, dayLabel: '수', count: 0 }],
      [4, { day: 4, dayLabel: '목', count: 0 }],
      [5, { day: 5, dayLabel: '금', count: 0 }],
      [6, { day: 6, dayLabel: '토', count: 0 }]
    ])

    participants.forEach(p => {
      const day = new Date(p.createdAt).getDay()
      const data = weekdayMap.get(day)
      data.count++
    })

    setWeekdayData(Array.from(weekdayMap.values()))

    // 누적 증가 추이 (최근 7일)
    let cumulative = 0
    const growthArray = Array.from(dailyMap.values()).map(day => {
      cumulative += day.total
      return {
        date: day.dateLabel,
        cumulative,
        daily: day.total
      }
    })
    setGrowthData(growthArray)
  }, [participants, t])

  /**
   * 증감률 계산
   */
  const getGrowthRate = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const todayGrowth = getGrowthRate(stats.today, stats.yesterday)
  const weekGrowth = getGrowthRate(stats.thisWeek, stats.lastWeek)

  return (
    <div className="space-y-6">
      {/* 핵심 지표 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.totalCount')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('participant.authenticated')}: {stats.authenticated} / {t('participant.anonymous')}: {stats.anonymous}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.todayCount')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.today}</div>
            <p className={`text-xs mt-1 flex items-center gap-1 ${todayGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-3 w-3" />
              {todayGrowth >= 0 ? '+' : ''}{todayGrowth}% {t('participant.vsYesterday')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.thisWeek')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.thisWeek}</div>
            <p className={`text-xs mt-1 flex items-center gap-1 ${weekGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-3 w-3" />
              {weekGrowth >= 0 ? '+' : ''}{weekGrowth}% {t('participant.vsLastWeek')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.avgPerDay')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dailyData.length > 0 ? Math.round(stats.total / dailyData.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('participant.last7Days')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 추가 지표 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.peakHour')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.peakHour}시</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.peakHourCount}명 {t('participant.participated')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.memberRate')}</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.authRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.authenticated}명 / {stats.total}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('participant.participationPeriod')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats.firstParticipant && stats.lastParticipant ? (
                <>
                  {format(new Date(stats.firstParticipant.createdAt), 'MM/dd', { locale: ko })} ~ {format(new Date(stats.lastParticipant.createdAt), 'MM/dd', { locale: ko })}
                </>
              ) : (
                '-'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.firstParticipant ? format(new Date(stats.firstParticipant.createdAt), 'HH:mm', { locale: ko }) : '-'} ~ {stats.lastParticipant ? format(new Date(stats.lastParticipant.createdAt), 'HH:mm', { locale: ko }) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 일자별 참가자 추이 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('participant.dailyTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dateLabel" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="authenticated" name={t('participant.member')} fill={COLORS.authenticated} stackId="a" />
                <Bar dataKey="anonymous" name={t('participant.guest')} fill={COLORS.anonymous} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 타입별 비율 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t('participant.typeRatio')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 요일별 참가 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('participant.weekdayDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name={t('participant.count')} fill={COLORS.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 전체 너비 차트 */}
      <div className="grid gap-6">
        {/* 시간대별 참가 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('participant.hourlyDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hourLabel" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name={t('participant.count')}
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 누적 증가 추이 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('participant.cumulativeGrowth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  name={t('participant.cumulative')}
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                />
                <Line 
                  type="monotone" 
                  dataKey="daily" 
                  name={t('participant.daily')}
                  stroke={COLORS.secondary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.secondary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

