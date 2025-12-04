




SELECT *
  FROM auth.users
;

SELECT *
  FROM public.profiles
;

SELECT email, email_confirmed_at, created_at
  FROM auth.users
 ORDER BY created_at DESC
 LIMIT 10
;


SELECT *
  FROM public.check_login_attempt('lhscj2466@gmail.com', '127.0.0.1')
;

-- 사용자 및 사이트 초기화
-- DELETE FROM auth.users;
-- DELETE FROM public.app_config WHERE key = 'admin_initialized';