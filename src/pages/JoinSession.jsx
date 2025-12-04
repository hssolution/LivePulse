import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 청중 등록 페이지 (템플릿 기반)
 * /join/:code
 * 
 * 쿼리 파라미터:
 * - preview=true: 미리보기 모드 (관리자/파트너만 접근 가능)
 */
export default function JoinSession() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const isEmbed = searchParams.get('embed') === 'true' // iframe 임베드 모드
  
  const { t, language } = useLanguage()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [template, setTemplate] = useState(null)
  const [assets, setAssets] = useState({})
  const [error, setError] = useState(null)
  const [isOwner, setIsOwner] = useState(false) // 세션 소유자 여부
  const [isParticipating, setIsParticipating] = useState(false) // 참여 중 여부
  const [checkingParticipation, setCheckingParticipation] = useState(false) // 참여 확인 중
  const [showJoinForm, setShowJoinForm] = useState(false) // 참여 폼 표시 여부
  const [joining, setJoining] = useState(false) // 참여 처리 중
  
  // 참여 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  
  // 유효성 검사 에러 메시지
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: ''
  })
  
  // 중복 알림 다이얼로그
  const [duplicateAlert, setDuplicateAlert] = useState({
    open: false,
    title: '',
    message: ''
  })

  /**
   * 세션 데이터 로드
   */
  const loadSession = useCallback(async () => {
    if (!code) {
      setError('invalid_code')
      setLoading(false)
      return
    }
    
    try {
      // 세션 정보 조회 - 미리보기 모드면 상태 필터 없이 조회
      let query = supabase
        .from('sessions')
        .select(`
          *,
          template:session_templates!sessions_template_id_fkey(*),
          partner:partners(profile_id)
        `)
        .eq('code', code.toUpperCase())
      
      // 미리보기 모드가 아니면 공개된 세션만 조회
      if (!isPreview) {
        query = query.in('status', ['published', 'active'])
      }
      
      const { data: sessionData, error: sessionError } = await query.single()
      
      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          setError('not_found')
        } else {
          throw sessionError
        }
        setLoading(false)
        return
      }
      
      // 미리보기 모드인데 비공개 세션인 경우, 권한 확인 (로그인한 경우에만)
      if (isPreview && !['published', 'active'].includes(sessionData.status)) {
        // 로그인하지 않은 경우: 미리보기는 허용하되, 소유자 플래그는 false
        if (!user) {
          setIsOwner(false)
        } else {
          // 로그인한 경우: 권한 확인
          const isAdmin = profile?.role === 'admin'
          const isSessionOwner = sessionData.partner?.profile_id === user?.id
          
          setIsOwner(isSessionOwner || isAdmin)
        }
      }
      
      setSession(sessionData)
      setTemplate(sessionData.template)
      
      // 에셋 로드
      const { data: assetsData } = await supabase
        .from('session_assets')
        .select('*')
        .eq('session_id', sessionData.id)
      
      const assetsMap = {}
      assetsData?.forEach(asset => {
        assetsMap[asset.field_key] = asset
      })
      setAssets(assetsMap)
      
    } catch (err) {
      console.error('Error loading session:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      setError('load_failed')
    } finally {
      setLoading(false)
    }
  }, [code, isPreview, user, profile])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  /**
   * 참여 여부 확인 (로그인한 사용자만)
   */
  const checkParticipation = useCallback(async () => {
    if (!user || !session) return
    
    setCheckingParticipation(true)
    try {
      const { data, error } = await supabase
        .from('session_members')
        .select('id, role')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error) throw error
      
      setIsParticipating(!!data)
    } catch (err) {
      console.error('Error checking participation:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
    } finally {
      setCheckingParticipation(false)
    }
  }, [user, session])

  useEffect(() => {
    if (session && user) {
      checkParticipation()
    }
  }, [session, user, checkParticipation])

  /**
   * 참여하기 버튼 클릭
   */
  const handleJoinClick = async () => {
    // 로그인한 사용자: 바로 참여 처리
    if (user && profile) {
      await handleJoinWithAuth()
    } else {
      // 비로그인 사용자: 폼 표시
      setShowJoinForm(!showJoinForm)
    }
  }

  /**
   * 로그인한 사용자 참여 처리
   */
  const handleJoinWithAuth = async () => {
    if (!user || !profile || !session) return
    
    setJoining(true)
    try {
      // 세션 멤버로 추가
      const { error } = await supabase
        .from('session_members')
        .insert({
          session_id: session.id,
          user_id: user.id,
          role: 'participant',
          assigned_by: user.id
        })
      
      if (error) {
        // 이미 참여 중인 경우
        if (error.code === '23505') {
          toast.info(t('join.alreadyParticipating'))
          setIsParticipating(true)
          return
        }
        throw error
      }
      
      // 참여자 수 증가
      await supabase.rpc('increment_participant_count', {
        session_id: session.id
      })
      
      toast.success(t('join.success'))
      setIsParticipating(true)
      
      // 세션 정보 새로고침
      await loadSession()
    } catch (err) {
      console.error('Error joining session:', err)
      toast.error(t('join.error.joinFailed'))
    } finally {
      setJoining(false)
    }
  }

  /**
   * 참여 취소
   */
  const handleCancelParticipation = async () => {
    if (!user || !session) return
    
    setJoining(true)
    try {
      // 세션 멤버에서 제거
      const { error } = await supabase
        .from('session_members')
        .delete()
        .eq('session_id', session.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // 참여자 수 감소
      await supabase.rpc('decrement_participant_count', {
        session_id: session.id
      })
      
      toast.success(t('join.cancelSuccess'))
      setIsParticipating(false)
      
      // 세션 정보 새로고침
      await loadSession()
    } catch (err) {
      console.error('Error canceling participation:', err)
      toast.error(t('join.error.cancelFailed'))
    } finally {
      setJoining(false)
    }
  }

  /**
   * 전화번호 포맷팅 (010-1234-5678)
   */
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '')
    
    // 길이에 따라 포맷 적용
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
    }
  }

  /**
   * 이메일/전화번호 중복 체크
   */
  const checkDuplicate = async (fieldName, value) => {
    if (!session || !value.trim()) return false
    
    try {
      const { data, error } = await supabase
        .from('anonymous_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq(fieldName, value.trim())
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking duplicate:', error)
        return false
      }
      
      return !!data // 데이터가 있으면 중복
    } catch (err) {
      console.error('Error checking duplicate:', err)
      return false
    }
  }

  /**
   * 실시간 유효성 검사 (중복 체크 제외)
   */
  const validateField = (fieldName, value) => {
    let error = ''
    
    switch (fieldName) {
      case 'name':
        if (value.trim().length > 0 && value.trim().length < 2) {
          error = t('join.error.nameMinLength')
        }
        break
      case 'email':
        if (value.trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value.trim())) {
            error = t('join.error.invalidEmail')
          }
        }
        break
      case 'phone':
        if (value.trim().length > 0) {
          const phoneRegex = /^[0-9-]{9,}$/
          if (!phoneRegex.test(value.trim().replace(/\s/g, ''))) {
            error = t('join.error.invalidPhone')
          }
        }
        break
    }
    
    setFormErrors(prev => ({ ...prev, [fieldName]: error }))
  }

  /**
   * 비로그인 사용자 참여 처리
   */
  const handleJoinWithForm = async (e) => {
    e.preventDefault()
    
    if (!session) return
    
    // 유효성 검사
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error(t('join.error.fillAllFields'))
      return
    }

    // 이름 검사 (최소 2글자)
    if (formData.name.trim().length < 2) {
      toast.error(t('join.error.nameMinLength'))
      return
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      toast.error(t('join.error.invalidEmail'))
      return
    }

    // 전화번호 형식 검사 (숫자와 하이픈만 허용, 최소 9자리)
    const phoneRegex = /^[0-9-]{9,}$/
    if (!phoneRegex.test(formData.phone.trim().replace(/\s/g, ''))) {
      toast.error(t('join.error.invalidPhone'))
      return
    }

    // 중복 체크 (제출 시에만)
    const emailDuplicate = await checkDuplicate('email', formData.email.trim())
    if (emailDuplicate) {
      setDuplicateAlert({
        open: true,
        title: t('join.error.duplicateTitle'),
        message: t('join.error.emailAlreadyParticipating')
      })
      return
    }

    const phoneDuplicate = await checkDuplicate('phone', formData.phone.trim())
    if (phoneDuplicate) {
      setDuplicateAlert({
        open: true,
        title: t('join.error.duplicateTitle'),
        message: t('join.error.phoneAlreadyParticipating')
      })
      return
    }
    
    setJoining(true)
    try {
      // 익명 참여자 정보 저장
      const { error: insertError } = await supabase
        .from('anonymous_participants')
        .insert({
          session_id: session.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim()
        })
      
      if (insertError) {
        // 중복 에러 처리
        if (insertError.code === '23505') {
          if (insertError.message.includes('email')) {
            toast.error(t('join.error.emailDuplicate'))
          } else if (insertError.message.includes('phone')) {
            toast.error(t('join.error.phoneDuplicate'))
          } else {
            toast.error(t('join.error.alreadyJoined'))
          }
        } else {
          throw insertError
        }
        return
      }
      
      // 참여자 수 증가
      const { error: countError } = await supabase.rpc('increment_participant_count', {
        session_id: session.id
      })
      
      if (countError) throw countError
      
      toast.success(t('join.success'))
      setShowJoinForm(false)
      setFormData({ name: '', email: '', phone: '' })
      setFormErrors({ name: '', email: '', phone: '' })
      
      // 세션 정보 새로고침
      await loadSession()
    } catch (err) {
      console.error('Error joining session:', err)
      toast.error(t('join.error.joinFailedDesc'))
    } finally {
      setJoining(false)
    }
  }

  /**
   * 참여 버튼 렌더링
   */
  const renderJoinButton = () => {
    // 미리보기 모드에서는 참여 불가
    if (isPreview) {
      return (
        <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
          <Eye className="h-5 w-5 mx-auto mb-2" />
          <p className="text-sm font-medium">{t('session.previewMode')}</p>
          <p className="text-xs mt-1">{t('session.previewModeDesc')}</p>
        </div>
      )
    }

    // Draft 상태에서는 참여 불가
    if (session.status === 'draft') {
      return (
        <div className="text-center p-4 bg-gray-100 text-gray-600 rounded-lg">
          <AlertCircle className="h-5 w-5 mx-auto mb-2" />
          <p className="text-sm font-medium">{t('session.notPublished')}</p>
        </div>
      )
    }

    // 정원 초과
    const isFull = session.participant_count >= session.max_participants
    if (isFull && !isParticipating) {
      return (
        <div className="text-center p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          <Users className="h-5 w-5 mx-auto mb-2" />
          <p className="text-sm font-medium">{t('join.sessionFull')}</p>
        </div>
      )
    }

    // 참여 확인 중
    if (user && checkingParticipation) {
      return (
        <Button 
          size="lg" 
          className="w-full text-lg bg-slate-800 hover:bg-slate-900 text-white"
          disabled
        >
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {t('common.loading')}
        </Button>
      )
    }

    // 로그인한 사용자 - 이미 참여 중
    if (user && isParticipating) {
      return (
        <div className="space-y-3">
          {/* 로그인 사용자 정보 */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                {profile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                {profile?.displayName && (
                  <p className="text-sm font-semibold text-blue-900">{profile.displayName}</p>
                )}
                <p className={`text-xs ${profile?.displayName ? 'text-blue-600' : 'text-sm font-medium text-blue-900'}`}>
                  {user.email}
                </p>
                <p className="text-xs text-blue-600">{t('join.loggedIn')}</p>
              </div>
            </div>
          </div>

          {/* 참여 중 상태 */}
          <div className="text-center p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 mx-auto mb-2" />
            <p className="text-sm font-medium">{t('join.alreadyParticipating')}</p>
          </div>

          {/* 참여 취소 버튼만 표시 */}
          <Button 
            size="lg" 
            variant="outline"
            className="w-full text-lg border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
            onClick={handleCancelParticipation}
            disabled={joining}
          >
            {joining ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {t('common.processing')}
              </>
            ) : (
              t('join.cancelParticipation')
            )}
          </Button>
        </div>
      )
    }

    // 로그인한 사용자 - 미참여
    if (user && !checkingParticipation && !isParticipating) {
      return (
        <div className="space-y-3">
          {/* 로그인 사용자 정보 */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                {profile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                {profile?.displayName && (
                  <p className="text-sm font-semibold text-blue-900">{profile.displayName}</p>
                )}
                <p className={`text-xs ${profile?.displayName ? 'text-blue-600' : 'text-sm font-medium text-blue-900'}`}>
                  {user.email}
                </p>
                <p className="text-xs text-blue-600">{t('join.loggedIn')}</p>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-lg bg-slate-800 hover:bg-slate-900 text-white"
            onClick={handleJoinClick}
            disabled={joining}
          >
            {joining ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {t('join.joining')}
              </>
            ) : (
              <>
                {t('join.participate')}
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )
    }

    // 비로그인 사용자 (user가 없거나, 참여 확인이 완료되지 않은 경우)
    if (!user || (!checkingParticipation && !isParticipating)) {
      return (
        <Collapsible open={showJoinForm} onOpenChange={setShowJoinForm}>
          <CollapsibleTrigger asChild>
            <Button 
              size="lg" 
              className="w-full text-lg bg-slate-800 hover:bg-slate-900 text-white"
              disabled={joining}
            >
              {t('join.participate')}
              {showJoinForm ? (
                <ChevronUp className="h-5 w-5 ml-2" />
              ) : (
                <ChevronDown className="h-5 w-5 ml-2" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <form onSubmit={handleJoinWithForm} className="space-y-4 p-4 bg-white/90 rounded-lg border shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="name">{t('join.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const input = e.target
                    setFormData({ ...formData, name: e.target.value })
                    validateField('name', e.target.value)
                    
                    // HTML5 validation 메시지 커스터마이징
                    if (input.validity.valueMissing) {
                      input.setCustomValidity(t('join.validation.nameRequired'))
                    } else {
                      input.setCustomValidity('')
                    }
                  }}
                  onInvalid={(e) => {
                    e.target.setCustomValidity(t('join.validation.nameRequired'))
                  }}
                  placeholder={t('join.namePlaceholder')}
                  className={formErrors.name ? 'border-red-500' : ''}
                  required
                />
                {formErrors.name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('join.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    const input = e.target
                    // 이메일은 자동으로 소문자 변환
                    const email = e.target.value.toLowerCase()
                    setFormData({ ...formData, email })
                    validateField('email', email)
                    
                    // HTML5 validation 메시지 커스터마이징
                    if (input.validity.valueMissing) {
                      input.setCustomValidity(t('join.validation.emailRequired'))
                    } else if (input.validity.typeMismatch) {
                      input.setCustomValidity(t('join.validation.emailInvalid'))
                    } else {
                      input.setCustomValidity('')
                    }
                  }}
                  onBlur={(e) => {
                    // blur 시에도 소문자 변환 및 공백 제거
                    const email = e.target.value.toLowerCase().trim()
                    setFormData({ ...formData, email })
                  }}
                  onInvalid={(e) => {
                    const input = e.target
                    if (input.validity.valueMissing) {
                      input.setCustomValidity(t('join.validation.emailRequired'))
                    } else if (input.validity.typeMismatch) {
                      input.setCustomValidity(t('join.validation.emailInvalid'))
                    }
                  }}
                  placeholder={t('join.emailPlaceholder')}
                  className={formErrors.email ? 'border-red-500' : ''}
                  autoComplete="email"
                  required
                />
                {formErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('join.phone')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const input = e.target
                    const formatted = formatPhoneNumber(e.target.value)
                    setFormData({ ...formData, phone: formatted })
                    validateField('phone', formatted)
                    
                    // HTML5 validation 메시지 커스터마이징
                    if (input.validity.valueMissing) {
                      input.setCustomValidity(t('join.validation.phoneRequired'))
                    } else {
                      input.setCustomValidity('')
                    }
                  }}
                  onInvalid={(e) => {
                    e.target.setCustomValidity(t('join.validation.phoneRequired'))
                  }}
                  placeholder={t('join.phonePlaceholder')}
                  className={formErrors.phone ? 'border-red-500' : ''}
                  maxLength={13}
                  required
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                disabled={joining}
              >
                {joining ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('join.joining')}
                  </>
                ) : (
                  <>
                    {t('join.submit')}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CollapsibleContent>
        </Collapsible>
      )
    }

    // 기본값: 로딩 버튼
    return (
      <Button 
        size="lg" 
        className="w-full text-lg bg-slate-800 hover:bg-slate-900 text-white"
        disabled
      >
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        {t('common.loading')}
      </Button>
    )
  }

  /**
   * 에러 페이지 렌더링
   */
  const renderError = () => {
    const errors = {
      invalid_code: {
        icon: AlertCircle,
        title: t('join.error.invalidCode'),
        desc: t('join.error.invalidCodeDesc'),
      },
      not_found: {
        icon: AlertCircle,
        title: t('join.error.notFound'),
        desc: t('join.error.notFoundDesc'),
      },
      load_failed: {
        icon: AlertCircle,
        title: t('join.error.loadFailed'),
        desc: t('join.error.loadFailedDesc'),
      },
    }
    
    const err = errors[error] || errors.load_failed
    const Icon = err.icon
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Icon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{err.title}</h2>
            <p className="text-muted-foreground mb-6">{err.desc}</p>
            <Button onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  /**
   * 로딩 페이지
   */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  /**
   * 에러 페이지
   */
  if (error) {
    return renderError()
  }

  /**
   * 심포지엄 템플릿 렌더링
   */
  const renderSymposiumTemplate = () => {
    const bgImage = assets.background_image?.value
    const logo = assets.logo?.value
    const titleBanner = assets.title_banner?.value
    const scheduleBanner = assets.schedule_banner?.value
    const scheduleBannerUrl = assets.schedule_banner_url?.url
    const bottomBanner = assets.bottom_banner?.value
    const bottomBannerUrl = assets.bottom_banner_url?.url
    
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: bgImage ? `url(${bgImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="min-h-screen bg-black/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* 로고 */}
            {logo && (
              <div className="mb-6">
                <img src={logo} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            
            {/* 타이틀 배너 */}
            {titleBanner ? (
              <div className="mb-8">
                <img src={titleBanner} alt="Title" className="w-full rounded-lg shadow-lg" />
              </div>
            ) : (
              <div className="mb-8 text-white text-center">
                <h1 className="text-4xl font-bold mb-4">{session.title}</h1>
                <p className="text-xl opacity-90">{session.description}</p>
              </div>
            )}
            
            {/* 세션 정보 카드 */}
            <Card className="mb-8 shadow-xl">
              <CardHeader>
                <CardTitle>{t('join.sessionInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.start_at), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.start_at), 'HH:mm')} - {format(new Date(session.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{session.venue_name}</p>
                    {session.venue_address && (
                      <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <p>{session.contact_phone}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <p>{session.contact_email}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* 일정표 배너 */}
            {scheduleBanner && (
              <div className="mb-8">
                {scheduleBannerUrl ? (
                  <a href={scheduleBannerUrl} target="_blank" rel="noopener noreferrer">
                    <img src={scheduleBanner} alt="Schedule" className="w-full rounded-lg shadow-lg hover:opacity-90 transition-opacity cursor-pointer" />
                  </a>
                ) : (
                  <img src={scheduleBanner} alt="Schedule" className="w-full rounded-lg shadow-lg" />
                )}
              </div>
            )}
            
            {/* 참여 버튼 */}
            <Card className="mb-8 shadow-xl">
              <CardContent className="pt-6">
                {renderJoinButton()}
                <p className="text-center text-sm text-muted-foreground mt-3">
                  {t('join.participantCount', { count: session.participant_count, max: session.max_participants })}
                </p>
              </CardContent>
            </Card>
            
            {/* 하단 배너 */}
            {bottomBanner && (
              <div className="mb-8">
                {bottomBannerUrl ? (
                  <a href={bottomBannerUrl} target="_blank" rel="noopener noreferrer">
                    <img src={bottomBanner} alt="Banner" className="w-full rounded-lg shadow-lg hover:opacity-90 transition-opacity cursor-pointer" />
                  </a>
                ) : (
                  <img src={bottomBanner} alt="Banner" className="w-full rounded-lg shadow-lg" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * 컨퍼런스 템플릿 렌더링
   */
  const renderConferenceTemplate = () => {
    const bgImage = assets.background_image?.value
    const logo = assets.logo?.value
    const heroBanner = assets.hero_banner?.value
    const sponsorBanner = assets.sponsor_banner?.value
    
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: bgImage ? `url(${bgImage})` : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        }}
      >
        <div className="min-h-screen">
          {/* 헤더 */}
          <header className="bg-black/50 py-4">
            <div className="container mx-auto px-4 flex items-center justify-between">
              {logo && <img src={logo} alt="Logo" className="h-12 object-contain" />}
              <div className="text-white text-right">
                <p className="text-sm opacity-75">{t('join.code')}: {session.code}</p>
              </div>
            </div>
          </header>
          
          {/* 히어로 섹션 */}
          <section className="py-12">
            <div className="container mx-auto px-4 max-w-5xl">
              {heroBanner ? (
                <img src={heroBanner} alt="Hero" className="w-full rounded-xl shadow-2xl" />
              ) : (
                <div className="text-white text-center py-16">
                  <h1 className="text-5xl font-bold mb-6">{session.title}</h1>
                  <p className="text-xl opacity-90 max-w-2xl mx-auto">{session.description}</p>
                </div>
              )}
            </div>
          </section>
          
          {/* 정보 섹션 */}
          <section className="py-12 bg-white/95 backdrop-blur">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* 세션 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('join.sessionInfo')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {format(new Date(session.start_at), 'yyyy.MM.dd (EEE)', { locale: ko })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.start_at), 'HH:mm')} - {format(new Date(session.end_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{session.venue_name}</p>
                        {session.venue_address && (
                          <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* 참여 카드 */}
                <Card className="bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle>{t('join.joinNow')}</CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      {t('join.joinDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderJoinButton()}
                    <p className="text-center text-sm mt-3 opacity-80">
                      {t('join.participantCount', { count: session.participant_count, max: session.max_participants })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          
          {/* 스폰서 섹션 */}
          {sponsorBanner && (
            <section className="py-8 bg-white">
              <div className="container mx-auto px-4 max-w-4xl">
                <img src={sponsorBanner} alt="Sponsors" className="w-full" />
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  /**
   * 워크숍 템플릿 렌더링 (심플)
   */
  const renderWorkshopTemplate = () => {
    const logo = assets.logo?.value
    const coverImage = assets.cover_image?.value
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          {/* 로고 */}
          {logo && (
            <div className="text-center mb-8">
              <img src={logo} alt="Logo" className="h-12 object-contain mx-auto" />
            </div>
          )}
          
          {/* 커버 이미지 */}
          {coverImage && (
            <div className="mb-8">
              <img src={coverImage} alt="Cover" className="w-full rounded-xl shadow-lg" />
            </div>
          )}
          
          {/* 메인 카드 */}
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              {session.description && (
                <CardDescription className="text-base">{session.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 세션 정보 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.start_at), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  <p className="font-medium">{session.venue_name}</p>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <p>{t('join.participantCount', { count: session.participant_count, max: session.max_participants })}</p>
                </div>
              </div>
              
              {/* 참여 버튼 */}
              {renderJoinButton()}
              
              {/* 문의 정보 */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>{t('join.contact')}: {session.contact_phone} / {session.contact_email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /**
   * 기본 템플릿 (템플릿 미선택 시)
   */
  const renderDefaultTemplate = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              {session.description && (
                <CardDescription className="text-base">{session.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.start_at), 'yyyy.MM.dd (EEE)', { locale: ko })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.start_at), 'HH:mm')} - {format(new Date(session.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{session.venue_name}</p>
                    {session.venue_address && (
                      <p className="text-sm text-muted-foreground">{session.venue_address}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <p>{session.contact_phone}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <p>{session.contact_email}</p>
                </div>
              </div>
              
              {renderJoinButton()}
              
              <p className="text-center text-sm text-muted-foreground mt-3">
                {t('join.participantCount', { count: session.participant_count, max: session.max_participants })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /**
   * 템플릿에 따른 렌더링
   */
  const renderTemplate = () => {
    if (!template) {
      return renderDefaultTemplate()
    }
    
    switch (template.code) {
      case 'symposium':
        return renderSymposiumTemplate()
      case 'conference':
        return renderConferenceTemplate()
      case 'workshop':
        return renderWorkshopTemplate()
      default:
        return renderDefaultTemplate()
    }
  }

  /**
   * 미리보기 배너 (embed 모드에서는 숨김)
   */
  const renderPreviewBanner = () => {
    if (!isPreview || isEmbed) return null
    
    const statusLabels = {
      draft: t('session.statusDraft'),
      published: t('session.statusPublished'),
      active: t('session.statusActive'),
      ended: t('session.statusEnded'),
      cancelled: t('session.statusCancelled'),
    }
    
    const statusColors = {
      draft: 'bg-yellow-500',
      published: 'bg-blue-500',
      active: 'bg-green-500',
      ended: 'bg-gray-500',
      cancelled: 'bg-red-500',
    }
    
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 py-2 px-4 flex items-center justify-center gap-3 shadow-md">
        <Eye className="h-5 w-5" />
        <span className="font-medium">{t('session.previewMode')}</span>
        <Badge className={`${statusColors[session.status]} text-white`}>
          {statusLabels[session.status] || session.status}
        </Badge>
        <span className="text-sm">- {t('session.previewModeDesc')}</span>
        <Button 
          size="sm" 
          variant="outline" 
          className="ml-4 bg-white hover:bg-yellow-50"
          onClick={() => navigate(`/partner/sessions/${session.id}`)}
        >
          {t('session.backToManage')}
        </Button>
      </div>
    )
  }

  return (
    <>
      {renderPreviewBanner()}
      <div className={isPreview && !isEmbed ? 'pt-12' : ''}>
        {renderTemplate()}
      </div>

      {/* 중복 알림 다이얼로그 */}
      <AlertDialog open={duplicateAlert.open} onOpenChange={(open) => setDuplicateAlert({ ...duplicateAlert, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {duplicateAlert.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              {duplicateAlert.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateAlert({ open: false, title: '', message: '' })}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Force HMR update - 2024-12-04

