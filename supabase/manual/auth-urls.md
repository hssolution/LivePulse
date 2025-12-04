# Auth URL 설정 가이드

## 📍 위치
**Supabase Dashboard** → **Authentication** → **URL Configuration**

## 🎯 목적
이메일 인증, 비밀번호 재설정 후 리다이렉트될 URL을 설정합니다.

---

## ⚙️ 설정값

### Site URL
```
https://livepulse.noligo.co.kr
```
또는 (Vercel 사용 시)
```
https://live-pulse.vercel.app
```

### Redirect URLs
```
https://livepulse.noligo.co.kr/**
https://live-pulse.vercel.app/**
http://localhost:5173/**
```

> ⚠️ **중요**: `/**`를 붙여서 모든 하위 경로 허용

---

## 🔧 로컬 개발 시

개발 환경에서도 테스트하려면 `http://localhost:5173/**`도 추가하세요.

---

## ✅ 확인 방법

1. 회원가입 후 이메일 인증 클릭
2. 설정한 Site URL로 리다이렉트되는지 확인
3. `localhost:3000`이나 다른 URL로 가면 설정 오류

