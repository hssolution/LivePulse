import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
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
import { Loader2, MessageCircle, Settings } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Q&A 송출 화면 (프로젝터/대형 스크린용)
 * - 전체 화면에 현재 송출 중인 질문 표시
 * - 세션별 스타일 설정 적용
 * - 실시간 업데이트
 * - 오른쪽 슬라이드 설정 패널
 * - 권한 없어도 접속 가능 (설정 버튼만 권한자에게 표시)
 */
export default function BroadcastQnA() {
  const { code } = useParams()
  const { t } = useLanguage()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [broadcastingQuestion, setBroadcastingQuestion] = useState(null)
  const [hasPermission, setHasPermission] = useState(false)
  
  // 설정 패널
  const [showSettings, setShowSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // 실시간 미리보기용 설정 (수정 중인 값)
  const [previewSettings, setPreviewSettings] = useState(null)

  // 기본 송출 설정
  const defaultSettings = {
    width: 0,
    fontSize: 150,
    fontColor: '#c0392b',
    backgroundColor: '#ffffff',
    borderColor: '',
    innerBackgroundColor: '',
    textAlign: 'center',
    verticalAlign: 'center'
  }

  /**
   * 권한 확인 (설정 버튼 표시용)
   */
  const checkPermission = useCallback(async () => {
    if (!user || !session) return false
    
    try {
      // 세션 소유자 체크
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
      
      // 관리자 체크
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

  /**
   * 세션 로드
   */
  const loadSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single()
      
      if (error) throw error
      setSession(data)
      
      const settings = { ...defaultSettings, ...data.broadcast_settings }
      setPreviewSettings(settings)
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }, [code])

  /**
   * 송출 중인 질문 로드
   */
  const loadBroadcastingQuestion = useCallback(async () => {
    if (!session) return
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*, presenter:session_presenters(display_name, manual_name)')
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

  /**
   * 설정 저장
   */
  const handleSaveSettings = async () => {
    if (!session || !previewSettings) return
    
    setSavingSettings(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ broadcast_settings: previewSettings })
        .eq('id', session.id)
      
      if (error) throw error
      
      setSession(prev => ({ ...prev, broadcast_settings: previewSettings }))
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSavingSettings(false)
    }
  }

  /**
   * 설정 패널 열기
   */
  const openSettings = () => {
    setPreviewSettings({ ...defaultSettings, ...session?.broadcast_settings })
    setShowSettings(true)
  }

  /**
   * 설정 패널 닫기 (저장 안함)
   */
  const closeSettings = () => {
    // 저장된 설정으로 복원
    setPreviewSettings({ ...defaultSettings, ...session?.broadcast_settings })
    setShowSettings(false)
  }

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (session) {
      loadBroadcastingQuestion()
      if (user) {
        checkPermission().then(setHasPermission)
      }
    }
  }, [session, user, loadBroadcastingQuestion, checkPermission])

  /**
   * 실시간 구독 - 질문 송출 상태
   */
  useEffect(() => {
    if (!session) return
    
    const channel = supabase
      .channel(`broadcast-questions:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'questions',
          filter: `session_id=eq.${session.id}`
        },
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
  }, [session, loadBroadcastingQuestion])

  /**
   * 실시간 구독 - 송출 설정 동기화
   */
  useEffect(() => {
    if (!session) return
    
    const channel = supabase
      .channel(`broadcast-settings:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          // 설정 패널이 열려있지 않을 때만 동기화 (수정 중인 화면은 유지)
          if (!showSettings && payload.new.broadcast_settings) {
            const newSettings = { ...defaultSettings, ...payload.new.broadcast_settings }
            setSession(prev => ({ ...prev, broadcast_settings: payload.new.broadcast_settings }))
            setPreviewSettings(newSettings)
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, showSettings])

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

  // 현재 적용할 설정 (미리보기용 설정 우선)
  const settings = previewSettings || { ...defaultSettings, ...session.broadcast_settings }

  // 스타일 계산
  const containerStyle = {
    backgroundColor: settings.backgroundColor || '#ffffff',
    minHeight: '100vh',
    display: 'flex',
    alignItems: settings.verticalAlign === 'top' ? 'flex-start' 
              : settings.verticalAlign === 'bottom' ? 'flex-end' 
              : 'center',
    justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
    transition: 'background-color 0.3s ease'
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
    transition: 'all 0.3s ease'
  }

  return (
    <>
      <div style={containerStyle}>
        {/* 송출 중인 질문 또는 대기 메시지 */}
        {broadcastingQuestion ? (
          <div style={textStyle}>
            {broadcastingQuestion.content}
          </div>
        ) : (
          <div className="text-center" style={{ color: settings.fontColor ? `${settings.fontColor}50` : '#d1d5db' }}>
            <MessageCircle className="h-24 w-24 mx-auto mb-6 opacity-30" />
            <p className="text-3xl">{t('broadcast.waitingForQuestion')}</p>
          </div>
        )}
        
        {/* 설정 버튼 (권한 있는 경우만) */}
        {hasPermission && (
          <button
            onClick={openSettings}
            className="fixed bottom-6 right-6 w-12 h-12 bg-gray-800/80 hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            title={t('broadcast.settings')}
          >
            <Settings className="h-6 w-6 text-white" />
          </button>
        )}
      </div>
      
      {/* 설정 슬라이드 패널 (오른쪽) */}
      <Sheet open={showSettings} onOpenChange={(open) => !open && closeSettings()}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('broadcast.settingsTitle')}</SheetTitle>
            <SheetDescription>
              {t('broadcast.settingsDesc')}
            </SheetDescription>
          </SheetHeader>
          
          {previewSettings && (
            <div className="space-y-5 py-6">
              {/* 너비 */}
              <div className="space-y-2">
                <Label>{t('broadcast.width')}</Label>
                <Input
                  type="number"
                  value={previewSettings.width}
                  onChange={(e) => setPreviewSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                  placeholder="0 (자동)"
                />
              </div>
              
              {/* 폰트 크기 */}
              <div className="space-y-2">
                <Label>{t('broadcast.fontSize')}</Label>
                <Input
                  type="number"
                  value={previewSettings.fontSize}
                  onChange={(e) => setPreviewSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 100 }))}
                />
              </div>
              
              {/* 폰트 색상 */}
              <div className="space-y-2">
                <Label>{t('broadcast.fontColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.fontColor || '#c0392b'}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, fontColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.fontColor}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, fontColor: e.target.value }))}
                    placeholder="#c0392b"
                  />
                </div>
              </div>
              
              {/* 배경 색상 */}
              <div className="space-y-2">
                <Label>{t('broadcast.backgroundColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.backgroundColor || '#ffffff'}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.backgroundColor}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              
              {/* 테두리 색상 */}
              <div className="space-y-2">
                <Label>{t('broadcast.borderColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.borderColor || '#cccccc'}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, borderColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.borderColor}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, borderColor: e.target.value }))}
                    placeholder="비워두면 테두리 없음"
                  />
                </div>
              </div>
              
              {/* 테두리 안 배경 색상 */}
              <div className="space-y-2">
                <Label>{t('broadcast.innerBgColor')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-12 h-10 rounded border cursor-pointer"
                    value={previewSettings.innerBackgroundColor || '#ffffff'}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, innerBackgroundColor: e.target.value }))}
                  />
                  <Input
                    value={previewSettings.innerBackgroundColor}
                    onChange={(e) => setPreviewSettings(prev => ({ ...prev, innerBackgroundColor: e.target.value }))}
                    placeholder="비워두면 투명"
                  />
                </div>
              </div>
              
              {/* 폰트 정렬 */}
              <div className="space-y-2">
                <Label>{t('broadcast.textAlign')}</Label>
                <Select
                  value={previewSettings.textAlign}
                  onValueChange={(value) => setPreviewSettings(prev => ({ ...prev, textAlign: value }))}
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
              
              {/* 세로 정렬 */}
              <div className="space-y-2">
                <Label>{t('broadcast.verticalAlign')}</Label>
                <Select
                  value={previewSettings.verticalAlign}
                  onValueChange={(value) => setPreviewSettings(prev => ({ ...prev, verticalAlign: value }))}
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
            <Button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex-1"
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
