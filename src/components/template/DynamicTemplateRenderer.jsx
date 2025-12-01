import { useLanguage } from '@/context/LanguageContext'
import { Image as ImageIcon } from 'lucide-react'

// 샘플 이미지 URL (플레이스홀더) - 관리자 기본값
export const SAMPLE_IMAGES = {
  background_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  background: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  cover_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  logo: 'https://placehold.co/200x80/4F46E5/FFFFFF?text=LOGO',
  hero_banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=400&fit=crop',
  title_banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=400&fit=crop',
  schedule_banner: 'https://placehold.co/1200x300/10B981/FFFFFF?text=Schedule',
  sponsor_banner: 'https://placehold.co/1200x150/F59E0B/FFFFFF?text=Sponsors',
  footer_banner: 'https://placehold.co/1200x100/6B7280/FFFFFF?text=Footer',
  bottom_banner: 'https://placehold.co/1200x100/6B7280/FFFFFF?text=Footer',
}

// 샘플 텍스트
export const SAMPLE_TEXTS = {
  title: '2024 글로벌 테크 컨퍼런스',
  subtitle: '미래를 만나는 시간',
  description: '전 세계 최고의 전문가들과 함께하는 기술 혁신의 장.',
  date: '2024년 12월 15일 (금)',
  location: '서울 코엑스 그랜드볼룸',
}

/**
 * 필드 타입에 따른 기본 샘플 값
 */
export const getDefaultSampleValue = (field) => {
  if (field.field_type === 'image') {
    return SAMPLE_IMAGES[field.field_key] || `https://placehold.co/800x400/3B82F6/FFFFFF?text=${encodeURIComponent(field.field_name)}`
  } else if (field.field_type === 'text') {
    return SAMPLE_TEXTS[field.field_key] || `샘플 ${field.field_name}`
  } else if (field.field_type === 'boolean') {
    return true
  } else if (field.field_type === 'url') {
    return 'https://example.com'
  }
  return ''
}

/**
 * 동적 템플릿 렌더러 컴포넌트
 * 필드 목록을 기반으로 자동으로 렌더링
 * 
 * @param {Array} fields - 템플릿 필드 목록
 * @param {Object} data - 실제 데이터 (파트너가 설정한 값)
 * @param {Object} defaultData - 기본 데이터 (관리자가 설정한 값)
 * @param {string} device - 디바이스 타입 (mobile, tablet, desktop)
 * @param {Object} sessionInfo - 세션 정보 (title, description 등)
 */
export default function DynamicTemplateRenderer({ 
  fields = [], 
  data = {}, 
  defaultData = {},
  device = 'desktop',
  sessionInfo = {}
}) {
  const { t } = useLanguage()
  
  // 필드 값 가져오기 (파트너 값 → 관리자 기본값 → 샘플값 순서)
  const getFieldValue = (key) => {
    // 1. 파트너가 설정한 값
    if (data[key]) return data[key]
    // 2. 관리자가 설정한 기본값
    if (defaultData[key]) return defaultData[key]
    // 3. 시스템 샘플값
    const field = fields.find(f => f.field_key === key)
    if (field) return getDefaultSampleValue(field)
    return null
  }
  
  // 필드 타입별 그룹화
  const imageFields = fields.filter(f => f.field_type === 'image')
  const textFields = fields.filter(f => f.field_type === 'text')
  const booleanFields = fields.filter(f => f.field_type === 'boolean')
  
  // 배경 이미지 찾기 (키워드 기반)
  const backgroundField = imageFields.find(f => 
    f.field_key.includes('background') || f.field_key.includes('cover')
  )
  const backgroundImage = backgroundField ? getFieldValue(backgroundField.field_key) : null
  
  // 로고 찾기
  const logoField = imageFields.find(f => f.field_key.includes('logo'))
  const logoImage = logoField ? getFieldValue(logoField.field_key) : null
  
  // 배너 이미지들 (배경, 로고 제외)
  const bannerFields = imageFields.filter(f => 
    !f.field_key.includes('background') && 
    !f.field_key.includes('cover') && 
    !f.field_key.includes('logo')
  )

  if (fields.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-muted/50">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="font-medium">{t('template.noFieldsPreview')}</p>
          <p className="text-sm">{t('template.addFieldsToPreview')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[400px] relative">
      {/* 배경 이미지 */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* 콘텐츠 */}
      <div className={`relative z-10 p-6 space-y-4 ${!backgroundImage ? 'bg-gradient-to-br from-slate-800 to-slate-900' : ''}`}>
        {/* 로고 */}
        {logoImage && (
          <div className="flex justify-center">
            <img 
              src={logoImage} 
              alt="Logo" 
              className={`${device === 'mobile' ? 'h-8' : 'h-12'} object-contain`}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        {/* 배너 이미지들 (순서대로) */}
        {bannerFields.map((field) => {
          const value = getFieldValue(field.field_key)
          if (!value) return null
          
          return (
            <div key={field.id} className="rounded-lg overflow-hidden shadow-lg relative">
              <img 
                src={value} 
                alt={field.field_name} 
                className="w-full h-auto object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {field.field_name}
              </div>
            </div>
          )
        })}

        {/* 세션 정보 카드 (세션 정보가 있는 경우) */}
        {sessionInfo.title && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-gray-800">
            <h2 className="text-lg font-bold mb-4">{t('join.sessionInfo')}</h2>
            <div className="space-y-3 text-sm">
              {sessionInfo.date && (
                <div className="flex items-center gap-3">
                  <span className="text-primary">📅</span>
                  <span>{sessionInfo.date}</span>
                </div>
              )}
              {sessionInfo.venue && (
                <div className="flex items-center gap-3">
                  <span className="text-primary">📍</span>
                  <span>{sessionInfo.venue}</span>
                </div>
              )}
              {sessionInfo.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-primary">📞</span>
                  <span>{sessionInfo.phone}</span>
                </div>
              )}
              {sessionInfo.email && (
                <div className="flex items-center gap-3">
                  <span className="text-primary">✉️</span>
                  <span>{sessionInfo.email}</span>
                </div>
              )}
            </div>
            
            {/* 참여 버튼 */}
            <button className={`w-full mt-6 bg-gray-900 text-white font-bold rounded-lg shadow-lg ${device === 'mobile' ? 'px-4 py-3 text-sm' : 'px-6 py-4 text-base'}`}>
              {t('join.enterSession')} →
            </button>
            
            {sessionInfo.participantInfo && (
              <p className="text-center text-xs text-gray-500 mt-3">
                {sessionInfo.participantInfo}
              </p>
            )}
          </div>
        )}

        {/* 텍스트 필드들 (세션 정보가 없는 경우) */}
        {!sessionInfo.title && textFields.length > 0 && (
          <div className="text-center space-y-2">
            {textFields.map((field) => {
              const value = getFieldValue(field.field_key)
              if (!value) return null
              
              // 키워드에 따라 스타일 결정
              const isTitle = field.field_key.includes('title')
              const isSubtitle = field.field_key.includes('subtitle')
              const isDescription = field.field_key.includes('description') || field.field_key.includes('desc')
              
              if (isTitle) {
                return (
                  <h1 key={field.id} className={`font-bold text-white ${device === 'mobile' ? 'text-xl' : 'text-3xl'}`}>
                    {value}
                  </h1>
                )
              }
              if (isSubtitle) {
                return (
                  <p key={field.id} className={`text-white/80 ${device === 'mobile' ? 'text-sm' : 'text-lg'}`}>
                    {value}
                  </p>
                )
              }
              if (isDescription) {
                return (
                  <p key={field.id} className={`text-white/70 ${device === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                    {value}
                  </p>
                )
              }
              
              // 기타 텍스트
              return (
                <div key={field.id} className="flex items-center justify-center gap-2 text-white/90">
                  <span className={device === 'mobile' ? 'text-sm' : ''}>{value}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* 참여 버튼 (boolean 필드 중 show_join_button 등) */}
        {!sessionInfo.title && booleanFields.some(f => f.field_key.includes('button') && getFieldValue(f.field_key)) && (
          <div className="flex justify-center pt-4">
            <button className={`bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-full shadow-lg ${device === 'mobile' ? 'px-6 py-2 text-sm' : 'px-8 py-3 text-lg'}`}>
              지금 참여하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

