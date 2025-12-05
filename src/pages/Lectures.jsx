import { useState, useRef, useEffect } from 'react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Calendar, Clock, User, Star, ImageOff } from 'lucide-react'

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
 * - 로딩 중: 스켈레톤 애니메이션
 * - 로드 완료: 페이드인 효과
 * - 에러: fallback 표시
 */
function LazyImage({ src, alt, className }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'loaded' | 'error'
  const imgRef = useRef(null)

  useEffect(() => {
    // 이미지 상태 초기화 (src 변경 시)
    setStatus('loading')
    
    const img = new Image()
    img.src = src
    
    img.onload = () => setStatus('loaded')
    img.onerror = () => setStatus('error')
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return (
    <div className="relative w-full h-full">
      {/* 스켈레톤 로더 */}
      {status === 'loading' && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}
      
      {/* 에러 fallback */}
      {status === 'error' && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <ImageOff className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
      )}
      
      {/* 실제 이미지 */}
      {status !== 'error' && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          className={`${className} transition-opacity duration-500 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
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

export default function Lectures() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Mock Data - picsum.photos 사용 (더 안정적인 placeholder 서비스)
  const lectures = [
    {
      id: 1,
      title: "디지털 전환 시대의 리더십",
      instructor: "김철수 교수",
      category: "리더십",
      duration: "2시간",
      rating: 4.9,
      tags: ["Digital Transformation", "Leadership", "Innovation"],
      image: "https://picsum.photos/seed/lecture1/800/600"
    },
    {
      id: 2,
      title: "MZ세대와 통하는 소통법",
      instructor: "이영희 작가",
      category: "조직문화",
      duration: "1.5시간",
      rating: 4.8,
      tags: ["Communication", "Generation Gap", "Culture"],
      image: "https://picsum.photos/seed/lecture2/800/600"
    },
    {
      id: 3,
      title: "2025년 경제 전망과 대응 전략",
      instructor: "박경제 박사",
      category: "경제/경영",
      duration: "2시간",
      rating: 4.9,
      tags: ["Economy", "Future Trend", "Strategy"],
      image: "https://picsum.photos/seed/lecture3/800/600"
    },
    {
      id: 4,
      title: "업무 효율을 높이는 AI 활용법",
      instructor: "최지능 전문가",
      category: "디지털/IT",
      duration: "3시간",
      rating: 4.7,
      tags: ["AI", "Productivity", "ChatGPT"],
      image: "https://picsum.photos/seed/lecture4/800/600"
    },
    {
      id: 5,
      title: "직장인을 위한 멘탈 관리",
      instructor: "정마음 상담사",
      category: "힐링/건강",
      duration: "1.5시간",
      rating: 4.9,
      tags: ["Mental Health", "Stress Management", "Wellness"],
      image: "https://picsum.photos/seed/lecture5/800/600"
    },
    {
      id: 6,
      title: "ESG 경영의 이해와 실천",
      instructor: "강환경 이사",
      category: "경제/경영",
      duration: "2시간",
      rating: 4.6,
      tags: ["ESG", "Sustainability", "Management"],
      image: "https://picsum.photos/seed/lecture6/800/600"
    }
  ]

  const categories = ['all', '리더십', '조직문화', '경제/경영', '디지털/IT', '힐링/건강', '직무역량']

  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lecture.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || lecture.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 pt-32 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              최고의 강연을 찾아보세요
            </h1>
            <p className="text-lg text-muted-foreground mb-10">
              검증된 강연 콘텐츠로 기업의 성장을 지원합니다.
            </p>
            
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="강연 주제, 강연가 이름 검색" 
                  className="pl-10 h-12 bg-white/5 border-slate-700 text-white focus:border-orange-500 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button className="h-12 px-8 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white border-0 rounded-xl">
                검색하기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Category Tabs */}
          <div className="flex overflow-x-auto pb-4 gap-2 mb-8 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? '전체' : cat}
              </button>
            ))}
          </div>

          {/* Lecture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLectures.map((lecture, index) => (
              <LazyCard key={lecture.id} index={index}>
                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all hover:-translate-y-1 group bg-white dark:bg-slate-900 h-full">
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <LazyImage 
                      src={lecture.image} 
                      alt={lecture.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-black/60 backdrop-blur-sm text-white hover:bg-black/70 border-0">
                        {lecture.category}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl mb-2 line-clamp-1">{lecture.title}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="h-4 w-4 mr-1" />
                      {lecture.instructor}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {lecture.duration}
                      </div>
                      <div className="flex items-center text-orange-500">
                        <Star className="h-4 w-4 mr-1 fill-current" />
                        {lecture.rating}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lecture.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700">
                      상세보기
                    </Button>
                  </CardFooter>
                </Card>
              </LazyCard>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

