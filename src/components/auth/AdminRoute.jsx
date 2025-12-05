import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import InitialLoading from '@/components/ui/InitialLoading'

/**
 * 관리자 전용 라우트 가드
 * user_role이 'admin'인 경우만 접근 허용
 */
export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  // 로딩 중일 때는 로딩 화면 표시
  if (loading || (user && !profile)) {
    return (
      <InitialLoading 
        title="Administrator"
        messages={[
          '관리자 권한을 확인하고 있습니다...',
          '보안 설정을 불러오는 중입니다...',
          '대시보드로 이동합니다...'
        ]}
        speed={2} // 일반 로딩보다 조금 빠르게
      />
    )
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 관리자가 아닌 경우
  if (profile?.role !== 'admin') {
    // 파트너인 경우 파트너 페이지로
    if (profile?.userType === 'partner') {
      return <Navigate to="/partner" replace />
    }
    // 그 외의 경우 (일반 회원) 홈으로
    return <Navigate to="/" replace />
  }

  return children
}
