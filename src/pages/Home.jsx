import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { PublicHeader } from '@/components/layout/PublicHeader'
import SEO from '@/components/common/SEO'
import { PAGE_META, SERVICE_JSONLD } from '@/config/seo'
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
      <SEO url={PAGE_META.home.path} description={PAGE_META.home.description} jsonLd={SERVICE_JSONLD} />
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
                <span className="block text-foreground">{t('home.heroLine1')}</span>
                <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                  {t('home.heroLine2')}
                </span>
              </h1>
            </ScrollReveal>
            
            <ScrollReveal delay={100}>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                {t('home.heroDescLine1')}
                <br className="hidden sm:block" />
                {t('home.heroDescLine2')}
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
                      {t('home.tabAll')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="lecture"
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      {t('home.tabLecture')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="instructor"
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      {t('home.tabInstructor')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="agency"
                      className="rounded-xl py-3 text-base font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300"
                    >
                      {t('home.tabAgency')}
                    </TabsTrigger>
                  </TabsList>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('home.searchPlaceholder')}
                      className="pl-12 pr-32 h-14 text-lg bg-transparent border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button
                      className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0 rounded-xl px-8 shadow-lg shadow-orange-500/20"
                    >
                      {t('home.searchButton')}
                    </Button>
                  </div>

                  {/* Search Tags */}
                  <div className="flex flex-wrap gap-2 mt-4 justify-center text-sm text-muted-foreground">
                    <span>{t('home.recommendedSearch')}</span>
                    <button className="hover:text-primary underline">{t('home.tagLeadership')}</button>
                    <button className="hover:text-primary underline">{t('home.tagCS')}</button>
                    <button className="hover:text-primary underline">{t('home.tagCorporateEvent')}</button>
                    <button className="hover:text-primary underline">{t('home.tagMotivation')}</button>
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
                {t('home.ecosystemTitle')}
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
                {t('home.ecosystemDesc')}
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
                  <h3 className="text-2xl font-bold mb-4 text-white">{t('home.role1Title')}</h3>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed min-h-[3rem]">
                    {t('home.role1Desc')}
                  </p>
                  <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      <span>{t('home.role1Item1')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      <span>{t('home.role1Item2')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      <span>{t('home.role1Item3')}</span>
                    </li>
                  </ul>
                  <Link to="/lectures" className="inline-flex items-center text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors group/link mt-auto">
                    {t('home.role1Cta')}
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
                  <h3 className="text-2xl font-bold mb-4 text-white">{t('home.role2Title')}</h3>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed min-h-[3rem]">
                    {t('home.role2Desc')}
                  </p>
                  <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                      <span>{t('home.role2Item1')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                      <span>{t('home.role2Item2')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                      <span>{t('home.role2Item3')}</span>
                    </li>
                  </ul>
                  <Link to="/signup?type=instructor" className="inline-flex items-center text-orange-400 font-bold text-sm hover:text-orange-300 transition-colors group/link mt-auto">
                    {t('home.role2Cta')}
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
                  <h3 className="text-2xl font-bold mb-4 text-white">{t('home.role3Title')}</h3>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed min-h-[3rem]">
                    {t('home.role3Desc')}
                  </p>
                  <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                      <span>{t('home.role3Item1')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                      <span>{t('home.role3Item2')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                      <span>{t('home.role3Item3')}</span>
                    </li>
                  </ul>
                  <Link to="/signup?type=agency" className="inline-flex items-center text-purple-400 font-bold text-sm hover:text-purple-300 transition-colors group/link mt-auto">
                    {t('home.role3Cta')}
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
                  {t('home.publicBadge')}
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">
                  {t('home.publicTitleLine1')}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400">
                    {t('home.publicTitleLine2')}<br />{t('home.publicTitleLine3')}
                  </span>
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  {t('home.publicDescLine1')}<br />
                  {t('home.publicDescLine2')}
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-white font-bold mb-1">{t('home.publicFeature1Title')}</h4>
                    <p className="text-sm text-slate-400">{t('home.publicFeature1Desc')}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <h4 className="text-white font-bold mb-1">{t('home.publicFeature2Title')}</h4>
                    <p className="text-sm text-slate-400">{t('home.publicFeature2Desc')}</p>
                  </div>
                </div>

                <Link to="/signup">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 h-14 text-lg shadow-lg shadow-green-900/20">
                    {t('home.publicCta')}
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
                        <div className="text-white font-bold">{t('home.demoCard1Title')}</div>
                        <div className="text-xs text-slate-500">{t('home.demoCard1Subtitle')}</div>
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
                        <div className="text-white font-bold">{t('home.demoCard2Title')}</div>
                        <div className="text-xs text-slate-500">{t('home.demoCard2Subtitle')}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">{t('home.demoTagLunch')}</span>
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">{t('home.demoTagFlex')}</span>
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
            <div className="inline-block mb-4 px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-xs text-slate-300 font-medium tracking-wider uppercase">{t('home.premiumSpace')}</div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
              {t('home.hallTitleLine1')}<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-100">{t('home.hallTitleLine2')}</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
              {t('home.hallDesc')}
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
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{t('home.popularTopicsTitle')}</h2>
                <p className="text-muted-foreground text-lg">
                  {t('home.popularTopicsDesc')}
                </p>
              </div>
              <Button variant="outline" className="group border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                {t('home.viewAll')} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { key: 'home.category1', slug: '리더십/코칭' },
              { key: 'home.category2', slug: '디지털 전환' },
              { key: 'home.category3', slug: '직무 역량' },
              { key: 'home.category4', slug: '조직 문화' },
              { key: 'home.category5', slug: '인문/교양' },
              { key: 'home.category6', slug: '법정 의무' },
            ].map((category, i) => (
              <ScrollReveal key={category.key} delay={i * 100} direction="up">
                <Link
                  to={`/lectures?category=${category.slug}`}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700/50 mb-4 group-hover:scale-110 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all duration-300 flex items-center justify-center">
                    <Star className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{t(category.key)}</span>
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
                  {t('home.finalCtaTitle')}
                </h2>
                <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
                  {t('home.finalCtaDescLine1')}
                  <br />
                  {t('home.finalCtaDescLine2')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/signup">
                    <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 border-0 text-lg px-8 h-14 font-bold">
                      {t('home.finalCtaPrimary')}
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 text-lg px-8 h-14">
                      {t('home.finalCtaSecondary')}
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
                {t('footer.taglineLine1')}
                <br />
                {t('footer.taglineLine2')}
              </p>
              <div className="flex gap-4">
                {/* Social Icons Placeholder */}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">{t('footer.service')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/lectures" className="hover:text-primary">{t('footer.findLecture')}</Link></li>
                <li><Link to="/instructors" className="hover:text-primary">{t('footer.findInstructor')}</Link></li>
                <li><Link to="/agencies" className="hover:text-primary">{t('footer.findAgency')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">{t('footer.customerSupport')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/notice" className="hover:text-primary">{t('footer.notice')}</Link></li>
                <li><Link to="/faq" className="hover:text-primary">{t('footer.faqLink')}</Link></li>
                <li><Link to="/inquiry" className="hover:text-primary">{t('footer.inquiry')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">{t('footer.companyInfo')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary">{t('footer.aboutLivepulse')}</Link></li>
                <li><Link to="/terms" className="hover:text-primary">{t('footer.terms')}</Link></li>
                <li><Link to="/privacy" className="hover:text-primary">{t('footer.privacy')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              {t('footer.copyright')}
            </p>
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
               <ShieldCheck className="h-4 w-4" />
               <span>{t('footer.escrowNotice')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
