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

  /* ===== Q&A / 대기 모드 (기존) ===== */
  const settings = previewSettings || { ...defaultSettings, ...session.broadcast_settings }

  const containerStyle = {
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
    fontSize: `${settings.fontSize}px`,
    color: settings.fontColor || '#c0392b',
    textAlign: settings.textAlign || 'center',
    fontWeight: 'bold',
    fontStyle: 'italic',
    lineHeight: 1.2,
    maxWidth: settings.width > 0 ? `${settings.width}px` : '90%',
    width: settings.width > 0 ? `${settings.width}px` : 'auto',
    padding: settings.borderColor || settings.innerBackgroundColor ? '2rem' : 0,
    backgroundColor: settings.innerBackgroundColor || 'transparent',
    border: settings.borderColor ? `4px solid ${settings.borderColor}` : 'none',
    borderRadius: settings.borderColor ? '8px' : 0,
    transition: 'all 0.3s ease',
  }

  return (
    <>
      <div style={containerStyle}>
        {broadcastingQuestion ? (
          <div style={textStyle}>
            {broadcastingQuestion.category?.name && (
              <div
                className="inline-block text-base not-italic font-bold rounded-full px-4 py-1 mb-6"
                style={{
                  color: '#fff',
                  backgroundColor: broadcastingQuestion.category.color || '#4f46e5',
                  fontSize: `${Math.max(18, Math.round((settings.fontSize || 150) * 0.22))}px`,
                }}
              >
                {broadcastingQuestion.category.name}
              </div>
            )}
            <div>{broadcastingQuestion.content}</div>
          </div>
        ) : (
          <div className="text-center" style={{ color: settings.fontColor ? `${settings.fontColor}50` : '#d1d5db' }}>
            <MessageCircle className="h-24 w-24 mx-auto mb-6 opacity-30" />
            <p className="text-3xl">{t('broadcast.waitingForQuestion')}</p>
          </div>
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
