# 프로필 정보 세션 연동 가이드

## 📋 개요

Supabase Auth의 **Custom Access Token Hook**을 사용하여 로그인 시 프로필 테이블의 정보를 JWT 토큰에 자동으로 포함시키는 방법입니다.

## 🔧 작동 원리

```
1. 사용자 로그인
   ↓
2. Supabase Auth가 custom_access_token_hook 함수 호출
   ↓
3. Hook 함수가 profiles 테이블에서 사용자 정보 조회
   ↓
4. 조회한 정보를 JWT 토큰의 클레임에 추가
   ↓
5. 클라이언트는 JWT 토큰을 디코딩하여 프로필 정보 사용
```

## 📁 구현된 파일들

### 1. 데이터베이스 마이그레이션
- `supabase/migrations/20251128000001_auth_hook.sql` - Auth Hook 함수 정의
- `supabase/migrations/[최신]_update_auth_hook_with_more_profile_info.sql` - 확장된 프로필 정보

### 2. Supabase 설정
- `supabase/config.toml` - Auth Hook 활성화 설정

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

### 3. 프론트엔드 코드
- `src/context/AuthContext.jsx` - 인증 컨텍스트 (JWT 디코딩 및 프로필 추출)
- `src/pages/ProfileTest.jsx` - 프로필 정보 테스트 페이지
- `src/pages/Dashboard.jsx` - 프로필 정보 사용 예시

## 💻 사용 방법

### 기본 사용법

```jsx
import { useAuth } from '@/context/AuthContext'

function MyComponent() {
  const { user, profile, loading } = useAuth()

  if (loading) return <div>로딩 중...</div>
  if (!user) return <div>로그인이 필요합니다</div>

  return (
    <div>
      <h1>환영합니다, {profile.email}님!</h1>
      <p>권한: {profile.role}</p>
      <p>사용자 유형: {profile.userType}</p>
      <p>상태: {profile.status}</p>
    </div>
  )
}
```

### 권한 체크

```jsx
function AdminPanel() {
  const { profile } = useAuth()

  // 관리자만 접근 가능
  if (profile?.role !== 'admin') {
    return <div>접근 권한이 없습니다</div>
  }

  return <div>관리자 패널</div>
}
```

### 사용자 유형별 분기

```jsx
function Dashboard() {
  const { profile } = useAuth()

  // 사용자 유형에 따라 다른 화면 표시
  switch (profile?.userType) {
    case 'partner':
      return <PartnerDashboard />
    case 'general':
      return <GeneralDashboard />
    default:
      return <DefaultDashboard />
  }
}
```

### 상태별 처리

```jsx
function StatusBanner() {
  const { profile } = useAuth()

  if (profile?.status === 'pending') {
    return (
      <div className="bg-yellow-100 p-4">
        계정 승인 대기 중입니다.
      </div>
    )
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="bg-red-100 p-4">
        계정이 정지되었습니다.
      </div>
    )
  }

  return null
}
```

### 프로필 새로고침

프로필 정보를 업데이트한 후 최신 정보를 가져오려면:

```jsx
function UpdateProfile() {
  const { refreshProfile } = useAuth()
  const { supabase } = useSupabase()

  const handleUpdate = async (newData) => {
    // 프로필 업데이트
    await supabase
      .from('profiles')
      .update(newData)
      .eq('id', user.id)

    // JWT 토큰 새로고침하여 최신 정보 가져오기
    await refreshProfile()
  }

  return <button onClick={handleUpdate}>프로필 업데이트</button>
}
```

## 📊 사용 가능한 프로필 정보

AuthContext에서 제공하는 `profile` 객체:

```typescript
{
  email: string,           // 이메일
  role: string,            // 권한 (admin, user 등)
  userType: string,        // 사용자 유형 (partner, general 등)
  status: string,          // 상태 (active, pending, suspended 등)
  description: string      // 설명
}
```

## 🔍 디버깅

### JWT 토큰 확인

```jsx
function DebugToken() {
  const { userClaims } = useAuth()

  return (
    <pre>
      {JSON.stringify(userClaims, null, 2)}
    </pre>
  )
}
```

### 브라우저 콘솔에서 확인

AuthContext는 자동으로 디코딩된 JWT를 콘솔에 출력합니다:

```
AuthContext: Decoded JWT { ... }
AuthContext: Profile data { ... }
```

## 🎯 테스트 페이지

프로필 정보가 제대로 작동하는지 확인하려면:

1. 로그인 후 `/adm/profile-test` 페이지 방문
2. 다음 정보들을 확인:
   - 기본 사용자 정보
   - 프로필 정보 (간편 접근)
   - 전체 JWT 클레임
3. "프로필 새로고침" 버튼으로 토큰 갱신 테스트

## ⚙️ 프로필 정보 추가/수정

더 많은 프로필 정보를 JWT에 포함시키려면:

1. `supabase/migrations/[최신]_update_auth_hook_with_more_profile_info.sql` 수정
2. Hook 함수에서 필요한 컬럼 추가:

```sql
select 
  email,
  role,
  user_type,
  status,
  description,
  -- 새로운 필드 추가
  phone_number,
  company_name
into profile_record
from public.profiles
where id = (event->>'user_id')::uuid;
```

3. claims 객체에 추가:

```sql
claims := jsonb_build_object(
  'email', profile_record.email,
  'role', profile_record.role,
  -- ... 기존 필드들
  'phone_number', profile_record.phone_number,
  'company_name', profile_record.company_name
);
```

4. 마이그레이션 적용:

```bash
npx supabase db reset
# 또는
npx supabase migration up
```

5. AuthContext.jsx의 profile 객체 업데이트:

```jsx
const profileData = {
  email: decoded.email,
  role: decoded.role,
  // ... 기존 필드들
  phoneNumber: decoded.phone_number,
  companyName: decoded.company_name
}
```

## 🚨 주의사항

1. **JWT 크기 제한**: 너무 많은 정보를 JWT에 포함시키면 토큰 크기가 커져서 성능에 영향을 줄 수 있습니다.

2. **민감한 정보**: 비밀번호, 결제 정보 등 민감한 정보는 JWT에 포함시키지 마세요.

3. **실시간 업데이트**: JWT는 발급 시점의 정보를 담고 있습니다. 프로필이 업데이트되면 `refreshProfile()`을 호출하거나 재로그인이 필요합니다.

4. **토큰 만료**: JWT는 만료 시간이 있습니다 (기본 3600초). 만료 후 자동으로 갱신됩니다.

## 📚 참고 자료

- [Supabase Auth Hooks 공식 문서](https://supabase.com/docs/guides/auth/auth-hooks)
- [JWT 토큰 이해하기](https://jwt.io/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

