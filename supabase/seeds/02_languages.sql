-- =====================================================
-- 언어 설정 (languages)
-- =====================================================
INSERT INTO public.languages (code, name, native_name, is_default, is_active, sort_order) VALUES
  ('ko', 'Korean', '한국어', true, true, 1),
  ('en', 'English', 'English', false, true, 2)
ON CONFLICT (code) DO NOTHING;

