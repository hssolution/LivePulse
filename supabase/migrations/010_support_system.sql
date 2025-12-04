-- =====================================================
-- 010: 문의/지원 시스템
-- FAQ, 1:1 문의, 답변 테이블
-- =====================================================

-- =====================================================
-- FAQ 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'common',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT faqs_category_check CHECK (category IN ('common', 'organizer', 'agency', 'instructor'))
);

COMMENT ON TABLE public.faqs IS 'FAQ - 자주 묻는 질문';
COMMENT ON COLUMN public.faqs.category IS '카테고리 - common: 공통, organizer: 행사자, agency: 대행사, instructor: 강연자';
COMMENT ON COLUMN public.faqs.question IS '질문';
COMMENT ON COLUMN public.faqs.answer IS '답변';
COMMENT ON COLUMN public.faqs.display_order IS '표시 순서';
COMMENT ON COLUMN public.faqs.is_active IS '활성화 여부';
COMMENT ON COLUMN public.faqs.created_by IS '작성자 ID';

-- =====================================================
-- 1:1 문의 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT inquiries_category_check CHECK (category IN ('general', 'technical', 'billing', 'etc')),
  CONSTRAINT inquiries_status_check CHECK (status IN ('pending', 'in_progress', 'resolved'))
);

COMMENT ON TABLE public.inquiries IS '1:1 문의';
COMMENT ON COLUMN public.inquiries.partner_id IS '문의한 파트너 ID';
COMMENT ON COLUMN public.inquiries.category IS '카테고리 - general: 일반, technical: 기술, billing: 결제, etc: 기타';
COMMENT ON COLUMN public.inquiries.title IS '제목';
COMMENT ON COLUMN public.inquiries.content IS '내용';
COMMENT ON COLUMN public.inquiries.status IS '상태 - pending: 대기, in_progress: 처리중, resolved: 완료';

-- =====================================================
-- 1:1 문의 답변/댓글 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inquiry_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.inquiry_replies IS '1:1 문의 답변/댓글';
COMMENT ON COLUMN public.inquiry_replies.inquiry_id IS '문의 ID';
COMMENT ON COLUMN public.inquiry_replies.user_id IS '작성자 ID';
COMMENT ON COLUMN public.inquiry_replies.content IS '내용';
COMMENT ON COLUMN public.inquiry_replies.is_admin IS '관리자 답변 여부';

-- =====================================================
-- 인덱스
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON public.faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON public.faqs(display_order);

CREATE INDEX IF NOT EXISTS idx_inquiries_partner_id ON public.inquiries(partner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry_id ON public.inquiry_replies(inquiry_id);

-- =====================================================
-- RLS 활성화
-- =====================================================
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_replies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FAQ RLS 정책
-- =====================================================
-- 모든 사용자가 활성화된 FAQ 조회 가능
CREATE POLICY "faqs_select_active" ON public.faqs
  FOR SELECT USING (is_active = true);

-- 관리자는 모든 FAQ 조회/수정/삭제 가능
CREATE POLICY "faqs_admin_all" ON public.faqs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- =====================================================
-- 1:1 문의 RLS 정책
-- =====================================================
-- 파트너는 자신의 문의만 조회/생성 가능
CREATE POLICY "inquiries_partner_select" ON public.inquiries
  FOR SELECT USING (
    partner_id IN (
      SELECT p.id FROM public.partners p
      JOIN public.partner_members pm ON pm.partner_id = p.id
      WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
    )
    OR partner_id IN (
      SELECT id FROM public.partners WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "inquiries_partner_insert" ON public.inquiries
  FOR INSERT WITH CHECK (
    partner_id IN (
      SELECT p.id FROM public.partners p
      JOIN public.partner_members pm ON pm.partner_id = p.id
      WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
    )
    OR partner_id IN (
      SELECT id FROM public.partners WHERE profile_id = auth.uid()
    )
  );

-- 관리자는 모든 문의 조회/수정 가능
CREATE POLICY "inquiries_admin_all" ON public.inquiries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- =====================================================
-- 1:1 문의 답변 RLS 정책
-- =====================================================
-- 문의 작성자와 관리자가 답변 조회 가능
CREATE POLICY "inquiry_replies_select" ON public.inquiry_replies
  FOR SELECT USING (
    inquiry_id IN (
      SELECT id FROM public.inquiries
      WHERE partner_id IN (
        SELECT p.id FROM public.partners p
        JOIN public.partner_members pm ON pm.partner_id = p.id
        WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
      )
      OR partner_id IN (
        SELECT id FROM public.partners WHERE profile_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- 문의 작성자와 관리자가 답변 작성 가능
CREATE POLICY "inquiry_replies_insert" ON public.inquiry_replies
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      inquiry_id IN (
        SELECT id FROM public.inquiries
        WHERE partner_id IN (
          SELECT p.id FROM public.partners p
          JOIN public.partner_members pm ON pm.partner_id = p.id
          WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
        )
        OR partner_id IN (
          SELECT id FROM public.partners WHERE profile_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_role = 'admin'
      )
    )
  );

-- 관리자는 모든 답변 관리 가능
CREATE POLICY "inquiry_replies_admin_all" ON public.inquiry_replies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- =====================================================
-- updated_at 트리거
-- =====================================================
CREATE TRIGGER handle_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

