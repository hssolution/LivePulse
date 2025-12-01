-- =====================================================
-- LivePulse 초기 스키마
-- 기본 테이블: profiles, app_config, partner_requests, partners, user_theme_settings
-- Auth Hook, RLS 정책 포함
-- =====================================================

-- =====================================================
-- 1. PROFILES 테이블 (사용자 프로필)
-- =====================================================
CREATE TABLE public.profiles (
  id                  UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  display_name        TEXT,
  user_role           TEXT NOT NULL DEFAULT 'user' CHECK (user_role IN ('user', 'admin')),
  user_type           TEXT NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'partner', 'admin')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  description         TEXT,
  preferred_language  TEXT DEFAULT NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '사용자 프로필 - 인증된 사용자의 추가 정보 관리';
COMMENT ON COLUMN public.profiles.id IS '사용자 ID - auth.users.id와 동일';
COMMENT ON COLUMN public.profiles.email IS '이메일 주소';
COMMENT ON COLUMN public.profiles.display_name IS '표시 이름 - 세션 및 협업 시 사용되는 이름';
COMMENT ON COLUMN public.profiles.user_role IS '역할 - user: 일반 사용자, admin: 관리자';
COMMENT ON COLUMN public.profiles.user_type IS '유형 - user: 일반, partner: 파트너, admin: 관리자';
COMMENT ON COLUMN public.profiles.status IS '상태 - active: 활성, suspended: 정지';
COMMENT ON COLUMN public.profiles.description IS '사용자 소개/설명';
COMMENT ON COLUMN public.profiles.preferred_language IS '선호 언어 코드 (null이면 브라우저 언어 사용)';

-- =====================================================
-- 2. APP_CONFIG 테이블 (시스템 설정)
-- =====================================================
CREATE TABLE public.app_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.app_config IS '시스템 설정 - 키-값 형태의 전역 설정 저장';
COMMENT ON COLUMN public.app_config.key IS '설정 키 (고유)';
COMMENT ON COLUMN public.app_config.value IS '설정 값';

-- =====================================================
-- 3. PARTNER_REQUESTS 테이블 (파트너 신청)
-- =====================================================
CREATE TABLE public.partner_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_type        TEXT NOT NULL DEFAULT 'organizer' CHECK (partner_type IN ('organizer', 'agency', 'instructor')),
  representative_name TEXT NOT NULL,
  phone               TEXT NOT NULL,
  purpose             TEXT NOT NULL,
  company_name        TEXT,
  business_number     TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by         UUID REFERENCES auth.users(id),
  reviewed_at         TIMESTAMPTZ,
  reject_reason       TEXT,
  -- 행사자/대행업체용
  industry            TEXT,
  expected_scale      TEXT,
  client_type         TEXT,
  -- 강사용
  display_name        TEXT,
  specialty           TEXT,
  bio                 TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.partner_requests IS '파트너 신청 - 사용자의 파트너 등록 요청 관리';
COMMENT ON COLUMN public.partner_requests.user_id IS '신청자 사용자 ID';
COMMENT ON COLUMN public.partner_requests.partner_type IS '파트너 유형 - organizer: 행사자, agency: 대행업체, instructor: 강사';
COMMENT ON COLUMN public.partner_requests.representative_name IS '대표자명 (필수)';
COMMENT ON COLUMN public.partner_requests.phone IS '연락처 (필수)';
COMMENT ON COLUMN public.partner_requests.purpose IS '신청 목적 (필수)';
COMMENT ON COLUMN public.partner_requests.company_name IS '회사/단체명';
COMMENT ON COLUMN public.partner_requests.business_number IS '사업자번호';
COMMENT ON COLUMN public.partner_requests.status IS '상태 - pending: 대기, approved: 승인, rejected: 거부';
COMMENT ON COLUMN public.partner_requests.reviewed_by IS '검토자 관리자 ID';
COMMENT ON COLUMN public.partner_requests.reviewed_at IS '검토 일시';
COMMENT ON COLUMN public.partner_requests.reject_reason IS '거부 사유';
COMMENT ON COLUMN public.partner_requests.industry IS '업종/분야 (행사자/대행업체용)';
COMMENT ON COLUMN public.partner_requests.expected_scale IS '예상 규모 (행사자/대행업체용)';
COMMENT ON COLUMN public.partner_requests.client_type IS '주요 클라이언트 유형 (대행업체용)';
COMMENT ON COLUMN public.partner_requests.display_name IS '활동명/닉네임 (강사용)';
COMMENT ON COLUMN public.partner_requests.specialty IS '전문 분야 (강사용)';
COMMENT ON COLUMN public.partner_requests.bio IS '소개 (강사용)';

-- 인덱스
CREATE INDEX idx_partner_requests_user_id ON public.partner_requests(user_id);
CREATE INDEX idx_partner_requests_status ON public.partner_requests(status);
CREATE INDEX idx_partner_requests_partner_type ON public.partner_requests(partner_type);

-- =====================================================
-- 4. PARTNERS 테이블 (승인된 파트너)
-- =====================================================
CREATE TABLE public.partners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_type        TEXT NOT NULL DEFAULT 'organizer' CHECK (partner_type IN ('organizer', 'agency', 'instructor')),
  representative_name TEXT NOT NULL,
  phone               TEXT NOT NULL,
  purpose             TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.partners IS '파트너 - 승인된 파트너 기본 정보';
COMMENT ON COLUMN public.partners.profile_id IS '연결된 사용자 프로필 ID (1:1)';
COMMENT ON COLUMN public.partners.partner_type IS '파트너 유형 - organizer: 행사자, agency: 대행업체, instructor: 강사';
COMMENT ON COLUMN public.partners.representative_name IS '대표자명';
COMMENT ON COLUMN public.partners.phone IS '연락처';
COMMENT ON COLUMN public.partners.purpose IS '활동 목적';
COMMENT ON COLUMN public.partners.is_active IS '활성 상태 - false시 비활성화 (데이터 유지)';

-- 인덱스
CREATE INDEX idx_partners_profile_id ON public.partners(profile_id);
CREATE INDEX idx_partners_partner_type ON public.partners(partner_type);
CREATE INDEX idx_partners_is_active ON public.partners(is_active);

-- =====================================================
-- 5. PARTNER_ORGANIZERS 테이블 (행사자 추가 정보)
-- =====================================================
CREATE TABLE public.partner_organizers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  business_number TEXT,
  industry        TEXT,
  expected_scale  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.partner_organizers IS '행사자 추가 정보 - partner_type이 organizer인 파트너의 상세 정보';
COMMENT ON COLUMN public.partner_organizers.partner_id IS '파트너 ID (FK)';
COMMENT ON COLUMN public.partner_organizers.company_name IS '회사/단체명 (필수)';
COMMENT ON COLUMN public.partner_organizers.business_number IS '사업자번호 (선택)';
COMMENT ON COLUMN public.partner_organizers.industry IS '업종/분야';
COMMENT ON COLUMN public.partner_organizers.expected_scale IS '예상 행사 규모';

CREATE INDEX idx_partner_organizers_partner_id ON public.partner_organizers(partner_id);

-- =====================================================
-- 6. PARTNER_AGENCIES 테이블 (대행업체 추가 정보)
-- =====================================================
CREATE TABLE public.partner_agencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  business_number TEXT NOT NULL,
  industry        TEXT,
  client_type     TEXT,
  expected_scale  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.partner_agencies IS '대행업체 추가 정보 - partner_type이 agency인 파트너의 상세 정보';
COMMENT ON COLUMN public.partner_agencies.partner_id IS '파트너 ID (FK)';
COMMENT ON COLUMN public.partner_agencies.company_name IS '회사명 (필수)';
COMMENT ON COLUMN public.partner_agencies.business_number IS '사업자번호 (필수)';
COMMENT ON COLUMN public.partner_agencies.industry IS '업종/분야';
COMMENT ON COLUMN public.partner_agencies.client_type IS '주요 클라이언트 유형';
COMMENT ON COLUMN public.partner_agencies.expected_scale IS '예상 대행 규모';

CREATE INDEX idx_partner_agencies_partner_id ON public.partner_agencies(partner_id);

-- =====================================================
-- 7. PARTNER_INSTRUCTORS 테이블 (강사 추가 정보)
-- =====================================================
CREATE TABLE public.partner_instructors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  display_name      TEXT,
  specialty         TEXT,
  bio               TEXT,
  profile_image_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.partner_instructors IS '강사 추가 정보 - partner_type이 instructor인 파트너의 상세 정보';
COMMENT ON COLUMN public.partner_instructors.partner_id IS '파트너 ID (FK)';
COMMENT ON COLUMN public.partner_instructors.display_name IS '활동명/닉네임';
COMMENT ON COLUMN public.partner_instructors.specialty IS '전문 분야';
COMMENT ON COLUMN public.partner_instructors.bio IS '소개';
COMMENT ON COLUMN public.partner_instructors.profile_image_url IS '프로필 이미지 URL';

CREATE INDEX idx_partner_instructors_partner_id ON public.partner_instructors(partner_id);

-- =====================================================
-- 8. USER_THEME_SETTINGS 테이블 (테마 설정)
-- =====================================================
CREATE TABLE public.user_theme_settings (
  user_id       UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL DEFAULT 'light' CHECK (mode IN ('light', 'dark')),
  preset        TEXT NOT NULL DEFAULT 'theme-d' CHECK (preset IN ('theme-a', 'theme-b', 'theme-c', 'theme-d')),
  custom_colors JSONB,
  font_size     TEXT NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.user_theme_settings IS '사용자 테마 설정 - 개인별 UI 테마 저장';
COMMENT ON COLUMN public.user_theme_settings.user_id IS '사용자 ID';
COMMENT ON COLUMN public.user_theme_settings.mode IS '테마 모드 - light: 밝은 테마, dark: 어두운 테마';
COMMENT ON COLUMN public.user_theme_settings.preset IS '테마 프리셋 - theme-a ~ theme-d 중 선택';
COMMENT ON COLUMN public.user_theme_settings.custom_colors IS '커스텀 색상 설정 (JSON)';
COMMENT ON COLUMN public.user_theme_settings.font_size IS '폰트 크기 - small: 작게, medium: 보통, large: 크게';

-- =====================================================
-- 9. 공통 함수
-- =====================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at() IS 'updated_at 컬럼 자동 갱신 트리거 함수';

-- set_updated_at (별칭, 레거시 호환)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 10. 신규 사용자 생성 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- 첫 번째 사용자인지 확인
  SELECT count(*) = 0 INTO is_first_user FROM public.profiles;

  -- 프로필 생성
  INSERT INTO public.profiles (id, email, user_role, user_type, status)
  VALUES (
    NEW.id, 
    NEW.email,
    CASE WHEN is_first_user THEN 'admin' ELSE 'user' END,
    CASE WHEN is_first_user THEN 'admin' ELSE 'user' END,
    'active'
  );

  -- 첫 번째 사용자(관리자)인 경우 app_config에 기록
  IF is_first_user THEN
    INSERT INTO public.app_config (key, value)
    VALUES ('admin_initialized', 'true')
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS '신규 사용자 가입 시 프로필 자동 생성 (첫 사용자는 관리자)';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- 11. Auth Hook: JWT 커스텀 클레임
-- =====================================================

-- supabase_auth_admin 역할에 권한 부여
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;

-- 기본 역할에도 권한 부여
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Custom Access Token Hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  profile_record RECORD;
BEGIN
  claims := event->'claims';
  
  -- 프로필 정보 조회
  SELECT 
    email,
    display_name,
    user_role,
    user_type,
    status,
    description
  INTO profile_record
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- 프로필 정보가 있으면 클레임에 추가
  IF profile_record.user_type IS NOT NULL THEN
    IF profile_record.email IS NOT NULL THEN
      claims := jsonb_set(claims, '{email}', to_jsonb(profile_record.email));
    END IF;
    
    IF profile_record.display_name IS NOT NULL THEN
      claims := jsonb_set(claims, '{display_name}', to_jsonb(profile_record.display_name));
    END IF;
    
    IF profile_record.user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_role}', to_jsonb(profile_record.user_role));
    END IF;
    
    IF profile_record.user_type IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_type}', to_jsonb(profile_record.user_type));
    END IF;
    
    IF profile_record.status IS NOT NULL THEN
      claims := jsonb_set(claims, '{status}', to_jsonb(profile_record.status));
    END IF;
    
    IF profile_record.description IS NOT NULL THEN
      claims := jsonb_set(claims, '{description}', to_jsonb(profile_record.description));
    END IF;
  END IF;

  -- 업데이트된 클레임 반환
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

COMMENT ON FUNCTION public.custom_access_token_hook IS 'JWT 토큰에 사용자 프로필 정보(user_role, user_type, status 등)를 추가하는 Auth Hook';

-- =====================================================
-- 12. 사용자 언어 설정 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_user_language(lang_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET preferred_language = lang_code
  WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.update_user_language IS '사용자 언어 설정 업데이트';

CREATE OR REPLACE FUNCTION public.get_user_language()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_lang TEXT;
BEGIN
  SELECT preferred_language INTO user_lang
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_lang;
END;
$$;

COMMENT ON FUNCTION public.get_user_language IS '사용자 언어 설정 조회';

-- =====================================================
-- 13. RLS 정책
-- =====================================================

-- profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- app_config RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App config is viewable by everyone"
  ON public.app_config FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify app config"
  ON public.app_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

-- partner_requests RLS
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own partner requests"
  ON public.partner_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all partner requests"
  ON public.partner_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

CREATE POLICY "Users can insert partner requests"
  ON public.partner_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update partner requests"
  ON public.partner_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

-- partners RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own partner info"
  ON public.partners FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all partners"
  ON public.partners FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

CREATE POLICY "Admins can insert partners"
  ON public.partners FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

CREATE POLICY "Admins can update partners"
  ON public.partners FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.user_role = 'admin'));

CREATE POLICY "Active partners are viewable by partners"
  ON public.partners FOR SELECT
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'partner'));

-- partner_organizers RLS
ALTER TABLE public.partner_organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_organizers_select_own" ON public.partner_organizers
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.profile_id = auth.uid()));

CREATE POLICY "partner_organizers_select_admin" ON public.partner_organizers
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "partner_organizers_insert_admin" ON public.partner_organizers
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "partner_organizers_update" ON public.partner_organizers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

-- partner_agencies RLS
ALTER TABLE public.partner_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_agencies_select_own" ON public.partner_agencies
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.profile_id = auth.uid()));

CREATE POLICY "partner_agencies_select_admin" ON public.partner_agencies
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "partner_agencies_insert_admin" ON public.partner_agencies
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "partner_agencies_update" ON public.partner_agencies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

-- partner_instructors RLS
ALTER TABLE public.partner_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_instructors_select_own" ON public.partner_instructors
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.profile_id = auth.uid()));

CREATE POLICY "partner_instructors_select_admin" ON public.partner_instructors
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "partner_instructors_insert_admin" ON public.partner_instructors
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "partner_instructors_update" ON public.partner_instructors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

-- user_theme_settings RLS
ALTER TABLE public.user_theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own theme settings"
  ON public.user_theme_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own theme settings"
  ON public.user_theme_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own theme settings"
  ON public.user_theme_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own theme settings"
  ON public.user_theme_settings FOR delete
  USING (auth.uid() = user_id);

-- =====================================================
-- 14. 트리거 설정
-- =====================================================
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER on_partner_requests_updated
  BEFORE UPDATE ON public.partner_requests
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER on_partners_updated
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER on_partner_organizers_updated
  BEFORE UPDATE ON public.partner_organizers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_partner_agencies_updated
  BEFORE UPDATE ON public.partner_agencies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_partner_instructors_updated
  BEFORE UPDATE ON public.partner_instructors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_user_theme_settings_updated
  BEFORE UPDATE ON public.user_theme_settings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

