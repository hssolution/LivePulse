import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { getParticipantToken, setParticipantToken, markJoined, hasJoined } from '@/lib/participant'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Users,
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { formatKoreanPhone } from '@/utils/phone'
import EnterScene from '@/components/audience/EnterScene'
import SectionRenderer from '@/components/audience/SectionRenderer'

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

  // 재입장 스킵 (PRD §3.2) — 이 세션에 입장한 적이 있으면 이름 입력 없이 라이브로 복귀
  useEffect(() => {
    if (!session || isPreview) return
    if (['published', 'active'].includes(session.status) && hasJoined(code?.toUpperCase())) {
      navigate(`/live/${code}`, { replace: true })
    }
  }, [session, isPreview, code, navigate])

  // 섹션 기반 디자인 (디자인 에디터 게시분) — 있으면 SectionRenderer가 EnterScene을 대체
  // designChecked: 확인 완료 전에는 렌더를 보류해 "구 화면 → 디자인" 플래시 방지 (검증 라운드 반영)
  const [design, setDesign] = useState(null)
  const [designData, setDesignData] = useState({ presenters: [], cues: [] })
  const [designChecked, setDesignChecked] = useState(false)
  const previewDraft = searchParams.get('design') === 'draft' // 에디터 '초안 미리보기' (권한자 전용 RPC)
  useEffect(() => {
    if (!session?.id) return
    let cancelled = false
    const load = async () => {
      try {
        let designDoc = null
        if (previewDraft) {
          // 초안 미리보기 — sp_partner_design_s('get')는 세션 운영 권한자만 성공 (비권한자는 forbidden → 게시본 폴백)
          const { data: pRes } = await supabase.rpc('sp_partner_design_s', {
            p_session_id: session.id,
            p_action: 'get',
          })
          designDoc = pRes?.draft || pRes?.published || null
        }
        if (!designDoc) {
          // 게시본 전용 RPC — 초안(draft)은 청중에게 절대 미노출 (019 보안 설계)
          const { data: dRes } = await supabase.rpc('sp_live_design_q', { p_code: session.code })
          designDoc = dRes?.design || null
        }
        if (cancelled) return
        if (!designDoc) return
        // 섹션 데이터 주입용 로드 (섹션은 자체 fetch 금지 — 렌더러 계약)
        const [presRes, stateRes] = await Promise.all([
          supabase
            .from('session_presenters')
            .select('*')
            .eq('session_id', session.id)
            .eq('status', 'confirmed')
            .order('display_order'),
          supabase.rpc('sp_live_state_q', { p_code: session.code }),
        ])
        if (cancelled) return
        setDesignData({
          presenters: presRes.data || [],
          cues: stateRes.data?.cues_public || [],
        })
        setDesign(designDoc)
      } finally {
        if (!cancelled) setDesignChecked(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session?.id, session?.code, previewDraft])

  /**
   * 세션 데이터 로드 (프로시저 사용)
   */
  const loadSession = useCallback(async () => {
    if (!code) {
      setError('invalid_code')
      setLoading(false)
      return
    }
    
    try {
      const { data, error: rpcError } = await supabase.rpc('sp_join_session_q', {
        p_code: code.toUpperCase(),
        p_user_id: user?.id || null,
        p_is_preview: isPreview
      })
      
      if (rpcError) throw rpcError
      
      if (data?.error === 'NOT_FOUND') {
        setError('not_found')
        setLoading(false)
        return
      }
      
      setSession(data.session)
      setTemplate(data.template)
      setAssets(data.assets || {})
      setIsParticipating(data.isParticipating || false)
      setIsOwner(data.isOwner || false)
      
    } catch (err) {
      console.error('Error loading session:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      setError('load_failed')
    } finally {
      setLoading(false)
      setCheckingParticipation(false)
    }
  }, [code, isPreview, user])

  useEffect(() => {
    loadSession()
  }, [loadSession])

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
   * 로그인한 사용자 참여 처리 (프로시저 사용)
   */
  const handleJoinWithAuth = async () => {
    if (!user || !profile || !session) return
    
    setJoining(true)
    try {
      const { data, error } = await supabase.rpc('sp_join_session_auth_s', {
        p_session_id: session.id,
        p_user_id: user.id
      })
      
      if (error) throw error

      if (data?.success) {
        getParticipantToken(code?.toUpperCase()) // 참가자 토큰 발급 (PRD §3.2)
        markJoined(code?.toUpperCase())
        toast.success(t('join.success'))
        navigate(`/live/${code}`)
        return
      } else if (data?.error === 'ALREADY_PARTICIPATING') {
        getParticipantToken(code?.toUpperCase())
        markJoined(code?.toUpperCase())
        toast.info(t('join.alreadyParticipating'))
        navigate(`/live/${code}`)
        return
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Error joining session:', err)
      toast.error(t('join.error.joinFailed'))
    } finally {
      setJoining(false)
    }
  }

  /**
   * 참여 취소 (프로시저 사용)
   */
  const handleCancelParticipation = async () => {
    if (!user || !session) return
    
    setJoining(true)
    try {
      const { data, error } = await supabase.rpc('sp_leave_session_auth_s', {
        p_session_id: session.id,
        p_user_id: user.id
      })
      
      if (error) throw error
      
      if (data?.success) {
        toast.success(t('join.cancelSuccess'))
        setIsParticipating(false)
        await loadSession()
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Error canceling participation:', err)
      toast.error(t('join.error.cancelFailed'))
    } finally {
      setJoining(false)
    }
  }

  // 전화번호 포맷터는 공통 utils로 이전 — formatKoreanPhone 사용

  /**
   * 실시간 유효성 검사
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
   * 비로그인 사용자 참여 처리 (프로시저 사용)
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
    
    setJoining(true)
    try {
      const { data, error } = await supabase.rpc('sp_join_session_anon_s', {
        p_session_id: session.id,
        p_name: formData.name.trim(),
        p_email: formData.email.trim(),
        p_phone: formData.phone.trim()
      })
      
      if (error) throw error

      if (data?.success) {
        // 참가자 토큰 확정 저장 (PRD §3.2) — RPC가 참가자 id를 반환하면 그것으로,
        // 아니면 클라 UUID 자동 발급 (재입장 시 이름 입력 생략·내 질문 표시의 전제)
        const participantId = data.participant_id || data.id
        if (participantId) setParticipantToken(code?.toUpperCase(), participantId)
        else getParticipantToken(code?.toUpperCase())
        markJoined(code?.toUpperCase()) // 재입장 시 이름 입력 생략 (PRD §3.2)
        toast.success(t('join.success'))
        setShowJoinForm(false)
        setFormData({ name: '', email: '', phone: '' })
        setFormErrors({ name: '', email: '', phone: '' })
        navigate(`/live/${code}`)
        return
      } else if (data?.error === 'EMAIL_DUPLICATE') {
        setDuplicateAlert({
          open: true,
          title: t('join.error.duplicateTitle'),
          message: t('join.error.emailAlreadyParticipating')
        })
      } else if (data?.error === 'PHONE_DUPLICATE') {
        setDuplicateAlert({
          open: true,
          title: t('join.error.duplicateTitle'),
          message: t('join.error.phoneAlreadyParticipating')
        })
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
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
    // 참여 버튼 문구 — 디자인 에디터의 참여 카드 설정(ctaLabel) 우선, 없으면 i18n 기본값
    const ctaLabel = design?.scenes?.enter?.sections?.find((s) => s.type === 'joinCard')?.settings?.ctaLabel?.trim() || t('join.participate')
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

          {/* 라이브 입장 (주) */}
          <Button
            size="lg"
            className="w-full text-lg bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => navigate(`/live/${code}`)}
          >
            라이브 입장
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          {/* 참여 취소 (보조) */}
          <Button
            size="lg"
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
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
                {ctaLabel}
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
              {ctaLabel}
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
                    const formatted = formatKoreanPhone(e.target.value)
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
  if (loading || (session && !designChecked)) {
    // 디자인 확인 완료 전 렌더 보류 — 구 템플릿 화면이 먼저 그려졌다 교체되는 플래시 방지
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
        {design ? (
          /* 디자인 에디터 게시본 — 섹션 렌더 (렌더러 단일화, 에디터 캔버스와 동일) */
          <SectionRenderer
            design={design}
            scene="enter"
            data={{ session, presenters: designData.presenters, cues: designData.cues }}
            slots={{ joinCard: renderJoinButton() }}
          />
        ) : (
          /* 게시된 디자인 없음 — 기존 템플릿 렌더 (기존 세션 시각 불변) */
          <EnterScene
            session={session}
            template={template}
            assets={assets}
            joinCard={renderJoinButton()}
            isPreview={isPreview}
          />
        )}
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

