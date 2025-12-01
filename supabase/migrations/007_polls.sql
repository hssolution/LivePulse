-- =====================================================
-- LivePulse 설문 시스템
-- 실시간 투표/설문 기능
-- =====================================================

-- =====================================================
-- 1. POLLS 테이블 (설문)
-- =====================================================
CREATE TABLE public.polls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES public.session_templates(id) ON DELETE SET NULL,
  question        TEXT NOT NULL,
  poll_type       TEXT DEFAULT 'single',
  is_required     BOOLEAN DEFAULT false,
  status          TEXT DEFAULT 'draft',
  display_order   INTEGER DEFAULT 0,
  show_results    BOOLEAN DEFAULT false,
  allow_anonymous BOOLEAN DEFAULT true,
  max_selections  INTEGER,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.polls IS '설문 - 세션별 실시간 투표/설문 관리';
COMMENT ON COLUMN public.polls.session_id IS '세션 ID';
COMMENT ON COLUMN public.polls.template_id IS '송출 템플릿 ID - 화면 스타일';
COMMENT ON COLUMN public.polls.question IS '설문 질문 내용';
COMMENT ON COLUMN public.polls.poll_type IS '설문 유형 - single: 단일선택(Radio), multiple: 복수선택(Checkbox), open: 주관식';
COMMENT ON COLUMN public.polls.is_required IS '필수 응답 여부';
COMMENT ON COLUMN public.polls.status IS '상태 - draft: 초안, active: 진행중, closed: 종료';
COMMENT ON COLUMN public.polls.display_order IS '표시 순서';
COMMENT ON COLUMN public.polls.show_results IS '결과 공개 여부 - true면 청중에게 결과 표시';
COMMENT ON COLUMN public.polls.allow_anonymous IS '익명 응답 허용 여부';
COMMENT ON COLUMN public.polls.max_selections IS '최대 선택 수 - multiple 타입에서 선택 가능한 최대 개수 (null이면 무제한)';
COMMENT ON COLUMN public.polls.started_at IS '설문 시작 일시';
COMMENT ON COLUMN public.polls.ended_at IS '설문 종료 일시';

CREATE INDEX idx_polls_session_id ON public.polls(session_id);
CREATE INDEX idx_polls_status ON public.polls(status);
CREATE INDEX idx_polls_display_order ON public.polls(display_order);

-- =====================================================
-- 2. POLL_OPTIONS 테이블 (설문 보기)
-- =====================================================
CREATE TABLE public.poll_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text   TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.poll_options IS '설문 보기 옵션 - 동적으로 추가/삭제 가능 (개수 제한 없음)';
COMMENT ON COLUMN public.poll_options.poll_id IS '설문 ID';
COMMENT ON COLUMN public.poll_options.option_text IS '보기 텍스트';
COMMENT ON COLUMN public.poll_options.display_order IS '표시 순서';

CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX idx_poll_options_display_order ON public.poll_options(display_order);

-- =====================================================
-- 3. POLL_RESPONSES 테이블 (설문 응답)
-- =====================================================
CREATE TABLE public.poll_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id     UUID REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id  TEXT,
  response_text TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.poll_responses IS '설문 응답 - 청중의 투표/응답 기록';
COMMENT ON COLUMN public.poll_responses.poll_id IS '설문 ID';
COMMENT ON COLUMN public.poll_responses.option_id IS '선택한 보기 ID (single/multiple 타입) - null이면 주관식 응답';
COMMENT ON COLUMN public.poll_responses.user_id IS '응답자 사용자 ID (로그인 사용자)';
COMMENT ON COLUMN public.poll_responses.anonymous_id IS '익명 ID - 비로그인 사용자 식별용 (device fingerprint 등)';
COMMENT ON COLUMN public.poll_responses.response_text IS '주관식 응답 텍스트 - open 타입에서 사용';

CREATE INDEX idx_poll_responses_poll_id ON public.poll_responses(poll_id);
CREATE INDEX idx_poll_responses_option_id ON public.poll_responses(option_id);
CREATE INDEX idx_poll_responses_user_id ON public.poll_responses(user_id);

-- 중복 응답 방지 인덱스 (로그인 사용자)
CREATE UNIQUE INDEX idx_poll_responses_unique_user 
ON public.poll_responses(poll_id, option_id, user_id) 
WHERE user_id IS NOT NULL;

-- 중복 응답 방지 인덱스 (익명 사용자)
CREATE UNIQUE INDEX idx_poll_responses_unique_anonymous 
ON public.poll_responses(poll_id, option_id, anonymous_id) 
WHERE anonymous_id IS NOT NULL;

-- =====================================================
-- 4. RLS 정책
-- =====================================================

-- polls RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- 활성 세션의 활성 설문은 누구나 조회
CREATE POLICY "Anyone can view active polls" ON public.polls
  FOR SELECT TO anon, authenticated
  USING (
    status IN ('active', 'closed') AND
    session_id IN (SELECT id FROM sessions WHERE status IN ('published', 'active'))
  );

-- 관리자는 모든 설문 조회
CREATE POLICY "Admins can view all polls" ON public.polls
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- 세션 관리자는 모든 설문 조회/관리
CREATE POLICY "Session managers can manage polls" ON public.polls
  FOR ALL TO authenticated
  USING (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
  )
  WITH CHECK (
    session_id IN (SELECT s.id FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE p.profile_id = auth.uid())
    OR session_id IN (SELECT sp.session_id FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE p.profile_id = auth.uid() AND sp.status = 'accepted')
  );

-- poll_options RLS
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- 누구나 보기 조회 가능
CREATE POLICY "Anyone can view poll options" ON public.poll_options
  FOR SELECT TO anon, authenticated
  USING (true);

-- 세션 관리자만 보기 관리
CREATE POLICY "Session managers can manage poll options" ON public.poll_options
  FOR ALL TO authenticated
  USING (
    poll_id IN (
      SELECT p.id FROM polls p
      JOIN sessions s ON p.session_id = s.id
      JOIN partners pt ON s.partner_id = pt.id
      WHERE pt.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    poll_id IN (
      SELECT p.id FROM polls p
      JOIN sessions s ON p.session_id = s.id
      JOIN partners pt ON s.partner_id = pt.id
      WHERE pt.profile_id = auth.uid()
    )
  );

-- poll_responses RLS
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

-- 세션 관리자는 응답 조회 가능
CREATE POLICY "Session managers can view responses" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (
    poll_id IN (
      SELECT p.id FROM polls p
      JOIN sessions s ON p.session_id = s.id
      JOIN partners pt ON s.partner_id = pt.id
      WHERE pt.profile_id = auth.uid()
    )
  );

-- 관리자는 모든 응답 조회
CREATE POLICY "Admins can view all responses" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- 누구나 활성 설문에 응답 가능
CREATE POLICY "Anyone can submit responses" ON public.poll_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    poll_id IN (SELECT id FROM polls WHERE status = 'active')
  );

-- =====================================================
-- 5. 트리거
-- =====================================================
CREATE TRIGGER set_polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. 헬퍼 함수
-- =====================================================

-- 설문 응답 제출 함수
CREATE OR REPLACE FUNCTION public.submit_poll_response(
  p_poll_id UUID,
  p_option_ids UUID[] DEFAULT NULL,
  p_response_text TEXT DEFAULT NULL,
  p_anonymous_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_poll polls%ROWTYPE;
  v_user_id UUID;
  v_option_id UUID;
  v_existing_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- 설문 조회
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  
  IF v_poll IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'poll_not_found');
  END IF;
  
  IF v_poll.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'poll_not_active');
  END IF;
  
  -- 중복 응답 체크
  IF v_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM poll_responses
    WHERE poll_id = p_poll_id AND user_id = v_user_id;
  ELSIF p_anonymous_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM poll_responses
    WHERE poll_id = p_poll_id AND anonymous_id = p_anonymous_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'user_or_anonymous_id_required');
  END IF;
  
  IF v_existing_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'already_responded');
  END IF;
  
  -- 설문 유형에 따른 처리
  IF v_poll.poll_type = 'open' THEN
    -- 주관식
    IF p_response_text IS NULL OR p_response_text = '' THEN
      RETURN json_build_object('success', false, 'error', 'response_text_required');
    END IF;
    
    INSERT INTO poll_responses (poll_id, user_id, anonymous_id, response_text)
    VALUES (p_poll_id, v_user_id, p_anonymous_id, p_response_text);
    
  ELSIF v_poll.poll_type = 'single' THEN
    -- 단일 선택
    IF p_option_ids IS NULL OR array_length(p_option_ids, 1) != 1 THEN
      RETURN json_build_object('success', false, 'error', 'single_option_required');
    END IF;
    
    INSERT INTO poll_responses (poll_id, option_id, user_id, anonymous_id)
    VALUES (p_poll_id, p_option_ids[1], v_user_id, p_anonymous_id);
    
  ELSIF v_poll.poll_type = 'multiple' THEN
    -- 복수 선택
    IF p_option_ids IS NULL OR array_length(p_option_ids, 1) = 0 THEN
      RETURN json_build_object('success', false, 'error', 'options_required');
    END IF;
    
    -- 최대 선택 수 체크
    IF v_poll.max_selections IS NOT NULL AND array_length(p_option_ids, 1) > v_poll.max_selections THEN
      RETURN json_build_object('success', false, 'error', 'too_many_selections');
    END IF;
    
    FOREACH v_option_id IN ARRAY p_option_ids LOOP
      INSERT INTO poll_responses (poll_id, option_id, user_id, anonymous_id)
      VALUES (p_poll_id, v_option_id, v_user_id, p_anonymous_id);
    END LOOP;
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.submit_poll_response IS '설문 응답 제출 - 유형에 따라 단일/복수/주관식 처리';

-- 설문 결과 조회 함수
CREATE OR REPLACE FUNCTION public.get_poll_results(p_poll_id UUID)
RETURNS JSON AS $$
DECLARE
  v_poll polls%ROWTYPE;
  v_total_responses INTEGER;
  v_results JSON;
BEGIN
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  
  IF v_poll IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'poll_not_found');
  END IF;
  
  -- 총 응답자 수
  SELECT COUNT(DISTINCT COALESCE(user_id::text, anonymous_id))
  INTO v_total_responses
  FROM poll_responses
  WHERE poll_id = p_poll_id;
  
  IF v_poll.poll_type = 'open' THEN
    -- 주관식: 응답 목록 반환
    SELECT json_agg(json_build_object('text', response_text, 'created_at', created_at))
    INTO v_results
    FROM poll_responses
    WHERE poll_id = p_poll_id AND response_text IS NOT NULL;
  ELSE
    -- 선택형: 옵션별 응답 수
    SELECT json_agg(json_build_object(
      'option_id', po.id,
      'option_text', po.option_text,
      'count', COALESCE(pr.cnt, 0),
      'percentage', CASE WHEN v_total_responses > 0 
        THEN ROUND((COALESCE(pr.cnt, 0)::numeric / v_total_responses) * 100, 1)
        ELSE 0 END
    ) ORDER BY po.display_order)
    INTO v_results
    FROM poll_options po
    LEFT JOIN (
      SELECT option_id, COUNT(*) as cnt
      FROM poll_responses
      WHERE poll_id = p_poll_id
      GROUP BY option_id
    ) pr ON po.id = pr.option_id
    WHERE po.poll_id = p_poll_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'poll_id', p_poll_id,
    'poll_type', v_poll.poll_type,
    'total_responses', v_total_responses,
    'results', COALESCE(v_results, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_poll_results IS '설문 결과 조회 - 옵션별 응답 수 및 비율 반환';

-- 설문 상태 변경 함수
CREATE OR REPLACE FUNCTION public.update_poll_status(
  p_poll_id UUID,
  p_status TEXT
)
RETURNS JSON AS $$
DECLARE
  v_poll polls%ROWTYPE;
BEGIN
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  
  IF v_poll IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'poll_not_found');
  END IF;
  
  IF p_status NOT IN ('draft', 'active', 'closed') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_status');
  END IF;
  
  UPDATE polls
  SET 
    status = p_status,
    started_at = CASE WHEN p_status = 'active' AND started_at IS NULL THEN now() ELSE started_at END,
    ended_at = CASE WHEN p_status = 'closed' THEN now() ELSE ended_at END
  WHERE id = p_poll_id;
  
  RETURN json_build_object('success', true, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_poll_status IS '설문 상태 변경 - draft/active/closed';

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.submit_poll_response(UUID, UUID[], TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_poll_results(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_poll_status(UUID, TEXT) TO authenticated;

-- =====================================================
-- 7. Realtime 설정
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_responses;

