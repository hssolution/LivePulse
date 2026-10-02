/**
 * 가입·로그인 뒤에 «원래 가려던 곳»으로 돌려보내기 위한 도우미.
 *
 * - 이메일 인증이 켜져 있으면 가입 직후 세션이 없어서 redirect 파라미터가 끊긴다.
 *   그래서 가려던 경로를 localStorage 에 잠시 적어 두고, 인증 뒤 처음 로그인된 화면에서 꺼내 쓴다.
 * - 사이트 안쪽 경로('/...')만 받는다. 바깥 주소로 보내는 값은 버린다.
 */
const KEY = 'livepulse_post_auth_redirect'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 인증 링크 유효 시간과 같게

/** 세션 만들기를 누른 사람이 거치는 경로 — 주최 신청(즉시 승인) 뒤 세션 만들기로 이어진다 */
export const START_SESSION_PATH = '/mypage?start=session'
export const SESSION_CREATE_PATH = '/partner/sessions/new'

/**
 * 사이트 안쪽 경로인지 확인한다.
 * @param {string} path
 * @returns {string} 안전하면 그대로, 아니면 빈 문자열
 */
export function safeInternalPath(path) {
  if (typeof path !== 'string') return ''
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return ''
  return path
}

export function savePostAuthRedirect(path) {
  const safe = safeInternalPath(path)
  if (!safe) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() }))
  } catch {
    // 저장 실패는 무시 (가려던 곳으로 못 돌아갈 뿐 가입·로그인은 된다)
  }
}

/**
 * 적어 둔 경로를 꺼내고 지운다. 없거나 오래됐으면 빈 문자열.
 * @returns {string}
 */
export function consumePostAuthRedirect() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return ''
    localStorage.removeItem(KEY)
    const { path, at } = JSON.parse(raw)
    if (!at || Date.now() - at > MAX_AGE_MS) return ''
    return safeInternalPath(path)
  } catch {
    return ''
  }
}

export function clearPostAuthRedirect() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
