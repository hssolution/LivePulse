import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { 
  Search,
  Briefcase,
  GraduationCap,
  Building2,
  CheckCircle2,
  ArrowRight,
  Star,
  TrendingUp,
  Users,
  ShieldCheck,
  MessageSquare,
  BarChart3
} from 'lucide-react'

/**
 * 스크롤 시 요소가 나타나는 애니메이션 컴포넌트
 */
const ScrollReveal = ({ children, className = "", delay = 0, direction = "up" }) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const getTransform = () => {
    if (isVisible) return "translate-x-0 translate-y-0"
    if (direction === "up") return "translate-y-20"
    if (direction === "down") return "-translate-y-20"
    if (direction === "left") return "translate-x-20"
    if (direction === "right") return "-translate-x-20"
    return "translate-y-20"
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${getTransform()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/**
 * 스크롤 시 채워지는 프로그레스 바 컴포넌트
 */
const AnimatedProgressBar = ({ percentage }) => {
  const [width, setWidth] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 약간의 딜레이 후 애니메이션 시작
          setTimeout(() => setWidth(percentage), 300)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [percentage])

  return (
    <div ref={ref} className="h-2 bg-slate-800 rounded-full overflow-hidden w-full">
      <div 
        className="h-full bg-gradient-to-r from-green-400 to-teal-500 transition-all duration-1500 ease-out relative"
        style={{ width: `${width}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
      </div>
    </div>
  )
}

/**
 * 홈 페이지 (랜딩 페이지) - 리뉴얼
 * 강의/강사/대행사 매칭 플랫폼 컨셉
 */
export default function Home() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [scrollY, setScrollY] = useState(0)

  // 패럴랙스 효과를 위한 스크롤 감지
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-orange-100 selection:text-orange-900 dark:selection:bg-orange-900 dark:selection:text-orange-100 overflow-x-hidden">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Rich Animated Background */}
        <div className="absolute inset-0 -z-10 bg-slate-950">
          {/* Vivid Gradient Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-600/30 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full bg-rose-600/30 blur-[120px] animate-pulse delay-1000" />
          <div 
            className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[100px]"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          />
          
          {/* Visible Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          
          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full bg-white/20 animate-float"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: `${Math.random() * 4 + 2}px`,
                  height: `${Math.random() * 4 + 2}px`,
                  animationDuration: `${Math.random() * 10 + 10}s`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
          </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <ScrollReveal delay={0}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
                <span className="block text-foreground">모든 강연의 시작과 끝,</span>
                <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                  LivePulse에서 연결하세요
                </span>
              </h1>
            </ScrollReveal>
            
            <ScrollReveal delay={100}>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                검증된 강연가, 전문 대행사, 그리고 수준 높은 강연 콘텐츠까지.
                <br className="hidden sm:block" />
                성공적인 강연 비즈니스를 위한 최적의 파트너를 찾아드립니다.
              </p>
            </ScrollReveal>

            {/* Integrated Search Box */}
            <ScrollReveal delay={200}>
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700 max-w-3xl mx-auto">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 gap-2 mb-6 bg-transparent p-0">
                    <TabsTrigger 
                      value="all" 
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      전체
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lecture" 
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      강연
                    </TabsTrigger>
                    <TabsTrigger 
                      value="instructor" 
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      강연가
                    </TabsTrigger>
                    <TabsTrigger 
                      value="agency" 
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      대행사
                    </TabsTrigger>
                  </TabsList>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="찾으시는 강연 주제, 강연가명, 대행사를 입력해보세요." 
                      className="pl-12 pr-32 h-14 text-lg bg-transparent border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button 
                      className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0 rounded-xl px-8 shadow-lg shadow-orange-500/20"
                    >
                      검색
                    </Button>
                  </div>

                  {/* Search Tags */}
                  <div className="flex flex-wrap gap-2 mt-4 justify-center text-sm text-muted-foreground">
                    <span>추천 검색어:</span>
                    <button className="hover:text-primary underline">#리더십강연</button>
                    <button className="hover:text-primary underline">#CS강연</button>
                    <button className="hover:text-primary underline">#기업행사대행</button>
                    <button className="hover:text-primary underline">#동기부여</button>
                  </div>
                </Tabs>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-32 relative bg-slate-900">
        {/* Circuit Board / Connecting Lines Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0H0V80" fill="none" stroke="white" strokeWidth="0.5"/>
                <circle cx="0" cy="0" r="1" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
          </svg>
        </div>
        
        {/* Colorful Glows with better positioning */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <ScrollReveal>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                성공적인 강연을 위한 완벽한 생태계
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
                LivePulse는 강연 생태계의 모든 참여자가 함께 성장할 수 있는 환경을 제공합니다.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* For Lecture Hosts/Companies */}
            <ScrollReveal delay={0} direction="up">
              <Card className="border border-white/5 shadow-2xl bg-white/5 backdrop-blur-md relative overflow-hidden group hover:-translate-y-2 transition-all duration-500 h-full">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
                
                <CardContent className="p-8 lg:p-10 relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center mb-8 border border-blue-500/20 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">강연 주최자</h3>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed min-h-[3rem]">
                    복잡한 강연 준비는 이제 그만. 검증된 전문가들과 함께 최고의 강연을 기획하세요.
                  </p>
                  <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      <span>검증된 강연가/대행사 DB 열람</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      <span>맞춤형 제안 요청 및 비교 견적</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      <span>성과 분석 및 운영 도구 지원</span>
                    </li>
                  </ul>
                  <Link to="/lectures" className="inline-flex items-center text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors group/link mt-auto">
                    강연 찾아보기 
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* For Instructors */}
            <ScrollReveal delay={200} direction="up">
              <Card className="border border-white/5 shadow-2xl bg-white/5 backdrop-blur-md relative overflow-hidden group hover:-translate-y-2 transition-all duration-500 h-full">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-orange-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-500" />
                
                <CardContent className="p-8 lg:p-10 relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-400 flex items-center justify-center mb-8 border border-orange-500/20 shadow-lg shadow-orange-500/10 group-hover:scale-110 transition-transform duration-500">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">전문 강연가</h3>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed min-h-[3rem]">
                    강연에만 집중하세요. 브랜딩부터 일정 관리까지 시스템이 도와드립니다.
                  </p>
                  <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                      <span>퍼스널 브랜딩 포트폴리오</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                      <span>강연 의뢰 실시간 알림/관리</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                      <span>커리큘럼 홍보 및 마케팅</span>
                    </li>
                  </ul>
                  <Link to="/signup?type=instructor" className="inline-flex items-center text-orange-400 font-bold text-sm hover:text-orange-300 transition-colors group/link mt-auto">
                    강연가 등록하기 
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* For Agencies */}
            <ScrollReveal delay={400} direction="up">
              <Card className="border border-white/5 shadow-2xl bg-white/5 backdrop-blur-md relative overflow-hidden group hover:-translate-y-2 transition-all duration-500 h-full">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500" />
                
                <CardContent className="p-8 lg:p-10 relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 text-purple-400 flex items-center justify-center mb-8 border border-purple-500/20 shadow-lg shadow-purple-500/10 group-hover:scale-110 transition-transform duration-500">
                    <Briefcase className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">행사 대행사</h3>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed min-h-[3rem]">
                    더 많은 비즈니스 기회를 발견하고, 효율적으로 소속 강연가를 관리하세요.
                  </p>
                  <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                      <span>신규 기업 고객 발굴 기회</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                      <span>소속 강연가 통합 관리 시스템</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                      <span>입찰 및 제안 프로세스 간소화</span>
                    </li>
                  </ul>
                  <Link to="/signup?type=agency" className="inline-flex items-center text-purple-400 font-bold text-sm hover:text-purple-300 transition-colors group/link mt-auto">
                    대행사 등록하기 
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
        
        {/* Transition to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
      </section>

      {/* Public Features Section (New) */}
      <section className="py-32 relative bg-slate-950 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-green-500/10 to-teal-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <ScrollReveal direction="right">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium mb-6">
                  <Users className="w-4 h-4 mr-2" />
                  누구나 무료로 시작하는 소통
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">
                  강연뿐만 아니라<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400">
                    모든 모임의 소통을<br />라이브하게
                  </span>
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  대학교 수업, 학생회 투표, 사내 익명 설문조사까지.<br />
                  복잡한 설치 없이 QR코드 하나로 실시간 소통을 시작해보세요.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-white font-bold mb-1">실시간 Q&A</h4>
                    <p className="text-sm text-slate-400">익명 질문으로 부담 없이 소통</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <h4 className="text-white font-bold mb-1">투표 및 설문</h4>
                    <p className="text-sm text-slate-400">결과를 실시간 그래프로 확인</p>
                  </div>
                </div>

                <Link to="/signup">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 h-14 text-lg shadow-lg shadow-green-900/20">
                    지금 무료로 만들기
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </ScrollReveal>
            </div>

            <div className="lg:w-1/2 relative">
              {/* Phone Mockup or Feature Graphics */}
              <div className="relative z-10 grid gap-6">
                <ScrollReveal delay={200} direction="left">
                  <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 p-6 rotate-[-2deg] hover:rotate-0 transition-transform duration-500 shadow-2xl group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl">🎓</div>
                      <div>
                        <div className="text-white font-bold">총학생회 임원 선거</div>
                        <div className="text-xs text-slate-500">실시간 투표율 82%</div>
                      </div>
                      <div className="ml-auto px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded animate-pulse">LIVE</div>
                    </div>
                    {/* Animated Progress Bar */}
                    <AnimatedProgressBar percentage={82} />
                  </Card>
                </ScrollReveal>

                <ScrollReveal delay={400} direction="left">
                  <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 p-6 translate-x-8 rotate-[2deg] hover:rotate-0 transition-transform duration-500 shadow-2xl group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl">🏢</div>
                      <div>
                        <div className="text-white font-bold">사내 복지 개선 설문</div>
                        <div className="text-xs text-slate-500">익명 의견 142건 수집됨</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">#점심식대</span>
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">#유연근무</span>
                    </div>
                  </Card>
                </ScrollReveal>
              </div>
              
              {/* Decorative Circle behind */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-dashed border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            </div>
          </div>
        </div>
      </section>

      {/* Lecture Hall Image Section */}
      <section className="relative py-40 bg-slate-950 overflow-hidden group">
        <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
          <div 
            className="absolute inset-0 transition-transform duration-1000 ease-out"
            style={{ transform: `scale(1.1) translateY(${(scrollY - 2000) * 0.05}px)` }} 
          >
            <img 
              src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop" 
              alt="Conference Hall" 
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/80" />
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <div className="inline-block mb-4 px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-xs text-slate-300 font-medium tracking-wider uppercase">Premium Space</div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
              당신의 이야기가<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-100">세상을 울리는 순간</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
              청중의 마음을 움직이는 강연, LivePulse가 가장 빛나는 무대를 준비해 드립니다.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative bg-slate-950">
        {/* Hexagon Pattern Background */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415-.828-.828-.828.828-1.415-1.415.828-.828-.828-.828 1.415-1.415.828-.828-.828-.828 1.415 1.415-.828.828zM22.485 0l.83.828-1.415 1.415-.828-.828-.828.828-1.415-1.415.828-.828-.828-.828 1.415-1.415.828-.828-.828-.828 1.415 1.415-.828.828zM0 22.485l.828.83-1.415 1.415-.828-.828-.828.828L-2.83 22.485l.828-.828-.828-.828 1.415-1.415.828.828.828-.828 1.415 1.415-.828.828zM0 54.627l.828.83-1.415 1.415-.828-.828-.828.828L-2.83 54.627l.828-.828-.828-.828 1.415-1.415.828.828.828-.828 1.415 1.415-.828.828zM54.627 60l.83-.828-1.415-1.415-.828.828-.828-.828-1.415 1.415.828.828-.828.828 1.415-1.415.828-.828.828.828 1.415-1.415-.828-.828zM22.485 60l.83-.828-1.415-1.415-.828.828-.828-.828-1.415 1.415.828.828-.828.828 1.415-1.415.828-.828.828.828 1.415-1.415-.828-.828zM32 11.849L32 0l-2-2v13.849l-10 5.774-10-5.774V0l-2-2v13.849L0 17.698v24.604L10 48.075V62l2 2V46.925l10-5.774 10 5.774V62l2 2V46.925l10 5.774V24.604l-10-5.774zM12 44.604V25.774l8-4.619 8 4.619v18.83L20 49.222l-8-4.619zm16-26.52l-8-4.619-8 4.619V14.17l8-4.619 8 4.619v3.914zM48 44.604V25.774l8-4.619 8 4.619v18.83L56 49.222l-8-4.619zm16-26.52l-8-4.619-8 4.619V14.17l8-4.619 8 4.619v3.914z' fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
               backgroundSize: '60px 60px'
             }}
        ></div>

        <div className="max-w-7xl mx-auto relative">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">인기 강연 주제</h2>
                <p className="text-muted-foreground text-lg">
                  지금 기업들이 가장 많이 찾는 강연 주제입니다.
                </p>
              </div>
              <Button variant="outline" className="group border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                전체 보기 <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {['리더십/코칭', '디지털 전환', '직무 역량', '조직 문화', '인문/교양', '법정 의무'].map((category, i) => (
              <ScrollReveal key={i} delay={i * 100} direction="up">
                <Link 
                  to={`/lectures?category=${category}`}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700/50 mb-4 group-hover:scale-110 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all duration-300 flex items-center justify-center">
                    <Star className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{category}</span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-pink-500/20"></div>
              
              <CardContent className="p-12 md:p-16 text-center relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  강연 비즈니스의 성장을 함께하세요
                </h2>
                <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
                  강연가님은 강연에만, 대행사는 운영에만 집중하세요.
                  <br />
                  번거로운 매칭과 정산, 관리는 LivePulse가 해결해드립니다.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/signup">
                    <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 border-0 text-lg px-8 h-14 font-bold">
                      지금 무료로 시작하기
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 text-lg px-8 h-14">
                      도입 문의하기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">LivePulse</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                강연, 강연가, 대행사를 연결하는
                <br />
                올인원 강연 매칭 플랫폼
              </p>
              <div className="flex gap-4">
                {/* Social Icons Placeholder */}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">서비스</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/lectures" className="hover:text-primary">강연 찾기</Link></li>
                <li><Link to="/instructors" className="hover:text-primary">강연가 찾기</Link></li>
                <li><Link to="/agencies" className="hover:text-primary">대행사 찾기</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">고객센터</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/notice" className="hover:text-primary">공지사항</Link></li>
                <li><Link to="/faq" className="hover:text-primary">자주 묻는 질문</Link></li>
                <li><Link to="/inquiry" className="hover:text-primary">1:1 문의</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">회사 소개</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary">LivePulse 소개</Link></li>
                <li><Link to="/terms" className="hover:text-primary">이용약관</Link></li>
                <li><Link to="/privacy" className="hover:text-primary">개인정보처리방침</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © 2024 LivePulse. All rights reserved.
            </p>
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
               <ShieldCheck className="h-4 w-4" />
               <span>안전한 거래를 위해 에스크로 결제 서비스를 이용하고 있습니다.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
