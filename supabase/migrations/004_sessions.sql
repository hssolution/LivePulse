-- =====================================================
-- LivePulse 세션 시스템
-- 세션, 템플릿, 에셋, 멤버 관리
-- =====================================================

-- =====================================================
-- 1. SESSION_TEMPLATES 테이블 (세션 템플릿)
-- =====================================================
CREATE TABLE public.session_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  description   TEXT,
  preview_image TEXT,
  screen_type   TEXT DEFAULT 'main',
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.session_templates IS '세션 템플릿 - 세션 화면의 레이아웃/디자인 정의';
COMMENT ON COLUMN public.session_templates.name IS '템플릿명 (예: 학술 심포지엄, 컨퍼런스)';
COMMENT ON COLUMN public.session_templates.code IS '템플릿 코드 - 고유 식별자 (예: symposium, conference)';
COMMENT ON COLUMN public.session_templates.description IS '템플릿 설명';
COMMENT ON COLUMN public.session_templates.preview_image IS '미리보기 이미지 URL';
COMMENT ON COLUMN public.session_templates.screen_type IS '화면 유형 - main: 메인화면, qna: 질문 송출, poll: 설문';
COMMENT ON COLUMN public.session_templates.is_active IS '활성 상태 - false면 선택 불가';
COMMENT ON COLUMN public.session_templates.sort_order IS '정렬 순서';

-- =====================================================
-- 2. SESSION_TEMPLATE_FIELDS 테이블 (템플릿 필드)
-- =====================================================
CREATE TABLE public.session_template_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.session_templates(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL,
  field_name  TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'image',
  is_required BOOLEAN DEFAULT false,
  max_width   INTEGER,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, field_key)
);

COMMENT ON TABLE public.session_template_fields IS '템플릿 필드 정의 - 템플릿에서 사용하는 이미지/텍스트 슬롯';
COMMENT ON COLUMN public.session_template_fields.template_id IS '소속 템플릿 ID';
COMMENT ON COLUMN public.session_template_fields.field_key IS '필드 키 (예: background_image, logo, title_banner)';
COMMENT ON COLUMN public.session_template_fields.field_name IS '필드 표시명 (예: 배경 이미지, 행사 로고)';
COMMENT ON COLUMN public.session_template_fields.field_type IS '필드 유형 - image: 이미지, text: 텍스트, url: URL, boolean: 토글';
COMMENT ON COLUMN public.session_template_fields.is_required IS '필수 여부';
COMMENT ON COLUMN public.session_template_fields.max_width IS '이미지 최대 너비 (px)';
COMMENT ON COLUMN public.session_template_fields.description IS '필드 설명 - 파트너에게 안내용';
COMMENT ON COLUMN public.session_template_fields.sort_order IS '표시 순서';

-- =====================================================
-- 3. SESSIONS 테이블 (세션)
-- =====================================================
CREATE TABLE public.sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES public.session_templates(id),
  qna_template_id   UUID REFERENCES public.session_templates(id),
  poll_template_id  UUID REFERENCES public.session_templates(id),
  title             TEXT NOT NULL,
  venue_name        TEXT NOT NULL,
  venue_address     TEXT,
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL,
  contact_phone     TEXT NOT NULL,
  contact_email     TEXT NOT NULL,
  max_participants  INTEGER NOT NULL DEFAULT 100,
  code              TEXT UNIQUE NOT NULL,
  description       TEXT,
  status            TEXT DEFAULT 'draft',
  participant_count INTEGER DEFAULT 0,
  published_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  broadcast_settings JSONB DEFAULT '{"width":0,"fontSize":150,"fontColor":"#c0392b","backgroundColor":"#ffffff","borderColor":"","innerBackgroundColor":"","textAlign":"center","verticalAlign":"center"}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.sessions IS '세션 - 파트너가 주최하는 행사/이벤트';
COMMENT ON COLUMN public.sessions.partner_id IS '주최 파트너 ID';
COMMENT ON COLUMN public.sessions.template_id IS '메인 화면 템플릿 ID';
COMMENT ON COLUMN public.sessions.qna_template_id IS 'Q&A 화면 템플릿 ID - null이면 메인 템플릿 사용';
COMMENT ON COLUMN public.sessions.poll_template_id IS '설문 화면 템플릿 ID - null이면 메인 템플릿 사용';
COMMENT ON COLUMN public.sessions.title IS '세션명';
COMMENT ON COLUMN public.sessions.venue_name IS '장소명';
COMMENT ON COLUMN public.sessions.venue_address IS '상세 주소';
COMMENT ON COLUMN public.sessions.start_at IS '예정 시작 일시';
COMMENT ON COLUMN public.sessions.end_at IS '예정 종료 일시';
COMMENT ON COLUMN public.sessions.contact_phone IS '대표 문의 전화';
COMMENT ON COLUMN public.sessions.contact_email IS '대표 문의 이메일';
COMMENT ON COLUMN public.sessions.max_participants IS '최대 참여자 수';
COMMENT ON COLUMN public.sessions.code IS '참여 코드 - 6자리 영숫자, 청중 입장 시 사용';
COMMENT ON COLUMN public.sessions.description IS '세션 설명';
COMMENT ON COLUMN public.sessions.status IS '상태 - draft: 초안, published: 공개, active: 진행중, ended: 종료, cancelled: 취소';
COMMENT ON COLUMN public.sessions.participant_count IS '현재 참여자 수';
COMMENT ON COLUMN public.sessions.published_at IS '공개 일시';
COMMENT ON COLUMN public.sessions.started_at IS '실제 시작 일시';
COMMENT ON COLUMN public.sessions.ended_at IS '실제 종료 일시';
COMMENT ON COLUMN public.sessions.broadcast_settings IS '송출 화면 설정 - width: 너비(0=자동), fontSize: 폰트크기, fontColor: 폰트색상, backgroundColor: 배경색상, borderColor: 테두리색상, innerBackgroundColor: 테두리안배경색상, textAlign: 정렬, verticalAlign: 세로정렬';

CREATE INDEX idx_sessions_partner_id ON public.sessions(partner_id);
CREATE INDEX idx_sessions_code ON public.sessions(code);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_start_at ON public.sessions(start_at);

-- =====================================================
-- 4. SESSION_ASSETS 테이블 (세션 에셋)
-- =====================================================
CREATE TABLE public.session_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  field_key    TEXT NOT NULL,
  value        TEXT,
  url          TEXT,
  open_new_tab BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, field_key)
);

COMMENT ON TABLE public.session_assets IS '세션 에셋 - 세션별 이미지/텍스트 값';
COMMENT ON COLUMN public.session_assets.session_id IS '세션 ID';
COMMENT ON COLUMN public.session_assets.field_key IS '필드 키 - template_fields.field_key와 매칭';
COMMENT ON COLUMN public.session_assets.value IS '값 - 이미지 URL 또는 텍스트';
COMMENT ON COLUMN public.session_assets.url IS '클릭 시 이동 URL (배너용)';
COMMENT ON COLUMN public.session_assets.open_new_tab IS '새 탭에서 열기 여부';

-- =====================================================
-- 5. SESSION_MEMBERS 테이블 (세션 멤버)
-- =====================================================
CREATE TABLE public.session_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'viewer',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

COMMENT ON TABLE public.session_members IS '세션 멤버 - 세션에 참여하는 사용자 역할 관리';
COMMENT ON COLUMN public.session_members.session_id IS '세션 ID';
COMMENT ON COLUMN public.session_members.user_id IS '사용자 ID';
COMMENT ON COLUMN public.session_members.role IS '역할 - owner: 소유자, admin: 관리자, moderator: 진행자, presenter: 발표자, viewer: 참관자';
COMMENT ON COLUMN public.session_members.assigned_by IS '역할 부여자 ID';
COMMENT ON COLUMN public.session_members.assigned_at IS '역할 부여 일시';

CREATE INDEX idx_session_members_session_id ON public.session_members(session_id);
CREATE INDEX idx_session_members_user_id ON public.session_members(user_id);

-- =====================================================
-- 6. 참여 코드 생성 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_session_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.sessions WHERE code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_session_code IS '6자리 고유 참여 코드 생성 (혼동 문자 제외)';

-- =====================================================
-- 7. 트리거
-- =====================================================

-- 세션 생성 시 코드 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_session_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_session_insert
  BEFORE INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_session();

-- 세션 생성 후 owner 자동 추가
CREATE OR REPLACE FUNCTION public.add_session_owner()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT profile_id INTO v_user_id FROM public.partners WHERE id = NEW.partner_id;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.session_members (session_id, user_id, role, assigned_by)
    VALUES (NEW.id, v_user_id, 'owner', v_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.add_session_owner IS '세션 생성 시 파트너 소유자를 세션 owner로 자동 추가';

CREATE TRIGGER after_session_insert
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_session_owner();

-- updated_at 트리거
CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_session_templates_updated_at
  BEFORE UPDATE ON public.session_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_session_assets_updated_at
  BEFORE UPDATE ON public.session_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 8. RLS 정책
-- =====================================================

-- session_templates RLS
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates" ON public.session_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON public.session_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- session_template_fields RLS
ALTER TABLE public.session_template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template fields" ON public.session_template_fields
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage template fields" ON public.session_template_fields
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- sessions RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "Partner owners can manage their sessions" ON public.sessions
  FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

CREATE POLICY "Published sessions are public" ON public.sessions
  FOR SELECT TO anon
  USING (status IN ('published', 'active'));

-- session_assets RLS
ALTER TABLE public.session_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owners can manage assets" ON public.session_assets
  FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())));

CREATE POLICY "Anyone can view assets of published sessions" ON public.session_assets
  FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active')));

-- session_members RLS
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owners can manage members" ON public.session_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s
    INNER JOIN partners p ON s.partner_id = p.id
    WHERE s.id = session_members.session_id AND p.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions s
    INNER JOIN partners p ON s.partner_id = p.id
    WHERE s.id = session_members.session_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "Members can view their own membership" ON public.session_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 9. Storage 버킷
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-assets', 'session-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책
DROP POLICY IF EXISTS "Authenticated users can upload session assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload session assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'session-assets');

DROP POLICY IF EXISTS "Anyone can view session assets" ON storage.objects;
CREATE POLICY "Anyone can view session assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'session-assets');

DROP POLICY IF EXISTS "Authenticated users can delete session assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete session assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'session-assets');

-- =====================================================
-- 10. 기본 템플릿 데이터
-- =====================================================

-- 메인 화면 템플릿
INSERT INTO public.session_templates (id, name, code, description, screen_type, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000001', '학술 심포지엄', 'symposium', '학술 행사, 심포지엄에 적합한 템플릿입니다. 배경 이미지, 로고, 타이틀 배너, 일정표 배너를 포함합니다.', 'main', 1),
  ('00000000-0000-0000-0002-000000000002', '컨퍼런스', 'conference', '대규모 컨퍼런스에 적합한 템플릿입니다.', 'main', 2),
  ('00000000-0000-0000-0002-000000000003', '워크숍/세미나', 'workshop', '소규모 워크숍, 세미나에 적합한 심플한 템플릿입니다.', 'main', 3);

-- 심포지엄 템플릿 필드
INSERT INTO public.session_template_fields (template_id, field_key, field_name, field_type, is_required, max_width, description, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000001', 'background_image', '배경 이미지', 'image', false, 1920, '전체 페이지 배경 이미지', 1),
  ('00000000-0000-0000-0002-000000000001', 'logo', '행사 로고', 'image', false, 300, '좌측 상단에 표시되는 로고', 2),
  ('00000000-0000-0000-0002-000000000001', 'title_banner', '타이틀 배너', 'image', true, 725, '상단 메인 배너 이미지', 3),
  ('00000000-0000-0000-0002-000000000001', 'schedule_banner', '일정표 배너', 'image', false, 725, '일정표 이미지', 4),
  ('00000000-0000-0000-0002-000000000001', 'schedule_banner_url', '일정표 배너 URL', 'url', false, NULL, '클릭 시 이동할 URL', 5),
  ('00000000-0000-0000-0002-000000000001', 'bottom_banner', '하단 배너', 'image', false, 725, '하단 추가 배너', 6),
  ('00000000-0000-0000-0002-000000000001', 'bottom_banner_url', '하단 배너 URL', 'url', false, NULL, '클릭 시 이동할 URL', 7);

-- 컨퍼런스 템플릿 필드
INSERT INTO public.session_template_fields (template_id, field_key, field_name, field_type, is_required, max_width, description, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000002', 'background_image', '배경 이미지', 'image', false, 1920, '전체 페이지 배경 이미지', 1),
  ('00000000-0000-0000-0002-000000000002', 'logo', '행사 로고', 'image', false, 300, '좌측 상단에 표시되는 로고', 2),
  ('00000000-0000-0000-0002-000000000002', 'hero_banner', '히어로 배너', 'image', true, 1200, '상단 대형 배너', 3),
  ('00000000-0000-0000-0002-000000000002', 'sponsor_banner', '스폰서 배너', 'image', false, 1200, '스폰서 로고 배너', 4);

-- 워크숍 템플릿 필드
INSERT INTO public.session_template_fields (template_id, field_key, field_name, field_type, is_required, max_width, description, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000003', 'logo', '행사 로고', 'image', false, 200, '상단에 표시되는 로고', 1),
  ('00000000-0000-0000-0002-000000000003', 'cover_image', '커버 이미지', 'image', false, 600, '메인 이미지', 2);

-- Q&A 송출 템플릿
INSERT INTO public.session_templates (id, name, code, description, screen_type, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000010', '기본 질문 송출', 'qna_default', '기본적인 질문 송출 화면입니다.', 'qna', 1),
  ('00000000-0000-0000-0002-000000000011', '미니멀 질문 송출', 'qna_minimal', '심플한 질문 송출 화면입니다.', 'qna', 2);

-- Q&A 템플릿 필드 (스타일 설정)
INSERT INTO public.session_template_fields (template_id, field_key, field_name, field_type, is_required, description, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000010', 'font_size', '폰트 크기', 'text', false, '질문 텍스트 크기 (px)', 1),
  ('00000000-0000-0000-0002-000000000010', 'font_color', '폰트 색상', 'text', false, '질문 텍스트 색상 (HEX)', 2),
  ('00000000-0000-0000-0002-000000000010', 'bg_color', '배경 색상', 'text', false, '배경 색상 (HEX)', 3),
  ('00000000-0000-0000-0002-000000000010', 'border_color', '테두리 색상', 'text', false, '테두리 색상 (HEX)', 4);

-- 설문 템플릿
INSERT INTO public.session_templates (id, name, code, description, screen_type, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000020', '기본 설문', 'poll_default', '기본적인 설문 화면입니다.', 'poll', 1),
  ('00000000-0000-0000-0002-000000000021', '결과 차트 강조', 'poll_chart', '결과 차트가 강조되는 설문 화면입니다.', 'poll', 2);

-- =====================================================
-- Realtime 설정
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

