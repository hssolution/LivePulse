-- =====================================================
-- 홈/에러/푸터 추가 번역 (Home renewal + ErrorBoundary + NotFound)
-- =====================================================

-- =====================================================
-- 홈 페이지 - Hero / Search
-- =====================================================
SELECT _seed_trans('home.heroLine1', '00000000-0000-0000-0001-000000000001'::uuid, '모든 강연의 시작과 끝,', 'The beginning and end of every lecture,');
SELECT _seed_trans('home.heroLine2', '00000000-0000-0000-0001-000000000001'::uuid, 'LivePulse에서 연결하세요', 'connect on LivePulse');
SELECT _seed_trans('home.heroDescLine1', '00000000-0000-0000-0001-000000000001'::uuid, '검증된 강연가, 전문 대행사, 그리고 수준 높은 강연 콘텐츠까지.', 'Verified speakers, professional agencies, and premium lecture content.');
SELECT _seed_trans('home.heroDescLine2', '00000000-0000-0000-0001-000000000001'::uuid, '성공적인 강연 비즈니스를 위한 최적의 파트너를 찾아드립니다.', 'We connect you with the perfect partner for a successful lecture business.');

SELECT _seed_trans('home.tabAll', '00000000-0000-0000-0001-000000000001'::uuid, '전체', 'All');
SELECT _seed_trans('home.tabLecture', '00000000-0000-0000-0001-000000000001'::uuid, '강연', 'Lectures');
SELECT _seed_trans('home.tabInstructor', '00000000-0000-0000-0001-000000000001'::uuid, '강연가', 'Speakers');
SELECT _seed_trans('home.tabAgency', '00000000-0000-0000-0001-000000000001'::uuid, '대행사', 'Agencies');
SELECT _seed_trans('home.searchPlaceholder', '00000000-0000-0000-0001-000000000001'::uuid, '찾으시는 강연 주제, 강연가명, 대행사를 입력해보세요.', 'Search lecture topics, speakers, or agencies.');
SELECT _seed_trans('home.searchButton', '00000000-0000-0000-0001-000000000001'::uuid, '검색', 'Search');
SELECT _seed_trans('home.recommendedSearch', '00000000-0000-0000-0001-000000000001'::uuid, '추천 검색어:', 'Recommended:');
SELECT _seed_trans('home.tagLeadership', '00000000-0000-0000-0001-000000000001'::uuid, '#리더십강연', '#Leadership');
SELECT _seed_trans('home.tagCS', '00000000-0000-0000-0001-000000000001'::uuid, '#CS강연', '#CustomerService');
SELECT _seed_trans('home.tagCorporateEvent', '00000000-0000-0000-0001-000000000001'::uuid, '#기업행사대행', '#CorporateEvent');
SELECT _seed_trans('home.tagMotivation', '00000000-0000-0000-0001-000000000001'::uuid, '#동기부여', '#Motivation');

-- =====================================================
-- 홈 페이지 - 생태계 섹션
-- =====================================================
SELECT _seed_trans('home.ecosystemTitle', '00000000-0000-0000-0001-000000000001'::uuid, '성공적인 강연을 위한 완벽한 생태계', 'The complete ecosystem for successful lectures');
SELECT _seed_trans('home.ecosystemDesc', '00000000-0000-0000-0001-000000000001'::uuid, 'LivePulse는 강연 생태계의 모든 참여자가 함께 성장할 수 있는 환경을 제공합니다.', 'LivePulse provides an environment where every participant in the lecture ecosystem can grow together.');

SELECT _seed_trans('home.role1Title', '00000000-0000-0000-0001-000000000001'::uuid, '강연 주최자', 'Lecture Hosts');
SELECT _seed_trans('home.role1Desc', '00000000-0000-0000-0001-000000000001'::uuid, '복잡한 강연 준비는 이제 그만. 검증된 전문가들과 함께 최고의 강연을 기획하세요.', 'No more complex preparation. Plan the best lecture with verified experts.');
SELECT _seed_trans('home.role1Item1', '00000000-0000-0000-0001-000000000001'::uuid, '검증된 강연가/대행사 DB 열람', 'Access verified speaker & agency database');
SELECT _seed_trans('home.role1Item2', '00000000-0000-0000-0001-000000000001'::uuid, '맞춤형 제안 요청 및 비교 견적', 'Custom proposals and comparison quotes');
SELECT _seed_trans('home.role1Item3', '00000000-0000-0000-0001-000000000001'::uuid, '성과 분석 및 운영 도구 지원', 'Analytics and operational tool support');
SELECT _seed_trans('home.role1Cta', '00000000-0000-0000-0001-000000000001'::uuid, '강연 찾아보기', 'Browse Lectures');

SELECT _seed_trans('home.role2Title', '00000000-0000-0000-0001-000000000001'::uuid, '전문 강연가', 'Professional Speakers');
SELECT _seed_trans('home.role2Desc', '00000000-0000-0000-0001-000000000001'::uuid, '강연에만 집중하세요. 브랜딩부터 일정 관리까지 시스템이 도와드립니다.', 'Focus only on lecturing. From branding to scheduling, the system has you covered.');
SELECT _seed_trans('home.role2Item1', '00000000-0000-0000-0001-000000000001'::uuid, '퍼스널 브랜딩 포트폴리오', 'Personal branding portfolio');
SELECT _seed_trans('home.role2Item2', '00000000-0000-0000-0001-000000000001'::uuid, '강연 의뢰 실시간 알림/관리', 'Real-time booking notifications & management');
SELECT _seed_trans('home.role2Item3', '00000000-0000-0000-0001-000000000001'::uuid, '커리큘럼 홍보 및 마케팅', 'Curriculum promotion and marketing');
SELECT _seed_trans('home.role2Cta', '00000000-0000-0000-0001-000000000001'::uuid, '강연가 등록하기', 'Register as Speaker');

SELECT _seed_trans('home.role3Title', '00000000-0000-0000-0001-000000000001'::uuid, '행사 대행사', 'Event Agencies');
SELECT _seed_trans('home.role3Desc', '00000000-0000-0000-0001-000000000001'::uuid, '더 많은 비즈니스 기회를 발견하고, 효율적으로 소속 강연가를 관리하세요.', 'Discover more business opportunities and efficiently manage your speakers.');
SELECT _seed_trans('home.role3Item1', '00000000-0000-0000-0001-000000000001'::uuid, '신규 기업 고객 발굴 기회', 'New corporate client discovery');
SELECT _seed_trans('home.role3Item2', '00000000-0000-0000-0001-000000000001'::uuid, '소속 강연가 통합 관리 시스템', 'Integrated speaker management system');
SELECT _seed_trans('home.role3Item3', '00000000-0000-0000-0001-000000000001'::uuid, '입찰 및 제안 프로세스 간소화', 'Streamlined bidding and proposal process');
SELECT _seed_trans('home.role3Cta', '00000000-0000-0000-0001-000000000001'::uuid, '대행사 등록하기', 'Register as Agency');

-- =====================================================
-- 홈 페이지 - 공개 기능 섹션
-- =====================================================
SELECT _seed_trans('home.publicBadge', '00000000-0000-0000-0001-000000000001'::uuid, '누구나 무료로 시작하는 소통', 'Free communication for everyone');
SELECT _seed_trans('home.publicTitleLine1', '00000000-0000-0000-0001-000000000001'::uuid, '강연뿐만 아니라', 'Not just lectures —');
SELECT _seed_trans('home.publicTitleLine2', '00000000-0000-0000-0001-000000000001'::uuid, '모든 모임의 소통을', 'bring real-time communication');
SELECT _seed_trans('home.publicTitleLine3', '00000000-0000-0000-0001-000000000001'::uuid, '라이브하게', 'to every gathering');
SELECT _seed_trans('home.publicDescLine1', '00000000-0000-0000-0001-000000000001'::uuid, '대학교 수업, 학생회 투표, 사내 익명 설문조사까지.', 'From university classes and student elections to anonymous workplace surveys.');
SELECT _seed_trans('home.publicDescLine2', '00000000-0000-0000-0001-000000000001'::uuid, '복잡한 설치 없이 QR코드 하나로 실시간 소통을 시작해보세요.', 'Start real-time communication with just a QR code — no setup required.');

SELECT _seed_trans('home.publicFeature1Title', '00000000-0000-0000-0001-000000000001'::uuid, '실시간 Q&A', 'Real-time Q&A');
SELECT _seed_trans('home.publicFeature1Desc', '00000000-0000-0000-0001-000000000001'::uuid, '익명 질문으로 부담 없이 소통', 'Communicate freely with anonymous questions');
SELECT _seed_trans('home.publicFeature2Title', '00000000-0000-0000-0001-000000000001'::uuid, '투표 및 설문', 'Polls & Surveys');
SELECT _seed_trans('home.publicFeature2Desc', '00000000-0000-0000-0001-000000000001'::uuid, '결과를 실시간 그래프로 확인', 'View results as real-time graphs');
SELECT _seed_trans('home.publicCta', '00000000-0000-0000-0001-000000000001'::uuid, '지금 무료로 만들기', 'Create for Free Now');

SELECT _seed_trans('home.demoCard1Title', '00000000-0000-0000-0001-000000000001'::uuid, '총학생회 임원 선거', 'Student Council Election');
SELECT _seed_trans('home.demoCard1Subtitle', '00000000-0000-0000-0001-000000000001'::uuid, '실시간 투표율 82%', 'Live turnout 82%');
SELECT _seed_trans('home.demoCard2Title', '00000000-0000-0000-0001-000000000001'::uuid, '사내 복지 개선 설문', 'Workplace Benefits Survey');
SELECT _seed_trans('home.demoCard2Subtitle', '00000000-0000-0000-0001-000000000001'::uuid, '익명 의견 142건 수집됨', '142 anonymous responses collected');
SELECT _seed_trans('home.demoTagLunch', '00000000-0000-0000-0001-000000000001'::uuid, '#점심식대', '#LunchAllowance');
SELECT _seed_trans('home.demoTagFlex', '00000000-0000-0000-0001-000000000001'::uuid, '#유연근무', '#FlexibleWork');

-- =====================================================
-- 홈 페이지 - 강연장 이미지 섹션
-- =====================================================
SELECT _seed_trans('home.premiumSpace', '00000000-0000-0000-0001-000000000001'::uuid, 'Premium Space', 'Premium Space');
SELECT _seed_trans('home.hallTitleLine1', '00000000-0000-0000-0001-000000000001'::uuid, '당신의 이야기가', 'The moment your story');
SELECT _seed_trans('home.hallTitleLine2', '00000000-0000-0000-0001-000000000001'::uuid, '세상을 울리는 순간', 'moves the world');
SELECT _seed_trans('home.hallDesc', '00000000-0000-0000-0001-000000000001'::uuid, '청중의 마음을 움직이는 강연, LivePulse가 가장 빛나는 무대를 준비해 드립니다.', 'A lecture that moves your audience — LivePulse prepares the brightest stage for you.');

-- =====================================================
-- 홈 페이지 - 카테고리 섹션
-- =====================================================
SELECT _seed_trans('home.popularTopicsTitle', '00000000-0000-0000-0001-000000000001'::uuid, '인기 강연 주제', 'Popular Lecture Topics');
SELECT _seed_trans('home.popularTopicsDesc', '00000000-0000-0000-0001-000000000001'::uuid, '지금 기업들이 가장 많이 찾는 강연 주제입니다.', 'The lecture topics companies are looking for right now.');
SELECT _seed_trans('home.viewAll', '00000000-0000-0000-0001-000000000001'::uuid, '전체 보기', 'View All');
SELECT _seed_trans('home.category1', '00000000-0000-0000-0001-000000000001'::uuid, '리더십/코칭', 'Leadership/Coaching');
SELECT _seed_trans('home.category2', '00000000-0000-0000-0001-000000000001'::uuid, '디지털 전환', 'Digital Transformation');
SELECT _seed_trans('home.category3', '00000000-0000-0000-0001-000000000001'::uuid, '직무 역량', 'Job Skills');
SELECT _seed_trans('home.category4', '00000000-0000-0000-0001-000000000001'::uuid, '조직 문화', 'Organizational Culture');
SELECT _seed_trans('home.category5', '00000000-0000-0000-0001-000000000001'::uuid, '인문/교양', 'Humanities/Culture');
SELECT _seed_trans('home.category6', '00000000-0000-0000-0001-000000000001'::uuid, '법정 의무', 'Statutory Education');

-- =====================================================
-- 홈 페이지 - 최종 CTA 섹션
-- =====================================================
SELECT _seed_trans('home.finalCtaTitle', '00000000-0000-0000-0001-000000000001'::uuid, '강연 비즈니스의 성장을 함께하세요', 'Grow your lecture business with us');
SELECT _seed_trans('home.finalCtaDescLine1', '00000000-0000-0000-0001-000000000001'::uuid, '강연가님은 강연에만, 대행사는 운영에만 집중하세요.', 'Speakers focus on lectures, agencies focus on operations.');
SELECT _seed_trans('home.finalCtaDescLine2', '00000000-0000-0000-0001-000000000001'::uuid, '번거로운 매칭과 정산, 관리는 LivePulse가 해결해드립니다.', 'LivePulse handles the tedious matching, settlement, and management.');
SELECT _seed_trans('home.finalCtaPrimary', '00000000-0000-0000-0001-000000000001'::uuid, '지금 무료로 시작하기', 'Start Free Now');
SELECT _seed_trans('home.finalCtaSecondary', '00000000-0000-0000-0001-000000000001'::uuid, '도입 문의하기', 'Contact Sales');

-- =====================================================
-- 푸터 (홈 페이지 푸터)
-- =====================================================
SELECT _seed_trans('footer.taglineLine1', '00000000-0000-0000-0001-000000000001'::uuid, '강연, 강연가, 대행사를 연결하는', 'Connecting lectures, speakers, and agencies');
SELECT _seed_trans('footer.taglineLine2', '00000000-0000-0000-0001-000000000001'::uuid, '올인원 강연 매칭 플랫폼', 'all-in-one lecture matching platform');
SELECT _seed_trans('footer.service', '00000000-0000-0000-0001-000000000001'::uuid, '서비스', 'Services');
SELECT _seed_trans('footer.findLecture', '00000000-0000-0000-0001-000000000001'::uuid, '강연 찾기', 'Find Lectures');
SELECT _seed_trans('footer.findInstructor', '00000000-0000-0000-0001-000000000001'::uuid, '강연가 찾기', 'Find Speakers');
SELECT _seed_trans('footer.findAgency', '00000000-0000-0000-0001-000000000001'::uuid, '대행사 찾기', 'Find Agencies');
SELECT _seed_trans('footer.customerSupport', '00000000-0000-0000-0001-000000000001'::uuid, '고객센터', 'Customer Support');
SELECT _seed_trans('footer.notice', '00000000-0000-0000-0001-000000000001'::uuid, '공지사항', 'Notice');
SELECT _seed_trans('footer.faqLink', '00000000-0000-0000-0001-000000000001'::uuid, '자주 묻는 질문', 'FAQ');
SELECT _seed_trans('footer.inquiry', '00000000-0000-0000-0001-000000000001'::uuid, '1:1 문의', '1:1 Inquiry');
SELECT _seed_trans('footer.companyInfo', '00000000-0000-0000-0001-000000000001'::uuid, '회사 소개', 'About Company');
SELECT _seed_trans('footer.aboutLivepulse', '00000000-0000-0000-0001-000000000001'::uuid, 'LivePulse 소개', 'About LivePulse');
SELECT _seed_trans('footer.terms', '00000000-0000-0000-0001-000000000001'::uuid, '이용약관', 'Terms of Service');
SELECT _seed_trans('footer.privacy', '00000000-0000-0000-0001-000000000001'::uuid, '개인정보처리방침', 'Privacy Policy');
SELECT _seed_trans('footer.escrowNotice', '00000000-0000-0000-0001-000000000001'::uuid, '안전한 거래를 위해 에스크로 결제 서비스를 이용하고 있습니다.', 'We use escrow payment service for safe transactions.');

-- =====================================================
-- 공개 헤더 (PublicHeader) 네비게이션 폴백
-- =====================================================
SELECT _seed_trans('nav.lectures', '00000000-0000-0000-0001-000000000001'::uuid, '강연 찾기', 'Find Lectures');
SELECT _seed_trans('nav.instructors', '00000000-0000-0000-0001-000000000001'::uuid, '강연가 찾기', 'Find Speakers');
SELECT _seed_trans('nav.agencies', '00000000-0000-0000-0001-000000000001'::uuid, '대행사 찾기', 'Find Agencies');

-- =====================================================
-- ErrorBoundary 컴포넌트
-- =====================================================
SELECT _seed_trans('errorBoundary.title', '00000000-0000-0000-0001-000000000006'::uuid, '문제가 발생했습니다', 'Something went wrong');
SELECT _seed_trans('errorBoundary.description', '00000000-0000-0000-0001-000000000006'::uuid, '예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 이동해주세요.', 'An unexpected error occurred. Please refresh the page or return to home.');
SELECT _seed_trans('errorBoundary.reload', '00000000-0000-0000-0001-000000000006'::uuid, '새로고침', 'Reload');

-- =====================================================
-- 404 NotFound 페이지
-- =====================================================
SELECT _seed_trans('notFound.title', '00000000-0000-0000-0001-000000000006'::uuid, '페이지를 찾을 수 없습니다', 'Page Not Found');
SELECT _seed_trans('notFound.descLine1', '00000000-0000-0000-0001-000000000006'::uuid, '요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.', 'The page you requested does not exist or may have been moved.');
SELECT _seed_trans('notFound.descLine2', '00000000-0000-0000-0001-000000000006'::uuid, 'URL을 확인하시거나 아래 버튼을 이용해주세요.', 'Please check the URL or use the buttons below.');
SELECT _seed_trans('notFound.back', '00000000-0000-0000-0001-000000000006'::uuid, '이전 페이지', 'Previous Page');
SELECT _seed_trans('notFound.goHome', '00000000-0000-0000-0001-000000000006'::uuid, '홈으로 이동', 'Go to Home');
