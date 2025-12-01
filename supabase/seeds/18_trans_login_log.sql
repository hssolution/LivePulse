-- =====================================================
-- 로그인 로그 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.loginLogs', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 로그', 'Login Logs');

-- 페이지 제목
SELECT _seed_trans('loginLog.title', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 로그', 'Login Logs');
SELECT _seed_trans('loginLog.desc', '00000000-0000-0000-0001-000000000001'::uuid, '사용자 로그인/로그아웃 기록을 확인합니다.', 'View user login/logout history.');

-- 통계
SELECT _seed_trans('loginLog.totalLogins', '00000000-0000-0000-0001-000000000001'::uuid, '총 로그인', 'Total Logins');
SELECT _seed_trans('loginLog.successfulLogins', '00000000-0000-0000-0001-000000000001'::uuid, '성공', 'Successful');
SELECT _seed_trans('loginLog.failedLogins', '00000000-0000-0000-0001-000000000001'::uuid, '실패', 'Failed');
SELECT _seed_trans('loginLog.uniqueUsers', '00000000-0000-0000-0001-000000000001'::uuid, '고유 사용자', 'Unique Users');
SELECT _seed_trans('loginLog.forcedLogouts', '00000000-0000-0000-0001-000000000001'::uuid, '강제 로그아웃', 'Forced Logouts');

-- 활성 세션
SELECT _seed_trans('loginLog.activeSessions', '00000000-0000-0000-0001-000000000001'::uuid, '활성 세션', 'Active Sessions');
SELECT _seed_trans('loginLog.activeSessionsDesc', '00000000-0000-0000-0001-000000000001'::uuid, '현재 로그인된 사용자 세션입니다.', 'Currently logged in user sessions.');
SELECT _seed_trans('loginLog.noActiveSessions', '00000000-0000-0000-0001-000000000001'::uuid, '활성 세션이 없습니다.', 'No active sessions.');
SELECT _seed_trans('loginLog.moreSessions', '00000000-0000-0000-0001-000000000001'::uuid, '개 더 보기', 'more sessions');
SELECT _seed_trans('loginLog.forceLogout', '00000000-0000-0000-0001-000000000001'::uuid, '강제 종료', 'Force Logout');
SELECT _seed_trans('loginLog.confirmForceLogout', '00000000-0000-0000-0001-000000000001'::uuid, '이 세션을 강제로 종료하시겠습니까?', 'Force end this session?');

-- 이벤트 타입
SELECT _seed_trans('loginLog.loginSuccess', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 성공', 'Login Success');
SELECT _seed_trans('loginLog.loginFailed', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 실패', 'Login Failed');
SELECT _seed_trans('loginLog.logout', '00000000-0000-0000-0001-000000000001'::uuid, '로그아웃', 'Logout');
SELECT _seed_trans('loginLog.forcedLogout', '00000000-0000-0000-0001-000000000001'::uuid, '강제 로그아웃', 'Forced Logout');
SELECT _seed_trans('loginLog.sessionExpired', '00000000-0000-0000-0001-000000000001'::uuid, '세션 만료', 'Session Expired');

-- 실패 사유
SELECT _seed_trans('loginLog.reasonInvalidPassword', '00000000-0000-0000-0001-000000000001'::uuid, '비밀번호 오류', 'Invalid Password');
SELECT _seed_trans('loginLog.reasonUserNotFound', '00000000-0000-0000-0001-000000000001'::uuid, '사용자 없음', 'User Not Found');
SELECT _seed_trans('loginLog.reasonAccountDisabled', '00000000-0000-0000-0001-000000000001'::uuid, '계정 비활성화', 'Account Disabled');
SELECT _seed_trans('loginLog.reasonEmailNotConfirmed', '00000000-0000-0000-0001-000000000001'::uuid, '이메일 미인증', 'Email Not Confirmed');
SELECT _seed_trans('loginLog.reasonTooManyAttempts', '00000000-0000-0000-0001-000000000001'::uuid, '시도 횟수 초과', 'Too Many Attempts');
SELECT _seed_trans('loginLog.reasonTooManyRequests', '00000000-0000-0000-0001-000000000001'::uuid, '요청 횟수 초과', 'Too Many Requests');
SELECT _seed_trans('loginLog.reasonDuplicateLogin', '00000000-0000-0000-0001-000000000001'::uuid, '중복 로그인', 'Duplicate Login');
SELECT _seed_trans('loginLog.reasonUnknown', '00000000-0000-0000-0001-000000000001'::uuid, '알 수 없는 오류', 'Unknown Error');

-- 필터
SELECT _seed_trans('loginLog.searchEmail', '00000000-0000-0000-0001-000000000001'::uuid, '이메일 검색...', 'Search email...');
SELECT _seed_trans('loginLog.eventType', '00000000-0000-0000-0001-000000000001'::uuid, '이벤트 타입', 'Event Type');
SELECT _seed_trans('loginLog.dateRange', '00000000-0000-0000-0001-000000000001'::uuid, '기간', 'Date Range');
SELECT _seed_trans('loginLog.last1Day', '00000000-0000-0000-0001-000000000001'::uuid, '최근 1일', 'Last 1 Day');
SELECT _seed_trans('loginLog.last7Days', '00000000-0000-0000-0001-000000000001'::uuid, '최근 7일', 'Last 7 Days');
SELECT _seed_trans('loginLog.last30Days', '00000000-0000-0000-0001-000000000001'::uuid, '최근 30일', 'Last 30 Days');
SELECT _seed_trans('loginLog.last90Days', '00000000-0000-0000-0001-000000000001'::uuid, '최근 90일', 'Last 90 Days');

-- 테이블
SELECT _seed_trans('loginLog.time', '00000000-0000-0000-0001-000000000001'::uuid, '시간', 'Time');
SELECT _seed_trans('loginLog.email', '00000000-0000-0000-0001-000000000001'::uuid, '이메일', 'Email');
SELECT _seed_trans('loginLog.failureReason', '00000000-0000-0000-0001-000000000001'::uuid, '실패 사유', 'Failure Reason');
SELECT _seed_trans('loginLog.device', '00000000-0000-0000-0001-000000000001'::uuid, '기기', 'Device');
SELECT _seed_trans('loginLog.ip', '00000000-0000-0000-0001-000000000001'::uuid, 'IP', 'IP');
SELECT _seed_trans('loginLog.noLogs', '00000000-0000-0000-0001-000000000001'::uuid, '로그인 기록이 없습니다.', 'No login logs.');

-- 상세 보기
SELECT _seed_trans('loginLog.detail', '00000000-0000-0000-0001-000000000001'::uuid, '로그 상세', 'Log Detail');
SELECT _seed_trans('loginLog.browser', '00000000-0000-0000-0001-000000000001'::uuid, '브라우저', 'Browser');
SELECT _seed_trans('loginLog.os', '00000000-0000-0000-0001-000000000001'::uuid, '운영체제', 'OS');
SELECT _seed_trans('loginLog.sessionId', '00000000-0000-0000-0001-000000000001'::uuid, '세션 ID', 'Session ID');
SELECT _seed_trans('loginLog.userAgent', '00000000-0000-0000-0001-000000000001'::uuid, 'User Agent', 'User Agent');

-- 로그인 페이지
SELECT _seed_trans('auth.accountLocked', '00000000-0000-0000-0001-000000000004'::uuid, '계정이 잠겼습니다.', 'Account is locked.');
SELECT _seed_trans('auth.tooManyAttempts', '00000000-0000-0000-0001-000000000004'::uuid, '로그인 시도 횟수를 초과했습니다.', 'Too many login attempts.');
SELECT _seed_trans('auth.attemptsRemaining', '00000000-0000-0000-0001-000000000004'::uuid, '남은 시도: {{count}}회', 'Attempts remaining: {{count}}');
SELECT _seed_trans('auth.unlockIn', '00000000-0000-0000-0001-000000000004'::uuid, '{{time}} 후 잠금 해제', 'Unlock in {{time}}');

-- 강제 로그아웃
SELECT _seed_trans('auth.duplicateLoginLogout', '00000000-0000-0000-0001-000000000004'::uuid, '다른 기기에서 로그인되었습니다.', 'Logged in from another device.');
SELECT _seed_trans('auth.duplicateLoginLogoutDesc', '00000000-0000-0000-0001-000000000004'::uuid, '보안을 위해 현재 세션이 종료되었습니다.', 'Your current session has been terminated for security.');
SELECT _seed_trans('auth.sessionExpired', '00000000-0000-0000-0001-000000000004'::uuid, '세션이 만료되었습니다.', 'Session expired.');

