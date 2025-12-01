import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, LayoutTemplate } from 'lucide-react'

// 샘플 이미지 URL
const SAMPLE_IMAGES = {
  background_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  background: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  cover_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  logo: 'https://placehold.co/200x80/4F46E5/FFFFFF?text=LOGO',
  hero_banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=400&fit=crop',
  title_banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=400&fit=crop',
  schedule_banner: 'https://placehold.co/1200x300/10B981/FFFFFF?text=Schedule',
  sponsor_banner: 'https://placehold.co/1200x150/F59E0B/FFFFFF?text=Sponsors',
  bottom_banner: 'https://placehold.co/1200x100/6B7280/FFFFFF?text=Footer',
}

/**
 * 템플릿 공개 미리보기 페이지
 * /template-preview/:code
 * - 관리자가 설정한 기본 형태를 보여줌
 * - 새 창에서 열림
 */
export default function TemplatePreviewPublic() {
  const { code } = useParams()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])

  /**
   * 템플릿 로드
   */
  const loadTemplate = useCallback(async () => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('session_templates')
        .select('*')
        .eq('code', code)
        .single()
      
      if (templateError) throw templateError
      setTemplate(templateData)
      
      // 필드 로드
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('session_template_fields')
        .select('*')
        .eq('template_id', templateData.id)
        .order('sort_order')
      
      if (fieldsError) throw fieldsError
      setFields(fieldsData || [])
      
    } catch (error) {
      console.error('Error loading template:', error)
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <LayoutTemplate className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>{t('template.notFound')}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.close()}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    )
  }

  // 필드 값 가져오기 (샘플 데이터)
  const getFieldValue = (key) => {
    return SAMPLE_IMAGES[key] || `https://placehold.co/800x400/3B82F6/FFFFFF?text=${encodeURIComponent(key)}`
  }

  // 필드 타입별 분류
  const imageFields = fields.filter(f => f.field_type === 'image')
  const backgroundField = imageFields.find(f => 
    f.field_key.includes('background') || f.field_key.includes('cover')
  )
  const logoField = imageFields.find(f => f.field_key.includes('logo'))
  const bannerFields = imageFields.filter(f => 
    !f.field_key.includes('background') && 
    !f.field_key.includes('cover') && 
    !f.field_key.includes('logo')
  )

  return (
    <div className="min-h-screen relative">
      {/* 배경 */}
      {backgroundField ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${getFieldValue(backgroundField.field_key)})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
      )}

      {/* 헤더 바 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutTemplate className="h-5 w-5 text-white/70" />
            <div>
              <h1 className="text-white font-medium">{template.name}</h1>
              <p className="text-xs text-white/50">{t('template.previewMode')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={() => window.close()}>
            {t('common.close')}
          </Button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          {/* 로고 */}
          {logoField && (
            <div className="flex justify-center">
              <img 
                src={getFieldValue(logoField.field_key)} 
                alt="Logo" 
                className="h-16 object-contain"
              />
            </div>
          )}

          {/* 배너들 */}
          {bannerFields.map((field) => (
            <div key={field.id} className="relative group">
              <img 
                src={getFieldValue(field.field_key)} 
                alt={field.field_name} 
                className="w-full rounded-lg shadow-xl"
              />
              {/* 필드 라벨 */}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {field.field_name}
                {field.is_required && <span className="text-red-400 ml-1">*</span>}
              </div>
            </div>
          ))}

          {/* 참여 버튼 (샘플) */}
          <div className="flex justify-center pt-8">
            <button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold px-8 py-4 rounded-full text-lg shadow-lg hover:scale-105 transition-transform">
              {t('session.joinNow')}
            </button>
          </div>

          {/* 필드 없는 경우 */}
          {fields.length === 0 && (
            <div className="text-center py-12">
              <LayoutTemplate className="h-16 w-16 mx-auto text-white/30 mb-4" />
              <p className="text-white/50">{t('template.noFieldsConfigured')}</p>
              <p className="text-white/30 text-sm mt-2">{t('template.adminNeedsToSetup')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-3">
          <p className="text-center text-white/40 text-xs">
            {t('template.previewNote')}
          </p>
        </div>
      </div>
    </div>
  )
}

