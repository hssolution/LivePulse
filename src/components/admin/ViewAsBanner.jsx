import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartner } from '@/context/PartnerContext'
import { Eye, X, LayoutDashboard } from 'lucide-react'

/**
 * 관리자 보기 모드 배너
 *
 * 관리자가 특정 파트너 계정을 "보기 모드"로 탐색 중일 때
 * 모든 페이지 최상단에 노란 띠를 표시합니다.
 *
 * App.jsx의 Router 내부 최상위에 한 번만 마운트되어,
 * /adm/* /partner/* /partner/sessions/:id 등 모든 경로에서 보입니다.
 */
export default function ViewAsBanner() {
  const navigate = useNavigate()
  const { isViewingAs, viewAs, clearViewAs } = usePartner()

  // 배너가 떠 있을 때 레이아웃이 활용할 수 있도록 높이를 CSS 변수로 노출한다.
  // (AdminLayout 등 h-screen 컨테이너가 calc(100vh - var(--view-as-banner-height)) 로 빼서 잘림을 방지)
  useEffect(() => {
    if (isViewingAs && viewAs) {
      document.documentElement.style.setProperty('--view-as-banner-height', '44px')
      return () => document.documentElement.style.removeProperty('--view-as-banner-height')
    }
  }, [isViewingAs, viewAs])

  if (!isViewingAs || !viewAs) return null

  const handleExit = () => {
    clearViewAs()
    navigate('/adm/partners')
  }

  const handleGoToPartnerHome = () => {
    navigate('/partner')
  }

  return (
    <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 border-b border-amber-500 shadow-sm">
      <div className="max-w-full px-4 py-2 flex items-center gap-3 text-sm">
        <Eye className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold truncate">
          관리자 보기 모드 — <b>{viewAs.name || '파트너'}</b>
          {viewAs.partnerType && (
            <span className="ml-1 font-normal opacity-70">({partnerTypeLabel(viewAs.partnerType)})</span>
          )}
          {' '}계정으로 화면을 둘러보고 있습니다
        </span>
        <span className="hidden md:inline text-xs opacity-70 ml-2">
          · 데이터 변경은 관리자 계정으로 기록됩니다
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleGoToPartnerHome}
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-amber-300/60 hover:bg-amber-300 px-3 py-1 rounded-md transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> 파트너 홈으로
        </button>
        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-1.5 text-xs font-bold bg-amber-950 hover:bg-amber-900 text-amber-50 px-3 py-1 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" /> 원래대로
        </button>
      </div>
    </div>
  )
}

function partnerTypeLabel(t) {
  if (t === 'organizer') return '행사주최'
  if (t === 'agency') return '대행사'
  if (t === 'instructor') return '강연자'
  return t
}
