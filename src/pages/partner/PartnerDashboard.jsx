import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus,
  Play,
  Clock,
  ArrowUpRight,
  Building2,
  Mic,
  Mail,
  Phone
} from "lucide-react"

/**
 * 파트너 대시보드 페이지
 * 언어팩 적용됨
 */
export default function PartnerDashboard() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  
  const [partner, setPartner] = useState(null)
  const [partnerDetails, setPartnerDetails] = useState(null)
  
  // 내 파트너 정보 로드
  useEffect(() => {
    const loadPartnerInfo = async () => {
      if (!user) return
      
      try {
        const { data: partnerData } = await supabase
          .from('partners')
          .select('id, partner_type, representative_name, phone, profile:profiles(email)')
          .eq('profile_id', user.id)
          .single()
        
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
        }
      } catch (error) {
        console.error('Error loading partner info:', error)
      }
    }
    
    loadPartnerInfo()
  }, [user])
  
  const getPartnerTypeLabel = (type) => {
    const labels = {
      organizer: t('partner.typeOrganizer'),
      agency: t('partner.typeAgency'),
      instructor: t('partner.typeInstructor'),
    }
    return labels[type] || type
  }

  // 임시 데이터
  const recentSessions = [
    { id: 1, title: 'Session 1', participants: 32, date: '2024-01-15', status: 'completed' },
    { id: 2, title: 'Session 2', participants: 12, date: '2024-01-14', status: 'completed' },
  ]

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('partner.dashboard')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('common.welcome')}
          </p>
        </div>
        <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
          <Plus className="h-4 w-4 mr-2" />
          {t('session.create')}
        </Button>
      </div>
      
      {/* 내 파트너 정보 */}
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
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-1">{t('partner.viewReport')}</h3>
              <p className="text-sm text-muted-foreground">{t('partner.viewReportDesc')}</p>
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
              <div className="text-2xl font-bold">8</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '2')}</span>
                <span className="text-muted-foreground ml-1">{t('partner.vsLastWeek')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalParticipants')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '24')}</span>
                <span className="text-muted-foreground ml-1">{t('partner.vsLastWeek')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.avgParticipation')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">82%</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '3')}</span>
                <span className="text-muted-foreground ml-1">{t('partner.vsLastWeek')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.questionsReceived')}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">34</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{t('admin.increase').replace('{value}', '12')}</span>
                <span className="text-muted-foreground ml-1">{t('partner.vsLastWeek')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
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
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
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
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>{t('partner.noSessions')}</p>
                  <p className="text-sm">{t('partner.noSessionsDesc')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
