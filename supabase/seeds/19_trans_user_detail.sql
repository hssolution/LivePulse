-- =====================================================
-- 사용자 상세 팝업 관련 언어팩
-- =====================================================

-- 사용자 상세 정보
SELECT _seed_trans('admin.userDetail', '00000000-0000-0000-0001-000000000003'::uuid, '회원 상세 정보', 'User Details');
SELECT _seed_trans('admin.basicInfo', '00000000-0000-0000-0001-000000000003'::uuid, '기본 정보', 'Basic Info');
SELECT _seed_trans('admin.partnerInfo', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('admin.activityLog', '00000000-0000-0000-0001-000000000003'::uuid, '활동 로그', 'Activity Log');

-- 파트너 관련
SELECT _seed_trans('admin.ownedPartner', '00000000-0000-0000-0001-000000000003'::uuid, '소유 파트너', 'Owned Partner');
SELECT _seed_trans('admin.memberOfPartners', '00000000-0000-0000-0001-000000000003'::uuid, '소속 파트너', 'Member of Partners');
SELECT _seed_trans('admin.teamMembers', '00000000-0000-0000-0001-000000000003'::uuid, '팀 멤버', 'Team Members');
SELECT _seed_trans('admin.noPartnerData', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 정보를 찾을 수 없습니다.', 'Partner data not found.');
SELECT _seed_trans('admin.notPartner', '00000000-0000-0000-0001-000000000003'::uuid, '파트너가 아닙니다.', 'Not a partner.');

-- 활동 로그 관련
SELECT _seed_trans('admin.recentLogins', '00000000-0000-0000-0001-000000000003'::uuid, '최근 로그인 기록', 'Recent Login History');
SELECT _seed_trans('admin.loginSuccess', '00000000-0000-0000-0001-000000000003'::uuid, '로그인 성공', 'Login Success');
SELECT _seed_trans('admin.loginFailed', '00000000-0000-0000-0001-000000000003'::uuid, '로그인 실패', 'Login Failed');
SELECT _seed_trans('admin.logout', '00000000-0000-0000-0001-000000000003'::uuid, '로그아웃', 'Logout');
SELECT _seed_trans('admin.sessionExpired', '00000000-0000-0000-0001-000000000003'::uuid, '세션 만료', 'Session Expired');
SELECT _seed_trans('admin.forcedLogout', '00000000-0000-0000-0001-000000000003'::uuid, '강제 로그아웃', 'Forced Logout');
SELECT _seed_trans('admin.noLoginLogs', '00000000-0000-0000-0001-000000000003'::uuid, '로그인 기록이 없습니다.', 'No login history.');

-- 기타 정보
SELECT _seed_trans('admin.preferredLanguage', '00000000-0000-0000-0001-000000000003'::uuid, '선호 언어', 'Preferred Language');
SELECT _seed_trans('admin.description', '00000000-0000-0000-0001-000000000003'::uuid, '소개', 'Description');
SELECT _seed_trans('admin.createdSessions', '00000000-0000-0000-0001-000000000003'::uuid, '생성한 세션', 'Created Sessions');

-- 세션 관련
SELECT _seed_trans('admin.sessions', '00000000-0000-0000-0001-000000000003'::uuid, '세션', 'Sessions');
SELECT _seed_trans('admin.noSessions', '00000000-0000-0000-0001-000000000003'::uuid, '세션이 없습니다.', 'No sessions.');
SELECT _seed_trans('admin.showingRecent', '00000000-0000-0000-0001-000000000003'::uuid, '최근 {count}개 표시 중 (총 {total}개)', 'Showing recent {count} of {total}');
SELECT _seed_trans('admin.noTeamMembers', '00000000-0000-0000-0001-000000000003'::uuid, '팀원이 없습니다.', 'No team members.');

-- 공용
SELECT _seed_trans('common.manage', '00000000-0000-0000-0001-000000000001'::uuid, '관리', 'Manage');

-- 파트너 추가 정보
SELECT _seed_trans('partner.businessNumber', '00000000-0000-0000-0001-000000000004'::uuid, '사업자번호', 'Business Number');
SELECT _seed_trans('partner.purpose', '00000000-0000-0000-0001-000000000004'::uuid, '사용 목적', 'Purpose');

-- 파트너 정보 컬럼 관련
SELECT _seed_trans('admin.colPartnerInfo', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('admin.owner', '00000000-0000-0000-0001-000000000003'::uuid, '소유자', 'Owner');
SELECT _seed_trans('admin.joined', '00000000-0000-0000-0001-000000000003'::uuid, '가입', 'Joined');

-- 팀 역할
SELECT _seed_trans('team.roleOwner', '00000000-0000-0000-0001-000000000004'::uuid, '소유자', 'Owner');
SELECT _seed_trans('team.roleAdmin', '00000000-0000-0000-0001-000000000004'::uuid, '관리자', 'Admin');
SELECT _seed_trans('team.roleMember', '00000000-0000-0000-0001-000000000004'::uuid, '멤버', 'Member');

