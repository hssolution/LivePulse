-- =====================================================
-- LivePulse 언어팩 시스템
-- 다국어 지원을 위한 테이블 및 함수
-- =====================================================

-- =====================================================
-- 1. LANGUAGES 테이블 (지원 언어 목록)
-- =====================================================
CREATE TABLE public.languages (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  native_name TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.languages IS '지원 언어 목록 - 시스템에서 지원하는 언어 정의';
COMMENT ON COLUMN public.languages.code IS 'ISO 639-1 언어 코드 (예: ko, en, ja)';
COMMENT ON COLUMN public.languages.name IS '영문 언어명 (예: Korean, English, Japanese)';
COMMENT ON COLUMN public.languages.native_name IS '해당 언어로 표기한 이름 (예: 한국어, English, 日本語)';
COMMENT ON COLUMN public.languages.is_default IS '기본 언어 여부 - 하나만 true여야 함';
COMMENT ON COLUMN public.languages.is_active IS '활성 상태 - false면 선택 불가';
COMMENT ON COLUMN public.languages.sort_order IS '정렬 순서';

-- =====================================================
-- 2. LANGUAGE_CATEGORIES 테이블 (번역 키 카테고리)
-- =====================================================
CREATE TABLE public.language_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.language_categories IS '번역 키 카테고리 - 번역 키를 그룹화하여 관리';
COMMENT ON COLUMN public.language_categories.name IS '카테고리명 (예: common, auth, admin, partner)';
COMMENT ON COLUMN public.language_categories.description IS '카테고리 설명';
COMMENT ON COLUMN public.language_categories.sort_order IS '정렬 순서';

-- =====================================================
-- 3. LANGUAGE_KEYS 테이블 (번역 키)
-- =====================================================
CREATE TABLE public.language_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.language_categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.language_keys IS '번역 키 - 번역할 텍스트의 고유 식별자';
COMMENT ON COLUMN public.language_keys.key IS '점(.)으로 구분된 키 (예: common.save, auth.login)';
COMMENT ON COLUMN public.language_keys.category_id IS '소속 카테고리 ID';
COMMENT ON COLUMN public.language_keys.description IS '키 설명 - 관리자가 키의 용도 파악용';

CREATE INDEX idx_language_keys_category ON public.language_keys(category_id);

-- =====================================================
-- 4. TRANSLATIONS 테이블 (번역 값)
-- =====================================================
CREATE TABLE public.translations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID NOT NULL REFERENCES public.language_keys(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  value         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(key_id, language_code)
);

COMMENT ON TABLE public.translations IS '번역 값 - 각 키의 언어별 실제 번역 텍스트';
COMMENT ON COLUMN public.translations.key_id IS '번역 키 ID (FK)';
COMMENT ON COLUMN public.translations.language_code IS '언어 코드 (FK)';
COMMENT ON COLUMN public.translations.value IS '번역된 텍스트';

CREATE INDEX idx_translations_key ON public.translations(key_id);
CREATE INDEX idx_translations_lang ON public.translations(language_code);

-- =====================================================
-- 5. RLS 정책
-- =====================================================

-- languages RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Languages are viewable by everyone"
  ON public.languages FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify languages"
  ON public.languages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

-- language_categories RLS
ALTER TABLE public.language_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON public.language_categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify categories"
  ON public.language_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

-- language_keys RLS
ALTER TABLE public.language_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Language keys are viewable by everyone"
  ON public.language_keys FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify language keys"
  ON public.language_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

-- translations RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translations are viewable by everyone"
  ON public.translations FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify translations"
  ON public.translations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

-- =====================================================
-- 6. 트리거
-- =====================================================
CREATE TRIGGER on_languages_updated
  BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER on_language_categories_updated
  BEFORE UPDATE ON public.language_categories
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER on_language_keys_updated
  BEFORE UPDATE ON public.language_keys
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER on_translations_updated
  BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =====================================================
-- 7. 번역 조회 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_translations(lang_code TEXT DEFAULT 'ko')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(lk.key, t.value)
  INTO result
  FROM public.language_keys lk
  JOIN public.translations t ON t.key_id = lk.id
  WHERE t.language_code = lang_code;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_translations IS '특정 언어의 모든 번역을 JSON 객체로 반환 (키: 번역키, 값: 번역문)';

