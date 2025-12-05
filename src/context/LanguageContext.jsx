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
export function LanguageProvider({ children, initialData }) {
  // 초기 데이터가 있으면 그것을 사용, 없으면 기존 로직대로 초기화
  const [language, setLanguageState] = useState(initialData?.initialLanguage || getInitialLanguage)
  const [translations, setTranslations] = useState(initialData?.translations || {})
  const [languages, setLanguages] = useState(initialData?.languages || [])
  const [translationsLoading, setTranslationsLoading] = useState(!initialData) // 초기 데이터가 있으면 로딩 완료 상태
  const [error, setError] = useState(null)
  const [user, setUser] = useState(initialData?.session?.user || null)
  const initialLoadDone = useRef(!!initialData)

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
   */
  const t = useCallback((key, params = {}) => {
    let value = translations[key]
    
    if (!value) {
      return key
    }
    
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
    // 초기 데이터가 있으면 초기 로드 스킵 (단, 이벤트 리스너는 등록해야 함)
    const init = async () => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

      console.log('[Language] Initial load started, current language:', language)
      
      loadLanguages()
      
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user || null
      setUser(currentUser)
      
      let langToLoad = language
      if (currentUser) {
        const userLang = await loadUserLanguage(currentUser.id)
        if (userLang && userLang !== language) {
          langToLoad = userLang
          setLanguageState(userLang)
          localStorage.setItem(STORAGE_KEY, userLang)
        }
      }
      
      console.log('[Language] Loading translations for:', langToLoad)
      await loadTranslations(langToLoad)
      console.log('[Language] Initial load completed')
    }
    
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null
        setUser(currentUser)

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

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export function useTranslation() {
  const { t, language, loading } = useLanguage()
  return { t, language, loading }
}

export default LanguageContext
