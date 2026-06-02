-- =====================================================
-- 세션 상태 변경 권한 수정
-- 기존 sp_partner_session_status_s 는 호출자 본인(get_my_partner_id) 소유
-- 세션만 UPDATE 하도록 partner_id 로 스코프되어 있어,
--   - 관리자 "보기 모드"
--   - 협업 파트너
-- 에서 게시 취소 / 라이브 시작 / 종료가 SESSION_NOT_FOUND 로 실패했다.
--
-- 권한 헬퍼 sp_can_control_session(관리자/소유 파트너/협업/확정 강연자)을
-- 사용하도록 변경하고, 권한 확인 후 세션 id 기준으로 UPDATE 한다.
-- 허용 상태 목록은 기존과 동일하게 유지.
-- =====================================================

CREATE OR REPLACE FUNCTION public.sp_partner_session_status_s(p_session_id uuid, p_status text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- 송출/운영 제어 권한 확인 (관리자/소유/협업/강연자)
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- 상태 유효성 검사 (프론트엔드가 쓰는 'ended' 포함)
  IF p_status NOT IN ('draft', 'published', 'active', 'paused', 'completed', 'ended', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_STATUS');
  END IF;

  -- 세션 상태 업데이트 (권한은 위에서 확인했으므로 id 기준)
  UPDATE sessions
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;

  RETURN json_build_object('success', true, 'status', p_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.sp_partner_session_status_s(uuid, text) TO authenticated;
