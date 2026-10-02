-- =====================================================
-- 026 (2026-10-02) 강사 독립 프로필 · 행사 끝 만족도 설문 · 강사별 평점 (TSK-1245, K-011 4단계)
-- =====================================================
-- 목적: 강사가 행사(세션)에 묶이지 않고 한 프로필로 여러 행사에 걸쳐 평판을 쌓는다.
--
-- 추가만 한다(DROP·TRUNCATE·컬럼 삭제·이름 변경 없음):
--   새 테이블  instructor_profiles  — 강사 한 사람 = 한 행
--              session_feedback     — 세션 만족도 응답(1~5점 + 한 줄 의견). 이름·연락처·참가자 토큰을 저장하지 않는다
--   새 컬럼    session_presenters.instructor_profile_id — 세션별 발표자 행을 프로필에 잇는다(NULL 허용)
--              sessions.survey_enabled (기본 true)       — 주최자가 끌 수 있는 «끝나면 설문» 스위치
--   새 트리거  zz_session_presenters_link_profile — 발표자 행이 생기거나 사람이 바뀌면 프로필을 찾아 잇고, 없으면 만든다
--   새 함수    sp_live_feedback_s / sp_instructor_profile_q / sp_partner_session_survey_s / sp_partner_session_feedback_q
--
-- 같은 사람 판정(기존 행 연결에도 같은 규칙):
--   partner 발표자 → partners.id(같은 파트너 = 같은 사람, 그 파트너 계정 = user_id)
--   member  발표자 → user_id(같은 계정 = 같은 사람)
--   manual  발표자 → 같은 주최자(세션 소유 파트너의 계정)가 등록한 같은 이름(앞뒤 공백·대소문자 무시)
--                   주최자가 다르면 이름이 같아도 다른 사람으로 본다(동명이인을 섞지 않는다).
--
-- 기존 행: session_presenters 의 새 컬럼만 채운다(다른 컬럼·updated_at 은 그대로 둔다). 지우는 행 없음.
--
-- 되돌리기(필요할 때만, 사람 판단으로):
--   DROP TRIGGER zz_session_presenters_link_profile ON public.session_presenters;
--   그 뒤 새 함수·테이블·컬럼은 남겨 둬도 기존 동작에 영향이 없다(프런트는 새 컬럼·함수가 없어도 기존 화면이 돈다).
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. 강사 프로필
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instructor_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  partner_id   uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100),
  title        text CHECK (title IS NULL OR char_length(title) <= 200),
  bio          text CHECK (bio IS NULL OR char_length(bio) <= 5000),
  image_url    text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_public    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.instructor_profiles IS '강사 독립 프로필 — 세션과 무관하게 한 사람 = 한 행. session_presenters.instructor_profile_id 로 세션에 연결 (026)';
COMMENT ON COLUMN public.instructor_profiles.user_id IS '강사 본인 계정(있으면). 본인만 수정';
COMMENT ON COLUMN public.instructor_profiles.partner_id IS '강사 파트너(있으면)';
COMMENT ON COLUMN public.instructor_profiles.created_by IS '만든 사람 — 계정 없는 강사(수기 등록)는 그 주최자 계정이 관리';

CREATE UNIQUE INDEX IF NOT EXISTS instructor_profiles_user_uq
  ON public.instructor_profiles (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS instructor_profiles_partner_uq
  ON public.instructor_profiles (partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS instructor_profiles_manual_idx
  ON public.instructor_profiles (created_by, lower(btrim(display_name)))
  WHERE user_id IS NULL AND partner_id IS NULL;

DROP TRIGGER IF EXISTS set_instructor_profiles_updated_at ON public.instructor_profiles;
CREATE TRIGGER set_instructor_profiles_updated_at BEFORE UPDATE ON public.instructor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------
-- 2. 세션 쪽 새 컬럼
-- ---------------------------------------------------------------
ALTER TABLE public.session_presenters
  ADD COLUMN IF NOT EXISTS instructor_profile_id uuid REFERENCES public.instructor_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS session_presenters_instructor_profile_idx
  ON public.session_presenters (instructor_profile_id) WHERE instructor_profile_id IS NOT NULL;
COMMENT ON COLUMN public.session_presenters.instructor_profile_id IS '이 발표자의 강사 프로필(026). 비면 트리거가 찾아 잇는다';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS survey_enabled boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.sessions.survey_enabled IS '세션이 끝나면 청중에게 만족도 설문을 띄울지(기본 켬, 주최자가 끔) (026)';

-- ---------------------------------------------------------------
-- 3. 만족도 응답 — 개인정보 없음
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  respondent_key text NOT NULL CHECK (char_length(respondent_key) = 32),
  rating         smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text CHECK (comment IS NULL OR char_length(comment) <= 200),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_feedback_once UNIQUE (session_id, respondent_key)
);
COMMENT ON TABLE public.session_feedback IS '세션 끝 만족도 응답(1~5점 + 한 줄). 이름·연락처·참가자 토큰 없음 — respondent_key 는 브라우저가 만든 설문 전용 난수의 md5(중복 응답 방지용) (026)';

-- ---------------------------------------------------------------
-- 4. 발표자 → 프로필 자동 연결 트리거
--    이름이 zz_ 로 시작 — 같은 BEFORE 트리거인 set_session_presenters_updated_at 뒤에 돈다.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_session_presenter_link_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_owner    uuid;          -- 세션 소유 파트너의 계정
  v_p        public.instructor_profiles%ROWTYPE;
  v_pid      uuid;
  v_name     text;
  v_partner  RECORD;
  v_user     RECORD;
BEGIN
  -- 기존 행 연결(마이그레이션) 중에는 updated_at 을 건드리지 않는다
  IF TG_OP = 'UPDATE' AND current_setting('livepulse.backfill', true) = 'on' THEN
    NEW.updated_at := OLD.updated_at;
  END IF;

  -- 같은 프로필을 유지한 채 사람(유형·파트너·계정·이름)이 바뀌면 연결을 풀고 다시 찾는다
  IF TG_OP = 'UPDATE'
     AND NEW.instructor_profile_id IS NOT NULL
     AND NEW.instructor_profile_id IS NOT DISTINCT FROM OLD.instructor_profile_id
     AND (NEW.presenter_type IS DISTINCT FROM OLD.presenter_type
          OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
          OR NEW.user_id IS DISTINCT FROM OLD.user_id
          OR lower(btrim(COALESCE(NEW.manual_name, ''))) IS DISTINCT FROM lower(btrim(COALESCE(OLD.manual_name, '')))) THEN
    NEW.instructor_profile_id := NULL;
  END IF;

  SELECT pt.profile_id INTO v_owner
    FROM public.sessions s JOIN public.partners pt ON pt.id = s.partner_id
   WHERE s.id = NEW.session_id;

  -- (가) 직접 지정 — 지정해도 되는 프로필인지 확인
  IF NEW.instructor_profile_id IS NOT NULL THEN
    IF TG_OP = 'UPDATE' AND NEW.instructor_profile_id IS NOT DISTINCT FROM OLD.instructor_profile_id THEN
      RETURN NEW;
    END IF;
    IF v_uid IS NULL THEN
      RETURN NEW;  -- 서비스 롤·마이그레이션
    END IF;
    SELECT * INTO v_p FROM public.instructor_profiles WHERE id = NEW.instructor_profile_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'instructor_profile_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_p.user_id = v_uid
       OR v_p.created_by = v_uid
       OR (v_p.partner_id IS NOT NULL AND v_p.partner_id = NEW.partner_id)
       OR (v_p.user_id IS NOT NULL AND v_p.user_id = NEW.user_id)
       OR (v_p.user_id IS NULL AND v_p.partner_id IS NULL AND v_p.created_by = v_owner)
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND user_role = 'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'instructor_profile_forbidden' USING ERRCODE = '42501';
  END IF;

  -- (나) 자동 연결
  IF NEW.presenter_type = 'partner' AND NEW.partner_id IS NOT NULL THEN
    SELECT id INTO v_pid FROM public.instructor_profiles WHERE partner_id = NEW.partner_id;
    IF v_pid IS NULL THEN
      SELECT p.id, p.profile_id, p.representative_name,
             pi.display_name AS pi_name, pi.specialty, pi.bio, pi.profile_image_url
        INTO v_partner
        FROM public.partners p
        LEFT JOIN public.partner_instructors pi ON pi.partner_id = p.id
       WHERE p.id = NEW.partner_id
       LIMIT 1;
      IF FOUND THEN
        -- 같은 계정으로 이미 프로필이 있으면(멤버로 먼저 올라온 경우) 그 프로필에 파트너를 붙인다
        SELECT id INTO v_pid FROM public.instructor_profiles WHERE user_id = v_partner.profile_id;
        IF v_pid IS NOT NULL THEN
          UPDATE public.instructor_profiles SET partner_id = NEW.partner_id
           WHERE id = v_pid AND partner_id IS NULL;
        ELSE
          INSERT INTO public.instructor_profiles (user_id, partner_id, display_name, title, bio, image_url, created_by)
          VALUES (v_partner.profile_id, v_partner.id,
                  left(COALESCE(NULLIF(btrim(v_partner.pi_name), ''), NULLIF(btrim(NEW.display_name), ''),
                                NULLIF(btrim(v_partner.representative_name), ''), '강사'), 100),
                  left(COALESCE(NULLIF(btrim(NEW.display_title), ''), v_partner.specialty), 200),
                  v_partner.bio, v_partner.profile_image_url, v_partner.profile_id)
          ON CONFLICT DO NOTHING
          RETURNING id INTO v_pid;
          IF v_pid IS NULL THEN
            SELECT id INTO v_pid FROM public.instructor_profiles
             WHERE partner_id = NEW.partner_id OR user_id = v_partner.profile_id LIMIT 1;
          END IF;
        END IF;
      END IF;
    END IF;

  ELSIF NEW.presenter_type = 'member' AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO v_pid FROM public.instructor_profiles WHERE user_id = NEW.user_id;
    IF v_pid IS NULL THEN
      SELECT id, display_name INTO v_user FROM public.profiles WHERE id = NEW.user_id;
      IF FOUND THEN
        INSERT INTO public.instructor_profiles (user_id, display_name, title, created_by)
        VALUES (NEW.user_id,
                left(COALESCE(NULLIF(btrim(NEW.display_name), ''), NULLIF(btrim(v_user.display_name), ''), '강사'), 100),
                left(NULLIF(btrim(NEW.display_title), ''), 200),
                NEW.user_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_pid;
        IF v_pid IS NULL THEN
          SELECT id INTO v_pid FROM public.instructor_profiles WHERE user_id = NEW.user_id;
        END IF;
      END IF;
    END IF;

  ELSE
    v_name := NULLIF(btrim(COALESCE(NEW.manual_name, NEW.display_name, '')), '');
    IF v_name IS NOT NULL AND v_owner IS NOT NULL THEN
      SELECT id INTO v_pid FROM public.instructor_profiles
       WHERE user_id IS NULL AND partner_id IS NULL
         AND created_by = v_owner
         AND lower(btrim(display_name)) = lower(v_name)
       ORDER BY created_at
       LIMIT 1;
      IF v_pid IS NULL THEN
        INSERT INTO public.instructor_profiles (display_name, title, bio, image_url, created_by)
        VALUES (left(v_name, 100),
                left(NULLIF(btrim(COALESCE(NEW.manual_title, NEW.display_title, '')), ''), 200),
                left(NEW.manual_bio, 5000), NEW.manual_image, v_owner)
        RETURNING id INTO v_pid;
      END IF;
    END IF;
  END IF;

  NEW.instructor_profile_id := v_pid;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_session_presenter_link_profile() FROM public, anon, authenticated;
COMMENT ON FUNCTION public.fn_session_presenter_link_profile() IS '발표자 행 → 강사 프로필 자동 연결·직접 지정 권한 확인 (026)';

DROP TRIGGER IF EXISTS zz_session_presenters_link_profile ON public.session_presenters;
CREATE TRIGGER zz_session_presenters_link_profile
  BEFORE INSERT OR UPDATE OF instructor_profile_id, presenter_type, partner_id, user_id, manual_name
  ON public.session_presenters
  FOR EACH ROW EXECUTE FUNCTION public.fn_session_presenter_link_profile();

-- ---------------------------------------------------------------
-- 5. 함수
-- ---------------------------------------------------------------

-- 5-1. 청중: 만족도 응답 저장 (끝난 세션 + 설문 켜짐일 때만, 브라우저당 1번)
CREATE OR REPLACE FUNCTION public.sp_live_feedback_s(
  p_code    text,
  p_key     text,
  p_rating  integer,
  p_comment text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session RECORD;
  v_comment text := NULLIF(btrim(COALESCE(p_comment, '')), '');
  v_id      uuid;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_rating');
  END IF;
  IF p_key IS NULL OR char_length(p_key) < 16 OR char_length(p_key) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_key');
  END IF;
  IF v_comment IS NOT NULL AND char_length(v_comment) > 200 THEN
    v_comment := left(v_comment, 200);
  END IF;

  SELECT id, status, survey_enabled INTO v_session
    FROM public.sessions WHERE code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;
  IF v_session.status <> 'ended' THEN
    RETURN json_build_object('success', false, 'error', 'session_not_ended');
  END IF;
  IF NOT v_session.survey_enabled THEN
    RETURN json_build_object('success', false, 'error', 'survey_disabled');
  END IF;

  INSERT INTO public.session_feedback (session_id, respondent_key, rating, comment)
  VALUES (v_session.id, md5(p_key), p_rating, v_comment)
  ON CONFLICT ON CONSTRAINT session_feedback_once DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_submitted');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.sp_live_feedback_s(text, text, integer, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_live_feedback_s(text, text, integer, text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_live_feedback_s(text, text, integer, text) IS '청중 만족도 응답 저장 — 끝난 세션·설문 켜짐·브라우저당 1회 (026)';

-- 5-2. 공개: 강사 프로필 + 누적 평점 (공개 프로필 또는 본인·관리 주최자)
CREATE OR REPLACE FUNCTION public.sp_instructor_profile_q(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p   public.instructor_profiles%ROWTYPE;
  v_sessions json;
  v_avg numeric;
  v_cnt integer;
  v_scnt integer;
BEGIN
  SELECT * INTO v_p FROM public.instructor_profiles WHERE id = p_profile_id;
  IF NOT FOUND OR NOT (v_p.is_public OR v_p.user_id = v_uid OR v_p.created_by = v_uid) THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  WITH ss AS (
    SELECT DISTINCT s.id, s.title, s.start_at, s.status
      FROM public.session_presenters sp
      JOIN public.sessions s ON s.id = sp.session_id
     WHERE sp.instructor_profile_id = v_p.id
       AND s.status IN ('published', 'active', 'ended')
  ), agg AS (
    SELECT ss.*, f.avg_rating, COALESCE(f.cnt, 0) AS cnt
      FROM ss
      LEFT JOIN LATERAL (
        SELECT round(avg(rating)::numeric, 2) AS avg_rating, count(*)::int AS cnt
          FROM public.session_feedback WHERE session_id = ss.id
      ) f ON true
  )
  SELECT COALESCE(json_agg(json_build_object(
           'title', title, 'start_at', start_at, 'status', status,
           'avg_rating', avg_rating, 'response_count', cnt
         ) ORDER BY start_at DESC), '[]'::json),
         count(*)::int
    INTO v_sessions, v_scnt
    FROM agg;

  SELECT round(avg(f.rating)::numeric, 2), count(*)::int INTO v_avg, v_cnt
    FROM public.session_feedback f
   WHERE f.session_id IN (
     SELECT DISTINCT sp.session_id FROM public.session_presenters sp
       JOIN public.sessions s ON s.id = sp.session_id
      WHERE sp.instructor_profile_id = v_p.id AND s.status IN ('published', 'active', 'ended'));

  RETURN json_build_object(
    'success', true,
    'profile', json_build_object(
      'id', v_p.id, 'display_name', v_p.display_name, 'title', v_p.title,
      'bio', v_p.bio, 'image_url', v_p.image_url, 'created_at', v_p.created_at,
      'is_mine', (v_uid IS NOT NULL AND (v_p.user_id = v_uid OR (v_p.user_id IS NULL AND v_p.created_by = v_uid)))
    ),
    'rating', json_build_object('avg', v_avg, 'count', COALESCE(v_cnt, 0)),
    'session_count', COALESCE(v_scnt, 0),
    'sessions', v_sessions
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_instructor_profile_q(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_instructor_profile_q(uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_instructor_profile_q(uuid) IS '강사 프로필 공개 조회 — 누적 평균·응답 수·세션별 평점(의견 본문은 주지 않음) (026)';

-- 세션 관리 권한(소유 주최자·수락한 협업 파트너·관리자)
CREATE OR REPLACE FUNCTION public.fn_can_manage_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.sessions s JOIN public.partners p ON p.id = s.partner_id
             WHERE s.id = p_session_id AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.session_partners sp JOIN public.partners p ON p.id = sp.partner_id
                WHERE sp.session_id = p_session_id AND sp.status = 'accepted' AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public.fn_can_manage_session(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_manage_session(uuid) TO authenticated, service_role;

-- 5-3. 주최자: 설문 켜기/끄기
CREATE OR REPLACE FUNCTION public.sp_partner_session_survey_s(p_session_id uuid, p_enabled boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.fn_can_manage_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  UPDATE public.sessions SET survey_enabled = COALESCE(p_enabled, true) WHERE id = p_session_id;
  RETURN json_build_object('success', true, 'survey_enabled', COALESCE(p_enabled, true));
END;
$$;
REVOKE ALL ON FUNCTION public.sp_partner_session_survey_s(uuid, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_partner_session_survey_s(uuid, boolean) TO authenticated, service_role;

-- 5-4. 주최자: 세션 만족도 결과(평균·분포·의견)
CREATE OR REPLACE FUNCTION public.sp_partner_session_feedback_q(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  IF NOT public.fn_can_manage_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT survey_enabled INTO v_enabled FROM public.sessions WHERE id = p_session_id;
  RETURN json_build_object(
    'success', true,
    'survey_enabled', v_enabled,
    'avg', (SELECT round(avg(rating)::numeric, 2) FROM public.session_feedback WHERE session_id = p_session_id),
    'count', (SELECT count(*)::int FROM public.session_feedback WHERE session_id = p_session_id),
    'distribution', (SELECT json_object_agg(r, (SELECT count(*) FROM public.session_feedback f
                                                 WHERE f.session_id = p_session_id AND f.rating = r))
                       FROM generate_series(1, 5) r),
    'comments', (SELECT COALESCE(json_agg(json_build_object('rating', rating, 'comment', comment, 'created_at', created_at)
                                          ORDER BY created_at DESC), '[]'::json)
                   FROM (SELECT rating, comment, created_at FROM public.session_feedback
                          WHERE session_id = p_session_id AND comment IS NOT NULL
                          ORDER BY created_at DESC LIMIT 200) c)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_partner_session_feedback_q(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_partner_session_feedback_q(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------
-- 6. RLS — 반드시 켠다
-- ---------------------------------------------------------------
ALTER TABLE public.instructor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS instructor_profiles_select ON public.instructor_profiles;
CREATE POLICY instructor_profiles_select ON public.instructor_profiles
  FOR SELECT TO anon, authenticated
  USING (is_public OR user_id = auth.uid() OR created_by = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- 쓰기: 본인 프로필(user_id = 나) 또는 내가 만든 계정 없는 프로필(주최자)만
DROP POLICY IF EXISTS instructor_profiles_insert ON public.instructor_profiles;
CREATE POLICY instructor_profiles_insert ON public.instructor_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() OR (user_id IS NULL AND created_by = auth.uid()))
    AND (partner_id IS NULL OR partner_id IN (SELECT id FROM public.partners WHERE profile_id = auth.uid()))
  );

DROP POLICY IF EXISTS instructor_profiles_update ON public.instructor_profiles;
CREATE POLICY instructor_profiles_update ON public.instructor_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND created_by = auth.uid())
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'))
  WITH CHECK (
    ((user_id = auth.uid() OR (user_id IS NULL AND created_by = auth.uid()))
      AND (partner_id IS NULL OR partner_id IN (SELECT id FROM public.partners WHERE profile_id = auth.uid())))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
  );
-- DELETE 정책 없음(지우지 않는다)

-- 응답: 읽기는 그 세션을 관리하는 사람만. 쓰기 정책 없음 — sp_live_feedback_s 로만 들어온다
DROP POLICY IF EXISTS session_feedback_select_manager ON public.session_feedback;
CREATE POLICY session_feedback_select_manager ON public.session_feedback
  FOR SELECT TO authenticated
  USING (public.fn_can_manage_session(session_id));

REVOKE ALL ON TABLE public.instructor_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.instructor_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.instructor_profiles TO authenticated;
GRANT ALL ON TABLE public.instructor_profiles TO service_role;

REVOKE ALL ON TABLE public.session_feedback FROM anon, authenticated;
GRANT SELECT ON TABLE public.session_feedback TO authenticated;
GRANT ALL ON TABLE public.session_feedback TO service_role;

-- ---------------------------------------------------------------
-- 7. 기존 발표자 행을 프로필에 잇는다(새 컬럼만 채움, updated_at 유지)
-- ---------------------------------------------------------------
SET LOCAL livepulse.backfill = 'on';
UPDATE public.session_presenters SET instructor_profile_id = NULL WHERE instructor_profile_id IS NULL;
SET LOCAL livepulse.backfill = 'off';

COMMIT;
