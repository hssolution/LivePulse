import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { User, Mail, Shield, Calendar, Building2, Loader2, Save, UserCircle } from "lucide-react"

/**
 * 내 정보 페이지 (공통)
 */
export default function Profile() {
  const { profile, user, refreshProfile } = useAuth()
  const { t } = useLanguage()
  
  const [displayName, setDisplayName] = useState('')
  const [originalDisplayName, setOriginalDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [loadingName, setLoadingName] = useState(true)
  
  /**
   * DB에서 display_name 직접 로드
   */
  const loadDisplayName = useCallback(async () => {
    if (!user?.id) return
    
    setLoadingName(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      
      const name = data?.display_name || ''
      setDisplayName(name)
      setOriginalDisplayName(name)
    } catch (error) {
      console.error('Error loading display name:', error)
    } finally {
      setLoadingName(false)
    }
  }, [user?.id])
  
  // 페이지 로드 시 DB에서 가져오기
  useEffect(() => {
    loadDisplayName()
  }, [loadDisplayName])

  /**
   * 사용자명 저장
   */
  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      toast.error(t('mypage.displayNameRequired'))
      return
    }
    
    setSavingName(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id)
      
      if (error) throw error
      
      setOriginalDisplayName(displayName.trim())
      toast.success(t('common.saved'))
      
      // JWT 갱신 시도 (다음 로그인에 반영될 수 있음)
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (error) {
      console.error('Error saving display name:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSavingName(false)
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return t('admin.administrators')
      case 'partner': return t('admin.partners')
      default: return role
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return t('admin.activeUsers')
      default: return status
    }
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('profile.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('profile.desc')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 md:space-y-6">
        {/* 사용자명 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              {t('common.displayName')}
            </CardTitle>
            <CardDescription>
              {t('partner.displayNameUsage')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {loadingName ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : (
                <>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('mypage.displayNamePlaceholder')}
                    className="max-w-md"
                  />
                  <Button 
                    onClick={handleSaveDisplayName} 
                    disabled={savingName || displayName === originalDisplayName}
                  >
                    {savingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.basicInfo')}
            </CardTitle>
            <CardDescription>
              {t('profile.accountInfo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input id="email" value={profile?.email || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('admin.colRole')}</Label>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Input id="role" value={getRoleLabel(profile?.role)} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('admin.colUserType')}</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Input id="type" value={profile?.userType || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('admin.colStatus')}</Label>
                <Input id="status" value={getStatusLabel(profile?.status)} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="created">{t('mypage.joinDate')}</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input id="created" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'} disabled />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.changePassword')}</CardTitle>
            <CardDescription>
              {t('profile.securitySettings')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('profile.currentPassword')}</Label>
                <Input id="current-password" type="password" placeholder={t('profile.currentPassword')} />
              </div>
              <div></div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('profile.newPassword')}</Label>
                <Input id="new-password" type="password" placeholder={t('profile.newPassword')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('profile.confirmNewPassword')}</Label>
                <Input id="confirm-password" type="password" placeholder={t('profile.confirmNewPassword')} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button>{t('profile.changePassword')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
