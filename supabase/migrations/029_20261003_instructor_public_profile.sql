-- =====================================================
-- 029 (2026-10-03) 강사 공개 프로필 — 본인 동의한 강사만 공개 (TSK-1245, K-011 8단계)
-- =====================================================
-- 목적: 강사가 «공개»를 직접 켠 경우에만 /instructors/<slug 또는 id> 로 프로필·누적 평점·
--       진행한 공개 행사 목록이 보인다. 기본은 비공개.
--
-- 바꾸는 것
--   instructor_profiles.is_public 기본값 true → false
--   새 컬럼  instructor_profiles.slug (공개 주소, 소문자·숫자·하이픈 3~40자, 유일)
--            instructor_profiles.public_consent_at (본인이 공개를 켠 시각)
--   새 제약  공개는 «본인 계정이 있고 동의 시각이 있는» 프로필만
--   새 트리거 공개 켜기는 본인만(관리자·주최자는 끄기만), 켜면 동의 시각 기록·끄면 지움
--   RLS     익명(anon)은 공개 프로필만, 그리고 연락처가 섞일 수 있는 bio·계정 id 컬럼은 못 읽게
--   새 함수  sp_instructor_public_q(text)            공개 페이지(익명 가능) — 소개글의 이메일·전화번호는 가린다
--            sp_my_instructor_profile_q()            내 강사 프로필
--            sp_my_instructor_public_s(...)          내 공개 여부·주소·소개 저장(없으면 만든다)
--   바꾸는 함수 sp_instructor_profile_q(uuid) — sp_instructor_public_q 로 넘긴다(같은 가림 규칙)
--
-- 기존 행: 026 트리거가 동의 없이 만든 프로필 5건이 모두 is_public=true 였다 → 전부 비공개로 돌린다
--   (is_public 만 false 로, 다른 값·행은 그대로. updated_at 은 기존 트리거 때문에 지금 시각이 된다).
--
-- 되돌리기(사람 판단으로만): 새 함수·컬럼·트리거는 남겨 둬도 기존 화면에 영향이 없다.
--   예전처럼 모두 공개로 돌리는 것은 동의 원칙에 어긋나므로 하지 않는다.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. 컬럼·기본값
-- ---------------------------------------------------------------
ALTER TABLE public.instructor_profiles ALTER COLUMN is_public SET DEFAULT false;
ALTER TABLE public.instructor_profiles
  ADD COLUMN IF NOT EXISTS slug              text,
  ADD COLUMN IF NOT EXISTS public_consent_at timestamptz;

COMMENT ON COLUMN public.instructor_profiles.is_public IS '본인이 공개를 켰는지(기본 끔). 켜기는 본인만, 끄기는 본인·관리 주최자·관리자 (029)';
COMMENT ON COLUMN public.instructor_profiles.slug IS '공개 주소 /instructors/<slug>. 소문자·숫자·하이픈 3~40자, 비우면 id 로 연다 (029)';
COMMENT ON COLUMN public.instructor_profiles.public_consent_at IS '본인이 공개에 동의(켜기)한 시각. 끄면 지운다 (029)';

-- 기존 행 전부 비공개(동의 기록이 없으므로)
UPDATE public.instructor_profiles SET is_public = false WHERE is_public;

ALTER TABLE public.instructor_profiles DROP CONSTRAINT IF EXISTS instructor_profiles_slug_format;
ALTER TABLE public.instructor_profiles ADD CONSTRAINT instructor_profiles_slug_format CHECK (
  slug IS NULL OR (
    slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
    AND slug !~ '--'
    AND slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS instructor_profiles_slug_uq
  ON public.instructor_profiles (slug) WHERE slug IS NOT NULL;

ALTER TABLE public.instructor_profiles DROP CONSTRAINT IF EXISTS instructor_profiles_public_consent;
ALTER TABLE public.instructor_profiles ADD CONSTRAINT instructor_profiles_public_consent CHECK (
  NOT is_public OR (user_id IS NOT NULL AND public_consent_at IS NOT NULL)
);

-- ---------------------------------------------------------------
-- 2. 공개 켜기는 본인만
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_instructor_profile_public_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_was boolean := CASE WHEN TG_OP = 'UPDATE' THEN OLD.is_public ELSE false END;
BEGIN
  IF NEW.is_public AND NOT v_was THEN
    -- 서비스 롤·마이그레이션(v_uid 없음)이 아니면 본인만 켤 수 있다
    IF v_uid IS NOT NULL AND (NEW.user_id IS NULL OR NEW.user_id <> v_uid) THEN
      RAISE EXCEPTION 'instructor_public_owner_only' USING ERRCODE = '42501';
    END IF;
    NEW.public_consent_at := now();
  ELSIF NOT NEW.is_public THEN
    NEW.public_consent_at := NULL;
  ELSIF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    -- 공개 중에 계정이 바뀌면 동의가 이어지지 않는다
    NEW.is_public := false;
    NEW.public_consent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_instructor_profile_public_guard() FROM public, anon, authenticated;
COMMENT ON FUNCTION public.fn_instructor_profile_public_guard() IS '강사 프로필 공개 켜기는 본인만, 동의 시각 기록 (029)';

DROP TRIGGER IF EXISTS instructor_profiles_public_guard ON public.instructor_profiles;
CREATE TRIGGER instructor_profiles_public_guard
  BEFORE INSERT OR UPDATE OF is_public, user_id ON public.instructor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_instructor_profile_public_guard();

-- ---------------------------------------------------------------
-- 3. RLS — 익명은 공개 프로필만, 민감할 수 있는 컬럼은 함수로만
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS instructor_profiles_select ON public.instructor_profiles;
DROP POLICY IF EXISTS instructor_profiles_select_anon ON public.instructor_profiles;
DROP POLICY IF EXISTS instructor_profiles_select_auth ON public.instructor_profiles;

CREATE POLICY instructor_profiles_select_anon ON public.instructor_profiles
  FOR SELECT TO anon
  USING (is_public);

CREATE POLICY instructor_profiles_select_auth ON public.instructor_profiles
  FOR SELECT TO authenticated
  USING (is_public OR user_id = auth.uid() OR created_by = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- 익명: 표 전체 SELECT 를 거두고 화면에 필요한 컬럼만. bio(연락처를 적었을 수 있음)·계정 id 는 함수에서 가려 준다
REVOKE SELECT ON TABLE public.instructor_profiles FROM anon;
GRANT SELECT (id, slug, display_name, title, image_url, is_public, created_at) ON public.instructor_profiles TO anon;

-- ---------------------------------------------------------------
-- 4. 함수
-- ---------------------------------------------------------------

-- 4-0. 공개 글에서 이메일·전화번호 가리기
CREATE OR REPLACE FUNCTION public.fn_mask_contact(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN p_text IS NULL THEN NULL ELSE
    regexp_replace(
      regexp_replace(p_text,
        '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[비공개]', 'g'),
      '(\+?82[[:space:].-]?|0)[0-9]{1,2}[[:space:].)-]{0,2}[0-9]{3,4}[[:space:].-]?[0-9]{4}', '[비공개]', 'g')
  END;
$$;
REVOKE ALL ON FUNCTION public.fn_mask_contact(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mask_contact(text) TO authenticated, service_role;
COMMENT ON FUNCTION public.fn_mask_contact(text) IS '공개 글의 이메일·전화번호를 [비공개]로 바꾼다 (029)';

-- 4-1. 공개 페이지 — slug 또는 id. 공개가 아니면 본인·관리 주최자만 미리보기
CREATE OR REPLACE FUNCTION public.sp_instructor_public_q(p_key text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_key  text := lower(btrim(COALESCE(p_key, '')));
  v_p    public.instructor_profiles%ROWTYPE;
  v_sessions json;
  v_scnt integer;
  v_avg  numeric;
  v_cnt  integer;
BEGIN
  IF v_key = '' OR char_length(v_key) > 64 THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_p FROM public.instructor_profiles WHERE id = v_key::uuid;
  ELSE
    SELECT * INTO v_p FROM public.instructor_profiles WHERE slug = v_key;
  END IF;

  IF NOT FOUND OR NOT (
       v_p.is_public
       OR (v_uid IS NOT NULL AND (v_p.user_id = v_uid OR (v_p.user_id IS NULL AND v_p.created_by = v_uid)))
     ) THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  -- 진행한 공개 행사: 공개(published) 이후 상태만. 장소·연락처·코드는 주지 않는다
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
           'title', public.fn_mask_contact(title), 'start_at', start_at, 'status', status,
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
      'id', v_p.id,
      'slug', v_p.slug,
      'display_name', v_p.display_name,
      'title', public.fn_mask_contact(v_p.title),
      'bio', public.fn_mask_contact(v_p.bio),
      'image_url', v_p.image_url,
      'created_at', v_p.created_at,
      'is_public', v_p.is_public,
      'is_mine', (v_uid IS NOT NULL AND (v_p.user_id = v_uid OR (v_p.user_id IS NULL AND v_p.created_by = v_uid)))
    ),
    'rating', json_build_object('avg', v_avg, 'count', COALESCE(v_cnt, 0)),
    'session_count', COALESCE(v_scnt, 0),
    'sessions', v_sessions
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sp_instructor_public_q(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_instructor_public_q(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_instructor_public_q(text) IS '강사 공개 프로필(slug 또는 id) — 공개 동의한 프로필만, 연락처 가림, 진행한 공개 행사·누적 평점 (029)';

-- 4-2. 예전 id 조회 함수는 같은 규칙으로 넘긴다
CREATE OR REPLACE FUNCTION public.sp_instructor_profile_q(p_profile_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.sp_instructor_public_q(p_profile_id::text);
$$;
REVOKE ALL ON FUNCTION public.sp_instructor_profile_q(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_instructor_profile_q(uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.sp_instructor_profile_q(uuid) IS '강사 프로필 조회(id) — 029 부터 sp_instructor_public_q 로 넘김';

-- 4-3. 내 강사 프로필
CREATE OR REPLACE FUNCTION public.sp_my_instructor_profile_q()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p   public.instructor_profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  SELECT * INTO v_p FROM public.instructor_profiles WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', true, 'profile', NULL);
  END IF;
  RETURN json_build_object('success', true, 'profile', json_build_object(
    'id', v_p.id, 'slug', v_p.slug, 'display_name', v_p.display_name, 'title', v_p.title,
    'bio', v_p.bio, 'image_url', v_p.image_url, 'is_public', v_p.is_public,
    'public_consent_at', v_p.public_consent_at
  ));
END;
$$;
REVOKE ALL ON FUNCTION public.sp_my_instructor_profile_q() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_my_instructor_profile_q() TO authenticated, service_role;
COMMENT ON FUNCTION public.sp_my_instructor_profile_q() IS '내 강사 프로필(본인 계정) (029)';

-- 4-4. 내 공개 여부·주소·소개 저장. 프로필이 없으면 만든다
CREATE OR REPLACE FUNCTION public.sp_my_instructor_public_s(
  p_is_public    boolean,
  p_slug         text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_title        text DEFAULT NULL,
  p_bio          text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_slug  text := NULLIF(lower(btrim(COALESCE(p_slug, ''))), '');
  v_name  text := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  v_title text := NULLIF(btrim(COALESCE(p_title, '')), '');
  v_bio   text := NULLIF(btrim(COALESCE(p_bio, '')), '');
  v_id    uuid;
  v_pname text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  IF v_slug IS NOT NULL AND NOT (
       v_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' AND v_slug !~ '--'
       AND v_slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_slug');
  END IF;
  IF v_slug IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.instructor_profiles WHERE slug = v_slug AND (user_id IS DISTINCT FROM v_uid)) THEN
    RETURN json_build_object('success', false, 'error', 'slug_taken');
  END IF;
  IF v_name IS NOT NULL AND char_length(v_name) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_name');
  END IF;
  IF v_title IS NOT NULL AND char_length(v_title) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_title');
  END IF;
  IF v_bio IS NOT NULL AND char_length(v_bio) > 5000 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_bio');
  END IF;

  SELECT id INTO v_id FROM public.instructor_profiles WHERE user_id = v_uid;
  IF v_id IS NULL THEN
    SELECT display_name INTO v_pname FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.instructor_profiles (user_id, display_name, title, bio, slug, created_by, is_public)
    VALUES (v_uid, left(COALESCE(v_name, NULLIF(btrim(v_pname), ''), '강사'), 100),
            v_title, v_bio, v_slug, v_uid, COALESCE(p_is_public, false))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.instructor_profiles
       SET is_public    = COALESCE(p_is_public, is_public),
           slug         = v_slug,
           display_name = COALESCE(v_name, display_name),
           title        = v_title,
           bio          = v_bio
     WHERE id = v_id;
  END IF;

  RETURN public.sp_my_instructor_profile_q();
END;
$$;
REVOKE ALL ON FUNCTION public.sp_my_instructor_public_s(boolean, text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_my_instructor_public_s(boolean, text, text, text, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.sp_my_instructor_public_s(boolean, text, text, text, text) IS '내 강사 프로필 공개 여부·주소·이름·직함·소개 저장, 없으면 만든다 (029)';

COMMIT;
