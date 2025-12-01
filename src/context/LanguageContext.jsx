import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * 언어 컨텍스트
 * - 앱 전체에서 다국어 지원
 * - 로그인 사용자: DB에 언어 설정 저장
 * - 비로그인 사용자: localStorage에 저장
 * - 설정 없으면 브라우저 언어 기본값
 */

const LanguageContext = createContext(null)

// 지원 언어 코드
const SUPPORTED_LANGUAGES = ['ko', 'en']
const DEFAULT_LANGUAGE = 'ko'
const STORAGE_KEY = 'livepulse_language'

/**
 * 브라우저 언어 감지
 */
const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  
  const browserLang = navigator.language || navigator.userLanguage
  const langCode = browserLang?.split('-')[0] // 'ko-KR' -> 'ko'
  
  // 지원하는 언어인지 확인
  if (SUPPORTED_LANGUAGES.includes(langCode)) {
    return langCode
  }
  return DEFAULT_LANGUAGE
}

/**
 * 초기 언어 결정
 * 1. localStorage (비로그인 시 저장된 값)
 * 2. 브라우저 언어
 */
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored
    }
  }
  return getBrowserLanguage()
}

/**
 * LanguageProvider
 * 앱 최상위에서 언어 상태 관리
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)
  const [translations, setTranslations] = useState({})
  const [languages, setLanguages] = useState([])
  const [translationsLoading, setTranslationsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const initialLoadDone = useRef(false)

  /**
   * 지원 언어 목록 로드
   */
  const loadLanguages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setLanguages(data || [])
    } catch (err) {
      console.error('Error loading languages:', err)
    }
  }, [])

  /**
   * 번역 데이터 로드
   */
  const loadTranslations = useCallback(async (langCode) => {
    try {
      setTranslationsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('get_translations', { lang_code: langCode })

      if (error) throw error
      
      setTranslations(data || {})
    } catch (err) {
      console.error('Error loading translations:', err)
      setError(err.message)
      setTranslations({})
    } finally {
      setTranslationsLoading(false)
    }
  }, [])

  /**
   * 사용자 언어 설정 로드 (DB에서)
   */
  const loadUserLanguage = useCallback(async (userId) => {
    try {
      // RPC 대신 직접 쿼리 (캐시 문제 방지)
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', userId)
        .single()

      if (error) throw error
      
      const lang = data?.preferred_language
      if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
        return lang
      }
      return null
    } catch (err) {
      console.error('Error loading user language:', err)
      return null
    }
  }, [])

  /**
   * 사용자 언어 설정 저장 (DB에)
   */
  const saveUserLanguage = useCallback(async (langCode) => {
    if (!user) return false
    
    try {
      // RPC 대신 직접 업데이트 (더 확실함)
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: langCode })
        .eq('id', user.id)

      if (error) throw error
      console.log('[Language] DB update successful')
      return true
    } catch (err) {
      console.error('Error saving user language:', err)
      return false
    }
  }, [user])

  /**
   * 언어 변경
   */
  const setLanguage = useCallback(async (langCode) => {
    if (!SUPPORTED_LANGUAGES.includes(langCode)) return
    
    console.log('[Language] Changing language to:', langCode, 'User:', user?.email)
    
    setLanguageState(langCode)
    localStorage.setItem(STORAGE_KEY, langCode)
    
    // 로그인 상태면 DB에도 저장
    if (user) {
      console.log('[Language] Saving to DB...')
      await saveUserLanguage(langCode)
      console.log('[Language] Saved to DB')
    }
    
    await loadTranslations(langCode)
    console.log('[Language] Translations loaded')
  }, [user, saveUserLanguage, loadTranslations])

  /**
   * 번역 함수
   * - 번역이 없으면 키를 그대로 반환 (앱 즉시 렌더링)
   * - 번역이 로드되면 자동으로 업데이트됨
   */
  const t = useCallback((key, params = {}) => {
    let value = translations[key]
    
    if (!value) {
      // 번역이 없으면 키를 그대로 반환 (경고 없음)
      return key
    }
    
    // 파라미터 치환
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        const regex = new RegExp(`\\{${paramKey}\\}`, 'g')
        value = value.replace(regex, params[paramKey])
      })
    }
    
    return value
  }, [translations])

  /**
   * 번역 키 존재 여부 확인
   */
  const hasTranslation = useCallback((key) => {
    return key in translations
  }, [translations])

  /**
   * 초기 로드 및 인증 상태 변경 감지
   */
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    const init = async () => {
      console.log('[Language] Initial load started, current language:', language)
      
      // 언어 목록 로드
      loadLanguages()
      
      // 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user || null
      setUser(currentUser)
      console.log('[Language] User:', currentUser?.email || 'Not logged in')
      
      // 로그인된 사용자면 DB에서 언어 설정 로드
      let langToLoad = language
      if (currentUser) {
        const userLang = await loadUserLanguage(currentUser.id)
        console.log('[Language] User language from DB:', userLang)
        if (userLang && userLang !== language) {
          langToLoad = userLang
          setLanguageState(userLang)
          localStorage.setItem(STORAGE_KEY, userLang)
        }
      }
      
      // 번역 로드
      console.log('[Language] Loading translations for:', langToLoad)
      await loadTranslations(langToLoad)
      console.log('[Language] Initial load completed')
    }
    
    init()

    // 인증 상태 변경 리스너 (로그인/로그아웃 시)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null
        setUser(currentUser)

        // 새로 로그인한 경우에만 언어 설정 다시 로드
        if (currentUser && event === 'SIGNED_IN') {
          const userLang = await loadUserLanguage(currentUser.id)
          if (userLang && userLang !== language) {
            setLanguageState(userLang)
            localStorage.setItem(STORAGE_KEY, userLang)
            await loadTranslations(userLang)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    language,
    setLanguage,
    languages,
    translations,
    loading: translationsLoading,
    translationsLoading,
    error,
    t,
    hasTranslation,
    reload: () => loadTranslations(language),
    isLoggedIn: !!user
  }

  // 블로킹 없이 바로 렌더링 (번역이 로드되면 자동으로 업데이트됨)
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * 언어 컨텍스트 사용 훅
 */
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

/**
 * 번역 훅 (간편 사용)
 */
export function useTranslation() {
  const { t, language, loading } = useLanguage()
  return { t, language, loading }
}

export default LanguageContext
