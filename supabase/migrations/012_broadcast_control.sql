-- =====================================================
-- LivePulse 통합 송출 제어
-- 좌장이 강연자료(PDF)/QnA/설문 3모드를 전환·제어
-- =====================================================

-- =====================================================
-- 1. SESSIONS 컬럼 추가 (현재 송출 상태)
-- =====================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS broadcast_mode     TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS broadcast_pdf_id   UUID,
  ADD COLUMN IF NOT EXISTS broadcast_pdf_page INTEGER DEFAULT 1;

COMMENT ON COLUMN public.sessions.broadcast_mode IS '현재 송출 모드 - idle: 대기, pdf: 강연자료, qna: 질문, survey: 설문';
COMMENT ON COLUMN public.sessions.broadcast_pdf_id IS '현재 송출 중인 강연자료(lecture_files) ID';
COMMENT ON COLUMN public.sessions.broadcast_pdf_page IS '현재 송출 중인 강연자료 페이지 번호';

-- =====================================================
-- 2. LECTURE_FILES 테이블 (강연자료 PDF)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lecture_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  presenter_id  UUID REFERENCES public.session_presenters(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_path     TEXT,
  page_count    INTEGER DEFAULT 0,
  file_size     BIGINT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.lecture_files IS '강연자료 - 세션별 PDF 파일(다중), 송출 화면에서 페이지 단위로 표시';
COMMENT ON COLUMN public.lecture_files.file_url IS 'storage 공개 URL';
COMMENT ON COLUMN public.lecture_files.file_path IS 'storage 경로 (삭제용)';
COMMENT ON COLUMN public.lecture_files.page_count IS '총 페이지 수 (업로드 시 pdf.js로 추출)';

CREATE INDEX IF NOT EXISTS idx_lecture_files_session_id ON public.lecture_files(session_id);
CREATE INDEX IF NOT EXISTS idx_lecture_files_display_order ON public.lecture_files(display_order);

-- broadcast_pdf_id FK (lecture_files 생성 후 연결)
DO $$ BEGIN
  ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_broadcast_pdf_id_fkey
    FOREIGN KEY (broadcast_pdf_id) REFERENCES public.lecture_files(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS set_lecture_files_updated_at ON public.lecture_files;
CREATE TRIGGER set_lecture_files_updated_at
  BEFORE UPDATE ON public.lecture_files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.lecture_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session managers can manage lecture files" ON public.lecture_files;
CREATE POLICY "Session managers can manage lecture files" ON public.lecture_files
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

DROP POLICY IF EXISTS "Anyone can view lecture files of public sessions" ON public.lecture_files;
CREATE POLICY "Anyone can view lecture files of public sessions" ON public.lecture_files
  FOR SELECT TO anon, authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active')));

-- =====================================================
-- 3. QNA_CATEGORIES 테이블 (질문 카테고리)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.qna_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT DEFAULT '#4f46e5',
  display_order INTEGER DEFAULT 0,
  is_visible    BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.qna_categories IS '질문 카테고리 - 청중 필터 + 좌장 노출 제어';
COMMENT ON COLUMN public.qna_categories.is_visible IS '청중 화면 노출 여부 - 좌장이 토글';

CREATE INDEX IF NOT EXISTS idx_qna_categories_session_id ON public.qna_categories(session_id);

ALTER TABLE public.qna_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session managers can manage qna categories" ON public.qna_categories;
CREATE POLICY "Session managers can manage qna categories" ON public.qna_categories
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

DROP POLICY IF EXISTS "Anyone can view qna categories of public sessions" ON public.qna_categories;
CREATE POLICY "Anyone can view qna categories of public sessions" ON public.qna_categories
  FOR SELECT TO anon, authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active')));

-- =====================================================
-- 4. QUESTIONS 카테고리 컬럼
-- =====================================================
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.qna_categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.questions.category_id IS '질문 카테고리 - 청중 필터/좌장 노출 제어';

CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id);

-- =====================================================
-- 5. 권한 헬퍼 - 세션 제어 가능 여부 (좌장/강연자/협업/팀/관리자)
-- =====================================================
CREATE OR REPLACE FUNCTION public.sp_can_control_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  -- 관리자
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND user_role = 'admin') THEN RETURN TRUE; END IF;
  -- 세션 소유 파트너
  IF EXISTS (SELECT 1 FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE s.id = p_session_id AND p.profile_id = v_uid) THEN RETURN TRUE; END IF;
  -- 수락된 협업 파트너
  IF EXISTS (SELECT 1 FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE sp.session_id = p_session_id AND sp.status = 'accepted' AND p.profile_id = v_uid) THEN RETURN TRUE; END IF;
  -- 확정 강연자 (파트너 타입)
  IF EXISTS (SELECT 1 FROM session_presenters pr JOIN partners p ON pr.partner_id = p.id WHERE pr.session_id = p_session_id AND pr.status = 'confirmed' AND p.profile_id = v_uid) THEN RETURN TRUE; END IF;
  -- 확정 강연자 (팀원 타입)
  IF EXISTS (SELECT 1 FROM session_presenters pr WHERE pr.session_id = p_session_id AND pr.status = 'confirmed' AND pr.user_id = v_uid) THEN RETURN TRUE; END IF;
  -- 세션 멤버 (owner/admin/moderator/presenter)
  IF EXISTS (SELECT 1 FROM session_members m WHERE m.session_id = p_session_id AND m.user_id = v_uid AND m.role IN ('owner','admin','moderator','presenter')) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.sp_can_control_session IS '세션 송출 제어 권한 확인 (좌장/강연자/협업/팀/관리자)';
GRANT EXECUTE ON FUNCTION public.sp_can_control_session(UUID) TO authenticated;

-- =====================================================
-- 6. 송출 상태 조회/제어 프로시저
-- =====================================================

-- 현재 송출 상태 조회
CREATE OR REPLACE FUNCTION public.sp_partner_broadcast_state_q(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'broadcast_mode', s.broadcast_mode,
    'broadcast_pdf_id', s.broadcast_pdf_id,
    'broadcast_pdf_page', s.broadcast_pdf_page,
    'active_poll_id', (SELECT id FROM polls WHERE session_id = p_session_id AND status = 'active' ORDER BY started_at DESC NULLS LAST LIMIT 1),
    'broadcasting_question_id', (SELECT id FROM questions WHERE session_id = p_session_id AND is_broadcasting = true LIMIT 1)
  ) INTO v_result
  FROM sessions s WHERE s.id = p_session_id;
  RETURN COALESCE(v_result, json_build_object('broadcast_mode', 'idle'));
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_broadcast_state_q(UUID) TO authenticated;

-- 송출 모드 전환 (+ 강연자료 선택)
CREATE OR REPLACE FUNCTION public.sp_partner_broadcast_mode_s(
  p_session_id UUID,
  p_mode TEXT,
  p_pdf_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_mode NOT IN ('idle','pdf','qna','survey') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_mode');
  END IF;

  IF p_mode = 'pdf' AND p_pdf_id IS NOT NULL THEN
    UPDATE sessions
    SET broadcast_mode = 'pdf',
        broadcast_pdf_id = p_pdf_id,
        broadcast_pdf_page = CASE WHEN broadcast_pdf_id IS DISTINCT FROM p_pdf_id THEN 1 ELSE broadcast_pdf_page END
    WHERE id = p_session_id;
  ELSE
    UPDATE sessions SET broadcast_mode = p_mode WHERE id = p_session_id;
  END IF;

  RETURN json_build_object('success', true, 'mode', p_mode);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_broadcast_mode_s(UUID, TEXT, UUID) TO authenticated;

-- 강연자료 페이지 이동 (좌장·강연자 공용)
CREATE OR REPLACE FUNCTION public.sp_partner_pdf_page_s(
  p_session_id UUID,
  p_page INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_total INTEGER; v_page INTEGER;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT lf.page_count INTO v_total
  FROM lecture_files lf JOIN sessions s ON s.broadcast_pdf_id = lf.id
  WHERE s.id = p_session_id;

  v_page := GREATEST(1, COALESCE(p_page, 1));
  IF v_total IS NOT NULL AND v_total > 0 THEN
    v_page := LEAST(v_page, v_total);
  END IF;

  UPDATE sessions SET broadcast_pdf_page = v_page WHERE id = p_session_id;
  RETURN json_build_object('success', true, 'page', v_page);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_pdf_page_s(UUID, INTEGER) TO authenticated;

-- =====================================================
-- 7. 강연자료 목록/CRUD
-- =====================================================
CREATE OR REPLACE FUNCTION public.sp_partner_lectures_q(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 'title', title, 'file_url', file_url, 'file_path', file_path,
    'page_count', page_count, 'file_size', file_size,
    'display_order', display_order, 'presenter_id', presenter_id
  ) ORDER BY display_order, created_at), '[]'::json)
  INTO v_result
  FROM lecture_files WHERE session_id = p_session_id;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_lectures_q(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.sp_partner_lecture_s(
  p_action TEXT,
  p_session_id UUID,
  p_lecture_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_file_url TEXT DEFAULT NULL,
  p_file_path TEXT DEFAULT NULL,
  p_page_count INTEGER DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_action = 'create' THEN
    INSERT INTO lecture_files (session_id, title, file_url, file_path, page_count, file_size, display_order)
    VALUES (p_session_id, COALESCE(p_title, '강연자료'), p_file_url, p_file_path, COALESCE(p_page_count, 0), p_file_size, p_display_order)
    RETURNING id INTO v_id;
    RETURN json_build_object('success', true, 'id', v_id);

  ELSIF p_action = 'update' THEN
    UPDATE lecture_files SET
      title = COALESCE(p_title, title),
      display_order = COALESCE(p_display_order, display_order),
      page_count = COALESCE(p_page_count, page_count)
    WHERE id = p_lecture_id AND session_id = p_session_id;
    RETURN json_build_object('success', true, 'id', p_lecture_id);

  ELSIF p_action = 'delete' THEN
    DELETE FROM lecture_files WHERE id = p_lecture_id AND session_id = p_session_id;
    -- 송출 중이던 자료였다면 대기로
    UPDATE sessions SET broadcast_mode = 'idle', broadcast_pdf_id = NULL
    WHERE id = p_session_id AND broadcast_pdf_id = p_lecture_id;
    RETURN json_build_object('success', true);
  END IF;

  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_lecture_s(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, BIGINT, INTEGER) TO authenticated;

-- =====================================================
-- 8. QnA 카테고리 목록/CRUD + 질문 카테고리 지정
-- =====================================================
CREATE OR REPLACE FUNCTION public.sp_partner_qna_categories_q(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id', c.id, 'name', c.name, 'color', c.color,
    'display_order', c.display_order, 'is_visible', c.is_visible,
    'question_count', (SELECT COUNT(*) FROM questions q WHERE q.category_id = c.id)
  ) ORDER BY c.display_order, c.created_at), '[]'::json)
  INTO v_result
  FROM qna_categories c WHERE c.session_id = p_session_id;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_qna_categories_q(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_category_s(
  p_action TEXT,
  p_session_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0,
  p_is_visible BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_action = 'create' THEN
    INSERT INTO qna_categories (session_id, name, color, display_order, is_visible)
    VALUES (p_session_id, COALESCE(p_name, '카테고리'), COALESCE(p_color, '#4f46e5'), p_display_order, COALESCE(p_is_visible, true))
    RETURNING id INTO v_id;
    RETURN json_build_object('success', true, 'id', v_id);

  ELSIF p_action = 'update' THEN
    UPDATE qna_categories SET
      name = COALESCE(p_name, name),
      color = COALESCE(p_color, color),
      display_order = COALESCE(p_display_order, display_order),
      is_visible = COALESCE(p_is_visible, is_visible)
    WHERE id = p_category_id AND session_id = p_session_id;
    RETURN json_build_object('success', true, 'id', p_category_id);

  ELSIF p_action = 'delete' THEN
    DELETE FROM qna_categories WHERE id = p_category_id AND session_id = p_session_id;
    RETURN json_build_object('success', true);
  END IF;

  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_qna_category_s(TEXT, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN) TO authenticated;

-- 질문에 카테고리 지정 (기존 sp_partner_qna_update_s 미수정, 분리)
CREATE OR REPLACE FUNCTION public.sp_partner_qna_set_category_s(
  p_question_id UUID,
  p_category_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID;
BEGIN
  SELECT session_id INTO v_session_id FROM questions WHERE id = p_question_id;
  IF v_session_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'question_not_found');
  END IF;
  IF NOT public.sp_can_control_session(v_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE questions SET category_id = p_category_id WHERE id = p_question_id;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_partner_qna_set_category_s(UUID, UUID) TO authenticated;

-- =====================================================
-- 9. 청중 폴링용 송출 상태 (anon 허용)
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
    'pdf', v_pdf,
    'question', v_question,
    'categories', v_categories,
    'active_poll_id', v_active_poll_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.sp_live_broadcast_q(TEXT) TO anon, authenticated;
