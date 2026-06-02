import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, FileWarning } from 'lucide-react'

// pdf.js 워커 (pdfjs-dist v5)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * PDF 한 페이지 렌더.
 * - fit="width"   : 부모 너비에 맞춤 (높이는 비율대로, 길어지면 스크롤) — 모바일/청중용
 * - fit="contain" : 부모 너비·높이 안에 페이지 전체가 들어가도록 맞춤 — 송출/강연자 프로젝터용 (부모에 높이 필요)
 */
export default function PdfPage({ fileUrl, pageNumber = 1, onNumPages, fit = 'width', className = '', pageClassName = '' }) {
  const containerRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [aspect, setAspect] = useState(null) // page width / height

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setBox({ w: Math.floor(r.width), h: Math.floor(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 파일이 바뀌면 비율 재측정
  useEffect(() => {
    setAspect(null)
  }, [fileUrl])

  let renderWidth = box.w
  if (fit === 'contain' && aspect && box.h > 0) {
    renderWidth = Math.min(box.w, Math.floor(box.h * aspect))
  }

  return (
    <div
      ref={containerRef}
      className={`w-full ${fit === 'contain' ? 'h-full' : ''} flex items-center justify-center overflow-hidden ${className}`}
    >
      {fileUrl ? (
        <Document
          file={fileUrl}
          onLoadSuccess={(pdf) => onNumPages?.(pdf.numPages)}
          loading={<Loader2 className="h-8 w-8 animate-spin text-slate-400" />}
          error={
            <div className="flex flex-col items-center gap-2 text-slate-400 py-8">
              <FileWarning className="h-8 w-8" />
              <span className="text-sm">자료를 불러오지 못했습니다</span>
            </div>
          }
        >
          {renderWidth > 0 && (
            <Page
              pageNumber={pageNumber}
              width={renderWidth}
              onLoadSuccess={(p) => {
                const w = p.originalWidth || p.width || (p.view ? p.view[2] - p.view[0] : 0)
                const h = p.originalHeight || p.height || (p.view ? p.view[3] - p.view[1] : 0)
                if (w && h) setAspect(w / h)
              }}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className={pageClassName}
              loading=""
            />
          )}
        </Document>
      ) : (
        <div className="text-slate-400 text-sm py-8">표시할 자료가 없습니다</div>
      )}
    </div>
  )
}
