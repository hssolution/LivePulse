import { createContext, useContext, useEffect, useState } from 'react'

const PublicThemeContext = createContext({})

export const usePublicTheme = () => useContext(PublicThemeContext)

export const PublicThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('public-theme')
    if (stored) return stored
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return 'light'
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark')
    
    // Add current theme class
    root.classList.add(theme)
    
    // Set data-theme attribute for Theme D (default for public pages)
    root.setAttribute('data-theme', 'D')
    
    // Save to localStorage
    localStorage.setItem('public-theme', theme)
  }, [theme])

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem('public-theme')
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <PublicThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </PublicThemeContext.Provider>
  )
}

