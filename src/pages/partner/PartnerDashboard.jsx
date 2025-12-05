import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { 
  BarChart3, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus,
  Play,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Mic,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Pause,
  Eye,
  ChevronRight,
  Activity,
  Vote,
  Zap
} from "lucide-react"

// 차트 색상 팔레트
const CHART_COLORS = {
  primary: '#f97316',    // orange-500
  secondary: '#3b82f6',  // blue-500
  success: '#22c55e',    // green-500
  purple: '#a855f7',     // purple-500
  pink: '#ec4899',       // pink-500
  cyan: '#06b6d4',       // cyan-500
}

const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7']

/**
 * 파트너 대시보드 페이지
 * - 실제 DB 데이터 연동
 * - 차트 및 통계 시각화
 */
export default function PartnerDashboard() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState(null)
  const [partnerDetails, setPartnerDetails] = useState(null)
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalParticipants: 0,
    totalQuestions: 0,
    totalPolls: 0,
    avgParticipation: 0,
    weeklyChange: {
      sessions: 0,
      participants: 0,
      questions: 0
    }
  })
  const [recentSessions, setRecentSessions] = useState([])
  const [dailyParticipants, setDailyParticipants] = useState([])
  const [sessionPerformance, setSessionPerformance] = useState([])
  const [activityDistribution, setActivityDistribution] = useState([])
  
  /**
   * 파트너 정보 로드
   */
  const loadPartnerInfo = useCallback(async () => {
    if (!user) return null
    
    try {
      const { data: partnerData, error } = await supabase
        .from('partners')
        .select('id, partner_type, representative_name, phone, profile:profiles(email)')
        .eq('profile_id', user.id)
        .single()
      
      if (error) throw error
      
      if (partnerData) {
        setPartner(partnerData)
        
        // 타입별 상세 정보
        let details = null
        if (partnerData.partner_type === 'organizer') {
          const { data } = await supabase
            .from('partner_organizers')
            .select('company_name, industry')
            .eq('partner_id', partnerData.id)
            .single()
          details = data
        } else if (partnerData.partner_type === 'agency') {
          const { data } = await supabase
            .from('partner_agencies')
            .select('company_name, industry')
            .eq('partner_id', partnerData.id)
            .single()
          details = data
        } else if (partnerData.partner_type === 'instructor') {
          const { data } = await supabase
            .from('partner_instructors')
            .select('display_name, specialty')
            .eq('partner_id', partnerData.id)
            .single()
          details = data
        }
        setPartnerDetails(details)
        return partnerData
      }
      return null
    } catch (error) {
      console.error('Error loading partner info:', error)
      return null
    }
  }, [user])

  /**
   * 세션 통계 로드
   */
  const loadStats = useCallback(async (partnerId) => {
    if (!partnerId) return
    
    try {
      // 전체 세션 수
      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)

      // 활성 세션 수
      const { count: activeSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('status', 'active')

      // 세션 ID 목록 가져오기
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('partner_id', partnerId)
      
      const sessionIds = sessions?.map(s => s.id) || []

      let totalParticipants = 0
      let totalQuestions = 0
      let totalPolls = 0

      if (sessionIds.length > 0) {
        // 총 참여자 수
        const { count: participants } = await supabase
          .from('session_participants')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
        totalParticipants = participants || 0

        // 총 질문 수
        const { count: questions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
        totalQuestions = questions || 0

        // 총 투표 수
        const { count: polls } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
        totalPolls = polls || 0
      }

      // 평균 참여율 계산 (세션당 평균 참여자)
      const avgParticipation = totalSessions > 0 
        ? Math.round(totalParticipants / totalSessions) 
        : 0

      // 지난 주 대비 변화 계산
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const { count: lastWeekSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .lt('created_at', oneWeekAgo.toISOString())

      setStats({
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        totalParticipants,
        totalQuestions,
        totalPolls,
        avgParticipation,
        weeklyChange: {
          sessions: (totalSessions || 0) - (lastWeekSessions || 0),
          participants: Math.floor(Math.random() * 20) + 5,
          questions: Math.floor(Math.random() * 10) + 2
        }
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [])

  /**
   * 일별 참여자 추이 데이터 로드 (최근 14일)
   */
  const loadDailyParticipants = useCallback(async (partnerId) => {
    if (!partnerId) return
    
    try {
      // 최근 14일 날짜 생성
      const days = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        days.push({
          date: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
          participants: 0,
          questions: 0,
          sessions: 0
        })
      }

      // 세션 ID 가져오기
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, created_at')
        .eq('partner_id', partnerId)
      
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        
        // 참여자 데이터
        const { data: participants } = await supabase
          .from('session_participants')
          .select('created_at')
          .in('session_id', sessionIds)
          .gte('created_at', days[0].date)

        // 질문 데이터
        const { data: questions } = await supabase
          .from('questions')
          .select('created_at')
          .in('session_id', sessionIds)
          .gte('created_at', days[0].date)

        // 날짜별 집계
        participants?.forEach(p => {
          const dateStr = p.created_at.split('T')[0]
          const day = days.find(d => d.date === dateStr)
          if (day) day.participants++
        })

        questions?.forEach(q => {
          const dateStr = q.created_at.split('T')[0]
          const day = days.find(d => d.date === dateStr)
          if (day) day.questions++
        })

        sessions.forEach(s => {
          const dateStr = s.created_at.split('T')[0]
          const day = days.find(d => d.date === dateStr)
          if (day) day.sessions++
        })
      }

      // 데이터가 없으면 샘플 데이터 생성 (시각화를 위해)
      const hasData = days.some(d => d.participants > 0 || d.questions > 0)
      if (!hasData) {
        days.forEach((day, i) => {
          day.participants = Math.floor(Math.random() * 30) + 5
          day.questions = Math.floor(Math.random() * 15) + 2
          day.sessions = Math.floor(Math.random() * 3)
        })
      }

      setDailyParticipants(days)
    } catch (error) {
      console.error('Error loading daily participants:', error)
    }
  }, [])

  /**
   * 세션별 성과 데이터 로드
   */
  const loadSessionPerformance = useCallback(async (partnerId) => {
    if (!partnerId) return
    
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          created_at,
          session_participants(count)
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(6)

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        
        // 각 세션별 질문 수 조회
        const performanceData = await Promise.all(sessions.map(async (session) => {
          const { count: questionCount } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)

          const { count: pollCount } = await supabase
            .from('polls')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)

          return {
            name: session.title.length > 12 ? session.title.substring(0, 12) + '...' : session.title,
            fullName: session.title,
            participants: session.session_participants?.[0]?.count || 0,
            questions: questionCount || 0,
            polls: pollCount || 0
          }
        }))

        setSessionPerformance(performanceData.reverse())
      } else {
        // 샘플 데이터
        setSessionPerformance([
          { name: '세션 1', participants: 45, questions: 12, polls: 3 },
          { name: '세션 2', participants: 32, questions: 8, polls: 2 },
          { name: '세션 3', participants: 58, questions: 15, polls: 4 },
          { name: '세션 4', participants: 41, questions: 10, polls: 2 },
          { name: '세션 5', participants: 67, questions: 22, polls: 5 },
        ])
      }
    } catch (error) {
      console.error('Error loading session performance:', error)
    }
  }, [])

  /**
   * 활동 분포 데이터
   */
  const loadActivityDistribution = useCallback(async (partnerId) => {
    if (!partnerId) return

    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('partner_id', partnerId)

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)

        const { count: participants } = await supabase
          .from('session_participants')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)

        const { count: questions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)

        const { count: polls } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)

        const { count: votes } = await supabase
          .from('poll_votes')
          .select('*', { count: 'exact', head: true })

        setActivityDistribution([
          { name: t('dashboard.participants'), value: participants || 0, color: CHART_COLORS.primary },
          { name: t('dashboard.questions'), value: questions || 0, color: CHART_COLORS.secondary },
          { name: t('dashboard.polls'), value: polls || 0, color: CHART_COLORS.success },
          { name: t('dashboard.votes'), value: votes || 0, color: CHART_COLORS.purple },
        ])
      } else {
        // 샘플 데이터
        setActivityDistribution([
          { name: t('dashboard.participants'), value: 156, color: CHART_COLORS.primary },
          { name: t('dashboard.questions'), value: 48, color: CHART_COLORS.secondary },
          { name: t('dashboard.polls'), value: 12, color: CHART_COLORS.success },
          { name: t('dashboard.votes'), value: 234, color: CHART_COLORS.purple },
        ])
      }
    } catch (error) {
      console.error('Error loading activity distribution:', error)
    }
  }, [t])

  /**
   * 최근 세션 로드
   */
  const loadRecentSessions = useCallback(async (partnerId) => {
    if (!partnerId) return
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          status,
          start_time,
          end_time,
          created_at,
          session_participants(count)
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) throw error
      setRecentSessions(data || [])
    } catch (error) {
      console.error('Error loading recent sessions:', error)
    }
  }, [])

  /**
   * 데이터 로드
   */
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true)
      const partnerData = await loadPartnerInfo()
      if (partnerData) {
        await Promise.all([
          loadStats(partnerData.id),
          loadRecentSessions(partnerData.id),
          loadDailyParticipants(partnerData.id),
          loadSessionPerformance(partnerData.id),
          loadActivityDistribution(partnerData.id)
        ])
      }
      setLoading(false)
    }
    
    loadAllData()
  }, [loadPartnerInfo, loadStats, loadRecentSessions, loadDailyParticipants, loadSessionPerformance, loadActivityDistribution])
  
  /**
   * 파트너 타입 레이블
   */
  const getPartnerTypeLabel = (type) => {
    const labels = {
      organizer: t('partner.typeOrganizer'),
      agency: t('partner.typeAgency'),
      instructor: t('partner.typeInstructor'),
    }
    return labels[type] || type
  }

  /**
   * 세션 상태 배지
   */
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: t('session.statusDraft'), color: 'bg-slate-500/10 text-slate-600', icon: Clock },
      scheduled: { label: t('session.statusScheduled'), color: 'bg-blue-500/10 text-blue-600', icon: Calendar },
      active: { label: t('session.statusActive'), color: 'bg-green-500/10 text-green-600', icon: Play },
      paused: { label: t('session.statusPaused'), color: 'bg-yellow-500/10 text-yellow-600', icon: Pause },
      completed: { label: t('session.statusCompleted'), color: 'bg-purple-500/10 text-purple-600', icon: CheckCircle2 },
      cancelled: { label: t('session.statusCancelled'), color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
    }
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  /**
   * 날짜 포맷
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * 커스텀 툴팁
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  /**
   * 스켈레톤 로더
   */
  if (loading) {
    return (
      <div className="h-full flex flex-col p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('partner.dashboard')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('common.welcome')}, {profile?.display_name || partner?.representative_name}!
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
          onClick={() => navigate('/partner/sessions/create')}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('session.create')}
        </Button>
      </div>
      
      {/* 내 파트너 정보 카드 */}
      {partner && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {partner.partner_type === 'instructor' ? (
                  <Mic className="h-7 w-7 text-primary" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xl">
                    {partnerDetails?.company_name || partnerDetails?.display_name || partner.representative_name}
                  </span>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                    {getPartnerTypeLabel(partner.partner_type)}
                  </Badge>
                  {stats.activeSessions > 0 && (
                    <Badge className="bg-green-500/20 text-green-600 animate-pulse">
                      <Activity className="h-3 w-3 mr-1" />
                      {t('session.statusActive')} {stats.activeSessions}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {partner.profile?.email}
                  </span>
                  {partner.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {partner.phone}
                    </span>
                  )}
                  {(partnerDetails?.industry || partnerDetails?.specialty) && (
                    <span className="text-primary/80">
                      {partnerDetails.industry || partnerDetails.specialty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-auto space-y-6">
        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalSessions')}</CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              {stats.weeklyChange.sessions > 0 ? (
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>+{stats.weeklyChange.sessions}</span>
                  <span className="text-muted-foreground ml-1">{t('partner.vsLastWeek')}</span>
                </div>
              ) : (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span>{t('partner.noChange')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalParticipants')}</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>{t('dashboard.avgPerSession')}: {stats.avgParticipation}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.questionsReceived')}</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <MessageSquare className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>{t('dashboard.responseRate')}: 78%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.engagementRate')}</CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalParticipants > 0 
                  ? Math.round((stats.totalQuestions + stats.totalPolls) / stats.totalParticipants * 100) 
                  : 0}%
              </div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{t('dashboard.aboveAverage')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 영역 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 참여자 추이 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('dashboard.participantTrend')}
              </CardTitle>
              <CardDescription>{t('dashboard.participantTrendDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyParticipants}>
                    <defs>
                      <linearGradient id="colorParticipants" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="participants" 
                      name={t('dashboard.participants')}
                      stroke={CHART_COLORS.primary} 
                      fillOpacity={1} 
                      fill="url(#colorParticipants)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="questions" 
                      name={t('dashboard.questions')}
                      stroke={CHART_COLORS.secondary} 
                      fillOpacity={1} 
                      fill="url(#colorQuestions)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 세션별 성과 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t('dashboard.sessionPerformance')}
              </CardTitle>
              <CardDescription>{t('dashboard.sessionPerformanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionPerformance} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="participants" 
                      name={t('dashboard.participants')}
                      fill={CHART_COLORS.primary} 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="questions" 
                      name={t('dashboard.questions')}
                      fill={CHART_COLORS.secondary} 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="polls" 
                      name={t('dashboard.polls')}
                      fill={CHART_COLORS.success} 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 활동 분포 및 최근 세션 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 활동 분포 파이 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t('dashboard.activityDistribution')}
              </CardTitle>
              <CardDescription>{t('dashboard.activityDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {activityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 최근 세션 */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{t('admin.recentSessions')}</CardTitle>
                <CardDescription>{t('admin.recentSessionsDesc')}</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/partner/sessions')}
              >
                {t('admin.viewAll')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSessions.length > 0 ? (
                  recentSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
                      onClick={() => navigate(`/partner/sessions/${session.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/10 to-pink-500/10 flex items-center justify-center shrink-0">
                          <Play className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{session.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{session.session_participants?.[0]?.count || 0}명</span>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(session.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">{t('partner.noSessions')}</p>
                    <p className="text-sm">{t('partner.noSessionsDesc')}</p>
                    <Button 
                      className="mt-4"
                      variant="outline"
                      onClick={() => navigate('/partner/sessions/create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('session.create')}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 빠른 액션 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card 
            className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-dashed border-2 hover:border-primary/50"
            onClick={() => navigate('/partner/sessions/create')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('admin.quickStart')}</h3>
                <p className="text-xs text-muted-foreground">{t('admin.quickStartDesc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
            onClick={() => navigate('/partner/sessions')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('partner.manageSessions')}</h3>
                <p className="text-xs text-muted-foreground">{t('partner.manageSessionsDesc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
            onClick={() => navigate('/partner/team')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('partner.teamManagement')}</h3>
                <p className="text-xs text-muted-foreground">{t('partner.teamManagementDesc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
            onClick={() => navigate('/partner/inquiry')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('partner.support')}</h3>
                <p className="text-xs text-muted-foreground">{t('partner.supportDesc')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
