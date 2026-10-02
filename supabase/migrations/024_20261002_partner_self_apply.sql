-- =====================================================
-- 024 (2026-10-02) 주최 신청 즉시 승인 (TSK-1294, K-011 2단계)
-- =====================================================
-- 목적: 새로 가입한 사람이 관리자 승인을 기다리지 않고 주최(파트너) 신청 → 첫 세션 만들기까지 간다.
--
-- 바꾸는 것: 함수 1개를 **새로** 만든다(sp_partner_apply_s). 그 밖에는 아무것도 바꾸지 않는다.
--   - 기존 테이블·컬럼·기본값·정책(RLS)·함수는 손대지 않는다(partner_requests.status 기본값도 'pending' 그대로).
--   - 기존 행은 수정·삭제하지 않는다. 이 함수는 호출한 본인의 새 행만 만든다.
--   - 관리자 화면의 승인/반려(sp_admin_partner_approve_s / sp_admin_partner_reject_s)와
--     파트너 정지(sp_admin_partner_toggle_s → partners.is_active)는 그대로 쓴다.
--
-- 원래 정의 백업: 이 마이그레이션은 기존 함수를 덮어쓰지 않으므로 백업할 원래 정의가 없다.
--   (같은 이름의 함수가 운영에 없다는 것은 저장소 기준으로만 확인했다 — 적용 전에
--    select proname from pg_proc where proname = 'sp_partner_apply_s'; 로 0행인지 본다.)
--
-- 적용 전 확인(운영 스키마를 읽지 못한 채 저장소 001_init.sql·003_partners.sql 기준으로 썼다):
--   1) partners / partner_organizers / partner_agencies / partner_instructors / partner_requests 컬럼이
--      001_init.sql 과 같은지.
--   2) 운영의 sp_admin_partner_approve_s 가 아래와 다른 추가 작업(다른 테이블 기록 등)을 하는지 —
--      한다면 이 함수에도 같은 작업을 넣는다.
--
-- 되돌리기: DROP FUNCTION public.sp_partner_apply_s(text,text,text,text,text,text,text,text,text,text,text,text);
--   (프런트는 이 함수가 없으면 예전 방식 — 신청 행만 넣고 관리자 승인 대기 — 으로 돌아간다.)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sp_partner_apply_s(
  p_partner_type        TEXT DEFAULT 'organizer',
  p_representative_name TEXT DEFAULT NULL,
  p_company_name        TEXT DEFAULT NULL,
  p_phone               TEXT DEFAULT NULL,
  p_purpose             TEXT DEFAULT NULL,
  p_business_number     TEXT DEFAULT NULL,
  p_industry            TEXT DEFAULT NULL,
  p_expected_scale      TEXT DEFAULT NULL,
  p_client_type         TEXT DEFAULT NULL,
  p_display_name        TEXT DEFAULT NULL,
  p_specialty           TEXT DEFAULT NULL,
  p_bio                 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION public.sp_partner_apply_s(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  IS '주최(파트너) 신청 — 본인 신청을 즉시 승인해 파트너로 만든다. 반려 이력이 있으면 심사 대기로 넣는다.';

REVOKE ALL ON FUNCTION public.sp_partner_apply_s(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sp_partner_apply_s(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.sp_partner_apply_s(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
