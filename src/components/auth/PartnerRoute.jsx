import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, User } from 'lucide-react'

/**
 * 파트너 전용 라우트 가드
 * user_type이 'partner'이고 status가 'active'인 경우만 접근 허용
 * 관리자도 파트너 페이지 접근 가능
 * 
 * JWT 갱신 지연 문제 대응: DB에서 직접 user_type 확인
 * display_name이 없으면 입력하도록 강제 (profiles.display_name 통일 사용)
 */
export function PartnerRoute({ children }) {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const [dbUserType, setDbUserType] = useState(null)
  const [dbDisplayName, setDbDisplayName] = useState(null)
  const [dbLoading, setDbLoading] = useState(true)

  // 사용자명 입력 다이얼로그
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  // DB에서 직접 user_type, display_name 확인
  useEffect(() => {
    const checkUserType = async () => {
      if (!user) {
        setDbLoading(false)
        return
      }
      
      try {
        // profiles에서 정보 조회 (display_name 통일 사용)
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type, status, display_name')
          .eq('id', user.id)
          .single()
        
        if (!error && data) {
          setDbUserType(data.user_type)
          setDbDisplayName(data.display_name)
        }
      } catch (error) {
        console.error('Error checking user type:', error)
      } finally {
        setDbLoading(false)
      }
    }
    
    checkUserType()
  }, [user])

  // display_name 체크 후 다이얼로그 표시
  useEffect(() => {
    if (!dbLoading && dbUserType && (dbUserType === 'partner' || dbUserType === 'admin')) {
      // 파트너인데 display_name이 없으면 다이얼로그 표시
      if (dbUserType === 'partner' && !dbDisplayName) {
        setShowNameDialog(true)
      }
    }
  }, [dbLoading, dbUserType, dbDisplayName])

  /**
   * 사용자명 저장
   */
  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      toast.error(t('mypage.displayNameRequired'))
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id)
      
      if (error) throw error
      
      setDbDisplayName(displayName.trim())
      setShowNameDialog(false)
      toast.success(t('common.saved'))
      
      // 프로필 새로고침
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (error) {
      console.error('Error saving display name:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  // 로딩 중일 때는 로딩 화면 표시
  if (loading || dbLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 프로필 로딩 중
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 관리자는 파트너 페이지도 접근 가능
  if (profile.userType === 'admin' || dbUserType === 'admin') {
    return children
  }

  // 정지된 계정
  if (profile.status === 'suspended') {
    return <Navigate to="/" replace />
  }

  // 파트너가 아닌 경우 (일반 회원) - JWT 또는 DB 둘 중 하나라도 partner면 허용
  const isPartner = profile.userType === 'partner' || dbUserType === 'partner'
  if (!isPartner) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      {/* 사용자명 입력 다이얼로그 */}
      <Dialog open={showNameDialog} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('partner.setupDisplayName')}
            </DialogTitle>
            <DialogDescription>
              {t('partner.setupDisplayNameDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('common.displayName')} *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('mypage.displayNamePlaceholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saving) {
                    handleSaveDisplayName()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t('partner.displayNameUsage')}
              </p>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleSaveDisplayName}
              disabled={saving || !displayName.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {children}
    </>
  )
}
