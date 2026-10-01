# 🔧 JWT 프로필 정보 누락 - 최종 해결 방법

## 현재 상황

✅ **Hook 함수 정상 작동 확인**
```json
{
  "role": "admin",
  "email": "lhscj2466@gmail.com",
  "status": "active",
  "user_type": "admin",
  "description": "시스템 관리자"
}
```

❌ **하지만 JWT에는 여전히 정보 없음**
- `role`: "authenticated" (기본값)
- `status`: undefined
- `userType`: undefined
- `description`: undefined

---

## 문제 원인

**브라우저에 저장된 오래된 JWT 토큰**

1. 프로필 생성 전에 발급된 토큰이 localStorage에 저장됨
2. 로그아웃/재로그인해도 토큰이 완전히 갱신되지 않음
3. Supabase 재시작 후에도 브라우저 캐시가 남아있음

---

## ✅ 최종 해결 방법

### 방법 1: 브라우저에서 완전히 정리 (가장 확실)

#### 단계 1: F12 개발자 도구 열기

#### 단계 2: Application 탭 → Storage 정리

1. **Local Storage**
   - `http://localhost:3000` 클릭
   - 모든 항목 삭제 (특히 `sb-` 로 시작하는 것들)

2. **Session Storage**
   - `http://localhost:3000` 클릭
   - 모든 항목 삭제

3. **Cookies**
   - `http://localhost:3000` 클릭
   - 모든 쿠키 삭제

#### 단계 3: 페이지 새로고침 (Ctrl + F5)

#### 단계 4: 다시 로그인

---

### 방법 2: 콘솔에서 정리 (빠른 방법)

브라우저 콘솔(F12 → Console)에서 실행:

```javascript
// 1. 모든 Supabase 데이터 정리
localStorage.clear()
sessionStorage.clear()

// 2. 페이지 새로고침
window.location.href = '/login'
```

---

### 방법 3: 시크릿 모드 테스트

1. **시크릿/프라이빗 브라우저 창** 열기
   - Chrome: Ctrl + Shift + N
   - Firefox: Ctrl + Shift + P
   - Edge: Ctrl + Shift + N

2. `http://localhost:3000/login` 접속

3. 로그인

4. 콘솔에서 JWT 확인:
   ```javascript
   const { data } = await supabase.auth.getSession()
   console.log(data.session.access_token)
   ```

5. [jwt.io](https://jwt.io)에 토큰 붙여넣기 → Payload 확인

---

## 🧪 확인 방법

로그인 후 콘솔에서 다음 명령어 실행:

```javascript
// 1. 세션 확인
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)

// 2. JWT 디코딩
import { jwtDecode } from 'jwt-decode'
const decoded = jwtDecode(data.session.access_token)
console.log('Decoded JWT:', decoded)

// 3. 프로필 정보 확인
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
  role: "admin",           // ✅ "admin" (아니면 "authenticated")
  userType: "admin",       // ✅ "admin" (아니면 undefined)
  status: "active",        // ✅ "active" (아니면 undefined)
  description: "시스템 관리자" // ✅ 있어야 함
}
```

---

## 🎯 체크리스트

- [ ] 브라우저 localStorage 완전 삭제
- [ ] 브라우저 sessionStorage 완전 삭제
- [ ] 쿠키 삭제
- [ ] 페이지 강력 새로고침 (Ctrl + F5)
- [ ] 로그아웃
- [ ] 다시 로그인
- [ ] 콘솔에서 JWT 확인
- [ ] `/adm/profile-test` 페이지에서 확인

---

## 💡 추가 팁

### JWT 실시간 확인

로그인 후 브라우저 콘솔에 이 코드를 붙여넣으면 JWT 내용을 바로 볼 수 있습니다:

```javascript
(async () => {
  const { data } = await supabase.auth.getSession()
  const token = data.session.access_token
  
  // JWT를 Base64 디코딩
  const payload = JSON.parse(atob(token.split('.')[1]))
  
  console.log('=== JWT Payload ===')
  console.log('Email:', payload.email)
  console.log('Role:', payload.role)
  console.log('User Type:', payload.user_type)
  console.log('Status:', payload.status)
  console.log('Description:', payload.description)
  console.log('Full Payload:', payload)
})()
```

### 문제가 계속되면

1. **Supabase 완전 재시작**
   ```bash
   npx supabase stop
   docker system prune -f
   npx supabase start
   ```

2. **브라우저 캐시 완전 삭제**
   - Chrome: Ctrl + Shift + Delete
   - "전체 기간" 선택
   - "쿠키 및 기타 사이트 데이터", "캐시된 이미지 및 파일" 체크
   - "데이터 삭제"

3. **다른 브라우저로 테스트**
   - 완전히 새로운 환경에서 테스트

---

## 🎉 성공 확인

다음과 같이 표시되면 성공:

### 헤더
```
lhscj2466@gmail.com  [admin] [admin] [active]
```

### Dashboard
```
환영합니다, lhscj2466@gmail.com님!
현재 상태: active
권한: admin
사용자 유형: admin
계정 상태: active
```

### Profile Test 페이지
```
Email: lhscj2466@gmail.com
Role: admin
User Type: admin
Status: active
Description: 시스템 관리자
```

---

## 📞 여전히 안 되면

다음 정보를 확인해주세요:

1. **Supabase 서버 상태**
   ```bash
   npx supabase status
   ```

2. **Auth Hook 설정**
   ```bash
   cat supabase/config.toml | grep -A 2 "auth.hook"
   ```

3. **Hook 함수 테스트**
   ```sql
   SELECT public.custom_access_token_hook(
     jsonb_build_object('user_id', 'b2019fe5-e8b8-4552-aad2-dbbcf0202bce')
   );
   ```

모두 정상이면 **브라우저 캐시 문제**입니다!

