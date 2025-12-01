-- =====================================================
-- 시스템 설정 (app_config)
-- =====================================================
INSERT INTO public.app_config (key, value) VALUES
  ('admin_initialized', 'false'),
  ('site_name', 'LivePulse'),
  ('default_language', 'ko')
ON CONFLICT (key) DO NOTHING;

