/**
 * 인증 관련 정리 유틸리티
 * 오래되거나 손상된 토큰을 정리하는 함수들
 */

/**
 * localStorage에서 모든 Supabase 인증 데이터를 삭제
 * 오래된 토큰이나 손상된 세션으로 인한 에러를 해결할 때 사용
 */
export const clearSupabaseAuth = () => {
  try {
    // Supabase 관련 모든 localStorage 키 찾기
    const keys = Object.keys(localStorage)
    const supabaseKeys = keys.filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase')
    )
    
    // 모든 Supabase 키 삭제
    supabaseKeys.forEach(key => {
      localStorage.removeItem(key)
      console.log(`Cleared: ${key}`)
    })
    
    console.log('✅ Supabase auth data cleared successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to clear auth data:', error)
    return false
  }
}

/**
 * 손상된 토큰을 감지하고 자동으로 정리
 * @param {Error} error - Supabase 에러 객체
 * @returns {boolean} 정리 작업을 수행했는지 여부
 */
export const handleAuthError = (error) => {
  // Refresh Token 관련 에러
  const refreshTokenErrors = [
    'Invalid Refresh Token',
    'Refresh Token Not Found',
    'refresh_token_not_found',
    'invalid_grant'
  ]
  
  const errorMessage = error?.message || error?.error_description || ''
  const shouldClear = refreshTokenErrors.some(msg => 
    errorMessage.includes(msg)
  )
  
  if (shouldClear) {
    console.warn('🔧 Detected invalid token, clearing auth data...')
    clearSupabaseAuth()
    return true
  }
  
  return false
}

/**
 * 개발 모드에서 수동으로 인증 데이터를 정리하는 함수
 * 브라우저 콘솔에서 window.clearAuth() 로 호출 가능
 */
if (typeof window !== 'undefined') {
  window.clearAuth = clearSupabaseAuth
  console.log('💡 Tip: 인증 문제가 있으면 콘솔에서 window.clearAuth() 를 실행해보세요')
}

