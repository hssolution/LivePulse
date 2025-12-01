import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * 관리자 전용 라우트 가드
 * user_role이 'admin'인 경우만 접근 허용
 */
export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  // 로딩 중일 때는 로딩 화면 표시
  if (loading) {
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

  // 관리자가 아닌 경우
  if (profile.role !== 'admin') {
    // 파트너인 경우 파트너 페이지로
    if (profile.userType === 'partner') {
      return <Navigate to="/partner" replace />
    }
    // 그 외의 경우 (일반 회원) 홈으로
    return <Navigate to="/" replace />
  }

  return children
}
