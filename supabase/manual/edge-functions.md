# Edge Functions 설정 가이드

## 📍 위치
**Supabase Dashboard** → **Project Settings** → **Edge Functions**

## 🎯 목적
서버리스 함수를 통한 추가 기능:
- 초대 이메일 발송 (`send-invite-email`)
- 기타 백엔드 로직

---

## ⚙️ Secrets 설정 (환경변수)

### 1. Edge Functions 탭 이동
1. Supabase Dashboard 접속
2. 좌측 **Project Settings** (톱니바퀴)
3. **Edge Functions** 탭 클릭
4. **Secrets** 섹션에서 **Add new secret**

### 2. 필요한 Secrets

| Name | 설명 | 예시 값 |
|------|------|---------|
| `RESEND_API_KEY` | Resend API 키 | `re_xxxxx...` |
| `SITE_URL` | 사이트 URL | `https://livepulse.noligo.co.kr` |
| `FROM_EMAIL` | 발신 이메일 | `onboarding@resend.dev` |

---

## 📧 Resend 설정

### 1. Resend 가입
1. https://resend.com 접속
2. GitHub/Google 계정으로 가입
3. 무료 플랜: **월 3,000건**

### 2. API 키 발급
1. Dashboard → **API Keys**
2. **Create API Key** 클릭
3. 이름 입력 (예: `livepulse-production`)
4. 생성된 키 복사 (`re_` 로 시작)

### 3. 발신 이메일 설정

| 상태 | FROM_EMAIL 값 |
|------|---------------|
| 테스트 단계 | `onboarding@resend.dev` (기본 제공) |
| 프로덕션 | 도메인 인증 후 커스텀 이메일 |

### 4. 도메인 인증 (선택)
1. Resend Dashboard → **Domains**
2. **Add Domain** 클릭
3. 도메인 입력 (예: `livepulse.noligo.co.kr`)
4. DNS 레코드 추가 (DKIM, SPF)
5. 인증 완료 후 커스텀 이메일 사용 가능

---

## 🚀 배포된 Edge Functions

| 함수명 | 용도 | 호출 방식 |
|--------|------|-----------|
| `send-invite-email` | 팀원 초대 이메일 발송 | `supabase.functions.invoke()` |

---

## ✅ 테스트

```javascript
// 프론트엔드에서 호출 예시
const { data, error } = await supabase.functions.invoke('send-invite-email', {
  body: {
    to: 'test@example.com',
    inviteToken: 'abc123',
    partnerName: '테스트 회사',
    inviterName: '홍길동',
    role: 'member',
    language: 'ko'
  }
})
```

---

## 🔧 트러블슈팅

### "RESEND_API_KEY is not configured"
- Secrets에 `RESEND_API_KEY` 추가 확인

### 이메일 발송 실패
- Resend Dashboard에서 로그 확인
- FROM_EMAIL이 인증된 도메인인지 확인
- API 키가 유효한지 확인

### CORS 에러
- Edge Function에 CORS 헤더 포함되어 있음 (이미 처리됨)

