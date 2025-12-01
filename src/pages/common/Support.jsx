import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Clock, CheckCircle } from "lucide-react"

/**
 * 문의/지원 페이지 (공통)
 * 관리자: 문의 목록 확인 및 답변
 * 파트너: 문의 작성 및 내 문의 확인
 */
export default function Support() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const isAdmin = profile?.role === 'admin'

  // 임시 데이터
  const inquiries = [
    { id: 1, title: 'Service registration inquiry', status: 'answered', date: '2024-01-15', author: 'partner@test.com' },
    { id: 2, title: 'Payment inquiry', status: 'pending', date: '2024-01-14', author: 'user@test.com' },
    { id: 3, title: 'Account inquiry', status: 'pending', date: '2024-01-13', author: 'partner2@test.com' },
  ]

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('support.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('support.desc')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 md:space-y-6">
        {/* 파트너: 새 문의 작성 폼 */}
        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {t('support.contactUs')}
              </CardTitle>
              <CardDescription>
                {t('support.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('support.subject')}</Label>
                <Input id="title" placeholder={t('support.subjectPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">{t('support.message')}</Label>
                <Textarea id="content" placeholder={t('support.messagePlaceholder')} rows={5} />
              </div>
              <div className="flex justify-end">
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  {t('support.send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 문의 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('support.inquiryHistory')}
            </CardTitle>
            <CardDescription>
              {t('support.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inquiries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t('support.noInquiries')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inquiry) => (
                  <div 
                    key={inquiry.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {inquiry.status === 'answered' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      <div>
                        <p className="font-medium">{inquiry.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {isAdmin && `${inquiry.author} · `}{inquiry.date}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      inquiry.status === 'answered' 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {inquiry.status === 'answered' ? t('admin.completed') : t('admin.pendingRequests')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
