import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { jwtDecode } from 'jwt-decode'
import { handleAuthError } from '@/utils/authCleanup'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userClaims, setUserClaims] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    /**
     * 토큰에서 커스텀 클레임(프로필 정보)을 추출하는 함수
     * @param {Object} session - Supabase 세션 객체
     */
    const extractClaims = (session) => {
      if (session?.access_token) {
        try {
          const decoded = jwtDecode(session.access_token)
          console.log('AuthContext: Decoded JWT', decoded)
          setUserClaims(decoded)
          
          // 프로필 정보를 별도로 추출하여 쉽게 접근 가능하도록 설정
          const profileData = {
            email: decoded.email,
            displayName: decoded.display_name,
            role: decoded.user_role,  // JWT에서 user_role로 저장됨
            userType: decoded.user_type,
            status: decoded.status,
            description: decoded.description
          }
          setProfile(profileData)
          console.log('AuthContext: Profile data', profileData)
        } catch (e) {
          console.error('Token decode error', e)
          setUserClaims(null)
          setProfile(null)
        }
      } else {
        setUserClaims(null)
        setProfile(null)
      }
    }

    /**
     * 초기 세션을 확인하고 사용자 정보를 설정하는 함수
     */
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // 세션 에러가 있으면 처리
        if (error) {
          console.warn('Session error:', error.message)
          
          // 손상된 토큰 에러인 경우 정리
          const wasCleared = handleAuthError(error)
          if (wasCleared) {
            // 정리 후 페이지 새로고침 (한 번만)
            if (!sessionStorage.getItem('auth_cleared')) {
              sessionStorage.setItem('auth_cleared', 'true')
              window.location.reload()
              return
            }
          }
          
          await supabase.auth.signOut({ scope: 'local' })
          setUser(null)
          setUserClaims(null)
          setProfile(null)
        } else {
          // 정상 로드 시 플래그 제거
          sessionStorage.removeItem('auth_cleared')
          setUser(session?.user ?? null)
          extractClaims(session)
        }
      } catch (error) {
        console.error('Session check error:', error)
        handleAuthError(error)
        try {
          await supabase.auth.signOut({ scope: 'local' })
        } catch (signOutError) {
          console.warn('SignOut error (ignored):', signOutError)
        }
        setUser(null)
        setUserClaims(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // 실시간 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      // 로그아웃 이벤트 처리
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserClaims(null)
        setProfile(null)
      } else {
        setUser(session?.user ?? null)
        extractClaims(session)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /**
   * 프로필 정보를 새로고침하는 함수
   * 프로필이 업데이트된 후 호출하여 최신 정보를 가져옴
   * @returns {boolean} 성공 여부
   */
  const refreshProfile = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.warn('Session refresh error:', error.message)
        return null
      }
      
      if (session?.access_token) {
        const decoded = jwtDecode(session.access_token)
        setUserClaims(decoded)
        setUser(session.user)
        const profileData = {
          email: decoded.email,
          displayName: decoded.display_name,
          role: decoded.user_role,  // JWT에서 user_role로 저장됨
          userType: decoded.user_type,
          status: decoded.status,
          description: decoded.description
        }
        setProfile(profileData)
        console.log('Profile refreshed:', profileData)
        return profileData
      }
      return null
    } catch (error) {
      console.error('Profile refresh error:', error)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userClaims, 
      profile, 
      loading,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
