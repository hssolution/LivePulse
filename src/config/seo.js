/**
 * SEO / AEO / GEO 공통 설정
 * - SITE_URL: 배포 도메인 (환경변수 VITE_SITE_URL 우선)
 * - PAGE_META: 공개 페이지별 메타 정보 (title / description / keywords / path)
 */

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://livepulse.noligo.co.kr').replace(/\/$/, '')

export const SITE_NAME = 'LivePulse'

export const DEFAULT_DESCRIPTION =
  '강연, 강연가, 대행사를 연결하는 올인원 강연 매칭 플랫폼. 강연·세미나·워크숍에서 Q&A, 설문, 투표로 청중과 실시간 소통하세요.'

export const DEFAULT_KEYWORDS = [
  '강연 매칭',
  '강연가 섭외',
  '강사 섭외',
  '강연 플랫폼',
  '실시간 청중 소통',
  '라이브 Q&A',
  '실시간 투표',
  '세미나 설문',
  '웨비나 인터랙션',
  'LivePulse',
]

export const DEFAULT_OG_IMAGE = '/og-image.png'

/** 공개 페이지별 메타 (sitemap.xml 경로와 일치해야 함) */
export const PAGE_META = {
  home: {
    path: '/',
    title: null, // 홈은 사이트명 단독 노출
    description: DEFAULT_DESCRIPTION,
  },
  lectures: {
    path: '/lectures',
    title: '강연 찾기',
    description:
      '분야별 검증된 강연 콘텐츠를 찾아보세요. 리더십, 트렌드, 동기부여 등 다양한 주제의 강연을 LivePulse에서 비교하고 문의할 수 있습니다.',
  },
  instructors: {
    path: '/instructors',
    title: '강연가 찾기',
    description:
      '검증된 전문 강연가를 만나보세요. 경력, 전문 분야, 강연 이력을 확인하고 우리 행사에 맞는 강연가를 LivePulse에서 섭외하세요.',
  },
  agencies: {
    path: '/agencies',
    title: '대행사 찾기',
    description:
      '강연 기획부터 운영까지, 전문 강연 대행사를 찾아보세요. LivePulse가 성공적인 행사를 위한 최적의 파트너를 연결해 드립니다.',
  },
  legalTerms: {
    path: '/legal/terms',
    title: '이용약관',
    description: 'LivePulse 서비스 이용약관입니다.',
  },
  legalPrivacy: {
    path: '/legal/privacy',
    title: '개인정보처리방침',
    description: 'LivePulse 개인정보처리방침입니다.',
  },
  legalRefund: {
    path: '/legal/refund',
    title: '환불정책',
    description: 'LivePulse 환불정책입니다.',
  },
}

/** 조직(Organization) JSON-LD — 사이트 전역 공통 */
export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description: DEFAULT_DESCRIPTION,
}

/** 웹사이트(WebSite) JSON-LD */
export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'ko',
  description: DEFAULT_DESCRIPTION,
}

/** 홈 화면용 서비스 JSON-LD (AEO — 검색엔진/AI가 서비스 성격을 이해하도록) */
export const SERVICE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko',
  description: DEFAULT_DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
    description: '무료로 시작할 수 있습니다.',
  },
  featureList: [
    '강연가·대행사 검색 및 매칭',
    '실시간 청중 Q&A',
    '실시간 투표 및 설문',
    '발표자 화면·무대 스크린 송출',
    '세션 리포트 및 참여 통계',
  ],
}
