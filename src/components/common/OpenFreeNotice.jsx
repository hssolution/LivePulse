import { useLanguage } from '@/context/LanguageContext'
import { openFree, OPEN_FREE } from '@/config/pricing'

/**
 * 오픈 기간 무료 안내. variant: badge(배지만) | line(한 줄 안내) | both(배지+한 줄)
 * 법률 문서(한국어 고정)는 lang="ko" 로 고정해서 쓴다.
 */
export function OpenFreeNotice({ variant = 'both', lang, className = '' }) {
  const { language } = useLanguage()
  const c = lang === 'ko' ? OPEN_FREE.ko : openFree(language)
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {variant !== 'line' && (
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white">
          {c.badge}
        </span>
      )}
      {variant !== 'badge' && (
        <p className="text-xs text-muted-foreground text-center max-w-xl leading-relaxed">{c.notice}</p>
      )}
    </div>
  )
}

/** 법률 문서 맨 위 안내 상자 */
export function OpenFreeLegalBox() {
  return (
    <div className="not-prose mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
      {OPEN_FREE.ko.legal}
    </div>
  )
}
