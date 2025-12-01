-- =====================================================
-- 공통 번역 (common)
-- =====================================================
SELECT _seed_trans('common.add', '00000000-0000-0000-0001-000000000001'::uuid, '추가', 'Add');
SELECT _seed_trans('common.all', '00000000-0000-0000-0001-000000000001'::uuid, '전체', 'All');
SELECT _seed_trans('common.apply', '00000000-0000-0000-0001-000000000001'::uuid, '적용', 'Apply');
SELECT _seed_trans('common.back', '00000000-0000-0000-0001-000000000001'::uuid, '뒤로', 'Back');
SELECT _seed_trans('common.cancel', '00000000-0000-0000-0001-000000000001'::uuid, '취소', 'Cancel');
SELECT _seed_trans('common.close', '00000000-0000-0000-0001-000000000001'::uuid, '닫기', 'Close');
SELECT _seed_trans('common.confirm', '00000000-0000-0000-0001-000000000001'::uuid, '확인', 'Confirm');
SELECT _seed_trans('common.delete', '00000000-0000-0000-0001-000000000001'::uuid, '삭제', 'Delete');
SELECT _seed_trans('common.edit', '00000000-0000-0000-0001-000000000001'::uuid, '수정', 'Edit');
SELECT _seed_trans('common.email', '00000000-0000-0000-0001-000000000001'::uuid, '이메일', 'Email');
SELECT _seed_trans('common.filter', '00000000-0000-0000-0001-000000000001'::uuid, '필터', 'Filter');
SELECT _seed_trans('common.loading', '00000000-0000-0000-0001-000000000001'::uuid, '로딩 중...', 'Loading...');
SELECT _seed_trans('common.next', '00000000-0000-0000-0001-000000000001'::uuid, '다음', 'Next');
SELECT _seed_trans('common.no', '00000000-0000-0000-0001-000000000001'::uuid, '아니오', 'No');
SELECT _seed_trans('common.noData', '00000000-0000-0000-0001-000000000001'::uuid, '데이터가 없습니다.', 'No data available.');
SELECT _seed_trans('common.optional', '00000000-0000-0000-0001-000000000001'::uuid, '선택', 'Optional');
SELECT _seed_trans('common.previous', '00000000-0000-0000-0001-000000000001'::uuid, '이전', 'Previous');
SELECT _seed_trans('common.processing', '00000000-0000-0000-0001-000000000001'::uuid, '처리 중...', 'Processing...');
SELECT _seed_trans('common.required', '00000000-0000-0000-0001-000000000001'::uuid, '필수', 'Required');
SELECT _seed_trans('common.reset', '00000000-0000-0000-0001-000000000001'::uuid, '초기화', 'Reset');
SELECT _seed_trans('common.save', '00000000-0000-0000-0001-000000000001'::uuid, '저장', 'Save');
SELECT _seed_trans('common.search', '00000000-0000-0000-0001-000000000001'::uuid, '검색', 'Search');
SELECT _seed_trans('common.yes', '00000000-0000-0000-0001-000000000001'::uuid, '예', 'Yes');
SELECT _seed_trans('common.goHome', '00000000-0000-0000-0001-000000000001'::uuid, '홈으로', 'Go Home');

-- 홈 페이지
SELECT _seed_trans('home.liveBadge', '00000000-0000-0000-0001-000000000001'::uuid, '🔴 실시간', '🔴 LIVE');
SELECT _seed_trans('home.heroTitle1', '00000000-0000-0000-0001-000000000001'::uuid, '청중과의', 'Engage Your');
SELECT _seed_trans('home.heroTitle2', '00000000-0000-0000-0001-000000000001'::uuid, '실시간 소통을', 'Audience in');
SELECT _seed_trans('home.heroTitle3', '00000000-0000-0000-0001-000000000001'::uuid, '시작하세요', 'Real-Time');
SELECT _seed_trans('home.heroDesc', '00000000-0000-0000-0001-000000000001'::uuid, '강연, 세미나, 워크숍에서 청중과 실시간으로 소통하세요. Q&A, 설문, 투표 기능으로 참여도를 높이세요.', 'Connect with your audience in real-time during lectures, seminars, and workshops. Boost engagement with Q&A, polls, and voting features.');
SELECT _seed_trans('home.watchDemo', '00000000-0000-0000-0001-000000000001'::uuid, '데모 보기', 'Watch Demo');
SELECT _seed_trans('home.getStartedFree', '00000000-0000-0000-0001-000000000001'::uuid, '무료로 시작하기', 'Get Started Free');
SELECT _seed_trans('home.ctaTitle', '00000000-0000-0000-0001-000000000001'::uuid, '지금 바로 시작하세요', 'Get Started Today');
SELECT _seed_trans('home.ctaDesc', '00000000-0000-0000-0001-000000000001'::uuid, '무료로 시작하고, 청중과의 소통을 혁신하세요.', 'Start for free and revolutionize how you connect with your audience.');

-- 네비게이션
SELECT _seed_trans('nav.getStartedFree', '00000000-0000-0000-0001-000000000001'::uuid, '무료로 시작', 'Get Started Free');
SELECT _seed_trans('nav.features', '00000000-0000-0000-0001-000000000001'::uuid, '기능', 'Features');
SELECT _seed_trans('nav.pricing', '00000000-0000-0000-0001-000000000001'::uuid, '요금제', 'Pricing');
SELECT _seed_trans('nav.about', '00000000-0000-0000-0001-000000000001'::uuid, '소개', 'About');
SELECT _seed_trans('nav.mypage', '00000000-0000-0000-0001-000000000001'::uuid, '마이페이지', 'My Page');
SELECT _seed_trans('nav.partnerCenter', '00000000-0000-0000-0001-000000000001'::uuid, '파트너 센터', 'Partner Center');
SELECT _seed_trans('nav.adminPage', '00000000-0000-0000-0001-000000000001'::uuid, '관리자 페이지', 'Admin Page');

-- 푸터
SELECT _seed_trans('footer.product', '00000000-0000-0000-0001-000000000001'::uuid, '제품', 'Product');
SELECT _seed_trans('footer.features', '00000000-0000-0000-0001-000000000001'::uuid, '기능', 'Features');
SELECT _seed_trans('footer.feature', '00000000-0000-0000-0001-000000000001'::uuid, '기능', 'Features');
SELECT _seed_trans('footer.pricing', '00000000-0000-0000-0001-000000000001'::uuid, '요금제', 'Pricing');
SELECT _seed_trans('footer.case', '00000000-0000-0000-0001-000000000001'::uuid, '사례', 'Case Studies');
SELECT _seed_trans('footer.support', '00000000-0000-0000-0001-000000000001'::uuid, '지원', 'Support');
SELECT _seed_trans('footer.help', '00000000-0000-0000-0001-000000000001'::uuid, '도움말', 'Help Center');
SELECT _seed_trans('footer.contact', '00000000-0000-0000-0001-000000000001'::uuid, '문의하기', 'Contact Us');
SELECT _seed_trans('footer.faq', '00000000-0000-0000-0001-000000000001'::uuid, 'FAQ', 'FAQ');
SELECT _seed_trans('footer.company', '00000000-0000-0000-0001-000000000001'::uuid, '회사', 'Company');
SELECT _seed_trans('footer.about', '00000000-0000-0000-0001-000000000001'::uuid, '회사 소개', 'About Us');
SELECT _seed_trans('footer.blog', '00000000-0000-0000-0001-000000000001'::uuid, '블로그', 'Blog');
SELECT _seed_trans('footer.career', '00000000-0000-0000-0001-000000000001'::uuid, '채용', 'Careers');
SELECT _seed_trans('footer.copyright', '00000000-0000-0000-0001-000000000001'::uuid, '© 2024 LivePulse. All rights reserved.', '© 2024 LivePulse. All rights reserved.');

-- 헤더
SELECT _seed_trans('header.openMenu', '00000000-0000-0000-0001-000000000001'::uuid, '메뉴 열기', 'Open Menu');
SELECT _seed_trans('header.expandSidebar', '00000000-0000-0000-0001-000000000001'::uuid, '사이드바 확장', 'Expand Sidebar');
SELECT _seed_trans('header.collapseSidebar', '00000000-0000-0000-0001-000000000001'::uuid, '사이드바 축소', 'Collapse Sidebar');

-- 마이페이지
SELECT _seed_trans('mypage.title', '00000000-0000-0000-0001-000000000001'::uuid, '마이페이지', 'My Page');
SELECT _seed_trans('mypage.myInfo', '00000000-0000-0000-0001-000000000001'::uuid, '내 정보', 'My Information');
SELECT _seed_trans('mypage.myInfoDesc', '00000000-0000-0000-0001-000000000001'::uuid, '계정 정보를 확인하세요.', 'View your account information.');
SELECT _seed_trans('mypage.email', '00000000-0000-0000-0001-000000000001'::uuid, '이메일', 'Email');
SELECT _seed_trans('mypage.memberType', '00000000-0000-0000-0001-000000000001'::uuid, '회원 유형', 'Member Type');
SELECT _seed_trans('mypage.generalMember', '00000000-0000-0000-0001-000000000001'::uuid, '일반 회원', 'General Member');
SELECT _seed_trans('mypage.joinDate', '00000000-0000-0000-0001-000000000001'::uuid, '가입일', 'Join Date');
SELECT _seed_trans('mypage.applyPartner', '00000000-0000-0000-0001-000000000001'::uuid, '파트너 신청', 'Apply for Partner');
SELECT _seed_trans('mypage.applyPartnerDesc', '00000000-0000-0000-0001-000000000001'::uuid, '파트너가 되어 세션을 만들고 관리하세요.', 'Become a partner to create and manage sessions.');
SELECT _seed_trans('mypage.applyButton', '00000000-0000-0000-0001-000000000001'::uuid, '신청하기', 'Apply');
SELECT _seed_trans('mypage.applying', '00000000-0000-0000-0001-000000000001'::uuid, '신청 중...', 'Applying...');
SELECT _seed_trans('mypage.applySuccess', '00000000-0000-0000-0001-000000000001'::uuid, '파트너 신청이 완료되었습니다.', 'Partner application submitted successfully.');
SELECT _seed_trans('mypage.applyError', '00000000-0000-0000-0001-000000000001'::uuid, '신청 중 오류가 발생했습니다.', 'An error occurred during application.');
SELECT _seed_trans('mypage.dialogDesc', '00000000-0000-0000-0001-000000000001'::uuid, '파트너 신청 정보를 입력해주세요.', 'Please enter your partner application information.');
SELECT _seed_trans('mypage.nameRequired', '00000000-0000-0000-0001-000000000001'::uuid, '이름을 입력해주세요.', 'Please enter your name.');
SELECT _seed_trans('mypage.namePlaceholder', '00000000-0000-0000-0001-000000000001'::uuid, '홍길동', 'John Doe');
SELECT _seed_trans('mypage.phoneRequired', '00000000-0000-0000-0001-000000000001'::uuid, '연락처를 입력해주세요.', 'Please enter your phone number.');
SELECT _seed_trans('mypage.phoneInvalid', '00000000-0000-0000-0001-000000000001'::uuid, '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)', 'Invalid phone number format. (e.g. 010-1234-5678)');
SELECT _seed_trans('mypage.phoneDuplicate', '00000000-0000-0000-0001-000000000001'::uuid, '이미 등록된 연락처입니다.', 'This phone number is already registered.');
SELECT _seed_trans('mypage.phonePlaceholder', '00000000-0000-0000-0001-000000000001'::uuid, '010-1234-5678', '010-1234-5678');
SELECT _seed_trans('mypage.purposeRequired', '00000000-0000-0000-0001-000000000001'::uuid, '사용 목적을 입력해주세요.', 'Please enter your purpose.');
SELECT _seed_trans('mypage.purposeMinLength', '00000000-0000-0000-0001-000000000001'::uuid, '사용 목적은 최소 10자 이상 입력해주세요.', 'Purpose must be at least 10 characters.');
SELECT _seed_trans('mypage.purposePlaceholder', '00000000-0000-0000-0001-000000000001'::uuid, '서비스 사용 목적을 상세히 작성해주세요.', 'Please describe your purpose in detail.');
SELECT _seed_trans('mypage.companyPlaceholder', '00000000-0000-0000-0001-000000000001'::uuid, '회사명 또는 단체명', 'Company or Organization Name');
SELECT _seed_trans('mypage.businessNumberPlaceholder', '00000000-0000-0000-0001-000000000001'::uuid, '123-45-67890', '123-45-67890');
SELECT _seed_trans('mypage.pendingReview', '00000000-0000-0000-0001-000000000001'::uuid, '심사 대기중', 'Pending Review');
SELECT _seed_trans('mypage.pendingReviewDesc', '00000000-0000-0000-0001-000000000001'::uuid, '관리자가 신청 내용을 검토 중입니다.', 'Your application is being reviewed by an administrator.');
SELECT _seed_trans('mypage.approvedDesc', '00000000-0000-0000-0001-000000000001'::uuid, '파트너 신청이 승인되었습니다. 파트너 센터를 이용하실 수 있습니다.', 'Your partner application has been approved. You can now access the Partner Center.');
SELECT _seed_trans('mypage.rejectedDesc', '00000000-0000-0000-0001-000000000001'::uuid, '파트너 신청이 거부되었습니다.', 'Your partner application has been rejected.');
SELECT _seed_trans('mypage.requestDate', '00000000-0000-0000-0001-000000000001'::uuid, '신청일', 'Request Date');
SELECT _seed_trans('mypage.displayNameRequired', '00000000-0000-0000-0001-000000000001'::uuid, '활동명을 입력해주세요.', 'Please enter your display name.');

-- 공용 필드
SELECT _seed_trans('common.displayName', '00000000-0000-0000-0001-000000000001'::uuid, '사용자명', 'Display Name');

-- 프로필 페이지
SELECT _seed_trans('profile.title', '00000000-0000-0000-0001-000000000001'::uuid, '내 정보', 'My Profile');
SELECT _seed_trans('profile.desc', '00000000-0000-0000-0001-000000000001'::uuid, '계정 정보를 확인하고 관리하세요.', 'View and manage your account information.');
SELECT _seed_trans('profile.basicInfo', '00000000-0000-0000-0001-000000000001'::uuid, '기본 정보', 'Basic Information');
SELECT _seed_trans('profile.accountInfo', '00000000-0000-0000-0001-000000000001'::uuid, '계정에 등록된 정보입니다.', 'Information registered to your account.');
SELECT _seed_trans('profile.changePassword', '00000000-0000-0000-0001-000000000001'::uuid, '비밀번호 변경', 'Change Password');
SELECT _seed_trans('profile.securitySettings', '00000000-0000-0000-0001-000000000001'::uuid, '보안을 위해 정기적으로 비밀번호를 변경해주세요.', 'Please change your password regularly for security.');
SELECT _seed_trans('profile.currentPassword', '00000000-0000-0000-0001-000000000001'::uuid, '현재 비밀번호', 'Current Password');
SELECT _seed_trans('profile.newPassword', '00000000-0000-0000-0001-000000000001'::uuid, '새 비밀번호', 'New Password');
SELECT _seed_trans('profile.confirmNewPassword', '00000000-0000-0000-0001-000000000001'::uuid, '새 비밀번호 확인', 'Confirm New Password');

