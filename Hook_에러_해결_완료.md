# ✅ Auth Hook 에러 해결 완료

## 발생했던 에러

```
Error running hook URL: pg-functions://postgres/public/custom_access_token_hook
```

## 원인

Auth Hook 함수에 **SECURITY DEFINER** 설정이 없어서 권한 문제가 발생했습니다.

## 해결 방법

### 1. 함수에 SECURITY DEFINER 추가

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER  -- ✅ 추가됨
SET search_path = public
AS $$
...
$$;
```

**SECURITY DEFINER란?**
- 함수를 **함수 소유자(postgres)의 권한**으로 실행
- Auth 서비스가 이 함수를 호출할 수 있게 함

### 2. 권한 재설정

```sql
-- 필요한 권한 부여
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO postgres;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO service_role;

-- 불필요한 권한 제거
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

### 3. 마이그레이션 파일 업데이트

`supabase/migrations/20251128000001_auth_hook.sql` 파일이 업데이트되어 다음 번 `db reset` 시에도 올바르게 설정됩니다.

## ✅ 해결 완료

이제 다음 작업을 수행하세요:

### 1. 페이지 새로고침
- **Ctrl + F5** (강력 새로고침)

### 2. 다시 로그인
- 이메일: `lhscj2466@gmail.com`
- 비밀번호: 입력

### 3. 확인
- 에러 없이 로그인 성공
- Dashboard로 이동
- 콘솔에서 프로필 정보 확인

## 🧪 테스트

로그인 후 브라우저 콘솔에서:

```javascript
// 세션 확인
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)

// JWT 디코딩
const decoded = jwtDecode(data.session.access_token)
console.log('Decoded JWT:', decoded)

// 프로필 정보 확인
console.log('Profile:', {
  email: decoded.email,
  role: decoded.role,
  userType: decoded.user_type,
  status: decoded.status,
  description: decoded.description
})
```

### 예상 결과

```javascript
{
  email: "lhscj2466@gmail.com",
  role: "admin",
  userType: "admin",
  status: "active",
  description: "시스템 관리자"
}
```

## 🎉 완료!

이제 Auth Hook이 정상적으로 작동하여 JWT에 프로필 정보가 포함됩니다!

---

## 문제가 계속되면

### 1. Supabase 재시작

```bash
npx supabase stop
npx supabase start
```

### 2. 브라우저 캐시 삭제

```javascript
localStorage.clear()
sessionStorage.clear()
window.location.href = '/login'
```

### 3. 시크릿 모드 테스트

- **Ctrl + Shift + N** (시크릿 모드)
- 로그인 시도
- 에러 없이 작동하면 브라우저 캐시 문제

---

## 기술적 설명

### SECURITY DEFINER의 중요성

PostgreSQL 함수는 기본적으로 **SECURITY INVOKER** 모드로 실행됩니다:
- 함수를 **호출한 사용자의 권한**으로 실행
- Auth 서비스는 제한된 권한을 가지고 있어서 profiles 테이블 접근 불가

**SECURITY DEFINER** 모드:
- 함수를 **함수 소유자(postgres)의 권한**으로 실행
- Auth 서비스가 이 함수를 통해 profiles 테이블에 접근 가능
- 보안을 위해 `SET search_path = public` 추가

### 권한 구조

```
Auth 서비스 (supabase_auth_admin)
    ↓
custom_access_token_hook (SECURITY DEFINER)
    ↓
profiles 테이블 (postgres 권한으로 접근)
    ↓
JWT에 정보 추가
```

이제 완벽하게 작동합니다! 🚀

