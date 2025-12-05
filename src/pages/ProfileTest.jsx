import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * 프로필 정보 테스트 페이지
 * 로그인 세션에 포함된 프로필 정보를 확인할 수 있는 페이지
 */
export default function ProfileTest() {
  const { user, profile, userClaims, loading, refreshProfile } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>로그인이 필요합니다</CardTitle>
            <CardDescription>프로필 정보를 보려면 로그인해주세요.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">프로필 정보 테스트</h1>
      
      <div className="flex-1 overflow-auto space-y-4 md:space-y-6">
      
      {/* 기본 사용자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 사용자 정보 (User Object)</CardTitle>
          <CardDescription>Supabase Auth에서 제공하는 기본 사용자 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="text-sm">{new Date(user.created_at).toLocaleString('ko-KR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 프로필 정보 (간편 접근) */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 정보 (Profile Object)</CardTitle>
          <CardDescription>
            JWT 토큰에서 추출한 프로필 정보 - 간편하게 접근 가능
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{profile.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-sm font-semibold text-blue-600">{profile.role || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">User Type</p>
                <p className="text-sm font-semibold text-green-600">{profile.userType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-sm font-semibold text-purple-600">{profile.status || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{profile.description || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">프로필 정보가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 전체 JWT 클레임 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 JWT 클레임 (User Claims)</CardTitle>
          <CardDescription>
            JWT 토큰에 포함된 모든 클레임 정보 (디버깅용)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(userClaims, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* 프로필 새로고침 버튼 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 새로고침</CardTitle>
          <CardDescription>
            프로필 정보를 업데이트한 후 이 버튼을 클릭하여 최신 정보를 가져올 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshProfile}>
            프로필 새로고침
          </Button>
        </CardContent>
      </Card>

      {/* 사용 예시 코드 */}
      <Card>
        <CardHeader>
          <CardTitle>코드 사용 예시</CardTitle>
          <CardDescription>
            다른 컴포넌트에서 프로필 정보를 사용하는 방법
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
{`import { useAuth } from '@/context/AuthContext'

function MyComponent() {
  const { profile } = useAuth()
  
  // 간단하게 프로필 정보 사용
  if (profile?.role === 'admin') {
    return <AdminPanel />
  }
  
  if (profile?.status === 'pending') {
    return <PendingMessage />
  }
  
  return <div>User Type: {profile?.userType}</div>
}`}
          </pre>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

