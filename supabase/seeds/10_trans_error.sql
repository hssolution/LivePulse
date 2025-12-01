-- =====================================================
-- 에러 번역 (error)
-- =====================================================
SELECT _seed_trans('error.generic', '00000000-0000-0000-0001-000000000006'::uuid, '오류가 발생했습니다.', 'An error occurred.');
SELECT _seed_trans('error.notFound', '00000000-0000-0000-0001-000000000006'::uuid, '페이지를 찾을 수 없습니다.', 'Page not found.');
SELECT _seed_trans('error.unauthorized', '00000000-0000-0000-0001-000000000006'::uuid, '권한이 없습니다.', 'You are not authorized.');
SELECT _seed_trans('error.network', '00000000-0000-0000-0001-000000000006'::uuid, '네트워크 연결을 확인해주세요.', 'Please check your network connection.');
SELECT _seed_trans('error.sessionExpired', '00000000-0000-0000-0001-000000000006'::uuid, '세션이 만료되었습니다. 다시 로그인해주세요.', 'Your session has expired. Please log in again.');
SELECT _seed_trans('error.invalidPhone', '00000000-0000-0000-0001-000000000006'::uuid, '올바른 전화번호 형식이 아닙니다.', 'Invalid phone number format.');
SELECT _seed_trans('error.duplicatePhone', '00000000-0000-0000-0001-000000000006'::uuid, '이미 등록된 전화번호입니다.', 'This phone number is already registered.');
SELECT _seed_trans('error.minLength', '00000000-0000-0000-0001-000000000006'::uuid, '최소 {0}자 이상 입력해주세요.', 'Please enter at least {0} characters.');

