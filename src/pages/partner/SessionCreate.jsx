import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { usePartner } from '@/context/PartnerContext'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import { formatKoreanPhone } from '@/utils/phone'

/**
 * 파트너: 세션 만들기 — 2-스텝 위저드
 * Step 1: 기본 정보
 * Step 2: 참가 화면 템플릿 선택 (썸네일)
 */
export default function SessionCreate() {
  const { user } = useAuth()
  const { partner, loading: partnerLoading } = usePartner()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [templates, setTemplates] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    venue_name: '',
    venue_address: '',
    start_at: '',
    end_at: '',
    contact_phone: '',
    contact_email: '',
    max_participants: 100,
    description: '',
    template_id: '',
  })
  const [errors, setErrors] = useState({})

  // 템플릿 로드
  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      if (!user || !partner || !isMounted) return
      try {
        const { data, error } = await supabase.rpc('sp_partner_session_create_q')
        if (error) throw error
        if (!isMounted) return
        const mainTemplates = data?.main_templates || []
        setTemplates(mainTemplates)
        if (mainTemplates.length > 0 && !formData.template_id) {
          setFormData((prev) => ({ ...prev, template_id: mainTemplates[0].id }))
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error(t('error.loadFailed') || '불러오기 실패')
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, partner])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // Step 1 유효성
  const validateStep1 = () => {
    const e = {}
    if (!formData.title.trim()) e.title = t('session.error.titleRequired') || '세션명을 입력하세요'
    if (!formData.venue_name.trim())
      e.venue_name = t('session.error.venueRequired') || '장소를 입력하세요'
    if (!formData.start_at) e.start_at = t('session.error.startRequired') || '시작 일시를 입력하세요'
    if (!formData.end_at) e.end_at = t('session.error.endRequired') || '종료 일시를 입력하세요'
    if (
      formData.start_at &&
      formData.end_at &&
      new Date(formData.start_at) >= new Date(formData.end_at)
    ) {
      e.end_at = t('session.error.endAfterStart') || '종료가 시작보다 늦어야 합니다'
    }
    if (!formData.contact_phone.trim())
      e.contact_phone = t('session.error.phoneRequired') || '연락처를 입력하세요'
    if (!formData.contact_email.trim()) {
      e.contact_email = t('session.error.emailRequired') || '이메일을 입력하세요'
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      e.contact_email = t('session.error.emailInvalid') || '이메일 형식이 올바르지 않습니다'
    }
    if (formData.max_participants < 1)
      e.max_participants = t('session.error.maxParticipantsInvalid') || '1명 이상이어야 합니다'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goToStep2 = () => {
    if (validateStep1()) setStep(2)
    else toast.error('필수 항목을 확인해주세요')
  }

  const handleSubmit = async () => {
    if (!partner) {
      toast.error(t('session.noPartner') || '파트너 정보가 없습니다')
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          partner_id: partner.id,
          template_id: formData.template_id || null,
          title: formData.title.trim(),
          venue_name: formData.venue_name.trim(),
          venue_address: formData.venue_address.trim() || null,
          start_at: formData.start_at,
          end_at: formData.end_at,
          contact_phone: formData.contact_phone.trim(),
          contact_email: formData.contact_email.trim(),
          max_participants: formData.max_participants,
          description: formData.description.trim() || null,
          status: 'draft',
        })
        .select('id')
        .single()

      if (error) throw error

      toast.success(t('session.created') || '세션이 생성되었습니다')
      navigate(data?.id ? `/partner/sessions/${data.id}` : '/partner/sessions')
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error(error.message || t('error.createFailed') || '생성 실패')
      setSubmitting(false)
    }
  }

  if (partnerLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/partner/sessions')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">새 세션 만들기</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">기본 정보를 입력하고 화면 디자인을 고르세요</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-3">
        <StepDot n={1} active={step >= 1} label="기본 정보" onClick={() => setStep(1)} />
        <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700" />
        <StepDot n={2} active={step >= 2} label="화면 템플릿" onClick={goToStep2} />
      </div>

      {/* Step 1: 기본 정보 */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7">
          <h2 className="text-lg font-bold mb-1">세션 기본 정보</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            강연 정보를 입력하세요. 입력한 내용은 청중 참가 화면에 표시됩니다.
          </p>

          <div className="space-y-5">
            <FormField
              label="세션명"
              required
              error={errors.title}
              value={formData.title}
              onChange={(v) => handleChange('title', v)}
              placeholder="예: 2026 HR 리더십 컨퍼런스"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="시작 일시"
                required
                error={errors.start_at}
                type="datetime-local"
                value={formData.start_at}
                onChange={(v) => handleChange('start_at', v)}
              />
              <FormField
                label="종료 일시"
                required
                error={errors.end_at}
                type="datetime-local"
                value={formData.end_at}
                onChange={(v) => handleChange('end_at', v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="장소명"
                required
                error={errors.venue_name}
                value={formData.venue_name}
                onChange={(v) => handleChange('venue_name', v)}
                placeholder="예: 코엑스 그랜드볼룸"
              />
              <FormField
                label="최대 참가 인원"
                required
                error={errors.max_participants}
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(v) => handleChange('max_participants', parseInt(v) || 0)}
              />
            </div>

            <FormField
              label="장소 주소"
              hint="(선택)"
              value={formData.venue_address}
              onChange={(v) => handleChange('venue_address', v)}
              placeholder="서울 강남구 영동대로 513"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="담당자 연락처"
                required
                error={errors.contact_phone}
                value={formData.contact_phone}
                onChange={(v) => handleChange('contact_phone', formatKoreanPhone(v))}
                placeholder="010-1234-5678"
                type="tel"
                maxLength={13}
              />
              <FormField
                label="담당자 이메일"
                required
                error={errors.contact_email}
                type="email"
                value={formData.contact_email}
                onChange={(v) => handleChange('contact_email', v)}
                placeholder="contact@example.com"
              />
            </div>

            <FormField
              label="설명"
              hint="(선택)"
              type="textarea"
              rows={3}
              value={formData.description}
              onChange={(v) => handleChange('description', v)}
              placeholder="세션 소개를 자유롭게 입력하세요"
            />
          </div>

          <div className="flex justify-end mt-7">
            <button
              type="button"
              onClick={goToStep2}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
            >
              다음: 템플릿 선택 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 템플릿 선택 */}
      {step === 2 && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7">
            <h2 className="text-lg font-bold mb-1">참가 화면 템플릿</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              청중이 보는 첫 화면(/join, 대기 로비)의 디자인입니다. 만든 뒤 설정 에디터에서
              로고·배너를 교체할 수 있습니다.
            </p>

            {templates.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                사용 가능한 템플릿이 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {templates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    selected={formData.template_id === tpl.id}
                    onSelect={() => handleChange('template_id', tpl.id)}
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-5 leading-relaxed">
              Q&amp;A와 투표 화면 템플릿은 세션 생성 후 <b>설정 에디터 → 화면 디자인</b>에서
              선택할 수 있습니다.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 이전
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 생성 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> 세션 만들고 설정하기
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ----- 스텝 인디케이터 ----- */
function StepDot({ n, active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-semibold"
    >
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          active ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}
      >
        {n}
      </span>
      <span className={active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}>{label}</span>
    </button>
  )
}

/* ----- 폼 필드 ----- */
function FormField({
  label,
  required,
  hint,
  error,
  type = 'text',
  rows,
  min,
  maxLength,
  value,
  onChange,
  placeholder,
}) {
  const baseClass = `w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 focus:outline-none ${
    error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-400'
  }`
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
        {hint && <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">{hint}</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={rows || 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      ) : (
        <input
          type={type}
          min={min}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  )
}

/* ----- 템플릿 카드 ----- */
function TemplateCard({ template, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl overflow-hidden transition-all ${
        selected
          ? 'border-2 border-indigo-500 ring-2 ring-indigo-200 shadow-md'
          : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <TemplateThumbnail code={template.code} />
      <div className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between">
        <span className="text-sm font-bold">{template.name}</span>
        {selected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
      </div>
      {template.description && (
        <div className="px-2.5 pb-2.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-900">
          {template.description}
        </div>
      )}
    </button>
  )
}

/* ----- 템플릿 썸네일 (template.code 기반 시각화) ----- */
function TemplateThumbnail({ code }) {
  if (code === 'symposium') {
    return (
      <div className="h-28 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="w-20 h-14 bg-white dark:bg-slate-900/90 rounded shadow-lg flex flex-col items-center justify-center gap-1">
          <div className="w-12 h-1.5 bg-indigo-300 rounded" />
          <div className="w-8 h-1.5 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }
  if (code === 'conference') {
    return (
      <div className="h-28 bg-slate-900 flex items-center justify-center">
        <div className="w-24 h-16 bg-white dark:bg-slate-900/10 rounded border border-white/20 flex items-center justify-center">
          <div className="w-14 h-2 bg-white dark:bg-slate-900/40 rounded" />
        </div>
      </div>
    )
  }
  if (code === 'workshop') {
    return (
      <div className="h-28 bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="w-20 h-16 bg-white dark:bg-slate-900 rounded shadow flex flex-col items-center justify-center gap-1">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded" />
        </div>
      </div>
    )
  }
  // 기본
  return (
    <div className="h-28 bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center">
      <Eye className="w-8 h-8 text-indigo-400" />
    </div>
  )
}
