-- =====================================================
-- 시스템 설정 (app_config)
-- =====================================================
-- admin_initialized는 첫 번째 사용자 가입 시 자동 생성되므로 제외
INSERT INTO public.app_config (key, value) VALUES
  ('site_name', 'LivePulse'),
  ('default_language', 'ko')
ON CONFLICT (key) DO NOTHING;

