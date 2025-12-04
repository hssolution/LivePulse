# 이메일 템플릿 설정 가이드

## 📍 위치
**Supabase Dashboard** → **Authentication** → **Email Templates**

## 🎯 목적
회원가입 인증, 비밀번호 재설정 등의 이메일을 한글로 커스터마이징합니다.

---

## 1. Confirm signup (회원가입 인증)

### Subject
```
LivePulse 회원가입 인증
```

### Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>회원가입 확인</title>
</head>
<body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #f97316; margin-bottom: 20px;">LivePulse</h1>
    <h2 style="color: #333;">회원가입을 환영합니다! 🎉</h2>
    <p style="color: #666; line-height: 1.6;">
      아래 버튼을 클릭하여 이메일 인증을 완료해주세요.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(to right, #f97316, #ec4899); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        이메일 인증하기
      </a>
    </div>
    <p style="color: #999; font-size: 14px;">
      본 링크는 24시간 동안 유효합니다.<br>
      본인이 요청하지 않았다면 이 메일을 무시해주세요.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">
      © LivePulse. All rights reserved.
    </p>
  </div>
</body>
</html>
```

---

## 2. Reset password (비밀번호 재설정)

### Subject
```
LivePulse 비밀번호 재설정
```

### Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>비밀번호 재설정</title>
</head>
<body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #f97316; margin-bottom: 20px;">LivePulse</h1>
    <h2 style="color: #333;">비밀번호 재설정 🔐</h2>
    <p style="color: #666; line-height: 1.6;">
      비밀번호 재설정 요청을 받았습니다.<br>
      아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(to right, #f97316, #ec4899); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        비밀번호 재설정
      </a>
    </div>
    <p style="color: #999; font-size: 14px;">
      본 링크는 1시간 동안 유효합니다.<br>
      본인이 요청하지 않았다면 이 메일을 무시해주세요.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">
      © LivePulse. All rights reserved.
    </p>
  </div>
</body>
</html>
```

---

## 📝 사용 가능한 변수

| 변수 | 설명 |
|------|------|
| `{{ .ConfirmationURL }}` | 인증/확인 링크 |
| `{{ .Token }}` | 토큰 값 |
| `{{ .TokenHash }}` | 토큰 해시 |
| `{{ .SiteURL }}` | 사이트 URL |
| `{{ .Email }}` | 사용자 이메일 |
| `{{ .Data }}` | user_metadata |

