-- =====================================================
-- 025 (2026-10-02) 세션 만들기 화면의 템플릿 목록 조회 복구 (TSK-1294)
-- =====================================================
-- 증상(운영에서 재현, 2026-10-02): /partner/sessions/new 가 열릴 때
--   POST /rest/v1/rpc/sp_partner_session_create_q → 404
--   {"code":"42P01","message":"relation \"templates\" does not exist"}
--   → «불러오기에 실패했습니다» 알림이 뜨고 2단계에 «사용 가능한 템플릿이 없습니다»만 나온다.
--   세션 자체는 template_id 없이 만들어진다(생성은 막히지 않는다).
-- 원인: 운영의 sp_partner_session_create_q 가 없는 테이블 templates 를 읽는다. 실제 테이블은 session_templates.
--   신규 계정만이 아니라 모든 파트너에게 같은 오류가 난다(이 함수는 인자가 없고 계정과 무관하다).
--
-- 바꾸는 것: 함수 sp_partner_session_create_q() 의 본문만 바꾼다. 테이블·행·정책은 건드리지 않는다.
--   프런트(src/pages/partner/SessionCreate.jsx)가 쓰는 값은 main_templates[{id,name,code,description}] 뿐이다.
--   qna_templates·poll_templates 는 sp_partner_session_complete_q 와 같은 모양으로 함께 준다.
--
-- 적용 전 반드시(운영 정의를 읽을 권한이 없어 여기에 백업을 못 넣었다):
--   1) 원래 정의를 떠서 이 파일 아래 주석이나 supabase/manual 에 남긴다.
--        select pg_get_functiondef(p.oid) from pg_proc p
--         join pg_namespace n on n.oid = p.pronamespace
--        where n.nspname = 'public' and p.proname = 'sp_partner_session_create_q';
--   2) 원래 함수가 main_templates 말고 다른 키를 돌려주고 있었다면 아래 본문에 같은 키를 더한다.
--   3) 반환형이 JSON 이 아니면(JSONB 등) "cannot change return type" 로 실패하고 아무것도 바뀌지 않는다.
--      그때는 아래 RETURNS 와 json_* 함수를 그 형에 맞춰 바꿔서 다시 실행한다(함수를 DROP 하지 않는다).
-- =====================================================

CREATE OR REPLACE FUNCTION public.sp_partner_session_create_q()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'main_templates', COALESCE((
      SELECT json_agg(json_build_object(
               'id', t.id, 'name', t.name, 'code', t.code,
               'description', t.description, 'screen_type', t.screen_type
             ) ORDER BY t.sort_order, t.name)
        FROM public.session_templates t
       WHERE t.is_active = true AND COALESCE(t.screen_type, 'main') = 'main'
    ), '[]'::json),
    'qna_templates', COALESCE((
      SELECT json_agg(json_build_object(
               'id', t.id, 'name', t.name, 'code', t.code,
               'description', t.description, 'screen_type', t.screen_type
             ) ORDER BY t.sort_order, t.name)
        FROM public.session_templates t
       WHERE t.is_active = true AND t.screen_type = 'qna'
    ), '[]'::json),
    'poll_templates', COALESCE((
      SELECT json_agg(json_build_object(
               'id', t.id, 'name', t.name, 'code', t.code,
               'description', t.description, 'screen_type', t.screen_type
             ) ORDER BY t.sort_order, t.name)
        FROM public.session_templates t
       WHERE t.is_active = true AND t.screen_type = 'poll'
    ), '[]'::json)
  );
$$;

COMMENT ON FUNCTION public.sp_partner_session_create_q()
  IS '세션 만들기 화면 데이터 — 선택할 수 있는 화면 템플릿 목록(main/qna/poll)';
