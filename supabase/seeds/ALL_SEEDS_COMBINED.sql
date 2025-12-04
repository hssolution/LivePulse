-- =====================================================
-- 시스템 설정 (app_config)
-- =====================================================
-- admin_initialized는 첫 번째 사용자 가입 시 자동 생성되므로 제외
INSERT INTO public.app_config (key, value) VALUES
  ('site_name', 'LivePulse'),
  ('default_language', 'ko')
ON CONFLICT (key) DO NOTHING;



-- =====================================================
-- 언어 설정 (languages)
-- =====================================================
INSERT INTO public.languages (code, name, native_name, is_default, is_active, sort_order) VALUES
  ('ko', 'Korean', '한국어', true, true, 1),
  ('en', 'English', 'English', false, true, 2)
ON CONFLICT (code) DO NOTHING;



-- =====================================================
-- 언어팩 카테고리 (language_categories)
-- =====================================================
INSERT INTO public.language_categories (id, name, description, sort_order) VALUES
  ('00000000-0000-0000-0001-000000000001', 'common', '공통 UI 요소', 1),
  ('00000000-0000-0000-0001-000000000002', 'auth', '인증 관련', 2),
  ('00000000-0000-0000-0001-000000000003', 'admin', '관리자 페이지', 3),
  ('00000000-0000-0000-0001-000000000004', 'partner', '파트너 페이지', 4),
  ('00000000-0000-0000-0001-000000000005', 'session', '세션/강의 관련', 5),
  ('00000000-0000-0000-0001-000000000006', 'error', '에러 메시지', 6)
ON CONFLICT (id) DO NOTHING;



-- =====================================================
-- 헬퍼 함수 생성 (번역 삽입용)
-- =====================================================
CREATE OR REPLACE FUNCTION _seed_trans(p_key TEXT, p_cat_id UUID, p_ko TEXT, p_en TEXT)
RETURNS VOID AS $$
DECLARE v_key_id UUID;
BEGIN
  INSERT INTO public.language_keys (key, category_id) VALUES (p_key, p_cat_id)
  ON CONFLICT (key) DO UPDATE SET category_id = p_cat_id
  RETURNING id INTO v_key_id;
  
  INSERT INTO public.translations (key_id, language_code, value) VALUES (v_key_id, 'ko', p_ko)
  ON CONFLICT (key_id, language_code) DO UPDATE SET value = p_ko;
  
  INSERT INTO public.translations (key_id, language_code, value) VALUES (v_key_id, 'en', p_en)
  ON CONFLICT (key_id, language_code) DO UPDATE SET value = p_en;
END;
$$ LANGUAGE plpgsql;



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



-- =====================================================
-- 인증 번역 (auth)
-- =====================================================
SELECT _seed_trans('auth.login', '00000000-0000-0000-0001-000000000002'::uuid, '로그인', 'Login');
SELECT _seed_trans('auth.logout', '00000000-0000-0000-0001-000000000002'::uuid, '로그아웃', 'Logout');
SELECT _seed_trans('auth.signup', '00000000-0000-0000-0001-000000000002'::uuid, '회원가입', 'Sign Up');
SELECT _seed_trans('auth.email', '00000000-0000-0000-0001-000000000002'::uuid, '이메일', 'Email');
SELECT _seed_trans('auth.password', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호', 'Password');
SELECT _seed_trans('auth.confirmPassword', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호 확인', 'Confirm Password');
SELECT _seed_trans('auth.forgotPassword', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호를 잊으셨나요?', 'Forgot password?');
SELECT _seed_trans('auth.resetPassword', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호 재설정', 'Reset Password');
SELECT _seed_trans('auth.backToHome', '00000000-0000-0000-0001-000000000002'::uuid, '← 홈으로', '← Back to Home');
SELECT _seed_trans('auth.createAdminAccount', '00000000-0000-0000-0001-000000000002'::uuid, '관리자 계정 생성', 'Create Admin Account');
SELECT _seed_trans('auth.createAccount', '00000000-0000-0000-0001-000000000002'::uuid, '계정 생성', 'Create Account');
SELECT _seed_trans('auth.agreeTerms', '00000000-0000-0000-0001-000000000002'::uuid, '가입 시 이용약관 및 개인정보처리방침에 동의합니다.', 'By signing up, you agree to our Terms of Service and Privacy Policy.');
SELECT _seed_trans('auth.termsOfService', '00000000-0000-0000-0001-000000000002'::uuid, '이용약관', 'Terms of Service');
SELECT _seed_trans('auth.privacyPolicy', '00000000-0000-0000-0001-000000000002'::uuid, '개인정보처리방침', 'Privacy Policy');
SELECT _seed_trans('auth.noAccount', '00000000-0000-0000-0001-000000000002'::uuid, '계정이 없으신가요?', 'Don''t have an account?');
SELECT _seed_trans('auth.alreadyHaveAccount', '00000000-0000-0000-0001-000000000002'::uuid, '이미 계정이 있으신가요?', 'Already have an account?');
SELECT _seed_trans('auth.loginSuccess', '00000000-0000-0000-0001-000000000002'::uuid, '로그인되었습니다.', 'Successfully logged in.');
SELECT _seed_trans('auth.logoutSuccess', '00000000-0000-0000-0001-000000000002'::uuid, '로그아웃되었습니다.', 'Successfully logged out.');
SELECT _seed_trans('auth.signupSuccess', '00000000-0000-0000-0001-000000000002'::uuid, '회원가입이 완료되었습니다.', 'Successfully signed up.');
SELECT _seed_trans('auth.invalidCredentials', '00000000-0000-0000-0001-000000000002'::uuid, '이메일 또는 비밀번호가 올바르지 않습니다.', 'Invalid email or password.');
SELECT _seed_trans('auth.emailRequired', '00000000-0000-0000-0001-000000000002'::uuid, '이메일을 입력해주세요.', 'Please enter your email.');
SELECT _seed_trans('auth.passwordRequired', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호를 입력해주세요.', 'Please enter your password.');
SELECT _seed_trans('auth.passwordMismatch', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호가 일치하지 않습니다.', 'Passwords do not match.');

-- 이메일 인증 안내
SELECT _seed_trans('auth.emailSentTitle', '00000000-0000-0000-0001-000000000002'::uuid, '인증 메일이 발송되었습니다!', 'Verification Email Sent!');
SELECT _seed_trans('auth.emailSentDesc', '00000000-0000-0000-0001-000000000002'::uuid, '{email}로 인증 메일을 보냈습니다. 메일함을 확인하고 인증 링크를 클릭해주세요.', 'We''ve sent a verification email to {email}. Please check your inbox and click the verification link.');
SELECT _seed_trans('auth.emailSentTip1', '00000000-0000-0000-0001-000000000002'::uuid, '메일이 보이지 않으면 스팸함을 확인해주세요.', 'If you don''t see the email, check your spam folder.');
SELECT _seed_trans('auth.emailSentTip2', '00000000-0000-0000-0001-000000000002'::uuid, '인증 링크는 24시간 동안 유효합니다.', 'The verification link is valid for 24 hours.');
SELECT _seed_trans('auth.emailSentTip3', '00000000-0000-0000-0001-000000000002'::uuid, '인증 완료 후 로그인할 수 있습니다.', 'You can log in after verification.');



-- =====================================================
-- 관리자 번역 (admin)
-- =====================================================
SELECT _seed_trans('admin.dashboard', '00000000-0000-0000-0001-000000000003'::uuid, '대시보드', 'Dashboard');
SELECT _seed_trans('admin.helloUser', '00000000-0000-0000-0001-000000000003'::uuid, '안녕하세요, {name}님!', 'Hello, {name}!');
SELECT _seed_trans('admin.userManagement', '00000000-0000-0000-0001-000000000003'::uuid, '회원 관리', 'User Management');
SELECT _seed_trans('admin.manageUsers', '00000000-0000-0000-0001-000000000003'::uuid, '시스템 사용자를 관리합니다.', 'Manage system users.');
SELECT _seed_trans('admin.totalUsers', '00000000-0000-0000-0001-000000000003'::uuid, '전체 회원', 'Total Users');
SELECT _seed_trans('admin.activeUsers', '00000000-0000-0000-0001-000000000003'::uuid, '활성 회원', 'Active Users');
SELECT _seed_trans('admin.users', '00000000-0000-0000-0001-000000000003'::uuid, '회원 관리', 'User Management');
SELECT _seed_trans('admin.partners', '00000000-0000-0000-0001-000000000003'::uuid, '파트너', 'Partners');
SELECT _seed_trans('admin.settings', '00000000-0000-0000-0001-000000000003'::uuid, '설정', 'Settings');
SELECT _seed_trans('admin.system', '00000000-0000-0000-0001-000000000003'::uuid, '시스템', 'System');
SELECT _seed_trans('admin.languagePack', '00000000-0000-0000-0001-000000000003'::uuid, '언어팩 관리', 'Language Pack');
SELECT _seed_trans('admin.partnerRequestsTitle', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청 관리', 'Partner Request Management');
SELECT _seed_trans('admin.partnerRequestsDesc', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청을 검토하고 승인/거부합니다.', 'Review and approve/reject partner applications.');
SELECT _seed_trans('admin.partnerRequests', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청', 'Partner Requests');
SELECT _seed_trans('admin.pendingRequests', '00000000-0000-0000-0001-000000000003'::uuid, '대기중', 'Pending');
SELECT _seed_trans('admin.approvedRequests', '00000000-0000-0000-0001-000000000003'::uuid, '승인됨', 'Approved');
SELECT _seed_trans('admin.rejectedRequests', '00000000-0000-0000-0001-000000000003'::uuid, '거부됨', 'Rejected');
SELECT _seed_trans('admin.noRequests', '00000000-0000-0000-0001-000000000003'::uuid, '신청 내역이 없습니다.', 'No requests found.');
SELECT _seed_trans('admin.viewAll', '00000000-0000-0000-0001-000000000003'::uuid, '상세', 'View');
SELECT _seed_trans('admin.requestDate', '00000000-0000-0000-0001-000000000003'::uuid, '신청일', 'Request Date');
SELECT _seed_trans('admin.approve', '00000000-0000-0000-0001-000000000003'::uuid, '승인', 'Approve');
SELECT _seed_trans('admin.reject', '00000000-0000-0000-0001-000000000003'::uuid, '거부', 'Reject');
SELECT _seed_trans('admin.rejectReason', '00000000-0000-0000-0001-000000000003'::uuid, '거부 사유', 'Rejection Reason');
SELECT _seed_trans('admin.rejectConfirm', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청 거부', 'Reject Partner Application');
SELECT _seed_trans('admin.rejectReasonPlaceholder', '00000000-0000-0000-0001-000000000003'::uuid, '거부 사유를 입력해주세요.', 'Please enter the reason for rejection.');
SELECT _seed_trans('admin.partnerList', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 목록', 'Partner List');
SELECT _seed_trans('admin.partnerListDesc', '00000000-0000-0000-0001-000000000003'::uuid, '승인된 파트너를 관리합니다.', 'Manage approved partners.');
SELECT _seed_trans('admin.partnersCount', '00000000-0000-0000-0001-000000000003'::uuid, '명', 'partners');
SELECT _seed_trans('admin.noPartners', '00000000-0000-0000-0001-000000000003'::uuid, '등록된 파트너가 없습니다.', 'No partners registered.');
SELECT _seed_trans('admin.partnerDetail', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 상세 정보', 'Partner Details');
SELECT _seed_trans('admin.partnerDetailDesc', '00000000-0000-0000-0001-000000000003'::uuid, '파트너의 상세 정보를 확인합니다.', 'View partner details.');
SELECT _seed_trans('admin.registeredDate', '00000000-0000-0000-0001-000000000003'::uuid, '등록일', 'Registered Date');

-- 메뉴
SELECT _seed_trans('menu.dashboard', '00000000-0000-0000-0001-000000000003'::uuid, '대시보드', 'Dashboard');
SELECT _seed_trans('menu.profile', '00000000-0000-0000-0001-000000000003'::uuid, '내 정보', 'My Profile');
SELECT _seed_trans('menu.posts', '00000000-0000-0000-0001-000000000003'::uuid, '게시글 관리', 'Posts');
SELECT _seed_trans('menu.support', '00000000-0000-0000-0001-000000000003'::uuid, '문의/지원', 'Support');
SELECT _seed_trans('menu.settings', '00000000-0000-0000-0001-000000000003'::uuid, '설정', 'Settings');
SELECT _seed_trans('menu.users', '00000000-0000-0000-0001-000000000003'::uuid, '회원 관리', 'User Management');
SELECT _seed_trans('menu.partnerRequests', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청 관리', 'Partner Requests');
SELECT _seed_trans('menu.partnerList', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 목록', 'Partner List');
SELECT _seed_trans('menu.system', '00000000-0000-0000-0001-000000000003'::uuid, '시스템', 'System');
SELECT _seed_trans('menu.database', '00000000-0000-0000-0001-000000000003'::uuid, '데이터베이스', 'Database');
SELECT _seed_trans('menu.logs', '00000000-0000-0000-0001-000000000003'::uuid, '로그 관리', 'Logs');
SELECT _seed_trans('menu.backup', '00000000-0000-0000-0001-000000000003'::uuid, '백업 관리', 'Backup');
SELECT _seed_trans('menu.languagePack', '00000000-0000-0000-0001-000000000003'::uuid, '언어팩 관리', 'Language Pack');
SELECT _seed_trans('menu.profileTest', '00000000-0000-0000-0001-000000000003'::uuid, '프로필 테스트', 'Profile Test');
SELECT _seed_trans('menu.templateManagement', '00000000-0000-0000-0001-000000000003'::uuid, '템플릿 관리', 'Template Management');
SELECT _seed_trans('menu.templateMain', '00000000-0000-0000-0001-000000000003'::uuid, '메인 화면', 'Main Screen');
SELECT _seed_trans('menu.templateQnA', '00000000-0000-0000-0001-000000000003'::uuid, '질문 화면', 'Q&A Screen');
SELECT _seed_trans('menu.templatePoll', '00000000-0000-0000-0001-000000000003'::uuid, '설문 화면', 'Poll Screen');
SELECT _seed_trans('title.adminPanel', '00000000-0000-0000-0001-000000000003'::uuid, '관리자 패널', 'Admin Panel');

-- 템플릿 화면 유형
SELECT _seed_trans('template.mainScreen', '00000000-0000-0000-0001-000000000003'::uuid, '메인 화면 템플릿', 'Main Screen Templates');
SELECT _seed_trans('template.mainScreenDesc', '00000000-0000-0000-0001-000000000003'::uuid, '세션 참여 페이지에 표시되는 메인 화면 템플릿을 관리합니다.', 'Manage main screen templates displayed on session join pages.');
SELECT _seed_trans('template.qnaScreen', '00000000-0000-0000-0001-000000000003'::uuid, '질문 화면 템플릿', 'Q&A Screen Templates');
SELECT _seed_trans('template.qnaScreenDesc', '00000000-0000-0000-0001-000000000003'::uuid, '질문 송출 시 프로젝터/대형 스크린에 표시되는 템플릿을 관리합니다.', 'Manage templates displayed on projectors/large screens during Q&A broadcast.');
SELECT _seed_trans('template.pollScreen', '00000000-0000-0000-0001-000000000003'::uuid, '설문 화면 템플릿', 'Poll Screen Templates');
SELECT _seed_trans('template.pollScreenDesc', '00000000-0000-0000-0001-000000000003'::uuid, '설문 진행 시 표시되는 화면 템플릿을 관리합니다.', 'Manage screen templates displayed during polls.');



-- =====================================================
-- 파트너 번역 (partner)
-- =====================================================
SELECT _seed_trans('partner.partner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너', 'Partner');
SELECT _seed_trans('partner.dashboard', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 대시보드', 'Partner Dashboard');
SELECT _seed_trans('partner.name', '00000000-0000-0000-0001-000000000004'::uuid, '이름', 'Name');
SELECT _seed_trans('partner.phone', '00000000-0000-0000-0001-000000000004'::uuid, '연락처', 'Phone');
SELECT _seed_trans('partner.purpose', '00000000-0000-0000-0001-000000000004'::uuid, '사용 목적', 'Purpose');
SELECT _seed_trans('partner.companyName', '00000000-0000-0000-0001-000000000004'::uuid, '소속/회사명', 'Company Name');
SELECT _seed_trans('partner.companyOrOrg', '00000000-0000-0000-0001-000000000004'::uuid, '회사/단체명', 'Company/Organization');
SELECT _seed_trans('partner.businessNumber', '00000000-0000-0000-0001-000000000004'::uuid, '사업자번호', 'Business Number');
SELECT _seed_trans('partner.apply', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 신청', 'Apply for Partner');
SELECT _seed_trans('partner.applyDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너로 등록하면 세션을 만들고 청중과 실시간으로 소통할 수 있습니다.', 'As a partner, you can create sessions and interact with your audience in real-time.');
SELECT _seed_trans('partner.applySuccess', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 신청이 완료되었습니다!', 'Partner application submitted!');
SELECT _seed_trans('partner.pendingDesc', '00000000-0000-0000-0001-000000000004'::uuid, '관리자가 신청 내용을 검토하고 있습니다.', 'Your application is being reviewed by admin.');
SELECT _seed_trans('partner.statusPending', '00000000-0000-0000-0001-000000000004'::uuid, '검토 중', 'Pending');
SELECT _seed_trans('partner.statusApproved', '00000000-0000-0000-0001-000000000004'::uuid, '승인됨', 'Approved');
SELECT _seed_trans('partner.statusRejected', '00000000-0000-0000-0001-000000000004'::uuid, '거부됨', 'Rejected');
SELECT _seed_trans('partner.type', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 유형', 'Partner Type');
SELECT _seed_trans('partner.typeOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사자', 'Organizer');
SELECT _seed_trans('partner.typeAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행업체', 'Agency');
SELECT _seed_trans('partner.typeInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자', 'Instructor');
SELECT _seed_trans('partner.industry', '00000000-0000-0000-0001-000000000004'::uuid, '업종/분야', 'Industry');
SELECT _seed_trans('partner.industryPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: IT, 교육, 마케팅', 'e.g. IT, Education, Marketing');
SELECT _seed_trans('partner.expectedScale', '00000000-0000-0000-0001-000000000004'::uuid, '예상 규모', 'Expected Scale');
SELECT _seed_trans('partner.selectScale', '00000000-0000-0000-0001-000000000004'::uuid, '규모를 선택하세요', 'Select scale');
SELECT _seed_trans('partner.scaleSmall', '00000000-0000-0000-0001-000000000004'::uuid, '소규모 (50명 이하)', 'Small (under 50)');
SELECT _seed_trans('partner.scaleMedium', '00000000-0000-0000-0001-000000000004'::uuid, '중규모 (50-200명)', 'Medium (50-200)');
SELECT _seed_trans('partner.scaleLarge', '00000000-0000-0000-0001-000000000004'::uuid, '대규모 (200-500명)', 'Large (200-500)');
SELECT _seed_trans('partner.scaleEnterprise', '00000000-0000-0000-0001-000000000004'::uuid, '엔터프라이즈 (500명 이상)', 'Enterprise (500+)');
SELECT _seed_trans('partner.clientType', '00000000-0000-0000-0001-000000000004'::uuid, '주요 클라이언트 유형', 'Main Client Type');
SELECT _seed_trans('partner.clientTypePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: 기업, 학교, 공공기관', 'e.g. Corporate, School, Government');
SELECT _seed_trans('partner.displayName', '00000000-0000-0000-0001-000000000004'::uuid, '활동명/닉네임', 'Display Name');
SELECT _seed_trans('partner.displayNamePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '강의 시 사용할 이름', 'Name to use during sessions');
SELECT _seed_trans('partner.specialty', '00000000-0000-0000-0001-000000000004'::uuid, '전문 분야', 'Specialty');
SELECT _seed_trans('partner.specialtyPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: 리더십, 커뮤니케이션, 기술', 'e.g. Leadership, Communication, Tech');
SELECT _seed_trans('partner.bio', '00000000-0000-0000-0001-000000000004'::uuid, '소개', 'Bio');
SELECT _seed_trans('partner.bioPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '간단한 자기소개를 작성해주세요', 'Write a brief introduction');
SELECT _seed_trans('partner.active', '00000000-0000-0000-0001-000000000004'::uuid, '활성', 'Active');
SELECT _seed_trans('partner.inactive', '00000000-0000-0000-0001-000000000004'::uuid, '비활성', 'Inactive');
SELECT _seed_trans('partner.activate', '00000000-0000-0000-0001-000000000004'::uuid, '활성화', 'Activate');
SELECT _seed_trans('partner.deactivate', '00000000-0000-0000-0001-000000000004'::uuid, '비활성화', 'Deactivate');
SELECT _seed_trans('partner.activated', '00000000-0000-0000-0001-000000000004'::uuid, '파트너가 활성화되었습니다.', 'Partner has been activated.');
SELECT _seed_trans('partner.deactivated', '00000000-0000-0000-0001-000000000004'::uuid, '파트너가 비활성화되었습니다.', 'Partner has been deactivated.');
SELECT _seed_trans('partner.activateConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 활성화', 'Activate Partner');
SELECT _seed_trans('partner.deactivateConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 비활성화', 'Deactivate Partner');
SELECT _seed_trans('partner.activateDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 파트너를 활성화하시겠습니까? 파트너 기능을 다시 사용할 수 있습니다.', 'Are you sure you want to activate this partner? They will be able to use partner features again.');
SELECT _seed_trans('partner.deactivateDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 파트너를 비활성화하시겠습니까? 파트너 기능이 일시 중단됩니다.', 'Are you sure you want to deactivate this partner? Partner features will be suspended.');
SELECT _seed_trans('mypage.companyRequired', '00000000-0000-0000-0001-000000000004'::uuid, '회사/단체명을 입력해주세요.', 'Please enter company/organization name.');
SELECT _seed_trans('mypage.businessNumberRequired', '00000000-0000-0000-0001-000000000004'::uuid, '사업자번호를 입력해주세요.', 'Please enter business number.');
SELECT _seed_trans('title.partnerCenter', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 센터', 'Partner Center');

-- 파트너 정보 팝업
SELECT _seed_trans('partner.info', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('partner.representativeName', '00000000-0000-0000-0001-000000000004'::uuid, '대표자명', 'Representative Name');
SELECT _seed_trans('partner.address', '00000000-0000-0000-0001-000000000004'::uuid, '주소', 'Address');
SELECT _seed_trans('partner.joinedAt', '00000000-0000-0000-0001-000000000004'::uuid, '가입일', 'Joined At');
SELECT _seed_trans('partner.statusActive', '00000000-0000-0000-0001-000000000004'::uuid, '활성', 'Active');
SELECT _seed_trans('partner.statusInactive', '00000000-0000-0000-0001-000000000004'::uuid, '비활성', 'Inactive');
SELECT _seed_trans('common.email', '00000000-0000-0000-0001-000000000001'::uuid, '이메일', 'Email');
SELECT _seed_trans('common.phone', '00000000-0000-0000-0001-000000000001'::uuid, '전화번호', 'Phone');

-- 파트너 정보 수정 페이지
SELECT _seed_trans('menu.partnerProfile', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('partner.profileTitle', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보 관리', 'Partner Profile');
SELECT _seed_trans('partner.profileDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보를 확인하고 수정하세요.', 'View and edit your partner information.');
SELECT _seed_trans('partner.basicInfo', '00000000-0000-0000-0001-000000000004'::uuid, '기본 정보', 'Basic Information');
SELECT _seed_trans('partner.basicInfoDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 계정의 기본 정보입니다.', 'Basic information for your partner account.');
SELECT _seed_trans('partner.organizerInfo', '00000000-0000-0000-0001-000000000004'::uuid, '행사자 정보', 'Organizer Information');
SELECT _seed_trans('partner.agencyInfo', '00000000-0000-0000-0001-000000000004'::uuid, '대행업체 정보', 'Agency Information');
SELECT _seed_trans('partner.instructorInfo', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 정보', 'Instructor Information');
SELECT _seed_trans('partner.roleOwner', '00000000-0000-0000-0001-000000000004'::uuid, '소유자', 'Owner');
SELECT _seed_trans('partner.roleMember', '00000000-0000-0000-0001-000000000004'::uuid, '팀원', 'Member');
SELECT _seed_trans('partner.viewOnlyNotice', '00000000-0000-0000-0001-000000000004'::uuid, '팀원은 파트너 정보를 조회만 할 수 있습니다. 수정은 소유자만 가능합니다.', 'Team members can only view partner information. Only the owner can edit.');
SELECT _seed_trans('partner.noEditPermission', '00000000-0000-0000-0001-000000000004'::uuid, '수정 권한이 없습니다.', 'You do not have permission to edit.');
SELECT _seed_trans('partner.updateSuccess', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보가 수정되었습니다.', 'Partner information has been updated.');
SELECT _seed_trans('partner.notFound', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보를 찾을 수 없습니다.', 'Partner information not found.');
SELECT _seed_trans('partner.addressPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '주소를 입력하세요', 'Enter address');

-- 최초 접속 시 사용자명 입력
SELECT _seed_trans('partner.setupDisplayName', '00000000-0000-0000-0001-000000000004'::uuid, '사용자명 설정', 'Set Display Name');
SELECT _seed_trans('partner.setupDisplayNameDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 센터에서 사용할 이름을 설정해주세요. 다른 사용자에게 표시되는 이름입니다.', 'Please set a name to use in Partner Center. This name will be displayed to other users.');
SELECT _seed_trans('partner.displayNameUsage', '00000000-0000-0000-0001-000000000004'::uuid, '세션 및 협업 시 표시되는 이름입니다.', 'This name will be shown during sessions and collaborations.');



-- =====================================================
-- 세션 번역 (session)
-- =====================================================
SELECT _seed_trans('session.create', '00000000-0000-0000-0001-000000000005'::uuid, '세션 만들기', 'Create Session');
SELECT _seed_trans('session.createDesc', '00000000-0000-0000-0001-000000000005'::uuid, '새로운 세션을 만들어 청중과 소통하세요.', 'Create a new session to engage with your audience.');
SELECT _seed_trans('session.join', '00000000-0000-0000-0001-000000000005'::uuid, '세션 참여', 'Join Session');
SELECT _seed_trans('session.title', '00000000-0000-0000-0001-000000000005'::uuid, '세션 제목', 'Session Title');
SELECT _seed_trans('session.titlePlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '세션 제목을 입력하세요', 'Enter session title');
SELECT _seed_trans('session.description', '00000000-0000-0000-0001-000000000005'::uuid, '세션 설명', 'Session Description');
SELECT _seed_trans('session.descriptionPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '세션에 대한 설명을 입력하세요...', 'Enter a description for your session...');
SELECT _seed_trans('session.code', '00000000-0000-0000-0001-000000000005'::uuid, '세션 코드', 'Session Code');
SELECT _seed_trans('session.enterCode', '00000000-0000-0000-0001-000000000005'::uuid, '세션 코드를 입력하세요', 'Enter session code');
SELECT _seed_trans('session.start', '00000000-0000-0000-0001-000000000005'::uuid, '세션 시작', 'Start Session');
SELECT _seed_trans('session.end', '00000000-0000-0000-0001-000000000005'::uuid, '세션 종료', 'End Session');
SELECT _seed_trans('session.live', '00000000-0000-0000-0001-000000000005'::uuid, '라이브', 'LIVE');
SELECT _seed_trans('session.ended', '00000000-0000-0000-0001-000000000005'::uuid, '종료됨', 'Ended');
SELECT _seed_trans('session.participants', '00000000-0000-0000-0001-000000000005'::uuid, '참여자', 'Participants');
SELECT _seed_trans('session.questions', '00000000-0000-0000-0001-000000000005'::uuid, '질문', 'Questions');
SELECT _seed_trans('session.polls', '00000000-0000-0000-0001-000000000005'::uuid, '투표', 'Polls');
SELECT _seed_trans('session.poll', '00000000-0000-0000-0001-000000000005'::uuid, '설문', 'Poll');

-- 기본 정보
SELECT _seed_trans('session.basicInfo', '00000000-0000-0000-0001-000000000005'::uuid, '기본 정보', 'Basic Information');
SELECT _seed_trans('session.basicInfoDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션의 기본 정보를 입력하세요.', 'Enter the basic information for your session.');
SELECT _seed_trans('session.venueName', '00000000-0000-0000-0001-000000000005'::uuid, '장소명', 'Venue Name');
SELECT _seed_trans('session.venueAddress', '00000000-0000-0000-0001-000000000005'::uuid, '상세 주소', 'Address');
SELECT _seed_trans('session.venueNamePlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '예: 코엑스 그랜드볼룸', 'e.g., Grand Ballroom');
SELECT _seed_trans('session.venueAddressPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '예: 서울시 강남구 삼성동 159', 'e.g., 123 Main Street');
SELECT _seed_trans('session.startAt', '00000000-0000-0000-0001-000000000005'::uuid, '시작 일시', 'Start Date/Time');
SELECT _seed_trans('session.endAt', '00000000-0000-0000-0001-000000000005'::uuid, '종료 일시', 'End Date/Time');
SELECT _seed_trans('session.contactPhone', '00000000-0000-0000-0001-000000000005'::uuid, '대표 연락처', 'Contact Phone');
SELECT _seed_trans('session.contactEmail', '00000000-0000-0000-0001-000000000005'::uuid, '대표 이메일', 'Contact Email');
SELECT _seed_trans('session.maxParticipants', '00000000-0000-0000-0001-000000000005'::uuid, '최대 참여 인원', 'Max Participants');

-- 템플릿
SELECT _seed_trans('session.template', '00000000-0000-0000-0001-000000000005'::uuid, '템플릿', 'Template');
SELECT _seed_trans('session.templateDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션 화면에 적용할 템플릿을 선택하세요.', 'Select a template to apply to your session.');
SELECT _seed_trans('session.selectTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '템플릿 선택', 'Select Template');
SELECT _seed_trans('session.createButton', '00000000-0000-0000-0001-000000000005'::uuid, '세션 만들기', 'Create Session');
SELECT _seed_trans('session.createNote', '00000000-0000-0000-0001-000000000005'::uuid, '세션 생성 후 상세 페이지에서 이미지 등을 수정할 수 있습니다.', 'You can edit images and more on the detail page after creation.');

-- 메뉴
SELECT _seed_trans('menu.sessions', '00000000-0000-0000-0001-000000000005'::uuid, '세션 관리', 'Sessions');

-- 세션 목록
SELECT _seed_trans('session.management', '00000000-0000-0000-0001-000000000005'::uuid, '세션 관리', 'Session Management');
SELECT _seed_trans('session.managementDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션을 생성하고 관리하세요.', 'Create and manage your sessions.');
SELECT _seed_trans('session.total', '00000000-0000-0000-0001-000000000005'::uuid, '전체', 'Total');
SELECT _seed_trans('session.noPartner', '00000000-0000-0000-0001-000000000005'::uuid, '파트너 등록이 필요합니다', 'Partner registration required');
SELECT _seed_trans('session.noPartnerDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션을 생성하려면 먼저 파트너로 등록해야 합니다.', 'You need to register as a partner to create sessions.');
SELECT _seed_trans('session.searchPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '세션 제목으로 검색...', 'Search by session title...');
SELECT _seed_trans('session.filterStatus', '00000000-0000-0000-0001-000000000005'::uuid, '상태 필터', 'Filter by status');
SELECT _seed_trans('session.noSessions', '00000000-0000-0000-0001-000000000005'::uuid, '세션이 없습니다', 'No sessions');
SELECT _seed_trans('session.noSessionsDesc', '00000000-0000-0000-0001-000000000005'::uuid, '첫 번째 세션을 생성해보세요.', 'Create your first session.');
SELECT _seed_trans('session.createFirst', '00000000-0000-0000-0001-000000000005'::uuid, '첫 세션 만들기', 'Create First Session');
SELECT _seed_trans('session.copyCode', '00000000-0000-0000-0001-000000000005'::uuid, '코드 복사', 'Copy Code');
SELECT _seed_trans('session.showQR', '00000000-0000-0000-0001-000000000005'::uuid, 'QR 코드 보기', 'Show QR Code');
SELECT _seed_trans('session.deleteConfirm', '00000000-0000-0000-0001-000000000005'::uuid, '이 세션을 삭제하시겠습니까?', 'Are you sure you want to delete this session?');
SELECT _seed_trans('common.all', '00000000-0000-0000-0001-000000000001'::uuid, '전체', 'All');
SELECT _seed_trans('session.previewTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '새 창에서 미리보기', 'Preview in New Window');
SELECT _seed_trans('session.joinNow', '00000000-0000-0000-0001-000000000005'::uuid, '지금 참여하기', 'Join Now');

-- 탭 메뉴
SELECT _seed_trans('session.design', '00000000-0000-0000-0001-000000000005'::uuid, '디자인', 'Design');
SELECT _seed_trans('session.collaboration', '00000000-0000-0000-0001-000000000005'::uuid, '협업', 'Collaboration');
SELECT _seed_trans('session.qna', '00000000-0000-0000-0001-000000000005'::uuid, 'Q&A', 'Q&A');
SELECT _seed_trans('session.settings', '00000000-0000-0000-0001-000000000005'::uuid, '설정', 'Settings');

-- 디자인 탭
SELECT _seed_trans('session.assets', '00000000-0000-0000-0001-000000000005'::uuid, '이미지 및 배너', 'Images & Banners');
SELECT _seed_trans('session.assetsDesc', '00000000-0000-0000-0001-000000000005'::uuid, '청중 등록 페이지에 표시될 이미지를 업로드하세요.', 'Upload images to be displayed on the audience registration page.');
SELECT _seed_trans('session.preview', '00000000-0000-0000-0001-000000000005'::uuid, '미리보기', 'Preview');
SELECT _seed_trans('session.openPreview', '00000000-0000-0000-0001-000000000005'::uuid, '새 창에서 미리보기', 'Open Preview');
SELECT _seed_trans('session.maxWidthPx', '00000000-0000-0000-0001-000000000005'::uuid, '최대 {width}px', 'Max {width}px');
SELECT _seed_trans('session.imageUrlPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '이미지 URL 입력', 'Enter image URL');

-- 상태 관리
SELECT _seed_trans('session.statusDraft', '00000000-0000-0000-0001-000000000005'::uuid, '초안', 'Draft');
SELECT _seed_trans('session.statusPublished', '00000000-0000-0000-0001-000000000005'::uuid, '공개', 'Published');
SELECT _seed_trans('session.statusActive', '00000000-0000-0000-0001-000000000005'::uuid, '진행중', 'Active');
SELECT _seed_trans('session.statusEnded', '00000000-0000-0000-0001-000000000005'::uuid, '종료됨', 'Ended');
SELECT _seed_trans('session.statusCancelled', '00000000-0000-0000-0001-000000000005'::uuid, '취소됨', 'Cancelled');
SELECT _seed_trans('session.statusManagement', '00000000-0000-0000-0001-000000000005'::uuid, '상태 관리', 'Status Management');
SELECT _seed_trans('session.statusManagementDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션의 공개 상태를 변경합니다.', 'Change the session publish status.');
SELECT _seed_trans('session.currentStatus', '00000000-0000-0000-0001-000000000005'::uuid, '현재 상태', 'Current Status');
SELECT _seed_trans('session.publish', '00000000-0000-0000-0001-000000000005'::uuid, '공개하기', 'Publish');
SELECT _seed_trans('session.unpublish', '00000000-0000-0000-0001-000000000005'::uuid, '비공개로 전환', 'Unpublish');
SELECT _seed_trans('session.statusChanged', '00000000-0000-0000-0001-000000000005'::uuid, '상태가 변경되었습니다.', 'Status has been changed.');

-- 코드/링크
SELECT _seed_trans('session.copyLink', '00000000-0000-0000-0001-000000000005'::uuid, '링크 복사', 'Copy Link');
SELECT _seed_trans('session.codeCopied', '00000000-0000-0000-0001-000000000005'::uuid, '세션 코드가 복사되었습니다.', 'Session code copied.');
SELECT _seed_trans('session.linkCopied', '00000000-0000-0000-0001-000000000005'::uuid, '참여 링크가 복사되었습니다.', 'Join link copied.');
SELECT _seed_trans('session.qrCode', '00000000-0000-0000-0001-000000000005'::uuid, 'QR 코드', 'QR Code');
SELECT _seed_trans('session.qrCodeDesc', '00000000-0000-0000-0001-000000000005'::uuid, '이 QR 코드를 스캔하면 세션에 참여할 수 있습니다.', 'Scan this QR code to join the session.');

-- 이미지
SELECT _seed_trans('session.imageUploaded', '00000000-0000-0000-0001-000000000005'::uuid, '이미지가 업로드되었습니다.', 'Image uploaded.');
SELECT _seed_trans('session.imageDeleted', '00000000-0000-0000-0001-000000000005'::uuid, '이미지가 삭제되었습니다.', 'Image deleted.');

-- 위험 영역
SELECT _seed_trans('session.dangerZone', '00000000-0000-0000-0001-000000000005'::uuid, '위험 영역', 'Danger Zone');
SELECT _seed_trans('session.dangerZoneDesc', '00000000-0000-0000-0001-000000000005'::uuid, '이 작업은 되돌릴 수 없습니다.', 'These actions cannot be undone.');
SELECT _seed_trans('session.delete', '00000000-0000-0000-0001-000000000005'::uuid, '세션 삭제', 'Delete Session');
SELECT _seed_trans('session.deleted', '00000000-0000-0000-0001-000000000005'::uuid, '세션이 삭제되었습니다.', 'Session deleted.');
SELECT _seed_trans('session.deleteConfirmTitle', '00000000-0000-0000-0001-000000000005'::uuid, '세션을 삭제하시겠습니까?', 'Delete this session?');
SELECT _seed_trans('session.deleteConfirmDesc', '00000000-0000-0000-0001-000000000005'::uuid, '이 작업은 되돌릴 수 없습니다. 세션과 관련된 모든 데이터가 영구적으로 삭제됩니다.', 'This action cannot be undone. All data associated with this session will be permanently deleted.');

-- 참여 정보
SELECT _seed_trans('session.participantInfo', '00000000-0000-0000-0001-000000000005'::uuid, '현재 {count}명 / 최대 {max}명', 'Currently {count} / Max {max}');

-- 템플릿 미리보기
SELECT _seed_trans('template.previewMode', '00000000-0000-0000-0001-000000000005'::uuid, '미리보기 모드', 'Preview Mode');
SELECT _seed_trans('template.noFieldsConfigured', '00000000-0000-0000-0001-000000000005'::uuid, '설정된 필드가 없습니다.', 'No fields configured.');
SELECT _seed_trans('template.adminNeedsToSetup', '00000000-0000-0000-0001-000000000005'::uuid, '관리자가 템플릿 필드를 설정해야 합니다.', 'Administrator needs to set up template fields.');
SELECT _seed_trans('template.previewNote', '00000000-0000-0000-0001-000000000005'::uuid, '이것은 관리자가 설정한 기본 템플릿 형태입니다. 실제 세션에서는 파트너가 이미지를 교체합니다.', 'This is the default template set by the administrator. In actual sessions, partners will replace the images.');
SELECT _seed_trans('template.noFieldsPreview', '00000000-0000-0000-0001-000000000005'::uuid, '표시할 필드가 없습니다', 'No fields to display');
SELECT _seed_trans('template.addFieldsToPreview', '00000000-0000-0000-0001-000000000005'::uuid, '필드를 추가하면 미리보기가 표시됩니다', 'Add fields to see preview');

-- Q&A/설문 템플릿
SELECT _seed_trans('session.qnaTemplate', '00000000-0000-0000-0001-000000000005'::uuid, 'Q&A 템플릿', 'Q&A Template');
SELECT _seed_trans('session.qnaTemplateDesc', '00000000-0000-0000-0001-000000000005'::uuid, 'Q&A 화면에 적용할 템플릿을 선택하세요.', 'Select a template for Q&A screen.');
SELECT _seed_trans('session.pollTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '설문 템플릿', 'Poll Template');
SELECT _seed_trans('session.pollTemplateDesc', '00000000-0000-0000-0001-000000000005'::uuid, '설문 화면에 적용할 템플릿을 선택하세요.', 'Select a template for poll screen.');
SELECT _seed_trans('session.useMainTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '메인 템플릿 사용', 'Use Main Template');



-- =====================================================
-- 에러 번역 (error)
-- =====================================================
SELECT _seed_trans('error.generic', '00000000-0000-0000-0001-000000000006'::uuid, '오류가 발생했습니다.', 'An error occurred.');
SELECT _seed_trans('error.notFound', '00000000-0000-0000-0001-000000000006'::uuid, '페이지를 찾을 수 없습니다.', 'Page not found.');
SELECT _seed_trans('error.unauthorized', '00000000-0000-0000-0001-000000000006'::uuid, '권한이 없습니다.', 'You are not authorized.');
SELECT _seed_trans('error.network', '00000000-0000-0000-0001-000000000006'::uuid, '네트워크 연결을 확인해주세요.', 'Please check your network connection.');
SELECT _seed_trans('error.sessionExpired', '00000000-0000-0000-0001-000000000006'::uuid, '세션이 만료되었습니다. 다시 로그인해주세요.', 'Your session has expired. Please log in again.');
SELECT _seed_trans('error.invalidPhone', '00000000-0000-0000-0001-000000000006'::uuid, '올바른 전화번호 형식이 아닙니다.', 'Invalid phone number format.');
SELECT _seed_trans('error.duplicatePhone', '00000000-0000-0000-0001-000000000006'::uuid, '이미 등록된 전화번호입니다.', 'This phone number is already registered.');
SELECT _seed_trans('error.minLength', '00000000-0000-0000-0001-000000000006'::uuid, '최소 {0}자 이상 입력해주세요.', 'Please enter at least {0} characters.');




-- =====================================================
-- 팀원 관리 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.teamMembers', '00000000-0000-0000-0001-000000000004', '팀원 관리', 'Team Members');

-- 팀원 관리 페이지
SELECT _seed_trans('team.title', '00000000-0000-0000-0001-000000000004', '팀원 관리', 'Team Members');
SELECT _seed_trans('team.description', '00000000-0000-0000-0001-000000000004', '팀원을 초대하고 관리합니다.', 'Invite and manage team members.');
SELECT _seed_trans('team.invite', '00000000-0000-0000-0001-000000000004', '팀원 초대', 'Invite Member');
SELECT _seed_trans('team.inviteMember', '00000000-0000-0000-0001-000000000004', '팀원 초대', 'Invite Team Member');
SELECT _seed_trans('team.inviteDesc', '00000000-0000-0000-0001-000000000004', '이메일 주소를 입력하여 팀원을 초대합니다.', 'Enter an email address to invite a team member.');
SELECT _seed_trans('team.sendInvite', '00000000-0000-0000-0001-000000000004', '초대 발송', 'Send Invite');
SELECT _seed_trans('team.inviteSent', '00000000-0000-0000-0001-000000000004', '초대가 발송되었습니다.', 'Invitation sent successfully.');
SELECT _seed_trans('team.alreadyInvited', '00000000-0000-0000-0001-000000000004', '이미 초대된 이메일입니다.', 'This email has already been invited.');

-- 역할
SELECT _seed_trans('team.owner', '00000000-0000-0000-0001-000000000004', '소유자', 'Owner');
SELECT _seed_trans('team.admin', '00000000-0000-0000-0001-000000000004', '관리자', 'Admin');
SELECT _seed_trans('team.member', '00000000-0000-0000-0001-000000000004', '멤버', 'Member');
SELECT _seed_trans('team.role', '00000000-0000-0000-0001-000000000004', '역할', 'Role');
SELECT _seed_trans('team.newRole', '00000000-0000-0000-0001-000000000004', '새 역할', 'New Role');
SELECT _seed_trans('team.changeRole', '00000000-0000-0000-0001-000000000004', '역할 변경', 'Change Role');
SELECT _seed_trans('team.roleChanged', '00000000-0000-0000-0001-000000000004', '역할이 변경되었습니다.', 'Role changed successfully.');
SELECT _seed_trans('team.cannotChangeOwner', '00000000-0000-0000-0001-000000000004', '소유자의 역할은 변경할 수 없습니다.', 'Cannot change owner role.');

-- 상태
SELECT _seed_trans('team.pending', '00000000-0000-0000-0001-000000000004', '대기중', 'Pending');
SELECT _seed_trans('team.accepted', '00000000-0000-0000-0001-000000000004', '수락됨', 'Accepted');
SELECT _seed_trans('team.rejected', '00000000-0000-0000-0001-000000000004', '거부됨', 'Rejected');
SELECT _seed_trans('team.status', '00000000-0000-0000-0001-000000000004', '상태', 'Status');

-- 목록
SELECT _seed_trans('team.memberList', '00000000-0000-0000-0001-000000000004', '팀원 목록', 'Team Members List');
SELECT _seed_trans('team.memberListDesc', '00000000-0000-0000-0001-000000000004', '현재 팀에 소속된 멤버 목록입니다.', 'List of members in your team.');
SELECT _seed_trans('team.noMembers', '00000000-0000-0000-0001-000000000004', '팀원이 없습니다.', 'No team members.');
SELECT _seed_trans('team.email', '00000000-0000-0000-0001-000000000004', '이메일', 'Email');
SELECT _seed_trans('team.invitedAt', '00000000-0000-0000-0001-000000000004', '초대일', 'Invited At');

-- 통계
SELECT _seed_trans('team.totalMembers', '00000000-0000-0000-0001-000000000004', '전체 팀원', 'Total Members');
SELECT _seed_trans('team.activeMembers', '00000000-0000-0000-0001-000000000004', '활성 팀원', 'Active Members');
SELECT _seed_trans('team.pendingInvites', '00000000-0000-0000-0001-000000000004', '대기중 초대', 'Pending Invites');
SELECT _seed_trans('team.admins', '00000000-0000-0000-0001-000000000004', '관리자 수', 'Admins');

-- 삭제
SELECT _seed_trans('team.removeMember', '00000000-0000-0000-0001-000000000004', '팀원 제거', 'Remove Member');
SELECT _seed_trans('team.removeConfirm', '00000000-0000-0000-0001-000000000004', '{email}을(를) 팀에서 제거하시겠습니까?', 'Are you sure you want to remove {email} from the team?');
SELECT _seed_trans('team.memberRemoved', '00000000-0000-0000-0001-000000000004', '팀원이 제거되었습니다.', 'Member removed successfully.');
SELECT _seed_trans('team.cannotDeleteOwner', '00000000-0000-0000-0001-000000000004', '소유자는 제거할 수 없습니다.', 'Cannot remove owner.');

-- 링크
SELECT _seed_trans('team.copyLink', '00000000-0000-0000-0001-000000000004', '초대 링크 복사', 'Copy Invite Link');
SELECT _seed_trans('team.linkCopied', '00000000-0000-0000-0001-000000000004', '초대 링크가 복사되었습니다.', 'Invite link copied to clipboard.');

-- 제한
SELECT _seed_trans('team.instructorNotAllowed', '00000000-0000-0000-0001-000000000004', '강연자 타입은 팀원 관리 기능을 사용할 수 없습니다.', 'Instructor type cannot use team management.');
SELECT _seed_trans('team.notPartner', '00000000-0000-0000-0001-000000000004', '파트너 정보가 없습니다.', 'No partner information found.');

-- 초대 수락 페이지
SELECT _seed_trans('invite.title', '00000000-0000-0000-0001-000000000004', '팀 초대', 'Team Invitation');
SELECT _seed_trans('invite.description', '00000000-0000-0000-0001-000000000004', '팀에 초대되었습니다.', 'You have been invited to join a team.');
SELECT _seed_trans('invite.from', '00000000-0000-0000-0001-000000000004', '초대자', 'From');
SELECT _seed_trans('invite.role', '00000000-0000-0000-0001-000000000004', '역할', 'Role');
SELECT _seed_trans('invite.email', '00000000-0000-0000-0001-000000000004', '이메일', 'Email');
SELECT _seed_trans('invite.accept', '00000000-0000-0000-0001-000000000004', '초대 수락', 'Accept Invitation');
SELECT _seed_trans('invite.accepted', '00000000-0000-0000-0001-000000000004', '초대가 수락되었습니다!', 'Invitation Accepted!');
SELECT _seed_trans('invite.acceptedDesc', '00000000-0000-0000-0001-000000000004', '{name} 팀에 합류했습니다.', 'You have joined the {name} team.');
SELECT _seed_trans('invite.goToPartner', '00000000-0000-0000-0001-000000000004', '파트너 센터로 이동', 'Go to Partner Center');
SELECT _seed_trans('invite.loginRequired', '00000000-0000-0000-0001-000000000004', '초대를 수락하려면 로그인이 필요합니다.', 'Please log in to accept the invitation.');
SELECT _seed_trans('invite.wrongAccount', '00000000-0000-0000-0001-000000000004', '초대된 이메일({email})과 다른 계정으로 로그인되어 있습니다.', 'You are logged in with a different account than the invited email ({email}).');
SELECT _seed_trans('invite.switchAccount', '00000000-0000-0000-0001-000000000004', '다른 계정으로 로그인', 'Switch Account');

-- 초대 에러
SELECT _seed_trans('invite.error.invalidTokenTitle', '00000000-0000-0000-0001-000000000006', '유효하지 않은 초대', 'Invalid Invitation');
SELECT _seed_trans('invite.error.invalidTokenDesc', '00000000-0000-0000-0001-000000000006', '초대 링크가 유효하지 않거나 만료되었습니다.', 'The invitation link is invalid or has expired.');
SELECT _seed_trans('invite.error.loadFailedTitle', '00000000-0000-0000-0001-000000000006', '로드 실패', 'Load Failed');
SELECT _seed_trans('invite.error.loadFailedDesc', '00000000-0000-0000-0001-000000000006', '초대 정보를 불러오는데 실패했습니다.', 'Failed to load invitation information.');
SELECT _seed_trans('invite.error.emailMismatchTitle', '00000000-0000-0000-0001-000000000006', '이메일 불일치', 'Email Mismatch');
SELECT _seed_trans('invite.error.emailMismatchDesc', '00000000-0000-0000-0001-000000000006', '로그인한 이메일이 초대된 이메일과 일치하지 않습니다.', 'Your logged in email does not match the invited email.');
SELECT _seed_trans('invite.error.acceptFailedTitle', '00000000-0000-0000-0001-000000000006', '수락 실패', 'Accept Failed');
SELECT _seed_trans('invite.error.acceptFailedDesc', '00000000-0000-0000-0001-000000000006', '초대 수락 중 오류가 발생했습니다.', 'An error occurred while accepting the invitation.');

-- 에러 메시지
SELECT _seed_trans('error.inviteFailed', '00000000-0000-0000-0001-000000000006', '초대 발송에 실패했습니다.', 'Failed to send invitation.');




-- =====================================================
-- 세션 추가 언어팩
-- =====================================================

-- 세션 상세 페이지
SELECT _seed_trans('session.design', '00000000-0000-0000-0001-000000000005', '디자인', 'Design');
SELECT _seed_trans('session.settings', '00000000-0000-0000-0001-000000000005', '설정', 'Settings');
SELECT _seed_trans('session.assets', '00000000-0000-0000-0001-000000000005', '이미지 및 배너', 'Images & Banners');
SELECT _seed_trans('session.assetsDesc', '00000000-0000-0000-0001-000000000005', '청중 등록 페이지에 표시될 이미지를 업로드하세요.', 'Upload images to be displayed on the audience registration page.');
SELECT _seed_trans('session.preview', '00000000-0000-0000-0001-000000000005', '미리보기', 'Preview');
SELECT _seed_trans('session.imageUploaded', '00000000-0000-0000-0001-000000000005', '이미지가 업로드되었습니다.', 'Image uploaded.');
SELECT _seed_trans('session.imageDeleted', '00000000-0000-0000-0001-000000000005', '이미지가 삭제되었습니다.', 'Image deleted.');
SELECT _seed_trans('session.linkCopied', '00000000-0000-0000-0001-000000000005', '참여 링크가 복사되었습니다.', 'Join link copied.');
SELECT _seed_trans('session.copyLink', '00000000-0000-0000-0001-000000000005', '링크 복사', 'Copy Link');

-- 상태 관리
SELECT _seed_trans('session.statusManagement', '00000000-0000-0000-0001-000000000005', '상태 관리', 'Status Management');
SELECT _seed_trans('session.statusManagementDesc', '00000000-0000-0000-0001-000000000005', '세션의 공개 상태를 관리합니다.', 'Manage the session visibility status.');
SELECT _seed_trans('session.currentStatus', '00000000-0000-0000-0001-000000000005', '현재 상태', 'Current Status');
SELECT _seed_trans('session.statusChanged', '00000000-0000-0000-0001-000000000005', '상태가 변경되었습니다.', 'Status changed.');
SELECT _seed_trans('session.publish', '00000000-0000-0000-0001-000000000005', '공개하기', 'Publish');
SELECT _seed_trans('session.unpublish', '00000000-0000-0000-0001-000000000005', '비공개로 전환', 'Unpublish');
SELECT _seed_trans('session.start', '00000000-0000-0000-0001-000000000005', '세션 시작', 'Start Session');
SELECT _seed_trans('session.end', '00000000-0000-0000-0001-000000000005', '세션 종료', 'End Session');

-- 위험 영역
SELECT _seed_trans('session.dangerZone', '00000000-0000-0000-0001-000000000005', '위험 영역', 'Danger Zone');
SELECT _seed_trans('session.dangerZoneDesc', '00000000-0000-0000-0001-000000000005', '이 작업은 되돌릴 수 없습니다.', 'These actions cannot be undone.');
SELECT _seed_trans('session.delete', '00000000-0000-0000-0001-000000000005', '세션 삭제', 'Delete Session');
SELECT _seed_trans('session.deleteConfirmTitle', '00000000-0000-0000-0001-000000000005', '세션을 삭제하시겠습니까?', 'Delete this session?');
SELECT _seed_trans('session.deleteConfirmDesc', '00000000-0000-0000-0001-000000000005', '이 작업은 되돌릴 수 없습니다. 모든 참여자 데이터와 에셋이 삭제됩니다.', 'This action cannot be undone. All participant data and assets will be deleted.');

-- QR 코드
SELECT _seed_trans('session.qrCode', '00000000-0000-0000-0001-000000000005', 'QR 코드', 'QR Code');
SELECT _seed_trans('session.qrCodeDesc', '00000000-0000-0000-0001-000000000005', '청중이 이 QR 코드를 스캔하여 세션에 참여할 수 있습니다.', 'Audience can scan this QR code to join the session.');

-- 청중 등록 페이지
SELECT _seed_trans('join.sessionInfo', '00000000-0000-0000-0001-000000000005', '행사 정보', 'Event Information');
SELECT _seed_trans('join.enterSession', '00000000-0000-0000-0001-000000000005', '참여하기', 'Join Now');
SELECT _seed_trans('join.joinNow', '00000000-0000-0000-0001-000000000005', '지금 참여하세요', 'Join Now');
SELECT _seed_trans('join.joinDesc', '00000000-0000-0000-0001-000000000005', '버튼을 클릭하여 세션에 참여하세요.', 'Click the button to join the session.');
SELECT _seed_trans('join.participantCount', '00000000-0000-0000-0001-000000000005', '현재 {count}명 / 최대 {max}명', '{count} / {max} participants');
SELECT _seed_trans('join.contact', '00000000-0000-0000-0001-000000000005', '문의', 'Contact');
SELECT _seed_trans('join.code', '00000000-0000-0000-0001-000000000005', '참여 코드', 'Join Code');

-- 에러
SELECT _seed_trans('join.error.invalidCode', '00000000-0000-0000-0001-000000000006', '유효하지 않은 코드', 'Invalid Code');
SELECT _seed_trans('join.error.invalidCodeDesc', '00000000-0000-0000-0001-000000000006', '참여 코드가 유효하지 않습니다.', 'The join code is invalid.');
SELECT _seed_trans('join.error.notFound', '00000000-0000-0000-0001-000000000006', '세션을 찾을 수 없음', 'Session Not Found');
SELECT _seed_trans('join.error.notFoundDesc', '00000000-0000-0000-0001-000000000006', '해당 코드의 세션을 찾을 수 없거나 아직 공개되지 않았습니다.', 'Session not found or not yet published.');
SELECT _seed_trans('join.error.loadFailed', '00000000-0000-0000-0001-000000000006', '로드 실패', 'Load Failed');
SELECT _seed_trans('join.error.loadFailedDesc', '00000000-0000-0000-0001-000000000006', '세션 정보를 불러오는데 실패했습니다.', 'Failed to load session information.');

-- 공통 추가
SELECT _seed_trans('common.view', '00000000-0000-0000-0001-000000000001', '보기', 'View');
SELECT _seed_trans('error.uploadFailed', '00000000-0000-0000-0001-000000000006', '업로드에 실패했습니다.', 'Upload failed.');
SELECT _seed_trans('error.loadFailed', '00000000-0000-0000-0001-000000000006', '불러오기에 실패했습니다.', 'Failed to load.');
SELECT _seed_trans('error.saveFailed', '00000000-0000-0000-0001-000000000006', '저장에 실패했습니다.', 'Failed to save.');
SELECT _seed_trans('error.deleteFailed', '00000000-0000-0000-0001-000000000006', '삭제에 실패했습니다.', 'Failed to delete.');
SELECT _seed_trans('error.updateFailed', '00000000-0000-0000-0001-000000000006', '업데이트에 실패했습니다.', 'Failed to update.');
SELECT _seed_trans('error.createFailed', '00000000-0000-0000-0001-000000000006', '생성에 실패했습니다.', 'Failed to create.');
SELECT _seed_trans('common.saved', '00000000-0000-0000-0001-000000000001', '저장되었습니다.', 'Saved.');




-- =====================================================
-- Phase 12: 세션 협업 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.invitations', '00000000-0000-0000-0001-000000000003'::uuid, '초대 관리', 'Invitations');
SELECT _seed_trans('menu.teamMembers', '00000000-0000-0000-0001-000000000003'::uuid, '팀원 관리', 'Team Members');

-- 파트너 초대
SELECT _seed_trans('session.invitePartner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 초대', 'Invite Partner');
SELECT _seed_trans('session.invitePartnerDesc', '00000000-0000-0000-0001-000000000004'::uuid, '다른 파트너를 세션에 초대하여 협업할 수 있습니다.', 'Invite another partner to collaborate on this session.');
SELECT _seed_trans('session.noPartnerInvited', '00000000-0000-0000-0001-000000000004'::uuid, '초대된 파트너가 없습니다.', 'No partner has been invited.');
SELECT _seed_trans('session.partnerInvited', '00000000-0000-0000-0001-000000000004'::uuid, '파트너가 초대되었습니다.', 'Partner has been invited.');
SELECT _seed_trans('session.invitePending', '00000000-0000-0000-0001-000000000004'::uuid, '수락 대기 중', 'Pending Acceptance');
SELECT _seed_trans('session.inviteAccepted', '00000000-0000-0000-0001-000000000004'::uuid, '수락됨', 'Accepted');
SELECT _seed_trans('session.inviteRejected', '00000000-0000-0000-0001-000000000004'::uuid, '거절됨', 'Rejected');
SELECT _seed_trans('session.cancelInvite', '00000000-0000-0000-0001-000000000004'::uuid, '초대 취소', 'Cancel Invite');
SELECT _seed_trans('session.inviteCanceled', '00000000-0000-0000-0001-000000000004'::uuid, '초대가 취소되었습니다.', 'Invitation has been canceled.');
SELECT _seed_trans('session.searchPartner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 검색', 'Search Partner');
SELECT _seed_trans('session.searchPartnerPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '회사명 또는 대표자명으로 검색...', 'Search by company name or representative...');
SELECT _seed_trans('session.selectPartner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 선택', 'Select Partner');
SELECT _seed_trans('session.noPartnersFound', '00000000-0000-0000-0001-000000000004'::uuid, '검색 결과가 없습니다.', 'No partners found.');
SELECT _seed_trans('session.onlyOnePartner', '00000000-0000-0000-0001-000000000004'::uuid, '세션당 하나의 파트너만 초대할 수 있습니다.', 'Only one partner can be invited per session.');
SELECT _seed_trans('session.incompatiblePartner', '00000000-0000-0000-0001-000000000004'::uuid, '호환되지 않는 파트너 타입입니다. 행사자는 대행업체만, 대행업체는 행사자만 초대할 수 있습니다.', 'Incompatible partner type. Organizers can only invite agencies, and agencies can only invite organizers.');

-- 초대 받은 목록
SELECT _seed_trans('invitation.received', '00000000-0000-0000-0001-000000000004'::uuid, '받은 초대', 'Received Invitations');
SELECT _seed_trans('invitation.receivedDesc', '00000000-0000-0000-0001-000000000004'::uuid, '다른 파트너로부터 받은 세션 초대 목록입니다.', 'List of session invitations from other partners.');
SELECT _seed_trans('invitation.noInvitations', '00000000-0000-0000-0001-000000000004'::uuid, '받은 초대가 없습니다.', 'No invitations received.');
SELECT _seed_trans('invitation.accept', '00000000-0000-0000-0001-000000000004'::uuid, '수락', 'Accept');
SELECT _seed_trans('invitation.reject', '00000000-0000-0000-0001-000000000004'::uuid, '거절', 'Reject');
SELECT _seed_trans('invitation.accepted', '00000000-0000-0000-0001-000000000004'::uuid, '초대를 수락했습니다.', 'Invitation accepted.');
SELECT _seed_trans('invitation.rejected', '00000000-0000-0000-0001-000000000004'::uuid, '초대를 거절했습니다.', 'Invitation rejected.');
SELECT _seed_trans('invitation.rejectReason', '00000000-0000-0000-0001-000000000004'::uuid, '거절 사유', 'Rejection Reason');
SELECT _seed_trans('invitation.rejectReasonPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '거절 사유를 입력하세요 (선택)', 'Enter rejection reason (optional)');
SELECT _seed_trans('invitation.from', '00000000-0000-0000-0001-000000000004'::uuid, '초대한 파트너', 'Invited By');
SELECT _seed_trans('invitation.sessionName', '00000000-0000-0000-0001-000000000004'::uuid, '세션명', 'Session Name');
SELECT _seed_trans('invitation.invitedAt', '00000000-0000-0000-0001-000000000004'::uuid, '초대일', 'Invited At');

-- 강연자 관리
SELECT _seed_trans('presenter.title', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 관리', 'Presenter Management');
SELECT _seed_trans('presenter.desc', '00000000-0000-0000-0001-000000000004'::uuid, '세션의 강연자/발표자를 관리합니다.', 'Manage presenters for this session.');
SELECT _seed_trans('presenter.add', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 추가', 'Add Presenter');
SELECT _seed_trans('presenter.noPresenters', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 강연자가 없습니다.', 'No presenters registered.');
SELECT _seed_trans('presenter.addType', '00000000-0000-0000-0001-000000000004'::uuid, '추가 방식', 'Add Method');
SELECT _seed_trans('presenter.typeTeamMember', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 지정', 'Team Member');
SELECT _seed_trans('presenter.typePartner', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 파트너 초대', 'Invite Instructor Partner');
SELECT _seed_trans('presenter.typeManual', '00000000-0000-0000-0001-000000000004'::uuid, '직접 입력', 'Manual Entry');
SELECT _seed_trans('presenter.selectTeamMember', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 선택', 'Select Team Member');
SELECT _seed_trans('presenter.searchInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 파트너 검색', 'Search Instructor Partner');
SELECT _seed_trans('presenter.searchInstructorPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '이메일, 이름, 전문분야로 검색...', 'Search by email, name, or specialty...');
SELECT _seed_trans('presenter.searchMemberPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '이메일로 팀원 검색...', 'Search member by email...');
SELECT _seed_trans('presenter.noInstructorsFound', '00000000-0000-0000-0001-000000000004'::uuid, '검색 결과가 없습니다.', 'No instructors found.');
SELECT _seed_trans('presenter.manualName', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 이름', 'Presenter Name');
SELECT _seed_trans('presenter.manualTitle', '00000000-0000-0000-0001-000000000004'::uuid, '직책/소속', 'Title/Affiliation');
SELECT _seed_trans('presenter.manualBio', '00000000-0000-0000-0001-000000000004'::uuid, '소개', 'Bio');
SELECT _seed_trans('presenter.manualImage', '00000000-0000-0000-0001-000000000004'::uuid, '프로필 이미지', 'Profile Image');
SELECT _seed_trans('presenter.displayName', '00000000-0000-0000-0001-000000000004'::uuid, '표시 이름', 'Display Name');
SELECT _seed_trans('presenter.displayTitle', '00000000-0000-0000-0001-000000000004'::uuid, '표시 직책', 'Display Title');
SELECT _seed_trans('presenter.displayOrder', '00000000-0000-0000-0001-000000000004'::uuid, '표시 순서', 'Display Order');
SELECT _seed_trans('presenter.added', '00000000-0000-0000-0001-000000000004'::uuid, '강연자가 추가되었습니다.', 'Presenter has been added.');
SELECT _seed_trans('presenter.removed', '00000000-0000-0000-0001-000000000004'::uuid, '강연자가 삭제되었습니다.', 'Presenter has been removed.');
SELECT _seed_trans('presenter.updated', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 정보가 수정되었습니다.', 'Presenter has been updated.');
SELECT _seed_trans('presenter.inviteSent', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 초대가 발송되었습니다.', 'Presenter invitation has been sent.');
SELECT _seed_trans('presenter.pending', '00000000-0000-0000-0001-000000000004'::uuid, '수락 대기', 'Pending');
SELECT _seed_trans('presenter.confirmed', '00000000-0000-0000-0001-000000000004'::uuid, '확정', 'Confirmed');
SELECT _seed_trans('presenter.rejected', '00000000-0000-0000-0001-000000000004'::uuid, '거절됨', 'Rejected');

-- 강연자 초대 (강연자 파트너 입장)
SELECT _seed_trans('presenterInvite.title', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 초대', 'Presenter Invitations');
SELECT _seed_trans('presenterInvite.desc', '00000000-0000-0000-0001-000000000004'::uuid, '세션 강연자로 초대받은 목록입니다.', 'List of sessions you have been invited to as a presenter.');
SELECT _seed_trans('presenterInvite.noInvitations', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 초대가 없습니다.', 'No presenter invitations.');

-- 세션 협업 탭
SELECT _seed_trans('session.collaboration', '00000000-0000-0000-0001-000000000004'::uuid, '협업', 'Collaboration');
SELECT _seed_trans('session.instructorCannotInvite', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 파트너는 다른 파트너를 초대할 수 없습니다.', 'Instructor partners cannot invite other partners.');
SELECT _seed_trans('session.canInviteAgency', '00000000-0000-0000-0001-000000000004'::uuid, '행사자는 대행업체만 초대할 수 있습니다.', 'Organizers can only invite agencies.');
SELECT _seed_trans('session.canInviteOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '대행업체는 행사자만 초대할 수 있습니다.', 'Agencies can only invite organizers.');
SELECT _seed_trans('session.searchAgencyDesc', '00000000-0000-0000-0001-000000000004'::uuid, '협업할 대행업체를 검색하세요.', 'Search for an agency to collaborate with.');
SELECT _seed_trans('session.searchOrganizerDesc', '00000000-0000-0000-0001-000000000004'::uuid, '협업할 행사자를 검색하세요.', 'Search for an organizer to collaborate with.');
SELECT _seed_trans('session.searchToFind', '00000000-0000-0000-0001-000000000004'::uuid, '검색어를 입력하세요.', 'Enter a search term.');
SELECT _seed_trans('session.cancelInviteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '이 초대를 취소하시겠습니까?', 'Are you sure you want to cancel this invitation?');

-- 강연자 추가 관련
SELECT _seed_trans('presenter.addDesc', '00000000-0000-0000-0001-000000000004'::uuid, '세션에 강연자를 추가하는 방식을 선택하세요.', 'Choose how to add a presenter to this session.');
SELECT _seed_trans('presenter.noTeamMembers', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 팀원이 없습니다.', 'No team members registered.');
SELECT _seed_trans('presenter.nameRequired', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 이름을 입력하세요.', 'Please enter the presenter name.');
SELECT _seed_trans('presenter.namePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 이름을 입력하세요', 'Enter presenter name');
SELECT _seed_trans('presenter.titlePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: CEO, 교수, 전문 강연자', 'e.g. CEO, Professor, Expert Instructor');
SELECT _seed_trans('presenter.bioPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 소개를 입력하세요', 'Enter presenter bio');
SELECT _seed_trans('presenter.edit', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 수정', 'Edit Presenter');
SELECT _seed_trans('presenter.deleteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 삭제', 'Delete Presenter');
SELECT _seed_trans('presenter.deleteConfirmDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 강연자를 삭제하시겠습니까?', 'Are you sure you want to delete this presenter?');

-- 강연자 타입 배지
SELECT _seed_trans('presenter.typeManualBadge', '00000000-0000-0000-0001-000000000004'::uuid, '직접입력', 'Manual');
SELECT _seed_trans('presenter.typeMemberBadge', '00000000-0000-0000-0001-000000000004'::uuid, '팀원', 'Member');
SELECT _seed_trans('presenter.typePartnerBadge', '00000000-0000-0000-0001-000000000004'::uuid, '파트너', 'Partner');

-- 팀원 정보 팝업
SELECT _seed_trans('presenter.memberInfo', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 정보', 'Team Member Info');
SELECT _seed_trans('presenter.memberDetails', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 상세', 'Member Details');
SELECT _seed_trans('presenter.belongsTo', '00000000-0000-0000-0001-000000000004'::uuid, '소속 파트너', 'Belongs To');
SELECT _seed_trans('partner.type', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 유형', 'Partner Type');
SELECT _seed_trans('partner.displayName', '00000000-0000-0000-0001-000000000004'::uuid, '표시 이름', 'Display Name');
SELECT _seed_trans('partner.companyName', '00000000-0000-0000-0001-000000000004'::uuid, '회사명', 'Company Name');
SELECT _seed_trans('partner.representative', '00000000-0000-0000-0001-000000000004'::uuid, '대표자명', 'Representative');

-- 공통
SELECT _seed_trans('common.invite', '00000000-0000-0000-0001-000000000001'::uuid, '초대', 'Invite');
SELECT _seed_trans('common.add', '00000000-0000-0000-0001-000000000001'::uuid, '추가', 'Add');

-- 에러 메시지
SELECT _seed_trans('error.alreadyHasPartner', '00000000-0000-0000-0001-000000000006'::uuid, '이미 초대된 파트너가 있습니다.', 'A partner has already been invited.');
SELECT _seed_trans('error.incompatiblePartnerType', '00000000-0000-0000-0001-000000000006'::uuid, '호환되지 않는 파트너 타입입니다.', 'Incompatible partner type.');
SELECT _seed_trans('error.inviteNotFound', '00000000-0000-0000-0001-000000000006'::uuid, '초대를 찾을 수 없습니다.', 'Invitation not found.');
SELECT _seed_trans('error.alreadyResponded', '00000000-0000-0000-0001-000000000006'::uuid, '이미 응답한 초대입니다.', 'Already responded to this invitation.');
SELECT _seed_trans('error.searchFailed', '00000000-0000-0000-0001-000000000006'::uuid, '검색에 실패했습니다.', 'Search failed.');
SELECT _seed_trans('error.inviteFailed', '00000000-0000-0000-0001-000000000006'::uuid, '초대에 실패했습니다.', 'Invitation failed.');
SELECT _seed_trans('error.cancelFailed', '00000000-0000-0000-0001-000000000006'::uuid, '취소에 실패했습니다.', 'Cancellation failed.');
SELECT _seed_trans('error.addFailed', '00000000-0000-0000-0001-000000000006'::uuid, '추가에 실패했습니다.', 'Failed to add.');
SELECT _seed_trans('error.responseFailed', '00000000-0000-0000-0001-000000000006'::uuid, '응답 처리에 실패했습니다.', 'Failed to process response.');

-- 초대 관련 추가
SELECT _seed_trans('invitation.rejectReasonDesc', '00000000-0000-0000-0001-000000000004'::uuid, '거절 사유를 입력하세요. 이 사유는 초대한 파트너에게 전달됩니다.', 'Enter a reason for rejection. This will be shared with the inviting partner.');

-- 세션 파트너 섹션
SELECT _seed_trans('session.partnerSection', '00000000-0000-0000-0001-000000000004'::uuid, '협업 파트너', 'Collaboration Partners');
SELECT _seed_trans('session.partnerSectionDesc', '00000000-0000-0000-0001-000000000004'::uuid, '세션에 참여하는 행사자와 대행사입니다.', 'Organizers and agencies participating in this session.');
SELECT _seed_trans('session.creator', '00000000-0000-0000-0001-000000000004'::uuid, '생성자', 'Creator');
SELECT _seed_trans('session.inviteOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사자 초대', 'Invite Organizer');
SELECT _seed_trans('session.inviteAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행사 초대', 'Invite Agency');

-- 파트너 타입
SELECT _seed_trans('partner.typeOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사주최자', 'Event Organizer');
SELECT _seed_trans('partner.typeAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행사', 'Agency');
SELECT _seed_trans('partner.typeInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자', 'Instructor');

-- 공통 추가
SELECT _seed_trans('common.unknown', '00000000-0000-0000-0001-000000000001'::uuid, '알 수 없음', 'Unknown');
SELECT _seed_trans('common.untitled', '00000000-0000-0000-0001-000000000001'::uuid, '제목 없음', 'Untitled');




-- =====================================================
-- Phase 13: Q&A 관련 언어팩
-- =====================================================

-- Q&A 기본
SELECT _seed_trans('qna.title', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A', 'Q&A');
SELECT _seed_trans('qna.desc', '00000000-0000-0000-0001-000000000004'::uuid, '궁금한 점을 질문하세요. 강연자가 답변해 드립니다.', 'Ask your questions. The presenter will answer them.');
SELECT _seed_trans('qna.askQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문하기', 'Ask a Question');
SELECT _seed_trans('qna.placeholder', '00000000-0000-0000-0001-000000000004'::uuid, '질문을 입력하세요...', 'Enter your question...');
SELECT _seed_trans('qna.submit', '00000000-0000-0000-0001-000000000004'::uuid, '질문 등록', 'Submit Question');
SELECT _seed_trans('qna.submitting', '00000000-0000-0000-0001-000000000004'::uuid, '등록 중...', 'Submitting...');
SELECT _seed_trans('qna.submitted', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 등록되었습니다.', 'Your question has been submitted.');
SELECT _seed_trans('qna.noQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '아직 질문이 없습니다.', 'No questions yet.');
SELECT _seed_trans('qna.beFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 번째 질문을 남겨보세요!', 'Be the first to ask a question!');

-- 익명 설정
SELECT _seed_trans('qna.anonymous', '00000000-0000-0000-0001-000000000004'::uuid, '익명', 'Anonymous');
SELECT _seed_trans('qna.postAnonymously', '00000000-0000-0000-0001-000000000004'::uuid, '익명으로 질문하기', 'Post anonymously');
SELECT _seed_trans('qna.yourName', '00000000-0000-0000-0001-000000000004'::uuid, '이름 (선택)', 'Your name (optional)');
SELECT _seed_trans('qna.namePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '표시될 이름을 입력하세요', 'Enter your display name');

-- 좋아요
SELECT _seed_trans('qna.like', '00000000-0000-0000-0001-000000000004'::uuid, '좋아요', 'Like');
SELECT _seed_trans('qna.likes', '00000000-0000-0000-0001-000000000004'::uuid, '좋아요', 'Likes');
SELECT _seed_trans('qna.liked', '00000000-0000-0000-0001-000000000004'::uuid, '좋아요 취소', 'Unlike');

-- 상태
SELECT _seed_trans('qna.statusPending', '00000000-0000-0000-0001-000000000004'::uuid, '검토 대기', 'Pending Review');
SELECT _seed_trans('qna.statusApproved', '00000000-0000-0000-0001-000000000004'::uuid, '승인됨', 'Approved');
SELECT _seed_trans('qna.statusAnswered', '00000000-0000-0000-0001-000000000004'::uuid, '답변 완료', 'Answered');
SELECT _seed_trans('qna.statusHidden', '00000000-0000-0000-0001-000000000004'::uuid, '숨김', 'Hidden');
SELECT _seed_trans('qna.statusRejected', '00000000-0000-0000-0001-000000000004'::uuid, '거부됨', 'Rejected');

-- 정렬
SELECT _seed_trans('qna.sortNewest', '00000000-0000-0000-0001-000000000004'::uuid, '최신순', 'Newest');
SELECT _seed_trans('qna.sortPopular', '00000000-0000-0000-0001-000000000004'::uuid, '인기순', 'Most Popular');
SELECT _seed_trans('qna.sortOldest', '00000000-0000-0000-0001-000000000004'::uuid, '오래된순', 'Oldest');

-- 필터
SELECT _seed_trans('qna.filterAll', '00000000-0000-0000-0001-000000000004'::uuid, '전체', 'All');
SELECT _seed_trans('qna.filterPending', '00000000-0000-0000-0001-000000000004'::uuid, '대기 중', 'Pending');
SELECT _seed_trans('qna.filterAnswered', '00000000-0000-0000-0001-000000000004'::uuid, '답변됨', 'Answered');
SELECT _seed_trans('qna.filterUnanswered', '00000000-0000-0000-0001-000000000004'::uuid, '미답변', 'Unanswered');

-- 관리자/파트너 기능
SELECT _seed_trans('qna.management', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A 관리', 'Q&A Management');
SELECT _seed_trans('qna.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '청중의 질문을 관리하고 답변하세요.', 'Manage and answer questions from the audience.');
SELECT _seed_trans('qna.approve', '00000000-0000-0000-0001-000000000004'::uuid, '승인', 'Approve');
SELECT _seed_trans('qna.reject', '00000000-0000-0000-0001-000000000004'::uuid, '거부', 'Reject');
SELECT _seed_trans('qna.hide', '00000000-0000-0000-0001-000000000004'::uuid, '숨기기', 'Hide');
SELECT _seed_trans('qna.unhide', '00000000-0000-0000-0001-000000000004'::uuid, '숨김 해제', 'Unhide');
SELECT _seed_trans('qna.pin', '00000000-0000-0000-0001-000000000004'::uuid, '상단 고정', 'Pin');
SELECT _seed_trans('qna.unpin', '00000000-0000-0000-0001-000000000004'::uuid, '고정 해제', 'Unpin');
SELECT _seed_trans('qna.highlight', '00000000-0000-0000-0001-000000000004'::uuid, '하이라이트', 'Highlight');
SELECT _seed_trans('qna.unhighlight', '00000000-0000-0000-0001-000000000004'::uuid, '하이라이트 해제', 'Remove Highlight');
SELECT _seed_trans('qna.delete', '00000000-0000-0000-0001-000000000004'::uuid, '삭제', 'Delete');

-- 답변
SELECT _seed_trans('qna.answer', '00000000-0000-0000-0001-000000000004'::uuid, '답변', 'Answer');
SELECT _seed_trans('qna.answerPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '답변을 입력하세요...', 'Enter your answer...');
SELECT _seed_trans('qna.submitAnswer', '00000000-0000-0000-0001-000000000004'::uuid, '답변 등록', 'Submit Answer');
SELECT _seed_trans('qna.answerSubmitted', '00000000-0000-0000-0001-000000000004'::uuid, '답변이 등록되었습니다.', 'Answer has been submitted.');
SELECT _seed_trans('qna.editAnswer', '00000000-0000-0000-0001-000000000004'::uuid, '답변 수정', 'Edit Answer');
SELECT _seed_trans('qna.deleteAnswer', '00000000-0000-0000-0001-000000000004'::uuid, '답변 삭제', 'Delete Answer');
SELECT _seed_trans('qna.answeredBy', '00000000-0000-0000-0001-000000000004'::uuid, '답변자', 'Answered by');

-- 거부 사유
SELECT _seed_trans('qna.rejectReason', '00000000-0000-0000-0001-000000000004'::uuid, '거부 사유', 'Rejection Reason');
SELECT _seed_trans('qna.rejectReasonPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '거부 사유를 입력하세요 (선택)', 'Enter rejection reason (optional)');

-- 통계
SELECT _seed_trans('qna.totalQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '전체 질문', 'Total Questions');
SELECT _seed_trans('qna.pendingQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '대기 중', 'Pending');
SELECT _seed_trans('qna.answeredQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '답변 완료', 'Answered');

-- 실시간
SELECT _seed_trans('qna.newQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '새 질문이 등록되었습니다.', 'New question submitted.');
SELECT _seed_trans('qna.questionUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 업데이트되었습니다.', 'Question updated.');

-- 송출 기능
SELECT _seed_trans('qna.broadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중', 'Broadcasting');
SELECT _seed_trans('qna.displayed', '00000000-0000-0000-0001-000000000004'::uuid, '화면 표시', 'Displayed');
SELECT _seed_trans('qna.startBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 시작', 'Start Broadcast');
SELECT _seed_trans('qna.stopBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중지', 'Stop Broadcast');
SELECT _seed_trans('qna.broadcastStarted', '00000000-0000-0000-0001-000000000004'::uuid, '질문 송출을 시작합니다.', 'Broadcasting started.');
SELECT _seed_trans('qna.broadcastStopped', '00000000-0000-0000-0001-000000000004'::uuid, '질문 송출을 종료합니다.', 'Broadcasting stopped.');
SELECT _seed_trans('qna.showOnScreen', '00000000-0000-0000-0001-000000000004'::uuid, '화면에 표시', 'Show on Screen');
SELECT _seed_trans('qna.hideFromScreen', '00000000-0000-0000-0001-000000000004'::uuid, '화면에서 숨김', 'Hide from Screen');

-- 강연자 지정
SELECT _seed_trans('qna.assignPresenter', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 지정', 'Assign Presenter');
SELECT _seed_trans('qna.noPresenter', '00000000-0000-0000-0001-000000000004'::uuid, '지정 안함', 'No Presenter');
SELECT _seed_trans('qna.presenterAssigned', '00000000-0000-0000-0001-000000000004'::uuid, '강연자가 지정되었습니다.', 'Presenter assigned.');

-- 드래그 앤 드랍 순서 변경
SELECT _seed_trans('qna.orderUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '순서가 변경되었습니다.', 'Order updated.');
SELECT _seed_trans('qna.cannotReorderWhileBroadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중에는 순서를 변경할 수 없습니다.', 'Cannot reorder while broadcasting.');

-- 에러
SELECT _seed_trans('error.questionEmpty', '00000000-0000-0000-0001-000000000006'::uuid, '질문 내용을 입력하세요.', 'Please enter your question.');
SELECT _seed_trans('error.questionTooLong', '00000000-0000-0000-0001-000000000006'::uuid, '질문이 너무 깁니다. (최대 500자)', 'Question is too long. (Max 500 characters)');
SELECT _seed_trans('error.questionSubmitFailed', '00000000-0000-0000-0001-000000000006'::uuid, '질문 등록에 실패했습니다.', 'Failed to submit question.');
SELECT _seed_trans('error.answerSubmitFailed', '00000000-0000-0000-0001-000000000006'::uuid, '답변 등록에 실패했습니다.', 'Failed to submit answer.');

-- 세션 탭
SELECT _seed_trans('session.qna', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A', 'Q&A');

-- 실시간 참여 페이지
SELECT _seed_trans('live.live', '00000000-0000-0000-0001-000000000004'::uuid, 'LIVE', 'LIVE');
SELECT _seed_trans('live.poll', '00000000-0000-0000-0001-000000000004'::uuid, '설문', 'Poll');
SELECT _seed_trans('live.info', '00000000-0000-0000-0001-000000000004'::uuid, '정보', 'Info');
SELECT _seed_trans('live.noPoll', '00000000-0000-0000-0001-000000000004'::uuid, '진행 중인 설문이 없습니다.', 'No active poll.');
SELECT _seed_trans('live.presenters', '00000000-0000-0000-0001-000000000004'::uuid, '강연자/발표자', 'Presenters');
SELECT _seed_trans('live.sessionEnded', '00000000-0000-0000-0001-000000000004'::uuid, '세션이 종료되었습니다.', 'Session has ended.');
SELECT _seed_trans('live.sessionEndedDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 세션은 종료되었습니다. 참여해 주셔서 감사합니다.', 'This session has ended. Thank you for participating.');
SELECT _seed_trans('live.backToJoin', '00000000-0000-0000-0001-000000000004'::uuid, '세션 정보로 돌아가기', 'Back to Session Info');
SELECT _seed_trans('live.error.notActive', '00000000-0000-0000-0001-000000000006'::uuid, '세션이 활성화되지 않았습니다.', 'Session is not active.');
SELECT _seed_trans('live.error.notActiveDesc', '00000000-0000-0000-0001-000000000006'::uuid, '세션이 아직 시작되지 않았거나 종료되었습니다.', 'The session has not started yet or has already ended.');

-- 강연자 페이지
SELECT _seed_trans('presenter.qnaControl', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A 송출 컨트롤', 'Q&A Broadcast Control');
SELECT _seed_trans('presenter.openBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 화면 열기', 'Open Broadcast');
SELECT _seed_trans('presenter.nowBroadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '현재 송출 중', 'Now Broadcasting');
SELECT _seed_trans('presenter.stopBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중지', 'Stop Broadcast');
SELECT _seed_trans('presenter.questionList', '00000000-0000-0000-0001-000000000004'::uuid, '질문 목록', 'Question List');
SELECT _seed_trans('presenter.questions', '00000000-0000-0000-0001-000000000004'::uuid, '개', 'questions');
SELECT _seed_trans('presenter.noQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '표시할 질문이 없습니다.', 'No questions to display.');

-- 좌장 선택 화면
SELECT _seed_trans('presenter.selectQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문을 선택하면 질문이 송출됩니다.', 'Select a question to broadcast.');
SELECT _seed_trans('presenter.selectQuestionDesc', '00000000-0000-0000-0001-000000000004'::uuid, '선택했던 질문은 회색 배경으로 표시됩니다.', 'Previously selected questions are shown with a gray background.');
SELECT _seed_trans('presenter.broadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '송출중', 'Broadcasting');
SELECT _seed_trans('presenter.select', '00000000-0000-0000-0001-000000000004'::uuid, '선택', 'Select');
SELECT _seed_trans('presenter.noDisplayedQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '표시할 질문이 없습니다.', 'No questions to display.');
SELECT _seed_trans('presenter.noPermission', '00000000-0000-0000-0001-000000000004'::uuid, '이 화면에 접근할 권한이 없습니다.', 'You do not have permission to access this page.');
SELECT _seed_trans('presenter.selectScreen', '00000000-0000-0000-0001-000000000004'::uuid, '좌장 선택', 'Presenter Selection');

-- 송출 화면
SELECT _seed_trans('broadcast.live', '00000000-0000-0000-0001-000000000004'::uuid, 'LIVE', 'LIVE');
SELECT _seed_trans('broadcast.waitingForQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문 대기 중...', 'Waiting for question...');

-- 송출 설정
SELECT _seed_trans('broadcast.settings', '00000000-0000-0000-0001-000000000004'::uuid, '송출 설정', 'Broadcast Settings');
SELECT _seed_trans('broadcast.screen', '00000000-0000-0000-0001-000000000004'::uuid, '송출 화면', 'Broadcast Screen');
SELECT _seed_trans('broadcast.settingsTitle', '00000000-0000-0000-0001-000000000004'::uuid, '송출화면 설정', 'Broadcast Screen Settings');
SELECT _seed_trans('broadcast.settingsDesc', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 송출되는 화면의 스타일을 설정합니다.', 'Configure the style of the broadcast screen.');
SELECT _seed_trans('broadcast.width', '00000000-0000-0000-0001-000000000004'::uuid, '너비', 'Width');
SELECT _seed_trans('broadcast.fontSize', '00000000-0000-0000-0001-000000000004'::uuid, '폰트 크기', 'Font Size');
SELECT _seed_trans('broadcast.fontColor', '00000000-0000-0000-0001-000000000004'::uuid, '폰트 색상', 'Font Color');
SELECT _seed_trans('broadcast.backgroundColor', '00000000-0000-0000-0001-000000000004'::uuid, '배경 색상', 'Background Color');
SELECT _seed_trans('broadcast.borderColor', '00000000-0000-0000-0001-000000000004'::uuid, '테두리 색상', 'Border Color');
SELECT _seed_trans('broadcast.innerBgColor', '00000000-0000-0000-0001-000000000004'::uuid, '테두리 안 배경', 'Inner Background');
SELECT _seed_trans('broadcast.textAlign', '00000000-0000-0000-0001-000000000004'::uuid, '폰트 정렬', 'Text Align');
SELECT _seed_trans('broadcast.verticalAlign', '00000000-0000-0000-0001-000000000004'::uuid, '세로 정렬', 'Vertical Align');
SELECT _seed_trans('broadcast.alignLeft', '00000000-0000-0000-0001-000000000004'::uuid, '왼쪽', 'Left');
SELECT _seed_trans('broadcast.alignCenter', '00000000-0000-0000-0001-000000000004'::uuid, '가운데', 'Center');
SELECT _seed_trans('broadcast.alignRight', '00000000-0000-0000-0001-000000000004'::uuid, '오른쪽', 'Right');
SELECT _seed_trans('broadcast.alignTop', '00000000-0000-0000-0001-000000000004'::uuid, '위', 'Top');
SELECT _seed_trans('broadcast.alignMiddle', '00000000-0000-0000-0001-000000000004'::uuid, '가운데', 'Middle');
SELECT _seed_trans('broadcast.alignBottom', '00000000-0000-0000-0001-000000000004'::uuid, '아래', 'Bottom');

-- 질문 직접 등록
SELECT _seed_trans('qna.addQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문 등록', 'Add Question');
SELECT _seed_trans('qna.addQuestionDesc', '00000000-0000-0000-0001-000000000004'::uuid, '관리자가 직접 질문을 등록합니다.', 'Manager adds a question directly.');
SELECT _seed_trans('qna.authorName', '00000000-0000-0000-0001-000000000004'::uuid, '작성자명', 'Author Name');
SELECT _seed_trans('qna.authorNamePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '작성자 이름을 입력하세요', 'Enter author name');
SELECT _seed_trans('qna.questionContent', '00000000-0000-0000-0001-000000000004'::uuid, '질문 내용', 'Question Content');
SELECT _seed_trans('qna.questionPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '질문 내용을 입력하세요...', 'Enter your question...');
SELECT _seed_trans('qna.autoApprove', '00000000-0000-0000-0001-000000000004'::uuid, '자동 승인', 'Auto Approve');
SELECT _seed_trans('qna.autoApproveDesc', '00000000-0000-0000-0001-000000000004'::uuid, '등록 즉시 승인 상태로 표시합니다.', 'Automatically approve upon registration.');
SELECT _seed_trans('qna.questionAdded', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 등록되었습니다.', 'Question has been added.');
SELECT _seed_trans('qna.contentRequired', '00000000-0000-0000-0001-000000000004'::uuid, '질문 내용을 입력해주세요.', 'Please enter the question content.');



-- =====================================================
-- 설문(Poll) 관련 언어팩
-- =====================================================

-- 기본
SELECT _seed_trans('poll.management', '00000000-0000-0000-0001-000000000004'::uuid, '설문 관리', 'Poll Management');
SELECT _seed_trans('poll.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '실시간 설문을 생성하고 관리합니다.', 'Create and manage live polls.');
SELECT _seed_trans('poll.responseScreen', '00000000-0000-0000-0001-000000000004'::uuid, '응답 화면', 'Response Screen');
SELECT _seed_trans('poll.create', '00000000-0000-0000-0001-000000000004'::uuid, '설문 추가', 'Create Poll');
SELECT _seed_trans('poll.edit', '00000000-0000-0000-0001-000000000004'::uuid, '설문 수정', 'Edit Poll');
SELECT _seed_trans('poll.editDesc', '00000000-0000-0000-0001-000000000004'::uuid, '설문 내용과 보기를 편집합니다.', 'Edit poll content and options.');
SELECT _seed_trans('poll.created', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 생성되었습니다.', 'Poll created.');
SELECT _seed_trans('poll.noPolls', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 설문이 없습니다.', 'No polls registered.');
SELECT _seed_trans('poll.createFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 설문 만들기', 'Create first poll');

-- 상태
SELECT _seed_trans('poll.statusDraft', '00000000-0000-0000-0001-000000000004'::uuid, '비노출', 'Hidden');
SELECT _seed_trans('poll.statusActive', '00000000-0000-0000-0001-000000000004'::uuid, '노출', 'Visible');
SELECT _seed_trans('poll.statusClosed', '00000000-0000-0000-0001-000000000004'::uuid, '종료', 'Closed');
SELECT _seed_trans('poll.show', '00000000-0000-0000-0001-000000000004'::uuid, '노출', 'Show');
SELECT _seed_trans('poll.hide', '00000000-0000-0000-0001-000000000004'::uuid, '비노출', 'Hide');
SELECT _seed_trans('poll.shown', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 노출되었습니다.', 'Poll is now visible.');
SELECT _seed_trans('poll.hidden', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 비노출 처리되었습니다.', 'Poll is now hidden.');
SELECT _seed_trans('poll.start', '00000000-0000-0000-0001-000000000004'::uuid, '시작', 'Start');
SELECT _seed_trans('poll.close', '00000000-0000-0000-0001-000000000004'::uuid, '종료', 'Close');
SELECT _seed_trans('poll.started', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 시작되었습니다.', 'Poll started.');
SELECT _seed_trans('poll.closed', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 종료되었습니다.', 'Poll closed.');

-- 유형
SELECT _seed_trans('poll.pollType', '00000000-0000-0000-0001-000000000004'::uuid, '설문 유형', 'Poll Type');
SELECT _seed_trans('poll.type.single', '00000000-0000-0000-0001-000000000004'::uuid, '단일 선택', 'Single Choice');
SELECT _seed_trans('poll.type.multiple', '00000000-0000-0000-0001-000000000004'::uuid, '복수 선택', 'Multiple Choice');
SELECT _seed_trans('poll.type.open', '00000000-0000-0000-0001-000000000004'::uuid, '주관식', 'Open-ended');

-- 질문/보기
SELECT _seed_trans('poll.question', '00000000-0000-0000-0001-000000000004'::uuid, '질문', 'Question');
SELECT _seed_trans('poll.questionPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '설문 질문을 입력하세요...', 'Enter your poll question...');
SELECT _seed_trans('poll.options', '00000000-0000-0000-0001-000000000004'::uuid, '보기', 'Options');
SELECT _seed_trans('poll.option', '00000000-0000-0000-0001-000000000004'::uuid, '보기', 'Option');
SELECT _seed_trans('poll.addOption', '00000000-0000-0000-0001-000000000004'::uuid, '보기 추가', 'Add Option');
SELECT _seed_trans('poll.maxSelections', '00000000-0000-0000-0001-000000000004'::uuid, '최대 선택 수', 'Max Selections');
SELECT _seed_trans('poll.maxSelectionsPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '제한 없음', 'No limit');

-- 설정
SELECT _seed_trans('poll.showResults', '00000000-0000-0000-0001-000000000004'::uuid, '결과 공개', 'Show Results');
SELECT _seed_trans('poll.allowAnonymous', '00000000-0000-0000-0001-000000000004'::uuid, '익명 응답 허용', 'Allow Anonymous');
SELECT _seed_trans('poll.isRequired', '00000000-0000-0000-0001-000000000004'::uuid, '필수 응답', 'Required');
SELECT _seed_trans('poll.required', '00000000-0000-0000-0001-000000000004'::uuid, '필수', 'Required');

-- 결과
SELECT _seed_trans('poll.results', '00000000-0000-0000-0001-000000000004'::uuid, '결과', 'Results');
SELECT _seed_trans('poll.totalResponses', '00000000-0000-0000-0001-000000000004'::uuid, '총 응답 수', 'Total Responses');
SELECT _seed_trans('poll.noResponses', '00000000-0000-0000-0001-000000000004'::uuid, '응답이 없습니다.', 'No responses yet.');

-- 삭제
SELECT _seed_trans('poll.deleteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '설문을 삭제하시겠습니까?', 'Delete this poll?');
SELECT _seed_trans('poll.deleteConfirmDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 작업은 되돌릴 수 없습니다. 설문과 모든 응답이 삭제됩니다.', 'This action cannot be undone. The poll and all responses will be deleted.');

-- 에러
SELECT _seed_trans('poll.error.questionRequired', '00000000-0000-0000-0001-000000000006'::uuid, '질문을 입력하세요.', 'Please enter a question.');
SELECT _seed_trans('poll.error.minOptions', '00000000-0000-0000-0001-000000000006'::uuid, '최소 2개의 보기가 필요합니다.', 'At least 2 options are required.');

-- 청중 화면
SELECT _seed_trans('poll.submit', '00000000-0000-0000-0001-000000000004'::uuid, '응답 제출', 'Submit');
SELECT _seed_trans('poll.submitAll', '00000000-0000-0000-0001-000000000004'::uuid, '설문 등록', 'Submit Survey');
SELECT _seed_trans('poll.submitted', '00000000-0000-0000-0001-000000000004'::uuid, '응답이 제출되었습니다.', 'Response submitted.');
SELECT _seed_trans('poll.allSubmitted', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 제출되었습니다.', 'Survey submitted.');
SELECT _seed_trans('poll.submitComplete', '00000000-0000-0000-0001-000000000004'::uuid, '응답 완료', 'Response Complete');
SELECT _seed_trans('poll.thankYou', '00000000-0000-0000-0001-000000000004'::uuid, '참여해 주셔서 감사합니다.', 'Thank you for participating.');
SELECT _seed_trans('poll.alreadyResponded', '00000000-0000-0000-0001-000000000004'::uuid, '이미 응답하셨습니다.', 'You have already responded.');
SELECT _seed_trans('poll.selectOption', '00000000-0000-0000-0001-000000000004'::uuid, '보기를 선택하세요', 'Select an option');
SELECT _seed_trans('poll.enterResponse', '00000000-0000-0000-0001-000000000004'::uuid, '응답을 입력하세요', 'Enter your response');
SELECT _seed_trans('poll.requiredError', '00000000-0000-0000-0001-000000000004'::uuid, '{{num}}번 질문은 필수입니다.', 'Question {{num}} is required.');
SELECT _seed_trans('poll.maxSelectionsHint', '00000000-0000-0000-0001-000000000004'::uuid, '최대 {{max}}개 선택 가능', 'Select up to {{max}}');
SELECT _seed_trans('poll.maxSelectionsReached', '00000000-0000-0000-0001-000000000004'::uuid, '최대 {{max}}개까지만 선택할 수 있습니다.', 'You can select up to {{max}} options.');
SELECT _seed_trans('poll.viewResults', '00000000-0000-0000-0001-000000000004'::uuid, '결과 보기', 'View Results');




-- =====================================================
-- 문의/지원 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.support', '00000000-0000-0000-0001-000000000004'::uuid, '문의/지원', 'Support');
SELECT _seed_trans('menu.supportManagement', '00000000-0000-0000-0001-000000000004'::uuid, '문의/지원 관리', 'Support Management');
SELECT _seed_trans('menu.faq', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ', 'FAQ');
SELECT _seed_trans('menu.inquiry', '00000000-0000-0000-0001-000000000004'::uuid, '1:1 문의', 'Inquiry');
SELECT _seed_trans('menu.faqManagement', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 관리', 'FAQ Management');
SELECT _seed_trans('menu.inquiryManagement', '00000000-0000-0000-0001-000000000004'::uuid, '문의 관리', 'Inquiry Management');

-- FAQ
SELECT _seed_trans('faq.title', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ', 'FAQ');
SELECT _seed_trans('faq.desc', '00000000-0000-0000-0001-000000000004'::uuid, '자주 묻는 질문을 확인하세요.', 'Check frequently asked questions.');
SELECT _seed_trans('faq.management', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 관리', 'FAQ Management');
SELECT _seed_trans('faq.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '자주 묻는 질문을 등록하고 관리합니다.', 'Register and manage frequently asked questions.');
SELECT _seed_trans('faq.create', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 추가', 'Add FAQ');
SELECT _seed_trans('faq.createDesc', '00000000-0000-0000-0001-000000000004'::uuid, '새로운 FAQ를 등록합니다.', 'Register a new FAQ.');
SELECT _seed_trans('faq.createFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 FAQ 등록', 'Add First FAQ');
SELECT _seed_trans('faq.edit', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 수정', 'Edit FAQ');
SELECT _seed_trans('faq.editDesc', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 내용을 수정합니다.', 'Edit FAQ content.');
SELECT _seed_trans('faq.created', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ가 등록되었습니다.', 'FAQ has been created.');
SELECT _seed_trans('faq.noFaqs', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 FAQ가 없습니다.', 'No FAQs registered.');
SELECT _seed_trans('faq.category', '00000000-0000-0000-0001-000000000004'::uuid, '카테고리', 'Category');
SELECT _seed_trans('faq.question', '00000000-0000-0000-0001-000000000004'::uuid, '질문', 'Question');
SELECT _seed_trans('faq.questionPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '질문을 입력하세요.', 'Enter your question.');
SELECT _seed_trans('faq.answer', '00000000-0000-0000-0001-000000000004'::uuid, '답변', 'Answer');
SELECT _seed_trans('faq.answerPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '답변을 입력하세요.', 'Enter your answer.');
SELECT _seed_trans('faq.isActive', '00000000-0000-0000-0001-000000000004'::uuid, '활성화', 'Active');
SELECT _seed_trans('faq.inactive', '00000000-0000-0000-0001-000000000004'::uuid, '비활성', 'Inactive');
SELECT _seed_trans('faq.show', '00000000-0000-0000-0001-000000000004'::uuid, '노출', 'Show');
SELECT _seed_trans('faq.hide', '00000000-0000-0000-0001-000000000004'::uuid, '숨김', 'Hide');
SELECT _seed_trans('faq.shown', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ가 노출되었습니다.', 'FAQ is now visible.');
SELECT _seed_trans('faq.hidden', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ가 숨겨졌습니다.', 'FAQ is now hidden.');
SELECT _seed_trans('faq.deleteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ를 삭제하시겠습니까?', 'Delete this FAQ?');
SELECT _seed_trans('faq.deleteConfirmDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 작업은 되돌릴 수 없습니다.', 'This action cannot be undone.');
SELECT _seed_trans('faq.orderUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '순서가 변경되었습니다.', 'Order has been updated.');
SELECT _seed_trans('faq.searchPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 검색...', 'Search FAQ...');

-- FAQ 카테고리
SELECT _seed_trans('faq.categoryAll', '00000000-0000-0000-0001-000000000004'::uuid, '전체', 'All');
SELECT _seed_trans('faq.categoryCommon', '00000000-0000-0000-0001-000000000004'::uuid, '공통', 'Common');
SELECT _seed_trans('faq.categoryOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사자', 'Organizer');
SELECT _seed_trans('faq.categoryAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행사', 'Agency');
SELECT _seed_trans('faq.categoryInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자', 'Instructor');

-- 1:1 문의
SELECT _seed_trans('inquiry.title', '00000000-0000-0000-0001-000000000004'::uuid, '1:1 문의', '1:1 Inquiry');
SELECT _seed_trans('inquiry.desc', '00000000-0000-0000-0001-000000000004'::uuid, '문의 사항을 남겨주시면 빠르게 답변 드리겠습니다.', 'Leave your inquiry and we will respond quickly.');
SELECT _seed_trans('inquiry.management', '00000000-0000-0000-0001-000000000004'::uuid, '문의 관리', 'Inquiry Management');
SELECT _seed_trans('inquiry.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너의 문의 내역을 확인하고 답변합니다.', 'Check and respond to partner inquiries.');
SELECT _seed_trans('inquiry.create', '00000000-0000-0000-0001-000000000004'::uuid, '문의하기', 'New Inquiry');
SELECT _seed_trans('inquiry.createDesc', '00000000-0000-0000-0001-000000000004'::uuid, '문의 내용을 작성해 주세요.', 'Please write your inquiry.');
SELECT _seed_trans('inquiry.createFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 문의하기', 'Create First Inquiry');
SELECT _seed_trans('inquiry.submit', '00000000-0000-0000-0001-000000000004'::uuid, '문의 등록', 'Submit Inquiry');
SELECT _seed_trans('inquiry.submitted', '00000000-0000-0000-0001-000000000004'::uuid, '문의가 등록되었습니다.', 'Inquiry has been submitted.');
SELECT _seed_trans('inquiry.noInquiries', '00000000-0000-0000-0001-000000000004'::uuid, '문의 내역이 없습니다.', 'No inquiries found.');
SELECT _seed_trans('inquiry.category', '00000000-0000-0000-0001-000000000004'::uuid, '카테고리', 'Category');
SELECT _seed_trans('inquiry.titleLabel', '00000000-0000-0000-0001-000000000004'::uuid, '제목', 'Title');
SELECT _seed_trans('inquiry.titlePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '제목을 입력하세요.', 'Enter title.');
SELECT _seed_trans('inquiry.content', '00000000-0000-0000-0001-000000000004'::uuid, '내용', 'Content');
SELECT _seed_trans('inquiry.contentPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '문의 내용을 자세히 입력해 주세요.', 'Please enter your inquiry in detail.');

-- 문의 카테고리
SELECT _seed_trans('inquiry.categoryGeneral', '00000000-0000-0000-0001-000000000004'::uuid, '일반 문의', 'General');
SELECT _seed_trans('inquiry.categoryTechnical', '00000000-0000-0000-0001-000000000004'::uuid, '기술 지원', 'Technical');
SELECT _seed_trans('inquiry.categoryBilling', '00000000-0000-0000-0001-000000000004'::uuid, '결제/정산', 'Billing');
SELECT _seed_trans('inquiry.categoryEtc', '00000000-0000-0000-0001-000000000004'::uuid, '기타', 'Other');

-- 문의 상태
SELECT _seed_trans('inquiry.statusPending', '00000000-0000-0000-0001-000000000004'::uuid, '답변 대기', 'Pending');
SELECT _seed_trans('inquiry.statusInProgress', '00000000-0000-0000-0001-000000000004'::uuid, '처리 중', 'In Progress');
SELECT _seed_trans('inquiry.statusResolved', '00000000-0000-0000-0001-000000000004'::uuid, '답변 완료', 'Resolved');
SELECT _seed_trans('inquiry.statusUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '상태가 변경되었습니다.', 'Status has been updated.');
SELECT _seed_trans('inquiry.changeStatus', '00000000-0000-0000-0001-000000000004'::uuid, '상태 변경', 'Change Status');

-- 답변
SELECT _seed_trans('inquiry.adminReply', '00000000-0000-0000-0001-000000000004'::uuid, '관리자 답변', 'Admin Reply');
SELECT _seed_trans('inquiry.myReply', '00000000-0000-0000-0001-000000000004'::uuid, '내 답글', 'My Reply');
SELECT _seed_trans('inquiry.noReplies', '00000000-0000-0000-0001-000000000004'::uuid, '아직 답변이 없습니다.', 'No replies yet.');
SELECT _seed_trans('inquiry.replyPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '답변을 입력하세요...', 'Enter your reply...');
SELECT _seed_trans('inquiry.additionalPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '추가 문의 사항을 입력하세요...', 'Enter additional inquiry...');
SELECT _seed_trans('inquiry.replySent', '00000000-0000-0000-0001-000000000004'::uuid, '답변이 전송되었습니다.', 'Reply has been sent.');




-- =====================================================
-- 로그인 로그 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.loginLogs', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 로그', 'Login Logs');

-- 페이지 제목
SELECT _seed_trans('loginLog.title', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 로그', 'Login Logs');
SELECT _seed_trans('loginLog.desc', '00000000-0000-0000-0001-000000000001'::uuid, '사용자 로그인/로그아웃 기록을 확인합니다.', 'View user login/logout history.');

-- 통계
SELECT _seed_trans('loginLog.totalLogins', '00000000-0000-0000-0001-000000000001'::uuid, '총 로그인', 'Total Logins');
SELECT _seed_trans('loginLog.successfulLogins', '00000000-0000-0000-0001-000000000001'::uuid, '성공', 'Successful');
SELECT _seed_trans('loginLog.failedLogins', '00000000-0000-0000-0001-000000000001'::uuid, '실패', 'Failed');
SELECT _seed_trans('loginLog.uniqueUsers', '00000000-0000-0000-0001-000000000001'::uuid, '고유 사용자', 'Unique Users');
SELECT _seed_trans('loginLog.forcedLogouts', '00000000-0000-0000-0001-000000000001'::uuid, '강제 로그아웃', 'Forced Logouts');

-- 활성 세션
SELECT _seed_trans('loginLog.activeSessions', '00000000-0000-0000-0001-000000000001'::uuid, '활성 세션', 'Active Sessions');
SELECT _seed_trans('loginLog.activeSessionsDesc', '00000000-0000-0000-0001-000000000001'::uuid, '현재 로그인된 사용자 세션입니다.', 'Currently logged in user sessions.');
SELECT _seed_trans('loginLog.noActiveSessions', '00000000-0000-0000-0001-000000000001'::uuid, '활성 세션이 없습니다.', 'No active sessions.');
SELECT _seed_trans('loginLog.moreSessions', '00000000-0000-0000-0001-000000000001'::uuid, '개 더 보기', 'more sessions');
SELECT _seed_trans('loginLog.forceLogout', '00000000-0000-0000-0001-000000000001'::uuid, '강제 종료', 'Force Logout');
SELECT _seed_trans('loginLog.confirmForceLogout', '00000000-0000-0000-0001-000000000001'::uuid, '이 세션을 강제로 종료하시겠습니까?', 'Force end this session?');

-- 이벤트 타입
SELECT _seed_trans('loginLog.loginSuccess', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 성공', 'Login Success');
SELECT _seed_trans('loginLog.loginFailed', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 실패', 'Login Failed');
SELECT _seed_trans('loginLog.logout', '00000000-0000-0000-0001-000000000001'::uuid, '로그아웃', 'Logout');
SELECT _seed_trans('loginLog.forcedLogout', '00000000-0000-0000-0001-000000000001'::uuid, '강제 로그아웃', 'Forced Logout');
SELECT _seed_trans('loginLog.sessionExpired', '00000000-0000-0000-0001-000000000001'::uuid, '세션 만료', 'Session Expired');

-- 실패 사유
SELECT _seed_trans('loginLog.reasonInvalidPassword', '00000000-0000-0000-0001-000000000001'::uuid, '비밀번호 오류', 'Invalid Password');
SELECT _seed_trans('loginLog.reasonUserNotFound', '00000000-0000-0000-0001-000000000001'::uuid, '사용자 없음', 'User Not Found');
SELECT _seed_trans('loginLog.reasonAccountDisabled', '00000000-0000-0000-0001-000000000001'::uuid, '계정 비활성화', 'Account Disabled');
SELECT _seed_trans('loginLog.reasonEmailNotConfirmed', '00000000-0000-0000-0001-000000000001'::uuid, '이메일 미인증', 'Email Not Confirmed');
SELECT _seed_trans('loginLog.reasonTooManyAttempts', '00000000-0000-0000-0001-000000000001'::uuid, '시도 횟수 초과', 'Too Many Attempts');
SELECT _seed_trans('loginLog.reasonTooManyRequests', '00000000-0000-0000-0001-000000000001'::uuid, '요청 횟수 초과', 'Too Many Requests');
SELECT _seed_trans('loginLog.reasonDuplicateLogin', '00000000-0000-0000-0001-000000000001'::uuid, '중복 로그인', 'Duplicate Login');
SELECT _seed_trans('loginLog.reasonUnknown', '00000000-0000-0000-0001-000000000001'::uuid, '알 수 없는 오류', 'Unknown Error');

-- 필터
SELECT _seed_trans('loginLog.searchEmail', '00000000-0000-0000-0001-000000000001'::uuid, '이메일 검색...', 'Search email...');
SELECT _seed_trans('loginLog.eventType', '00000000-0000-0000-0001-000000000001'::uuid, '이벤트 타입', 'Event Type');
SELECT _seed_trans('loginLog.dateRange', '00000000-0000-0000-0001-000000000001'::uuid, '기간', 'Date Range');
SELECT _seed_trans('loginLog.last1Day', '00000000-0000-0000-0001-000000000001'::uuid, '최근 1일', 'Last 1 Day');
SELECT _seed_trans('loginLog.last7Days', '00000000-0000-0000-0001-000000000001'::uuid, '최근 7일', 'Last 7 Days');
SELECT _seed_trans('loginLog.last30Days', '00000000-0000-0000-0001-000000000001'::uuid, '최근 30일', 'Last 30 Days');
SELECT _seed_trans('loginLog.last90Days', '00000000-0000-0000-0001-000000000001'::uuid, '최근 90일', 'Last 90 Days');

-- 테이블
SELECT _seed_trans('loginLog.time', '00000000-0000-0000-0001-000000000001'::uuid, '시간', 'Time');
SELECT _seed_trans('loginLog.email', '00000000-0000-0000-0001-000000000001'::uuid, '이메일', 'Email');
SELECT _seed_trans('loginLog.failureReason', '00000000-0000-0000-0001-000000000001'::uuid, '실패 사유', 'Failure Reason');
SELECT _seed_trans('loginLog.device', '00000000-0000-0000-0001-000000000001'::uuid, '기기', 'Device');
SELECT _seed_trans('loginLog.ip', '00000000-0000-0000-0001-000000000001'::uuid, 'IP', 'IP');
SELECT _seed_trans('loginLog.noLogs', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 기록이 없습니다.', 'No login logs.');

-- 상세 보기
SELECT _seed_trans('loginLog.detail', '00000000-0000-0000-0001-000000000001'::uuid, '로그 상세', 'Log Detail');
SELECT _seed_trans('loginLog.browser', '00000000-0000-0000-0001-000000000001'::uuid, '브라우저', 'Browser');
SELECT _seed_trans('loginLog.os', '00000000-0000-0000-0001-000000000001'::uuid, '운영체제', 'OS');
SELECT _seed_trans('loginLog.sessionId', '00000000-0000-0000-0001-000000000001'::uuid, '세션 ID', 'Session ID');
SELECT _seed_trans('loginLog.userAgent', '00000000-0000-0000-0001-000000000001'::uuid, 'User Agent', 'User Agent');

-- 로그인 페이지
SELECT _seed_trans('auth.accountLocked', '00000000-0000-0000-0001-000000000004'::uuid, '계정이 잠겼습니다.', 'Account is locked.');
SELECT _seed_trans('auth.tooManyAttempts', '00000000-0000-0000-0001-000000000004'::uuid, '로그인 시도 횟수를 초과했습니다.', 'Too many login attempts.');
SELECT _seed_trans('auth.attemptsRemaining', '00000000-0000-0000-0001-000000000004'::uuid, '남은 시도: {{count}}회', 'Attempts remaining: {{count}}');
SELECT _seed_trans('auth.unlockIn', '00000000-0000-0000-0001-000000000004'::uuid, '{{time}} 후 잠금 해제', 'Unlock in {{time}}');

-- 강제 로그아웃
SELECT _seed_trans('auth.duplicateLoginLogout', '00000000-0000-0000-0001-000000000004'::uuid, '다른 기기에서 로그인되었습니다.', 'Logged in from another device.');
SELECT _seed_trans('auth.duplicateLoginLogoutDesc', '00000000-0000-0000-0001-000000000004'::uuid, '보안을 위해 현재 세션이 종료되었습니다.', 'Your current session has been terminated for security.');
SELECT _seed_trans('auth.sessionExpired', '00000000-0000-0000-0001-000000000004'::uuid, '세션이 만료되었습니다.', 'Session expired.');



-- =====================================================
-- 사용자 상세 팝업 관련 언어팩
-- =====================================================

-- 사용자 상세 정보
SELECT _seed_trans('admin.userDetail', '00000000-0000-0000-0001-000000000003'::uuid, '회원 상세 정보', 'User Details');
SELECT _seed_trans('admin.basicInfo', '00000000-0000-0000-0001-000000000003'::uuid, '기본 정보', 'Basic Info');
SELECT _seed_trans('admin.partnerInfo', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('admin.activityLog', '00000000-0000-0000-0001-000000000003'::uuid, '활동 로그', 'Activity Log');

-- 파트너 관련
SELECT _seed_trans('admin.ownedPartner', '00000000-0000-0000-0001-000000000003'::uuid, '소유 파트너', 'Owned Partner');
SELECT _seed_trans('admin.memberOfPartners', '00000000-0000-0000-0001-000000000003'::uuid, '소속 파트너', 'Member of Partners');
SELECT _seed_trans('admin.teamMembers', '00000000-0000-0000-0001-000000000003'::uuid, '팀 멤버', 'Team Members');
SELECT _seed_trans('admin.noPartnerData', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 정보를 찾을 수 없습니다.', 'Partner data not found.');
SELECT _seed_trans('admin.notPartner', '00000000-0000-0000-0001-000000000003'::uuid, '파트너가 아닙니다.', 'Not a partner.');

-- 활동 로그 관련
SELECT _seed_trans('admin.recentLogins', '00000000-0000-0000-0001-000000000003'::uuid, '최근 로그인 기록', 'Recent Login History');
SELECT _seed_trans('admin.loginSuccess', '00000000-0000-0000-0001-000000000003'::uuid, '로그인 성공', 'Login Success');
SELECT _seed_trans('admin.loginFailed', '00000000-0000-0000-0001-000000000003'::uuid, '로그인 실패', 'Login Failed');
SELECT _seed_trans('admin.logout', '00000000-0000-0000-0001-000000000003'::uuid, '로그아웃', 'Logout');
SELECT _seed_trans('admin.sessionExpired', '00000000-0000-0000-0001-000000000003'::uuid, '세션 만료', 'Session Expired');
SELECT _seed_trans('admin.forcedLogout', '00000000-0000-0000-0001-000000000003'::uuid, '강제 로그아웃', 'Forced Logout');
SELECT _seed_trans('admin.noLoginLogs', '00000000-0000-0000-0001-000000000003'::uuid, '로그인 기록이 없습니다.', 'No login history.');

-- 기타 정보
SELECT _seed_trans('admin.preferredLanguage', '00000000-0000-0000-0001-000000000003'::uuid, '선호 언어', 'Preferred Language');
SELECT _seed_trans('admin.description', '00000000-0000-0000-0001-000000000003'::uuid, '소개', 'Description');
SELECT _seed_trans('admin.createdSessions', '00000000-0000-0000-0001-000000000003'::uuid, '생성한 세션', 'Created Sessions');

-- 파트너 추가 정보
SELECT _seed_trans('partner.businessNumber', '00000000-0000-0000-0001-000000000004'::uuid, '사업자번호', 'Business Number');
SELECT _seed_trans('partner.purpose', '00000000-0000-0000-0001-000000000004'::uuid, '사용 목적', 'Purpose');

-- 파트너 정보 컬럼 관련
SELECT _seed_trans('admin.colPartnerInfo', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('admin.owner', '00000000-0000-0000-0001-000000000003'::uuid, '소유자', 'Owner');
SELECT _seed_trans('admin.joined', '00000000-0000-0000-0001-000000000003'::uuid, '가입', 'Joined');

-- 팀 역할
SELECT _seed_trans('team.roleOwner', '00000000-0000-0000-0001-000000000004'::uuid, '소유자', 'Owner');
SELECT _seed_trans('team.roleAdmin', '00000000-0000-0000-0001-000000000004'::uuid, '관리자', 'Admin');
SELECT _seed_trans('team.roleMember', '00000000-0000-0000-0001-000000000004'::uuid, '멤버', 'Member');




