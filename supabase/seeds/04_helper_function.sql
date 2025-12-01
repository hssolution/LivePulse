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

