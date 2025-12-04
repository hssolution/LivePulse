# Auth Hook 설정 가이드

## 📍 위치
**Supabase Dashboard** → **Authentication** → **Hooks**

## 🎯 목적
로그인 시 JWT에 사용자 정보(role, type, status 등)를 포함시켜서,
프론트엔드에서 권한 체크를 할 수 있게 합니다.

## ⚙️ 설정 방법

### 1. Dashboard 접속
```
https://supabase.com/dashboard/project/[PROJECT_REF]/auth/hooks
```

### 2. "Customize Access Token (JWT) Claims" 찾기

### 3. 설정값 입력

| 항목 | 값 |
|------|-----|
| Enable | ✅ ON |
| Hook type | Postgres |
| Postgres Schema | `public` |
| Postgres function | `custom_access_token_hook` |

### 4. Save 클릭

## ✅ 확인 방법

1. 로그아웃 → 다시 로그인
2. 브라우저 DevTools → Application → Local Storage
3. `sb-[ref]-auth-token` 값 확인
4. JWT 디코딩 (jwt.io)
5. `user_role`, `user_type` 등이 포함되어 있으면 성공!

## 📝 참고

- Hook 함수는 마이그레이션 `001_init.sql`에서 생성됨
- 함수 내용 수정 시 마이그레이션 파일도 업데이트 필요

