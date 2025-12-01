-- =====================================================
-- LivePulse 세션 협업 시스템
-- 파트너 초대, 강사 관리
-- =====================================================

-- =====================================================
-- 1. SESSION_PARTNERS 테이블 (세션에 초대된 파트너)
-- =====================================================
CREATE TABLE public.session_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  partner_id    UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending',
  invited_by    UUID REFERENCES auth.users(id),
  invited_at    TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  reject_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);

COMMENT ON TABLE public.session_partners IS '세션 협업 파트너 - 세션에 초대된 대행업체/행사자 (1:1)';
COMMENT ON COLUMN public.session_partners.session_id IS '세션 ID';
COMMENT ON COLUMN public.session_partners.partner_id IS '초대된 파트너 ID';
COMMENT ON COLUMN public.session_partners.status IS '상태 - pending: 대기, accepted: 수락, rejected: 거절';
COMMENT ON COLUMN public.session_partners.invited_by IS '초대자 사용자 ID';
COMMENT ON COLUMN public.session_partners.invited_at IS '초대 일시';
COMMENT ON COLUMN public.session_partners.responded_at IS '응답 일시';
COMMENT ON COLUMN public.session_partners.reject_reason IS '거절 사유';

CREATE INDEX idx_session_partners_session_id ON public.session_partners(session_id);
CREATE INDEX idx_session_partners_partner_id ON public.session_partners(partner_id);
CREATE INDEX idx_session_partners_status ON public.session_partners(status);

-- =====================================================
-- 2. SESSION_PRESENTERS 테이블 (세션 강사)
-- =====================================================
CREATE TABLE public.session_presenters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  presenter_type TEXT NOT NULL,
  user_id        UUID REFERENCES auth.users(id),
  partner_id     UUID REFERENCES public.partners(id),
  manual_name    TEXT,
  manual_title   TEXT,
  manual_bio     TEXT,
  manual_image   TEXT,
  display_name   TEXT,
  display_title  TEXT,
  display_order  INTEGER DEFAULT 0,
  status         TEXT DEFAULT 'confirmed',
  invited_at     TIMESTAMPTZ DEFAULT now(),
  responded_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.session_presenters IS '세션 강사/발표자 - 세션에 등록된 발표자 목록';
COMMENT ON COLUMN public.session_presenters.session_id IS '세션 ID';
COMMENT ON COLUMN public.session_presenters.presenter_type IS '등록 유형 - member: 팀원 지정, partner: 강사 파트너 초대, manual: 직접 입력';
COMMENT ON COLUMN public.session_presenters.user_id IS '사용자 ID (member 타입)';
COMMENT ON COLUMN public.session_presenters.partner_id IS '파트너 ID (partner 타입)';
COMMENT ON COLUMN public.session_presenters.manual_name IS '직접 입력 이름 (manual 타입)';
COMMENT ON COLUMN public.session_presenters.manual_title IS '직접 입력 직책/소속 (manual 타입)';
COMMENT ON COLUMN public.session_presenters.manual_bio IS '직접 입력 소개 (manual 타입)';
COMMENT ON COLUMN public.session_presenters.manual_image IS '직접 입력 프로필 이미지 URL (manual 타입)';
COMMENT ON COLUMN public.session_presenters.display_name IS '표시 이름 (모든 타입에서 사용)';
COMMENT ON COLUMN public.session_presenters.display_title IS '표시 직책';
COMMENT ON COLUMN public.session_presenters.display_order IS '표시 순서';
COMMENT ON COLUMN public.session_presenters.status IS '상태 - pending: 초대 대기, confirmed: 확정, rejected: 거절';

CREATE INDEX idx_session_presenters_session_id ON public.session_presenters(session_id);
CREATE INDEX idx_session_presenters_user_id ON public.session_presenters(user_id);
CREATE INDEX idx_session_presenters_partner_id ON public.session_presenters(partner_id);
CREATE INDEX idx_session_presenters_status ON public.session_presenters(status);

-- =====================================================
-- 3. RLS 정책
-- =====================================================

-- session_partners RLS
ALTER TABLE public.session_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all session_partners" ON public.session_partners
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "Session owners can manage session_partners" ON public.session_partners
  FOR ALL TO authenticated
  USING (session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid()));

CREATE POLICY "Invited partners can view and respond" ON public.session_partners
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

CREATE POLICY "Invited partners can update status" ON public.session_partners
  FOR UPDATE TO authenticated
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

-- session_presenters RLS
ALTER TABLE public.session_presenters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all session_presenters" ON public.session_presenters
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "Session owners can manage session_presenters" ON public.session_presenters
  FOR ALL TO authenticated
  USING (session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid()));

CREATE POLICY "Invited partners can manage presenters" ON public.session_presenters
  FOR ALL TO authenticated
  USING (session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted'))
  WITH CHECK (session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted'));

CREATE POLICY "Presenter partners can view and respond" ON public.session_presenters
  FOR SELECT TO authenticated
  USING (presenter_type = 'partner' AND partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

CREATE POLICY "Presenter partners can update status" ON public.session_presenters
  FOR UPDATE TO authenticated
  USING (presenter_type = 'partner' AND partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  WITH CHECK (presenter_type = 'partner' AND partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

CREATE POLICY "Anyone can view presenters of public sessions" ON public.session_presenters
  FOR SELECT TO anon, authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active')));

-- =====================================================
-- 4. 트리거
-- =====================================================
CREATE TRIGGER set_session_partners_updated_at
  BEFORE UPDATE ON public.session_partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_session_presenters_updated_at
  BEFORE UPDATE ON public.session_presenters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. 헬퍼 함수
-- =====================================================

-- 파트너 협업 호환성 체크 함수
CREATE OR REPLACE FUNCTION public.check_partner_collaboration_compatibility(
  p_session_id UUID,
  p_target_partner_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_partner_type TEXT;
  v_target_partner_type TEXT;
BEGIN
  SELECT p.partner_type INTO v_session_partner_type
  FROM sessions s
  JOIN partners p ON s.partner_id = p.id
  WHERE s.id = p_session_id;
  
  SELECT partner_type INTO v_target_partner_type
  FROM partners
  WHERE id = p_target_partner_id;
  
  -- organizer는 agency만, agency는 organizer만 초대 가능
  IF v_session_partner_type = 'organizer' AND v_target_partner_type = 'agency' THEN
    RETURN TRUE;
  ELSIF v_session_partner_type = 'agency' AND v_target_partner_type = 'organizer' THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_partner_collaboration_compatibility IS '파트너 협업 호환성 체크 - organizer↔agency만 협업 가능';

-- 파트너 초대 함수
CREATE OR REPLACE FUNCTION public.invite_partner_to_session(
  p_session_id UUID,
  p_partner_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_existing UUID;
  v_compatible BOOLEAN;
  v_result UUID;
BEGIN
  SELECT id INTO v_existing
  FROM session_partners
  WHERE session_id = p_session_id;
  
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_has_partner');
  END IF;
  
  SELECT public.check_partner_collaboration_compatibility(p_session_id, p_partner_id)
  INTO v_compatible;
  
  IF NOT v_compatible THEN
    RETURN json_build_object('success', false, 'error', 'incompatible_partner_type');
  END IF;
  
  INSERT INTO session_partners (session_id, partner_id, invited_by, status)
  VALUES (p_session_id, p_partner_id, auth.uid(), 'pending')
  RETURNING id INTO v_result;
  
  RETURN json_build_object('success', true, 'id', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.invite_partner_to_session IS '세션에 협업 파트너 초대';

-- 초대 응답 함수
CREATE OR REPLACE FUNCTION public.respond_to_session_invite(
  p_invite_id UUID,
  p_accept BOOLEAN,
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_invite session_partners%ROWTYPE;
  v_my_partner_id UUID;
BEGIN
  SELECT id INTO v_my_partner_id
  FROM partners
  WHERE profile_id = auth.uid();
  
  SELECT * INTO v_invite
  FROM session_partners
  WHERE id = p_invite_id AND partner_id = v_my_partner_id;
  
  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invite_not_found');
  END IF;
  
  IF v_invite.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'already_responded');
  END IF;
  
  UPDATE session_partners
  SET 
    status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
    responded_at = now(),
    reject_reason = CASE WHEN NOT p_accept THEN p_reject_reason ELSE NULL END
  WHERE id = p_invite_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.respond_to_session_invite IS '세션 협업 초대 응답 (수락/거절)';

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.check_partner_collaboration_compatibility(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_partner_to_session(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_session_invite(UUID, BOOLEAN, TEXT) TO authenticated;

