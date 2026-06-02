import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const AppInitContext = createContext(null)

const STORAGE_LANG = 'livepulse_language'
const STORAGE_THEME = 'livepulse_admin_theme_cache'
const SUPPORTED_LANGUAGES = ['ko', 'en']
const FONT_SIZE_MAP = { small: '14px', medium: '16px', large: '18px' }

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'ko'
  const stored = localStorage.getItem(STORAGE_LANG)
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored
  const browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0]
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'ko'
}

function getCachedAdminTheme() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_THEME)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function applyThemeToDom(theme) {
  if (!theme || typeof window === 'undefined') return
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme.mode || 'light')
  root.setAttribute('data-theme', theme.preset || 'theme-d')
  if (theme.customColors) {
    Object.entries(theme.customColors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }
  root.style.setProperty('font-size', FONT_SIZE_MAP[theme.fontSize] || '16px')
}

/**
 * 앱 초기화 컨텍스트
 * - 초기값은 모두 동기적으로 계산 (localStorage 캐시 활용)
 * - 세션/테마 갱신은 백그라운드에서 진행되어 첫 렌더를 막지 않음
 */
export function AppInitProvider({ children }) {
  const [initData, setInitData] = useState(() => {
    const cachedTheme = getCachedAdminTheme()
    applyThemeToDom(cachedTheme)
    return {
      session: null,
      initialLanguage: getInitialLanguage(),
      adminTheme: cachedTheme,
    }
  })

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    let cancelled = false

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        if (!session?.user) {
          setInitData(prev => (prev.session === null ? prev : { ...prev, session: null }))
          return
        }

        const langCode = getInitialLanguage()
        const { data } = await supabase.rpc('sp_init_q', {
          p_user_id: session.user.id,
          p_language_code: langCode,
        })
        if (cancelled) return

        let adminTheme = null
        if (data?.themeSettings) {
          adminTheme = {
            mode: data.themeSettings.mode || 'light',
            preset: data.themeSettings.preset || 'theme-d',
            customColors: data.themeSettings.custom_colors || {},
            fontSize: data.themeSettings.font_size || 'medium',
            userId: session.user.id,
          }
          applyThemeToDom(adminTheme)
          try {
            localStorage.setItem(STORAGE_THEME, JSON.stringify(adminTheme))
          } catch {
            // 저장 실패는 치명적이지 않음
          }
        }

        setInitData(prev => ({ ...prev, session, adminTheme: adminTheme ?? prev.adminTheme }))
      } catch (error) {
        console.warn('Background init failed (non-fatal):', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppInitContext.Provider value={initData}>
      {children}
    </AppInitContext.Provider>
  )
}

export const useAppInit = () => useContext(AppInitContext)
