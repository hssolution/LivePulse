import { Link } from 'react-router-dom'
import { COMPANY } from '@/config/company'

/**
 * 공개 페이지용 푸터
 * 전자상거래법상 의무 정보 (사업자명, 대표, 사업자번호, 통신판매업 신고번호, 주소, 연락처) 표시
 * 약관·개인정보처리방침·환불정책 링크 포함
 */
export function PublicFooter() {
  return (
    <footer className="border-t bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 상단: 약관 링크 */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 font-medium">
          <Link to="/legal/terms" className="hover:text-slate-900 dark:hover:text-white">
            이용약관
          </Link>
          <Link to="/legal/privacy" className="hover:text-slate-900 dark:hover:text-white font-semibold">
            개인정보처리방침
          </Link>
          <Link to="/legal/refund" className="hover:text-slate-900 dark:hover:text-white">
            환불정책
          </Link>
          <a href={`mailto:${COMPANY.email}`} className="hover:text-slate-900 dark:hover:text-white">
            고객센터
          </a>
        </div>

        {/* 사업자 정보 */}
        <div className="space-y-1 text-xs leading-relaxed">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            {COMPANY.name}
          </div>
          <div>대표: {COMPANY.representative}</div>
          <div>사업자등록번호: {COMPANY.businessNumberFormatted}</div>
          <div>통신판매업신고: {COMPANY.mailOrderNumber}</div>
          <div>
            주소: {COMPANY.address} {COMPANY.addressDetail}
          </div>
          <div>
            고객센터: {COMPANY.email}
            {COMPANY.phone && COMPANY.phone !== '0000-0000' && ` | ${COMPANY.phone}`}
          </div>
        </div>

        {/* 카피라이트 */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          © {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
