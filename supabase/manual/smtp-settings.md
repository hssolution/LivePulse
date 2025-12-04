# SMTP 설정 가이드 (선택)

## 📍 위치
**Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**

## 🎯 목적
기본 Supabase 이메일 대신 커스텀 SMTP 서버를 사용하여:
- 발신자 이름/이메일 변경
- 더 높은 발송 한도
- 브랜딩 일관성

---

## ⚙️ 설정값 예시 (Gmail SMTP)

| 항목 | 값 |
|------|-----|
| Sender email | `noreply@yourdomain.com` |
| Sender name | `LivePulse` |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `your-email@gmail.com` |
| Password | `앱 비밀번호` (2단계 인증 필요) |

---

## 📝 주의사항

1. **Supabase Pro 플랜 필요** (무료 플랜은 커스텀 SMTP 불가)
2. Gmail 사용 시 **앱 비밀번호** 생성 필요
3. 발송 테스트 후 적용 권장

---

## 🔧 Gmail 앱 비밀번호 생성

1. Google 계정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. "메일" + "기타(맞춤 이름)" 선택
5. 생성된 16자리 비밀번호 사용

---

## ✅ 대안: 외부 이메일 서비스

| 서비스 | 특징 |
|--------|------|
| SendGrid | 무료 100통/일, API 연동 |
| Resend | 개발자 친화적, 무료 100통/일 |
| Mailgun | 높은 발송량 |

Edge Function으로 연동하면 더 세밀한 제어 가능

