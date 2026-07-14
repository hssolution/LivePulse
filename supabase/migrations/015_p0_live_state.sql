-- ============================================================
-- 015: P0 — 보안 즉시 수정 + 청중 신호 정리 (PRD v1.3 §5·§6·§8)
--
-- 적용: 사용자가 원격 Supabase에 직접 적용 (docs 프로시저 배포 모델)
-- 하위호환: 신규 파라미터는 전부 DEFAULT — 구 UI가 구 시그니처로
--           호출해도 동작. 구 sp_live_broadcast_q는 그대로 유지.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. [보안 — 즉시] update_poll_status 소유권 검사 추가
--    현행: 아무 authenticated 사용자가 임의 세션의 설문 상태를
--    변경 가능(크로스테넌트). sp_can_control_session으로 잠근다.
-- ────────────────────────────────────────────────────────────
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

  -- [015] 소유권/운영 권한 검사 (관리자·소유 파트너·협업·확정 강연자)
  IF NOT public.sp_can_control_session(v_poll.session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.update_poll_status IS '설문 상태 변경 - draft/active/closed (015: 소유권 검사 추가)';

-- 1b. question_likes 직접 INSERT/DELETE 정책 제거 → toggle_question_like RPC 단일 경로
--     (RPC는 SECURITY DEFINER라 정책 제거와 무관하게 동작)
DROP POLICY IF EXISTS "Anyone can add likes" ON public.question_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.question_likes;

-- ────────────────────────────────────────────────────────────
-- 2. sessions 컬럼 추가 (버전 신호·계측·자유 열람 상한·장면 설정)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS qna_rev BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cues_rev BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS current_cue_fired_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS broadcast_changed_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS max_page INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS audience_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sessions.qna_rev IS 'Q&A 목록 버전 - 변경 시에만 청중이 목록 재조회 (likes_count 단독 변경은 제외)';
COMMENT ON COLUMN public.sessions.cues_rev IS '공개 큐시트 버전 - 변경 시에만 일정 목록 재전송';
COMMENT ON COLUMN public.sessions.current_cue_fired_at IS '현재 큐 송출 시각 - 지연 판정·±N분 표시 기준 (PRD §5)';
COMMENT ON COLUMN public.sessions.broadcast_changed_at IS '송출 상태 최종 변경 시각 - 지연 계측용';
COMMENT ON COLUMN public.sessions.max_page IS '강연자료 최대 도달 페이지 - 청중 자유 열람 상한 (PRD §3.4)';
COMMENT ON COLUMN public.sessions.audience_settings IS '청중 장면 동작 설정 JSONB (Q&A 노출 정책·스케줄표 on/off·열람 모드·ui_version 등)';

-- ────────────────────────────────────────────────────────────
-- 3. session_cues 시간·공개 필드 + 노출 게이트 (PRD §5)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.session_cues ADD COLUMN IF NOT EXISTS planned_start_at TIMESTAMPTZ;
ALTER TABLE public.session_cues ADD COLUMN IF NOT EXISTS duration_min INTEGER;
ALTER TABLE public.session_cues ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.session_cues ADD COLUMN IF NOT EXISTS public_title TEXT;

COMMENT ON COLUMN public.session_cues.planned_start_at IS '계획 시작 시각(선택) - 없으면 스케줄표는 순서 목록으로 강등';
COMMENT ON COLUMN public.session_cues.is_public IS '청중 스케줄표 노출 여부 - 신규 기본 true, 015 적용 시점 기존 행은 false 백필';
COMMENT ON COLUMN public.session_cues.public_title IS '청중용 표기 이름 (null이면 title)';

-- 기존 행 소급 공개 차단 (planned_start_at이 아직 없는 행 = 015 이전 생성분)
UPDATE public.session_cues SET is_public = false WHERE planned_start_at IS NULL;

-- 노출 게이트: anon 직접 SELECT 정책 제거 → sp_live_state_q 단일 경로
--   (공개 행이어도 내부 title·notice_text 컬럼 노출 방지. 프론트 직접 조회처 없음 확인됨)
DROP POLICY IF EXISTS "Anyone can view cues of public sessions" ON public.session_cues;

-- ────────────────────────────────────────────────────────────
-- 4. 참가자 토큰 (PRD §3.2 — 편의 식별자, 무결성 보장 수단 아님)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS participant_token TEXT;
CREATE INDEX IF NOT EXISTS idx_questions_participant_token
  ON public.questions(session_id, participant_token) WHERE participant_token IS NOT NULL;

COMMENT ON COLUMN public.questions.participant_token IS '비로그인 청중 식별 토큰 - 내 질문(검토 중) 표시용. 편의 식별자일 뿐 무결성 보장 아님';
-- poll_responses는 기존 anonymous_id 컬럼을 participant_token 값으로 사용 (컬럼 추가 없음)
-- UNIQUE(poll_id, anonymous_id)는 복수 선택 설문이 여러 행을 넣으므로 걸지 않는다 (RPC가 중복 검사)

-- 5. lecture_files 확장 (P1 대비 — 015 1회 원칙)
ALTER TABLE public.lecture_files ADD COLUMN IF NOT EXISTS allow_download BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.lecture_files ADD COLUMN IF NOT EXISTS pages_path TEXT;
COMMENT ON COLUMN public.lecture_files.pages_path IS '사전 변환 페이지 이미지 경로 prefix (P1 렌더 방식 결정, PRD §3.4)';

-- ────────────────────────────────────────────────────────────
-- 6. 버전 신호(rev) 트리거
-- ────────────────────────────────────────────────────────────
-- questions → qna_rev (likes_count 단독 변경은 제외: 좋아요 폭주가 전 청중 재조회를 유발하는 증폭 차단)
CREATE OR REPLACE FUNCTION public.bump_qna_rev()
RETURNS TRIGGER AS $$
DECLARE v_session_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(NEW) - 'likes_count' - 'updated_at' = to_jsonb(OLD) - 'likes_count' - 'updated_at' THEN
      RETURN NEW; -- likes_count(및 updated_at)만 바뀐 UPDATE는 rev 미증가
    END IF;
  END IF;
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE sessions SET qna_rev = qna_rev + 1 WHERE id = v_session_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bump_qna_rev ON public.questions;
CREATE TRIGGER trg_bump_qna_rev
  AFTER INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.bump_qna_rev();

-- session_cues → cues_rev
CREATE OR REPLACE FUNCTION public.bump_cues_rev()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions SET cues_rev = cues_rev + 1 WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bump_cues_rev ON public.session_cues;
CREATE TRIGGER trg_bump_cues_rev
  AFTER INSERT OR UPDATE OR DELETE ON public.session_cues
  FOR EACH ROW EXECUTE FUNCTION public.bump_cues_rev();

-- ────────────────────────────────────────────────────────────
-- 7. 송출 쓰기 경로 갱신 — 계측 시각·current_cue_id 정책 (PRD §5·§6)
-- ────────────────────────────────────────────────────────────
-- 7a. 큐 디스패처: current_cue_fired_at·broadcast_changed_at 기록
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
      max_page = GREATEST(1, COALESCE(v_cue.start_page, 1)),
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

-- 7b. 직접 모드 전환: idle 외 직접 송출은 current_cue_id 클리어 (§5 판정 규칙)
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
  IF p_mode NOT IN ('idle','pdf','qna','survey','notice') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_mode');
  END IF;

  IF p_mode = 'pdf' AND p_pdf_id IS NOT NULL THEN
    UPDATE sessions
    SET broadcast_mode = 'pdf',
        broadcast_pdf_id = p_pdf_id,
        broadcast_pdf_page = CASE WHEN broadcast_pdf_id IS DISTINCT FROM p_pdf_id THEN 1 ELSE broadcast_pdf_page END,
        current_cue_id = NULL,           -- 큐 미경유 직접 송출
        broadcast_changed_at = now()
    WHERE id = p_session_id;
  ELSIF p_mode = 'idle' THEN
    UPDATE sessions
    SET broadcast_mode = 'idle',
        broadcast_changed_at = now()     -- idle 전환 시 current_cue_id 유지 ("마지막 진행 항목")
    WHERE id = p_session_id;
  ELSE
    UPDATE sessions
    SET broadcast_mode = p_mode,
        current_cue_id = NULL,           -- 큐 미경유 직접 송출 (qna/notice 포함 — cue_type 동일 케이스 보정)
        broadcast_changed_at = now()
    WHERE id = p_session_id;
  END IF;

  RETURN json_build_object('success', true, 'mode', p_mode);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;

-- 7c. 페이지 이동: max_page 기록 + 계측 시각
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

  UPDATE sessions
  SET broadcast_pdf_page = v_page,
      max_page = GREATEST(COALESCE(max_page, 1), v_page),
      broadcast_changed_at = now()
  WHERE id = p_session_id;
  RETURN json_build_object('success', true, 'page', v_page);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;

-- 7d. 설문 토글 원자화 (PRD §6 — 활성화 시 mode='survey', 마감 시 idle 복귀까지 한 프로시저에서)
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
    -- 단수 활성 원칙 (013 디스패처와 정합): 다른 활성 설문은 닫는다
    UPDATE polls SET status = 'closed', ended_at = now()
      WHERE session_id = v_poll.session_id AND status = 'active' AND id <> p_poll_id;
    UPDATE polls SET status = 'active', started_at = COALESCE(started_at, now()), ended_at = NULL
      WHERE id = p_poll_id;
    -- 라이브 중이면 청중 장면 트리거까지 원자적으로 (broadcast_mode='survey')
    IF v_session.status = 'active' THEN
      UPDATE sessions SET
        broadcast_mode = 'survey',
        broadcast_notice = NULL,
        current_cue_id = NULL,          -- 큐 미경유 직접 송출
        broadcast_changed_at = now()
      WHERE id = v_poll.session_id;
    END IF;
  ELSE
    UPDATE polls SET
      status = p_status,
      started_at = CASE WHEN p_status = 'active' AND started_at IS NULL THEN now() ELSE started_at END,
      ended_at = CASE WHEN p_status = 'closed' THEN now() ELSE ended_at END
    WHERE id = p_poll_id;
    -- 마감/회수 시: survey 모드가 이 설문으로 켜져 있고 남은 활성 설문이 없으면 idle 복귀
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
GRANT EXECUTE ON FUNCTION public.sp_partner_poll_toggle_s(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 8. sp_live_state_q — 청중 원-앱 단일 폴링 신호 (PRD §6)
--    · ended 포함 (not_found와 구분)
--    · 개인화 필드 금지 (캐시 가능성 보존 — 불변 규칙)
--    · cues_public은 p_cues_rev 불일치 시에만 포함 (조건부 필드)
--    · survey 동안 show_results 설문의 집계를 인라인
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

  -- 종료 세션: 최소 응답 (클라이언트는 ended 수신 시 폴링 중단)
  IF v_session.status = 'ended' THEN
    RETURN json_build_object('success', true, 'status', 'ended');
  END IF;

  -- 현재 강연자료
  IF v_session.broadcast_mode = 'pdf' AND v_session.broadcast_pdf_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id, 'title', title, 'file_url', file_url, 'page_count', page_count,
      'page', v_session.broadcast_pdf_page, 'max_page', v_session.max_page,
      'allow_download', allow_download, 'pages_path', pages_path
    ) INTO v_pdf FROM lecture_files WHERE id = v_session.broadcast_pdf_id;
  END IF;

  -- 송출 중 질문 (qna 장면용)
  IF v_session.broadcast_mode = 'qna' THEN
    SELECT json_build_object(
      'id', q.id, 'content', q.content,
      'author_name', CASE WHEN q.is_anonymous THEN NULL ELSE q.author_name END,
      'is_anonymous', q.is_anonymous, 'likes_count', q.likes_count,
      'category_name', c.name, 'category_color', c.color
    ) INTO v_question
    FROM questions q LEFT JOIN qna_categories c ON q.category_id = c.id
    WHERE q.session_id = v_session.id AND q.is_broadcasting = true LIMIT 1;

    SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'color', color) ORDER BY display_order), '[]'::json)
    INTO v_categories
    FROM qna_categories WHERE session_id = v_session.id AND is_visible = true;
  END IF;

  -- 활성 설문 (단수 원칙)
  SELECT id INTO v_active_poll_id FROM polls
    WHERE session_id = v_session.id AND status = 'active'
    ORDER BY started_at DESC NULLS LAST LIMIT 1;

  -- survey 장면 동안 결과 공개 설문의 집계 인라인 ({total, counts:[{option_id, count}]})
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

  -- 공개 큐 목록: 클라이언트 rev와 불일치할 때만 전송 (내부 컬럼 미노출 — COALESCE 투영)
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
GRANT EXECUTE ON FUNCTION public.sp_live_state_q(TEXT, BIGINT) TO anon, authenticated;
COMMENT ON FUNCTION public.sp_live_state_q IS '청중 원-앱 단일 폴링 신호 (PRD §6) - 개인화 필드 금지(캐시 보존), cues_public은 rev 불일치 시에만';

-- ────────────────────────────────────────────────────────────
-- 9. sp_live_qna_q — 청중 Q&A 목록 단일 조회 (PRD §6)
--    · approved + answered(뱃지/접힘 그룹용) 반환
--    · p_token 소유 질문은 pending/rejected도 병합 ("검토 중" 표시)
--    · 내 좋아요 여부를 목록에 인라인 (N+1 check_question_liked 제거)
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
      (p_token IS NOT NULL AND EXISTS (
        SELECT 1 FROM question_likes ql WHERE ql.question_id = q.id AND ql.device_id = p_token
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
GRANT EXECUTE ON FUNCTION public.sp_live_qna_q(TEXT, TEXT, INTEGER) TO anon, authenticated;
COMMENT ON FUNCTION public.sp_live_qna_q IS '청중 Q&A 목록 - 본인(pending 포함) 병합 + 좋아요 인라인 (PRD §6)';
