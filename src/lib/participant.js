/**
 * 참가자 토큰 (PRD §3.2 — 참가자 신원 모델)
 *
 * 세션 코드별 토큰을 localStorage에 발급·보존한다.
 * - 정보 수집 입장: join RPC 응답의 참가자 id를 setParticipantToken으로 저장
 * - 익명/미저장 상태: 클라이언트 UUID를 발급해 동일 키에 저장
 * - 기존 전역 'device_id'(좋아요용)가 있으면 최초 1회 승계해 연속성 유지
 *
 * 주의: 토큰은 "내 질문 표시·재입장 편의"용 편의 식별자일 뿐,
 *       참여 무결성(1인 1표)을 보장하는 수단이 아니다.
 */

const keyFor = (code) => `lp_participant:${code}`

/** 세션 코드별 참가자 토큰 조회(없으면 발급) */
export function getParticipantToken(code) {
  if (!code) return null
  try {
    let token = localStorage.getItem(keyFor(code))
    if (!token) {
      // 기존 전역 식별자 승계 (구 좋아요/투표 기록과의 연속성 — device_id 우선)
      token =
        localStorage.getItem('device_id') ||
        localStorage.getItem('anonymous_poll_id') ||
        crypto.randomUUID()
      localStorage.setItem(keyFor(code), token)
    }
    return token
  } catch {
    // localStorage 불가 환경(시크릿 모드 일부 등) — 세션 메모리 폴백
    if (!window.__lpParticipantFallback) window.__lpParticipantFallback = {}
    if (!window.__lpParticipantFallback[code]) {
      window.__lpParticipantFallback[code] = crypto.randomUUID()
    }
    return window.__lpParticipantFallback[code]
  }
}

const joinedKey = (code) => `lp_joined:${code}`

/** 입장 완료 표시 — 재입장 시 이름 입력 생략의 근거 (PRD §3.2) */
export function markJoined(code) {
  if (!code) return
  try {
    localStorage.setItem(joinedKey(code), '1')
  } catch { /* storage 불가 환경 무시 */ }
}

/** 이 세션에 입장한 적이 있는가 */
export function hasJoined(code) {
  if (!code) return false
  try {
    return localStorage.getItem(joinedKey(code)) === '1'
  } catch {
    return false
  }
}

/**
 * join RPC가 참가자 id를 반환하면 토큰으로 저장.
 * 이미 발급된 토큰이 있으면 유지 — 좋아요·투표 기록의 연속성이
 * 서버 id 정합성보다 우선한다 (리뷰 S2: 키 교체로 인한 기록 단절 방지).
 */
export function setParticipantToken(code, token) {
  if (!code || !token) return
  try {
    if (!localStorage.getItem(keyFor(code))) {
      localStorage.setItem(keyFor(code), String(token))
    }
  } catch {
    if (!window.__lpParticipantFallback) window.__lpParticipantFallback = {}
    if (!window.__lpParticipantFallback[code]) {
      window.__lpParticipantFallback[code] = String(token)
    }
  }
}
