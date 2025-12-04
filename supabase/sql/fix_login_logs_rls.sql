-- 파트너가 자신의 팀원 로그인 로그를 조회할 수 있도록 정책 추가
-- 기존 정책을 수정하거나 새 정책 추가

-- 기존 정책 삭제
DROP POLICY IF EXISTS "login_logs_admin_select" ON public.login_logs;

-- 새 정책: 관리자 또는 파트너 소유자/관리자가 팀원 로그 조회 가능
CREATE POLICY "login_logs_select" ON public.login_logs
  FOR SELECT TO authenticated
  USING (
    -- 관리자는 모든 로그 조회 가능
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
    OR
    -- 파트너 소유자/관리자는 자신 팀원의 로그 조회 가능
    EXISTS (
      SELECT 1 FROM public.partner_members pm1
      JOIN public.partner_members pm2 ON pm1.partner_id = pm2.partner_id
      WHERE pm1.user_id = auth.uid()
        AND pm1.role IN ('owner', 'admin')
        AND pm1.status = 'accepted'
        AND pm2.user_id = login_logs.user_id
    )
    OR
    -- 본인 로그는 조회 가능
    user_id = auth.uid()
  );

COMMENT ON POLICY "login_logs_select" ON public.login_logs IS '로그인 로그 조회 - 관리자, 파트너 관리자(팀원), 본인';

