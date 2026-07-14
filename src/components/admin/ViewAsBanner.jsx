import { useEffect, useRef } from 'react'
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
  const bannerRef = useRef(null)
  const { isViewingAs, viewAs, clearViewAs } = usePartner()

  // 배너가 떠 있을 때 레이아웃이 활용할 수 있도록 "실제 렌더링된 높이"를 CSS 변수로 노출한다.
  // (AdminLayout 등 h-screen 컨테이너가 calc(100vh - var(--view-as-banner-height)) 로 빼서 잘림을 방지)
  // 고정값(44px)을 쓰면 브라우저 배율·폰트에 따라 실제 높이와 어긋나
  // 배너가 화면을 덮거나(스크롤 발생) 푸터 아래가 들뜨므로 반드시 측정값을 사용한다.
  useEffect(() => {
    if (!isViewingAs || !viewAs) return
    const el = bannerRef.current
    if (!el) return

    const apply = () => {
      document.documentElement.style.setProperty('--view-as-banner-height', `${el.offsetHeight}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)

    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--view-as-banner-height')
    }
  }, [isViewingAs, viewAs])

  if (!isViewingAs || !viewAs) return null

  // iframe(화면 디자인 미리보기 등) 안에서는 표시하지 않는다 —
  // 청중 화면 미리보기에 관리자 배너가 섞여 보이는 문제 방지
  if (window.self !== window.top) return null

  const handleExit = () => {
    clearViewAs()
    navigate('/adm/partners')
  }

  const handleGoToPartnerHome = () => {
    navigate('/partner')
  }

  return (
    <div ref={bannerRef} className="sticky top-0 z-[60] bg-amber-400 text-amber-950 border-b border-amber-500 shadow-sm">
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
