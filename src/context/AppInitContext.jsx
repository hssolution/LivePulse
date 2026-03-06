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
          
          // 초기 언어 결정 (유저 설정 > 로컬 스토리지 > 브라우저 > 기본값)
          let langCode = 'ko'
          
          // 관리자 테마 설정 (로그인 시)
          let adminTheme = null
          let languages = []
          let translations = {}

          if (session?.user) {
            // 단일 RPC로 모든 초기 데이터 로드
            const { data: initData } = await supabase.rpc('sp_init_q', {
              p_user_id: session.user.id,
              p_language_code: langCode // 기본값으로 먼저 호출
            })
            
            if (initData) {
              languages = initData.languages || []
              translations = initData.translations || {}
              
              // 유저 선호 언어가 있으면 번역 다시 로드
              if (initData.userProfile?.preferred_language && initData.userProfile.preferred_language !== langCode) {
                langCode = initData.userProfile.preferred_language
                const { data: userTranslations } = await supabase.rpc('get_translations', { lang_code: langCode })
                translations = userTranslations || {}
              }
              
              // 테마 설정
              if (initData.themeSettings) {
                adminTheme = {
                  mode: initData.themeSettings.mode || 'light',
                  preset: initData.themeSettings.preset || 'theme-d',
                  customColors: initData.themeSettings.custom_colors || {},
                  fontSize: initData.themeSettings.font_size || 'medium',
                  userId: session.user.id
                }
              }
            }
          } else {
            // 비로그인 사용자: 로컬 스토리지에서 언어 가져오기
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('livepulse_language')
              if (stored) langCode = stored
            }
            
            // 단일 RPC로 초기 데이터 로드 (user_id 없이)
            const { data: initData } = await supabase.rpc('sp_init_q', {
              p_user_id: null,
              p_language_code: langCode
            })
            
            if (initData) {
              languages = initData.languages || []
              translations = initData.translations || {}
            }
          }

          return {
            session,
            languages,
            translations,
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
