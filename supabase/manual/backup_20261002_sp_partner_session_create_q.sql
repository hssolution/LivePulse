-- 운영 원래 정의 백업(2026-10-02, 025 적용 직전, TSK-1294). 없는 테이블 templates 를 읽어 42P01 로 실패하던 판.
CREATE OR REPLACE FUNCTION public.sp_partner_session_create_q()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN json_build_object(
    'templates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', id,
          'name', name,
          'description', description
        )
      ), '[]'::json)
      FROM templates
      WHERE is_active = true
      ORDER BY display_order, name
    ),
    'qnaTemplates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', id,
          'name', name
        )
      ), '[]'::json)
      FROM templates
      WHERE is_active = true AND name LIKE '%Q&A%'
      ORDER BY name
    ),
    'pollTemplates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', id,
          'name', name
        )
      ), '[]'::json)
      FROM templates
      WHERE is_active = true AND name LIKE '%Poll%'
      ORDER BY name
    )
  );
END;
$function$
