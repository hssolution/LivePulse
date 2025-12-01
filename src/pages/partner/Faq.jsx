import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  Loader2, 
  Search,
  HelpCircle,
  Building2,
  Briefcase,
  Mic,
  Globe,
  List
} from 'lucide-react'

/**
 * 파트너 FAQ 조회 페이지
 */
export default function Faq() {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [faqs, setFaqs] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [partnerType, setPartnerType] = useState(null)
  const [categories, setCategories] = useState([
    { id: 'all', labelKey: 'faq.categoryAll', icon: List },
    { id: 'common', labelKey: 'faq.categoryCommon', icon: Globe },
  ])

  /**
   * 파트너 타입 조회
   */
  useEffect(() => {
    const loadPartnerType = async () => {
      if (!user?.id) return
      
      try {
        const { data, error } = await supabase
          .from('partners')
          .select('partner_type')
          .eq('profile_id', user.id)
          .single()
        
        if (error) throw error
        
        if (data?.partner_type) {
          setPartnerType(data.partner_type)
          
          // 파트너 타입에 따라 카테고리 추가
          const newCategories = [
            { id: 'all', labelKey: 'faq.categoryAll', icon: List },
            { id: 'common', labelKey: 'faq.categoryCommon', icon: Globe },
          ]
          
          if (data.partner_type === 'organizer') {
            newCategories.push({ id: 'organizer', labelKey: 'faq.categoryOrganizer', icon: Briefcase })
          } else if (data.partner_type === 'agency') {
            newCategories.push({ id: 'agency', labelKey: 'faq.categoryAgency', icon: Building2 })
          } else if (data.partner_type === 'instructor') {
            newCategories.push({ id: 'instructor', labelKey: 'faq.categoryInstructor', icon: Mic })
          }
          
          setCategories(newCategories)
        }
      } catch (error) {
        console.error('Error loading partner type:', error)
      }
    }
    
    loadPartnerType()
  }, [user?.id])

  /**
   * FAQ 목록 로드
   */
  const loadFaqs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      // 'all'이면 common + 자기 파트너 타입의 FAQ만 가져옴
      if (activeCategory === 'all') {
        const allowedCategories = ['common']
        if (partnerType) {
          allowedCategories.push(partnerType)
        }
        query = query.in('category', allowedCategories)
      } else {
        query = query.eq('category', activeCategory)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setFaqs(data || [])
    } catch (error) {
      console.error('Error loading FAQs:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, partnerType])

  useEffect(() => {
    loadFaqs()
  }, [loadFaqs])

  // 검색 필터링
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('faq.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('faq.desc')}</p>
      </div>

      {/* 카테고리 탭 */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {t(cat.labelKey)}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* 검색 */}
        <div className="relative mb-4 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('faq.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="flex-1 mt-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredFaqs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t('faq.noFaqs')}</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={faq.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Badge variant="outline" className="shrink-0">
                          Q{index + 1}
                        </Badge>
                        <span className="font-medium">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-10 pb-2 text-muted-foreground whitespace-pre-wrap">
                        {faq.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
