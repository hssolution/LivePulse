import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

const AdminThemeContext = createContext({})

export const useAdminTheme = () => useContext(AdminThemeContext)

export const AdminThemeProvider = ({ children, initialTheme }) => {
  const { user } = useAuth()
  // 초기 테마가 있으면 로딩 완료 상태로 시작
  const [loading, setLoading] = useState(!initialTheme)
  
  const [theme, setTheme] = useState(() => {
    if (initialTheme) return initialTheme
    
    return {
    mode: 'light',
    preset: 'theme-d',
    customColors: {},
    fontSize: 'medium'
    }
  })

  // Load theme from database (프로시저 사용)
  const loadTheme = useCallback(async () => {
    // 초기 테마가 있으면 DB 조회 스킵 (AppInitContext에서 이미 로드됨)
    if (initialTheme) {
      setLoading(false)
      return
    }

    // 유저가 없으면 스킵
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('sp_theme_q', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error loading theme:', error)
        setLoading(false)
        return
      }

      if (data) {
        setTheme({
          mode: data.mode || 'light',
          preset: data.preset || 'theme-d',
          customColors: data.custom_colors || {},
          fontSize: data.font_size || 'medium'
        })
        
        // If this is a new user with default theme, save it to DB
        if (!data.user_id) {
          await supabase.rpc('sp_theme_s', {
            p_user_id: user.id,
            p_mode: 'light',
            p_preset: 'theme-d',
            p_custom_colors: {},
            p_font_size: 'medium'
          })
        }
      }
    } catch (error) {
      console.error('Error in loadTheme:', error)
    } finally {
      setLoading(false)
    }
  }, [user, initialTheme])

  // Save theme to database (프로시저 사용)
  const saveTheme = useCallback(async (newTheme) => {
    if (!user) return

    try {
      const { error } = await supabase.rpc('sp_theme_s', {
        p_user_id: user.id,
        p_mode: newTheme.mode,
        p_preset: newTheme.preset,
        p_custom_colors: newTheme.customColors,
        p_font_size: newTheme.fontSize
      })

      if (error) {
        console.error('Error saving theme:', error)
      }
    } catch (error) {
      console.error('Error in saveTheme:', error)
    }
  }, [user])

  // Apply theme to DOM - useLayoutEffect to prevent flickering
  useLayoutEffect(() => {
    const root = window.document.documentElement
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark')
    
    // Add current theme mode
    root.classList.add(theme.mode)
    
    // Set data-theme attribute for preset
    root.setAttribute('data-theme', theme.preset)
    
    // Apply custom colors if any
    if (theme.customColors && Object.keys(theme.customColors).length > 0) {
      Object.entries(theme.customColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })
    }
    
    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.setProperty('font-size', fontSizeMap[theme.fontSize] || '16px')
  }, [theme])

  // Load theme on mount or user change
  useEffect(() => {
    // 초기 테마가 있으면 DB 조회 불필요 (이미 AppInitContext에서 로드됨)
    if (initialTheme) {
      setLoading(false)
      return
    }
    
    // 초기 테마가 없고 유저가 있으면 로드
    if (user) {
      loadTheme()
    }
  }, [loadTheme, initialTheme, user])

  const updateTheme = async (updates) => {
    setTheme(prev => ({ ...prev, ...updates }))
    await saveTheme({ ...theme, ...updates })
  }

  const toggleMode = () => {
    setTheme(prev => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }))
  }

  const setPreset = (preset) => {
    setTheme(prev => ({ ...prev, preset }))
  }

  const setCustomColors = (colors) => {
    setTheme(prev => ({ ...prev, customColors: colors }))
  }

  const setFontSize = (size) => {
    setTheme(prev => ({ ...prev, fontSize: size }))
  }

  const resetTheme = async () => {
    const defaultTheme = {
      mode: 'light',
      preset: 'theme-d',
      customColors: {},
      fontSize: 'medium'
    }
    setTheme(defaultTheme)
    await saveTheme(defaultTheme)
  }

  return (
    <AdminThemeContext.Provider value={{
      theme,
      loading,
      setTheme,
      updateTheme,
      toggleMode,
      setPreset,
      setCustomColors,
      setFontSize,
      resetTheme
    }}>
      {children}
    </AdminThemeContext.Provider>
  )
}
