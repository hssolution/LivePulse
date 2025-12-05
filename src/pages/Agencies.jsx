import { useState, useRef, useEffect } from 'react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Building2, Users, Trophy, CheckCircle2 } from 'lucide-react'

/**
 * 지연 로딩 + 페이드인 애니메이션을 위한 커스텀 훅
 */
function useIntersectionObserver(options = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.1, ...options })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

/**
 * 지연 로딩 카드 컴포넌트
 */
function LazyCard({ children, index }) {
  const [ref, isVisible] = useIntersectionObserver()
  
  return (
    <div
      ref={ref}
      className={isVisible ? 'animate-fade-in-up' : 'opacity-0'}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {children}
    </div>
  )
}

export default function Agencies() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock Data
  const agencies = [
    {
      id: 1,
      name: "스타기획",
      description: "기업 행사 및 교육 운영 전문 대행사",
      services: ["행사기획", "교육운영", "연사섭외"],
      projects: 150,
      rating: 4.8,
      logo: "S",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      name: "퓨처이벤트",
      description: "디지털 컨퍼런스 및 웨비나 전문",
      services: ["온라인행사", "영상제작", "중계시스템"],
      projects: 89,
      rating: 4.9,
      logo: "F",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      name: "인사이트교육",
      description: "HRD 전문 교육 컨설팅 및 위탁운영",
      services: ["HRD컨설팅", "직무교육", "리더십과정"],
      projects: 210,
      rating: 4.7,
      logo: "I",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      name: "컬처메이커스",
      description: "조직문화 활성화 프로그램 기획",
      services: ["팀빌딩", "워크샵", "사내이벤트"],
      projects: 75,
      rating: 4.9,
      logo: "C",
      color: "from-orange-500 to-red-500"
    },
    {
      id: 5,
      name: "글로벌MICE",
      description: "국제회의 및 전시회 기획 운영",
      services: ["MICE", "국제행사", "전시기획"],
      projects: 120,
      rating: 4.6,
      logo: "G",
      color: "from-indigo-500 to-blue-600"
    },
    {
      id: 6,
      name: "에듀플러스",
      description: "법정의무교육 및 집체교육 전문",
      services: ["법정교육", "CS교육", "안전교육"],
      projects: 300,
      rating: 4.5,
      logo: "E",
      color: "from-slate-600 to-slate-800"
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 pt-32 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              믿을 수 있는 파트너 대행사
            </h1>
            <p className="text-lg text-muted-foreground mb-10">
              행사의 성공을 이끌어줄 전문 대행사를 만나보세요.
            </p>
            
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="대행사명, 제공 서비스 검색" 
                  className="pl-10 h-12 bg-white/5 border-slate-700 text-white focus:border-orange-500 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button className="h-12 px-8 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white border-0 rounded-xl">
                대행사 찾기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Agencies Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agencies.map((agency, index) => (
              <LazyCard key={agency.id} index={index}>
                <Card className="group border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:shadow-xl transition-all bg-white dark:bg-slate-900 h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${agency.color} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                        {agency.logo}
                      </div>
                      <Badge variant="outline" className="border-slate-200 dark:border-slate-700">
                        평점 {agency.rating}
                      </Badge>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 group-hover:text-purple-500 transition-colors">{agency.name}</h3>
                    <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">
                      {agency.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-t border-b border-slate-100 dark:border-slate-800">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-slate-500 mb-1">
                          <Trophy className="h-4 w-4 mr-1" />
                          <span className="text-xs">프로젝트</span>
                        </div>
                        <span className="font-bold text-lg">{agency.projects}+</span>
                      </div>
                      <div className="text-center border-l border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-center text-slate-500 mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          <span className="text-xs">만족도</span>
                        </div>
                        <span className="font-bold text-lg">{agency.rating}/5.0</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {agency.services.map((service, idx) => (
                        <div key={idx} className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-purple-500" />
                          {service}
                        </div>
                      ))}
                    </div>

                    <Button className="w-full mt-8 bg-white dark:bg-slate-800 text-foreground border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                      제안 요청하기
                    </Button>
                  </CardContent>
                </Card>
              </LazyCard>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

