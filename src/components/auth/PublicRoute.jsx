import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * 비로그인 사용자만 접근 가능한 라우트 (로그인, 회원가입 등)
 * 이미 로그인된 경우 역할에 따라 적절한 페이지로 리다이렉트
 * 단, redirect 파라미터가 있으면 해당 페이지로 이동
 */
export default function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect')

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 이미 로그인이 되어 있으면 리다이렉트
  if (user && profile) {
    // redirect 파라미터가 있으면 해당 페이지로 이동 (초대 수락 등)
    if (redirectUrl) {
      return <Navigate to={redirectUrl} replace />
    }
    
    // 정지된 계정
    if (profile.status === 'suspended') {
      return <Navigate to="/" replace />
    }
    
    // 관리자인 경우
    if (profile.role === 'admin') {
      return <Navigate to="/adm" replace />
    }
    
    // 파트너인 경우
    if (profile.userType === 'partner') {
      return <Navigate to="/partner" replace />
    }
    
    // 일반 회원은 홈으로
    return <Navigate to="/" replace />
  }

  return children
}
