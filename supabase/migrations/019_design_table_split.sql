-- ============================================================
-- 019: [보안 P0] 디자인 저장소 분리 — sessions 컬럼 → session_designs
-- 경쟁 설계 심판단 검증 발견: 청중 sessions.select('*') 경로로
-- 미게시 초안(design_draft)이 익명 청중에 노출되는 결함 수정.
-- + 낙관적 잠금(version) + 서버 최소 불변식 + 게시 히스토리(3개)
-- + 청중용 게시본 전용 RPC sp_live_design_q
-- (원격 적용 완료 — MCP apply_migration, 2026-07-12)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_designs (
  session_id  UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  draft       JSONB,
  published   JSONB,
  version     INTEGER NOT NULL DEFAULT 0,
  history     JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers manage designs" ON public.session_designs
  FOR ALL USING (public.sp_can_control_session(session_id))
  WITH CHECK (public.sp_can_control_session(session_id));

ALTER TABLE public.sessions DROP COLUMN IF EXISTS design_draft;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS design_published;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS design_published_at;

CREATE OR REPLACE FUNCTION public.sp_partner_design_s(
  p_session_id UUID,
  p_action     TEXT,              -- 'save_draft' | 'publish' | 'unpublish' | 'get'
  p_design     JSONB DEFAULT NULL,
  p_version    INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_row session_designs%ROWTYPE;
  v_sections JSONB;
  v_join_count INTEGER;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_row FROM session_designs WHERE session_id = p_session_id;

  IF p_action = 'save_draft' OR p_action = 'publish' THEN
    IF p_design IS NOT NULL THEN
      IF NOT (p_design ? 'scenes') THEN
        RETURN json_build_object('success', false, 'error', 'invalid_design');
      END IF;
      IF pg_column_size(p_design) > 262144 THEN
        RETURN json_build_object('success', false, 'error', 'design_too_large');
      END IF;
      v_sections := p_design -> 'scenes' -> 'enter' -> 'sections';
      IF v_sections IS NOT NULL THEN
        IF jsonb_array_length(v_sections) > 12 THEN
          RETURN json_build_object('success', false, 'error', 'too_many_sections');
        END IF;
        SELECT COUNT(*) INTO v_join_count FROM jsonb_array_elements(v_sections) e
          WHERE e->>'type' = 'joinCard' AND COALESCE((e->>'hidden')::boolean, false) = false;
        IF v_join_count <> 1 THEN
          RETURN json_build_object('success', false, 'error', 'join_card_required');
        END IF;
      END IF;
    END IF;
    IF p_version IS NOT NULL AND v_row.session_id IS NOT NULL AND v_row.version <> p_version THEN
      RETURN json_build_object('success', false, 'error', 'version_conflict', 'server_version', v_row.version);
    END IF;
  END IF;

  IF p_action = 'save_draft' THEN
    IF p_design IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'design_required');
    END IF;
    INSERT INTO session_designs (session_id, draft, version, updated_at)
    VALUES (p_session_id, p_design, 1, now())
    ON CONFLICT (session_id) DO UPDATE
      SET draft = EXCLUDED.draft, version = session_designs.version + 1, updated_at = now();
    RETURN json_build_object('success', true, 'version',
      (SELECT version FROM session_designs WHERE session_id = p_session_id));

  ELSIF p_action = 'publish' THEN
    IF COALESCE(p_design, v_row.draft) IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'nothing_to_publish');
    END IF;
    INSERT INTO session_designs (session_id, draft, published, version, published_at, history, updated_at)
    VALUES (p_session_id, COALESCE(p_design, v_row.draft), COALESCE(p_design, v_row.draft), 1, now(), '[]'::jsonb, now())
    ON CONFLICT (session_id) DO UPDATE SET
      history = CASE WHEN session_designs.published IS NOT NULL
        THEN (jsonb_build_array(jsonb_build_object('at', session_designs.published_at, 'design', session_designs.published))
              || session_designs.history) #> '{}' ELSE session_designs.history END,
      published = COALESCE(EXCLUDED.draft, session_designs.draft),
      draft = COALESCE(EXCLUDED.draft, session_designs.draft),
      version = session_designs.version + 1,
      published_at = now(),
      updated_at = now();
    UPDATE session_designs SET history = (
      SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM (
        SELECT e FROM jsonb_array_elements(history) WITH ORDINALITY t(e, i) WHERE i <= 3
      ) s
    ) WHERE session_id = p_session_id;
    RETURN json_build_object('success', true, 'published_at', now(), 'version',
      (SELECT version FROM session_designs WHERE session_id = p_session_id));

  ELSIF p_action = 'unpublish' THEN
    UPDATE session_designs SET published = NULL, version = version + 1, updated_at = now()
      WHERE session_id = p_session_id;
    RETURN json_build_object('success', true);

  ELSIF p_action = 'get' THEN
    RETURN json_build_object('success', true,
      'draft', v_row.draft, 'published', v_row.published, 'version', COALESCE(v_row.version, 0));
  END IF;

  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_design_s(UUID, TEXT, JSONB, INTEGER) TO authenticated;
DROP FUNCTION IF EXISTS public.sp_partner_design_s(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.sp_live_design_q(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_design JSONB; v_version INTEGER;
BEGIN
  SELECT d.published, d.version INTO v_design, v_version
  FROM session_designs d JOIN sessions s ON s.id = d.session_id
  WHERE s.code = p_code AND s.status IN ('published', 'active');
  IF v_design IS NULL THEN
    RETURN json_build_object('success', true, 'design', NULL);
  END IF;
  RETURN json_build_object('success', true, 'design', v_design, 'version', v_version);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_live_design_q(TEXT) TO anon, authenticated;
