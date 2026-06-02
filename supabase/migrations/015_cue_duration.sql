-- =====================================================
-- LivePulse 큐시트 — 큐별 예상 소요시간(duration)
-- 각 큐는 절대 시작/종료 시각이 아니라 "소요시간(분)"만 저장한다.
-- 큐의 시작시각 = 세션 예정시작(sessions.start_at) + 앞선 큐들의 소요시간 합.
--   → 순서를 바꾸거나 길이를 바꿔도 시작/종료 시각이 자동으로 다시 계산됨(파생값).
--   → 절대시각을 저장하지 않으므로 reorder가 시간 정보를 깨지 않는다.
-- (Hard-start = 시계상 고정 시각 큐는 추후 필요 시 별도 컬럼으로 확장)
-- =====================================================

-- 1. duration_min 컬럼 (예상 소요시간, 분 단위. NULL/0 = 미설정)
ALTER TABLE public.session_cues
  ADD COLUMN IF NOT EXISTS duration_min INTEGER;

COMMENT ON COLUMN public.session_cues.duration_min IS '예상 소요시간(분). 시작시각은 세션 start_at + 앞 큐들의 duration_min 합으로 계산하는 파생값.';

-- =====================================================
-- 2. 큐 목록 조회에 duration_min 포함 (시그니처 동일 → REPLACE)
-- =====================================================
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
    'duration_min', c.duration_min,
    'display_order', c.display_order
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
GRANT EXECUTE ON FUNCTION public.sp_partner_cues_q(UUID) TO authenticated;

-- =====================================================
-- 3. 큐 생성/수정에 p_duration_min 추가
--    (파라미터 시그니처가 바뀌므로 기존 함수 DROP 후 재생성)
-- =====================================================
DROP FUNCTION IF EXISTS public.sp_partner_cue_s(TEXT, UUID, UUID, UUID, TEXT, TEXT, UUID, INTEGER, UUID, UUID, TEXT, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION public.sp_partner_cue_s(
  p_action          TEXT,
  p_session_id      UUID,
  p_cue_id          UUID DEFAULT NULL,
  p_presenter_id    UUID DEFAULT NULL,
  p_cue_type        TEXT DEFAULT NULL,
  p_title           TEXT DEFAULT NULL,
  p_lecture_file_id UUID DEFAULT NULL,
  p_start_page      INTEGER DEFAULT NULL,
  p_poll_id         UUID DEFAULT NULL,
  p_qna_category_id UUID DEFAULT NULL,
  p_notice_text     TEXT DEFAULT NULL,
  p_duration_min    INTEGER DEFAULT NULL,
  p_display_order   INTEGER DEFAULT NULL,
  p_orders          JSONB DEFAULT NULL
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
      poll_id, qna_category_id, notice_text, duration_min, display_order
    ) VALUES (
      p_session_id, p_presenter_id, p_cue_type, p_title, p_lecture_file_id, COALESCE(p_start_page, 1),
      p_poll_id, p_qna_category_id, p_notice_text, p_duration_min, COALESCE(p_display_order, v_next)
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
      duration_min    = p_duration_min,
      display_order   = COALESCE(p_display_order, display_order)
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
GRANT EXECUTE ON FUNCTION public.sp_partner_cue_s(TEXT, UUID, UUID, UUID, TEXT, TEXT, UUID, INTEGER, UUID, UUID, TEXT, INTEGER, INTEGER, JSONB) TO authenticated;
