import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Building2, Briefcase, GraduationCap, Mail, Phone, MapPin, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'

/**
 * 파트너 정보 팝업 (공용 컴포넌트)
 * - 파트너 ID를 받아서 정보를 조회하여 표시
 * - 다양한 곳에서 재사용 가능
 * 
 * @param {string} partnerId - 조회할 파트너 ID
 * @param {boolean} open - 다이얼로그 열림 상태
 * @param {function} onOpenChange - 다이얼로그 상태 변경 핸들러
 */
export default function PartnerInfoDialog({ partnerId, open, onOpenChange }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [partner, setPartner] = useState(null)
  const [error, setError] = useState(null)

  /**
   * 파트너 정보 로드
   */
  useEffect(() => {
    if (!open || !partnerId) return

    const loadPartner = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 기본 파트너 정보 조회
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select(`
            id,
            partner_type,
            representative_name,
            phone,
            is_active,
            created_at,
            profile:profiles(email, display_name)
          `)
          .eq('id', partnerId)
          .single()
        
        if (partnerError) throw partnerError
        
        // 파트너 타입별 상세 정보 조회
        let details = null
        
        if (partnerData.partner_type === 'organizer') {
          const { data } = await supabase
            .from('partner_organizers')
            .select('company_name, business_number, address')
            .eq('partner_id', partnerId)
            .single()
          details = data
        } else if (partnerData.partner_type === 'agency') {
          const { data } = await supabase
            .from('partner_agencies')
            .select('company_name, business_number, address')
            .eq('partner_id', partnerId)
            .single()
          details = data
        } else if (partnerData.partner_type === 'instructor') {
          const { data } = await supabase
            .from('partner_instructors')
            .select('specialty, bio')
            .eq('partner_id', partnerId)
            .single()
          // display_name은 profiles에서 가져옴
          details = { ...data, display_name: partnerData.profile?.display_name }
        }
        
        setPartner({ ...partnerData, details })
        
      } catch (err) {
        console.error('Error loading partner:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadPartner()
  }, [open, partnerId])

  /**
   * 파트너 타입 아이콘
   */
  const getTypeIcon = (type) => {
    switch (type) {
      case 'organizer':
        return <Briefcase className="h-5 w-5" />
      case 'agency':
        return <Building2 className="h-5 w-5" />
      case 'instructor':
        return <GraduationCap className="h-5 w-5" />
      default:
        return <User className="h-5 w-5" />
    }
  }

  /**
   * 파트너 타입 라벨
   */
  const getTypeLabel = (type) => {
    const labels = {
      organizer: t('partner.typeOrganizer'),
      agency: t('partner.typeAgency'),
      instructor: t('partner.typeInstructor'),
    }
    return labels[type] || type
  }

  /**
   * 파트너 타입별 색상
   */
  const getTypeColor = (type) => {
    switch (type) {
      case 'organizer':
        return 'bg-blue-500/10 text-blue-600'
      case 'agency':
        return 'bg-purple-500/10 text-purple-600'
      case 'instructor':
        return 'bg-orange-500/10 text-orange-600'
      default:
        return 'bg-gray-500/10 text-gray-600'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('partner.info')}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{t('error.loadFailed')}</p>
          </div>
        ) : partner ? (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getTypeColor(partner.partner_type)}`}>
                {getTypeIcon(partner.partner_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">
                  {partner.details?.company_name || 
                   partner.details?.display_name || 
                   partner.representative_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={getTypeColor(partner.partner_type)}>
                    {getTypeLabel(partner.partner_type)}
                  </Badge>
                  {partner.is_active ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      {t('partner.statusActive')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                      {t('partner.statusInactive')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 상세 정보 */}
            <div className="space-y-3 border-t pt-4">
              {/* 대표자명 */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('partner.representativeName')}</p>
                  <p className="font-medium">{partner.representative_name}</p>
                </div>
              </div>

              {/* 이메일 */}
              {partner.profile?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                    <p className="font-medium">{partner.profile.email}</p>
                  </div>
                </div>
              )}

              {/* 전화번호 */}
              {partner.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.phone')}</p>
                    <p className="font-medium">{partner.phone}</p>
                  </div>
                </div>
              )}

              {/* 주소 (행사자/대행사만) */}
              {partner.details?.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('partner.address')}</p>
                    <p className="font-medium">{partner.details.address}</p>
                  </div>
                </div>
              )}

              {/* 전문 분야 (강사만) */}
              {partner.details?.specialty && (
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('partner.specialty')}</p>
                    <p className="font-medium">{partner.details.specialty}</p>
                  </div>
                </div>
              )}

              {/* 소개 (강사만) */}
              {partner.details?.bio && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">{t('partner.bio')}</p>
                  <p className="text-sm">{partner.details.bio}</p>
                </div>
              )}

              {/* 가입일 */}
              <div className="flex items-center gap-3 pt-2 border-t">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('partner.joinedAt')}</p>
                  <p className="font-medium">{format(new Date(partner.created_at), 'yyyy.MM.dd')}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

