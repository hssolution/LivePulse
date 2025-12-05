import { createContext, useContext, useEffect, useState } from 'react'

const PublicThemeContext = createContext({})

export const usePublicTheme = () => useContext(PublicThemeContext)

export const PublicThemeProvider = ({ children }) => {
  // Force dark mode
  const [theme] = useState('dark')

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove light class if present
    root.classList.remove('light')
    
    // Always add dark class
    root.classList.add('dark')
    
    // Set data-theme attribute for Theme D
    root.setAttribute('data-theme', 'D')
    
    // No longer saving to localStorage as we enforce dark mode
  }, [])

  // Toggle function is now a no-op or could be removed from context
  const toggleTheme = () => {}

  return (
    <PublicThemeContext.Provider value={{ theme, setTheme: () => {}, toggleTheme }}>
      {children}
    </PublicThemeContext.Provider>
  )
}

