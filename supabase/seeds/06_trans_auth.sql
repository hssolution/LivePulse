-- =====================================================
-- 인증 번역 (auth)
-- =====================================================
SELECT _seed_trans('auth.login', '00000000-0000-0000-0001-000000000002'::uuid, '로그인', 'Login');
SELECT _seed_trans('auth.logout', '00000000-0000-0000-0001-000000000002'::uuid, '로그아웃', 'Logout');
SELECT _seed_trans('auth.signup', '00000000-0000-0000-0001-000000000002'::uuid, '회원가입', 'Sign Up');
SELECT _seed_trans('auth.email', '00000000-0000-0000-0001-000000000002'::uuid, '이메일', 'Email');
SELECT _seed_trans('auth.password', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호', 'Password');
SELECT _seed_trans('auth.confirmPassword', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호 확인', 'Confirm Password');
SELECT _seed_trans('auth.forgotPassword', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호를 잊으셨나요?', 'Forgot password?');
SELECT _seed_trans('auth.resetPassword', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호 재설정', 'Reset Password');
SELECT _seed_trans('auth.backToHome', '00000000-0000-0000-0001-000000000002'::uuid, '← 홈으로', '← Back to Home');
SELECT _seed_trans('auth.createAdminAccount', '00000000-0000-0000-0001-000000000002'::uuid, '관리자 계정 생성', 'Create Admin Account');
SELECT _seed_trans('auth.createAccount', '00000000-0000-0000-0001-000000000002'::uuid, '계정 생성', 'Create Account');
SELECT _seed_trans('auth.agreeTerms', '00000000-0000-0000-0001-000000000002'::uuid, '가입 시 이용약관 및 개인정보처리방침에 동의합니다.', 'By signing up, you agree to our Terms of Service and Privacy Policy.');
SELECT _seed_trans('auth.termsOfService', '00000000-0000-0000-0001-000000000002'::uuid, '이용약관', 'Terms of Service');
SELECT _seed_trans('auth.privacyPolicy', '00000000-0000-0000-0001-000000000002'::uuid, '개인정보처리방침', 'Privacy Policy');
SELECT _seed_trans('auth.noAccount', '00000000-0000-0000-0001-000000000002'::uuid, '계정이 없으신가요?', 'Don''t have an account?');
SELECT _seed_trans('auth.alreadyHaveAccount', '00000000-0000-0000-0001-000000000002'::uuid, '이미 계정이 있으신가요?', 'Already have an account?');
SELECT _seed_trans('auth.loginSuccess', '00000000-0000-0000-0001-000000000002'::uuid, '로그인되었습니다.', 'Successfully logged in.');
SELECT _seed_trans('auth.logoutSuccess', '00000000-0000-0000-0001-000000000002'::uuid, '로그아웃되었습니다.', 'Successfully logged out.');
SELECT _seed_trans('auth.signupSuccess', '00000000-0000-0000-0001-000000000002'::uuid, '회원가입이 완료되었습니다.', 'Successfully signed up.');
SELECT _seed_trans('auth.invalidCredentials', '00000000-0000-0000-0001-000000000002'::uuid, '이메일 또는 비밀번호가 올바르지 않습니다.', 'Invalid email or password.');
SELECT _seed_trans('auth.emailRequired', '00000000-0000-0000-0001-000000000002'::uuid, '이메일을 입력해주세요.', 'Please enter your email.');
SELECT _seed_trans('auth.passwordRequired', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호를 입력해주세요.', 'Please enter your password.');
SELECT _seed_trans('auth.passwordMismatch', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호가 일치하지 않습니다.', 'Passwords do not match.');

