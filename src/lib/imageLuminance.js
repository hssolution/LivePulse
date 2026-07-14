/**
 * 이미지 밝기 샘플링 → 자동 스크림(오버레이) 제안 (디자인 에디터 PRD E2)
 *
 * 히어로 배경 이미지를 16×16 canvas로 축소 샘플링해 평균 밝기를 구하고,
 * 흰색 텍스트가 항상 읽히는 오버레이 %를 제안한다.
 * CORS로 canvas가 오염되면 null 반환 — 호출부는 기본값(45)을 유지한다.
 */
export function suggestOverlay(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve(null), 4000)
    img.onload = () => {
      clearTimeout(timer)
      try {
        const c = document.createElement('canvas')
        c.width = 16
        c.height = 16
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, 16, 16)
        const { data } = ctx.getImageData(0, 0, 16, 16)
        let sum = 0
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        }
        const lum = sum / (data.length / 4) / 255 // 0(검정)~1(흰색)
        // 어두운 이미지는 스크림 약하게, 밝은 이미지는 강하게 (25~65%)
        resolve(Math.round(Math.min(65, Math.max(25, 20 + lum * 50))))
      } catch {
        resolve(null) // tainted canvas (CORS 미허용)
      }
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}
