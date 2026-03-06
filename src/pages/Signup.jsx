import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Zap, ArrowLeft, CheckCircle, Mail, AlertCircle, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * 회원가입 페이지
 * - 이메일/비밀번호만 입력
 * - 첫 번째 사용자는 자동으로 관리자
 * - 이후 사용자는 일반 회원으로 가입 (파트너 신청은 마이페이지에서)
 * - URL 파라미터: email (자동 입력), redirect (가입 후 이동)
 * - 언어팩 적용됨
 * 
 * 시나리오:
 * 1. 새 사용자 → 가입 성공, 이메일 인증 안내
 * 2. 이미 가입 + 인증 완료 → 로그인 페이지로 안내
 * 3. 이미 가입 + 인증 대기 → 이메일 재발송 여부 확인
 */
export default function Signup() {
  const [searchParams] = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const redirectUrl = searchParams.get('redirect') || ''
  
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState(null)
  const [isFirstUser, setIsFirstUser] = useState(null)
  
  // 다이얼로그 상태
  const [dialogType, setDialogType] = useState(null) // 'emailSent' | 'alreadyExists' | 'pendingVerification'
  
  const navigate = useNavigate()
  const { t, currentLanguage } = useLanguage()

  useEffect(() => {
    checkSystemStatus()
  }, [])
  
  // URL에서 이메일이 전달되면 자동 설정
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail])

  /**
   * 시스템 초기화 상태 확인
   * 첫 번째 사용자인지 판단
   */
  const checkSystemStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('sp_check_admin_initialized_q')
      
      if (error) {
        console.warn('시스템 상태 조회 에러:', error.message)
        setIsFirstUser(true)
        return
      }
      
      // data.is_initialized가 false이면 첫 번째 사용자
      setIsFirstUser(!data?.is_initialized)
    } catch (err) {
      console.error('시스템 상태 확인 에러:', err)
      setIsFirstUser(true)
    }
  }

  /**
   * 회원가입 처리
   * 
   * Supabase signUp 응답 분석:
   * - identities 배열이 있음 → 새 가입
   * - identities가 빈 배열 → 이미 존재하는 이메일
   *   - email_confirmed_at 있음 → 인증 완료된 사용자
   *   - email_confirmed_at 없음 → 인증 대기중
   */
  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            preferred_language: currentLanguage
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        const hasIdentities = authData.user.identities && authData.user.identities.length > 0
        const isEmailConfirmed = authData.user.email_confirmed_at
        
        if (hasIdentities) {
          // 새 사용자 가입 성공
          if (authData.session) {
            // 이메일 인증이 필요 없는 환경 (로컬 등)
            if (isFirstUser) {
              navigate('/adm')
            } else if (redirectUrl) {
              navigate(redirectUrl)
            } else {
              navigate('/')
            }
          } else {
            // 이메일 인증 필요
            setDialogType('emailSent')
          }
        } else {
          // 이미 존재하는 이메일
          if (isEmailConfirmed) {
            // 인증 완료된 사용자 → 로그인 안내
            setDialogType('alreadyExists')
          } else {
            // 인증 대기중 → 재발송 안내
            setDialogType('pendingVerification')
          }
        }
      }
    } catch (error) {
      // Supabase 에러 메시지 한글화
      if (error.message.includes('already registered')) {
        setDialogType('alreadyExists')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * 인증 이메일 재발송
   */
  const handleResendEmail = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) throw error
      
      // 재발송 성공 → 이메일 발송 완료 다이얼로그로 전환
      setDialogType('emailSent')
    } catch (error) {
      setError(error.message)
      setDialogType(null)
    } finally {
      setResending(false)
    }
  }

  /**
   * 다이얼로그 닫기 및 처리
   */
  const handleDialogClose = () => {
    setDialogType(null)
  }

  const handleGoToLogin = () => {
    navigate('/login')
  }

  const handleGoToHome = () => {
    setDialogType(null)
    navigate('/')
  }

  if (isFirstUser === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      {/* 1. 이메일 발송 완료 다이얼로그 */}
      <Dialog open={dialogType === 'emailSent'} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-xl">
              {t('auth.emailSentTitle')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('auth.emailSentDesc').replace('{email}', email)}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• {t('auth.emailSentTip1')}</li>
              <li>• {t('auth.emailSentTip2')}</li>
              <li>• {t('auth.emailSentTip3')}</li>
            </ul>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleGoToHome} 
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. 이미 가입된 사용자 다이얼로그 */}
      <Dialog open={dialogType === 'alreadyExists'} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-center text-xl">
              {t('auth.alreadyRegisteredTitle')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('auth.alreadyRegisteredDesc').replace('{email}', email)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button 
              onClick={handleGoToLogin} 
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {t('auth.goToLogin')}
            </Button>
            <Button 
              variant="outline"
              onClick={handleDialogClose} 
              className="w-full"
            >
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. 인증 대기중 다이얼로그 */}
      <Dialog open={dialogType === 'pendingVerification'} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
              <RefreshCw className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <DialogTitle className="text-center text-xl">
              {t('auth.pendingVerificationTitle')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('auth.pendingVerificationDesc').replace('{email}', email)}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
            {t('auth.resendQuestion')}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button 
              onClick={handleResendEmail} 
              disabled={resending}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {resending ? t('common.processing') : t('auth.resendEmail')}
            </Button>
            <Button 
              variant="outline"
              onClick={handleGoToLogin} 
              className="w-full"
            >
              {t('auth.goToLogin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-pink-500 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">LivePulse</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white">
            {isFirstUser ? t('auth.startSystem') : t('auth.makeClassVivid')}
          </h2>
          <ul className="space-y-4 text-white/90">
            <li className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-white" />
              <span>{t('auth.realtimeFeedback')}</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-white" />
              <span>{t('auth.qnaFeature')}</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-white" />
              <span>{t('auth.qrJoin')}</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-white" />
              <span>{t('auth.analyticsReport')}</span>
            </li>
          </ul>
        </div>

        <div className="relative text-white/70 text-sm">
          {t('auth.usersCount')}
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">LivePulse</span>
          </div>

          <Link to="/" className="inline-flex items-center gap-2 font-medium text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary mb-8 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            {t('auth.backToHome').replace(/←|<-/g, '').trim()}
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {isFirstUser ? t('auth.createAdminAccount') : t('auth.signup')}
            </h1>
            <p className="text-muted-foreground">
              {isFirstUser ? t('auth.createAdminDesc') : t('auth.signupDesc')}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input 
                id="email" 
                placeholder="name@example.com" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input 
                id="password" 
                type="password"
                placeholder={t('auth.passwordMinLength')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                {error}
              </div>
            )}

            <Button 
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600" 
              type="submit" 
              disabled={loading}
            >
              {loading ? t('common.processing') : (isFirstUser ? t('auth.createAdminAccount') : t('auth.signup'))}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t('auth.agreeTerms')
                .replace('{terms}', `<a href="#" class="underline">${t('auth.termsOfService')}</a>`)
                .replace('{privacy}', `<a href="#" class="underline">${t('auth.privacyPolicy')}</a>`)
                .split(/(<a[^>]*>.*?<\/a>)/)
                .map((part, i) => 
                  part.startsWith('<a') 
                    ? <span key={i} dangerouslySetInnerHTML={{ __html: part }} />
                    : part
                )
              }
            </p>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              {t('auth.login')}
            </Link>
          </div>

          {!isFirstUser && (
            <div className="mt-8 p-4 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">{t('auth.partnerTip')}</p>
              <p className="text-muted-foreground">
                {t('auth.partnerTipDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
