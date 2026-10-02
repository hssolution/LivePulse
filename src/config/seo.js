/**
 * SEO / AEO / GEO 공통 설정
 * - SITE_URL: 배포 도메인 (환경변수 VITE_SITE_URL 우선)
 * - PAGE_META: 공개 페이지별 메타 정보 (title / description / keywords / path)
 */

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://livepulse.noligo.co.kr').replace(/\/$/, '')

export const SITE_NAME = 'LivePulse'

export const DEFAULT_DESCRIPTION =
  '행사 당일 화면 운영을 한 곳에서. 큐시트 순서대로 발표 자료, 실시간 Q&A, 청중 설문을 송출 화면에 올리는 행사 진행 콘솔입니다. 학회·심포지엄·세미나·기업 교육에 씁니다.'

export const DEFAULT_KEYWORDS = [
  '행사 진행',
  '행사 진행 콘솔',
  '큐시트',
  '송출 화면',
  '실시간 Q&A',
  '청중 설문',
  '학회',
  '심포지엄',
  '세미나',
  '기업 교육',
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
  // 아래 셋은 라우트를 홈으로 돌렸다(마켓은 후순위). 남겨 둔 페이지 파일이 참조해서 지우지 않는다.
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
    description: '오픈 기간에는 무료입니다.',
  },
  featureList: [
    '큐시트(진행 순서) 편성과 큐별 송출',
    '송출 화면 전환 — 발표 자료·Q&A·설문 결과',
    '실시간 Q&A — 질문 승인·숨김·고정, 좌장 화면',
    '청중 설문·투표와 결과 표시',
    '참가·로비·송출 화면 디자인 에디터',
    '세션 리포트와 Excel 내려받기',
  ],

}
