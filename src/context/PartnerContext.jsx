import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

/**
 * PartnerContext
 *
 * 파트너 정보를 전역적으로 관리하여 중복 DB 조회를 방지합니다.
 * - 한 번만 조회하여 모든 파트너 페이지에서 재사용
 * - 파트너가 아닌 경우 null 반환
 *
 * 보기 모드(view-as) 지원:
 * - 관리자가 특정 파트너 계정처럼 화면을 둘러볼 수 있음
 * - localStorage에 저장되어 새로고침에도 유지
 * - 활성화 시 partner / partnerDetails 가 대상 파트너의 것으로 치환
 */
const PartnerContext = createContext({})
const VIEW_AS_KEY = 'livepulse_view_as'

export const usePartner = () => useContext(PartnerContext)

export const PartnerProvider = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth()
  const [partner, setPartner] = useState(null)
  const [partnerDetails, setPartnerDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)
  const [loadedKey, setLoadedKey] = useState(null) // user.id 또는 `viewas:${partnerId}`

  // 보기 모드 상태 (localStorage 백킹)
  // 새 탭 핸드오프: ?viewAs=<encoded> 파라미터가 있으면 그것을 우선 적용하고
  // localStorage 로 옮겨 적은 뒤 URL 에서 제거한다. 그렇지 않으면 localStorage 에서 복원.
  const [viewAs, setViewAsState] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const param = params.get('viewAs')
        if (param) {
          const info = JSON.parse(decodeURIComponent(param))
          if (info?.partnerId) {
            localStorage.setItem(VIEW_AS_KEY, JSON.stringify(info))
            params.delete('viewAs')
            const qs = params.toString()
            const cleaned = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
            window.history.replaceState({}, '', cleaned)
            return info
          }
        }
      }
      const raw = localStorage.getItem(VIEW_AS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const isAdmin = profile?.role === 'admin'
  const isViewingAs = isAdmin && !!viewAs?.partnerId

  /**
   * 파트너 정보 로드
   */
  const loadPartnerInfo = useCallback(async () => {
    if (!user) {
      setPartner(null)
      setPartnerDetails(null)
      setMyRole(null)
      setLoadedKey(null)
      setLoading(false)
      return
    }

    // ===== 1) 보기 모드 (관리자 + viewAs 설정됨) =====
    if (isAdmin && viewAs?.partnerId) {
      const key = `viewas:${viewAs.partnerId}`
      if (loadedKey === key && partner) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)

        // 대상 파트너의 profile_id 결정
        // - URL/state 로 전달받은 profileId 가 있으면 그대로 사용 (admin 의 직접 SELECT RLS 실패 회피)
        // - 없을 때만 partners 테이블 조회
        let targetProfileId = viewAs.profileId || null
        if (!targetProfileId) {
          const { data: pRow, error: pErr } = await supabase
            .from('partners')
            .select('profile_id')
            .eq('id', viewAs.partnerId)
            .single()
          if (pErr) throw pErr
          targetProfileId = pRow.profile_id
        }

        // 기존 프로시저 재사용 — 대상 파트너의 profile_id로 호출
        const { data, error } = await supabase.rpc('sp_partner_info_q', {
          p_user_id: targetProfileId,
        })
        if (error) throw error

        if (!data) {
          throw new Error('Partner not found')
        }

        // profile_id 도 함께 캐싱해두면 화면에서 RPC 호출 시 재사용 가능
        if (!viewAs.profileId && targetProfileId) {
          const merged = { ...viewAs, profileId: targetProfileId }
          try { localStorage.setItem(VIEW_AS_KEY, JSON.stringify(merged)) } catch {}
          setViewAsState(merged)
        }

        setPartner(data.partner)
        setPartnerDetails(data.details)
        setMyRole(data.myRole || 'owner')
        setLoadedKey(key)
      } catch (error) {
        console.error('Error loading view-as partner:', error)
        // 보기 모드 자체는 유지 (배너 표시) 하되 데이터는 비움 — 페이지에서 빈 상태로 안내한다
        setPartner(null)
        setPartnerDetails(null)
        setMyRole(null)
        setLoadedKey(`viewas:${viewAs.partnerId}:error`)
      } finally {
        setLoading(false)
      }
      return
    }

    // ===== 2) 일반 로직 =====
    if (loadedKey === user.id && partner) {
      setLoading(false)
      return
    }

    if (profile?.userType !== 'partner') {
      setPartner(null)
      setPartnerDetails(null)
      setMyRole(null)
      setLoadedKey(user.id)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('sp_partner_info_q', {
        p_user_id: user.id,
      })
      if (error) throw error

      if (!data) {
        setPartner(null)
        setPartnerDetails(null)
        setMyRole(null)
        setLoadedKey(user.id)
        setLoading(false)
        return
      }

      setPartner(data.partner)
      setPartnerDetails(data.details)
      setMyRole(data.myRole || 'owner')
      setLoadedKey(user.id)
    } catch (error) {
      console.error('Error loading partner info:', error)
      setPartner(null)
      setPartnerDetails(null)
      setMyRole(null)
      setLoadedKey(null)
    } finally {
      setLoading(false)
    }
  }, [user, profile, loadedKey, partner, isAdmin, viewAs])

  /**
   * 파트너 정보 새로고침 (강제 재로드)
   */
  const refreshPartner = useCallback(() => {
    setLoadedKey(null)
    return loadPartnerInfo()
  }, [loadPartnerInfo])

  /**
   * 보기 모드 진입 (관리자 전용)
   * @param {{partnerId, name, partnerType?}} info
   */
  const setViewAs = useCallback((info) => {
    if (!info?.partnerId) return
    try {
      localStorage.setItem(VIEW_AS_KEY, JSON.stringify(info))
    } catch {
      // 저장 실패는 무시
    }
    setViewAsState(info)
    setLoadedKey(null) // 강제 재로드
  }, [])

  /**
   * 보기 모드 해제
   */
  const clearViewAs = useCallback(() => {
    try {
      localStorage.removeItem(VIEW_AS_KEY)
    } catch {
      // 무시
    }
    setViewAsState(null)
    setLoadedKey(null)
  }, [])

  useEffect(() => {
    if (user && profile) {
      loadPartnerInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.userType, profile?.role, viewAs?.partnerId])

  // 로그아웃 시 보기 모드 자동 해제
  // 단, 초기 인증 로딩 중에는 user 가 일시적으로 null 이므로 해제하지 않는다.
  // (새 탭이 ?viewAs=... 로 열렸을 때 방금 저장한 viewAs 가 즉시 지워지는 문제 방지)
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      try {
        localStorage.removeItem(VIEW_AS_KEY)
      } catch {
        // 무시
      }
      setViewAsState(null)
    }
  }, [user, authLoading])

  return (
    <PartnerContext.Provider
      value={{
        partner,
        partnerDetails,
        myRole,
        loading,
        refreshPartner,
        isPartner: !!partner,
        // 보기 모드 API
        isViewingAs,
        viewAs,
        setViewAs,
        clearViewAs,
      }}
    >
      {children}
    </PartnerContext.Provider>
  )
}
