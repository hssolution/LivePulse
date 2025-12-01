/**
 * 로그인 서비스 - 로그인 로그 기록, 중복 로그인 방지, 브루트포스 방지
 */
import { supabase } from './supabase'

/**
 * 기기 정보 파싱
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent
  
  // 브라우저 감지
  let browser = 'Unknown'
  if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'
  else if (ua.includes('Opera')) browser = 'Opera'
  
  // OS 감지
  let os = 'Unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  
  // 디바이스 타입
  let device = 'Desktop'
  if (/Mobile|Android|iPhone|iPad/.test(ua)) {
    device = /iPad|Tablet/.test(ua) ? 'Tablet' : 'Mobile'
  }
  
  return {
    browser,
    os,
    device,
    userAgent: ua
  }
}

/**
 * 클라이언트 IP 조회 (외부 서비스 사용)
 */
export const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return null
  }
}

/**
 * 로그인 시도 확인 (잠금 상태 체크)
 * @param {string} email - 이메일
 * @returns {Promise<{isLocked: boolean, lockedUntil: Date|null, attemptCount: number, remainingSeconds: number}>}
 */
export const checkLoginAttempt = async (email) => {
  const ip = await getClientIP() || 'unknown'
  
  const { data, error } = await supabase
    .rpc('check_login_attempt', {
      p_email: email,
      p_ip_address: ip
    })
  
  if (error) {
    console.error('Error checking login attempt:', error)
    return { isLocked: false, lockedUntil: null, attemptCount: 0, remainingSeconds: 0 }
  }
  
  const result = data?.[0] || { is_locked: false, locked_until: null, attempt_count: 0, remaining_seconds: 0 }
  
  return {
    isLocked: result.is_locked,
    lockedUntil: result.locked_until ? new Date(result.locked_until) : null,
    attemptCount: result.attempt_count,
    remainingSeconds: result.remaining_seconds
  }
}

/**
 * 로그인 실패 기록
 * @param {string} email - 이메일
 * @returns {Promise<{isLocked: boolean, lockedUntil: Date|null, attemptCount: number}>}
 */
export const recordLoginFailure = async (email) => {
  const ip = await getClientIP() || 'unknown'
  
  const { data, error } = await supabase
    .rpc('record_login_failure', {
      p_email: email,
      p_ip_address: ip
    })
  
  if (error) {
    console.error('Error recording login failure:', error)
    return { isLocked: false, lockedUntil: null, attemptCount: 0 }
  }
  
  const result = data?.[0] || { is_locked: false, locked_until: null, attempt_count: 0 }
  
  return {
    isLocked: result.is_locked,
    lockedUntil: result.locked_until ? new Date(result.locked_until) : null,
    attemptCount: result.attempt_count
  }
}

/**
 * 로그인 시도 초기화 (로그인 성공 시)
 * @param {string} email - 이메일
 */
export const clearLoginAttempts = async (email) => {
  const ip = await getClientIP() || 'unknown'
  
  await supabase.rpc('clear_login_attempts', {
    p_email: email,
    p_ip_address: ip
  })
}

/**
 * 로그인 이벤트 로그 기록
 * @param {string} email - 이메일
 * @param {string} eventType - 이벤트 타입 (login_success, login_failed, logout, forced_logout)
 * @param {string|null} failureReason - 실패 사유
 * @param {string|null} sessionId - 세션 ID
 */
export const logLoginEvent = async (email, eventType, failureReason = null, sessionId = null) => {
  const ip = await getClientIP()
  const deviceInfo = getDeviceInfo()
  
  const { error } = await supabase.rpc('log_login_event', {
    p_email: email,
    p_event_type: eventType,
    p_failure_reason: failureReason,
    p_ip_address: ip,
    p_user_agent: deviceInfo.userAgent,
    p_device_info: {
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device: deviceInfo.device
    },
    p_session_id: sessionId
  })
  
  if (error) {
    console.error('Error logging login event:', error)
  }
}

/**
 * 세션 등록 (중복 로그인 처리)
 * @param {string} userId - 사용자 ID
 * @param {string} sessionToken - 세션 토큰
 * @returns {Promise<{kickedSessions: number, sessionId: string|null}>}
 */
export const registerSession = async (userId, sessionToken) => {
  const ip = await getClientIP()
  const deviceInfo = getDeviceInfo()
  
  const { data, error } = await supabase.rpc('register_session', {
    p_user_id: userId,
    p_session_token: sessionToken,
    p_ip_address: ip,
    p_user_agent: deviceInfo.userAgent,
    p_device_info: {
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device: deviceInfo.device
    }
  })
  
  if (error) {
    console.error('Error registering session:', error)
    return { kickedSessions: 0, sessionId: null }
  }
  
  const result = data?.[0] || { kicked_sessions: 0, session_id: null }
  
  return {
    kickedSessions: result.kicked_sessions,
    sessionId: result.session_id
  }
}

/**
 * 세션 활동 업데이트
 * @param {string} sessionToken - 세션 토큰
 */
export const updateSessionActivity = async (sessionToken) => {
  await supabase.rpc('update_session_activity', {
    p_session_token: sessionToken
  })
}

/**
 * 세션 종료 (로그아웃)
 * @param {string} sessionToken - 세션 토큰
 */
export const endSession = async (sessionToken) => {
  const { error } = await supabase.rpc('end_session', {
    p_session_token: sessionToken
  })
  
  if (error) {
    console.error('Error ending session:', error)
  }
}

/**
 * Supabase Auth 에러를 실패 사유로 변환
 * @param {Object} error - Supabase Auth 에러
 * @returns {string} 실패 사유
 */
export const getFailureReason = (error) => {
  if (!error) return null
  
  const message = error.message?.toLowerCase() || ''
  const code = error.code || ''
  
  if (message.includes('invalid login credentials') || message.includes('invalid password')) {
    return 'invalid_password'
  }
  if (message.includes('user not found') || code === 'user_not_found') {
    return 'user_not_found'
  }
  if (message.includes('email not confirmed')) {
    return 'email_not_confirmed'
  }
  if (message.includes('user disabled') || message.includes('user banned')) {
    return 'account_disabled'
  }
  if (message.includes('too many requests')) {
    return 'too_many_requests'
  }
  
  return 'unknown_error'
}

/**
 * 세션 토큰 저장/조회 (localStorage)
 */
const SESSION_TOKEN_KEY = 'app_session_token'

export const saveSessionToken = (token) => {
  localStorage.setItem(SESSION_TOKEN_KEY, token)
}

export const getSessionToken = () => {
  return localStorage.getItem(SESSION_TOKEN_KEY)
}

export const removeSessionToken = () => {
  localStorage.removeItem(SESSION_TOKEN_KEY)
}

/**
 * 새 세션 토큰 생성
 */
export const generateSessionToken = () => {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
}

