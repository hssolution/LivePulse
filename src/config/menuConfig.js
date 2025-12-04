import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  UserCircle, 
  TestTube, 
  FileText, 
  Database,
  MessageSquare,
  UserPlus,
  Languages,
  Building2,
  UsersRound,
  Calendar,
  LayoutTemplate,
  Mail,
  HelpCircle,
  MessagesSquare,
  Video
} from 'lucide-react'

/**
 * 공통 메뉴 (관리자 & 파트너 모두 사용)
 * basePath를 받아서 경로를 동적으로 생성
 * labelKey: 언어팩 키 (t() 함수로 번역)
 */
const getCommonMenuItems = (basePath) => [
  {
    to: basePath,
    icon: LayoutDashboard,
    labelKey: 'menu.dashboard',
    isExact: true
  },
  {
    to: `${basePath}/profile`,
    icon: UserCircle,
    labelKey: 'menu.profile'
  },
  {
    id: 'content-management',
    icon: FileText,
    labelKey: 'menu.posts',
    subItems: [
      { to: `${basePath}/content/posts`, labelKey: 'menu.posts' }
    ]
  },
  {
    id: 'support',
    icon: MessageSquare,
    labelKey: 'menu.support',
    subItems: [
      { to: `${basePath}/support/faq`, icon: HelpCircle, labelKey: 'menu.faq' },
      { to: `${basePath}/support/inquiry`, icon: MessagesSquare, labelKey: 'menu.inquiry' }
    ]
  },
  {
    to: `${basePath}/settings`,
    icon: Settings,
    labelKey: 'menu.settings'
  }
]

/**
 * 관리자 전용 메뉴
 */
const adminOnlyMenuItems = [
  {
    to: '/adm/users',
    icon: Users,
    labelKey: 'menu.users'
  },
  {
    to: '/adm/partner-requests',
    icon: UserPlus,
    labelKey: 'menu.partnerRequests'
  },
  {
    to: '/adm/partners',
    icon: Building2,
    labelKey: 'menu.partnerList'
  },
  {
    to: '/adm/sessions',
    icon: Video,
    labelKey: 'menu.sessionManagement'
  },
  {
    id: 'templates',
    icon: LayoutTemplate,
    labelKey: 'menu.templateManagement',
    subItems: [
      { to: '/adm/templates/main', labelKey: 'menu.templateMain' },
      { to: '/adm/templates/qna', labelKey: 'menu.templateQnA' },
      { to: '/adm/templates/poll', labelKey: 'menu.templatePoll' }
    ]
  },
  {
    id: 'admin-support',
    icon: MessageSquare,
    labelKey: 'menu.supportManagement',
    subItems: [
      { to: '/adm/support/faq', icon: HelpCircle, labelKey: 'menu.faqManagement' },
      { to: '/adm/support/inquiries', icon: MessagesSquare, labelKey: 'menu.inquiryManagement' }
    ]
  },
  {
    id: 'system',
    icon: Database,
    labelKey: 'menu.system',
    subItems: [
      { to: '/adm/system/database', labelKey: 'menu.database' },
      { to: '/adm/system/logs', labelKey: 'menu.logs' },
      { to: '/adm/system/login-logs', labelKey: 'menu.loginLogs' },
      { to: '/adm/system/backup', labelKey: 'menu.backup' },
      { to: '/adm/system/language-pack', labelKey: 'menu.languagePack' }
    ]
  },
  {
    to: '/adm/profile-test',
    icon: TestTube,
    labelKey: 'menu.profileTest'
  }
]

/**
 * 관리자 메뉴 설정 (공통 + 관리자 전용)
 */
export const adminMenuItems = (() => {
  const common = getCommonMenuItems('/adm')
  // 대시보드 다음에 관리자 전용 메뉴 삽입
  return [
    common[0], // 대시보드
    adminOnlyMenuItems[0], // 회원 관리
    adminOnlyMenuItems[1], // 파트너 신청
    adminOnlyMenuItems[2], // 파트너 목록
    adminOnlyMenuItems[3], // 세션 관리
    common[1], // 내 정보
    common[2], // 콘텐츠 관리
    adminOnlyMenuItems[4], // 템플릿 관리
    adminOnlyMenuItems[5], // 문의/지원 관리 (관리자용)
    adminOnlyMenuItems[6], // 시스템
    adminOnlyMenuItems[7], // 프로필 테스트
    common[4], // 설정
  ]
})()

/**
 * 파트너 전용 메뉴
 */
const partnerOnlyMenuItems = [
  {
    to: '/partner/sessions',
    icon: Calendar,
    labelKey: 'menu.sessions'
  },
  {
    to: '/partner/team',
    icon: UsersRound,
    labelKey: 'menu.teamMembers'
  },
  {
    to: '/partner/invitations',
    icon: Mail,
    labelKey: 'menu.invitations'
  },
  {
    to: '/partner/partner-profile',
    icon: Building2,
    labelKey: 'menu.partnerProfile'
  }
]

/**
 * 파트너 메뉴 설정 (공통 + 파트너 전용)
 */
export const partnerMenuItems = (() => {
  const common = getCommonMenuItems('/partner')
  // 대시보드 다음에 파트너 전용 메뉴 삽입
  return [
    common[0], // 대시보드
    partnerOnlyMenuItems[0], // 세션 관리
    partnerOnlyMenuItems[1], // 팀원 관리
    partnerOnlyMenuItems[2], // 초대 관리
    partnerOnlyMenuItems[3], // 파트너 정보
    common[1], // 내 정보
    common[2], // 콘텐츠 관리
    common[3], // 문의/지원
    common[4], // 설정
  ]
})()

/**
 * 역할에 따른 메뉴 반환
 * @param {string} role - 사용자 역할 ('admin' | 'partner')
 * @returns {Array} 메뉴 아이템 배열
 */
export const getMenuByRole = (role) => {
  if (role === 'admin') {
    return adminMenuItems
  }
  return partnerMenuItems
}

/**
 * 역할에 따른 기본 경로 반환
 * @param {string} role - 사용자 역할
 * @returns {string} 기본 경로
 */
export const getBasePathByRole = (role) => {
  if (role === 'admin') {
    return '/adm'
  }
  return '/partner'
}

/**
 * 역할에 따른 타이틀 키 반환
 * @param {string} role - 사용자 역할
 * @returns {string} 타이틀 언어팩 키
 */
export const getTitleKeyByRole = (role) => {
  if (role === 'admin') {
    return 'title.adminPanel'
  }
  return 'title.partnerCenter'
}

/**
 * 역할에 따른 헤더 타이틀 키 반환
 * @param {string} role - 사용자 역할
 * @returns {string} 헤더 타이틀 언어팩 키
 */
export const getHeaderTitleKeyByRole = (role) => {
  if (role === 'admin') {
    return 'title.adminPanel'
  }
  return 'title.partnerCenter'
}

// 레거시 호환용 (deprecated)
export const getTitleByRole = (role) => {
  if (role === 'admin') {
    return 'Admin System'
  }
  return 'Partner Center'
}

export const getHeaderTitleByRole = (role) => {
  if (role === 'admin') {
    return 'Admin Panel'
  }
  return 'Partner Center'
}
