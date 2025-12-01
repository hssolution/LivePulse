-- =====================================================
-- 초대 링크 RLS 수정
-- SECURITY DEFINER 함수로 안전하게 초대 정보 조회
-- =====================================================

-- 초대 토큰으로 초대 정보 조회하는 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', pm.id,
    'partner_id', pm.partner_id,
    'email', pm.email,
    'role', pm.role,
    'status', pm.status,
    'invited_at', pm.invited_at,
    'partner_type', p.partner_type,
    'representative_name', p.representative_name,
    'company_name', COALESCE(
      po.company_name,
      pa.company_name,
      pi.display_name,
      p.representative_name
    )
  )
  INTO v_result
  FROM public.partner_members pm
  JOIN public.partners p ON pm.partner_id = p.id
  LEFT JOIN public.partner_organizers po ON p.id = po.partner_id
  LEFT JOIN public.partner_agencies pa ON p.id = pa.partner_id
  LEFT JOIN public.partner_instructors pi ON p.id = pi.partner_id
  WHERE pm.invite_token = p_token
    AND pm.status = 'pending';
  
  IF v_result IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  
  RETURN v_result;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.get_invite_by_token IS '초대 토큰으로 초대 정보 조회 (RLS 우회)';
