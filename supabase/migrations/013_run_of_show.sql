-- =====================================================
-- LivePulse 강연 진행 플랜(큐시트) / Run-of-show
-- 강사별로 (강연자료/설문/Q&A/안내) 큐를 순서대로 짜고,
-- 좌장이 각 큐의 "송출" 버튼으로 청중 화면에 올린다.
-- 브라우징(선택)과 송출을 분리: 선택은 미리보기, 송출은 명시적 버튼.
-- =====================================================

-- =====================================================
-- 1. SESSIONS 컬럼 추가 (현재 큐 / 안내 문구)
-- =====================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS current_cue_id   UUID,
  ADD COLUMN IF NOT EXISTS broadcast_notice TEXT;

COMMENT ON COLUMN public.sessions.current_cue_id IS '지금 송출 중인 큐(session_cues) ID - 송출 시에만 설정, 브라우징은 변경 안 함';
COMMENT ON COLUMN public.sessions.broadcast_notice IS 'notice 모드 송출 시 청중/송출 화면에 표시할 안내 문구';
COMMENT ON COLUMN public.sessions.broadcast_mode IS '현재 송출 모드 - idle: 대기, pdf: 강연자료, qna: 질문, survey: 설문, notice: 안내';

-- =====================================================
-- 2. SESSION_CUES 테이블 (큐시트 항목)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.session_cues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  presenter_id    UUID REFERENCES public.session_presenters(id) ON DELETE SET NULL,
  cue_type        TEXT NOT NULL CHECK (cue_type IN ('pdf','survey','qna','notice')),
  title           TEXT,
  lecture_file_id UUID REFERENCES public.lecture_files(id) ON DELETE SET NULL,
  start_page      INTEGER DEFAULT 1,
  poll_id         UUID REFERENCES public.polls(id) ON DELETE SET NULL,
  qna_category_id UUID REFERENCES public.qna_categories(id) ON DELETE SET NULL,
  notice_text     TEXT,
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.session_cues IS '강연 진행 플랜(큐시트) - 강사별 (강연자료/설문/Q&A/안내) 큐를 순서대로';
COMMENT ON COLUMN public.session_cues.presenter_id IS '강사 그룹 (null=공통/미지정)';
COMMENT ON COLUMN public.session_cues.cue_type IS 'pdf: 강연자료, survey: 설문, qna: Q&A 세그먼트, notice: 안내(인트로/휴식)';
COMMENT ON COLUMN public.session_cues.start_page IS 'pdf 큐의 시작 페이지';

CREATE INDEX IF NOT EXISTS idx_session_cues_session_id ON public.session_cues(session_id);
CREATE INDEX IF NOT EXISTS idx_session_cues_display_order ON public.session_cues(display_order);

-- current_cue_id FK (session_cues 생성 후 연결)
DO $$ BEGIN
  ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_current_cue_id_fkey
    FOREIGN KEY (current_cue_id) REFERENCES public.session_cues(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS set_session_cues_updated_at ON public.session_cues;
CREATE TRIGGER set_session_cues_updated_at
  BEFORE UPDATE ON public.session_cues
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.session_cues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session managers can manage cues" ON public.session_cues;
CREATE POLICY "Session managers can manage cues" ON public.session_cues
  FOR ALL TO authenticated
  USING (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin')
  )
  WITH CHECK (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

DROP POLICY IF EXISTS "Anyone can view cues of public sessions" ON public.session_cues;
CREATE POLICY "Anyone can view cues of public sessions" ON public.session_cues
  FOR SELECT TO anon, authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active')));

-- =====================================================
-- 3. 큐 목록 조회 (조인 포함)
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
-- 4. 큐 생성/수정/삭제/순서변경
-- =====================================================
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
      poll_id, qna_category_id, notice_text, display_order
    ) VALUES (
      p_session_id, p_presenter_id, p_cue_type, p_title, p_lecture_file_id, COALESCE(p_start_page, 1),
      p_poll_id, p_qna_category_id, p_notice_text, COALESCE(p_display_order, v_next)
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
GRANT EXECUTE ON FUNCTION public.sp_partner_cue_s(TEXT, UUID, UUID, UUID, TEXT, TEXT, UUID, INTEGER, UUID, UUID, TEXT, INTEGER, JSONB) TO authenticated;

-- =====================================================
-- 5. 큐 송출 디스패처 (⭐ "송출" 버튼)
--    큐 종류에 따라 sessions 송출 상태를 한 번에 설정 + current_cue_id 기록
-- =====================================================
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
      broadcast_notice = NULL,
      current_cue_id = p_cue_id
    WHERE id = p_session_id;

  ELSIF v_cue.cue_type = 'survey' THEN
    -- 대상 설문만 active, 나머지 active 설문은 닫기
    UPDATE polls SET status = 'closed', ended_at = now()
      WHERE session_id = p_session_id AND status = 'active' AND id IS DISTINCT FROM v_cue.poll_id;
    IF v_cue.poll_id IS NOT NULL THEN
      UPDATE polls SET status = 'active', started_at = COALESCE(started_at, now()), ended_at = NULL
        WHERE id = v_cue.poll_id AND session_id = p_session_id;
    END IF;
    UPDATE sessions SET
      broadcast_mode = 'survey',
      broadcast_notice = NULL,
      current_cue_id = p_cue_id
    WHERE id = p_session_id;

  ELSIF v_cue.cue_type = 'qna' THEN
    -- 큐에 카테고리가 지정되면 그 카테고리만 노출
    IF v_cue.qna_category_id IS NOT NULL THEN
      UPDATE qna_categories SET is_visible = (id = v_cue.qna_category_id)
        WHERE session_id = p_session_id;
    END IF;
    UPDATE sessions SET
      broadcast_mode = 'qna',
      broadcast_notice = NULL,
      current_cue_id = p_cue_id
    WHERE id = p_session_id;

  ELSIF v_cue.cue_type = 'notice' THEN
    UPDATE sessions SET
      broadcast_mode = 'notice',
      broadcast_notice = v_cue.notice_text,
      current_cue_id = p_cue_id
    WHERE id = p_session_id;

  ELSE
    RETURN json_build_object('success', false, 'error', 'invalid_cue_type');
  END IF;

  RETURN json_build_object('success', true, 'cue_id', p_cue_id, 'cue_type', v_cue.cue_type);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_cue_broadcast_s(UUID, UUID) TO authenticated;

-- =====================================================
-- 6. 청중 폴링용 송출 상태 갱신 (notice + current_cue 포함)
-- =====================================================
CREATE OR REPLACE FUNCTION public.sp_live_broadcast_q(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_session sessions%ROWTYPE;
  v_pdf JSON;
  v_question JSON;
  v_categories JSON;
  v_active_poll_id UUID;
BEGIN
  SELECT * INTO v_session FROM sessions WHERE code = p_code AND status IN ('published', 'active');
  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- 현재 강연자료
  IF v_session.broadcast_mode = 'pdf' AND v_session.broadcast_pdf_id IS NOT NULL THEN
    SELECT json_build_object('id', id, 'title', title, 'file_url', file_url, 'page_count', page_count, 'page', v_session.broadcast_pdf_page)
    INTO v_pdf FROM lecture_files WHERE id = v_session.broadcast_pdf_id;
  END IF;

  -- 송출 중 질문 (+ 카테고리)
  SELECT json_build_object(
    'id', q.id, 'content', q.content,
    'author_name', CASE WHEN q.is_anonymous THEN NULL ELSE q.author_name END,
    'is_anonymous', q.is_anonymous, 'likes_count', q.likes_count,
    'category_name', c.name, 'category_color', c.color
  ) INTO v_question
  FROM questions q LEFT JOIN qna_categories c ON q.category_id = c.id
  WHERE q.session_id = v_session.id AND q.is_broadcasting = true LIMIT 1;

  -- 노출 카테고리 목록
  SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'color', color) ORDER BY display_order), '[]'::json)
  INTO v_categories
  FROM qna_categories WHERE session_id = v_session.id AND is_visible = true;

  -- 활성 설문
  SELECT id INTO v_active_poll_id FROM polls WHERE session_id = v_session.id AND status = 'active' ORDER BY started_at DESC NULLS LAST LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'broadcast_mode', COALESCE(v_session.broadcast_mode, 'idle'),
    'broadcast_notice', v_session.broadcast_notice,
    'current_cue_id', v_session.current_cue_id,
    'pdf', v_pdf,
    'question', v_question,
    'categories', v_categories,
    'active_poll_id', v_active_poll_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_live_broadcast_q(TEXT) TO anon, authenticated;
