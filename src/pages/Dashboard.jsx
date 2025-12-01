import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  BarChart3, 
  MessageSquare, 
  Zap, 
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Clock,
  TrendingUp
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Link } from "react-router-dom"

/**
 * 관리자/파트너 대시보드
 * 언어팩 적용됨
 */
export default function Dashboard() {
  const { profile } = useAuth()
  const { t } = useLanguage()

  // 임시 데이터
  const recentSessions = [
    { id: 1, title: 'Session 1', participants: 45, date: '2024-01-15', status: 'completed' },
    { id: 2, title: 'Session 2', participants: 28, date: '2024-01-14', status: 'completed' },
    { id: 3, title: 'Session 3', participants: 120, date: '2024-01-13', status: 'completed' },
  ]

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin.dashboard')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('admin.welcome').replace('{email}', profile?.email || '')}
          </p>
        </div>
        <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.newSession')}
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-dashed border-2 hover:border-primary/50">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-1">{t('admin.quickStart')}</h3>
              <p className="text-sm text-muted-foreground">{t('admin.quickStartDesc')}</p>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-1">{t('admin.createPoll')}</h3>
              <p className="text-sm text-muted-foreground">{t('admin.createPollDesc')}</p>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-1">{t('admin.qnaSession')}</h3>
              <p className="text-sm text-muted-foreground">{t('admin.qnaSessionDesc')}</p>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-1">{t('admin.createQuiz')}</h3>
              <p className="text-sm text-muted-foreground">{t('admin.createQuizDesc')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalSessions')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '12')}</span>
                <span className="text-muted-foreground ml-1">{t('admin.vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalParticipants')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '8')}</span>
                <span className="text-muted-foreground ml-1">{t('admin.vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.avgParticipation')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '5')}</span>
                <span className="text-muted-foreground ml-1">{t('admin.vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalQuestions')}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">456</div>
              <div className="flex items-center text-xs text-red-600 mt-1">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                <span>{t('admin.decrease').replace('{value}', '3')}</span>
                <span className="text-muted-foreground ml-1">{t('admin.vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions & Activity */}
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Recent Sessions */}
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('admin.recentSessions')}</CardTitle>
                <CardDescription>{t('admin.recentSessionsDesc')}</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                {t('admin.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/10 to-pink-500/10 flex items-center justify-center">
                        <Play className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">{session.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{t('admin.participated').replace('{count}', session.participants.toString())}</span>
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          <span>{session.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-600">
                      {t('admin.completed')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t('admin.thisWeekActivity')}</CardTitle>
              <CardDescription>{t('admin.thisWeekActivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.sessionsHeld')}</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500"></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.totalParticipants')}</span>
                  <span className="font-medium">193</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.questionsReceived')}</span>
                  <span className="font-medium">47</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.pollResponseRate')}</span>
                  <span className="font-medium">92%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-purple-500 to-violet-500"></div>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4">
                {t('admin.detailedReport')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
