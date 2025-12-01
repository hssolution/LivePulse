import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings as SettingsIcon, Bell, Shield, Eye } from "lucide-react"

/**
 * 설정 페이지 (공통)
 */
export default function Settings() {
  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">설정</h2>
          <p className="text-sm text-muted-foreground mt-1">
            계정 설정을 관리하세요.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 md:space-y-6">
        {/* 알림 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 설정
            </CardTitle>
            <CardDescription>
              알림 수신 방법을 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>이메일 알림</Label>
                <p className="text-sm text-muted-foreground">중요한 알림을 이메일로 받습니다.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>마케팅 알림</Label>
                <p className="text-sm text-muted-foreground">프로모션, 이벤트 정보를 받습니다.</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* 개인정보 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              공개 설정
            </CardTitle>
            <CardDescription>
              프로필 공개 범위를 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>프로필 공개</Label>
                <p className="text-sm text-muted-foreground">다른 사용자가 프로필을 볼 수 있습니다.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>활동 내역 공개</Label>
                <p className="text-sm text-muted-foreground">활동 내역을 공개합니다.</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* 보안 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              보안 설정
            </CardTitle>
            <CardDescription>
              계정 보안을 강화하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>2단계 인증</Label>
                <p className="text-sm text-muted-foreground">로그인 시 추가 인증을 요구합니다.</p>
              </div>
              <Button variant="outline" size="sm">설정</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>로그인 기록</Label>
                <p className="text-sm text-muted-foreground">최근 로그인 기록을 확인합니다.</p>
              </div>
              <Button variant="outline" size="sm">확인</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

