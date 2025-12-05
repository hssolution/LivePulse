import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import InitialLoading from '@/components/ui/InitialLoading'

const AppInitContext = createContext(null)

/**
 * 앱 초기화 컨텍스트
 * 앱 실행에 필요한 필수 데이터(세션, 언어, 번역 등)를 미리 로드하고
 * 준비가 완료되면 자식 컴포넌트를 렌더링합니다.
 */
export function AppInitProvider({ children }) {
  const [isReady, setIsReady] = useState(false)
  const [initData, setInitData] = useState({
    languages: [],
    translations: {},
    session: null,
    initialLanguage: 'ko',
    adminTheme: null // 관리자 테마 초기값
  })
  
  // 초기화 실행 여부를 추적하는 Ref (Strict Mode 중복 실행 방지)
  const isInitialized = useRef(false)

  useEffect(() => {
    // 이미 초기화가 시작되었으면 중단
    if (isInitialized.current) return
    isInitialized.current = true

    // 초기 로딩 시 transition 방지
    if (typeof window !== 'undefined') {
      document.body.classList.add('preload')
    }

    const initialize = async () => {
      try {
        // 1. 최소 로딩 시간 (너무 짧으면 깜빡임처럼 보이므로 500ms만 유지, 데이터가 늦으면 데이터 기다림)
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 500))
        
        // 2. 데이터 로딩 시작
        const loadData = async () => {
          // 세션 체크
          const { data: { session } } = await supabase.auth.getSession()
          
          // 언어 목록 로드
          const { data: languages } = await supabase
            .from('languages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order')

          // 초기 언어 결정 (유저 설정 > 로컬 스토리지 > 브라우저 > 기본값)
          let langCode = 'ko'
          
          // 관리자 테마 설정 (로그인 시)
          let adminTheme = null

          if (session?.user) {
            // 병렬로 유저 관련 데이터 로드
            const [profileResult, themeResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('preferred_language')
                .eq('id', session.user.id)
                .single(),
              supabase
                .from('user_theme_settings')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle()
            ])
            
            if (profileResult.data?.preferred_language) {
              langCode = profileResult.data.preferred_language
            }

            if (themeResult.data) {
              adminTheme = {
                mode: themeResult.data.mode || 'light',
                preset: themeResult.data.preset || 'theme-d',
                customColors: themeResult.data.custom_colors || {},
                fontSize: themeResult.data.font_size || 'medium'
              }
            }
          } 
          
          // 2순위: 로컬 스토리지 (비로그인)
          if (!session?.user && typeof window !== 'undefined') {
            const stored = localStorage.getItem('livepulse_language')
            if (stored) langCode = stored
          }

          // 번역 데이터 로드
          const { data: translations } = await supabase
            .rpc('get_translations', { lang_code: langCode })

          return {
            session,
            languages: languages || [],
            translations: translations || {},
            initialLanguage: langCode,
            adminTheme
          }
        }

        // 로딩과 데이터 페칭 병렬 실행
        const [_, data] = await Promise.all([minLoadingTime, loadData()])
        
        // 중요: 테마를 DOM에 즉시 적용 (Admin 테마가 있다면)
        // 트랜지션 없이 즉시 적용되므로 깜빡임 방지
        if (data.adminTheme) {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(data.adminTheme.mode)
          root.setAttribute('data-theme', data.adminTheme.preset)
          
          if (data.adminTheme.customColors) {
            Object.entries(data.adminTheme.customColors).forEach(([key, value]) => {
              root.style.setProperty(`--${key}`, value)
            })
          }
          
          const fontSizeMap = {
            small: '14px',
            medium: '16px',
            large: '18px'
          }
          root.style.setProperty('font-size', fontSizeMap[data.adminTheme.fontSize] || '16px')
        }

        setInitData(data)
        setIsReady(true)
        
        // 초기화 완료 후 약간의 지연 뒤에 트랜지션 복구
        // (브라우저가 스타일 적용을 완료할 시간을 줌)
        setTimeout(() => {
          document.body.classList.remove('preload')
        }, 100)
        
      } catch (error) {
        console.error('App initialization failed:', error)
        setIsReady(true)
        document.body.classList.remove('preload')
      }
    }

    initialize()
  }, [])

  if (!isReady) {
    return <InitialLoading />
  }

  return (
    <AppInitContext.Provider value={initData}>
      {children}
    </AppInitContext.Provider>
  )
}

export const useAppInit = () => useContext(AppInitContext)
