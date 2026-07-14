-- ============================================================
-- 017: P1 — 큐시트 시간·공개 필드 편집 지원 (PRD §5·§9 P1)
--
-- · sp_partner_cue_s: planned_start_at / duration_min / is_public /
--   public_title 파라미터 추가. p_set_schedule=true일 때만 반영하는
--   sentinel 방식 — 구 UI가 구 시그니처로 호출해도 스케줄 필드가
--   NULL로 덮이지 않는다 (하위호환 원칙).
-- · sp_partner_cues_q: 신규 필드 4종을 응답에 포함.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sp_partner_cue_s(
  p_action           TEXT,
  p_session_id       UUID,
  p_cue_id           UUID DEFAULT NULL,
  p_presenter_id     UUID DEFAULT NULL,
  p_cue_type         TEXT DEFAULT NULL,
  p_title            TEXT DEFAULT NULL,
  p_lecture_file_id  UUID DEFAULT NULL,
  p_start_page       INTEGER DEFAULT NULL,
  p_poll_id          UUID DEFAULT NULL,
  p_qna_category_id  UUID DEFAULT NULL,
  p_notice_text      TEXT DEFAULT NULL,
  p_display_order    INTEGER DEFAULT NULL,
  p_orders           JSONB DEFAULT NULL,
  -- [017] 스케줄·공개 필드 (p_set_schedule=true일 때만 반영)
  p_set_schedule     BOOLEAN DEFAULT false,
  p_planned_start_at TIMESTAMPTZ DEFAULT NULL,
  p_duration_min     INTEGER DEFAULT NULL,
  p_is_public        BOOLEAN DEFAULT NULL,
  p_public_title     TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_next INTEGER;
  v_item JSONB;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_action = 'create' THEN
    IF p_cue_type NOT IN ('pdf','survey','qna','notice') THEN
      RETURN json_build_object('success', false, 'error', 'invalid_cue_type');
    END IF;
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_next FROM session_cues WHERE session_id = p_session_id;
    INSERT INTO session_cues (
      session_id, presenter_id, cue_type, title, lecture_file_id, start_page,
      poll_id, qna_category_id, notice_text, display_order,
      planned_start_at, duration_min, is_public, public_title
    ) VALUES (
      p_session_id, p_presenter_id, p_cue_type, p_title, p_lecture_file_id, COALESCE(p_start_page, 1),
      p_poll_id, p_qna_category_id, p_notice_text, COALESCE(p_display_order, v_next),
      CASE WHEN p_set_schedule THEN p_planned_start_at ELSE NULL END,
      CASE WHEN p_set_schedule THEN p_duration_min ELSE NULL END,
      CASE WHEN p_set_schedule THEN COALESCE(p_is_public, true) ELSE true END,
      CASE WHEN p_set_schedule THEN p_public_title ELSE NULL END
    ) RETURNING id INTO v_id;
    RETURN json_build_object('success', true, 'id', v_id);

  ELSIF p_action = 'update' THEN
    UPDATE session_cues SET
      presenter_id    = p_presenter_id,
      title           = p_title,
      lecture_file_id = p_lecture_file_id,
      start_page      = COALESCE(p_start_page, start_page),
      poll_id         = p_poll_id,
      qna_category_id = p_qna_category_id,
      notice_text     = p_notice_text,
      display_order   = COALESCE(p_display_order, display_order),
      -- [017] sentinel: 신 UI만 스케줄 필드를 갱신 (구 UI 호출 시 기존 값 보존)
      planned_start_at = CASE WHEN p_set_schedule THEN p_planned_start_at ELSE planned_start_at END,
      duration_min     = CASE WHEN p_set_schedule THEN p_duration_min ELSE duration_min END,
      is_public        = CASE WHEN p_set_schedule THEN COALESCE(p_is_public, is_public) ELSE is_public END,
      public_title     = CASE WHEN p_set_schedule THEN p_public_title ELSE public_title END
    WHERE id = p_cue_id AND session_id = p_session_id;
    RETURN json_build_object('success', true, 'id', p_cue_id);

  ELSIF p_action = 'delete' THEN
    DELETE FROM session_cues WHERE id = p_cue_id AND session_id = p_session_id;
    UPDATE sessions SET current_cue_id = NULL WHERE id = p_session_id AND current_cue_id = p_cue_id;
    RETURN json_build_object('success', true);

  ELSIF p_action = 'reorder' THEN
    IF p_orders IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_orders) LOOP
        UPDATE session_cues
        SET display_order = (v_item->>'display_order')::INTEGER
        WHERE id = (v_item->>'id')::UUID AND session_id = p_session_id;
      END LOOP;
    END IF;
    RETURN json_build_object('success', true);
  END IF;

  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_cue_s(TEXT, UUID, UUID, UUID, TEXT, TEXT, UUID, INTEGER, UUID, UUID, TEXT, INTEGER, JSONB, BOOLEAN, TIMESTAMPTZ, INTEGER, BOOLEAN, TEXT) TO authenticated;

-- 구 시그니처 제거 (동명 함수 오버로드 충돌 방지 — PostgREST는 단일 시그니처 필요)
DROP FUNCTION IF EXISTS public.sp_partner_cue_s(TEXT, UUID, UUID, UUID, TEXT, TEXT, UUID, INTEGER, UUID, UUID, TEXT, INTEGER, JSONB);

-- ────────────────────────────────────────────────────────────
-- sp_partner_cues_q — 신규 필드 4종 추가 (기존 반환 계약 그대로:
-- 배열 직접 반환, 키 이름 013과 동일 — RunOfShowPanel 호환)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sp_partner_cues_q(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id', c.id,
    'presenter_id', c.presenter_id,
    'presenter_name', pr.display_name,
    'cue_type', c.cue_type,
    'title', c.title,
    'lecture_file_id', c.lecture_file_id,
    'lecture_title', lf.title,
    'lecture_page_count', lf.page_count,
    'start_page', c.start_page,
    'poll_id', c.poll_id,
    'poll_question', pl.question,
    'qna_category_id', c.qna_category_id,
    'qna_category_name', cat.name,
    'qna_category_color', cat.color,
    'notice_text', c.notice_text,
    'display_order', c.display_order,
    'planned_start_at', c.planned_start_at,
    'duration_min', c.duration_min,
    'is_public', c.is_public,
    'public_title', c.public_title
  ) ORDER BY c.display_order, c.created_at), '[]'::json)
  INTO v_result
  FROM session_cues c
  LEFT JOIN session_presenters pr ON c.presenter_id = pr.id
  LEFT JOIN lecture_files lf ON c.lecture_file_id = lf.id
  LEFT JOIN polls pl ON c.poll_id = pl.id
  LEFT JOIN qna_categories cat ON c.qna_category_id = cat.id
  WHERE c.session_id = p_session_id;
  RETURN v_result;
END;
$$;
