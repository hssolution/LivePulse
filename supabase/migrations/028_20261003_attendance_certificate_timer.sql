-- =====================================================
-- 028 (2026-10-03) 출석 · 수료증 · 발표 타이머 (TSK-1245, K-011 5단계)
-- =====================================================
-- 목적: 세션 하나에서 출석 확인 → 수료증 발급 → 발표 타이머 송출까지 된다.
--
-- 추가만 한다(DROP TABLE·TRUNCATE·컬럼 삭제·이름 변경 없음):
--   새 테이블  session_attendance — 출석 한 사람 = 한 행. 이름(필수)·소속(선택)만 받는다. 전화·이메일 없음
--   새 컬럼    sessions.attendance_enabled / certificate_enabled / certificate_template / certificate_issuer
--              sessions.timer_duration_sec / timer_remaining_sec / timer_running / timer_ends_at / timer_warn_sec / timer_changed_at
--   새 함수    sp_live_attendance_q / sp_live_attendance_s / sp_live_certificate_s       (청중, anon)
--              sp_live_timer_q                                                          (송출·타이머 화면, anon)
--              sp_partner_attendance_q / sp_partner_session_attendance_s / sp_partner_timer_s (주최·진행)
--   바꾸는 함수 sp_partner_broadcast_mode_s — 허용 모드에 'timer' 하나만 더한다(나머지 본문은 운영 정의 그대로)
--
-- 개인정보: 출석은 이름·소속만. 브라우저가 만든 출석 전용 난수의 md5 를 attendee_key 로 저장해
--   같은 브라우저의 재출석을 한 행으로 묶는다(참가자 토큰·설문 키와 분리).
-- 타이머: 서버 시각 기준. 도는 중이면 timer_ends_at, 멈춰 있으면 timer_remaining_sec(초과면 음수)이 정본.
--   sessions 는 이미 realtime publication 에 있어 송출 화면이 그대로 받는다.
--
-- 되돌리기(필요할 때만, 사람 판단으로): 새 함수·테이블·컬럼은 남겨 둬도 기존 동작에 영향이 없다.
--   sp_partner_broadcast_mode_s 는 IN 목록에서 'timer' 만 빼서 다시 CREATE OR REPLACE 하면 원래대로다.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. 세션 쪽 새 컬럼
-- ---------------------------------------------------------------
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS attendance_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_template text    NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS certificate_issuer   text,
  ADD COLUMN IF NOT EXISTS timer_duration_sec   integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS timer_remaining_sec  integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS timer_running        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timer_ends_at        timestamptz,
  ADD COLUMN IF NOT EXISTS timer_warn_sec       integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS timer_changed_at     timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_certificate_template_check') THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_certificate_template_check
      CHECK (certificate_template IN ('classic', 'modern'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_certificate_issuer_len') THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_certificate_issuer_len
      CHECK (certificate_issuer IS NULL OR char_length(certificate_issuer) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_timer_range') THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_timer_range
      CHECK (timer_duration_sec BETWEEN 0 AND 86400
             AND timer_remaining_sec BETWEEN -86400 AND 86400
             AND timer_warn_sec BETWEEN 0 AND 3600);
  END IF;
END $$;

COMMENT ON COLUMN public.sessions.attendance_enabled IS '청중 화면에 출석 체크를 띄울지(기본 끔, 주최자가 켬) (028)';
COMMENT ON COLUMN public.sessions.certificate_enabled IS '끝난 뒤 출석자에게 수료증을 줄지(기본 끔) (028)';
COMMENT ON COLUMN public.sessions.certificate_template IS '수료증 템플릿 - classic: 기본, modern: 모던 (028)';
COMMENT ON COLUMN public.sessions.certificate_issuer IS '수료증 주최명(비면 주최 단체명) (028)';
COMMENT ON COLUMN public.sessions.timer_duration_sec IS '발표 타이머 설정 시간(초) — 리셋하면 이 값으로 (028)';
COMMENT ON COLUMN public.sessions.timer_remaining_sec IS '멈춰 있을 때 남은 초(초과면 음수). 도는 중엔 timer_ends_at 이 정본 (028)';
COMMENT ON COLUMN public.sessions.timer_running IS '발표 타이머가 도는 중인지 (028)';
COMMENT ON COLUMN public.sessions.timer_ends_at IS '도는 중일 때 0초가 되는 서버 시각 (028)';
COMMENT ON COLUMN public.sessions.timer_warn_sec IS '남은 시간이 이 초 이하면 경고색 (028)';
COMMENT ON COLUMN public.sessions.timer_changed_at IS '타이머를 마지막으로 조작한 시각 (028)';

-- ---------------------------------------------------------------
-- 2. 출석
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  attendee_key          text NOT NULL CHECK (char_length(attendee_key) = 32),
  name                  text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
  affiliation           text CHECK (affiliation IS NULL OR char_length(affiliation) <= 100),
  checked_in_at         timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  certificate_issued_at timestamptz,
  CONSTRAINT session_attendance_once UNIQUE (session_id, attendee_key)
);
CREATE INDEX IF NOT EXISTS session_attendance_session_idx
  ON public.session_attendance (session_id, checked_in_at);
COMMENT ON TABLE public.session_attendance IS '세션 출석 — 이름(필수)·소속(선택)만. attendee_key 는 브라우저 출석 전용 난수의 md5 (028)';

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_attendance_select_manager ON public.session_attendance;
CREATE POLICY session_attendance_select_manager ON public.session_attendance
  FOR SELECT TO authenticated
  USING (public.fn_can_manage_session(session_id));
-- 쓰기 정책 없음 — sp_live_attendance_s / sp_live_certificate_s 로만 들어온다

REVOKE ALL ON TABLE public.session_attendance FROM anon, authenticated;
GRANT SELECT ON TABLE public.session_attendance TO authenticated;
GRANT ALL ON TABLE public.session_attendance TO service_role;

-- 수료증 주최명 기본값: 세션 소유 파트너의 단체명 → 대표자명
CREATE OR REPLACE FUNCTION public.fn_session_issuer_name(p_session_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
           NULLIF(btrim(s.certificate_issuer), ''),
           (SELECT NULLIF(btrim(o.company_name), '') FROM public.partner_organizers o WHERE o.partner_id = s.partner_id LIMIT 1),
           (SELECT NULLIF(btrim(a.company_name), '') FROM public.partner_agencies a WHERE a.partner_id = s.partner_id LIMIT 1),
           (SELECT NULLIF(btrim(p.representative_name), '') FROM public.partners p WHERE p.id = s.partner_id),
           'LivePulse')
    FROM public.sessions s WHERE s.id = p_session_id;
$$;
REVOKE ALL ON FUNCTION public.fn_session_issuer_name(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_session_issuer_name(uuid) TO service_role;

-- 2-1. 청중: 내 출석·수료증 상태
CREATE OR REPLACE FUNCTION public.sp_live_attendance_q(p_code text, p_key text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s public.sessions%ROWTYPE;
  v_a public.session_attendance%ROWTYPE;
BEGIN
  SELECT * INTO v_s FROM public.sessions WHERE code = upper(btrim(p_code));
  IF NOT FOUND OR v_s.status NOT IN ('published', 'active', 'ended') THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;
  IF p_key IS NOT NULL AND char_length(p_key) BETWEEN 16 AND 100 THEN
    SELECT * INTO v_a FROM public.session_attendance
     WHERE session_id = v_s.id AND attendee_key = md5(p_key);
  END IF;
  RETURN json_build_object(
    'success', true,
    'status', v_s.status,
    'attendance_enabled', v_s.attendance_enabled,
    'certificate_enabled', v_s.certificate_enabled,
    'checked_in', v_a.id IS NOT NULL,
    'name', v_a.name,
    'affiliation', v_a.affiliation,
    'checked_in_at', v_a.checked_in_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_live_attendance_q(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_live_attendance_q(text, text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_live_attendance_q(text, text) IS '청중 출석·수료증 상태 — 출석 켜짐 여부와 이 브라우저의 출석 기록 (028)';

-- 2-2. 청중: 출석 체크(같은 브라우저면 이름·소속 고치기)
CREATE OR REPLACE FUNCTION public.sp_live_attendance_s(
  p_code        text,
  p_key         text,
  p_name        text,
  p_affiliation text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s    public.sessions%ROWTYPE;
  v_name text := btrim(COALESCE(p_name, ''));
  v_aff  text := NULLIF(btrim(COALESCE(p_affiliation, '')), '');
  v_row  public.session_attendance%ROWTYPE;
BEGIN
  IF char_length(v_name) < 1 OR char_length(v_name) > 50 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_name');
  END IF;
  IF v_aff IS NOT NULL AND char_length(v_aff) > 100 THEN
    v_aff := left(v_aff, 100);
  END IF;
  IF p_key IS NULL OR char_length(p_key) < 16 OR char_length(p_key) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_key');
  END IF;

  SELECT * INTO v_s FROM public.sessions WHERE code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;
  IF NOT v_s.attendance_enabled THEN
    RETURN json_build_object('success', false, 'error', 'attendance_disabled');
  END IF;
  IF v_s.status NOT IN ('published', 'active') THEN
    RETURN json_build_object('success', false, 'error', 'session_not_open');
  END IF;
  -- 무한 행 생성 방지(정원과 무관한 넉넉한 상한)
  IF NOT EXISTS (SELECT 1 FROM public.session_attendance WHERE session_id = v_s.id AND attendee_key = md5(p_key))
     AND (SELECT count(*) FROM public.session_attendance WHERE session_id = v_s.id) >= GREATEST(v_s.max_participants * 2, 5000) THEN
    RETURN json_build_object('success', false, 'error', 'attendance_full');
  END IF;

  INSERT INTO public.session_attendance (session_id, attendee_key, name, affiliation)
  VALUES (v_s.id, md5(p_key), v_name, v_aff)
  ON CONFLICT ON CONSTRAINT session_attendance_once
  DO UPDATE SET name = EXCLUDED.name, affiliation = EXCLUDED.affiliation, updated_at = now()
  RETURNING * INTO v_row;

  RETURN json_build_object('success', true, 'name', v_row.name, 'affiliation', v_row.affiliation,
                           'checked_in_at', v_row.checked_in_at);
END;
$$;
REVOKE ALL ON FUNCTION public.sp_live_attendance_s(text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_live_attendance_s(text, text, text, text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_live_attendance_s(text, text, text, text) IS '청중 출석 체크 — 출석 켜짐·게시/진행 중 세션만, 같은 브라우저는 한 행 (028)';

-- 2-3. 청중: 수료증 발급(끝난 세션·수료증 켜짐·출석한 사람만). 첫 발급 시각을 남긴다
CREATE OR REPLACE FUNCTION public.sp_live_certificate_s(p_code text, p_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s public.sessions%ROWTYPE;
  v_a public.session_attendance%ROWTYPE;
BEGIN
  IF p_key IS NULL OR char_length(p_key) < 16 OR char_length(p_key) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_key');
  END IF;
  SELECT * INTO v_s FROM public.sessions WHERE code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;
  IF NOT v_s.certificate_enabled THEN
    RETURN json_build_object('success', false, 'error', 'certificate_disabled');
  END IF;
  IF v_s.status <> 'ended' THEN
    RETURN json_build_object('success', false, 'error', 'session_not_ended');
  END IF;

  UPDATE public.session_attendance
     SET certificate_issued_at = COALESCE(certificate_issued_at, now())
   WHERE session_id = v_s.id AND attendee_key = md5(p_key)
  RETURNING * INTO v_a;
  IF v_a.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_attended');
  END IF;

  RETURN json_build_object(
    'success', true,
    'name', v_a.name,
    'affiliation', v_a.affiliation,
    'title', v_s.title,
    'start_at', v_s.start_at,
    'end_at', v_s.end_at,
    'venue_name', v_s.venue_name,
    'issuer', public.fn_session_issuer_name(v_s.id),
    'template', v_s.certificate_template,
    'certificate_no', 'LP-' || v_s.code || '-' || upper(substr(replace(v_a.id::text, '-', ''), 1, 6)),
    'issued_at', v_a.certificate_issued_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_live_certificate_s(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_live_certificate_s(text, text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_live_certificate_s(text, text) IS '청중 수료증 데이터 — 끝난 세션·수료증 켜짐·출석자만, 첫 발급 시각 기록 (028)';

-- 2-4. 주최: 출석 명단 + 설정
CREATE OR REPLACE FUNCTION public.sp_partner_attendance_q(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s    public.sessions%ROWTYPE;
  v_rows json;
  v_cnt  integer;
  v_iss  integer;
BEGIN
  IF NOT public.fn_can_manage_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_s FROM public.sessions WHERE id = p_session_id;

  SELECT COALESCE(json_agg(json_build_object(
           'id', a.id, 'name', a.name, 'affiliation', a.affiliation,
           'checked_in_at', a.checked_in_at, 'certificate_issued_at', a.certificate_issued_at
         ) ORDER BY a.checked_in_at), '[]'::json),
         count(*)::int,
         count(a.certificate_issued_at)::int
    INTO v_rows, v_cnt, v_iss
    FROM public.session_attendance a
   WHERE a.session_id = p_session_id;

  RETURN json_build_object(
    'success', true,
    'status', v_s.status,
    'attendance_enabled', v_s.attendance_enabled,
    'certificate_enabled', v_s.certificate_enabled,
    'certificate_template', v_s.certificate_template,
    'certificate_issuer', v_s.certificate_issuer,
    'default_issuer', public.fn_session_issuer_name(p_session_id),
    'count', v_cnt,
    'issued_count', v_iss,
    'rows', v_rows
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_partner_attendance_q(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_partner_attendance_q(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.sp_partner_attendance_q(uuid) IS '주최 출석 명단·인원·수료증 발급 수·설정 (028)';

-- 2-5. 주최: 출석·수료증 설정(NULL 인자는 그대로 둔다. 주최명 ''는 비우기)
CREATE OR REPLACE FUNCTION public.sp_partner_session_attendance_s(
  p_session_id           uuid,
  p_attendance_enabled   boolean DEFAULT NULL,
  p_certificate_enabled  boolean DEFAULT NULL,
  p_certificate_template text    DEFAULT NULL,
  p_certificate_issuer   text    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s public.sessions%ROWTYPE;
BEGIN
  IF NOT public.fn_can_manage_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_certificate_template IS NOT NULL AND p_certificate_template NOT IN ('classic', 'modern') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_template');
  END IF;

  UPDATE public.sessions SET
    attendance_enabled   = COALESCE(p_attendance_enabled, attendance_enabled),
    certificate_enabled  = COALESCE(p_certificate_enabled, certificate_enabled),
    certificate_template = COALESCE(p_certificate_template, certificate_template),
    certificate_issuer   = CASE WHEN p_certificate_issuer IS NULL THEN certificate_issuer
                                ELSE NULLIF(left(btrim(p_certificate_issuer), 100), '') END
  WHERE id = p_session_id
  RETURNING * INTO v_s;

  RETURN json_build_object(
    'success', true,
    'attendance_enabled', v_s.attendance_enabled,
    'certificate_enabled', v_s.certificate_enabled,
    'certificate_template', v_s.certificate_template,
    'certificate_issuer', v_s.certificate_issuer,
    'default_issuer', public.fn_session_issuer_name(p_session_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_partner_session_attendance_s(uuid, boolean, boolean, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_partner_session_attendance_s(uuid, boolean, boolean, text, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.sp_partner_session_attendance_s(uuid, boolean, boolean, text, text) IS '주최 출석·수료증 설정 (028)';

-- ---------------------------------------------------------------
-- 3. 발표 타이머
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_session_timer_json(v_s public.sessions)
RETURNS json
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT json_build_object(
    'duration_sec', v_s.timer_duration_sec,
    'remaining_sec', v_s.timer_remaining_sec,
    'running', v_s.timer_running,
    'ends_at', v_s.timer_ends_at,
    'warn_sec', v_s.timer_warn_sec,
    'changed_at', v_s.timer_changed_at
  );
$$;
REVOKE ALL ON FUNCTION public.fn_session_timer_json(public.sessions) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_session_timer_json(public.sessions) TO service_role;

-- 3-1. 송출·타이머 화면: 타이머 상태 + 서버 시각(화면 시계 보정용)
CREATE OR REPLACE FUNCTION public.sp_live_timer_q(p_code text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s public.sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_s FROM public.sessions WHERE code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;
  RETURN json_build_object(
    'success', true,
    'session_id', v_s.id,
    'title', v_s.title,
    'broadcast_mode', v_s.broadcast_mode,
    'timer', public.fn_session_timer_json(v_s),
    'server_now', clock_timestamp()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_live_timer_q(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_live_timer_q(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_live_timer_q(text) IS '발표 타이머 상태 + 서버 시각 (028)';

-- 3-2. 진행: 타이머 조작
--   start / pause / reset / set(p_seconds=설정 시간) / add(p_seconds=±초) / warn(p_seconds=경고 기준)
CREATE OR REPLACE FUNCTION public.sp_partner_timer_s(
  p_session_id uuid,
  p_action     text,
  p_seconds    integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_s   public.sessions%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_rem integer;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_s FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- 지금 남은 초(도는 중이면 종료 시각 기준, 올림)
  v_rem := CASE WHEN v_s.timer_running AND v_s.timer_ends_at IS NOT NULL
                THEN ceil(extract(epoch FROM (v_s.timer_ends_at - v_now)))::int
                ELSE v_s.timer_remaining_sec END;
  v_rem := GREATEST(-86400, LEAST(86400, v_rem));

  IF p_action = 'start' THEN
    IF NOT v_s.timer_running THEN
      UPDATE public.sessions SET timer_running = true,
             timer_ends_at = v_now + make_interval(secs => v_rem),
             timer_remaining_sec = v_rem, timer_changed_at = v_now
       WHERE id = p_session_id;
    END IF;
  ELSIF p_action = 'pause' THEN
    UPDATE public.sessions SET timer_running = false, timer_ends_at = NULL,
           timer_remaining_sec = v_rem, timer_changed_at = v_now
     WHERE id = p_session_id;
  ELSIF p_action = 'reset' THEN
    UPDATE public.sessions SET timer_running = false, timer_ends_at = NULL,
           timer_remaining_sec = timer_duration_sec, timer_changed_at = v_now
     WHERE id = p_session_id;
  ELSIF p_action = 'set' THEN
    IF p_seconds IS NULL OR p_seconds < 0 OR p_seconds > 86400 THEN
      RETURN json_build_object('success', false, 'error', 'invalid_seconds');
    END IF;
    UPDATE public.sessions SET timer_duration_sec = p_seconds, timer_remaining_sec = p_seconds,
           timer_running = false, timer_ends_at = NULL, timer_changed_at = v_now
     WHERE id = p_session_id;
  ELSIF p_action = 'add' THEN
    IF p_seconds IS NULL OR abs(p_seconds) > 86400 THEN
      RETURN json_build_object('success', false, 'error', 'invalid_seconds');
    END IF;
    v_rem := GREATEST(-86400, LEAST(86400, v_rem + p_seconds));
    UPDATE public.sessions SET timer_remaining_sec = v_rem,
           timer_ends_at = CASE WHEN timer_running THEN v_now + make_interval(secs => v_rem) ELSE NULL END,
           timer_changed_at = v_now
     WHERE id = p_session_id;
  ELSIF p_action = 'warn' THEN
    IF p_seconds IS NULL OR p_seconds < 0 OR p_seconds > 3600 THEN
      RETURN json_build_object('success', false, 'error', 'invalid_seconds');
    END IF;
    UPDATE public.sessions SET timer_warn_sec = p_seconds, timer_changed_at = v_now
     WHERE id = p_session_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'invalid_action');
  END IF;

  SELECT * INTO v_s FROM public.sessions WHERE id = p_session_id;
  RETURN json_build_object('success', true, 'timer', public.fn_session_timer_json(v_s), 'server_now', clock_timestamp());
END;
$$;
REVOKE ALL ON FUNCTION public.sp_partner_timer_s(uuid, text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_partner_timer_s(uuid, text, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.sp_partner_timer_s(uuid, text, integer) IS '발표 타이머 조작 — start/pause/reset/set/add/warn, 진행 권한자만 (028)';

-- 3-3. 송출 모드에 'timer' 추가 — 본문은 운영 정의(supabase/schema/04_functions.sql) 그대로, IN 목록만 다르다
CREATE OR REPLACE FUNCTION public.sp_partner_broadcast_mode_s(p_session_id uuid, p_mode text, p_pdf_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_mode NOT IN ('idle','pdf','qna','survey','notice','timer') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_mode');
  END IF;

  IF p_mode = 'pdf' AND p_pdf_id IS NOT NULL THEN
    UPDATE sessions
    SET broadcast_mode = 'pdf',
        broadcast_pdf_id = p_pdf_id,
        broadcast_pdf_page = CASE WHEN broadcast_pdf_id IS DISTINCT FROM p_pdf_id THEN 1 ELSE broadcast_pdf_page END,
        current_cue_id = NULL,
        broadcast_changed_at = now()
    WHERE id = p_session_id;
  ELSIF p_mode = 'idle' THEN
    UPDATE sessions
    SET broadcast_mode = 'idle',
        broadcast_changed_at = now()
    WHERE id = p_session_id;
  ELSE
    UPDATE sessions
    SET broadcast_mode = p_mode,
        current_cue_id = NULL,
        broadcast_changed_at = now()
    WHERE id = p_session_id;
  END IF;

  RETURN json_build_object('success', true, 'mode', p_mode);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

COMMENT ON COLUMN public.sessions.broadcast_mode IS '현재 송출 모드 - idle: 대기, pdf: 강연자료, qna: 질문, survey: 설문, notice: 안내, timer: 발표 타이머';

COMMIT;
