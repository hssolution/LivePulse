import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, MessageCircle, Settings, FileText, BarChart3, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import PdfPage from '@/components/PdfPage'
import { sceneSettings, deriveTokens } from '@/components/audience/sections/registry'
import SectionBand from '@/components/audience/SectionBand'

/**
 * 게시 디자인 broadcast 장면의 배경(bg) → 무대 화면 배경 style.
 * registry의 bgStyle과 동일한 규칙(색/이미지+오버레이/그라데이션 프리셋)을 무대 전체 배경용으로 반영.
 * (registry.bgStyle은 export되지 않아 로컬로 미러링)
 */
function broadcastBgStyle(bg, tokens) {
  const brand = tokens?.brand || '#5157c9'
  const brandRgb = tokens?.cssVars?.['--lp-brand-rgb'] || '81,87,201'
  if (!bg || bg.type === 'none') return { backgroundColor: '#0f172a' }
  if (bg.type === 'color') return { backgroundColor: bg.color || '#0f172a' }
  if (bg.type === 'image' && bg.url) {
    const ov = Math.min(90, Math.max(0, bg.overlay ?? 45)) / 100
    return {
      backgroundColor: '#0f172a',
      backgroundImage: `linear-gradient(rgba(0,0,0,${ov}), rgba(0,0,0,${ov})), url(${bg.url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  if (bg.preset === 'custom') {
    return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.from || brand}, ${bg.to || '#334155'})` }
  }
  const presets = {
    brand: `linear-gradient(135deg, ${brand}, rgba(${brandRgb},0.65))`,
    night: 'linear-gradient(135deg,#0f172a,#334155)',
    sunset: 'linear-gradient(135deg,#e8641f,#e11d48)',
    forest: 'linear-gradient(135deg,#166534,#0d9488)',
  }
  return { background: presets[bg.preset] || presets.brand }
}

/**
 * 송출 화면 (프로젝터/대형 스크린용)
 * - 좌장이 전환하는 3모드: 강연자료(PDF) / Q&A 질문 / 설문 결과
 * - 세션별 스타일 설정 적용 (Q&A 모드)
 * - 실시간 업데이트 (sessions/questions 구독)
 * - 권한 없어도 접속 가능 (설정 버튼만 권한자에게 표시)
 */
export default function BroadcastQnA() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const isEmbed = searchParams.get('embed') === 'true'
  const { t } = useLanguage()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [broadcastingQuestion, setBroadcastingQuestion] = useState(null)
  const [hasPermission, setHasPermission] = useState(false)

  // 모드별 데이터
  const [pdfFile, setPdfFile] = useState(null)
  const [activePoll, setActivePoll] = useState(null)
  const [pollResults, setPollResults] = useState(null)

  // 설정 패널
  const [showSettings, setShowSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [previewSettings, setPreviewSettings] = useState(null)

  // 게시 디자인의 무대 송출(broadcast) 설정 — 있으면 broadcast_settings보다 우선.
  // 없으면 null 유지 → 기존 broadcast_settings 렌더 그대로 (기존 세션 시각 불변)
  const [broadcastDesign, setBroadcastDesign] = useState(null)
  const [designTokens, setDesignTokens] = useState(null)
  const [broadcastBands, setBroadcastBands] = useState({ header: [], footer: [] })

  const defaultSettings = {
    width: 0,
    fontSize: 150,
    fontColor: '#c0392b',
    backgroundColor: '#ffffff',
    borderColor: '',
    innerBackgroundColor: '',
    textAlign: 'center',
    verticalAlign: 'center',
  }

  const mode = session?.broadcast_mode || 'idle'

  /** 권한 확인 (설정 버튼 표시용) */
  const checkPermission = useCallback(async () => {
    if (!user || !session) return false
    try {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (partner) {
        if (session.partner_id === partner.id) return true
        const { data: collab } = await supabase
          .from('session_partners')
          .select('id')
          .eq('session_id', session.id)
          .eq('partner_id', partner.id)
          .eq('status', 'accepted')
          .single()
        if (collab) return true
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()
      if (profile?.user_role === 'admin') return true
      return false
    } catch {
      return false
    }
  }, [user, session])

  /** 세션 로드 */
  const loadSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single()
      if (error) throw error
      setSession(data)
      setPreviewSettings({ ...defaultSettings, ...data.broadcast_settings })
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }, [code])

  /** 송출 중인 질문 로드 */
  const loadBroadcastingQuestion = useCallback(async () => {
    if (!session) return
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*, presenter:session_presenters(display_name, manual_name), category:qna_categories(name, color)')
        .eq('session_id', session.id)
        .eq('is_broadcasting', true)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      setBroadcastingQuestion(data || null)
    } catch (error) {
      console.error('Error loading broadcasting question:', error)
      setBroadcastingQuestion(null)
    }
  }, [session])

  /** 강연자료 로드 */
  useEffect(() => {
    if (session?.broadcast_mode === 'pdf' && session?.broadcast_pdf_id) {
      supabase
        .from('lecture_files')
        .select('*')
        .eq('id', session.broadcast_pdf_id)
        .single()
        .then(({ data }) => setPdfFile(data || null))
    } else {
      setPdfFile(null)
    }
  }, [session?.broadcast_mode, session?.broadcast_pdf_id])

  /** 설문 + 결과 로드 (survey 모드에서 폴링) */
  const loadSurvey = useCallback(async () => {
    if (!session) return
    const { data: poll } = await supabase
      .from('polls')
      .select('*')
      .eq('session_id', session.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActivePoll(poll || null)
    if (poll) {
      const { data: res } = await supabase.rpc('get_poll_results', { p_poll_id: poll.id })
      setPollResults(res || null)
    } else {
      setPollResults(null)
    }
  }, [session])

  useEffect(() => {
    if (session?.broadcast_mode !== 'survey') return
    loadSurvey()
    const i = setInterval(loadSurvey, 3000)
    return () => clearInterval(i)
  }, [session?.broadcast_mode, loadSurvey])

  /** 설정 저장 */
  const handleSaveSettings = async () => {
    if (!session || !previewSettings) return
    setSavingSettings(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ broadcast_settings: previewSettings })
        .eq('id', session.id)
      if (error) throw error
      setSession((prev) => ({ ...prev, broadcast_settings: previewSettings }))
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSavingSettings(false)
    }
  }

  const openSettings = () => {
    setPreviewSettings({ ...defaultSettings, ...session?.broadcast_settings })
    setShowSettings(true)
  }
  const closeSettings = () => {
    setPreviewSettings({ ...defaultSettings, ...session?.broadcast_settings })
    setShowSettings(false)
  }

  useEffect(() => {
    loadSession()
  }, [loadSession])

  /** 게시 디자인 로드 (마운트 1회) — broadcast 장면 설정이 있으면 우선 적용 */
  useEffect(() => {
    if (!code) return
    let cancelled = false
    supabase.rpc('sp_live_design_q', { p_code: code }).then(({ data }) => {
      if (cancelled) return
      const design = data?.design
      const b = design?.scenes?.broadcast
      // 핵심 설정 또는 상/하단 밴드가 하나라도 있으면 게시 디자인 모드로 렌더
      if (b && (b.settings || b.headerSections?.length || b.footerSections?.length)) {
        setBroadcastDesign(sceneSettings(design, 'broadcast'))
      }
      if (b) {
        setBroadcastBands({
          header: b.headerSections || [],
          footer: b.footerSections || [],
        })
      }
      if (design?.tokens) setDesignTokens(deriveTokens(design.tokens))
    })
    return () => {
      cancelled = true
    }
  }, [code])

  useEffect(() => {
    if (session) {
      loadBroadcastingQuestion()
      if (user) checkPermission().then(setHasPermission)
    }
  }, [session, user, loadBroadcastingQuestion, checkPermission])

  /** 실시간 구독 - 질문 송출 상태 */
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`broadcast-questions:${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions', filter: `session_id=eq.${session.id}` },
        async (payload) => {
          if (payload.new.is_broadcasting) {
            loadBroadcastingQuestion()
          } else if (payload.old.is_broadcasting && !payload.new.is_broadcasting) {
            setBroadcastingQuestion(null)
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id, loadBroadcastingQuestion])

  /** 실시간 구독 - 세션(송출 모드/페이지/설정) 동기화 */
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`broadcast-session:${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          setSession((prev) => {
            const next = { ...prev, ...payload.new }
            // 설정 패널 편집 중이면 사용자의 settings 유지
            if (showSettings && prev) next.broadcast_settings = prev.broadcast_settings
            return next
          })
          if (!showSettings && payload.new.broadcast_settings) {
            setPreviewSettings({ ...defaultSettings, ...payload.new.broadcast_settings })
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id, showSettings])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-400">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">{t('error.sessionNotFound')}</p>
        </div>
      </div>
    )
  }

  /* ===== 강연자료(PDF) 모드 ===== */
  if (mode === 'pdf') {
    return (
      <div className="h-screen bg-[#0d0d14] text-white flex flex-col overflow-hidden">
        {pdfFile ? (
          <>
            <div className="px-8 pt-5 pb-3 flex items-center justify-between shrink-0">
              <span className="font-semibold text-slate-200 flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" /> {pdfFile.title}
              </span>
              <span className="font-semibold text-slate-300 text-lg">
                {session.broadcast_pdf_page || 1} <span className="text-slate-600">/</span> {pdfFile.page_count || '?'}
              </span>
            </div>
            <div className="flex-1 min-h-0 px-8 pb-8">
              <PdfPage
                fileUrl={pdfFile.file_url}
                pageNumber={session.broadcast_pdf_page || 1}
                fit="contain"
                pageClassName="rounded-xl overflow-hidden shadow-2xl"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
          </div>
        )}
      </div>
    )
  }

  /* ===== 설문 결과 모드 ===== */
  if (mode === 'survey') {
    return (
      <div className="min-h-screen bg-[#0d0d14] text-white flex items-center justify-center px-16">
        {activePoll ? (
          <div className="w-full max-w-4xl">
            <div className="inline-flex items-center gap-2 text-indigo-300 font-bold text-xl mb-6">
              <BarChart3 className="w-6 h-6" /> 실시간 설문
            </div>
            <h2
              className="text-[40px] leading-tight font-bold mb-10"
              dangerouslySetInnerHTML={{ __html: activePoll.question }}
            />
            {activePoll.poll_type === 'open' ? (
              <div className="text-center text-slate-300 text-2xl">
                {pollResults?.total_responses || 0}명 응답
              </div>
            ) : (
              <div className="space-y-6">
                {(pollResults?.results || []).map((r) => (
                  <div key={r.option_id || r.option_text}>
                    <div className="flex justify-between text-2xl font-bold mb-2">
                      <span>{r.option_text}</span>
                      <span className="text-indigo-300">{r.percentage}%</span>
                    </div>
                    <div className="h-9 bg-white/10 rounded-xl overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-xl transition-all" style={{ width: `${r.percentage}%` }} />
                    </div>
                  </div>
                ))}
                <div className="text-center text-slate-400 text-xl mt-8">
                  {pollResults?.total_responses || 0}명 응답
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <BarChart3 className="h-24 w-24 mx-auto mb-6 opacity-30" />
            <p className="text-3xl">설문 준비 중</p>
          </div>
        )}
      </div>
    )
  }

  /* ===== 안내(인트로/휴식) 모드 ===== */
  if (mode === 'notice') {
    return (
      <div className="min-h-screen bg-[#0d0d14] text-white flex items-center justify-center px-16 text-center">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-amber-300 font-bold text-xl mb-8">
            <Megaphone className="w-6 h-6" /> 안내
          </div>
          <div className="text-[44px] leading-snug font-bold whitespace-pre-wrap">
            {session.broadcast_notice || '잠시 후 계속됩니다'}
          </div>
        </div>
      </div>
    )
  }

  /* ===== Q&A / 대기 모드 ===== */
  // 게시 디자인 broadcast 설정이 있으면 우선, 없으면 기존 broadcast_settings 폴백(시각 불변)
  const useDesign = !!broadcastDesign
  const bd = broadcastDesign
  const settings = previewSettings || { ...defaultSettings, ...session.broadcast_settings }

  const fontColor = useDesign ? bd.fontColor || '#ffffff' : settings.fontColor || '#c0392b'
  const fontSize = useDesign ? bd.fontSize || 150 : settings.fontSize
  const cardBg = useDesign ? bd.cardBg : settings.innerBackgroundColor
  const cardBorder = useDesign ? bd.cardBorder : settings.borderColor
  const textAlign = useDesign ? bd.align || 'center' : settings.textAlign || 'center'

  const containerStyle = useDesign
    ? {
        ...broadcastBgStyle(bd.bg, designTokens),
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        transition: 'background-color 0.3s ease',
      }
    : {
        backgroundColor: settings.backgroundColor || '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        alignItems:
          settings.verticalAlign === 'top'
            ? 'flex-start'
            : settings.verticalAlign === 'bottom'
            ? 'flex-end'
            : 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        transition: 'background-color 0.3s ease',
      }

  const textStyle = {
    fontSize: `${fontSize}px`,
    color: fontColor,
    textAlign,
    fontWeight: 'bold',
    fontStyle: useDesign ? 'normal' : 'italic',
    lineHeight: 1.2,
    maxWidth: !useDesign && settings.width > 0 ? `${settings.width}px` : '90%',
    width: !useDesign && settings.width > 0 ? `${settings.width}px` : 'auto',
    padding: cardBorder || cardBg ? '2rem' : 0,
    backgroundColor: cardBg || 'transparent',
    border: cardBorder ? `4px solid ${cardBorder}` : 'none',
    borderRadius: cardBorder ? (useDesign ? '12px' : '8px') : useDesign && cardBg ? '12px' : 0,
    transition: 'all 0.3s ease',
  }

  const q = broadcastingQuestion
  const authorLabel = q ? (q.is_anonymous ? '익명' : q.author_name || '익명') : ''

  return (
    <>
      <div style={containerStyle}>
        {/* 게시 디자인 상단 자유 섹션 밴드 */}
        {useDesign && broadcastBands.header.length > 0 && (
          <SectionBand sections={broadcastBands.header} tokens={designTokens} data={{ session }} />
        )}
        <div
          style={
            useDesign
              ? { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }
              : { display: 'contents' }
          }
        >
        {broadcastingQuestion ? (
          <div style={textStyle}>
            {/* 카테고리 — 디자인 모드에선 showCategory 토글 반영, 폴백은 기존대로 항상 */}
            {(useDesign ? bd.showCategory : true) && broadcastingQuestion.category?.name && (
              <div
                className="inline-block text-base not-italic font-bold rounded-full px-4 py-1 mb-6"
                style={{
                  color: '#fff',
                  backgroundColor: broadcastingQuestion.category.color || '#4f46e5',
                  fontSize: `${Math.max(18, Math.round((fontSize || 150) * 0.22))}px`,
                }}
              >
                {broadcastingQuestion.category.name}
              </div>
            )}
            <div>{broadcastingQuestion.content}</div>
            {/* 작성자·좋아요 — 게시 디자인 토글 (폴백 모드는 기존처럼 미표시) */}
            {useDesign && (bd.showAuthor || bd.showLikes) && (
              <div
                className="not-italic font-semibold mt-6 opacity-80"
                style={{ fontSize: `${Math.max(16, Math.round((fontSize || 150) * 0.2))}px` }}
              >
                {bd.showAuthor && authorLabel}
                {bd.showAuthor && bd.showLikes && q.likes_count > 0 && ' · '}
                {bd.showLikes && q.likes_count > 0 && `♥ ${q.likes_count}`}
              </div>
            )}
          </div>
        ) : (
          <div
            className="text-center"
            style={{
              color: useDesign
                ? `${fontColor}80`
                : settings.fontColor
                ? `${settings.fontColor}50`
                : '#d1d5db',
            }}
          >
            <MessageCircle className="h-24 w-24 mx-auto mb-6 opacity-30" />
            <p className="text-3xl">{t('broadcast.waitingForQuestion')}</p>
          </div>
        )}
        </div>
        {/* 게시 디자인 하단 자유 섹션 밴드 */}
        {useDesign && broadcastBands.footer.length > 0 && (
          <SectionBand sections={broadcastBands.footer} tokens={designTokens} data={{ session }} />
        )}

        {hasPermission && !isEmbed && (
          <button
            onClick={openSettings}
            className="fixed bottom-6 right-6 w-12 h-12 bg-gray-800/80 hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            title={t('broadcast.settings')}
          >
            <Settings className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* 설정 슬라이드 패널 */}
      <Sheet open={showSettings} onOpenChange={(open) => !open && closeSettings()}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('broadcast.settingsTitle')}</SheetTitle>
            <SheetDescription>{t('broadcast.settingsDesc')}</SheetDescription>
          </SheetHeader>

          {previewSettings && (
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label>{t('broadcast.width')}</Label>
                <Input
                  type="number"
                  value={previewSettings.width}
                  onChange={(e) => setPreviewSettings((prev) => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                  placeholder="0 (자동)"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.fontSize')}</Label>
                <Input
                  type="number"
                  value={previewSettings.fontSize}
                  onChange={(e) => setPreviewSettings((prev) => ({ ...prev, fontSize: parseInt(e.target.value) || 100 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.fontColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.fontColor || '#c0392b'}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, fontColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.fontColor}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, fontColor: e.target.value }))}
                    placeholder="#c0392b"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.backgroundColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.backgroundColor || '#ffffff'}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.backgroundColor}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.borderColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.borderColor || '#cccccc'}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, borderColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.borderColor}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, borderColor: e.target.value }))}
                    placeholder="비워두면 테두리 없음"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.innerBgColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.innerBackgroundColor || '#ffffff'}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, innerBackgroundColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.innerBackgroundColor}
                    onChange={(e) => setPreviewSettings((prev) => ({ ...prev, innerBackgroundColor: e.target.value }))}
                    placeholder="비워두면 투명"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.textAlign')}</Label>
                <Select
                  value={previewSettings.textAlign}
                  onValueChange={(value) => setPreviewSettings((prev) => ({ ...prev, textAlign: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">{t('broadcast.alignLeft')}</SelectItem>
                    <SelectItem value="center">{t('broadcast.alignCenter')}</SelectItem>
                    <SelectItem value="right">{t('broadcast.alignRight')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('broadcast.verticalAlign')}</Label>
                <Select
                  value={previewSettings.verticalAlign}
                  onValueChange={(value) => setPreviewSettings((prev) => ({ ...prev, verticalAlign: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">{t('broadcast.alignTop')}</SelectItem>
                    <SelectItem value="center">{t('broadcast.alignMiddle')}</SelectItem>
                    <SelectItem value="bottom">{t('broadcast.alignBottom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <SheetFooter className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeSettings} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="flex-1">
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
