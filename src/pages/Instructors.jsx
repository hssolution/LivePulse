import { useState, useRef, useEffect } from 'react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Award, MapPin, Star, ChevronRight, ImageOff } from 'lucide-react'

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
 * 이미지 로딩 상태 관리 컴포넌트
 */
function LazyImage({ src, alt, className }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    setStatus('loading')
    const img = new Image()
    img.src = src
    img.onload = () => setStatus('loaded')
    img.onerror = () => setStatus('error')
    return () => { img.onload = null; img.onerror = null }
  }, [src])

  return (
    <div className="relative w-full h-full">
      {status === 'loading' && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-full" />
      )}
      {status === 'error' && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center rounded-full">
          <ImageOff className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        </div>
      )}
      {status !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`${className} transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
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

export default function Instructors() {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mock Data - picsum.photos 사용
  const instructors = [
    {
      id: 1,
      name: "김철수",
      title: "리더십 전문 코치",
      organization: "미래리더십연구소",
      topics: ["리더십", "조직관리", "동기부여"],
      location: "서울",
      rating: 4.9,
      reviews: 128,
      image: "https://picsum.photos/seed/instructor1/200/200",
      career: "전) 대기업 인사팀장"
    },
    {
      id: 2,
      name: "이영희",
      title: "커뮤니케이션 전문가",
      organization: "소통의기술 대표",
      topics: ["소통", "스피치", "협상"],
      location: "경기",
      rating: 4.8,
      reviews: 95,
      image: "https://picsum.photos/seed/instructor2/200/200",
      career: "베스트셀러 작가"
    },
    {
      id: 3,
      name: "박경제",
      title: "경제 전망 분석가",
      organization: "한국경제연구원",
      topics: ["거시경제", "트렌드", "재테크"],
      location: "서울",
      rating: 5.0,
      reviews: 210,
      image: "https://picsum.photos/seed/instructor3/200/200",
      career: "경제학 박사"
    },
    {
      id: 4,
      name: "최지능",
      title: "AI 기술 전문가",
      organization: "테크퓨처",
      topics: ["AI", "ChatGPT", "디지털전환"],
      location: "대전",
      rating: 4.7,
      reviews: 56,
      image: "https://picsum.photos/seed/instructor4/200/200",
      career: "IT 개발 15년 경력"
    },
    {
      id: 5,
      name: "정마음",
      title: "심리 상담가",
      organization: "마음치유센터",
      topics: ["스트레스", "힐링", "심리학"],
      location: "부산",
      rating: 4.9,
      reviews: 342,
      image: "https://picsum.photos/seed/instructor5/200/200",
      career: "임상심리전문가"
    },
    {
      id: 6,
      name: "강환경",
      title: "ESG 컨설턴트",
      organization: "그린비즈니스",
      topics: ["ESG", "환경경영", "지속가능성"],
      location: "서울",
      rating: 4.6,
      reviews: 42,
      image: "https://picsum.photos/seed/instructor6/200/200",
      career: "환경부 자문위원"
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 pt-32 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              검증된 강연가를 만나보세요
            </h1>
            <p className="text-lg text-muted-foreground mb-10">
              각 분야 최고의 전문가들이 당신의 무대를 빛내드립니다.
            </p>
            
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="강연가 이름, 전문 분야 검색" 
                  className="pl-10 h-12 bg-white/5 border-slate-700 text-white focus:border-orange-500 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button className="h-12 px-8 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white border-0 rounded-xl">
                전문가 찾기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((instructor, index) => (
              <LazyCard key={instructor.id} index={index}>
                <Card className="group overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1 bg-white dark:bg-slate-900 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <LazyImage 
                            src={instructor.image} 
                            alt={instructor.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{instructor.name}</h3>
                          <p className="text-sm text-muted-foreground">{instructor.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                        <Star className="h-4 w-4 mr-1 fill-current" />
                        <span className="font-bold text-sm">{instructor.rating}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <Award className="h-4 w-4 mr-2 text-slate-400" />
                        {instructor.career}
                      </div>
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        {instructor.location}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {instructor.topics.map((topic, idx) => (
                        <Badge key={idx} variant="secondary" className="font-normal">
                          {topic}
                        </Badge>
                      ))}
                    </div>

                    <Button variant="outline" className="w-full group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all">
                      프로필 상세
                      <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
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

