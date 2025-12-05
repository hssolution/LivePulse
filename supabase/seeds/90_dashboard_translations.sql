-- 1. Dashboard 카테고리 생성
INSERT INTO public.language_categories (name, description, sort_order)
VALUES ('dashboard', '관리자 대시보드용 텍스트', 10)
ON CONFLICT (name) DO NOTHING;

-- 2. 카테고리 ID 조회
DO $$
DECLARE
    dashboard_cat_id uuid;
BEGIN
    SELECT id INTO dashboard_cat_id FROM public.language_categories WHERE name = 'dashboard';

    -- 3. 키 및 번역 데이터 삽입 (한국어, 영어)
    -- 헬퍼 함수: 키가 있으면 스킵, 없으면 추가
    
    -- 3.1 Overview
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.overview', dashboard_cat_id, '대시보드 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '대시보드 개요' FROM public.language_keys WHERE key = 'dashboard.overview' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Dashboard Overview' FROM public.language_keys WHERE key = 'dashboard.overview' ON CONFLICT DO NOTHING;

    -- 3.2 Download Report
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.downloadReport', dashboard_cat_id, '리포트 다운로드 버튼') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '리포트 다운로드' FROM public.language_keys WHERE key = 'dashboard.downloadReport' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Download Report' FROM public.language_keys WHERE key = 'dashboard.downloadReport' ON CONFLICT DO NOTHING;

    -- 3.3 Total Users
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.totalUsers', dashboard_cat_id, '총 사용자 카드 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '총 사용자' FROM public.language_keys WHERE key = 'dashboard.totalUsers' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Total Users' FROM public.language_keys WHERE key = 'dashboard.totalUsers' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.usersDesc', dashboard_cat_id, '총 사용자 카드 설명') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '전체 등록된 회원 수' FROM public.language_keys WHERE key = 'dashboard.usersDesc' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Total registered users' FROM public.language_keys WHERE key = 'dashboard.usersDesc' ON CONFLICT DO NOTHING;

    -- 3.4 Active Sessions
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.activeSessions', dashboard_cat_id, '활성 세션 카드 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '활성 세션' FROM public.language_keys WHERE key = 'dashboard.activeSessions' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Active Sessions' FROM public.language_keys WHERE key = 'dashboard.activeSessions' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.sessionsDesc', dashboard_cat_id, '활성 세션 카드 설명') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '진행 중 또는 공개된 세션' FROM public.language_keys WHERE key = 'dashboard.sessionsDesc' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Ongoing or published sessions' FROM public.language_keys WHERE key = 'dashboard.sessionsDesc' ON CONFLICT DO NOTHING;

    -- 3.5 Pending Partners
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.pendingPartners', dashboard_cat_id, '파트너 대기 카드 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '파트너 승인 대기' FROM public.language_keys WHERE key = 'dashboard.pendingPartners' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Pending Partner Requests' FROM public.language_keys WHERE key = 'dashboard.pendingPartners' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.reviewRequest', dashboard_cat_id, '파트너 검토 링크') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '검토하러 가기' FROM public.language_keys WHERE key = 'dashboard.reviewRequest' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Review Requests' FROM public.language_keys WHERE key = 'dashboard.reviewRequest' ON CONFLICT DO NOTHING;

    -- 3.6 Today Logins
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.todayLogins', dashboard_cat_id, '오늘 로그인 카드 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '오늘의 로그인' FROM public.language_keys WHERE key = 'dashboard.todayLogins' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Today''s Logins' FROM public.language_keys WHERE key = 'dashboard.todayLogins' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.loginDesc', dashboard_cat_id, '오늘 로그인 카드 설명') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '오늘 접속한 횟수' FROM public.language_keys WHERE key = 'dashboard.loginDesc' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Number of logins today' FROM public.language_keys WHERE key = 'dashboard.loginDesc' ON CONFLICT DO NOTHING;

    -- 3.7 Charts
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.registrationTrend', dashboard_cat_id, '가입자 추이 차트 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '주간 가입자 추이' FROM public.language_keys WHERE key = 'dashboard.registrationTrend' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Weekly Registration Trend' FROM public.language_keys WHERE key = 'dashboard.registrationTrend' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.chartDesc', dashboard_cat_id, '가입자 추이 차트 설명') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '최근 7일간의 신규 회원 가입 현황입니다.' FROM public.language_keys WHERE key = 'dashboard.chartDesc' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'New user registrations over the last 7 days.' FROM public.language_keys WHERE key = 'dashboard.chartDesc' ON CONFLICT DO NOTHING;

    -- 3.8 Recent Activity
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.recentActivity', dashboard_cat_id, '최근 활동 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '최근 로그인 활동' FROM public.language_keys WHERE key = 'dashboard.recentActivity' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Recent Login Activity' FROM public.language_keys WHERE key = 'dashboard.recentActivity' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.activityDesc', dashboard_cat_id, '최근 활동 설명') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '최근 시스템에 접속한 사용자입니다.' FROM public.language_keys WHERE key = 'dashboard.activityDesc' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Users who recently accessed the system.' FROM public.language_keys WHERE key = 'dashboard.activityDesc' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.noData', dashboard_cat_id, '데이터 없음') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '데이터가 없습니다.' FROM public.language_keys WHERE key = 'dashboard.noData' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'No data available.' FROM public.language_keys WHERE key = 'dashboard.noData' ON CONFLICT DO NOTHING;

    -- 3.9 Quick Actions
    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.quickActions', dashboard_cat_id, '빠른 실행 제목') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '빠른 바로가기' FROM public.language_keys WHERE key = 'dashboard.quickActions' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Quick Actions' FROM public.language_keys WHERE key = 'dashboard.quickActions' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.action.approvePartner', dashboard_cat_id, '파트너 승인 버튼') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '파트너 승인' FROM public.language_keys WHERE key = 'dashboard.action.approvePartner' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Approve Partners' FROM public.language_keys WHERE key = 'dashboard.action.approvePartner' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.action.manageSessions', dashboard_cat_id, '세션 관리 버튼') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '세션 관리' FROM public.language_keys WHERE key = 'dashboard.action.manageSessions' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Manage Sessions' FROM public.language_keys WHERE key = 'dashboard.action.manageSessions' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.action.manageLanguages', dashboard_cat_id, '언어팩 관리 버튼') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '언어팩 관리' FROM public.language_keys WHERE key = 'dashboard.action.manageLanguages' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Manage Languages' FROM public.language_keys WHERE key = 'dashboard.action.manageLanguages' ON CONFLICT DO NOTHING;

    INSERT INTO public.language_keys (key, category_id, description) VALUES ('dashboard.action.managePosts', dashboard_cat_id, '게시물 관리 버튼') ON CONFLICT (key) DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'ko', '게시물 관리' FROM public.language_keys WHERE key = 'dashboard.action.managePosts' ON CONFLICT DO NOTHING;
    INSERT INTO public.translations (key_id, language_code, value) SELECT id, 'en', 'Manage Posts' FROM public.language_keys WHERE key = 'dashboard.action.managePosts' ON CONFLICT DO NOTHING;

END $$;

