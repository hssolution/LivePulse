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
SELECT _seed_trans('auth.emailNotConfirmed', '00000000-0000-0000-0001-000000000002'::uuid, '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.', 'Email not confirmed. Please check your inbox.');
SELECT _seed_trans('auth.userNotFound', '00000000-0000-0000-0001-000000000002'::uuid, '등록되지 않은 이메일입니다.', 'User not found.');
SELECT _seed_trans('auth.emailRequired', '00000000-0000-0000-0001-000000000002'::uuid, '이메일을 입력해주세요.', 'Please enter your email.');
SELECT _seed_trans('auth.passwordRequired', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호를 입력해주세요.', 'Please enter your password.');
SELECT _seed_trans('auth.passwordMismatch', '00000000-0000-0000-0001-000000000002'::uuid, '비밀번호가 일치하지 않습니다.', 'Passwords do not match.');
SELECT _seed_trans('auth.welcomeBack', '00000000-0000-0000-0001-000000000002'::uuid, '다시 오신 것을 환영합니다', 'Welcome Back');
SELECT _seed_trans('auth.loginDesc', '00000000-0000-0000-0001-000000000002'::uuid, '계정에 로그인하세요', 'Sign in to your account');

-- 이메일 인증 안내
SELECT _seed_trans('auth.emailSentTitle', '00000000-0000-0000-0001-000000000002'::uuid, '인증 메일이 발송되었습니다!', 'Verification Email Sent!');
SELECT _seed_trans('auth.emailSentDesc', '00000000-0000-0000-0001-000000000002'::uuid, '{email}로 인증 메일을 보냈습니다. 메일함을 확인하고 인증 링크를 클릭해주세요.', 'We''ve sent a verification email to {email}. Please check your inbox and click the verification link.');
SELECT _seed_trans('auth.emailSentTip1', '00000000-0000-0000-0001-000000000002'::uuid, '메일이 보이지 않으면 스팸함을 확인해주세요.', 'If you don''t see the email, check your spam folder.');
SELECT _seed_trans('auth.emailSentTip2', '00000000-0000-0000-0001-000000000002'::uuid, '인증 링크는 24시간 동안 유효합니다.', 'The verification link is valid for 24 hours.');
SELECT _seed_trans('auth.emailSentTip3', '00000000-0000-0000-0001-000000000002'::uuid, '인증 완료 후 로그인할 수 있습니다.', 'You can log in after verification.');

-- 이미 가입된 사용자
SELECT _seed_trans('auth.alreadyRegisteredTitle', '00000000-0000-0000-0001-000000000002'::uuid, '이미 가입된 이메일입니다', 'Email Already Registered');
SELECT _seed_trans('auth.alreadyRegisteredDesc', '00000000-0000-0000-0001-000000000002'::uuid, '{email}은(는) 이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요.', '{email} is already registered. Please log in instead.');
SELECT _seed_trans('auth.goToLogin', '00000000-0000-0000-0001-000000000002'::uuid, '로그인하러 가기', 'Go to Login');

-- 인증 대기중
SELECT _seed_trans('auth.pendingVerificationTitle', '00000000-0000-0000-0001-000000000002'::uuid, '이메일 인증 대기중', 'Email Verification Pending');
SELECT _seed_trans('auth.pendingVerificationDesc', '00000000-0000-0000-0001-000000000002'::uuid, '{email}은(는) 이미 가입되었지만 아직 이메일 인증이 완료되지 않았습니다.', '{email} is already registered but email verification is not completed yet.');
SELECT _seed_trans('auth.resendQuestion', '00000000-0000-0000-0001-000000000002'::uuid, '인증 메일을 다시 받으시겠습니까?', 'Would you like to receive the verification email again?');
SELECT _seed_trans('auth.resendEmail', '00000000-0000-0000-0001-000000000002'::uuid, '인증 메일 재발송', 'Resend Verification Email');

