import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import InitialLoading from '@/components/ui/InitialLoading'

/**
 * 파트너 전용 라우트 가드
 * user_type이 'partner'인 경우만 접근 허용
 * (관리자는 접근 가능)
 */
export function PartnerRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // 로딩 중일 때는 로딩 화면 표시
  if (loading || (user && !profile)) {
    return (
      <InitialLoading 
        title="Partner Center"
        messages={[
          '파트너 정보를 확인하고 있습니다...',
          '세션 데이터를 불러오는 중입니다...',
          '파트너 센터로 이동합니다...'
        ]}
        speed={2}
      />
    )
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    // 로그인 뒤 보던 화면으로 돌아오게 한다
    const back = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(back)}`} replace />
  }

  // 파트너 권한 체크 (관리자는 프리패스)
  if (profile?.userType !== 'partner' && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // 관리자가 파트너 페이지 접근 시 관리자 페이지로 보낼지, 
  // 아니면 파트너 뷰를 보게 할지 결정해야 함.
  // 현재 기획상 관리자는 파트너 페이지도 볼 수 있다고 가정.
  
  return children
}
