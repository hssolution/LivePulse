# LivePulse DB 스키마 설계

> 이 문서는 LivePulse 시스템의 데이터베이스 테이블 구조를 정의합니다.
> RLS 정책은 [RLS_POLICIES.md](./RLS_POLICIES.md)를 참조하세요.

---

## 1. 기존 테이블

### 1.1 profiles
> 사용자 프로필 정보 (auth.users와 1:1 연결)

```sql
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  user_role       TEXT DEFAULT 'user',           -- 'admin' | 'user'
  user_type       TEXT DEFAULT 'general',        -- 'admin' | 'general' | 'partner'
  status          TEXT DEFAULT 'active',         -- 'active' | 'pending' | 'suspended'
  description     TEXT,
  preferred_language TEXT DEFAULT 'ko' REFERENCES public.languages(code),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 user_theme_settings
> 관리자/파트너 테마 설정

```sql
CREATE TABLE public.user_theme_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mode        TEXT DEFAULT 'light',              -- 'light' | 'dark'
  preset      TEXT DEFAULT 'theme-a',            -- 'theme-a' | 'theme-b' | 'theme-c' | 'theme-d'
  font_size   TEXT DEFAULT 'medium',             -- 'small' | 'medium' | 'large'
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 languages
> 지원 언어 목록

```sql
CREATE TABLE public.languages (
  code        TEXT PRIMARY KEY,                  -- 'ko' | 'en' | ...
  name        TEXT NOT NULL,                     -- 'Korean' | 'English'
  native_name TEXT NOT NULL,                     -- '한국어' | 'English'
  is_default  BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 language_categories
> 언어팩 카테고리

```sql
CREATE TABLE public.language_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,              -- 'common' | 'auth' | 'admin' | ...
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 language_keys
> 언어팩 키

```sql
CREATE TABLE public.language_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,              -- 'auth.login' | 'admin.dashboard' | ...
  category_id UUID REFERENCES public.language_categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### 1.6 translations
> 번역 데이터

```sql
CREATE TABLE public.translations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID REFERENCES public.language_keys(id) ON DELETE CASCADE,
  language_code TEXT REFERENCES public.languages(code) ON DELETE CASCADE,
  value         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(key_id, language_code)
);
```

---

## 2. 파트너 관련 테이블

### 2.1 partners (공통 정보)
> 승인된 파트너의 공통 정보

```sql
CREATE TABLE public.partners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  partner_type        TEXT NOT NULL,             -- 'organizer' | 'agency' | 'instructor'
  representative_name TEXT NOT NULL,             -- 대표자명
  phone               TEXT NOT NULL,             -- 연락처
  purpose             TEXT,                      -- 사용 목적
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_partners_profile_id ON public.partners(profile_id);
CREATE INDEX idx_partners_partner_type ON public.partners(partner_type);
CREATE INDEX idx_partners_is_active ON public.partners(is_active);
```

### 2.2 partner_organizers (행사자 전용)
> 행사자 타입 파트너의 추가 정보

```sql
CREATE TABLE public.partner_organizers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID REFERENCES public.partners(id) ON DELETE CASCADE UNIQUE,
  company_name    TEXT NOT NULL,                 -- 회사/단체명 (필수)
  business_number TEXT,                          -- 사업자번호 (선택)
  industry        TEXT,                          -- 업종/분야
  expected_scale  TEXT,                          -- 예상 행사 규모
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_partner_organizers_partner_id ON public.partner_organizers(partner_id);
```

### 2.3 partner_agencies (대행업체 전용)
> 대행업체 타입 파트너의 추가 정보

```sql
CREATE TABLE public.partner_agencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID REFERENCES public.partners(id) ON DELETE CASCADE UNIQUE,
  company_name    TEXT NOT NULL,                 -- 회사명 (필수)
  business_number TEXT NOT NULL,                 -- 사업자번호 (필수)
  industry        TEXT,                          -- 업종/분야
  client_type     TEXT,                          -- 주요 클라이언트 유형
  expected_scale  TEXT,                          -- 예상 대행 규모
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_partner_agencies_partner_id ON public.partner_agencies(partner_id);
```

### 2.4 partner_instructors (강사 전용)
> 강사 타입 파트너의 추가 정보

```sql
CREATE TABLE public.partner_instructors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID REFERENCES public.partners(id) ON DELETE CASCADE UNIQUE,
  display_name      TEXT,                        -- 활동명/닉네임 (선택)
  specialty         TEXT,                        -- 전문 분야 (선택)
  bio               TEXT,                        -- 소개 (선택)
  profile_image_url TEXT,                        -- 프로필 이미지 (선택)
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_partner_instructors_partner_id ON public.partner_instructors(partner_id);
```

### 2.5 partner_requests (파트너 신청)
> 파트너 신청 및 이력 관리

```sql
CREATE TABLE public.partner_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 공통 필수
  partner_type        TEXT NOT NULL,             -- 'organizer' | 'agency' | 'instructor'
  representative_name TEXT NOT NULL,             -- 대표자명
  phone               TEXT NOT NULL,             -- 연락처
  purpose             TEXT NOT NULL,             -- 사용 목적
  
  -- 행사자/대행업체용
  company_name        TEXT,                      -- 회사명
  business_number     TEXT,                      -- 사업자번호
  industry            TEXT,                      -- 업종/분야
  expected_scale      TEXT,                      -- 예상 규모
  client_type         TEXT,                      -- 주요 클라이언트 (대행업체용)
  
  -- 강사용
  display_name        TEXT,                      -- 활동명
  specialty           TEXT,                      -- 전문 분야
  bio                 TEXT,                      -- 소개
  
  -- 처리 상태
  status              TEXT DEFAULT 'pending',    -- 'pending' | 'approved' | 'rejected'
  reviewed_by         UUID REFERENCES auth.users(id),
  reviewed_at         TIMESTAMPTZ,
  reject_reason       TEXT,
  
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_partner_requests_user_id ON public.partner_requests(user_id);
CREATE INDEX idx_partner_requests_status ON public.partner_requests(status);
CREATE INDEX idx_partner_requests_partner_type ON public.partner_requests(partner_type);
```

---

## 3. 팀원 관리 테이블

### 3.1 partner_members
> 파트너 소속 팀원 관리

```sql
CREATE TABLE public.partner_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT DEFAULT 'member',           -- 'owner' | 'admin' | 'member'
  status        TEXT DEFAULT 'pending',          -- 'pending' | 'accepted' | 'rejected'
  invite_token  TEXT,
  invited_at    TIMESTAMPTZ DEFAULT now(),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(partner_id, email)
);

-- 인덱스
CREATE INDEX idx_partner_members_partner_id ON public.partner_members(partner_id);
CREATE INDEX idx_partner_members_user_id ON public.partner_members(user_id);
CREATE INDEX idx_partner_members_email ON public.partner_members(email);
CREATE INDEX idx_partner_members_status ON public.partner_members(status);
CREATE INDEX idx_partner_members_invite_token ON public.partner_members(invite_token);
```

---

## 4. 세션 관련 테이블

### 4.1 sessions
> 세션 기본 정보

```sql
CREATE TABLE public.sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  code                  TEXT UNIQUE NOT NULL,    -- 참여 코드 (6자리 등)
  status                TEXT DEFAULT 'draft',    -- 'draft' | 'scheduled' | 'active' | 'ended'
  scheduled_at          TIMESTAMPTZ,             -- 예정 시작 시간
  started_at            TIMESTAMPTZ,             -- 실제 시작 시간
  ended_at              TIMESTAMPTZ,             -- 종료 시간
  expected_participants INTEGER,                 -- 예상 참여자 수
  location              TEXT,                    -- 장소
  cover_image_url       TEXT,                    -- 커버 이미지
  settings              JSONB DEFAULT '{}',      -- Q&A, 설문 등 설정
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_sessions_partner_id ON public.sessions(partner_id);
CREATE INDEX idx_sessions_code ON public.sessions(code);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_scheduled_at ON public.sessions(scheduled_at);
```

### 4.2 session_partners (초대된 파트너)
> 세션에 초대된 파트너 (1개만 가능)

```sql
CREATE TABLE public.session_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  partner_id    UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending',          -- 'pending' | 'accepted' | 'rejected'
  invited_by    UUID REFERENCES auth.users(id),
  invited_at    TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(session_id, partner_id)
);

-- 인덱스
CREATE INDEX idx_session_partners_session_id ON public.session_partners(session_id);
CREATE INDEX idx_session_partners_partner_id ON public.session_partners(partner_id);
CREATE INDEX idx_session_partners_status ON public.session_partners(status);
```

### 4.3 session_members (세션 역할)
> 세션 내 사용자 역할 부여

```sql
CREATE TABLE public.session_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,                     -- 'owner' | 'admin' | 'moderator' | 'viewer'
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(session_id, user_id)
);

-- 인덱스
CREATE INDEX idx_session_members_session_id ON public.session_members(session_id);
CREATE INDEX idx_session_members_user_id ON public.session_members(user_id);
CREATE INDEX idx_session_members_role ON public.session_members(role);
```

### 4.4 session_presenters (강사)
> 세션 강사 관리

```sql
CREATE TABLE public.session_presenters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  presenter_type  TEXT NOT NULL,                 -- 'member' | 'partner' | 'manual'
  user_id         UUID REFERENCES auth.users(id),          -- member 타입
  partner_id      UUID REFERENCES public.partners(id),     -- partner 타입 (강사 파트너)
  manual_name     TEXT,                          -- manual 타입 (직접 입력)
  status          TEXT DEFAULT 'confirmed',      -- 'pending' | 'confirmed' | 'rejected'
  invited_at      TIMESTAMPTZ DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_session_presenters_session_id ON public.session_presenters(session_id);
CREATE INDEX idx_session_presenters_user_id ON public.session_presenters(user_id);
CREATE INDEX idx_session_presenters_partner_id ON public.session_presenters(partner_id);
CREATE INDEX idx_session_presenters_status ON public.session_presenters(status);
```

---

## 5. 향후 추가 예정 테이블 (Phase 12~)

### 5.1 session_participants
> 세션 참여 청중

```sql
-- Phase 14에서 상세 설계
CREATE TABLE public.session_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  nickname    TEXT,
  device_id   TEXT,                              -- 비로그인 사용자 식별
  user_id     UUID REFERENCES auth.users(id),   -- 로그인 사용자 (선택)
  joined_at   TIMESTAMPTZ DEFAULT now(),
  left_at     TIMESTAMPTZ
);
```

### 5.2 questions
> Q&A 질문

```sql
-- Phase 12에서 상세 설계
CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id  UUID REFERENCES public.session_participants(id),
  content         TEXT NOT NULL,
  likes_count     INTEGER DEFAULT 0,
  is_answered     BOOLEAN DEFAULT false,
  is_hidden       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 5.3 polls
> 설문

```sql
-- Phase 13에서 상세 설계
CREATE TABLE public.polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT DEFAULT 'single',             -- 'single' | 'multiple'
  options     JSONB NOT NULL,
  status      TEXT DEFAULT 'draft',              -- 'draft' | 'active' | 'closed'
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 poll_responses
> 설문 응답

```sql
-- Phase 13에서 상세 설계
CREATE TABLE public.poll_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  participant_id  UUID REFERENCES public.session_participants(id),
  selected        JSONB NOT NULL,                -- 선택한 옵션들
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. 헬퍼 함수

### 6.1 참여 코드 생성

```sql
CREATE OR REPLACE FUNCTION public.generate_session_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 updated_at 자동 갱신 트리거

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.partner_organizers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ... 다른 테이블들도 동일하게 적용
```

---

## 7. 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2024-11-29 | 초기 문서 작성 |
| 2024-11-29 | 파트너 테이블 분리 구조로 변경 (partners + partner_organizers/agencies/instructors) |

