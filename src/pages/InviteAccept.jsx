import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, CheckCircle, XCircle, Loader2, LogIn, UserPlus } from "lucide-react"

/**
 * 팀원 초대 수락 페이지
 * URL: /invite/:token
 */
export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      loadInvite()
    }
  }, [token, authLoading])

  /**
   * 초대 정보 로드
   */
  const loadInvite = async () => {
    setLoading(true)
    try {
      // RPC 함수로 초대 정보 조회 (RLS 우회)
      const { data, error: fetchError } = await supabase
        .rpc('get_invite_by_token', { p_token: token })
      
      if (fetchError) {
          throw fetchError
        }
      
      if (!data || data.error === 'not_found') {
        setError('invalidToken')
        return
      }
      
      setInvite(data)
      
    } catch (err) {
      console.error('Error loading invite:', err)
      setError('loadFailed')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 초대 수락
   */
  const handleAccept = async () => {
    if (!user) {
      // 로그인 필요
      navigate(`/login?redirect=/invite/${token}`)
      return
    }
    
    setProcessing(true)
    try {
      const { data, error: acceptError } = await supabase
        .rpc('accept_partner_invite', { p_token: token })
      
      if (acceptError) throw acceptError
      
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error === 'Email mismatch' ? 'emailMismatch' : 'acceptFailed')
      }
      
    } catch (err) {
      console.error('Error accepting invite:', err)
      setError('acceptFailed')
    } finally {
      setProcessing(false)
    }
  }

  /**
   * 파트너 이름 가져오기
   */
  const getPartnerName = () => {
    if (!invite) return ''
    return invite.company_name || invite.representative_name || ''
  }

  // 로딩 중
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // 성공
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('invite.accepted')}</h2>
            <p className="text-muted-foreground text-center mb-6">
              {t('invite.acceptedDesc', { name: getPartnerName() })}
            </p>
            <Button onClick={() => navigate('/partner')}>
              {t('invite.goToPartner')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 에러
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t(`invite.error.${error}Title`)}</h2>
            <p className="text-muted-foreground text-center mb-6">
              {t(`invite.error.${error}Desc`)}
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 초대 정보 표시
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>{t('invite.title')}</CardTitle>
          <CardDescription>{t('invite.description')}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 초대 정보 */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('invite.from')}</span>
              <span className="font-medium">{getPartnerName()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('invite.role')}</span>
              <span className="font-medium">{t(`team.${invite.role}`)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('invite.email')}</span>
              <span className="font-medium">{invite.email}</span>
            </div>
          </div>

          {/* 로그인 상태에 따른 액션 */}
          {user ? (
            <div className="space-y-4">
              {user.email === invite.email ? (
                <Button 
                  className="w-full" 
                  onClick={handleAccept}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.processing')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('invite.accept')}
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('invite.wrongAccount', { email: invite.email })}
                  </p>
                  <Button variant="outline" onClick={async () => {
                    try {
                      await supabase.auth.signOut({ scope: 'local' })
                    } catch (e) {
                      console.warn('SignOut error (ignored):', e)
                    }
                    window.location.href = `/login?redirect=/invite/${token}`
                  }}>
                    {t('invite.switchAccount')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('invite.loginRequired')}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/signup?email=${encodeURIComponent(invite.email)}&redirect=/invite/${token}`)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('auth.signup')}
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => navigate(`/login?email=${encodeURIComponent(invite.email)}&redirect=/invite/${token}`)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('auth.login')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

