import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * PreviewFrame — 장면을 iframe "뷰포트" 안에 portal로 렌더한다.
 *
 * 왜 iframe인가: 청중 화면의 반응형(md: 등 미디어 쿼리)은 브라우저 창
 * 크기를 기준으로 동작한다. 일반 div 프레임에 그리면 데스크톱 창에서
 * 모바일 프레임인데도 데스크톱 레이아웃(2단 그리드)이 적용돼 깨진다.
 * iframe은 자체 뷰포트를 가지므로 프레임 너비 = 뷰포트 너비가 되고,
 * portal 렌더라서 저장 없이 즉시 반영(동일 렌더러)도 유지된다.
 * 부모 문서의 스타일시트(<style>/<link>)를 복제해 Tailwind를 공유한다.
 */
export default function PreviewFrame({ children, className, style }) {
  const [iframeEl, setIframeEl] = useState(null)
  const [mountNode, setMountNode] = useState(null)

  useEffect(() => {
    if (!iframeEl) return
    const doc = iframeEl.contentDocument
    if (!doc) return
    doc.open()
    doc.write('<!doctype html><html class="light"><head></head><body style="margin:0;background:#fff"></body></html>')
    doc.close()
    // 부모 문서의 스타일을 복제 (Tailwind·폰트) — 청중 화면과 동일한 시각 결과
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      doc.head.appendChild(node.cloneNode(true))
    })
    // 자체 완결형 스크롤바 스타일 — 앱 CSS 변수에 의존하지 않아 다크/라이트 어디서든
    // 얇고 은은한 오버레이 느낌. 기본 굵은 흰색 스크롤바를 대체한다.
    // (webkit thumb에 투명 테두리+content-box로 실제 4px 두께 + 트랙 위에 떠 있는 느낌)
    const sb = doc.createElement('style')
    sb.textContent = `
      html { scrollbar-width: thin; scrollbar-color: rgba(120,125,140,0.28) transparent; }
      ::-webkit-scrollbar { width: 10px; height: 10px; background: transparent; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: rgba(120,125,140,0.28);
        border-radius: 9999px;
        border: 3px solid transparent;
        background-clip: content-box;
      }
      ::-webkit-scrollbar-thumb:hover { background: rgba(120,125,140,0.55); background-clip: content-box; }
      ::-webkit-scrollbar-corner { background: transparent; }
    `
    doc.head.appendChild(sb)
    setMountNode(doc.body)
    return () => setMountNode(null)
  }, [iframeEl])

  return (
    <iframe ref={setIframeEl} title="청중 화면 미리보기" className={className} style={style}>
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  )
}
