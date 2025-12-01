-- =====================================================
-- LivePulse Q&A 시스템
-- 질문 등록, 좋아요, 답변, 송출 기능
-- =====================================================

-- =====================================================
-- 1. QUESTIONS 테이블 (질문)
-- =====================================================
CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  presenter_id    UUID REFERENCES public.session_presenters(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES public.session_templates(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  author_name     TEXT,
  author_id       UUID,
  is_anonymous    BOOLEAN DEFAULT false,
  status          TEXT DEFAULT 'pending',
  is_pinned       BOOLEAN DEFAULT false,
  is_highlighted  BOOLEAN DEFAULT false,
  is_displayed    BOOLEAN DEFAULT false,
  is_broadcasting BOOLEAN DEFAULT false,
  created_by_manager BOOLEAN DEFAULT false,
  display_order   INTEGER DEFAULT 0,
  likes_count     INTEGER DEFAULT 0,
  answer          TEXT,
  answered_by     UUID,
  answered_at     TIMESTAMPTZ,
  moderated_by    UUID,
  moderated_at    TIMESTAMPTZ,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.questions IS '질문 - 청중이 제출한 질문 관리';
COMMENT ON COLUMN public.questions.session_id IS '세션 ID';
COMMENT ON COLUMN public.questions.presenter_id IS '대상 강사 ID - 특정 강사에게 질문 시 지정';
COMMENT ON COLUMN public.questions.template_id IS '송출 템플릿 ID - 화면 스타일';
COMMENT ON COLUMN public.questions.content IS '질문 내용';
COMMENT ON COLUMN public.questions.author_name IS '작성자 표시명 (익명시 null)';
COMMENT ON COLUMN public.questions.author_id IS '작성자 사용자 ID (로그인 사용자)';
COMMENT ON COLUMN public.questions.is_anonymous IS '익명 여부';
COMMENT ON COLUMN public.questions.status IS '상태 - pending: 대기, approved: 승인, answered: 답변완료, hidden: 숨김, rejected: 거부';
COMMENT ON COLUMN public.questions.is_pinned IS '상단 고정 여부';
COMMENT ON COLUMN public.questions.is_highlighted IS '하이라이트 여부 - 현재 답변 중인 질문';
COMMENT ON COLUMN public.questions.is_displayed IS '화면 표시 여부 - 강연자 리스트에 표시할 질문';
COMMENT ON COLUMN public.questions.is_broadcasting IS '송출 중 여부 - 현재 프로젝터에 표시 중';
COMMENT ON COLUMN public.questions.created_by_manager IS '관리자가 직접 등록한 질문 여부';
COMMENT ON COLUMN public.questions.display_order IS '표시 순서 - 드래그 앤 드랍으로 조정';
COMMENT ON COLUMN public.questions.likes_count IS '좋아요 수';
COMMENT ON COLUMN public.questions.answer IS '답변 내용';
COMMENT ON COLUMN public.questions.answered_by IS '답변자 사용자 ID';
COMMENT ON COLUMN public.questions.answered_at IS '답변 일시';
COMMENT ON COLUMN public.questions.moderated_by IS '검토자 사용자 ID';
COMMENT ON COLUMN public.questions.moderated_at IS '검토 일시';
COMMENT ON COLUMN public.questions.reject_reason IS '거부 사유';

CREATE INDEX idx_questions_session_id ON public.questions(session_id);
CREATE INDEX idx_questions_presenter_id ON public.questions(presenter_id);
CREATE INDEX idx_questions_status ON public.questions(status);
CREATE INDEX idx_questions_created_at ON public.questions(created_at DESC);
CREATE INDEX idx_questions_likes_count ON public.questions(likes_count DESC);
CREATE INDEX idx_questions_is_broadcasting ON public.questions(is_broadcasting);
CREATE INDEX idx_questions_display_order ON public.questions(display_order);

-- =====================================================
-- 2. QUESTION_LIKES 테이블 (좋아요)
-- =====================================================
CREATE TABLE public.question_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id     UUID,
  device_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, user_id),
  UNIQUE(question_id, device_id)
);

COMMENT ON TABLE public.question_likes IS '질문 좋아요 - 중복 방지를 위한 기록';
COMMENT ON COLUMN public.question_likes.question_id IS '질문 ID';
COMMENT ON COLUMN public.question_likes.user_id IS '좋아요 누른 사용자 ID (로그인 사용자)';
COMMENT ON COLUMN public.question_likes.device_id IS '디바이스 ID - 비로그인 사용자 식별용';

CREATE INDEX idx_question_likes_question_id ON public.question_likes(question_id);

-- =====================================================
-- 3. RLS 정책
-- =====================================================

-- questions RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved questions" ON public.questions
  FOR SELECT TO anon, authenticated
  USING (
    status IN ('approved', 'answered') AND
    session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active'))
  );

CREATE POLICY "Admins can view all questions" ON public.questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "Session managers can view all questions" ON public.questions
  FOR SELECT TO authenticated
  USING (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
  );

CREATE POLICY "Anyone can submit questions" ON public.questions
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE status = 'active'));

CREATE POLICY "Session managers can insert questions" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

CREATE POLICY "Session managers can update questions" ON public.questions
  FOR UPDATE TO authenticated
  USING (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
  );

CREATE POLICY "Admins can update all questions" ON public.questions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- question_likes RLS
ALTER TABLE public.question_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.question_likes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can add likes" ON public.question_likes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own likes" ON public.question_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 4. 트리거
-- =====================================================
CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 좋아요 수 동기화 트리거
CREATE OR REPLACE FUNCTION public.update_question_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.questions 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.questions 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_question_likes_count IS '좋아요 추가/삭제 시 질문의 likes_count 자동 갱신';

CREATE TRIGGER update_likes_count_on_insert
  AFTER INSERT ON public.question_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_question_likes_count();

CREATE TRIGGER update_likes_count_on_delete
  AFTER DELETE ON public.question_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_question_likes_count();

-- =====================================================
-- 5. 헬퍼 함수
-- =====================================================

-- 질문 좋아요 토글 함수
CREATE OR REPLACE FUNCTION public.toggle_question_like(
  p_question_id UUID,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_existing UUID;
  v_liked BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM question_likes
    WHERE question_id = p_question_id AND user_id = v_user_id;
  ELSE
    IF p_device_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'device_id_required');
    END IF;
    
    SELECT id INTO v_existing
    FROM question_likes
    WHERE question_id = p_question_id AND device_id = p_device_id;
  END IF;
  
  IF v_existing IS NOT NULL THEN
    DELETE FROM question_likes WHERE id = v_existing;
    v_liked := false;
  ELSE
    IF v_user_id IS NOT NULL THEN
      INSERT INTO question_likes (question_id, user_id) VALUES (p_question_id, v_user_id);
    ELSE
      INSERT INTO question_likes (question_id, device_id) VALUES (p_question_id, p_device_id);
    END IF;
    v_liked := true;
  END IF;
  
  RETURN json_build_object('success', true, 'liked', v_liked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.toggle_question_like IS '질문 좋아요 토글 - 이미 좋아요면 취소, 없으면 추가';

-- 좋아요 여부 확인 함수
CREATE OR REPLACE FUNCTION public.check_question_liked(
  p_question_id UUID,
  p_device_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM question_likes 
      WHERE question_id = p_question_id AND user_id = v_user_id
    );
  ELSIF p_device_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM question_likes 
      WHERE question_id = p_question_id AND device_id = p_device_id
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_question_liked IS '현재 사용자/디바이스가 해당 질문에 좋아요했는지 확인';

-- 질문 송출 토글 함수
CREATE OR REPLACE FUNCTION public.toggle_question_broadcast(
  p_question_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_question questions%ROWTYPE;
  v_is_broadcasting BOOLEAN;
BEGIN
  SELECT * INTO v_question FROM questions WHERE id = p_question_id;
  
  IF v_question IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'question_not_found');
  END IF;
  
  -- 다른 질문 송출 해제
  UPDATE questions
  SET is_broadcasting = false
  WHERE session_id = v_question.session_id AND is_broadcasting = true AND id != p_question_id;
  
  -- 현재 질문 송출 토글
  v_is_broadcasting := NOT COALESCE(v_question.is_broadcasting, false);
  
  UPDATE questions
  SET is_broadcasting = v_is_broadcasting, is_displayed = true
  WHERE id = p_question_id;
  
  RETURN json_build_object('success', true, 'is_broadcasting', v_is_broadcasting);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.toggle_question_broadcast IS '질문 송출 토글 - 한 세션에 하나만 송출 가능';

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.toggle_question_like(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_question_liked(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_question_broadcast(UUID) TO authenticated;

-- =====================================================
-- 6. Realtime 설정
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

