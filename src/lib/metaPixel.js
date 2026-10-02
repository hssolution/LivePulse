/**
 * 메타 픽셀 — 광고가 가입·문의로 이어졌는지 메타가 셀 수 있게 한다.
 *
 * - env VITE_META_PIXEL_ID 가 5~20자리 숫자이고 호스트가 운영 도메인일 때만 켠다.
 *   값이 없으면 fbevents.js 요청은 0 이다(빌드 때 박히므로 바꾸면 다시 빌드).
 * - 공개 화면에서만 PageView 를 보낸다(App.jsx 의 MetaPixelTracker 가 허용 목록으로 호출).
 *   disablePushState 로 자동 PageView 를 꺼서, 로그인 뒤 화면 주소가 메타로 새지 않게 한다.
 * - 개인정보(이메일·이름 등)는 params 에 넣지 않는다.
 * - 개인정보처리방침 제9조(쿠키)가 이 픽셀을 적고 있다 — 걷거나 넓히면 그 글도 고친다.
 */

const PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID ?? '').trim()
const PROD_HOST = 'livepulse.noligo.co.kr'

/** 켤 수 있는가 — ID 형식 + 운영 호스트 */
function isEnabled() {
  return (
    /^[0-9]{5,20}$/.test(PIXEL_ID) &&
    typeof window !== 'undefined' &&
    window.location.hostname === PROD_HOST
  )
}

let initialized = false

function ensureFbq() {
  if (window.fbq) return window.fbq
  const n = function (...args) {
    if (n.callMethod) n.callMethod(...args)
    else n.queue.push(args)
  }
  n.queue = []
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.disablePushState = true
  window.fbq = n
  if (!window._fbq) window._fbq = n
  return n
}

/** 스크립트를 한 번만 불러온다. 켤 수 없으면 아무것도 하지 않는다. */
export function initMetaPixel() {
  if (!isEnabled() || initialized) return
  initialized = true
  const fbq = ensureFbq()
  fbq('init', PIXEL_ID)
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
}

export function trackMetaPageView() {
  if (!isEnabled()) return
  initMetaPixel()
  window.fbq('track', 'PageView')
}

export function trackMetaEvent(name, params) {
  if (!isEnabled() || !initialized || typeof window.fbq !== 'function') return
  if (params) window.fbq('track', name, params)
  else window.fbq('track', name)
}

/** PageView 를 보내도 되는 공개 경로(로그인 뒤·세션 참여 화면은 제외) */
export function isMetaPublicPath(pathname) {
  return (
    pathname === '/' ||
    pathname === '/signup' ||
    pathname.startsWith('/service/') ||
    pathname.startsWith('/legal/')
  )
}
