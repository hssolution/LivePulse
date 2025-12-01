import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * 인증된 사용자만 접근 가능한 라우트
 * 역할에 따라 적절한 페이지로 리다이렉트
 */
export default function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 1. 로그인 체크
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. 프로필 정보 확인
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 3. 승인 상태(status) 체크
  if (profile.status !== 'active') {
    return <Navigate to="/pending-approval" replace />
  }

  return children
}
