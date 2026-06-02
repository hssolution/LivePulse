import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import koTranslations from '@/locales/ko.json'
import enTranslations from '@/locales/en.json'

/**
 * 언어 컨텍스트 (프론트엔드 JSON 기반)
 * - 번역 데이터는 src/locales/*.json 에서 정적으로 import
 * - 사용자 선택 언어는 localStorage 에 저장
 * - 비로그인/로그인 모두 동일하게 동작 (DB 의존 없음)
 */

const LanguageContext = createContext(null)

const SUPPORTED_LANGUAGES = ['ko', 'en']
const DEFAULT_LANGUAGE = 'ko'
const STORAGE_KEY = 'livepulse_language'

const BUNDLES = {
  ko: koTranslations,
  en: enTranslations,
}

const LANGUAGE_META = [
  { code: 'ko', name: 'Korean', native_name: '한국어', is_default: true, is_active: true, sort_order: 1 },
  { code: 'en', name: 'English', native_name: 'English', is_default: false, is_active: true, sort_order: 2 },
]

const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const browserLang = navigator.language || navigator.userLanguage
  const langCode = browserLang?.split('-')[0]
  return SUPPORTED_LANGUAGES.includes(langCode) ? langCode : DEFAULT_LANGUAGE
}

const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored
    }
  }
  return getBrowserLanguage()
}

export function LanguageProvider({ children, initialData }) {
  const [language, setLanguageState] = useState(
    initialData?.initialLanguage && SUPPORTED_LANGUAGES.includes(initialData.initialLanguage)
      ? initialData.initialLanguage
      : getInitialLanguage
  )

  const translations = BUNDLES[language] || BUNDLES[DEFAULT_LANGUAGE]

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  const setLanguage = useCallback((langCode) => {
    if (!SUPPORTED_LANGUAGES.includes(langCode)) return
    setLanguageState(langCode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, langCode)
    }
  }, [])

  const t = useCallback((key, paramsOrFallback) => {
    // Overloads:
    //   t(key)
    //   t(key, 'fallback string')        // used when key missing
    //   t(key, { name: 'foo', count: 3 }) // substitutes {name}/{count} in the translation
    const isFallbackString = typeof paramsOrFallback === 'string'
    const params = !isFallbackString && paramsOrFallback ? paramsOrFallback : null

    let value = translations[key]
    if (value === undefined || value === null) {
      return isFallbackString ? paramsOrFallback : key
    }
    if (params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        const regex = new RegExp(`\\{${paramKey}\\}`, 'g')
        value = value.replace(regex, params[paramKey])
      })
    }
    return value
  }, [translations])

  const hasTranslation = useCallback((key) => key in translations, [translations])

  const value = {
    language,
    setLanguage,
    languages: LANGUAGE_META,
    translations,
    loading: false,
    translationsLoading: false,
    error: null,
    t,
    hasTranslation,
    reload: () => {},
    isLoggedIn: false,
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
