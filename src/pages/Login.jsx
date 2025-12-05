import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Zap, ArrowLeft, AlertTriangle, Lock } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import {
  checkLoginAttempt,
  recordLoginFailure,
  clearLoginAttempts,
  logLoginEvent,
  getFailureReason
} from '@/lib/loginService'

/**
 * 로그인 페이지
 * - URL 파라미터: redirect (로그인 후 이동할 페이지)
 * - 로그인 로그 기록
 * - 브루트포스 방지 (5회 실패 시 15분 잠금)
 * - 중복 로그인 방지
 */
export default function Login() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || ''
  const prefillEmail = searchParams.get('email') || ''
  
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lockInfo, setLockInfo] = useState(null) // 잠금 정보
  const [remainingTime, setRemainingTime] = useState(0) // 남은 잠금 시간 (초)
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { refreshProfile } = useAuth()

  // 잠금 시간 카운트다운
  useEffect(() => {
    if (remainingTime <= 0) return
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setLockInfo(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [remainingTime])

  // 이메일 변경 시 잠금 상태 확인
  useEffect(() => {
    const checkLock = async () => {
      if (!email) return
      
      const result = await checkLoginAttempt(email)
      if (result.isLocked) {
        setLockInfo(result)
        setRemainingTime(result.remainingSeconds)
      } else {
        setLockInfo(null)
        setRemainingTime(0)
      }
    }
    
    const timer = setTimeout(checkLock, 500) // 디바운스
    return () => clearTimeout(timer)
  }, [email])

  /**
   * 남은 시간 포맷팅
   */
  const formatRemainingTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 로그인 처리
   */
  const handleLogin = async (e) => {
    e.preventDefault()
    debugger // 🔴 로그인 - F12 열고 테스트
    console.log('🔴 [LOGIN] 로그인 시도:', { email, redirectUrl })
    setLoading(true)
    setError(null)

    try {
      // 잠금 상태 확인
      const lockCheck = await checkLoginAttempt(email)
      if (lockCheck.isLocked) {
        setLockInfo(lockCheck)
        setRemainingTime(lockCheck.remainingSeconds)
        setError(t('auth.accountLocked'))
        return
      }

      // 로그인 시도
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // 로그인 실패 기록
        const failureReason = getFailureReason(authError)
        await logLoginEvent(email, 'login_failed', failureReason)
        
        // 실패 횟수 증가 및 잠금 처리
        const failureResult = await recordLoginFailure(email)
        
        // 에러 코드별 메시지 처리
        const getErrorMessage = (code) => {
          switch (code) {
            case 'email_not_confirmed':
              return t('auth.emailNotConfirmed')
            case 'invalid_credentials':
              return t('auth.invalidCredentials')
            case 'user_not_found':
              return t('auth.userNotFound')
            default:
              return authError.message
          }
        }
        
        if (failureResult.isLocked) {
          setLockInfo(failureResult)
          setRemainingTime(Math.ceil((failureResult.lockedUntil - new Date()) / 1000))
          setError(t('auth.tooManyAttempts'))
        } else {
          const attemptsLeft = 5 - failureResult.attemptCount
          const errorMsg = getErrorMessage(authError.code)
          setError(`${errorMsg} (${t('auth.attemptsRemaining', { count: attemptsLeft })})`)
        }
        
        throw authError
      }

      // 로그인 성공
      console.log('🔴 [LOGIN] 성공:', {
        userId: data.user?.id,
        email: data.user?.email,
        session: !!data.session
      })
      
      // 부가 작업들은 백그라운드에서 실행 (실패해도 로그인은 성공)
      Promise.all([
        clearLoginAttempts(email).catch(e => console.warn('clearLoginAttempts error:', e)),
        logLoginEvent(email, 'login_success', null, null).catch(e => console.warn('logLoginEvent error:', e))
      ])

      // AuthContext 프로필 갱신 후 리다이렉트 (AdminRoute 등에서 올바른 role 체크를 위해)
      const profile = await refreshProfile()
      
      // 대기 중인 초대가 있는지 확인
      const { data: pendingInvites } = await supabase
        .from('partner_members')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .limit(1)
      
      if (pendingInvites && pendingInvites.length > 0) {
        // 초대가 있으면 마이페이지로 이동 (초대 수락 안내)
        console.log('🔗 [LOGIN] 대기 중인 초대 발견, 마이페이지로 이동')
        navigate('/mypage?tab=invites')
        return
      }
      
      // 1. 트랜지션 잠금 (관리자 화면 등으로 이동 시 테마 변경 애니메이션 방지)
      document.body.classList.add('preload')

      // 2. redirect URL이 있으면 해당 페이지로 최우선 이동
      if (redirectUrl) {
        navigate(redirectUrl)
        return
      }

      // 3. 관리자인 경우 관리자 대시보드로 이동
      if (profile?.role === 'admin') {
        navigate('/adm')
        return
      }

      // 4. 파트너인 경우 파트너 대시보드로 이동
      if (profile?.userType === 'partner') {
        navigate('/partner')
        return
      }
      
      // 5. 그 외(일반 유저)는 홈으로 이동
      // 홈으로 갈 때는 애니메이션이 필요할 수 있으므로 preload 제거 (홈은 라이트모드 유지라 상관없지만 안전하게)
      document.body.classList.remove('preload')
      navigate('/')
    } catch (error) {
      if (!error.message?.includes('locked')) {
        console.error('Login error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
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

        <div className="relative">
          <blockquote className="text-white">
            <p className="text-2xl font-medium leading-relaxed mb-6">
              "{t('auth.testimonial')}"
            </p>
            <footer className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                K
              </div>
              <div>
                <div className="font-semibold">{t('auth.testimonialAuthor')}</div>
                <div className="text-white/70 text-sm">{t('auth.testimonialRole')}</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
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
            <h1 className="text-3xl font-bold mb-2">{t('auth.welcomeBack')}</h1>
            <p className="text-muted-foreground">{t('auth.loginDesc')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                disabled={lockInfo?.isLocked}
                tabIndex={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <a href="#" className="text-sm text-primary hover:underline" tabIndex={4}>{t('auth.forgotPassword')}</a>
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
                disabled={lockInfo?.isLocked}
                tabIndex={2}
              />
            </div>

            {/* 잠금 상태 표시 */}
            {lockInfo?.isLocked && remainingTime > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{t('auth.accountLocked')}</div>
                    <div className="text-sm opacity-80">
                      {t('auth.unlockIn', { time: formatRemainingTime(remainingTime) })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && !lockInfo?.isLocked && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button 
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600" 
              type="submit" 
              disabled={loading || lockInfo?.isLocked}
              tabIndex={3}
            >
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium" tabIndex={5}>
              {t('auth.signup')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
