-- =====================================================
-- LivePulse 파트너 멤버 시스템
-- 팀원 초대, 역할 관리
-- =====================================================

-- =====================================================
-- 1. PARTNER_MEMBERS 테이블 (팀원 관리)
-- =====================================================
CREATE TABLE public.partner_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invite_token TEXT UNIQUE,
  invited_at   TIMESTAMPTZ DEFAULT now(),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_id, email)
);

COMMENT ON TABLE public.partner_members IS '파트너 팀원 - 파트너 조직의 멤버 및 초대 관리';
COMMENT ON COLUMN public.partner_members.partner_id IS '소속 파트너 ID';
COMMENT ON COLUMN public.partner_members.user_id IS '연결된 사용자 ID - 초대 수락 후 설정';
COMMENT ON COLUMN public.partner_members.email IS '멤버 이메일 (초대 시 사용)';
COMMENT ON COLUMN public.partner_members.role IS '역할 - owner: 소유자, admin: 관리자, member: 일반 멤버';
COMMENT ON COLUMN public.partner_members.status IS '상태 - pending: 초대 대기, accepted: 수락, rejected: 거절';
COMMENT ON COLUMN public.partner_members.invite_token IS '초대 토큰 - 이메일 링크로 수락 시 사용';
COMMENT ON COLUMN public.partner_members.invited_at IS '초대 일시';
COMMENT ON COLUMN public.partner_members.accepted_at IS '수락 일시';

-- 인덱스
CREATE INDEX idx_partner_members_partner_id ON public.partner_members(partner_id);
CREATE INDEX idx_partner_members_user_id ON public.partner_members(user_id);
CREATE INDEX idx_partner_members_email ON public.partner_members(email);
CREATE INDEX idx_partner_members_status ON public.partner_members(status);
CREATE INDEX idx_partner_members_invite_token ON public.partner_members(invite_token);

-- =====================================================
-- 2. 헬퍼 함수
-- =====================================================

-- 초대 토큰 생성 함수
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_invite_token IS '32자리 랜덤 초대 토큰 생성';

-- 파트너 owner 여부 확인 함수
CREATE OR REPLACE FUNCTION public.is_partner_owner(p_partner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_partner_owner IS '현재 사용자가 해당 파트너의 owner인지 확인';

-- 파트너 admin 이상 여부 확인 함수
CREATE OR REPLACE FUNCTION public.is_partner_admin_or_owner(p_partner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_partner_admin_or_owner IS '현재 사용자가 해당 파트너의 admin 이상인지 확인';

-- 파트너 멤버 여부 확인 함수
CREATE OR REPLACE FUNCTION public.is_partner_member(p_partner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_partner_member IS '현재 사용자가 해당 파트너의 멤버인지 확인';

-- 내 파트너 ID 조회 함수
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.partners
    WHERE profile_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_my_partner_id IS '현재 사용자가 소유한 파트너 ID 반환';

-- =====================================================
-- 3. RLS 정책
-- =====================================================
ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

-- 관리자는 모두 조회
CREATE POLICY "admin_select_partner_members" ON public.partner_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- 자신이 소유한 파트너의 멤버 목록
CREATE POLICY "partner_owner_select_members" ON public.partner_members
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

-- 자신의 초대 정보 (이메일로 확인)
CREATE POLICY "own_invite_select" ON public.partner_members
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- 자신이 수락한 멤버십 정보
CREATE POLICY "accepted_member_select" ON public.partner_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND status = 'accepted');

-- 관리자 또는 파트너 소유자만 추가
CREATE POLICY "partner_owner_insert_members" ON public.partner_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin')
    OR partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
  );

-- 관리자, 파트너 소유자, 또는 자신의 초대 응답
CREATE POLICY "partner_owner_update_members" ON public.partner_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin')
    OR partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- 관리자 또는 파트너 소유자만 삭제
CREATE POLICY "partner_owner_delete_members" ON public.partner_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin')
    OR partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
  );

-- 비로그인 사용자도 초대 토큰으로 조회 가능
CREATE POLICY "public_invite_select" ON public.partner_members
  FOR SELECT TO anon
  USING (invite_token IS NOT NULL AND status = 'pending');

-- =====================================================
-- 4. 트리거
-- =====================================================

-- updated_at 자동 갱신
CREATE TRIGGER set_partner_members_updated_at 
  BEFORE UPDATE ON public.partner_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 파트너 생성 시 owner 자동 추가
CREATE OR REPLACE FUNCTION public.add_partner_owner_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = NEW.profile_id;
  
  INSERT INTO public.partner_members (partner_id, user_id, email, role, status, accepted_at)
  VALUES (NEW.id, NEW.profile_id, v_email, 'owner', 'accepted', now())
  ON CONFLICT (partner_id, email) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.add_partner_owner_on_approval IS '파트너 생성 시 해당 사용자를 owner로 자동 추가';

CREATE TRIGGER add_owner_after_partner_created
  AFTER INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.add_partner_owner_on_approval();

-- =====================================================
-- 5. 초대 수락 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.accept_partner_invite(p_token TEXT)
RETURNS JSON AS $$
DECLARE
  v_member_id UUID;
  v_partner_id UUID;
  v_email TEXT;
  v_user_email TEXT;
BEGIN
  -- 현재 사용자 이메일 조회
  SELECT email INTO v_user_email FROM public.profiles WHERE id = auth.uid();
  
  -- 토큰으로 초대 조회
  SELECT id, partner_id, email INTO v_member_id, v_partner_id, v_email
  FROM public.partner_members
  WHERE invite_token = p_token AND status = 'pending';
  
  IF v_member_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite token');
  END IF;
  
  -- 이메일 일치 확인
  IF v_email != v_user_email THEN
    RETURN json_build_object('success', false, 'error', 'Email mismatch');
  END IF;
  
  -- 초대 수락 처리
  UPDATE public.partner_members
  SET user_id = auth.uid(),
      status = 'accepted',
      accepted_at = now(),
      invite_token = NULL
  WHERE id = v_member_id;
  
  -- 사용자 프로필 업데이트 (파트너로 변경)
  UPDATE public.profiles
  SET user_type = 'partner'
  WHERE id = auth.uid() AND user_type IN ('user', 'general');
  
  RETURN json_build_object('success', true, 'partner_id', v_partner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.accept_partner_invite IS '초대 토큰으로 파트너 초대 수락 처리';

