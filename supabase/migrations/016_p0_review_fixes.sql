-- ============================================================
-- 016: P0 리뷰 수정 — 3렌즈 교차 검증(22건)에서 발견된 결함 패치
--
-- [S4] sp_live_state_q: categories를 qna 모드에서만 반환 → 비-qna 장면
--      동안 카테고리 지정 질문이 청중 Q&A 목록에서 전부 숨겨지는 회귀
-- [S3] sp_partner_poll_toggle_s: status='active' 게이트 → 라이브 시작 전
--      활성화한 설문이 라이브 후 영영 안 뜨는 회귀
-- [S3] sp_live_qna_q: liked_by_me가 device_id만 검사 → 로그인 청중 좋아요 유실
-- [S2] sp_partner_cue_broadcast_s: max_page 하향 재설정 (단조 증가 위반)
-- [S2] bump 트리거: search_path 미고정 + display_order 변경이 rev 증폭
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. [S4] sp_live_state_q — categories 상시 반환 (구 RPC와 동일 계약)
--    v_question(송출 중 질문)만 qna 모드 한정으로 유지
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sp_live_state_q(
  p_code     TEXT,
  p_cues_rev BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_session sessions%ROWTYPE;
  v_pdf JSON;
  v_question JSON;
  v_categories JSON;
  v_active_poll_id UUID;
  v_poll_results JSON;
  v_cues JSON;
BEGIN
  SELECT * INTO v_session FROM sessions
    WHERE code = p_code AND status IN ('published', 'active', 'ended');
  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;

  IF v_session.status = 'ended' THEN
    RETURN json_build_object('success', true, 'status', 'ended');
  END IF;

  IF v_session.broadcast_mode = 'pdf' AND v_session.broadcast_pdf_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id, 'title', title, 'file_url', file_url, 'page_count', page_count,
      'page', v_session.broadcast_pdf_page, 'max_page', v_session.max_page,
      'allow_download', allow_download, 'pages_path', pages_path
    ) INTO v_pdf FROM lecture_files WHERE id = v_session.broadcast_pdf_id;
  END IF;

  -- 송출 중 질문은 qna 장면에서만 의미 있음
  IF v_session.broadcast_mode = 'qna' THEN
    SELECT json_build_object(
      'id', q.id, 'content', q.content,
      'author_name', CASE WHEN q.is_anonymous THEN NULL ELSE q.author_name END,
      'is_anonymous', q.is_anonymous, 'likes_count', q.likes_count,
      'category_name', c.name, 'category_color', c.color
    ) INTO v_question
    FROM questions q LEFT JOIN qna_categories c ON q.category_id = c.id
    WHERE q.session_id = v_session.id AND q.is_broadcasting = true LIMIT 1;
  END IF;

  -- [016] 노출 카테고리는 모드와 무관하게 항상 반환 —
  -- Q&A 탭의 카테고리 노출 제어·필터 칩은 라이브 전 구간에서 동작해야 한다
  SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'color', color) ORDER BY display_order), '[]'::json)
  INTO v_categories
  FROM qna_categories WHERE session_id = v_session.id AND is_visible = true;

  SELECT id INTO v_active_poll_id FROM polls
    WHERE session_id = v_session.id AND status = 'active'
    ORDER BY started_at DESC NULLS LAST LIMIT 1;

  IF v_session.broadcast_mode = 'survey' AND v_active_poll_id IS NOT NULL THEN
    SELECT CASE WHEN p.show_results THEN json_build_object(
      'poll_id', p.id,
      'total', (SELECT COUNT(DISTINCT COALESCE(pr.user_id::text, pr.anonymous_id)) FROM poll_responses pr WHERE pr.poll_id = p.id),
      'counts', COALESCE((
        SELECT json_agg(json_build_object('option_id', po.id, 'count', (
          SELECT COUNT(*) FROM poll_responses pr2 WHERE pr2.option_id = po.id
        )) ORDER BY po.display_order)
        FROM poll_options po WHERE po.poll_id = p.id
      ), '[]'::json)
    ) ELSE NULL END
    INTO v_poll_results
    FROM polls p WHERE p.id = v_active_poll_id;
  END IF;

  IF p_cues_rev IS DISTINCT FROM v_session.cues_rev THEN
    SELECT COALESCE(json_agg(json_build_object(
      'id', sc.id,
      'title', COALESCE(sc.public_title, sc.title),
      'cue_type', sc.cue_type,
      'planned_start_at', sc.planned_start_at,
      'duration_min', sc.duration_min,
      'display_order', sc.display_order,
      'presenter_name', sp.display_name
    ) ORDER BY sc.display_order), '[]'::json)
    INTO v_cues
    FROM session_cues sc
    LEFT JOIN session_presenters sp ON sc.presenter_id = sp.id
    WHERE sc.session_id = v_session.id AND sc.is_public = true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', v_session.status,
    'broadcast_mode', COALESCE(v_session.broadcast_mode, 'idle'),
    'broadcast_notice', v_session.broadcast_notice,
    'current_cue_id', v_session.current_cue_id,
    'current_cue_fired_at', v_session.current_cue_fired_at,
    'pdf', v_pdf,
    'question', v_question,
    'categories', v_categories,
    'active_poll_id', v_active_poll_id,
    'poll_results', v_poll_results,
    'qna_rev', v_session.qna_rev,
    'cues_rev', v_session.cues_rev,
    'cues_public', v_cues,
    'participant_count', v_session.participant_count
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. [S3] sp_partner_poll_toggle_s — status='active' 게이트 제거
--    published 상태에서 활성화해도 mode를 기록해 라이브 시작 시
--    청중에게 즉시 반영 (청중은 어차피 active에서만 LiveView 렌더)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sp_partner_poll_toggle_s(
  p_poll_id UUID,
  p_status  TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_poll polls%ROWTYPE;
  v_session sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  IF v_poll.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'poll_not_found');
  END IF;

  IF NOT public.sp_can_control_session(v_poll.session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_status NOT IN ('draft', 'active', 'closed') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_status');
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = v_poll.session_id;

  IF p_status = 'active' THEN
    UPDATE polls SET status = 'closed', ended_at = now()
      WHERE session_id = v_poll.session_id AND status = 'active' AND id <> p_poll_id;
    UPDATE polls SET status = 'active', started_at = COALESCE(started_at, now()), ended_at = NULL
      WHERE id = p_poll_id;
    -- [016] 세션 status와 무관하게 mode 기록 (라이브 시작 전 준비 케이스 커버)
    UPDATE sessions SET
      broadcast_mode = 'survey',
      broadcast_notice = NULL,
      current_cue_id = NULL,
      broadcast_changed_at = now()
    WHERE id = v_poll.session_id;
  ELSE
    UPDATE polls SET
      status = p_status,
      started_at = CASE WHEN p_status = 'active' AND started_at IS NULL THEN now() ELSE started_at END,
      ended_at = CASE WHEN p_status = 'closed' THEN now() ELSE ended_at END
    WHERE id = p_poll_id;
    IF v_session.broadcast_mode = 'survey' AND NOT EXISTS (
      SELECT 1 FROM polls WHERE session_id = v_poll.session_id AND status = 'active'
    ) THEN
      UPDATE sessions SET
        broadcast_mode = 'idle',
        broadcast_changed_at = now()
      WHERE id = v_poll.session_id;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'status', p_status);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. [S3] sp_live_qna_q — liked_by_me에 로그인 사용자(user_id) 포함
--    (toggle_question_like는 로그인 시 user_id로, 비로그인 시 device_id로 기록)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sp_live_qna_q(
  p_code  TEXT,
  p_token TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_session sessions%ROWTYPE;
  v_questions JSON;
  v_uid UUID := auth.uid();
BEGIN
  SELECT * INTO v_session FROM sessions
    WHERE code = p_code AND status IN ('published', 'active');
  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_questions
  FROM (
    SELECT
      q.id, q.content,
      CASE WHEN q.is_anonymous THEN NULL ELSE q.author_name END AS author_name,
      q.is_anonymous, q.status, q.likes_count, q.answer, q.answered_at, q.created_at,
      q.is_pinned, q.is_highlighted, q.category_id,
      c.name AS category_name, c.color AS category_color,
      (p_token IS NOT NULL AND q.participant_token = p_token) AS is_mine,
      (EXISTS (
        SELECT 1 FROM question_likes ql
        WHERE ql.question_id = q.id
          AND ((p_token IS NOT NULL AND ql.device_id = p_token)
            OR (v_uid IS NOT NULL AND ql.user_id = v_uid))
      )) AS liked_by_me
    FROM questions q
    LEFT JOIN qna_categories c ON q.category_id = c.id
    WHERE q.session_id = v_session.id
      AND (
        q.status IN ('approved', 'answered')
        OR (p_token IS NOT NULL AND q.participant_token = p_token AND q.status IN ('pending', 'rejected'))
      )
    ORDER BY q.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 200))
  ) t;

  RETURN json_build_object('success', true, 'qna_rev', v_session.qna_rev, 'questions', v_questions);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. [S2] sp_partner_cue_broadcast_s — max_page 단조 증가 보존
--    같은 자료 재송출 시 하향 리셋 금지, 자료가 바뀔 때만 리셋
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sp_partner_cue_broadcast_s(
  p_session_id UUID,
  p_cue_id     UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_cue session_cues%ROWTYPE;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_cue FROM session_cues WHERE id = p_cue_id AND session_id = p_session_id;
  IF v_cue.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'cue_not_found');
  END IF;

  IF v_cue.cue_type = 'pdf' THEN
    UPDATE sessions SET
      broadcast_mode = 'pdf',
      broadcast_pdf_id = v_cue.lecture_file_id,
      broadcast_pdf_page = GREATEST(1, COALESCE(v_cue.start_page, 1)),
      -- [016] 같은 자료면 max 유지, 다른 자료면 시작 페이지로 리셋
      max_page = CASE
        WHEN broadcast_pdf_id IS DISTINCT FROM v_cue.lecture_file_id
          THEN GREATEST(1, COALESCE(v_cue.start_page, 1))
        ELSE GREATEST(COALESCE(max_page, 1), COALESCE(v_cue.start_page, 1))
      END,
      broadcast_notice = NULL,
      current_cue_id = p_cue_id,
      current_cue_fired_at = now(),
      broadcast_changed_at = now()
    WHERE id = p_session_id;

  ELSIF v_cue.cue_type = 'survey' THEN
    UPDATE polls SET status = 'closed', ended_at = now()
      WHERE session_id = p_session_id AND status = 'active' AND id IS DISTINCT FROM v_cue.poll_id;
    IF v_cue.poll_id IS NOT NULL THEN
      UPDATE polls SET status = 'active', started_at = COALESCE(started_at, now()), ended_at = NULL
        WHERE id = v_cue.poll_id AND session_id = p_session_id;
    END IF;
    UPDATE sessions SET
      broadcast_mode = 'survey',
      broadcast_notice = NULL,
      current_cue_id = p_cue_id,
      current_cue_fired_at = now(),
      broadcast_changed_at = now()
    WHERE id = p_session_id;

  ELSIF v_cue.cue_type = 'qna' THEN
    IF v_cue.qna_category_id IS NOT NULL THEN
      UPDATE qna_categories SET is_visible = (id = v_cue.qna_category_id)
        WHERE session_id = p_session_id;
    END IF;
    UPDATE sessions SET
      broadcast_mode = 'qna',
      broadcast_notice = NULL,
      current_cue_id = p_cue_id,
      current_cue_fired_at = now(),
      broadcast_changed_at = now()
    WHERE id = p_session_id;

  ELSIF v_cue.cue_type = 'notice' THEN
    UPDATE sessions SET
      broadcast_mode = 'notice',
      broadcast_notice = v_cue.notice_text,
      current_cue_id = p_cue_id,
      current_cue_fired_at = now(),
      broadcast_changed_at = now()
    WHERE id = p_session_id;

  ELSE
    RETURN json_build_object('success', false, 'error', 'invalid_cue_type');
  END IF;

  RETURN json_build_object('success', true, 'cue_id', p_cue_id, 'cue_type', v_cue.cue_type);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. [S2] bump 트리거 — search_path 고정 + display_order 제외
--    (ManagerQnA 드래그 정렬이 rev 증폭·전 청중 재조회를 유발하지 않게.
--     청중 목록은 display_order를 사용하지 않음)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_qna_rev()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(NEW) - 'likes_count' - 'updated_at' - 'display_order'
     = to_jsonb(OLD) - 'likes_count' - 'updated_at' - 'display_order' THEN
      RETURN NEW; -- likes_count·display_order만 바뀐 UPDATE는 rev 미증가
    END IF;
  END IF;
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE sessions SET qna_rev = qna_rev + 1 WHERE id = v_session_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.bump_cues_rev()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE sessions SET cues_rev = cues_rev + 1 WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
