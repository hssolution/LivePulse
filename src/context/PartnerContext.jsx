import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

/**
 * PartnerContext
 * 
 * 파트너 정보를 전역적으로 관리하여 중복 DB 조회를 방지합니다.
 * - 한 번만 조회하여 모든 파트너 페이지에서 재사용
 * - 파트너가 아닌 경우 null 반환
 */
const PartnerContext = createContext({})

export const usePartner = () => useContext(PartnerContext)

export const PartnerProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [partner, setPartner] = useState(null)
  const [partnerDetails, setPartnerDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)
  const [loadedUserId, setLoadedUserId] = useState(null)

  /**
   * 파트너 정보 로드
   */
  const loadPartnerInfo = useCallback(async () => {
    if (!user) {
      setPartner(null)
      setPartnerDetails(null)
      setMyRole(null)
      setLoadedUserId(null)
      setLoading(false)
      return
    }

    // 이미 같은 유저의 데이터를 로드했으면 스킵
    if (loadedUserId === user.id && partner) {
      setLoading(false)
      return
    }

    // 파트너가 아니면 스킵
    if (profile?.userType !== 'partner') {
      setPartner(null)
      setPartnerDetails(null)
      setMyRole(null)
      setLoadedUserId(user.id)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // 파트너 정보 조회 (프로시저 사용 - 한 번에 모든 정보 가져오기)
      const { data, error } = await supabase.rpc('sp_partner_info_q', {
        p_user_id: user.id
      })

      if (error) throw error

      // 파트너가 없으면 null
      if (!data) {
        setPartner(null)
        setPartnerDetails(null)
        setMyRole(null)
        setLoadedUserId(user.id)
        setLoading(false)
        return
      }

      setPartner(data.partner)
      setPartnerDetails(data.details)
      setMyRole(data.myRole || 'owner')
      setLoadedUserId(user.id)
    } catch (error) {
      console.error('Error loading partner info:', error)
      setPartner(null)
      setPartnerDetails(null)
      setMyRole(null)
      setLoadedUserId(null)
    } finally {
      setLoading(false)
    }
  }, [user, profile, loadedUserId, partner])

  /**
   * 파트너 정보 새로고침 (강제 재로드)
   */
  const refreshPartner = useCallback(() => {
    setLoadedUserId(null)
    return loadPartnerInfo()
  }, [loadPartnerInfo])

  useEffect(() => {
    // user나 profile이 변경되었을 때만 로드
    if (user && profile) {
      loadPartnerInfo()
    }
  }, [user?.id, profile?.userType]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PartnerContext.Provider
      value={{
        partner,
        partnerDetails,
        myRole,
        loading,
        refreshPartner,
        isPartner: !!partner
      }}
    >
      {children}
    </PartnerContext.Provider>
  )
}

