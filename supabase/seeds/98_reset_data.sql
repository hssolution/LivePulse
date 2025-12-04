-- =====================================================
-- 데이터 초기화 스크립트
-- 모든 테이블의 데이터를 삭제합니다 (테이블 구조는 유지)
-- 외래 키 제약 조건을 고려하여 순서대로 삭제합니다.
-- 
-- ⚠️ 경고: 이 스크립트를 실행하면 모든 데이터가 삭제됩니다!
-- =====================================================

-- 트랜잭션 시작
BEGIN;

-- =====================================================
-- 1. 문의/지원 관련
-- =====================================================
TRUNCATE TABLE public.inquiry_replies CASCADE;
TRUNCATE TABLE public.inquiries CASCADE;
TRUNCATE TABLE public.faqs CASCADE;

-- =====================================================
-- 2. 설문 관련
-- =====================================================
TRUNCATE TABLE public.poll_responses CASCADE;
TRUNCATE TABLE public.poll_options CASCADE;
TRUNCATE TABLE public.polls CASCADE;

-- =====================================================
-- 3. Q&A 관련
-- =====================================================
TRUNCATE TABLE public.question_likes CASCADE;
TRUNCATE TABLE public.questions CASCADE;

-- =====================================================
-- 4. 세션 관련
-- =====================================================
TRUNCATE TABLE public.session_presenters CASCADE;
TRUNCATE TABLE public.session_partners CASCADE;
TRUNCATE TABLE public.session_members CASCADE;
TRUNCATE TABLE public.session_assets CASCADE;
TRUNCATE TABLE public.sessions CASCADE;

-- =====================================================
-- 5. 템플릿 관련 (필요시 주석 해제)
-- 기본 템플릿을 유지하려면 주석 처리 상태로 둡니다
-- =====================================================
-- TRUNCATE TABLE public.session_template_fields CASCADE;
-- TRUNCATE TABLE public.session_templates CASCADE;

-- =====================================================
-- 6. 파트너 관련
-- =====================================================
TRUNCATE TABLE public.partner_members CASCADE;
TRUNCATE TABLE public.partner_instructors CASCADE;
TRUNCATE TABLE public.partner_agencies CASCADE;
TRUNCATE TABLE public.partner_organizers CASCADE;
TRUNCATE TABLE public.partners CASCADE;
TRUNCATE TABLE public.partner_requests CASCADE;

-- =====================================================
-- 7. 로그인/세션 관련
-- =====================================================
TRUNCATE TABLE public.login_logs CASCADE;
TRUNCATE TABLE public.active_sessions CASCADE;
TRUNCATE TABLE public.login_attempts CASCADE;

-- =====================================================
-- 8. 사용자 관련
-- =====================================================
TRUNCATE TABLE public.user_theme_settings CASCADE;

-- 프로필 삭제 (auth.users와 연결됨)
-- profiles는 auth.users 삭제 시 자동으로 삭제되므로
-- auth.users를 먼저 삭제해야 함
DELETE FROM auth.users;
-- 위 DELETE로 profiles도 CASCADE 삭제됨

-- =====================================================
-- 9. 언어팩 관련 (필요시 주석 해제)
-- 기본 번역을 유지하려면 주석 처리 상태로 둡니다
-- =====================================================
-- TRUNCATE TABLE public.translations CASCADE;
-- TRUNCATE TABLE public.language_keys CASCADE;
-- TRUNCATE TABLE public.language_categories CASCADE;
-- TRUNCATE TABLE public.languages CASCADE;

-- =====================================================
-- 10. 시스템 설정 (필요시 주석 해제)
-- =====================================================
TRUNCATE TABLE public.app_config CASCADE;

-- 트랜잭션 커밋
COMMIT;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Data reset completed successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Cleared tables:';
  RAISE NOTICE '  - inquiries, inquiry_replies, faqs';
  RAISE NOTICE '  - polls, poll_options, poll_responses';
  RAISE NOTICE '  - questions, question_likes';
  RAISE NOTICE '  - sessions, session_*';
  RAISE NOTICE '  - partners, partner_*';
  RAISE NOTICE '  - login_logs, active_sessions, login_attempts';
  RAISE NOTICE '  - auth.users, profiles';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Preserved tables:';
  RAISE NOTICE '  - session_templates, session_template_fields';
  RAISE NOTICE '  - languages, language_*, translations';
  RAISE NOTICE '  - app_config';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Run seed-users.js to create test users!';
  RAISE NOTICE '===========================================';
END $$;

