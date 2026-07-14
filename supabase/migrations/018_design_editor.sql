-- ============================================================
-- 018: 디자인 에디터 — 섹션 기반 디자인 JSONB (draft/published 2벌)
-- 디자인 에디터 PRD v1.0 §7. design_published가 없으면 청중 화면은
-- 기존 하드코딩 템플릿 렌더 유지 (기존 세션 시각 불변).
-- (원격 적용 완료 — MCP apply_migration, 2026-07-12)
-- ============================================================

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS design_draft JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS design_published JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS design_published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sessions.design_draft IS '디자인 에디터 초안 {version, tokens, scenes:{enter:{sections:[...]}}} — 청중에게 절대 미노출';
COMMENT ON COLUMN public.sessions.design_published IS '게시된 디자인 — 있으면 청중 참가 페이지가 섹션 렌더, 없으면 기존 템플릿 렌더';

CREATE OR REPLACE FUNCTION public.sp_partner_design_s(
  p_session_id UUID,
  p_action     TEXT,              -- 'save_draft' | 'publish' | 'unpublish'
  p_design     JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_action = 'save_draft' THEN
    IF p_design IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'design_required');
    END IF;
    IF NOT (p_design ? 'scenes') THEN
      RETURN json_build_object('success', false, 'error', 'invalid_design');
    END IF;
    UPDATE sessions SET design_draft = p_design WHERE id = p_session_id;
    RETURN json_build_object('success', true);

  ELSIF p_action = 'publish' THEN
    UPDATE sessions SET
      design_published = COALESCE(p_design, design_draft),
      design_draft = COALESCE(p_design, design_draft),
      design_published_at = now()
    WHERE id = p_session_id AND COALESCE(p_design, design_draft) IS NOT NULL;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'nothing_to_publish');
    END IF;
    RETURN json_build_object('success', true, 'published_at', now());

  ELSIF p_action = 'unpublish' THEN
    UPDATE sessions SET design_published = NULL WHERE id = p_session_id;
    RETURN json_build_object('success', true);
  END IF;

  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_design_s(UUID, TEXT, JSONB) TO authenticated;
