import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'

/**
 * 약관·개인정보처리방침·환불정책 페이지 공통 레이아웃
 */
export function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <PublicHeader />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <header className="mb-10 pb-6 border-b">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
            {lastUpdated && (
              <p className="mt-2 text-sm text-slate-500">
                최종 업데이트: {lastUpdated}
              </p>
            )}
          </header>

          <article className="prose prose-slate dark:prose-invert max-w-none
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:font-bold
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold
            prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
            prose-ul:my-3 prose-li:my-1
            prose-table:text-sm">
            {children}
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

export default LegalLayout
