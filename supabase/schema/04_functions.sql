-- 04 함수·프로시저 전부(aggregate 제외)
-- LivePulse 운영 DB(pfrdyviyzilhjarnmcec) 스키마 덤프 — 자동 생성(supabase/schema/dump.mjs). 직접 고치지 말고 다시 덤프한다.
-- 데이터는 없음(storage.buckets 메타 행 제외).

set check_function_bodies = false;

CREATE OR REPLACE FUNCTION public._seed_trans(p_key text, p_cat_id uuid, p_ko text, p_en text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE v_key_id UUID;
BEGIN
  INSERT INTO public.language_keys (key, category_id) VALUES (p_key, p_cat_id)
  ON CONFLICT (key) DO UPDATE SET category_id = p_cat_id
  RETURNING id INTO v_key_id;
  
  INSERT INTO public.translations (key_id, language_code, value) VALUES (v_key_id, 'ko', p_ko)
  ON CONFLICT (key_id, language_code) DO UPDATE SET value = p_ko;
  
  INSERT INTO public.translations (key_id, language_code, value) VALUES (v_key_id, 'en', p_en)
  ON CONFLICT (key_id, language_code) DO UPDATE SET value = p_en;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_partner_invite(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_member_id UUID;
  v_partner_id UUID;
  v_email TEXT;
  v_user_email TEXT;
BEGIN
  -- 현재 사용자 이메일 조회
  SELECT email INTO v_user_email FROM public.profiles WHERE id = auth.uid();
  
  -- 토큰으로 초대 조회
  SELECT id, partner_id, email INTO v_member_id, v_partner_id, v_email
  FROM public.partner_members
  WHERE invite_token = p_token AND status = 'pending';
  
  IF v_member_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite token');
  END IF;
  
  -- 이메일 일치 확인
  IF v_email != v_user_email THEN
    RETURN json_build_object('success', false, 'error', 'Email mismatch');
  END IF;
  
  -- 초대 수락 처리
  UPDATE public.partner_members
  SET user_id = auth.uid(),
      status = 'accepted',
      accepted_at = now(),
      invite_token = NULL
  WHERE id = v_member_id;
  
  -- 사용자 프로필 업데이트 (파트너로 변경)
  UPDATE public.profiles
  SET user_type = 'partner'
  WHERE id = auth.uid() AND user_type IN ('user', 'general');
  
  RETURN json_build_object('success', true, 'partner_id', v_partner_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_partner_owner_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = NEW.profile_id;
  
  INSERT INTO public.partner_members (partner_id, user_id, email, role, status, accepted_at)
  VALUES (NEW.id, NEW.profile_id, v_email, 'owner', 'accepted', now())
  ON CONFLICT (partner_id, email) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_session_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT profile_id INTO v_user_id FROM public.partners WHERE id = NEW.partner_id;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.session_members (session_id, user_id, role, assigned_by)
    VALUES (NEW.id, v_user_id, 'owner', v_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_cues_rev()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE sessions SET cues_rev = cues_rev + 1 WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_qna_rev()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_session_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(NEW) - 'likes_count' - 'updated_at' - 'display_order'
     = to_jsonb(OLD) - 'likes_count' - 'updated_at' - 'display_order' THEN
      RETURN NEW;
    END IF;
  END IF;
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE sessions SET qna_rev = qna_rev + 1 WHERE id = v_session_id;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_session_partner_type TEXT;
  v_target_partner_type TEXT;
BEGIN
  SELECT p.partner_type INTO v_session_partner_type
  FROM sessions s
  JOIN partners p ON s.partner_id = p.id
  WHERE s.id = p_session_id;
  
  SELECT partner_type INTO v_target_partner_type
  FROM partners
  WHERE id = p_target_partner_id;
  
  -- organizer는 agency만, agency는 organizer만 초대 가능
  IF v_session_partner_type = 'organizer' AND v_target_partner_type = 'agency' THEN
    RETURN TRUE;
  ELSIF v_session_partner_type = 'agency' AND v_target_partner_type = 'organizer' THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_question_liked(p_question_id uuid, p_device_id text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- 24시간 이상 활동 없는 세션 삭제
  WITH deleted AS (
    DELETE FROM public.active_sessions
    WHERE last_activity_at < now() - INTERVAL '24 hours'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  
  -- 30일 이상 된 로그인 시도 기록 삭제
  DELETE FROM public.login_attempts
  WHERE last_attempt_at < now() - INTERVAL '30 days';
  
  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  claims JSONB;
  profile_record RECORD;
BEGIN
  claims := event->'claims';
  
  -- 프로필 정보 조회
  SELECT 
    email,
    display_name,
    user_role,
    user_type,
    status,
    description
  INTO profile_record
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- 프로필 정보가 있으면 클레임에 추가
  IF profile_record.user_type IS NOT NULL THEN
    IF profile_record.email IS NOT NULL THEN
      claims := jsonb_set(claims, '{email}', to_jsonb(profile_record.email));
    END IF;
    
    IF profile_record.display_name IS NOT NULL THEN
      claims := jsonb_set(claims, '{display_name}', to_jsonb(profile_record.display_name));
    END IF;
    
    IF profile_record.user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_role}', to_jsonb(profile_record.user_role));
    END IF;
    
    IF profile_record.user_type IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_type}', to_jsonb(profile_record.user_type));
    END IF;
    
    IF profile_record.status IS NOT NULL THEN
      claims := jsonb_set(claims, '{status}', to_jsonb(profile_record.status));
    END IF;
    
    IF profile_record.description IS NOT NULL THEN
      claims := jsonb_set(claims, '{description}', to_jsonb(profile_record.description));
    END IF;
  END IF;

  -- 업데이트된 클레임 반환
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_participant_count(session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.sessions
  SET participant_count = GREATEST(0, participant_count - 1)
  WHERE id = session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_can_manage_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.sessions s JOIN public.partners p ON p.id = s.partner_id
             WHERE s.id = p_session_id AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.session_partners sp JOIN public.partners p ON p.id = sp.partner_id
                WHERE sp.session_id = p_session_id AND sp.status = 'accepted' AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_session_issuer_name(p_session_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(
           NULLIF(btrim(s.certificate_issuer), ''),
           (SELECT NULLIF(btrim(o.company_name), '') FROM public.partner_organizers o WHERE o.partner_id = s.partner_id LIMIT 1),
           (SELECT NULLIF(btrim(a.company_name), '') FROM public.partner_agencies a WHERE a.partner_id = s.partner_id LIMIT 1),
           (SELECT NULLIF(btrim(p.representative_name), '') FROM public.partners p WHERE p.id = s.partner_id),
           'LivePulse')
    FROM public.sessions s WHERE s.id = p_session_id;
$function$;

CREATE OR REPLACE FUNCTION public.fn_session_presenter_link_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_session_timer_json(v_s sessions)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT json_build_object(
    'duration_sec', v_s.timer_duration_sec,
    'remaining_sec', v_s.timer_remaining_sec,
    'running', v_s.timer_running,
    'ends_at', v_s.timer_ends_at,
    'warn_sec', v_s.timer_warn_sec,
    'changed_at', v_s.timer_changed_at
  );
$function$;

CREATE OR REPLACE FUNCTION public.generate_invite_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_session_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.sessions WHERE code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', pm.id,
    'partner_id', pm.partner_id,
    'email', pm.email,
    'role', pm.role,
    'status', pm.status,
    'invited_at', pm.invited_at,
    'partner_type', p.partner_type,
    'representative_name', p.representative_name,
    'company_name', COALESCE(
      po.company_name,
      pa.company_name,
      pi.display_name,
      p.representative_name
    )
  )
  INTO v_result
  FROM public.partner_members pm
  JOIN public.partners p ON pm.partner_id = p.id
  LEFT JOIN public.partner_organizers po ON p.id = po.partner_id
  LEFT JOIN public.partner_agencies pa ON p.id = pa.partner_id
  LEFT JOIN public.partner_instructors pi ON p.id = pi.partner_id
  WHERE pm.invite_token = p_token
    AND pm.status = 'pending';
  
  IF v_result IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_login_statistics(p_days integer DEFAULT 7)
 RETURNS TABLE(total_logins bigint, successful_logins bigint, failed_logins bigint, unique_users bigint, forced_logouts bigint, top_failure_reasons jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type IN ('login_success', 'login_failed')),
    COUNT(*) FILTER (WHERE event_type = 'login_success'),
    COUNT(*) FILTER (WHERE event_type = 'login_failed'),
    COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'login_success'),
    COUNT(*) FILTER (WHERE event_type = 'forced_logout'),
    (
      SELECT jsonb_agg(jsonb_build_object('reason', failure_reason, 'count', cnt))
      FROM (
        SELECT failure_reason, COUNT(*) as cnt
        FROM public.login_logs
        WHERE event_type = 'login_failed'
          AND created_at >= now() - (p_days || ' days')::INTERVAL
          AND failure_reason IS NOT NULL
        GROUP BY failure_reason
        ORDER BY cnt DESC
        LIMIT 5
      ) sub
    )
  FROM public.login_logs
  WHERE created_at >= now() - (p_days || ' days')::INTERVAL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_partner_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT id FROM public.partners
    WHERE profile_id = auth.uid()
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_translations(lang_code text DEFAULT 'ko'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(lk.key, t.value)
  INTO result
  FROM public.language_keys lk
  JOIN public.translations t ON t.key_id = lk.id
  WHERE t.language_code = lang_code;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_language()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_lang TEXT;
BEGIN
  SELECT preferred_language INTO user_lang
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_lang;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_session()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_session_code();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_first_user BOOLEAN;
  v_meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text;
BEGIN
  SELECT count(*) = 0 INTO is_first_user FROM public.profiles;

  -- 표시 이름: 소셜 공급자별 키를 순서대로 시도 → 없으면 이메일 아이디부분
  v_name := NULLIF(TRIM(COALESCE(
    v_meta->>'display_name',
    v_meta->>'full_name',
    v_meta->>'name',
    v_meta->>'nickname',
    v_meta->>'preferred_username',
    v_meta->>'user_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  )), '');

  INSERT INTO public.profiles (id, email, display_name, preferred_language, user_role, user_type, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    NULLIF(v_meta->>'preferred_language', ''),
    CASE WHEN is_first_user THEN 'admin' ELSE 'user' END,
    CASE WHEN is_first_user THEN 'admin' ELSE 'user' END,
    'active'
  );

  IF is_first_user THEN
    INSERT INTO public.app_config (key, value)
    VALUES ('admin_initialized', 'true')
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_participant_count(session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.sessions
  SET participant_count = participant_count + 1
  WHERE id = session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_poll_option_votes(option_id_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.poll_options
  SET votes = votes + 1
  WHERE id = option_id_input;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_existing UUID;
  v_compatible BOOLEAN;
  v_result UUID;
BEGIN
  SELECT id INTO v_existing
  FROM session_partners
  WHERE session_id = p_session_id;
  
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_has_partner');
  END IF;
  
  SELECT public.check_partner_collaboration_compatibility(p_session_id, p_partner_id)
  INTO v_compatible;
  
  IF NOT v_compatible THEN
    RETURN json_build_object('success', false, 'error', 'incompatible_partner_type');
  END IF;
  
  INSERT INTO session_partners (session_id, partner_id, invited_by, status)
  VALUES (p_session_id, p_partner_id, auth.uid(), 'pending')
  RETURNING id INTO v_result;
  
  RETURN json_build_object('success', true, 'id', v_result);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_admin_or_owner(p_partner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_member(p_partner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_owner(p_partner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'accepted'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_active_sessions_q()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'session_token', a.session_token,
        'ip_address', a.ip_address,
        'user_agent', a.user_agent,
        'device_info', a.device_info,
        'last_activity_at', a.last_activity_at,
        'created_at', a.created_at,
        'user', json_build_object('email', p.email)
      ) ORDER BY a.last_activity_at DESC
    ), '[]'::json)
    FROM active_sessions a
    LEFT JOIN profiles p ON p.id = a.user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_dashboard_q()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result JSON;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
  v_two_weeks_ago TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
BEGIN
  -- 날짜 계산
  v_today_start := DATE_TRUNC('day', NOW());
  v_today_end := v_today_start + INTERVAL '1 day';
  v_two_weeks_ago := DATE_TRUNC('day', NOW() - INTERVAL '13 days');
  v_month_start := DATE_TRUNC('month', NOW());
  
  -- JSON 결과 생성
  v_result := json_build_object(
    -- 주요 통계
    'stats', json_build_object(
      'liveSessions', (
        SELECT COUNT(*) FROM sessions WHERE status = 'active'
      ),
      'todaySessions', (
        SELECT COUNT(*) FROM sessions 
        WHERE start_at >= v_today_start AND start_at < v_today_end
      ),
      'totalParticipants', (
        SELECT COALESCE(SUM(participant_count), 0) FROM sessions 
        WHERE start_at >= v_today_start AND start_at < v_today_end
      ),
      'activePartners', (
        SELECT COUNT(DISTINCT ll.user_id)
        FROM login_logs ll
        JOIN profiles p ON p.id = ll.user_id
        WHERE p.user_type = 'partner'
          AND ll.created_at >= v_today_start
      ),
      'newUsersThisMonth', (
        SELECT COUNT(*) FROM profiles WHERE created_at >= v_month_start
      ),
      'avgParticipants', (
        SELECT COALESCE(ROUND(AVG(participant_count)), 0)
        FROM sessions
        WHERE participant_count > 0
      ),
      'loginFailureRate', (
        SELECT CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND((COUNT(*) FILTER (WHERE event_type = 'login_failed')::NUMERIC / COUNT(*)) * 100)
        END
        FROM (
          SELECT event_type FROM login_logs 
          ORDER BY created_at DESC 
          LIMIT 1000
        ) recent_logs
      )
    ),
    
    -- 세션 추이 (최근 14일)
    'sessionTrend', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', TO_CHAR(day_date, 'MM/DD'),
          'sessions', COALESCE(session_count, 0),
          'participants', COALESCE(participant_sum, 0)
        ) ORDER BY day_date
      ), '[]'::json)
      FROM (
        SELECT 
          d.day_date,
          COUNT(DISTINCT s.id) AS session_count,
          SUM(s.participant_count) AS participant_sum
        FROM generate_series(
          v_two_weeks_ago::date,
          CURRENT_DATE,
          '1 day'::interval
        ) AS d(day_date)
        LEFT JOIN sessions s ON s.start_at::date = d.day_date::date
        GROUP BY d.day_date
        ORDER BY d.day_date
      ) trend_data
    ),
    
    -- 사용자 유형 분포
    'userTypeDist', (
      SELECT json_agg(
        json_build_object(
          'name', user_type,
          'value', user_count
        )
      )
      FROM (
        SELECT 
          user_type,
          COUNT(*) AS user_count
        FROM profiles
        WHERE user_type IN ('user', 'partner', 'admin')
        GROUP BY user_type
      ) user_types
    ),
    
    -- 세션 상태 분포
    'sessionStatusDist', (
      SELECT json_agg(
        json_build_object(
          'name', status,
          'value', status_count
        )
      )
      FROM (
        SELECT 
          status,
          COUNT(*) AS status_count
        FROM sessions
        WHERE status IN ('draft', 'published', 'active', 'ended')
        GROUP BY status
      ) session_statuses
    ),
    
    -- 인기 세션 TOP 5
    'topSessions', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', s.id,
          'title', s.title,
          'participant_count', s.participant_count,
          'partners', json_build_object(
            'representative_name', p.representative_name
          )
        ) ORDER BY s.participant_count DESC
      ), '[]'::json)
      FROM (
        SELECT id, title, participant_count, partner_id
        FROM sessions
        WHERE participant_count > 0
        ORDER BY participant_count DESC
        LIMIT 5
      ) s
      JOIN partners p ON p.id = s.partner_id
    ),
    
    -- 우수 파트너 TOP 5
    'topPartners', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'name', partner_name,
          'count', session_count
        ) ORDER BY session_count DESC
      ), '[]'::json)
      FROM (
        SELECT 
          p.representative_name AS partner_name,
          COUNT(s.id) AS session_count
        FROM partners p
        JOIN sessions s ON s.partner_id = p.id
        GROUP BY p.id, p.representative_name
        ORDER BY session_count DESC
        LIMIT 5
      ) top_partners_data
    ),
    
    -- 언어 분포 TOP 5
    'languageDist', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'name', preferred_language,
          'value', lang_count
        ) ORDER BY lang_count DESC
      ), '[]'::json)
      FROM (
        SELECT 
          COALESCE(preferred_language, 'ko') AS preferred_language,
          COUNT(*) AS lang_count
        FROM profiles
        GROUP BY COALESCE(preferred_language, 'ko')
        ORDER BY lang_count DESC
        LIMIT 5
      ) lang_data
    ),
    
    -- 파트너 승인 현황
    'approvalStats', (
      SELECT json_agg(
        json_build_object(
          'name', status,
          'value', status_count,
          'fill', CASE 
            WHEN status = 'approved' THEN '#10b981'
            WHEN status = 'pending' THEN '#f59e0b'
            WHEN status = 'rejected' THEN '#ef4444'
          END
        )
      )
      FROM (
        SELECT 
          status,
          COUNT(*) AS status_count
        FROM partner_requests
        WHERE status IN ('pending', 'approved', 'rejected')
        GROUP BY status
        HAVING COUNT(*) > 0
      ) approval_data
    ),
    
    -- 시간대별 활동량 (24시간)
    'peakHours', (
      SELECT json_agg(
        json_build_object(
          'hour', hour_label,
          'count', activity_count
        ) ORDER BY hour_num
      )
      FROM (
        SELECT 
          h.hour_num,
          h.hour_num || '시' AS hour_label,
          COUNT(ll.id) AS activity_count
        FROM generate_series(0, 23) AS h(hour_num)
        LEFT JOIN login_logs ll ON EXTRACT(HOUR FROM ll.created_at) = h.hour_num
          AND ll.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY h.hour_num
        ORDER BY h.hour_num
      ) peak_data
    )
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_faq_d(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  DELETE FROM faqs WHERE id = p_id;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_faq_reorder_s(p_orders json)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_item json;
BEGIN
  FOR v_item IN SELECT * FROM json_array_elements(p_orders)
  LOOP
    UPDATE faqs SET display_order = (v_item->>'order')::integer
    WHERE id = (v_item->>'id')::uuid;
  END LOOP;
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_faq_s(p_id uuid DEFAULT NULL::uuid, p_category text DEFAULT 'common'::text, p_question text DEFAULT NULL::text, p_answer text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_display_order integer DEFAULT 0, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE faqs SET
      category = COALESCE(p_category, category),
      question = COALESCE(p_question, question),
      answer = COALESCE(p_answer, answer),
      is_active = p_is_active,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO faqs (category, question, answer, is_active, display_order, created_by)
    VALUES (p_category, p_question, p_answer, p_is_active, p_display_order, p_created_by)
    RETURNING id INTO v_id;
  END IF;
  
  RETURN json_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_faq_toggle_s(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_new_status boolean;
BEGIN
  UPDATE faqs SET is_active = NOT is_active WHERE id = p_id
  RETURNING is_active INTO v_new_status;
  
  RETURN json_build_object('success', true, 'is_active', v_new_status);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_faqs_q(p_category text DEFAULT 'common'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(f) ORDER BY f.display_order), '[]'::json)
    FROM faqs f
    WHERE f.category = p_category
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_force_logout_s(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_session record;
BEGIN
  -- 세션 정보 조회
  SELECT a.*, p.email INTO v_session
  FROM active_sessions a
  LEFT JOIN profiles p ON p.id = a.user_id
  WHERE a.id = p_session_id;
  
  IF v_session IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;
  
  -- 세션 삭제
  DELETE FROM active_sessions WHERE id = p_session_id;
  
  -- 로그 기록
  INSERT INTO login_logs (email, event_type, failure_reason, ip_address, user_agent, device_info, session_id)
  VALUES (v_session.email, 'forced_logout', 'admin_action', v_session.ip_address, v_session.user_agent, v_session.device_info, v_session.session_token);
  
  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_inquiries_q(p_status text DEFAULT 'all'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', i.id,
        'title', i.title,
        'content', i.content,
        'status', i.status,
        'created_at', i.created_at,
        'partner', json_build_object(
          'id', p.id,
          'partner_type', p.partner_type,
          'representative_name', p.representative_name,
          'profile', json_build_object('email', pr.email)
        )
      ) ORDER BY i.created_at DESC
    ), '[]'::json)
    FROM inquiries i
    LEFT JOIN partners p ON p.id = i.partner_id
    LEFT JOIN profiles pr ON pr.id = p.profile_id
    WHERE p_status = 'all' OR i.status = p_status
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_inquiry_replies_q(p_inquiry_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', r.id,
        'content', r.content,
        'is_admin', r.is_admin,
        'created_at', r.created_at,
        'user', json_build_object('email', p.email, 'display_name', p.display_name)
      ) ORDER BY r.created_at
    ), '[]'::json)
    FROM inquiry_replies r
    LEFT JOIN profiles p ON p.id = r.user_id
    WHERE r.inquiry_id = p_inquiry_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_inquiry_reply_s(p_inquiry_id uuid, p_user_id uuid, p_content text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- 답변 등록
  INSERT INTO inquiry_replies (inquiry_id, user_id, content, is_admin)
  VALUES (p_inquiry_id, p_user_id, p_content, true);
  
  -- 상태가 pending이면 in_progress로 변경
  UPDATE inquiries SET status = 'in_progress'
  WHERE id = p_inquiry_id AND status = 'pending';
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_inquiry_status_s(p_inquiry_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE inquiries SET status = p_status WHERE id = p_inquiry_id;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_langpack_init_q()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_languages JSONB;
  v_categories JSONB;
  v_total_keys INTEGER;
BEGIN
  -- 언어 목록
  SELECT COALESCE(jsonb_agg(row_to_json(l.*) ORDER BY l.sort_order), '[]'::jsonb)
  INTO v_languages
  FROM languages l;
  
  -- 카테고리 목록
  SELECT COALESCE(jsonb_agg(row_to_json(c.*) ORDER BY c.sort_order), '[]'::jsonb)
  INTO v_categories
  FROM language_categories c;
  
  -- 전체 키 수
  SELECT COUNT(*) INTO v_total_keys FROM language_keys;
  
  RETURN jsonb_build_object(
    'languages', v_languages,
    'categories', v_categories,
    'total_keys', v_total_keys
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_langpack_key_d(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- 번역 먼저 삭제 (CASCADE가 없는 경우)
  DELETE FROM translations WHERE key_id = p_id;
  
  -- 키 삭제
  DELETE FROM language_keys WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_langpack_key_s(p_id uuid DEFAULT NULL::uuid, p_key text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_translations jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_key_id UUID;
  v_trans RECORD;
  v_existing_trans_id UUID;
BEGIN
  IF p_id IS NOT NULL THEN
    -- 수정
    UPDATE language_keys
    SET key = COALESCE(p_key, key),
        category_id = p_category_id,
        description = p_description
    WHERE id = p_id;
    
    v_key_id := p_id;
  ELSE
    -- 생성
    INSERT INTO language_keys (key, category_id, description)
    VALUES (p_key, p_category_id, p_description)
    RETURNING id INTO v_key_id;
  END IF;
  
  -- 번역 처리
  FOR v_trans IN SELECT * FROM jsonb_to_recordset(p_translations) AS x(lang_code TEXT, value TEXT)
  LOOP
    SELECT id INTO v_existing_trans_id
    FROM translations
    WHERE key_id = v_key_id AND language_code = v_trans.lang_code;
    
    IF v_existing_trans_id IS NOT NULL THEN
      UPDATE translations SET value = v_trans.value WHERE id = v_existing_trans_id;
    ELSIF v_trans.value IS NOT NULL AND v_trans.value != '' THEN
      INSERT INTO translations (key_id, language_code, value)
      VALUES (v_key_id, v_trans.lang_code, v_trans.value);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'id', v_key_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_langpack_keys_q(p_category_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_page integer DEFAULT 0, p_page_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_keys JSONB;
  v_total_count INTEGER;
  v_offset INTEGER;
BEGIN
  v_offset := p_page * p_page_size;
  
  -- 총 개수 계산
  SELECT COUNT(*)
  INTO v_total_count
  FROM language_keys lk
  WHERE (p_category_id IS NULL OR lk.category_id = p_category_id)
    AND (p_search IS NULL OR p_search = '' OR 
         lk.key ILIKE '%' || p_search || '%' OR 
         lk.description ILIKE '%' || p_search || '%');
  
  -- 키 목록 조회 (카테고리, 번역 포함) - 서브쿼리로 수정
  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'key'), '[]'::jsonb)
  INTO v_keys
  FROM (
    SELECT jsonb_build_object(
      'id', lk.id,
      'key', lk.key,
      'description', lk.description,
      'category_id', lk.category_id,
      'created_at', lk.created_at,
      'category', CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name) ELSE NULL END,
      'translations', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'language_code', t.language_code, 'value', t.value))
         FROM translations t WHERE t.key_id = lk.id),
        '[]'::jsonb
      )
    ) as row_data
    FROM language_keys lk
    LEFT JOIN language_categories c ON c.id = lk.category_id
    WHERE (p_category_id IS NULL OR lk.category_id = p_category_id)
      AND (p_search IS NULL OR p_search = '' OR 
           lk.key ILIKE '%' || p_search || '%' OR 
           lk.description ILIKE '%' || p_search || '%')
    ORDER BY lk.key
    LIMIT p_page_size OFFSET v_offset
  ) subq;
  
  RETURN jsonb_build_object(
    'keys', v_keys,
    'total_count', v_total_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_langpack_translation_s(p_key_id uuid, p_language_code text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_existing_id UUID;
BEGIN
  -- 기존 번역 확인
  SELECT id INTO v_existing_id
  FROM translations
  WHERE key_id = p_key_id AND language_code = p_language_code;
  
  IF v_existing_id IS NOT NULL THEN
    UPDATE translations SET value = p_value WHERE id = v_existing_id;
  ELSE
    INSERT INTO translations (key_id, language_code, value)
    VALUES (p_key_id, p_language_code, p_value);
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_login_logs_q(p_page integer DEFAULT 1, p_page_size integer DEFAULT 20, p_event_type text DEFAULT 'all'::text, p_days integer DEFAULT 7, p_search_email text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_offset integer := (p_page - 1) * p_page_size;
  v_total integer;
  v_logs json;
BEGIN
  -- 총 개수
  SELECT COUNT(*) INTO v_total
  FROM login_logs
  WHERE (p_event_type = 'all' OR event_type = p_event_type)
    AND (p_days = 0 OR created_at >= now() - (p_days || ' days')::interval)
    AND (p_search_email IS NULL OR p_search_email = '' OR email ILIKE '%' || p_search_email || '%');
  
  -- 로그 목록
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'event_type', event_type,
      'failure_reason', failure_reason,
      'ip_address', ip_address,
      'user_agent', user_agent,
      'device_info', device_info,
      'session_id', session_id,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::json) INTO v_logs
  FROM login_logs
  WHERE (p_event_type = 'all' OR event_type = p_event_type)
    AND (p_days = 0 OR created_at >= now() - (p_days || ' days')::interval)
    AND (p_search_email IS NULL OR p_search_email = '' OR email ILIKE '%' || p_search_email || '%')
  LIMIT p_page_size OFFSET v_offset;
  
  RETURN json_build_object(
    'logs', v_logs,
    'total', v_total,
    'page', p_page,
    'pageSize', p_page_size
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_request record;
  v_partner_id uuid;
BEGIN
  -- 신청 정보 조회
  SELECT * INTO v_request FROM partner_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'REQUEST_NOT_FOUND');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_PROCESSED');
  END IF;
  
  -- 1. 신청 상태 업데이트
  UPDATE partner_requests SET
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now()
  WHERE id = p_request_id;
  
  -- 2. 프로필 업데이트
  UPDATE profiles SET 
    user_type = 'partner',
    display_name = CASE WHEN v_request.partner_type = 'instructor' THEN v_request.display_name ELSE display_name END,
    updated_at = now()
  WHERE id = v_request.user_id;
  
  -- 3. 파트너 생성
  INSERT INTO partners (profile_id, partner_type, representative_name, phone, purpose)
  VALUES (v_request.user_id, v_request.partner_type, v_request.representative_name, v_request.phone, v_request.purpose)
  RETURNING id INTO v_partner_id;
  
  -- 4. 타입별 상세 정보 저장
  IF v_request.partner_type = 'organizer' THEN
    INSERT INTO partner_organizers (partner_id, company_name, business_number, industry, expected_scale)
    VALUES (v_partner_id, v_request.company_name, v_request.business_number, v_request.industry, v_request.expected_scale);
  ELSIF v_request.partner_type = 'agency' THEN
    INSERT INTO partner_agencies (partner_id, company_name, business_number, industry, client_type, expected_scale)
    VALUES (v_partner_id, v_request.company_name, v_request.business_number, v_request.industry, v_request.client_type, v_request.expected_scale);
  ELSIF v_request.partner_type = 'instructor' THEN
    INSERT INTO partner_instructors (partner_id, display_name, specialty, bio)
    VALUES (v_partner_id, v_request.display_name, v_request.specialty, v_request.bio);
  END IF;
  
  RETURN json_build_object('success', true, 'partner_id', v_partner_id);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE partner_requests SET
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    reject_reason = p_reason
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'REQUEST_NOT_FOUND_OR_PROCESSED');
  END IF;
  
  RETURN json_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_partner_requests_q(p_status text DEFAULT 'all'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    WITH requests_data AS (
      SELECT 
        pr.*,
        p.email
      FROM partner_requests pr
      LEFT JOIN profiles p ON p.id = pr.user_id
      WHERE p_status = 'all' OR pr.status = p_status
      ORDER BY pr.created_at DESC
    )
    SELECT json_build_object(
      'requests', COALESCE((SELECT json_agg(row_to_json(requests_data)) FROM requests_data), '[]'::json),
      'stats', json_build_object(
        'total', (SELECT COUNT(*) FROM partner_requests),
        'pending', (SELECT COUNT(*) FROM partner_requests WHERE status = 'pending'),
        'approved', (SELECT COUNT(*) FROM partner_requests WHERE status = 'approved'),
        'rejected', (SELECT COUNT(*) FROM partner_requests WHERE status = 'rejected')
      )
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  -- 파트너 조회
  SELECT profile_id INTO v_profile_id
  FROM partners WHERE id = p_partner_id;
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'PARTNER_NOT_FOUND');
  END IF;
  
  -- 파트너 상태 업데이트
  UPDATE partners SET is_active = p_activate, updated_at = now()
  WHERE id = p_partner_id;
  
  -- 프로필 user_type 업데이트
  UPDATE profiles SET 
    user_type = CASE WHEN p_activate THEN 'partner' ELSE 'user' END,
    updated_at = now()
  WHERE id = v_profile_id;
  
  RETURN json_build_object('success', true, 'is_active', p_activate);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_partners_q(p_type text DEFAULT 'all'::text, p_status text DEFAULT 'all'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    WITH 
    last_logins AS (
      SELECT DISTINCT ON (user_id) 
        user_id, 
        created_at as last_login_at
      FROM login_logs
      WHERE event_type = 'login_success'
      ORDER BY user_id, created_at DESC
    ),
    partners_data AS (
      SELECT 
        p.id,
        p.profile_id,
        p.partner_type,
        p.representative_name,
        p.phone,
        p.purpose,
        p.is_active,
        p.created_at,
        p.updated_at,
        json_build_object(
          'email', pr.email,
          'display_name', pr.display_name
        ) as profiles,
        CASE WHEN po.id IS NOT NULL THEN json_agg(json_build_object(
          'company_name', po.company_name,
          'business_number', po.business_number,
          'industry', po.industry,
          'expected_scale', po.expected_scale
        )) FILTER (WHERE po.id IS NOT NULL) END as partner_organizers,
        CASE WHEN pa.id IS NOT NULL THEN json_agg(json_build_object(
          'company_name', pa.company_name,
          'business_number', pa.business_number,
          'industry', pa.industry,
          'expected_scale', pa.expected_scale,
          'client_type', pa.client_type
        )) FILTER (WHERE pa.id IS NOT NULL) END as partner_agencies,
        CASE WHEN pi.id IS NOT NULL THEN json_agg(json_build_object(
          'specialty', pi.specialty,
          'bio', pi.bio,
          'display_name', pi.display_name
        )) FILTER (WHERE pi.id IS NOT NULL) END as partner_instructors,
        ll.last_login_at
      FROM partners p
      LEFT JOIN profiles pr ON pr.id = p.profile_id
      LEFT JOIN partner_organizers po ON po.partner_id = p.id
      LEFT JOIN partner_agencies pa ON pa.partner_id = p.id
      LEFT JOIN partner_instructors pi ON pi.partner_id = p.id
      LEFT JOIN last_logins ll ON ll.user_id = p.profile_id
      WHERE (p_type = 'all' OR p.partner_type = p_type)
        AND (p_status = 'all' OR (p_status = 'active' AND p.is_active = true) OR (p_status = 'inactive' AND p.is_active = false))
      GROUP BY p.id, pr.email, pr.display_name, po.id, pa.id, pi.id, ll.last_login_at
      ORDER BY p.created_at DESC
    )
    SELECT json_build_object(
      'partners', COALESCE((SELECT json_agg(row_to_json(partners_data)) FROM partners_data), '[]'::json),
      'stats', json_build_object(
        'total', (SELECT COUNT(*) FROM partners),
        'organizer', (SELECT COUNT(*) FROM partners WHERE partner_type = 'organizer'),
        'agency', (SELECT COUNT(*) FROM partners WHERE partner_type = 'agency'),
        'instructor', (SELECT COUNT(*) FROM partners WHERE partner_type = 'instructor'),
        'active', (SELECT COUNT(*) FROM partners WHERE is_active = true),
        'inactive', (SELECT COUNT(*) FROM partners WHERE is_active = false)
      )
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_sessions_q(p_status text DEFAULT 'all'::text, p_partner_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT json_build_object(
      'sessions', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'code', s.code,
            'status', s.status,
            'start_at', s.start_at,
            'end_at', s.end_at,
            'venue_name', s.venue_name,
            'venue_address', s.venue_address,
            'max_participants', s.max_participants,
            'participant_count', s.participant_count,
            'created_at', s.created_at,
            'partner', json_build_object(
              'id', p.id,
              'representative_name', p.representative_name,
              'partner_type', p.partner_type,
              'is_active', p.is_active,
              'profile', json_build_object(
                'email', pr.email,
                'display_name', pr.display_name
              ),
              'partner_organizers', (SELECT json_agg(row_to_json(po)) FROM partner_organizers po WHERE po.partner_id = p.id),
              'partner_agencies', (SELECT json_agg(row_to_json(pa)) FROM partner_agencies pa WHERE pa.partner_id = p.id)
            )
          ) ORDER BY s.created_at DESC
        )
        FROM sessions s
        LEFT JOIN partners p ON p.id = s.partner_id
        LEFT JOIN profiles pr ON pr.id = p.profile_id
        WHERE (p_status = 'all' OR s.status = p_status)
          AND (p_partner_id IS NULL OR s.partner_id = p_partner_id)
          AND (p_search IS NULL OR p_search = '' OR 
               s.title ILIKE '%' || p_search || '%' OR 
               s.code ILIKE '%' || p_search || '%' OR
               s.venue_name ILIKE '%' || p_search || '%')
      ), '[]'::json),
      'partners', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', p.id,
            'name', COALESCE(
              (SELECT company_name FROM partner_organizers WHERE partner_id = p.id LIMIT 1),
              (SELECT company_name FROM partner_agencies WHERE partner_id = p.id LIMIT 1),
              p.representative_name
            ),
            'type', p.partner_type
          )
        )
        FROM partners p WHERE p.is_active = true
      ), '[]'::json)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_template_d(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  DELETE FROM session_templates WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;
  
  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_template_field_d(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  DELETE FROM session_template_fields WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;
  
  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_template_field_s(p_id uuid DEFAULT NULL::uuid, p_template_id uuid DEFAULT NULL::uuid, p_field_key text DEFAULT NULL::text, p_field_name text DEFAULT NULL::text, p_field_type text DEFAULT 'image'::text, p_is_required boolean DEFAULT false, p_max_width integer DEFAULT NULL::integer, p_description text DEFAULT NULL::text, p_sort_order integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    -- 수정
    UPDATE session_template_fields SET
      field_key = COALESCE(p_field_key, field_key),
      field_name = COALESCE(p_field_name, field_name),
      field_type = COALESCE(p_field_type, field_type),
      is_required = p_is_required,
      max_width = p_max_width,
      description = p_description,
      sort_order = p_sort_order,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    -- 생성
    INSERT INTO session_template_fields (template_id, field_key, field_name, field_type, is_required, max_width, description, sort_order)
    VALUES (p_template_id, p_field_key, p_field_name, p_field_type, p_is_required, p_max_width, p_description, p_sort_order)
    RETURNING id INTO v_id;
  END IF;
  
  RETURN json_build_object('success', true, 'id', v_id);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_template_fields_q(p_template_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', f.id,
        'template_id', f.template_id,
        'field_key', f.field_key,
        'field_name', f.field_name,
        'field_type', f.field_type,
        'is_required', f.is_required,
        'max_width', f.max_width,
        'description', f.description,
        'sort_order', f.sort_order,
        'created_at', f.created_at
      ) ORDER BY f.sort_order
    ), '[]'::json)
    FROM session_template_fields f
    WHERE f.template_id = p_template_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_template_s(p_id uuid DEFAULT NULL::uuid, p_name text DEFAULT NULL::text, p_code text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_screen_type text DEFAULT 'main'::text, p_is_active boolean DEFAULT true, p_sort_order integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    -- 수정
    UPDATE session_templates SET
      name = COALESCE(p_name, name),
      code = COALESCE(p_code, code),
      description = p_description,
      is_active = p_is_active,
      sort_order = p_sort_order,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    -- 생성
    INSERT INTO session_templates (name, code, description, screen_type, is_active, sort_order)
    VALUES (p_name, p_code, p_description, p_screen_type, p_is_active, p_sort_order)
    RETURNING id INTO v_id;
  END IF;
  
  RETURN json_build_object('success', true, 'id', v_id);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_template_toggle_s(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_new_status boolean;
BEGIN
  UPDATE session_templates SET 
    is_active = NOT is_active,
    updated_at = now()
  WHERE id = p_id
  RETURNING is_active INTO v_new_status;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;
  
  RETURN json_build_object('success', true, 'is_active', v_new_status);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_templates_q(p_screen_type text DEFAULT 'main'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', t.id,
        'name', t.name,
        'code', t.code,
        'description', t.description,
        'screen_type', t.screen_type,
        'is_active', t.is_active,
        'sort_order', t.sort_order,
        'created_at', t.created_at,
        'updated_at', t.updated_at,
        'session_template_fields', (
          SELECT json_agg(json_build_object('count', cnt))
          FROM (SELECT COUNT(*) as cnt FROM session_template_fields WHERE template_id = t.id) sub
        )
      ) ORDER BY t.sort_order
    ), '[]'::json)
    FROM session_templates t
    WHERE t.screen_type = p_screen_type
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_admin_users_q()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result json;
BEGIN
  WITH 
  -- 마지막 로그인 (사용자별 최신 1개)
  last_logins AS (
    SELECT DISTINCT ON (user_id) 
      user_id, 
      created_at as last_login_at
    FROM login_logs
    WHERE event_type = 'login_success'
    ORDER BY user_id, created_at DESC
  ),
  -- 소유한 파트너 정보
  owned_partners AS (
    SELECT 
      p.profile_id,
      json_build_object(
        'id', p.id,
        'name', COALESCE(
          po.company_name,
          pa.company_name,
          p.representative_name
        ),
        'type', p.partner_type,
        'is_active', p.is_active
      ) as partner_info
    FROM partners p
    LEFT JOIN partner_organizers po ON po.partner_id = p.id
    LEFT JOIN partner_agencies pa ON pa.partner_id = p.id
  ),
  -- 소속된 파트너 정보 (멤버로)
  member_partners AS (
    SELECT 
      pm.user_id,
      json_agg(
        json_build_object(
          'id', p.id,
          'name', COALESCE(
            po.company_name,
            pa.company_name,
            p.representative_name
          ),
          'type', p.partner_type,
          'role', pm.role,
          'is_active', p.is_active
        )
      ) as partners_list
    FROM partner_members pm
    JOIN partners p ON p.id = pm.partner_id
    LEFT JOIN partner_organizers po ON po.partner_id = p.id
    LEFT JOIN partner_agencies pa ON pa.partner_id = p.id
    WHERE pm.status = 'accepted'
      AND p.profile_id != pm.user_id  -- 소유 파트너 제외
    GROUP BY pm.user_id
  ),
  -- 사용자 목록
  users_data AS (
    SELECT 
      pr.id,
      pr.email,
      pr.display_name,
      pr.user_role,
      pr.user_type,
      pr.status,
      pr.description,
      pr.created_at,
      pr.updated_at,
      ll.last_login_at,
      op.partner_info as owned_partner,
      COALESCE(mp.partners_list, '[]'::json) as member_of_partners
    FROM profiles pr
    LEFT JOIN last_logins ll ON ll.user_id = pr.id
    LEFT JOIN owned_partners op ON op.profile_id = pr.id
    LEFT JOIN member_partners mp ON mp.user_id = pr.id
    ORDER BY pr.created_at DESC
  )
  SELECT json_build_object(
    'users', (SELECT COALESCE(json_agg(row_to_json(users_data)), '[]'::json) FROM users_data),
    'stats', json_build_object(
      'total', (SELECT COUNT(*) FROM profiles),
      'active', (SELECT COUNT(*) FROM profiles WHERE status = 'active'),
      'pending', (SELECT COUNT(*) FROM profiles WHERE status = 'pending'),
      'admin', (SELECT COUNT(*) FROM profiles WHERE user_role = 'admin')
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_can_control_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND user_role = 'admin') THEN RETURN TRUE; END IF;
  IF EXISTS (SELECT 1 FROM sessions s JOIN partners p ON s.partner_id = p.id WHERE s.id = p_session_id AND p.profile_id = v_uid) THEN RETURN TRUE; END IF;
  IF EXISTS (SELECT 1 FROM session_partners sp JOIN partners p ON sp.partner_id = p.id WHERE sp.session_id = p_session_id AND sp.status = 'accepted' AND p.profile_id = v_uid) THEN RETURN TRUE; END IF;
  IF EXISTS (SELECT 1 FROM session_presenters pr JOIN partners p ON pr.partner_id = p.id WHERE pr.session_id = p_session_id AND pr.status = 'confirmed' AND p.profile_id = v_uid) THEN RETURN TRUE; END IF;
  IF EXISTS (SELECT 1 FROM session_presenters pr WHERE pr.session_id = p_session_id AND pr.status = 'confirmed' AND pr.user_id = v_uid) THEN RETURN TRUE; END IF;
  IF EXISTS (SELECT 1 FROM session_members m WHERE m.session_id = p_session_id AND m.user_id = v_uid AND m.role IN ('owner','admin','moderator','presenter')) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_check_admin_initialized_q()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  is_initialized BOOLEAN;
BEGIN
  -- app_config에서 admin_initialized 키 확인
  SELECT EXISTS (
    SELECT 1 FROM app_config 
    WHERE key = 'admin_initialized'
  ) INTO is_initialized;
  
  result := json_build_object(
    'is_initialized', is_initialized
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_init_q(p_user_id uuid DEFAULT NULL::uuid, p_language_code text DEFAULT 'ko'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'languages', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'code', l.code,
          'name', l.name,
          'native_name', l.native_name,
          'is_default', l.is_default,
          'is_active', l.is_active,
          'sort_order', l.sort_order,
          'created_at', l.created_at,
          'updated_at', l.updated_at
        ) ORDER BY l.sort_order ASC
      ), '[]'::json)
      FROM languages l
      WHERE l.is_active = true
    ),
    'userProfile', CASE
      WHEN p_user_id IS NOT NULL THEN (
        SELECT json_build_object(
          'preferred_language', p.preferred_language
        )
        FROM profiles p
        WHERE p.id = p_user_id
      )
      ELSE NULL
    END,
    'themeSettings', CASE
      WHEN p_user_id IS NOT NULL THEN (
        SELECT json_build_object(
          'user_id', uts.user_id,
          'mode', uts.mode,
          'preset', uts.preset,
          'custom_colors', uts.custom_colors,
          'font_size', uts.font_size,
          'created_at', uts.created_at,
          'updated_at', uts.updated_at
        )
        FROM user_theme_settings uts
        WHERE uts.user_id = p_user_id
      )
      ELSE NULL
    END,
    'translations', (
      SELECT COALESCE(json_object_agg(lk.key, t.value), '{}'::json)
      FROM language_keys lk
      JOIN translations t ON t.key_id = lk.id
      WHERE t.language_code = p_language_code
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_instructor_profile_q(p_profile_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- 이메일 중복 체크
  IF EXISTS(SELECT 1 FROM anonymous_participants WHERE session_id = p_session_id AND email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'EMAIL_DUPLICATE');
  END IF;
  
  -- 전화번호 중복 체크
  IF EXISTS(SELECT 1 FROM anonymous_participants WHERE session_id = p_session_id AND phone = p_phone) THEN
    RETURN json_build_object('success', false, 'error', 'PHONE_DUPLICATE');
  END IF;
  
  -- 익명 참여자 추가
  INSERT INTO anonymous_participants (session_id, name, email, phone)
  VALUES (p_session_id, p_name, p_email, p_phone);
  
  -- 참여자 수 증가
  UPDATE sessions SET participant_count = participant_count + 1 WHERE id = p_session_id;
  
  RETURN json_build_object('success', true);

EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'DUPLICATE');
WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- 이미 참여 중인지 확인
  IF EXISTS(SELECT 1 FROM session_members WHERE session_id = p_session_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_PARTICIPATING');
  END IF;
  
  -- 세션 멤버 추가
  INSERT INTO session_members (session_id, user_id, role, assigned_by)
  VALUES (p_session_id, p_user_id, 'participant', p_user_id);
  
  -- 참여자 수 증가
  UPDATE sessions SET participant_count = participant_count + 1 WHERE id = p_session_id;
  
  RETURN json_build_object('success', true);

EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'ALREADY_PARTICIPATING');
WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_join_session_q(p_code text, p_user_id uuid DEFAULT NULL::uuid, p_is_preview boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_session record;
  v_assets json;
  v_is_participating boolean := false;
  v_is_owner boolean := false;
BEGIN
  -- 세션 정보 조회
  SELECT 
    s.*,
    row_to_json(st.*) as template,
    p.profile_id as partner_profile_id
  INTO v_session
  FROM sessions s
  LEFT JOIN session_templates st ON st.id = s.template_id
  LEFT JOIN partners p ON p.id = s.partner_id
  WHERE s.code = UPPER(p_code)
    AND (p_is_preview = true OR s.status IN ('published', 'active'));
  
  IF v_session IS NULL THEN
    RETURN json_build_object('error', 'NOT_FOUND');
  END IF;
  
  -- 에셋 로드
  SELECT COALESCE(json_object_agg(field_key, row_to_json(sa)), '{}'::json) INTO v_assets
  FROM session_assets sa
  WHERE sa.session_id = v_session.id;
  
  -- 참여 여부 확인 (로그인한 사용자만)
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM session_members 
      WHERE session_id = v_session.id AND user_id = p_user_id
    ) INTO v_is_participating;
    
    -- 소유자 여부 확인
    v_is_owner := (v_session.partner_profile_id = p_user_id);
  END IF;
  
  RETURN json_build_object(
    'session', json_build_object(
      'id', v_session.id,
      'code', v_session.code,
      'title', v_session.title,
      'description', v_session.description,
      'status', v_session.status,
      'start_at', v_session.start_at,
      'end_at', v_session.end_at,
      'venue_name', v_session.venue_name,
      'venue_address', v_session.venue_address,
      'max_participants', v_session.max_participants,
      'participant_count', v_session.participant_count,
      'contact_phone', v_session.contact_phone,
      'contact_email', v_session.contact_email,
      'created_at', v_session.created_at
    ),
    'template', v_session.template,
    'assets', v_assets,
    'isParticipating', v_is_participating,
    'isOwner', v_is_owner
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- 세션 멤버에서 제거
  DELETE FROM session_members 
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NOT_PARTICIPATING');
  END IF;
  
  -- 참여자 수 감소
  UPDATE sessions SET participant_count = GREATEST(0, participant_count - 1) WHERE id = p_session_id;
  
  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_attendance_q(p_code text, p_key text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_attendance_s(p_code text, p_key text, p_name text, p_affiliation text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_broadcast_q(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF v_session.broadcast_mode = 'pdf' AND v_session.broadcast_pdf_id IS NOT NULL THEN
    SELECT json_build_object('id', id, 'title', title, 'file_url', file_url, 'page_count', page_count, 'page', v_session.broadcast_pdf_page)
    INTO v_pdf FROM lecture_files WHERE id = v_session.broadcast_pdf_id;
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_certificate_s(p_code text, p_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_design_q(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_design JSONB; v_version INTEGER;
BEGIN
  SELECT d.published, d.version INTO v_design, v_version
  FROM session_designs d JOIN sessions s ON s.id = d.session_id
  WHERE s.code = p_code AND s.status IN ('published', 'active', 'ended');
  IF v_design IS NULL THEN
    RETURN json_build_object('success', true, 'design', NULL);
  END IF;
  RETURN json_build_object('success', true, 'design', v_design, 'version', v_version);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_feedback_s(p_code text, p_key text, p_rating integer, p_comment text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_qna_q(p_code text, p_token text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_state_q(p_code text, p_cues_rev bigint DEFAULT NULL::bigint)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_session sessions%ROWTYPE;
  v_pdf JSON;
  v_question JSON;
  v_categories JSON;
  v_active_poll_id UUID;
  v_poll_results JSON;
  v_cues JSON;
  v_design_version INTEGER;
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

  -- [021] 게시 디자인 버전 (없으면 null) — 개인화 아님, 캐시 가능성 보존
  SELECT d.version INTO v_design_version
  FROM session_designs d WHERE d.session_id = v_session.id AND d.published IS NOT NULL;

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
    'design_version', v_design_version,
    'participant_count', v_session.participant_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_live_timer_q(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_login_attempt_c(p_email text, p_ip_address text)
 RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone, attempt_count integer, remaining_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt RECORD;
  v_max_attempts INTEGER := 5;
  v_lockout_minutes INTEGER := 15;
BEGIN
  SELECT * INTO v_attempt
  FROM public.login_attempts la
  WHERE la.email = p_email AND la.ip_address = p_ip_address;
  
  IF v_attempt IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0;
    RETURN;
  END IF;
  
  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > now() THEN
    RETURN QUERY SELECT 
      TRUE,
      v_attempt.locked_until,
      v_attempt.attempt_count,
      EXTRACT(EPOCH FROM (v_attempt.locked_until - now()))::INTEGER;
    RETURN;
  END IF;
  
  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until <= now() THEN
    DELETE FROM public.login_attempts
    WHERE email = p_email AND ip_address = p_ip_address;
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0;
    RETURN;
  END IF;
  
  IF v_attempt.last_attempt_at < now() - INTERVAL '1 hour' THEN
    DELETE FROM public.login_attempts
    WHERE email = p_email AND ip_address = p_ip_address;
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    FALSE,
    NULL::TIMESTAMPTZ,
    v_attempt.attempt_count,
    0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_login_attempt_clear_s(p_email text, p_ip_address text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.login_attempts
  WHERE email = p_email AND ip_address = p_ip_address;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_device_info jsonb DEFAULT '{}'::jsonb, p_session_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  INSERT INTO public.login_logs (
    user_id, email, event_type, failure_reason,
    ip_address, user_agent, device_info, session_id
  ) VALUES (
    v_user_id, p_email, p_event_type, p_failure_reason,
    p_ip_address, p_user_agent, p_device_info, p_session_id
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_login_failure_s(p_email text, p_ip_address text)
 RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone, attempt_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_attempts INTEGER := 5;
  v_lockout_minutes INTEGER := 15;
  v_attempt RECORD;
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, attempt_count, last_attempt_at)
  VALUES (p_email, p_ip_address, 1, now())
  ON CONFLICT (email, ip_address) DO UPDATE SET
    attempt_count = login_attempts.attempt_count + 1,
    last_attempt_at = now(),
    locked_until = CASE 
      WHEN login_attempts.attempt_count + 1 >= v_max_attempts 
      THEN now() + (v_lockout_minutes || ' minutes')::INTERVAL
      ELSE login_attempts.locked_until
    END
  RETURNING * INTO v_attempt;
  
  RETURN QUERY SELECT 
    v_attempt.attempt_count >= v_max_attempts,
    v_attempt.locked_until,
    v_attempt.attempt_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_apply_s(p_partner_type text DEFAULT 'organizer'::text, p_representative_name text DEFAULT NULL::text, p_company_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_purpose text DEFAULT NULL::text, p_business_number text DEFAULT NULL::text, p_industry text DEFAULT NULL::text, p_expected_scale text DEFAULT NULL::text, p_client_type text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_bio text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         UUID := auth.uid();
  v_profile     RECORD;
  v_partner     RECORD;
  v_last_status TEXT;
  v_type        TEXT := COALESCE(NULLIF(btrim(p_partner_type), ''), 'organizer');
  v_name        TEXT := NULLIF(btrim(COALESCE(p_representative_name, '')), '');
  v_company     TEXT := NULLIF(btrim(COALESCE(p_company_name, '')), '');
  v_display     TEXT := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  v_phone       TEXT := btrim(COALESCE(p_phone, ''));
  v_purpose     TEXT := btrim(COALESCE(p_purpose, ''));
  v_request_id  UUID;
  v_partner_id  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT id, user_role, user_type, status INTO v_profile
    FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;
  IF v_profile.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'account_suspended');
  END IF;

  IF v_type NOT IN ('organizer', 'agency', 'instructor') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_partner_type');
  END IF;
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_required');
  END IF;
  IF v_type IN ('organizer', 'agency') AND v_company IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'company_required');
  END IF;
  IF v_type = 'instructor' AND v_display IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'display_name_required');
  END IF;

  -- 이미 파트너면 새로 만들지 않는다(정지된 파트너는 스스로 되살릴 수 없다).
  SELECT id, is_active INTO v_partner FROM public.partners WHERE profile_id = v_uid;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', v_partner.is_active,
      'status', 'approved',
      'partner_id', v_partner.id,
      'already_partner', true,
      'error', CASE WHEN v_partner.is_active THEN NULL ELSE 'partner_inactive' END
    );
  END IF;

  SELECT status INTO v_last_status
    FROM public.partner_requests
   WHERE user_id = v_uid
   ORDER BY created_at DESC
   LIMIT 1;

  -- 심사 대기 중인 신청이 이미 있으면 그대로 둔다(기존 행은 건드리지 않는다 — 관리자가 승인한다).
  IF v_last_status = 'pending' THEN
    RETURN jsonb_build_object('success', true, 'status', 'pending', 'already_requested', true);
  END IF;

  -- 관리자가 반려한 적이 있는 사람은 자동 승인하지 않는다 — 다시 낸 신청은 관리자 심사로 간다.
  IF v_last_status = 'rejected' THEN
    INSERT INTO public.partner_requests (
      user_id, partner_type, representative_name, phone, purpose,
      company_name, business_number, industry, expected_scale, client_type,
      display_name, specialty, bio, status
    ) VALUES (
      v_uid, v_type, v_name, v_phone, v_purpose,
      v_company, NULLIF(btrim(COALESCE(p_business_number, '')), ''),
      NULLIF(btrim(COALESCE(p_industry, '')), ''), NULLIF(btrim(COALESCE(p_expected_scale, '')), ''),
      NULLIF(btrim(COALESCE(p_client_type, '')), ''),
      v_display, NULLIF(btrim(COALESCE(p_specialty, '')), ''), NULLIF(btrim(COALESCE(p_bio, '')), ''),
      'pending'
    ) RETURNING id INTO v_request_id;

    RETURN jsonb_build_object('success', true, 'status', 'pending', 'request_id', v_request_id);
  END IF;

  -- 즉시 승인: 신청 기록(approved, 검토자 없음 = 자동) + 파트너 + 유형별 상세 + 회원 유형
  INSERT INTO public.partner_requests (
    user_id, partner_type, representative_name, phone, purpose,
    company_name, business_number, industry, expected_scale, client_type,
    display_name, specialty, bio, status, reviewed_by, reviewed_at
  ) VALUES (
    v_uid, v_type, v_name, v_phone, v_purpose,
    v_company, NULLIF(btrim(COALESCE(p_business_number, '')), ''),
    NULLIF(btrim(COALESCE(p_industry, '')), ''), NULLIF(btrim(COALESCE(p_expected_scale, '')), ''),
    NULLIF(btrim(COALESCE(p_client_type, '')), ''),
    v_display, NULLIF(btrim(COALESCE(p_specialty, '')), ''), NULLIF(btrim(COALESCE(p_bio, '')), ''),
    'approved', NULL, now()
  ) RETURNING id INTO v_request_id;

  -- partners INSERT 트리거(add_owner_after_partner_created)가 본인을 owner 멤버로 넣는다.
  INSERT INTO public.partners (profile_id, partner_type, representative_name, phone, purpose, is_active)
  VALUES (v_uid, v_type, v_name, v_phone, NULLIF(v_purpose, ''), true)
  RETURNING id INTO v_partner_id;

  IF v_type = 'organizer' THEN
    INSERT INTO public.partner_organizers (partner_id, company_name, business_number, industry, expected_scale)
    VALUES (
      v_partner_id, v_company, NULLIF(btrim(COALESCE(p_business_number, '')), ''),
      NULLIF(btrim(COALESCE(p_industry, '')), ''), NULLIF(btrim(COALESCE(p_expected_scale, '')), '')
    );
  ELSIF v_type = 'agency' THEN
    -- partner_agencies.business_number 는 NOT NULL 이라 비어 있으면 빈 문자열로 둔다(나중에 프로필에서 채운다).
    INSERT INTO public.partner_agencies (partner_id, company_name, business_number, industry, client_type, expected_scale)
    VALUES (
      v_partner_id, v_company, btrim(COALESCE(p_business_number, '')),
      NULLIF(btrim(COALESCE(p_industry, '')), ''), NULLIF(btrim(COALESCE(p_client_type, '')), ''),
      NULLIF(btrim(COALESCE(p_expected_scale, '')), '')
    );
  ELSE
    INSERT INTO public.partner_instructors (partner_id, display_name, specialty, bio)
    VALUES (
      v_partner_id, v_display,
      NULLIF(btrim(COALESCE(p_specialty, '')), ''), NULLIF(btrim(COALESCE(p_bio, '')), '')
    );
  END IF;

  -- 일반 회원만 파트너로 올린다(관리자 유형은 그대로).
  UPDATE public.profiles SET user_type = 'partner'
   WHERE id = v_uid AND user_type = 'user';

  RETURN jsonb_build_object(
    'success', true,
    'status', 'approved',
    'request_id', v_request_id,
    'partner_id', v_partner_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_attendance_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

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

CREATE OR REPLACE FUNCTION public.sp_partner_broadcast_settings_q(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(broadcast_settings, '{}'::jsonb)
    FROM sessions
    WHERE id = p_session_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_broadcast_settings_s(p_session_id uuid, p_settings jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE sessions
  SET broadcast_settings = p_settings,
      updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_broadcast_state_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_collaboration_q(p_partner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', pm.id,
        'user_id', pm.user_id,
        'email', pm.email,
        'role', pm.role,
        'status', pm.status,
        'profile', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object(
          'display_name', p.display_name,
          'email', p.email
        ) ELSE NULL END,
        'invited_at', pm.invited_at,
        'accepted_at', pm.accepted_at
      )
    ), '[]'::jsonb)
    FROM partner_members pm
    LEFT JOIN profiles p ON p.id = pm.user_id
    WHERE pm.partner_id = p_partner_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  -- 세션 협업 정보 조회: 세션 소유자, 초대된 파트너, 강사, 팀원
  SELECT json_build_object(
    'session_owner', (
      SELECT json_build_object(
        'id', p.id,
        'representative_name', p.representative_name,
        'partner_type', p.partner_type,
        'phone', p.phone
      )
      FROM sessions s
      JOIN partners p ON p.id = s.partner_id
      WHERE s.id = p_session_id
    ),
    'invited_partner', (
      SELECT json_build_object(
        'id', p.id,
        'representative_name', p.representative_name,
        'partner_type', p.partner_type,
        'status', sp.status,
        'invited_at', sp.invited_at,
        'responded_at', sp.responded_at
      )
      FROM session_partners sp
      JOIN partners p ON p.id = sp.partner_id
      WHERE sp.session_id = p_session_id
      LIMIT 1
    ),
    'presenters', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', sp.id,
          'presenter_type', sp.presenter_type,
          'display_name', sp.display_name,
          'display_title', sp.display_title,
          'status', sp.status,
          'user_id', sp.user_id,
          'partner_id', sp.partner_id,
          'manual_name', sp.manual_name,
          'manual_title', sp.manual_title,
          'manual_bio', sp.manual_bio,
          'manual_image', sp.manual_image
        )
        ORDER BY sp.display_order
      ), '[]'::json)
      FROM session_presenters sp
      WHERE sp.session_id = p_session_id
    ),
    'team_members', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', pm.id,
          'email', pm.email,
          'role', pm.role,
          'status', pm.status,
          'user_id', pm.user_id,
          'display_name', COALESCE(prof.display_name, pm.email),
          'invited_at', pm.invited_at,
          'accepted_at', pm.accepted_at
        )
      ), '[]'::json)
      FROM partner_members pm
      LEFT JOIN profiles prof ON prof.id = pm.user_id
      WHERE pm.partner_id = p_partner_id
        AND pm.status = 'accepted'
    )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, '{}'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_cue_broadcast_s(p_session_id uuid, p_cue_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_cue_s(p_action text, p_session_id uuid, p_cue_id uuid DEFAULT NULL::uuid, p_presenter_id uuid DEFAULT NULL::uuid, p_cue_type text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_lecture_file_id uuid DEFAULT NULL::uuid, p_start_page integer DEFAULT NULL::integer, p_poll_id uuid DEFAULT NULL::uuid, p_qna_category_id uuid DEFAULT NULL::uuid, p_notice_text text DEFAULT NULL::text, p_display_order integer DEFAULT NULL::integer, p_orders jsonb DEFAULT NULL::jsonb, p_set_schedule boolean DEFAULT false, p_planned_start_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_duration_min integer DEFAULT NULL::integer, p_is_public boolean DEFAULT NULL::boolean, p_public_title text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      poll_id, qna_category_id, notice_text, display_order,
      planned_start_at, duration_min, is_public, public_title
    ) VALUES (
      p_session_id, p_presenter_id, p_cue_type, p_title, p_lecture_file_id, COALESCE(p_start_page, 1),
      p_poll_id, p_qna_category_id, p_notice_text, COALESCE(p_display_order, v_next),
      CASE WHEN p_set_schedule THEN p_planned_start_at ELSE NULL END,
      CASE WHEN p_set_schedule THEN p_duration_min ELSE NULL END,
      CASE WHEN p_set_schedule THEN COALESCE(p_is_public, true) ELSE true END,
      CASE WHEN p_set_schedule THEN p_public_title ELSE NULL END
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
      display_order   = COALESCE(p_display_order, display_order),
      planned_start_at = CASE WHEN p_set_schedule THEN p_planned_start_at ELSE planned_start_at END,
      duration_min     = CASE WHEN p_set_schedule THEN p_duration_min ELSE duration_min END,
      is_public        = CASE WHEN p_set_schedule THEN COALESCE(p_is_public, is_public) ELSE is_public END,
      public_title     = CASE WHEN p_set_schedule THEN p_public_title ELSE public_title END
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_cues_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    'display_order', c.display_order,
    'planned_start_at', c.planned_start_at,
    'duration_min', c.duration_min,
    'is_public', c.is_public,
    'public_title', c.public_title
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_dashboard_q(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_partner_id UUID;
  v_result JSON;
  v_total_sessions INT;
  v_active_sessions INT;
  v_total_participants INT;
  v_total_questions INT;
  v_total_polls INT;
  v_avg_participation NUMERIC;
  v_week_ago TIMESTAMPTZ;
  v_two_weeks_ago TIMESTAMPTZ;
BEGIN
  -- 날짜 계산
  v_week_ago := NOW() - INTERVAL '7 days';
  v_two_weeks_ago := NOW() - INTERVAL '14 days';
  
  -- 파트너 ID 조회
  SELECT p.id INTO v_partner_id 
  FROM partners p 
  WHERE p.profile_id = p_user_id;
  
  -- 파트너가 아닌 경우 에러 반환
  IF v_partner_id IS NULL THEN 
    RETURN json_build_object(
      'error', 'PARTNER_NOT_FOUND',
      'message', '파트너 정보를 찾을 수 없습니다.'
    ); 
  END IF;
  
  -- 기본 통계 계산
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COALESCE(SUM(participant_count), 0),
    COALESCE(ROUND(AVG(participant_count)), 0)
  INTO 
    v_total_sessions,
    v_active_sessions,
    v_total_participants,
    v_avg_participation
  FROM sessions 
  WHERE partner_id = v_partner_id;
  
  -- 질문 수 계산
  SELECT COUNT(*) INTO v_total_questions
  FROM questions q 
  JOIN sessions s ON q.session_id = s.id 
  WHERE s.partner_id = v_partner_id;
  
  -- 투표 수 계산
  SELECT COUNT(*) INTO v_total_polls
  FROM polls p 
  JOIN sessions s ON p.session_id = s.id 
  WHERE s.partner_id = v_partner_id;
  
  -- JSON 결과 생성
  v_result := json_build_object(
    'stats', json_build_object(
      'totalSessions', v_total_sessions,
      'activeSessions', v_active_sessions,
      'totalParticipants', v_total_participants,
      'totalQuestions', v_total_questions,
      'totalPolls', v_total_polls,
      'avgParticipation', v_avg_participation,
      'weeklyChange', json_build_object(
        'sessions', (
          SELECT COUNT(*) 
          FROM sessions 
          WHERE partner_id = v_partner_id 
            AND created_at >= v_week_ago
        ),
        'participants', (
          SELECT COALESCE(SUM(participant_count), 0)
          FROM sessions 
          WHERE partner_id = v_partner_id 
            AND created_at >= v_week_ago
        ),
        'questions', (
          SELECT COUNT(*) 
          FROM questions q 
          JOIN sessions s ON q.session_id = s.id 
          WHERE s.partner_id = v_partner_id 
            AND q.created_at >= v_week_ago
        )
      )
    ),
    'recentSessions', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', s.id, 
          'title', s.title, 
          'code', s.code, 
          'status', s.status,
          'start_at', s.start_at, 
          'created_at', s.created_at,
          'count', s.participant_count
        ) ORDER BY s.created_at DESC
      ), '[]'::json)
      FROM sessions s 
      WHERE s.partner_id = v_partner_id 
      LIMIT 5
    ),
    'dailyActivity', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', activity_date,
          'label', TO_CHAR(activity_date, 'MM/DD'),
          'participants', COALESCE(participants, 0),
          'questions', COALESCE(questions, 0),
          'sessions', COALESCE(sessions, 0)
        ) ORDER BY activity_date
      ), '[]'::json)
      FROM (
        SELECT 
          d.date::date AS activity_date,
          COUNT(DISTINCT s.id) AS sessions,
          COALESCE(SUM(s.participant_count), 0) AS participants,
          COUNT(DISTINCT q.id) AS questions
        FROM generate_series(
          v_two_weeks_ago::date, 
          CURRENT_DATE, 
          '1 day'::interval
        ) AS d(date)
        LEFT JOIN sessions s ON s.partner_id = v_partner_id 
          AND s.start_at::date = d.date::date
        LEFT JOIN questions q ON q.session_id = s.id 
          AND q.created_at::date = d.date::date
        GROUP BY d.date
        ORDER BY d.date
      ) daily_data
    ),
    'sessionPerformance', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'name', SUBSTRING(title, 1, 20),
          'fullName', title,
          'participants', participant_count,
          'questions', question_count,
          'polls', poll_count
        )
      ), '[]'::json)
      FROM (
        SELECT 
          s.title,
          s.participant_count,
          COUNT(DISTINCT q.id) AS question_count,
          COUNT(DISTINCT p.id) AS poll_count
        FROM sessions s
        LEFT JOIN questions q ON q.session_id = s.id
        LEFT JOIN polls p ON p.session_id = s.id
        WHERE s.partner_id = v_partner_id
          AND s.status IN ('active', 'completed')
        GROUP BY s.id, s.title, s.participant_count
        ORDER BY s.participant_count DESC
        LIMIT 5
      ) performance_data
    )
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_design_s(p_session_id uuid, p_action text, p_design jsonb DEFAULT NULL::jsonb, p_version integer DEFAULT NULL::integer, p_history_index integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row session_designs%ROWTYPE;
  v_scene RECORD;
  v_sections JSONB;
  v_join_count INTEGER;
  v_bad_link INTEGER;
  v_restored JSONB;
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_row FROM session_designs WHERE session_id = p_session_id;

  IF p_action = 'save_draft' OR p_action = 'publish' THEN
    IF p_design IS NOT NULL THEN
      IF NOT (p_design ? 'scenes') THEN
        RETURN json_build_object('success', false, 'error', 'invalid_design');
      END IF;
      IF pg_column_size(p_design) > 262144 THEN
        RETURN json_build_object('success', false, 'error', 'design_too_large');
      END IF;

      -- [022] 전 장면 공통 검증: 섹션 수 상한 + 링크 URL 스킴 화이트리스트
      FOR v_scene IN SELECT key AS scene_key, value AS scene_val FROM jsonb_each(p_design -> 'scenes') LOOP
        v_sections := v_scene.scene_val -> 'sections';
        IF v_sections IS NOT NULL THEN
          IF jsonb_array_length(v_sections) > 12 THEN
            RETURN json_build_object('success', false, 'error', 'too_many_sections', 'scene', v_scene.scene_key);
          END IF;
          -- javascript: 등 위험 스킴 차단 (settings.link — 저장형 XSS 방어)
          SELECT COUNT(*) INTO v_bad_link FROM jsonb_array_elements(v_sections) e
            WHERE COALESCE(e->'settings'->>'link', '') <> ''
              AND e->'settings'->>'link' !~* '^https?://';
          IF v_bad_link > 0 THEN
            RETURN json_build_object('success', false, 'error', 'invalid_link_scheme');
          END IF;
        END IF;
      END LOOP;

      -- [022] enter 장면 필수 + joinCard 정확히 1개 (누락 시 우회 불가)
      v_sections := p_design -> 'scenes' -> 'enter' -> 'sections';
      IF v_sections IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'enter_scene_required');
      END IF;
      SELECT COUNT(*) INTO v_join_count FROM jsonb_array_elements(v_sections) e
        WHERE e->>'type' = 'joinCard' AND COALESCE((e->>'hidden')::boolean, false) = false;
      IF v_join_count <> 1 THEN
        RETURN json_build_object('success', false, 'error', 'join_card_required');
      END IF;
    END IF;
    IF p_version IS NOT NULL AND v_row.session_id IS NOT NULL AND v_row.version <> p_version THEN
      RETURN json_build_object('success', false, 'error', 'version_conflict', 'server_version', v_row.version);
    END IF;
  END IF;

  IF p_action = 'save_draft' THEN
    IF p_design IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'design_required');
    END IF;
    INSERT INTO session_designs (session_id, draft, version, updated_at)
    VALUES (p_session_id, p_design, 1, now())
    ON CONFLICT (session_id) DO UPDATE
      SET draft = EXCLUDED.draft, version = session_designs.version + 1, updated_at = now();
    RETURN json_build_object('success', true, 'version',
      (SELECT version FROM session_designs WHERE session_id = p_session_id));

  ELSIF p_action = 'publish' THEN
    IF COALESCE(p_design, v_row.draft) IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'nothing_to_publish');
    END IF;
    INSERT INTO session_designs (session_id, draft, published, version, published_at, history, updated_at)
    VALUES (p_session_id, COALESCE(p_design, v_row.draft), COALESCE(p_design, v_row.draft), 1, now(), '[]'::jsonb, now())
    ON CONFLICT (session_id) DO UPDATE SET
      history = CASE WHEN session_designs.published IS NOT NULL
        THEN (jsonb_build_array(jsonb_build_object('at', session_designs.published_at, 'design', session_designs.published))
              || session_designs.history) #> '{}' ELSE session_designs.history END,
      published = COALESCE(EXCLUDED.draft, session_designs.draft),
      draft = COALESCE(EXCLUDED.draft, session_designs.draft),
      version = session_designs.version + 1,
      published_at = now(),
      updated_at = now();
    UPDATE session_designs SET history = (
      SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM (
        SELECT e FROM jsonb_array_elements(history) WITH ORDINALITY t(e, i) WHERE i <= 3
      ) s
    ) WHERE session_id = p_session_id;
    RETURN json_build_object('success', true, 'published_at', now(), 'version',
      (SELECT version FROM session_designs WHERE session_id = p_session_id));

  ELSIF p_action = 'unpublish' THEN
    UPDATE session_designs SET published = NULL, version = version + 1, updated_at = now()
      WHERE session_id = p_session_id;
    RETURN json_build_object('success', true);

  ELSIF p_action = 'restore' THEN
    v_restored := v_row.history -> COALESCE(p_history_index, 0) -> 'design';
    IF v_restored IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'history_not_found');
    END IF;
    UPDATE session_designs SET draft = v_restored, version = version + 1, updated_at = now()
      WHERE session_id = p_session_id;
    RETURN json_build_object('success', true, 'draft', v_restored, 'version',
      (SELECT version FROM session_designs WHERE session_id = p_session_id));

  ELSIF p_action = 'get' THEN
    RETURN json_build_object('success', true,
      'draft', v_row.draft, 'published', v_row.published,
      'version', COALESCE(v_row.version, 0),
      'published_at', v_row.published_at,
      'history', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('at', e->'at')) FROM jsonb_array_elements(v_row.history) e
      ), '[]'::jsonb));
  END IF;

  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_faqs_q(p_category text DEFAULT 'all'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', f.id,
        'category', f.category,
        'question', f.question,
        'answer', f.answer,
        'display_order', f.display_order
      ) ORDER BY f.display_order, f.created_at
    ), '[]'::json)
    FROM faqs f
    WHERE f.is_active = true
      AND (p_category = 'all' OR f.category = p_category)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_info_q(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  v_partner_id UUID;
  v_partner_type TEXT;
BEGIN
  SELECT p.id, p.partner_type INTO v_partner_id, v_partner_type
  FROM partners p WHERE p.profile_id = p_user_id;
  
  IF v_partner_id IS NULL THEN RETURN NULL; END IF;
  
  SELECT json_build_object(
    'partner', (
      SELECT json_build_object(
        'id', p.id, 'profile_id', p.profile_id, 'partner_type', p.partner_type,
        'representative_name', p.representative_name, 'phone', p.phone,
        'purpose', p.purpose, 'is_active', p.is_active,
        'created_at', p.created_at, 'updated_at', p.updated_at,
        'profiles', json_build_object('email', prof.email, 'display_name', prof.display_name)
      )
      FROM partners p JOIN profiles prof ON p.profile_id = prof.id WHERE p.id = v_partner_id
    ),
    'details', (
      SELECT CASE
        WHEN v_partner_type = 'organizer' THEN (SELECT row_to_json(po.*) FROM partner_organizers po WHERE po.partner_id = v_partner_id)
        WHEN v_partner_type = 'agency' THEN (SELECT row_to_json(pa.*) FROM partner_agencies pa WHERE pa.partner_id = v_partner_id)
        WHEN v_partner_type = 'instructor' THEN (SELECT row_to_json(pi.*) FROM partner_instructors pi WHERE pi.partner_id = v_partner_id)
        ELSE NULL
      END
    ),
    'myRole', (
      SELECT COALESCE(pm.role, 'owner')
      FROM partner_members pm
      WHERE pm.partner_id = v_partner_id AND pm.user_id = p_user_id LIMIT 1
    )
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_inquiries_q(p_partner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', i.id,
        'category', i.category,
        'title', i.title,
        'content', i.content,
        'status', i.status,
        'created_at', i.created_at,
        'reply_count', (SELECT COUNT(*) FROM inquiry_replies WHERE inquiry_id = i.id)
      ) ORDER BY i.created_at DESC
    ), '[]'::json)
    FROM inquiries i
    WHERE i.partner_id = p_partner_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_inquiry_replies_q(p_inquiry_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', ir.id,
        'content', ir.content,
        'is_admin', ir.is_admin,
        'created_at', ir.created_at,
        'author_name', CASE 
          WHEN ir.is_admin THEN '관리자'
          ELSE p.display_name
        END
      ) ORDER BY ir.created_at
    ), '[]'::json)
    FROM inquiry_replies ir
    LEFT JOIN profiles p ON p.id = ir.user_id
    WHERE ir.inquiry_id = p_inquiry_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_inquiry_s(p_action text, p_partner_id uuid DEFAULT NULL::uuid, p_category text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_inquiry_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_is_admin boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inquiry_id UUID;
  v_reply_id UUID;
BEGIN
  IF p_action = 'create_inquiry' THEN
    INSERT INTO inquiries (partner_id, category, title, content, status)
    VALUES (p_partner_id, p_category, p_title, p_content, 'pending')
    RETURNING id INTO v_inquiry_id;
    
    RETURN json_build_object('success', true, 'inquiry_id', v_inquiry_id);
    
  ELSIF p_action = 'create_reply' THEN
    INSERT INTO inquiry_replies (inquiry_id, user_id, content, is_admin)
    VALUES (p_inquiry_id, p_user_id, p_content, p_is_admin)
    RETURNING id INTO v_reply_id;
    
    -- 문의 상태 업데이트
    UPDATE inquiries SET
      status = CASE WHEN p_is_admin THEN 'answered' ELSE status END,
      updated_at = NOW()
    WHERE id = p_inquiry_id;
    
    RETURN json_build_object('success', true, 'reply_id', v_reply_id);
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_session_id UUID;
  v_invitee_id UUID;
BEGIN
  -- 초대 정보 조회
  SELECT session_id, invitee_id INTO v_session_id, v_invitee_id
  FROM session_invitations
  WHERE id = p_invite_id;
  
  IF v_session_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'INVITE_NOT_FOUND');
  END IF;
  
  IF p_accept THEN
    -- 수락: 협업자로 추가
    UPDATE session_invitations SET
      status = 'accepted',
      responded_at = NOW()
    WHERE id = p_invite_id;
    
    INSERT INTO session_collaborators (session_id, collaborator_id, status)
    VALUES (v_session_id, v_invitee_id, 'active')
    ON CONFLICT (session_id, collaborator_id) DO NOTHING;
    
  ELSE
    -- 거절
    UPDATE session_invitations SET
      status = 'rejected',
      reject_reason = p_reject_reason,
      responded_at = NOW()
    WHERE id = p_invite_id;
  END IF;
  
  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_invitations_q(p_partner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN json_build_object(
    'received', (
      -- 받은 초대: 다른 파트너가 생성한 세션에 초대받은 경우
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', sp.id,
          'session_id', sp.session_id,
          'session_title', s.title,
          'inviter_name', p_inv.representative_name,
          'status', sp.status,
          'invited_at', sp.invited_at,
          'responded_at', sp.responded_at,
          'reject_reason', sp.reject_reason
        ) ORDER BY sp.invited_at DESC
      ), '[]'::json)
      FROM session_partners sp
      JOIN sessions s ON s.id = sp.session_id
      JOIN partners p_inv ON p_inv.id = s.partner_id
      WHERE sp.partner_id = p_partner_id
    ),
    'sent', (
      -- 보낸 초대: 내가 생성한 세션에 다른 파트너를 초대한 경우
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', sp.id,
          'session_id', sp.session_id,
          'session_title', s.title,
          'invitee_name', p_invitee.representative_name,
          'status', sp.status,
          'invited_at', sp.invited_at,
          'responded_at', sp.responded_at,
          'reject_reason', sp.reject_reason
        ) ORDER BY sp.invited_at DESC
      ), '[]'::json)
      FROM session_partners sp
      JOIN sessions s ON s.id = sp.session_id
      JOIN partners p_invitee ON p_invitee.id = sp.partner_id
      WHERE s.partner_id = p_partner_id
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_lecture_s(p_action text, p_session_id uuid, p_lecture_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text, p_file_url text DEFAULT NULL::text, p_file_path text DEFAULT NULL::text, p_page_count integer DEFAULT NULL::integer, p_file_size bigint DEFAULT NULL::bigint, p_display_order integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    UPDATE sessions SET broadcast_mode = 'idle', broadcast_pdf_id = NULL
    WHERE id = p_session_id AND broadcast_pdf_id = p_lecture_id;
    RETURN json_build_object('success', true);
  END IF;
  RETURN json_build_object('success', false, 'error', 'invalid_action');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_lectures_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_participants_q(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_authenticated JSONB;
  v_anonymous JSONB;
BEGIN
  -- 로그인 참가자 (session_members) - 프론트엔드 기대 구조에 맞게
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', sm.id,
      'user_id', sm.user_id,
      'profile', jsonb_build_object(
        'display_name', COALESCE(p.display_name, p.email),
        'email', p.email
      ),
      'role', sm.role,
      'created_at', sm.created_at
    ) ORDER BY sm.created_at DESC
  ), '[]'::jsonb)
  INTO v_authenticated
  FROM session_members sm
  LEFT JOIN profiles p ON p.id = sm.user_id
  WHERE sm.session_id = p_session_id;

  -- 비로그인 참가자 (anonymous_participants)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ap.id,
      'name', ap.name,
      'email', ap.email,
      'phone', ap.phone,
      'created_at', ap.created_at
    ) ORDER BY ap.created_at DESC
  ), '[]'::jsonb)
  INTO v_anonymous
  FROM anonymous_participants ap
  WHERE ap.session_id = p_session_id;

  -- 프론트엔드 기대 키 이름 사용 (authenticated, anonymous)
  RETURN jsonb_build_object(
    'authenticated', v_authenticated,
    'anonymous', v_anonymous,
    'total_count', jsonb_array_length(v_authenticated) + jsonb_array_length(v_anonymous)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_pdf_page_s(p_session_id uuid, p_page integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_poll_delete_s(p_poll_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- CASCADE로 poll_options, poll_responses도 함께 삭제됨
  DELETE FROM polls WHERE id = p_poll_id;
  
  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_poll_results_q(p_poll_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'poll', json_build_object(
      'id', p.id,
      'question', p.question,
      'poll_type', p.poll_type,
      'status', p.status
    ),
    'options', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', po.id,
          'option_text', po.option_text,
          'votes', po.votes,
          'percentage', CASE 
            WHEN (SELECT SUM(votes) FROM poll_options WHERE poll_id = p.id) > 0
            THEN ROUND((po.votes::NUMERIC / (SELECT SUM(votes) FROM poll_options WHERE poll_id = p.id)) * 100, 1)
            ELSE 0
          END
        ) ORDER BY po.display_order
      ), '[]'::json)
      FROM poll_options po
      WHERE po.poll_id = p.id
    ),
    'total_responses', (
      SELECT COUNT(DISTINCT user_id) FROM poll_responses WHERE poll_id = p.id
    ),
    'text_responses', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'response_text', pr.response_text,
          'created_at', pr.created_at
        ) ORDER BY pr.created_at DESC
      ), '[]'::json)
      FROM poll_responses pr
      WHERE pr.poll_id = p.id AND pr.response_text IS NOT NULL
    )
  ) INTO v_result
  FROM polls p
  WHERE p.id = p_poll_id;
  
  RETURN COALESCE(v_result, json_build_object('error', 'POLL_NOT_FOUND'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_poll_s(p_poll_id uuid DEFAULT NULL::uuid, p_session_id uuid DEFAULT NULL::uuid, p_question text DEFAULT NULL::text, p_poll_type text DEFAULT 'single'::text, p_options jsonb DEFAULT '[]'::jsonb, p_status text DEFAULT 'draft'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_poll_id UUID;
  v_option JSONB;
  v_order INT := 0;
BEGIN
  IF p_poll_id IS NULL THEN
    -- 신규 생성
    INSERT INTO polls (
      session_id, question, poll_type, status
    ) VALUES (
      p_session_id, p_question, p_poll_type, p_status
    )
    RETURNING id INTO v_poll_id;
    
    -- 선택지 추가
    FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
    LOOP
      INSERT INTO poll_options (poll_id, option_text, display_order)
      VALUES (v_poll_id, v_option->>'option_text', v_order);
      v_order := v_order + 1;
    END LOOP;
    
  ELSE
    -- 기존 수정
    UPDATE polls SET
      question = COALESCE(p_question, question),
      poll_type = COALESCE(p_poll_type, poll_type),
      status = COALESCE(p_status, status),
      updated_at = NOW()
    WHERE id = p_poll_id
    RETURNING id INTO v_poll_id;
    
    -- 기존 선택지 삭제 후 재생성
    IF p_options IS NOT NULL AND jsonb_array_length(p_options) > 0 THEN
      DELETE FROM poll_options WHERE poll_id = p_poll_id;
      
      FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
      LOOP
        INSERT INTO poll_options (poll_id, option_text, display_order)
        VALUES (v_poll_id, v_option->>'option_text', v_order);
        v_order := v_order + 1;
      END LOOP;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'poll_id', v_poll_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_polls_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', p.id,
        'question', p.question,
        'poll_type', p.poll_type,
        'status', p.status,
        'is_required', p.is_required,
        'show_results', p.show_results,
        'allow_anonymous', p.allow_anonymous,
        'max_selections', p.max_selections,
        'display_order', p.display_order,
        'created_at', p.created_at,
        'poll_options', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', po.id,
              'option_text', po.option_text,
              'display_order', po.display_order
            ) ORDER BY po.display_order
          ), '[]'::json)
          FROM poll_options po
          WHERE po.poll_id = p.id
        )
      ) ORDER BY p.display_order, p.created_at DESC
    ), '[]'::json)
    FROM polls p
    WHERE p.session_id = p_session_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_profile_s(p_partner_id uuid, p_partner_type text, p_representative_name text, p_phone text, p_company_name text DEFAULT NULL::text, p_business_number text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_industry text DEFAULT NULL::text, p_expected_scale text DEFAULT NULL::text, p_client_type text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_bio text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  -- Update basic partner info
  UPDATE partners
  SET 
    representative_name = p_representative_name,
    phone = p_phone,
    updated_at = now()
  WHERE id = p_partner_id;
  
  -- Update type-specific details
  IF p_partner_type = 'organizer' THEN
    UPDATE partner_organizers
    SET
      company_name = p_company_name,
      business_number = p_business_number,
      address = p_address,
      industry = p_industry,
      expected_scale = p_expected_scale,
      updated_at = now()
    WHERE partner_id = p_partner_id;
    
  ELSIF p_partner_type = 'agency' THEN
    UPDATE partner_agencies
    SET
      company_name = p_company_name,
      business_number = p_business_number,
      address = p_address,
      industry = p_industry,
      expected_scale = p_expected_scale,
      client_type = p_client_type,
      updated_at = now()
    WHERE partner_id = p_partner_id;
    
  ELSIF p_partner_type = 'instructor' THEN
    UPDATE partner_instructors
    SET
      display_name = p_display_name,
      specialty = p_specialty,
      bio = p_bio,
      updated_at = now()
    WHERE partner_id = p_partner_id;
  END IF;
  
  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_broadcast_s(p_question_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE questions SET
    is_displayed = true,
    updated_at = NOW()
  WHERE id = p_question_id;
  
  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_categories_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_category_s(p_action text, p_session_id uuid, p_category_id uuid DEFAULT NULL::uuid, p_name text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_display_order integer DEFAULT 0, p_is_visible boolean DEFAULT NULL::boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_delete_s(p_question_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  DELETE FROM questions WHERE id = p_question_id;
  
  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_presenters_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', pm.user_id,
        'display_name', p.display_name,
        'email', p.email,
        'role', pm.role
      )
    ), '[]'::json)
    FROM partner_members pm
    JOIN profiles p ON p.id = pm.user_id
    JOIN sessions s ON s.partner_id = pm.partner_id
    WHERE s.id = p_session_id
      AND pm.role IN ('owner', 'admin', 'member')
      AND pm.status = 'active'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', q.id,
        'content', q.content,
        'author_name', q.author_name,
        'is_anonymous', q.is_anonymous,
        'status', q.status,
        'answer', q.answer,
        'answered_by', q.answered_by,
        'answered_at', q.answered_at,
        'presenter_id', q.presenter_id,
        'is_pinned', q.is_pinned,
        'is_highlighted', q.is_highlighted,
        'is_displayed', q.is_displayed,
        'display_order', q.display_order,
        'created_at', q.created_at
      ) ORDER BY 
        q.is_pinned DESC,
        q.display_order ASC,
        q.created_at DESC
    ), '[]'::json)
    FROM questions q
    WHERE q.session_id = p_session_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_s(p_question_id uuid DEFAULT NULL::uuid, p_session_id uuid DEFAULT NULL::uuid, p_content text DEFAULT NULL::text, p_author_name text DEFAULT NULL::text, p_is_anonymous boolean DEFAULT false, p_status text DEFAULT 'pending'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_question_id UUID;
BEGIN
  IF p_question_id IS NULL THEN
    -- 신규 생성
    INSERT INTO questions (
      session_id, content, author_name, is_anonymous, status
    ) VALUES (
      p_session_id, p_content, p_author_name, p_is_anonymous, p_status
    )
    RETURNING id INTO v_question_id;
  ELSE
    -- 기존 수정
    UPDATE questions SET
      content = COALESCE(p_content, content),
      author_name = COALESCE(p_author_name, author_name),
      is_anonymous = COALESCE(p_is_anonymous, is_anonymous),
      status = COALESCE(p_status, status),
      updated_at = NOW()
    WHERE id = p_question_id
    RETURNING id INTO v_question_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'question_id', v_question_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_set_category_s(p_question_id uuid, p_category_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text DEFAULT NULL::text, p_answered_by uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_is_pinned boolean DEFAULT NULL::boolean, p_is_highlighted boolean DEFAULT NULL::boolean, p_is_displayed boolean DEFAULT NULL::boolean, p_presenter_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  CASE p_action
    WHEN 'approve' THEN
      UPDATE questions SET status = 'approved', updated_at = NOW()
      WHERE id = p_question_id;
      
    WHEN 'reject' THEN
      UPDATE questions SET status = 'rejected', updated_at = NOW()
      WHERE id = p_question_id;
      
    WHEN 'answer' THEN
      UPDATE questions SET
        answer = p_answer,
        answered_by = p_answered_by,
        answered_at = NOW(),
        status = 'answered',
        updated_at = NOW()
      WHERE id = p_question_id;
      
    WHEN 'pin' THEN
      UPDATE questions SET is_pinned = p_is_pinned, updated_at = NOW()
      WHERE id = p_question_id;
      
    WHEN 'highlight' THEN
      UPDATE questions SET is_highlighted = p_is_highlighted, updated_at = NOW()
      WHERE id = p_question_id;
      
    WHEN 'display' THEN
      UPDATE questions SET is_displayed = p_is_displayed, updated_at = NOW()
      WHERE id = p_question_id;
      
    WHEN 'assign_presenter' THEN
      UPDATE questions SET presenter_id = p_presenter_id, updated_at = NOW()
      WHERE id = p_question_id;
      
    ELSE
      RETURN json_build_object('success', false, 'error', 'INVALID_ACTION');
  END CASE;
  
  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_search_q(p_partner_type text, p_exclude_partner_id uuid, p_search_query text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', p.id,
      'partner_type', p.partner_type,
      'representative_name', p.representative_name,
      'phone', p.phone,
      'is_active', p.is_active,
      'profile', json_build_object(
        'email', pr.email
      ),
      'details', CASE
        WHEN p.partner_type = 'organizer' THEN (
          SELECT json_build_object('company_name', po.company_name)
          FROM partner_organizers po
          WHERE po.partner_id = p.id
        )
        WHEN p.partner_type = 'agency' THEN (
          SELECT json_build_object('company_name', pa.company_name)
          FROM partner_agencies pa
          WHERE pa.partner_id = p.id
        )
        ELSE NULL
      END
    )), '[]'::json)
    FROM partners p
    LEFT JOIN profiles pr ON p.profile_id = pr.id
    WHERE p.partner_type = p_partner_type
      AND p.is_active = true
      AND p.id != p_exclude_partner_id
      AND (
        p_search_query IS NULL OR
        p.representative_name ILIKE '%' || p_search_query || '%'
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text DEFAULT NULL::text, p_url text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_partner_id UUID;
BEGIN
  -- 현재 사용자의 파트너 ID 조회
  SELECT get_my_partner_id() INTO v_partner_id;
  
  IF v_partner_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'PARTNER_NOT_FOUND'
    );
  END IF;
  
  -- 세션 소유권 확인
  IF NOT EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = p_session_id AND partner_id = v_partner_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'UNAUTHORIZED'
    );
  END IF;
  
  -- 작업 수행
  IF p_action = 'upsert' THEN
    INSERT INTO session_assets (session_id, field_key, value, url)
    VALUES (p_session_id, p_field_key, p_value, p_url)
    ON CONFLICT (session_id, field_key)
    DO UPDATE SET
      value = EXCLUDED.value,
      url = EXCLUDED.url,
      updated_at = NOW();
    
    RETURN json_build_object(
      'success', true,
      'field_key', p_field_key,
      'value', p_value
    );
    
  ELSIF p_action = 'delete' THEN
    DELETE FROM session_assets
    WHERE session_id = p_session_id AND field_key = p_field_key;
    
    RETURN json_build_object(
      'success', true,
      'field_key', p_field_key
    );
    
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_ACTION'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_attendance_s(p_session_id uuid, p_attendance_enabled boolean DEFAULT NULL::boolean, p_certificate_enabled boolean DEFAULT NULL::boolean, p_certificate_template text DEFAULT NULL::text, p_certificate_issuer text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_session_id UUID;
  v_code TEXT;
  v_partner_id UUID;
BEGIN
  -- 현재 사용자의 파트너 ID 조회
  SELECT get_my_partner_id() INTO v_partner_id;
  
  IF v_partner_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'PARTNER_NOT_FOUND'
    );
  END IF;
  
  -- 세션 생성 또는 수정
  IF p_session_id IS NULL THEN
    -- 신규 생성
    v_code := generate_session_code();
    
    INSERT INTO sessions (
      partner_id, title, code, venue_name, venue_address,
      start_at, end_at, contact_phone, contact_email,
      max_participants, description, template_id,
      qna_template_id, poll_template_id, status
    ) VALUES (
      v_partner_id, p_title, v_code, p_venue_name, p_venue_address,
      p_start_at, p_end_at, p_contact_phone, p_contact_email,
      p_max_participants, p_description, p_template_id,
      p_qna_template_id, p_poll_template_id, 'draft'
    )
    RETURNING id INTO v_session_id;
  ELSE
    -- 기존 세션 수정
    UPDATE sessions SET
      title = p_title,
      venue_name = p_venue_name,
      venue_address = p_venue_address,
      start_at = p_start_at,
      end_at = p_end_at,
      contact_phone = p_contact_phone,
      contact_email = p_contact_email,
      max_participants = p_max_participants,
      description = p_description,
      template_id = p_template_id,
      qna_template_id = p_qna_template_id,
      poll_template_id = p_poll_template_id,
      updated_at = NOW()
    WHERE id = p_session_id
      AND partner_id = v_partner_id
    RETURNING id, code INTO v_session_id, v_code;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'code', v_code
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_complete_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'session', (
      SELECT json_build_object(
        'id', s.id,
        'title', s.title,
        'code', s.code,
        'status', s.status,
        'start_at', s.start_at,
        'end_at', s.end_at,
        'venue_name', s.venue_name,
        'venue_address', s.venue_address,
        'contact_phone', s.contact_phone,
        'contact_email', s.contact_email,
        'max_participants', s.max_participants,
        'participant_count', s.participant_count,
        'description', s.description,
        'template_id', s.template_id,
        'qna_template_id', s.qna_template_id,
        'poll_template_id', s.poll_template_id,
        'created_at', s.created_at,
        'updated_at', s.updated_at
      )
      FROM sessions s
      WHERE s.id = p_session_id
    ),
    'partner', (
      SELECT json_build_object(
        'id', p.id,
        'representative_name', p.representative_name,
        'partner_type', p.partner_type,
        'phone', p.phone
      )
      FROM sessions s
      JOIN partners p ON p.id = s.partner_id
      WHERE s.id = p_session_id
    ),
    'template', (
      SELECT json_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description
      )
      FROM sessions s
      LEFT JOIN session_templates t ON t.id = s.template_id
      WHERE s.id = p_session_id
    ),
    'templates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'code', t.code,
          'description', t.description,
          'screen_type', t.screen_type
        )
        ORDER BY t.sort_order
      ), '[]'::json)
      FROM session_templates t
      WHERE t.is_active = true AND t.screen_type = 'main'
    ),
    'qna_templates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'code', t.code,
          'description', t.description,
          'screen_type', t.screen_type
        )
        ORDER BY t.sort_order
      ), '[]'::json)
      FROM session_templates t
      WHERE t.is_active = true AND t.screen_type = 'qna'
    ),
    'poll_templates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'code', t.code,
          'description', t.description,
          'screen_type', t.screen_type
        )
        ORDER BY t.sort_order
      ), '[]'::json)
      FROM session_templates t
      WHERE t.is_active = true AND t.screen_type = 'poll'
    ),
    'template_fields', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', tf.id,
          'template_id', tf.template_id,
          'field_key', tf.field_key,
          'field_name', tf.field_name,
          'field_type', tf.field_type,
          'is_required', tf.is_required,
          'max_width', tf.max_width,
          'description', tf.description,
          'sort_order', tf.sort_order
        )
        ORDER BY tf.sort_order
      ), '[]'::json)
      FROM sessions s
      LEFT JOIN session_template_fields tf ON tf.template_id = s.template_id
      WHERE s.id = p_session_id
    ),
    'assets', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', sa.id,
          'session_id', sa.session_id,
          'field_key', sa.field_key,
          'value', sa.value,
          'url', sa.url,
          'open_new_tab', sa.open_new_tab
        )
      ), '[]'::json)
      FROM session_assets sa
      WHERE sa.session_id = p_session_id
    ),
    'stats', json_build_object(
      'totalQuestions', (
        SELECT COUNT(*) FROM questions WHERE session_id = p_session_id
      ),
      'totalPolls', (
        SELECT COUNT(*) FROM polls WHERE session_id = p_session_id
      ),
      'participants', (
        SELECT participant_count FROM sessions WHERE id = p_session_id
      )
    ),
    'collaborators', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', p.id,
          'representative_name', p.representative_name,
          'partner_type', p.partner_type,
          'status', sp.status
        )
      ), '[]'::json)
      FROM session_partners sp
      JOIN partners p ON p.id = sp.partner_id
      WHERE sp.session_id = p_session_id
    )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, json_build_object('error', 'SESSION_NOT_FOUND'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_create_q()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'main_templates', COALESCE((
      SELECT json_agg(json_build_object(
               'id', t.id, 'name', t.name, 'code', t.code,
               'description', t.description, 'screen_type', t.screen_type
             ) ORDER BY t.sort_order, t.name)
        FROM public.session_templates t
       WHERE t.is_active = true AND COALESCE(t.screen_type, 'main') = 'main'
    ), '[]'::json),
    'qna_templates', COALESCE((
      SELECT json_agg(json_build_object(
               'id', t.id, 'name', t.name, 'code', t.code,
               'description', t.description, 'screen_type', t.screen_type
             ) ORDER BY t.sort_order, t.name)
        FROM public.session_templates t
       WHERE t.is_active = true AND t.screen_type = 'qna'
    ), '[]'::json),
    'poll_templates', COALESCE((
      SELECT json_agg(json_build_object(
               'id', t.id, 'name', t.name, 'code', t.code,
               'description', t.description, 'screen_type', t.screen_type
             ) ORDER BY t.sort_order, t.name)
        FROM public.session_templates t
       WHERE t.is_active = true AND t.screen_type = 'poll'
    ), '[]'::json)
  );
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_detail_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'session', json_build_object(
      'id', s.id,
      'title', s.title,
      'code', s.code,
      'status', s.status,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'venue_name', s.venue_name,
      'venue_address', s.venue_address,
      'contact_phone', s.contact_phone,
      'contact_email', s.contact_email,
      'max_participants', s.max_participants,
      'participant_count', s.participant_count,
      'description', s.description,
      'created_at', s.created_at
    ),
    'partner', json_build_object(
      'id', p.id,
      'representative_name', p.representative_name,
      'partner_type', p.partner_type
    ),
    'stats', json_build_object(
      'totalQuestions', (SELECT COUNT(*) FROM questions WHERE session_id = s.id),
      'totalPolls', (SELECT COUNT(*) FROM polls WHERE session_id = s.id),
      'participants', s.participant_count
    )
  ) INTO v_result
  FROM sessions s
  JOIN partners p ON p.id = s.partner_id
  WHERE s.id = p_session_id;
  
  RETURN COALESCE(v_result, json_build_object('error', 'SESSION_NOT_FOUND'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_duplicate_s(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_src   public.sessions;
  v_new_id uuid := gen_random_uuid();
  v_code  text;
  v_try   int := 0;
begin
  select * into v_src from public.sessions where id = p_session_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;
  if not public.is_partner_owner(v_src.partner_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  -- 고유 참여코드 (6자 대문자/숫자)
  loop
    v_try := v_try + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.sessions where code = v_code);
    if v_try > 30 then
      return jsonb_build_object('success', false, 'error', 'code_gen_failed');
    end if;
  end loop;

  -- 세션 (초안·라이브 상태 초기화)
  insert into public.sessions (
    id, partner_id, template_id, qna_template_id, poll_template_id,
    title, venue_name, venue_address, start_at, end_at,
    contact_phone, contact_email, max_participants, code, description,
    status, participant_count, broadcast_settings, audience_settings,
    broadcast_mode, broadcast_pdf_page, qna_rev, cues_rev, max_page
  )
  select
    v_new_id, v_src.partner_id, template_id, qna_template_id, poll_template_id,
    title || ' (복사본)', venue_name, venue_address, start_at, end_at,
    contact_phone, contact_email, max_participants, v_code, description,
    'draft', 0, broadcast_settings, audience_settings,
    'idle', 1, 0, 0, 1
  from public.sessions where id = p_session_id;

  -- 발표자
  create temp table _pres on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.session_presenters where session_id = p_session_id;
  insert into public.session_presenters (id, session_id, presenter_type, user_id, partner_id, manual_name, manual_title, manual_bio, manual_image, display_name, display_title, display_order, status)
  select m.new_id, v_new_id, sp.presenter_type, sp.user_id, sp.partner_id, sp.manual_name, sp.manual_title, sp.manual_bio, sp.manual_image, sp.display_name, sp.display_title, sp.display_order, sp.status
  from public.session_presenters sp join _pres m on m.old_id = sp.id;

  -- Q&A 카테고리
  create temp table _cat on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.qna_categories where session_id = p_session_id;
  insert into public.qna_categories (id, session_id, name, color, display_order, is_visible)
  select m.new_id, v_new_id, c.name, c.color, c.display_order, c.is_visible
  from public.qna_categories c join _cat m on m.old_id = c.id;

  -- 강연자료
  create temp table _lec on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.lecture_files where session_id = p_session_id;
  insert into public.lecture_files (id, session_id, presenter_id, title, file_url, file_path, page_count, file_size, display_order, allow_download, pages_path)
  select m.new_id, v_new_id, pm.new_id, l.title, l.file_url, l.file_path, l.page_count, l.file_size, l.display_order, l.allow_download, l.pages_path
  from public.lecture_files l join _lec m on m.old_id = l.id
  left join _pres pm on pm.old_id = l.presenter_id;

  -- 투표 + 선택지
  create temp table _poll on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.polls where session_id = p_session_id;
  insert into public.polls (id, session_id, template_id, question, poll_type, is_required, status, display_order, show_results, allow_anonymous, max_selections)
  select m.new_id, v_new_id, p.template_id, p.question, p.poll_type, p.is_required, p.status, p.display_order, p.show_results, p.allow_anonymous, p.max_selections
  from public.polls p join _poll m on m.old_id = p.id;
  insert into public.poll_options (id, poll_id, option_text, display_order)
  select gen_random_uuid(), m.new_id, o.option_text, o.display_order
  from public.poll_options o join _poll m on m.old_id = o.poll_id;

  -- 큐시트 (자료·투표·카테고리·발표자 참조 리매핑)
  insert into public.session_cues (id, session_id, presenter_id, cue_type, title, lecture_file_id, start_page, poll_id, qna_category_id, notice_text, display_order, planned_start_at, duration_min, is_public, public_title)
  select gen_random_uuid(), v_new_id, prm.new_id, c.cue_type, c.title, lm.new_id, c.start_page, plm.new_id, cm.new_id, c.notice_text, c.display_order, c.planned_start_at, c.duration_min, c.is_public, c.public_title
  from public.session_cues c
  left join _pres prm on prm.old_id = c.presenter_id
  left join _lec  lm  on lm.old_id  = c.lecture_file_id
  left join _poll plm on plm.old_id = c.poll_id
  left join _cat  cm  on cm.old_id  = c.qna_category_id
  where c.session_id = p_session_id;

  -- 디자인 (초안·게시본·이력)
  insert into public.session_designs (session_id, draft, published, version, history, published_at)
  select v_new_id, draft, published, coalesce(version, 0), history, null
  from public.session_designs where session_id = p_session_id;

  return jsonb_build_object('success', true, 'session_id', v_new_id, 'code', v_code, 'title', v_src.title || ' (복사본)');
end;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_feedback_q(p_session_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_status_s(p_session_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.sp_can_control_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_status NOT IN ('draft', 'published', 'active', 'paused', 'completed', 'ended', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_STATUS');
  END IF;

  UPDATE sessions
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;

  RETURN json_build_object('success', true, 'status', p_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_session_survey_s(p_session_id uuid, p_enabled boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.fn_can_manage_session(p_session_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  UPDATE public.sessions SET survey_enabled = COALESCE(p_enabled, true) WHERE id = p_session_id;
  RETURN json_build_object('success', true, 'survey_enabled', COALESCE(p_enabled, true));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_sessions_q(p_partner_id uuid, p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT json_build_object(
      'sessions', COALESCE(json_agg(session_data ORDER BY created_at DESC), '[]'::json),
      'total', COUNT(*)
    )
    FROM (
      SELECT 
        s.id,
        s.title,
        s.code,
        s.status,
        s.start_at,
        s.end_at,
        s.created_at,
        s.participant_count,
        s.venue_name,
        s.max_participants
      FROM sessions s
      WHERE s.partner_id = p_partner_id
        AND (p_status IS NULL OR s.status = p_status)
        AND (p_search IS NULL OR s.title ILIKE '%' || p_search || '%')
    ) session_data
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_team_q(p_partner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', pm.id,
        'user_id', pm.user_id,
        'role', pm.role,
        'display_name', COALESCE(p.display_name, pm.email),
        'email', COALESCE(p.email, pm.email),
        'status', pm.status,
        'joined_at', pm.accepted_at,
        'invited_at', pm.invited_at,
        'created_at', pm.created_at
      ) ORDER BY pm.created_at
    ), '[]'::json)
    FROM partner_members pm
    LEFT JOIN profiles p ON p.id = pm.user_id
    WHERE pm.partner_id = p_partner_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_partner_timer_s(p_session_id uuid, p_action text, p_seconds integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sp_pending_invites_c(p_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM partner_members
  WHERE email = p_email
    AND status = 'pending';
  
  RETURN json_build_object(
    'has_pending_invites', v_count > 0,
    'count', v_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_profile_q(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    SELECT json_build_object(
      'display_name', display_name,
      'email', email,
      'user_role', user_role,
      'user_type', user_type,
      'status', status,
      'description', description,
      'preferred_language', preferred_language,
      'created_at', created_at,
      'updated_at', updated_at
    )
    FROM profiles
    WHERE id = p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_profile_s(p_user_id uuid, p_display_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_updated_name text;
BEGIN
  -- 표시 이름 업데이트
  UPDATE profiles
  SET 
    display_name = NULLIF(TRIM(p_display_name), ''),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING display_name INTO v_updated_name;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'PROFILE_NOT_FOUND',
      'message', '프로필을 찾을 수 없습니다.'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'display_name', v_updated_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_template_fields_q(p_template_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', stf.id,
      'template_id', stf.template_id,
      'field_key', stf.field_key,
      'field_name', stf.field_name,
      'field_type', stf.field_type,
      'sort_order', stf.sort_order,
      'is_required', stf.is_required,
      'max_width', stf.max_width,
      'description', stf.description
    ) ORDER BY stf.sort_order), '[]'::json)
    FROM session_template_fields stf
    WHERE stf.template_id = p_template_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_theme_q(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_theme json;
BEGIN
  SELECT json_build_object(
    'mode', uts.mode,
    'preset', uts.preset,
    'custom_colors', uts.custom_colors,
    'font_size', uts.font_size,
    'user_id', uts.user_id
  )
  INTO v_theme
  FROM user_theme_settings uts
  WHERE uts.user_id = p_user_id;
  
  -- If no theme found, return default theme
  IF v_theme IS NULL THEN
    v_theme := json_build_object(
      'mode', 'light',
      'preset', 'theme-d',
      'custom_colors', '{}'::json,
      'font_size', 'medium',
      'user_id', p_user_id
    );
  END IF;
  
  RETURN v_theme;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_theme_s(p_user_id uuid, p_mode text, p_preset text, p_custom_colors json, p_font_size text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO user_theme_settings (user_id, mode, preset, custom_colors, font_size)
  VALUES (p_user_id, p_mode, p_preset, p_custom_colors, p_font_size)
  ON CONFLICT (user_id)
  DO UPDATE SET
    mode = EXCLUDED.mode,
    preset = EXCLUDED.preset,
    custom_colors = EXCLUDED.custom_colors,
    font_size = EXCLUDED.font_size,
    updated_at = now();
  
  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_user_language_q(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lang TEXT;
BEGIN
  SELECT preferred_language INTO v_lang
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'preferred_language', v_lang
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_user_language_s(p_user_id uuid, p_language_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET preferred_language = p_language_code,
      updated_at = now()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_user_session_activity_s(p_session_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.active_sessions
  SET last_activity_at = now()
  WHERE session_token = p_session_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_user_session_end_s(p_session_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM public.active_sessions
  WHERE session_token = p_session_token;
  
  IF v_session IS NOT NULL THEN
    PERFORM public.sp_login_event_s(
      (SELECT email FROM auth.users WHERE id = v_session.user_id),
      'logout',
      NULL,
      v_session.ip_address,
      v_session.user_agent,
      v_session.device_info,
      p_session_token
    );
    
    DELETE FROM public.active_sessions WHERE session_token = p_session_token;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_device_info jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(kicked_sessions integer, session_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kicked INTEGER := 0;
  v_session_id UUID;
  v_old_session RECORD;
BEGIN
  FOR v_old_session IN 
    SELECT * FROM public.active_sessions
    WHERE user_id = p_user_id AND session_token != p_session_token
  LOOP
    PERFORM public.sp_login_event_s(
      (SELECT email FROM auth.users WHERE id = p_user_id),
      'forced_logout',
      'duplicate_login',
      v_old_session.ip_address,
      v_old_session.user_agent,
      v_old_session.device_info,
      v_old_session.session_token
    );
    
    DELETE FROM public.active_sessions WHERE id = v_old_session.id;
    v_kicked := v_kicked + 1;
  END LOOP;
  
  INSERT INTO public.active_sessions (
    user_id, session_token, ip_address, user_agent, device_info
  ) VALUES (
    p_user_id, p_session_token, p_ip_address, p_user_agent, p_device_info
  )
  ON CONFLICT (session_token) DO UPDATE SET
    last_activity_at = now(),
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    device_info = EXCLUDED.device_info
  RETURNING id INTO v_session_id;
  
  RETURN QUERY SELECT v_kicked, v_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[] DEFAULT NULL::uuid[], p_response_text text DEFAULT NULL::text, p_anonymous_id text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.toggle_question_like(p_question_id uuid, p_device_id text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_poll_status(p_poll_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_question_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_user_language(lang_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles
  SET preferred_language = lang_code
  WHERE id = auth.uid();
END;
$function$;

comment on function public.accept_partner_invite(p_token text) is '초대 토큰으로 파트너 초대 수락 처리';
comment on function public.add_partner_owner_on_approval() is '파트너 생성 시 해당 사용자를 owner로 자동 추가';
comment on function public.add_session_owner() is '세션 생성 시 파트너 소유자를 세션 owner로 자동 추가';
comment on function public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid) is '파트너 협업 호환성 체크 - organizer↔agency만 협업 가능';
comment on function public.check_question_liked(p_question_id uuid, p_device_id text) is '현재 사용자/디바이스가 해당 질문에 좋아요했는지 확인';
comment on function public.cleanup_old_sessions() is '오래된 세션 및 로그인 시도 기록 정리';
comment on function public.custom_access_token_hook(event jsonb) is 'JWT 토큰에 사용자 프로필 정보(user_role, user_type, status 등)를 추가하는 Auth Hook';
comment on function public.decrement_participant_count(session_id uuid) is '세션 참여자 수 감소 (최소값 0)';
comment on function public.fn_session_presenter_link_profile() is '발표자 행 → 강사 프로필 자동 연결·직접 지정 권한 확인 (026)';
comment on function public.generate_invite_token() is '32자리 랜덤 초대 토큰 생성';
comment on function public.generate_session_code() is '6자리 고유 참여 코드 생성 (혼동 문자 제외)';
comment on function public.get_invite_by_token(p_token text) is '초대 토큰으로 초대 정보 조회 (RLS 우회)';
comment on function public.get_login_statistics(p_days integer) is '로그인 통계 조회';
comment on function public.get_my_partner_id() is '현재 사용자가 소유한 파트너 ID 반환';
comment on function public.get_translations(lang_code text) is '특정 언어의 모든 번역을 JSON 객체로 반환 (키: 번역키, 값: 번역문)';
comment on function public.get_user_language() is '사용자 언어 설정 조회';
comment on function public.handle_new_user() is '신규 사용자 가입 시 프로필 자동 생성 (첫 사용자는 관리자)';
comment on function public.handle_updated_at() is 'updated_at 컬럼 자동 갱신 트리거 함수';
comment on function public.increment_participant_count(session_id uuid) is '세션 참여자 수 증가';
comment on function public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid) is '세션에 협업 파트너 초대';
comment on function public.is_partner_admin_or_owner(p_partner_id uuid) is '현재 사용자가 해당 파트너의 admin 이상인지 확인';
comment on function public.is_partner_member(p_partner_id uuid) is '현재 사용자가 해당 파트너의 멤버인지 확인';
comment on function public.is_partner_owner(p_partner_id uuid) is '현재 사용자가 해당 파트너의 owner인지 확인';
comment on function public.sp_admin_active_sessions_q() is '관리자용 활성 세션 목록 조회';
comment on function public.sp_admin_dashboard_q() is '관리자 대시보드 전체 데이터 조회 - 통계, 추이, 분포, 순위 등';
comment on function public.sp_admin_force_logout_s(p_session_id uuid) is '관리자 강제 로그아웃 처리';
comment on function public.sp_admin_login_logs_q(p_page integer, p_page_size integer, p_event_type text, p_days integer, p_search_email text) is '관리자용 로그인 로그 조회';
comment on function public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid) is '파트너 신청 승인 처리';
comment on function public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text) is '파트너 신청 거부 처리';
comment on function public.sp_admin_partner_requests_q(p_status text) is '관리자용 파트너 신청 목록 조회';
comment on function public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean) is '파트너 활성화/비활성화 토글';
comment on function public.sp_admin_partners_q(p_type text, p_status text) is '관리자용 파트너 목록 조회 - 타입/상태별 필터링, 마지막 로그인 정보 포함';
comment on function public.sp_admin_sessions_q(p_status text, p_partner_id uuid, p_search text) is '관리자용 세션 목록 조회';
comment on function public.sp_admin_template_d(p_id uuid) is '템플릿 삭제';
comment on function public.sp_admin_template_field_d(p_id uuid) is '템플릿 필드 삭제';
comment on function public.sp_admin_template_field_s(p_id uuid, p_template_id uuid, p_field_key text, p_field_name text, p_field_type text, p_is_required boolean, p_max_width integer, p_description text, p_sort_order integer) is '템플릿 필드 저장';
comment on function public.sp_admin_template_fields_q(p_template_id uuid) is '템플릿 필드 목록 조회';
comment on function public.sp_admin_template_s(p_id uuid, p_name text, p_code text, p_description text, p_screen_type text, p_is_active boolean, p_sort_order integer) is '템플릿 저장';
comment on function public.sp_admin_template_toggle_s(p_id uuid) is '템플릿 활성화/비활성화 토글';
comment on function public.sp_admin_templates_q(p_screen_type text) is '관리자용 템플릿 목록 조회';
comment on function public.sp_admin_users_q() is '관리자용 회원 목록 조회 - 프로필, 마지막 로그인, 파트너 정보 포함';
comment on function public.sp_can_control_session(p_session_id uuid) is '세션 송출 제어 권한 확인 (좌장/강연자/협업/팀/관리자)';
comment on function public.sp_instructor_profile_q(p_profile_id uuid) is '강사 프로필 공개 조회 — 누적 평균·응답 수·세션별 평점(의견 본문은 주지 않음) (026)';
comment on function public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text) is '비로그인 사용자 세션 참여';
comment on function public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid) is '로그인한 사용자 세션 참여';
comment on function public.sp_join_session_q(p_code text, p_user_id uuid, p_is_preview boolean) is '세션 참여 페이지 초기 데이터 로드';
comment on function public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid) is '로그인한 사용자 세션 참여 취소';
comment on function public.sp_live_attendance_q(p_code text, p_key text) is '청중 출석·수료증 상태 — 출석 켜짐 여부와 이 브라우저의 출석 기록 (028)';
comment on function public.sp_live_attendance_s(p_code text, p_key text, p_name text, p_affiliation text) is '청중 출석 체크 — 출석 켜짐·게시/진행 중 세션만, 같은 브라우저는 한 행 (028)';
comment on function public.sp_live_certificate_s(p_code text, p_key text) is '청중 수료증 데이터 — 끝난 세션·수료증 켜짐·출석자만, 첫 발급 시각 기록 (028)';
comment on function public.sp_live_feedback_s(p_code text, p_key text, p_rating integer, p_comment text) is '청중 만족도 응답 저장 — 끝난 세션·설문 켜짐·브라우저당 1회 (026)';
comment on function public.sp_live_qna_q(p_code text, p_token text, p_limit integer) is '청중 Q&A 목록 - 본인(pending 포함) 병합 + 좋아요 인라인 (PRD §6)';
comment on function public.sp_live_state_q(p_code text, p_cues_rev bigint) is '청중 원-앱 단일 폴링 신호 (PRD §6) - 개인화 필드 금지(캐시 보존), cues_public은 rev 불일치 시에만';
comment on function public.sp_live_timer_q(p_code text) is '발표 타이머 상태 + 서버 시각 (028)';
comment on function public.sp_login_attempt_c(p_email text, p_ip_address text) is '로그인 시도 확인 - 잠금 상태, 시도 횟수 체크';
comment on function public.sp_login_attempt_clear_s(p_email text, p_ip_address text) is '로그인 시도 초기화 - 로그인 성공 시 호출';
comment on function public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text, p_ip_address text, p_user_agent text, p_device_info jsonb, p_session_id text) is '로그인 이벤트 로그 기록 - 성공/실패/로그아웃 등';
comment on function public.sp_login_failure_s(p_email text, p_ip_address text) is '로그인 실패 기록 - 시도 횟수 증가, 잠금 처리';
comment on function public.sp_partner_apply_s(p_partner_type text, p_representative_name text, p_company_name text, p_phone text, p_purpose text, p_business_number text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) is '주최(파트너) 신청 — 본인 신청을 즉시 승인해 파트너로 만든다. 반려 이력이 있으면 심사 대기로 넣는다.';
comment on function public.sp_partner_attendance_q(p_session_id uuid) is '주최 출석 명단·인원·수료증 발급 수·설정 (028)';
comment on function public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid) is '세션 협업 정보 조회 - 세션 소유자, 초대된 파트너, 강사 목록, 팀원 목록';
comment on function public.sp_partner_dashboard_q(p_user_id uuid) is '파트너 대시보드 데이터 조회 - 통계, 최근 세션, 일별 활동, 세션별 성과';
comment on function public.sp_partner_faqs_q(p_category text) is '파트너용 FAQ 목록 조회 - 카테고리별 필터링 지원';
comment on function public.sp_partner_inquiries_q(p_partner_id uuid) is '파트너 문의 목록 조회 - 답변 개수 포함';
comment on function public.sp_partner_inquiry_replies_q(p_inquiry_id uuid) is '문의 답변 목록 조회 - 작성자 정보 포함';
comment on function public.sp_partner_inquiry_s(p_action text, p_partner_id uuid, p_category text, p_title text, p_content text, p_inquiry_id uuid, p_user_id uuid, p_is_admin boolean) is '문의 생성 또는 답변 추가';
comment on function public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text) is '세션 초대 응답 - 수락 시 협업자로 추가';
comment on function public.sp_partner_invitations_q(p_partner_id uuid) is '파트너 초대 목록 조회 - 받은 초대와 보낸 초대를 session_partners 테이블에서 조회';
comment on function public.sp_partner_poll_delete_s(p_poll_id uuid) is '투표 삭제 - 선택지 및 응답도 함께 삭제';
comment on function public.sp_partner_poll_results_q(p_poll_id uuid) is '투표 결과 조회 - 선택지별 투표 수 및 비율, 주관식 응답';
comment on function public.sp_partner_poll_s(p_poll_id uuid, p_session_id uuid, p_question text, p_poll_type text, p_options jsonb, p_status text) is '투표 생성 또는 수정 - 선택지 포함';
comment on function public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text) is '투표 상태 변경 - draft, active, closed';
comment on function public.sp_partner_polls_q(p_session_id uuid) is '세션 투표 목록 조회 - 선택지 및 투표 수 포함';
comment on function public.sp_partner_qna_broadcast_s(p_question_id uuid) is 'Q&A 화면 방송 - 표시 상태로 변경';
comment on function public.sp_partner_qna_delete_s(p_question_id uuid) is 'Q&A 삭제';
comment on function public.sp_partner_qna_presenters_q(p_session_id uuid) is '세션 발표자 목록 조회 - 팀 멤버 기반';
comment on function public.sp_partner_qna_q(p_session_id uuid) is '세션 Q&A 목록 조회 - 상태, 고정, 정렬 포함';
comment on function public.sp_partner_qna_s(p_question_id uuid, p_session_id uuid, p_content text, p_author_name text, p_is_anonymous boolean, p_status text) is 'Q&A 생성 또는 수정';
comment on function public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text, p_answered_by uuid, p_status text, p_is_pinned boolean, p_is_highlighted boolean, p_is_displayed boolean, p_presenter_id uuid) is 'Q&A 상태 및 속성 업데이트 - 승인, 거절, 답변, 고정, 강조, 표시';
comment on function public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text, p_url text) is '세션 자산 관리 - 이미지, URL 등 저장/삭제';
comment on function public.sp_partner_session_attendance_s(p_session_id uuid, p_attendance_enabled boolean, p_certificate_enabled boolean, p_certificate_template text, p_certificate_issuer text) is '주최 출석·수료증 설정 (028)';
comment on function public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid) is '세션 기본 정보 저장 - 생성 또는 수정';
comment on function public.sp_partner_session_complete_q(p_session_id uuid) is '세션 상세 페이지 전체 데이터 조회 - 세션, 파트너, 템플릿, 템플릿 목록, 필드, 자산(배열), 통계, 협업자';
comment on function public.sp_partner_session_create_q() is '세션 만들기 화면 데이터 — 선택할 수 있는 화면 템플릿 목록(main/qna/poll)';
comment on function public.sp_partner_session_detail_q(p_session_id uuid) is '세션 상세 정보 조회 - 기본 정보, 파트너 정보, 통계';
comment on function public.sp_partner_session_status_s(p_session_id uuid, p_status text) is '세션 상태 변경 - draft, published, active, paused, completed, cancelled';
comment on function public.sp_partner_sessions_q(p_partner_id uuid, p_status text, p_search text) is '파트너 세션 목록 조회 - 필터링 및 검색 지원';
comment on function public.sp_partner_team_q(p_partner_id uuid) is '파트너 팀원 목록 조회 - partner_members 테이블에서 팀원 정보를 가져옴';
comment on function public.sp_partner_timer_s(p_session_id uuid, p_action text, p_seconds integer) is '발표 타이머 조작 — start/pause/reset/set/add/warn, 진행 권한자만 (028)';
comment on function public.sp_pending_invites_c(p_email text) is '사용자의 대기 중인 파트너 초대 존재 여부 확인';
comment on function public.sp_profile_q(p_user_id uuid) is '사용자 프로필 조회 - 표시 이름, 이메일, 역할, 상태 등';
comment on function public.sp_profile_s(p_user_id uuid, p_display_name text) is '사용자 프로필 업데이트 - 표시 이름 변경';
comment on function public.sp_user_language_q(p_user_id uuid) is '사용자의 선호 언어 설정 조회';
comment on function public.sp_user_language_s(p_user_id uuid, p_language_code text) is '사용자의 선호 언어 설정 저장';
comment on function public.sp_user_session_activity_s(p_session_token text) is '세션 활동 시간 업데이트';
comment on function public.sp_user_session_end_s(p_session_token text) is '세션 종료 - 로그아웃 처리';
comment on function public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text, p_user_agent text, p_device_info jsonb) is '사용자 세션 등록 - 중복 세션 처리';
comment on function public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[], p_response_text text, p_anonymous_id text) is '설문 응답 제출 - 유형에 따라 단일/복수/주관식 처리';
comment on function public.toggle_question_like(p_question_id uuid, p_device_id text) is '질문 좋아요 토글 - 이미 좋아요면 취소, 없으면 추가';
comment on function public.update_poll_status(p_poll_id uuid, p_status text) is '설문 상태 변경 - draft/active/closed (015: 소유권 검사 추가)';
comment on function public.update_question_likes_count() is '좋아요 추가/삭제 시 질문의 likes_count 자동 갱신';
comment on function public.update_user_language(lang_code text) is '사용자 언어 설정 업데이트';
