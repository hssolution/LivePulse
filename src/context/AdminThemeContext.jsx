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

  // Load theme from database
  const loadTheme = useCallback(async () => {
    // 초기 테마가 있고 아직 한 번도 로드 안 했으면 스킵 가능하지만,
    // 최신 상태 보장을 위해 로드하되 로딩 스피너는 안 띄움
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_theme_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
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
      } else {
        // Create default theme settings using upsert to avoid duplicate key errors
        const { error: insertError } = await supabase
          .from('user_theme_settings')
          .upsert({
            user_id: user.id,
            mode: 'light',
            preset: 'theme-d',
            custom_colors: {},
            font_size: 'medium'
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: true
          })

        if (insertError && insertError.code !== '23505') {
          // 23505 = duplicate key error, ignore it
          console.error('Error creating default theme:', insertError)
        }
      }
    } catch (error) {
      console.error('Error in loadTheme:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Save theme to database (with debounce)
  const saveTheme = useCallback(async (newTheme) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_theme_settings')
        .upsert({
          user_id: user.id,
          mode: newTheme.mode,
          preset: newTheme.preset,
          custom_colors: newTheme.customColors,
          font_size: newTheme.fontSize
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
    // 초기 데이터가 없거나 유저가 바뀌었을 때만 로드
    if (!initialTheme || (user && initialTheme && initialTheme.userId !== user.id)) {
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
