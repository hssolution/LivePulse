-- =====================================================
-- 027 (2026-10-02) 강사 프로필 자동 연결 트리거 보정 (TSK-1245, K-011 4단계)
-- =====================================================
-- 증상(운영 시험 데이터 정리 중 발견, 2026-10-02): 강사 프로필을 지우면 FK(ON DELETE SET NULL)가
--   session_presenters.instructor_profile_id 를 NULL 로 UPDATE 하고, 026 트리거가 이를 «연결 없음»으로 보고
--   같은 이름의 프로필을 다시 만들었다. 발표자 연결을 일부러 비운 경우도 같다.
-- 고침: UPDATE 에서는 사람(유형·파트너·계정·수기 이름)이 바뀌었거나 기존 행 연결(backfill) 중일 때만 자동 연결한다.
--   INSERT 동작·권한 확인·backfill 은 026 그대로.
-- 바꾸는 것: 026 에서 만든 함수 public.fn_session_presenter_link_profile() 의 본문만(CREATE OR REPLACE).
--   테이블·컬럼·정책·다른 함수는 그대로. 원래 정의 = 026 파일의 같은 함수(저장소에 그대로 있음).
-- =====================================================

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
  v_person_changed boolean := false;
BEGIN
  -- 기존 행 연결(마이그레이션) 중에는 updated_at 을 건드리지 않는다
  IF TG_OP = 'UPDATE' AND current_setting('livepulse.backfill', true) = 'on' THEN
    NEW.updated_at := OLD.updated_at;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_person_changed := NEW.presenter_type IS DISTINCT FROM OLD.presenter_type
          OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
          OR NEW.user_id IS DISTINCT FROM OLD.user_id
          OR lower(btrim(COALESCE(NEW.manual_name, ''))) IS DISTINCT FROM lower(btrim(COALESCE(OLD.manual_name, '')));

    -- [027] 사람은 그대로인데 연결만 비워졌다 = 명시적 해제 또는 프로필 삭제(FK ON DELETE SET NULL).
    --       그대로 둔다(026 은 여기서 다시 찾아 프로필을 새로 만들었다).
    IF NEW.instructor_profile_id IS NULL AND NOT v_person_changed
       AND COALESCE(current_setting('livepulse.backfill', true), '') <> 'on' THEN
      RETURN NEW;
    END IF;

    -- 같은 프로필을 유지한 채 사람(유형·파트너·계정·이름)이 바뀌면 연결을 풀고 다시 찾는다
    IF NEW.instructor_profile_id IS NOT NULL
       AND NEW.instructor_profile_id IS NOT DISTINCT FROM OLD.instructor_profile_id
       AND v_person_changed THEN
      NEW.instructor_profile_id := NULL;
    END IF;
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
