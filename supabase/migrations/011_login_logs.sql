-- =====================================================
-- 로그인 로그 및 중복 로그인 방지 시스템
-- =====================================================

-- 로그인 로그 테이블
CREATE TABLE public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'login_success', 'login_failed', 'logout', 'session_expired', 'forced_logout'
  failure_reason TEXT, -- 실패 사유: 'invalid_password', 'user_not_found', 'account_disabled', 'too_many_attempts', etc.
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}', -- 브라우저, OS 등 추가 정보
  session_id TEXT, -- 세션 식별자
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.login_logs IS '로그인/로그아웃 로그 기록';
COMMENT ON COLUMN public.login_logs.user_id IS '사용자 ID (로그인 실패 시 NULL 가능)';
COMMENT ON COLUMN public.login_logs.email IS '로그인 시도 이메일';
COMMENT ON COLUMN public.login_logs.event_type IS '이벤트 타입 - login_success: 로그인 성공, login_failed: 로그인 실패, logout: 로그아웃, session_expired: 세션 만료, forced_logout: 강제 로그아웃';
COMMENT ON COLUMN public.login_logs.failure_reason IS '실패 사유 - invalid_password: 비밀번호 오류, user_not_found: 사용자 없음, account_disabled: 계정 비활성화, too_many_attempts: 시도 횟수 초과, duplicate_login: 중복 로그인으로 인한 강제 로그아웃';
COMMENT ON COLUMN public.login_logs.ip_address IS '접속 IP 주소';
COMMENT ON COLUMN public.login_logs.user_agent IS '브라우저 User-Agent';
COMMENT ON COLUMN public.login_logs.device_info IS '기기 정보 (브라우저, OS 등)';
COMMENT ON COLUMN public.login_logs.session_id IS '세션 식별자';
COMMENT ON COLUMN public.login_logs.created_at IS '이벤트 발생 시간';

-- 인덱스 생성
CREATE INDEX idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX idx_login_logs_email ON public.login_logs(email);
CREATE INDEX idx_login_logs_event_type ON public.login_logs(event_type);
CREATE INDEX idx_login_logs_created_at ON public.login_logs(created_at DESC);
CREATE INDEX idx_login_logs_ip_address ON public.login_logs(ip_address);

-- 활성 세션 테이블 (중복 로그인 방지용)
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.active_sessions IS '활성 세션 관리 (중복 로그인 방지)';
COMMENT ON COLUMN public.active_sessions.user_id IS '사용자 ID';
COMMENT ON COLUMN public.active_sessions.session_token IS '세션 토큰 (고유)';
COMMENT ON COLUMN public.active_sessions.ip_address IS '접속 IP 주소';
COMMENT ON COLUMN public.active_sessions.user_agent IS '브라우저 User-Agent';
COMMENT ON COLUMN public.active_sessions.device_info IS '기기 정보';
COMMENT ON COLUMN public.active_sessions.last_activity_at IS '마지막 활동 시간';
COMMENT ON COLUMN public.active_sessions.created_at IS '세션 생성 시간';

-- 인덱스 생성
CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_session_token ON public.active_sessions(session_token);
CREATE INDEX idx_active_sessions_last_activity ON public.active_sessions(last_activity_at);

-- 로그인 시도 횟수 추적 테이블 (브루트포스 방지)
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  locked_until TIMESTAMPTZ,
  UNIQUE(email, ip_address)
);

COMMENT ON TABLE public.login_attempts IS '로그인 시도 횟수 추적 (브루트포스 방지)';
COMMENT ON COLUMN public.login_attempts.email IS '시도한 이메일';
COMMENT ON COLUMN public.login_attempts.ip_address IS 'IP 주소';
COMMENT ON COLUMN public.login_attempts.attempt_count IS '시도 횟수';
COMMENT ON COLUMN public.login_attempts.first_attempt_at IS '첫 시도 시간';
COMMENT ON COLUMN public.login_attempts.last_attempt_at IS '마지막 시도 시간';
COMMENT ON COLUMN public.login_attempts.locked_until IS '잠금 해제 시간';

-- 인덱스 생성
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_locked ON public.login_attempts(locked_until);

-- =====================================================
-- RLS 정책
-- =====================================================

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 로그인 로그: 관리자만 조회 가능
CREATE POLICY "login_logs_admin_select" ON public.login_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- 로그인 로그: 서비스 역할로만 삽입 가능 (트리거/함수에서)
CREATE POLICY "login_logs_service_insert" ON public.login_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 활성 세션: 본인 세션만 조회/삭제 가능
CREATE POLICY "active_sessions_own_select" ON public.active_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "active_sessions_own_delete" ON public.active_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 활성 세션: 인증된 사용자 삽입 가능
CREATE POLICY "active_sessions_insert" ON public.active_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 활성 세션: 본인 세션 업데이트 가능
CREATE POLICY "active_sessions_own_update" ON public.active_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 관리자는 모든 활성 세션 조회/삭제 가능
CREATE POLICY "active_sessions_admin_all" ON public.active_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- 로그인 시도: 익명/인증 모두 접근 가능 (로그인 전에도 확인 필요)
CREATE POLICY "login_attempts_anon_select" ON public.login_attempts
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "login_attempts_anon_insert" ON public.login_attempts
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "login_attempts_anon_update" ON public.login_attempts
  FOR UPDATE TO anon, authenticated
  USING (true);

-- =====================================================
-- 함수들
-- =====================================================

-- 로그인 로그 기록 함수
CREATE OR REPLACE FUNCTION public.log_login_event(
  p_email TEXT,
  p_event_type TEXT,
  p_failure_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  -- 이메일로 사용자 ID 조회
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  -- 로그 삽입
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
$$;

COMMENT ON FUNCTION public.log_login_event IS '로그인/로그아웃 이벤트 로그 기록';

-- 로그인 시도 확인 및 잠금 체크 함수
CREATE OR REPLACE FUNCTION public.check_login_attempt(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS TABLE (
  is_locked BOOLEAN,
  locked_until TIMESTAMPTZ,
  attempt_count INTEGER,
  remaining_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt RECORD;
  v_max_attempts INTEGER := 5; -- 최대 시도 횟수
  v_lockout_minutes INTEGER := 15; -- 잠금 시간 (분)
BEGIN
  -- 기존 시도 기록 조회
  SELECT * INTO v_attempt
  FROM public.login_attempts la
  WHERE la.email = p_email AND la.ip_address = p_ip_address;
  
  IF v_attempt IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0;
    RETURN;
  END IF;
  
  -- 잠금 상태 확인
  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > now() THEN
    RETURN QUERY SELECT 
      TRUE,
      v_attempt.locked_until,
      v_attempt.attempt_count,
      EXTRACT(EPOCH FROM (v_attempt.locked_until - now()))::INTEGER;
    RETURN;
  END IF;
  
  -- 잠금 해제된 경우 또는 1시간 이상 지난 경우 초기화
  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until <= now() THEN
    DELETE FROM public.login_attempts
    WHERE email = p_email AND ip_address = p_ip_address;
    
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0;
    RETURN;
  END IF;
  
  -- 1시간 이상 지난 시도는 초기화
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
$$;

COMMENT ON FUNCTION public.check_login_attempt IS '로그인 시도 확인 및 잠금 상태 체크';

-- 로그인 실패 기록 함수
CREATE OR REPLACE FUNCTION public.record_login_failure(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS TABLE (
  is_locked BOOLEAN,
  locked_until TIMESTAMPTZ,
  attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_attempts INTEGER := 5;
  v_lockout_minutes INTEGER := 15;
  v_attempt RECORD;
BEGIN
  -- UPSERT 시도 기록
  INSERT INTO public.login_attempts (email, ip_address, attempt_count, last_attempt_at)
  VALUES (p_email, p_ip_address, 1, now())
  ON CONFLICT (email, ip_address)
  DO UPDATE SET
    attempt_count = login_attempts.attempt_count + 1,
    last_attempt_at = now(),
    locked_until = CASE 
      WHEN login_attempts.attempt_count + 1 >= v_max_attempts 
      THEN now() + (v_lockout_minutes * INTERVAL '1 minute')
      ELSE login_attempts.locked_until
    END
  RETURNING * INTO v_attempt;
  
  RETURN QUERY SELECT 
    v_attempt.attempt_count >= v_max_attempts,
    v_attempt.locked_until,
    v_attempt.attempt_count;
END;
$$;

COMMENT ON FUNCTION public.record_login_failure IS '로그인 실패 기록 및 잠금 처리';

-- 로그인 성공 시 시도 횟수 초기화
CREATE OR REPLACE FUNCTION public.clear_login_attempts(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE email = p_email AND ip_address = p_ip_address;
END;
$$;

COMMENT ON FUNCTION public.clear_login_attempts IS '로그인 성공 시 시도 횟수 초기화';

-- 활성 세션 등록 및 중복 로그인 처리
CREATE OR REPLACE FUNCTION public.register_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS TABLE (
  kicked_sessions INTEGER,
  session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_kicked INTEGER := 0;
  v_session_id UUID;
  v_old_session RECORD;
BEGIN
  -- 기존 세션들 조회 (같은 사용자의 다른 세션)
  FOR v_old_session IN 
    SELECT * FROM public.active_sessions
    WHERE user_id = p_user_id AND session_token != p_session_token
  LOOP
    -- 강제 로그아웃 로그 기록
    PERFORM public.log_login_event(
      (SELECT email FROM auth.users WHERE id = p_user_id),
      'forced_logout',
      'duplicate_login',
      v_old_session.ip_address,
      v_old_session.user_agent,
      v_old_session.device_info,
      v_old_session.session_token
    );
    
    -- 기존 세션 삭제
    DELETE FROM public.active_sessions WHERE id = v_old_session.id;
    v_kicked := v_kicked + 1;
  END LOOP;
  
  -- 새 세션 등록 (이미 있으면 업데이트)
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
$$;

COMMENT ON FUNCTION public.register_session IS '세션 등록 및 중복 로그인 처리';

-- 세션 활동 업데이트
CREATE OR REPLACE FUNCTION public.update_session_activity(
  p_session_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.active_sessions
  SET last_activity_at = now()
  WHERE session_token = p_session_token;
END;
$$;

COMMENT ON FUNCTION public.update_session_activity IS '세션 활동 시간 업데이트';

-- 세션 종료 (로그아웃)
CREATE OR REPLACE FUNCTION public.end_session(
  p_session_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- 세션 정보 조회
  SELECT * INTO v_session
  FROM public.active_sessions
  WHERE session_token = p_session_token;
  
  IF v_session IS NOT NULL THEN
    -- 로그아웃 로그 기록
    PERFORM public.log_login_event(
      (SELECT email FROM auth.users WHERE id = v_session.user_id),
      'logout',
      NULL,
      v_session.ip_address,
      v_session.user_agent,
      v_session.device_info,
      p_session_token
    );
    
    -- 세션 삭제
    DELETE FROM public.active_sessions WHERE session_token = p_session_token;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.end_session IS '세션 종료 (로그아웃)';

-- 오래된 세션 정리 (스케줄러용)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION public.cleanup_old_sessions IS '오래된 세션 및 로그인 시도 기록 정리';

-- 로그인 통계 조회 (관리자용)
CREATE OR REPLACE FUNCTION public.get_login_statistics(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_logins BIGINT,
  successful_logins BIGINT,
  failed_logins BIGINT,
  unique_users BIGINT,
  forced_logouts BIGINT,
  top_failure_reasons JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION public.get_login_statistics IS '로그인 통계 조회';

