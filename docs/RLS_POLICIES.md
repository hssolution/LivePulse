# LivePulse RLS 정책 설계

> 이 문서는 LivePulse 시스템의 Row Level Security(RLS) 정책을 정의합니다.
> 테이블 스키마는 [DB_SCHEMA.md](./DB_SCHEMA.md)를 참조하세요.

---

## 1. 헬퍼 함수

### 1.1 관리자 확인

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND user_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.2 파트너 소유자/관리자 확인

```sql
CREATE OR REPLACE FUNCTION public.is_partner_owner_or_admin(p_partner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 파트너 소속 여부 확인

```sql
CREATE OR REPLACE FUNCTION public.is_partner_member(p_partner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE partner_id = p_partner_id
    AND user_id = auth.uid()
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.4 본인 파트너 ID 조회

```sql
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.partners
    WHERE profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.5 세션 관련자 확인

```sql
CREATE OR REPLACE FUNCTION public.is_session_related(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- 세션 생성 파트너 소속
    SELECT 1 FROM public.sessions s
    JOIN public.partner_members pm ON pm.partner_id = s.partner_id
    WHERE s.id = p_session_id
    AND pm.user_id = auth.uid()
    AND pm.status = 'accepted'
  ) OR EXISTS (
    -- 초대된 파트너 소속
    SELECT 1 FROM public.session_partners sp
    JOIN public.partner_members pm ON pm.partner_id = sp.partner_id
    WHERE sp.session_id = p_session_id
    AND sp.status = 'accepted'
    AND pm.user_id = auth.uid()
    AND pm.status = 'accepted'
  ) OR EXISTS (
    -- 직접 역할 부여됨
    SELECT 1 FROM public.session_members
    WHERE session_id = p_session_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.6 세션 소유자/관리자 확인

```sql
CREATE OR REPLACE FUNCTION public.is_session_owner_or_admin(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.session_members
    WHERE session_id = p_session_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. 기존 테이블 RLS

### 2.1 profiles

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 또는 관리자
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR public.is_admin()
  );

-- UPDATE: 본인 또는 관리자
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.is_admin()
  );

-- INSERT: 트리거에서 자동 생성 (auth.users 생성 시)
-- DELETE: 관리자만 (또는 비활성화)
```

### 2.2 user_theme_settings

```sql
ALTER TABLE public.user_theme_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인만
CREATE POLICY "theme_select" ON public.user_theme_settings
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: 본인만
CREATE POLICY "theme_insert" ON public.user_theme_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: 본인만
CREATE POLICY "theme_update" ON public.user_theme_settings
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: 본인만
CREATE POLICY "theme_delete" ON public.user_theme_settings
  FOR DELETE USING (user_id = auth.uid());
```

### 2.3 languages / language_categories / language_keys / translations

```sql
-- 언어팩 관련 테이블은 모두 동일한 패턴

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증된 사용자 (언어팩은 공개)
CREATE POLICY "languages_select" ON public.languages
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE: 관리자만
CREATE POLICY "languages_admin" ON public.languages
  FOR ALL USING (public.is_admin());

-- language_categories, language_keys, translations도 동일
```

---

## 3. 파트너 관련 테이블 RLS

### 3.1 partners

```sql
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 파트너 OR 관리자 OR 활성 파트너 (검색용)
CREATE POLICY "partners_select" ON public.partners
  FOR SELECT USING (
    profile_id = auth.uid()                      -- 본인
    OR public.is_admin()                         -- 관리자
    OR (is_active = true)                        -- 활성 파트너 (검색/초대용)
  );

-- INSERT: 관리자만 (파트너 신청 승인 시)
CREATE POLICY "partners_insert" ON public.partners
  FOR INSERT WITH CHECK (public.is_admin());

-- UPDATE: 본인 파트너 OR 관리자
CREATE POLICY "partners_update" ON public.partners
  FOR UPDATE USING (
    profile_id = auth.uid() OR public.is_admin()
  );

-- DELETE: 관리자만
CREATE POLICY "partners_delete" ON public.partners
  FOR DELETE USING (public.is_admin());
```

### 3.2 partner_organizers / partner_agencies / partner_instructors

```sql
-- 세 테이블 모두 동일한 패턴

ALTER TABLE public.partner_organizers ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 파트너 OR 관리자
CREATE POLICY "partner_organizers_select" ON public.partner_organizers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_id
      AND (p.profile_id = auth.uid() OR public.is_admin())
    )
  );

-- INSERT: 관리자만 (파트너 신청 승인 시)
CREATE POLICY "partner_organizers_insert" ON public.partner_organizers
  FOR INSERT WITH CHECK (public.is_admin());

-- UPDATE: 본인 파트너 OR 관리자
CREATE POLICY "partner_organizers_update" ON public.partner_organizers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_id
      AND (p.profile_id = auth.uid() OR public.is_admin())
    )
  );

-- DELETE: 관리자만
CREATE POLICY "partner_organizers_delete" ON public.partner_organizers
  FOR DELETE USING (public.is_admin());

-- partner_agencies, partner_instructors도 동일하게 적용
```

### 3.3 partner_requests

```sql
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 신청 OR 관리자
CREATE POLICY "partner_requests_select" ON public.partner_requests
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- INSERT: 로그인 사용자 (본인만)
CREATE POLICY "partner_requests_insert" ON public.partner_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: 관리자만 (승인/거부 처리)
CREATE POLICY "partner_requests_update" ON public.partner_requests
  FOR UPDATE USING (public.is_admin());

-- DELETE: 없음 (이력 보관)
-- 필요시: 본인이 pending 상태일 때만 취소 가능
CREATE POLICY "partner_requests_delete" ON public.partner_requests
  FOR DELETE USING (
    user_id = auth.uid() AND status = 'pending'
  );
```

---

## 4. 팀원 관리 테이블 RLS

### 4.1 partner_members

```sql
ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

-- SELECT: 같은 파트너 소속 OR 관리자
CREATE POLICY "partner_members_select" ON public.partner_members
  FOR SELECT USING (
    public.is_partner_member(partner_id)
    OR public.is_admin()
  );

-- INSERT: 파트너 owner/admin OR 관리자
CREATE POLICY "partner_members_insert" ON public.partner_members
  FOR INSERT WITH CHECK (
    public.is_partner_owner_or_admin(partner_id)
    OR public.is_admin()
  );

-- UPDATE: 파트너 owner/admin OR 본인 (초대 수락/거부) OR 관리자
CREATE POLICY "partner_members_update" ON public.partner_members
  FOR UPDATE USING (
    public.is_partner_owner_or_admin(partner_id)
    OR user_id = auth.uid()
    OR public.is_admin()
  );

-- DELETE: 파트너 owner/admin OR 관리자 (owner는 삭제 불가 별도 처리)
CREATE POLICY "partner_members_delete" ON public.partner_members
  FOR DELETE USING (
    (public.is_partner_owner_or_admin(partner_id) AND role != 'owner')
    OR public.is_admin()
  );
```

---

## 5. 세션 관련 테이블 RLS

### 5.1 sessions

```sql
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: 세션 관련자 OR 관리자
CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT USING (
    public.is_session_related(id)
    OR public.is_admin()
  );

-- INSERT: 파트너 소속 사용자
CREATE POLICY "sessions_insert" ON public.sessions
  FOR INSERT WITH CHECK (
    public.is_partner_member(partner_id)
  );

-- UPDATE: 세션 owner/admin OR 관리자
CREATE POLICY "sessions_update" ON public.sessions
  FOR UPDATE USING (
    public.is_session_owner_or_admin(id)
    OR public.is_admin()
  );

-- DELETE: 세션 owner OR 관리자
CREATE POLICY "sessions_delete" ON public.sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.session_members
      WHERE session_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
    OR public.is_admin()
  );
```

### 5.2 session_partners

```sql
ALTER TABLE public.session_partners ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 세션 관련자 OR 초대받은 파트너 OR 관리자
CREATE POLICY "session_partners_select" ON public.session_partners
  FOR SELECT USING (
    public.is_session_related(session_id)
    OR public.is_partner_member(partner_id)
    OR public.is_admin()
  );

-- INSERT: 세션 owner/admin
CREATE POLICY "session_partners_insert" ON public.session_partners
  FOR INSERT WITH CHECK (
    public.is_session_owner_or_admin(session_id)
  );

-- UPDATE: 초대받은 파트너 (수락/거부) OR 세션 owner/admin OR 관리자
CREATE POLICY "session_partners_update" ON public.session_partners
  FOR UPDATE USING (
    public.is_partner_owner_or_admin(partner_id)
    OR public.is_session_owner_or_admin(session_id)
    OR public.is_admin()
  );

-- DELETE: 세션 owner/admin OR 관리자
CREATE POLICY "session_partners_delete" ON public.session_partners
  FOR DELETE USING (
    public.is_session_owner_or_admin(session_id)
    OR public.is_admin()
  );
```

### 5.3 session_members

```sql
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 세션 관련자 OR 관리자
CREATE POLICY "session_members_select" ON public.session_members
  FOR SELECT USING (
    public.is_session_related(session_id)
    OR public.is_admin()
  );

-- INSERT: 세션 owner/admin
CREATE POLICY "session_members_insert" ON public.session_members
  FOR INSERT WITH CHECK (
    public.is_session_owner_or_admin(session_id)
  );

-- UPDATE: 세션 owner/admin OR 관리자
CREATE POLICY "session_members_update" ON public.session_members
  FOR UPDATE USING (
    public.is_session_owner_or_admin(session_id)
    OR public.is_admin()
  );

-- DELETE: 세션 owner/admin OR 관리자 (owner는 삭제 불가)
CREATE POLICY "session_members_delete" ON public.session_members
  FOR DELETE USING (
    (public.is_session_owner_or_admin(session_id) AND role != 'owner')
    OR public.is_admin()
  );
```

### 5.4 session_presenters

```sql
ALTER TABLE public.session_presenters ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 세션 관련자 OR 초대받은 강사 파트너 OR 관리자
CREATE POLICY "session_presenters_select" ON public.session_presenters
  FOR SELECT USING (
    public.is_session_related(session_id)
    OR (partner_id IS NOT NULL AND public.is_partner_member(partner_id))
    OR public.is_admin()
  );

-- INSERT: 세션 owner/admin
CREATE POLICY "session_presenters_insert" ON public.session_presenters
  FOR INSERT WITH CHECK (
    public.is_session_owner_or_admin(session_id)
  );

-- UPDATE: 강사 파트너 (수락/거부) OR 세션 owner/admin OR 관리자
CREATE POLICY "session_presenters_update" ON public.session_presenters
  FOR UPDATE USING (
    (partner_id IS NOT NULL AND public.is_partner_owner_or_admin(partner_id))
    OR public.is_session_owner_or_admin(session_id)
    OR public.is_admin()
  );

-- DELETE: 세션 owner/admin OR 관리자
CREATE POLICY "session_presenters_delete" ON public.session_presenters
  FOR DELETE USING (
    public.is_session_owner_or_admin(session_id)
    OR public.is_admin()
  );
```

---

## 6. 정책 적용 순서

1. 헬퍼 함수 생성 (is_admin, is_partner_member 등)
2. 테이블에 RLS 활성화 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
3. 정책 생성 (SELECT, INSERT, UPDATE, DELETE 순서)
4. 테스트 (각 역할별로 CRUD 테스트)

---

## 7. 주의사항

### 7.1 SECURITY DEFINER
- 헬퍼 함수는 `SECURITY DEFINER`로 생성하여 호출자 권한이 아닌 함수 소유자 권한으로 실행
- 이를 통해 RLS 정책 내에서 다른 테이블 조회 가능

### 7.2 순환 참조 방지
- `is_session_related` 함수에서 `sessions`, `session_partners`, `session_members` 조회
- 해당 테이블들의 RLS 정책에서 이 함수를 사용하므로 순환 참조 주의
- `SECURITY DEFINER`로 해결

### 7.3 성능 고려
- 헬퍼 함수 호출이 많으면 성능 저하 가능
- 필요시 인덱스 추가 또는 정책 최적화

### 7.4 owner 보호
- `partner_members`와 `session_members`에서 owner 역할은 삭제 불가
- 파트너/세션 삭제 시에만 함께 삭제됨

---

## 8. 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2024-11-29 | 초기 문서 작성 |

