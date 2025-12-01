# LivePulse 남은 작업 목록

> 작성일: 2025-11-30
> 현재 상태: Phase 13 완료

---

## ✅ 완료된 Phase 요약

| Phase | 내용 | 완료일 |
|-------|------|--------|
| Phase 1 | 반응형 디자인 | 완료 |
| Phase 2 | 테마 시스템 (Light/Dark, 관리자 커스텀) | 완료 |
| Phase 3 | 역할 분리 (관리자/파트너 레이아웃) | 완료 |
| Phase 4 | 모던 디자인 적용 (shadcn/ui) | 완료 |
| Phase 5 | 최적화 (코드 스플리팅, 로딩) | 완료 |
| Phase 6 | 회원 시스템 개편 (가입, 파트너 신청, 승인) | 완료 |
| Phase 7 | 언어팩 시스템 (DB 기반, 관리자 화면) | 완료 |
| Phase 7.5 | 기존 텍스트 언어팩 교체 | 완료 |
| Phase 8 | 파트너 타입 확장 (행사자/대행사/강사) | 완료 |
| Phase 9 | 팀원 관리 시스템 (초대, 수락, 역할) | 완료 |
| Phase 10 | 세션 기본 구조 (생성, 목록, 상세) | 완료 |
| Phase 11 | 템플릿 관리 시스템 (관리자 템플릿 편집) | 완료 |
| Phase 12 | 세션 강사/파트너 연결 (협업 기능) | 완료 |
| Phase 13 | 실시간 Q&A (질문 등록, 좋아요, 답변) | 완료 |

---

## 🔜 남은 Phase

### Phase 14: 실시간 설문 (핵심 기능)

#### 14.1 DB 스키마
```sql
-- polls 테이블
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  poll_type TEXT DEFAULT 'single', -- 'single', 'multiple', 'rating', 'open'
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'closed'
  show_results BOOLEAN DEFAULT false,
  allow_anonymous BOOLEAN DEFAULT true,
  max_selections INTEGER DEFAULT 1, -- multiple 타입용
  display_order INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- poll_options 테이블
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- poll_responses 테이블
CREATE TABLE poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  anonymous_id TEXT, -- 비로그인 사용자용
  response_text TEXT, -- open 타입용
  rating_value INTEGER, -- rating 타입용
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id) -- 중복 응답 방지
);
```

#### 14.2 파트너: 설문 관리 화면
- 설문 목록 (세션별)
- 설문 생성 (질문, 타입, 옵션)
- 설문 수정/삭제
- 설문 활성화/종료
- 실시간 결과 보기 (차트)

#### 14.3 청중: 설문 응답 화면
- 활성화된 설문 표시
- 응답 제출
- 결과 보기 (설정에 따라)

#### 14.4 실시간 업데이트
- Supabase Realtime으로 응답 즉시 반영
- 결과 차트 실시간 갱신

#### 14.5 언어팩 추가
- `poll.*` 키 추가 (생성, 응답, 결과 등)

---

### Phase 15: 청중 참여 화면 개선 (UX)

#### 15.1 세션 참여 페이지 (`/join/:code`)
- 세션 정보 표시 개선
- 참여 코드 입력 UX
- 대기 화면 (세션 시작 전)

#### 15.2 실시간 참여 화면 (`/live/:code`)
- Q&A + 설문 통합 탭
- 실시간 알림
- 모바일 최적화 (터치 UX)

#### 15.3 반응 기능 (선택)
- 실시간 이모지 반응
- 박수/좋아요 등

---

### Phase 16: 구독 플랜 시스템

#### 16.1 DB 스키마
```sql
-- subscription_plans 테이블
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER DEFAULT 0,
  price_yearly INTEGER DEFAULT 0,
  max_active_sessions INTEGER DEFAULT 1,
  max_archived_sessions INTEGER DEFAULT 5,
  max_participants_per_session INTEGER DEFAULT 50,
  max_team_members INTEGER DEFAULT 2,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- partner_subscriptions 테이블
CREATE TABLE partner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active', -- 'active', 'canceled', 'expired'
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 16.2 제한 체크 로직
- 세션 생성 시 활성 세션 수 체크
- 참여자 입장 시 최대 인원 체크
- 팀원 초대 시 최대 팀원 수 체크

#### 16.3 플랜 선택 UI
- 플랜 비교 페이지
- 플랜 변경/업그레이드

#### 16.4 관리자: 플랜 관리
- 플랜 목록/생성/수정
- 파트너별 구독 현황

---

### Phase 17: 분석 및 리포트

#### 17.1 세션 통계
- 총 참여자 수
- 질문 수 / 답변 수
- 설문 응답률
- 시간대별 참여 현황

#### 17.2 파트너 대시보드 개선
- 실제 데이터 기반 통계
- 기간별 필터
- 차트 시각화

#### 17.3 리포트 내보내기
- PDF 리포트
- CSV 데이터 다운로드

---

## 📁 주요 파일 구조

```
src/
├── components/
│   ├── session/
│   │   ├── AudienceQnA.jsx      # 청중 Q&A (완료)
│   │   ├── ManagerQnA.jsx       # 관리자 Q&A (완료)
│   │   ├── CollaborationPanel.jsx # 협업 패널 (완료)
│   │   ├── AudiencePoll.jsx     # 청중 설문 (Phase 14)
│   │   └── ManagerPoll.jsx      # 관리자 설문 (Phase 14)
│   └── ...
├── pages/
│   ├── partner/
│   │   ├── Sessions.jsx         # 세션 목록 (완료)
│   │   ├── SessionCreate.jsx    # 세션 생성 (완료)
│   │   ├── SessionDetail.jsx    # 세션 상세 (완료)
│   │   └── Invitations.jsx      # 초대 관리 (완료)
│   ├── LiveSession.jsx          # 실시간 참여 (완료, 개선 필요)
│   └── JoinSession.jsx          # 세션 참여 (완료, 개선 필요)
└── ...

supabase/
├── migrations/
│   ├── 20251130000000_session_collaboration.sql  # Phase 12
│   ├── 20251130100000_questions.sql              # Phase 13
│   ├── 20251130200000_polls.sql                  # Phase 14 (예정)
│   └── ...
└── seeds/
    ├── 14_trans_collaboration.sql  # 협업 언어팩
    ├── 15_trans_qna.sql            # Q&A 언어팩
    ├── 16_trans_polls.sql          # 설문 언어팩 (예정)
    └── ...
```

---

## 🔧 개발 환경 설정

### Supabase 로컬 실행
```bash
npx supabase start
```

### DB 리셋 (마이그레이션 + 시드)
```bash
npx supabase db reset
node scripts/seed-users.js  # 필수! 사용자 시드
```

### 개발 서버 실행
```bash
npm run dev
```

### 테스트 계정
| 이메일 | 역할 | 비밀번호 |
|--------|------|----------|
| lhscj2466@gmail.com | admin | l6882466! |
| user01@gmail.com | user (파트너 가능) | l6882466! |
| user02@gmail.com | user | l6882466! |
| user03@gmail.com | user | l6882466! |

---

## 📝 참고 문서

- `cursor-plan://...` - 전체 시스템 설계 문서
- `docs/DB_SCHEMA.md` - DB 스키마 상세
- `docs/RLS_POLICIES.md` - RLS 정책 상세

---

## 🚀 다음 작업 시작 방법

새 대화창에서 다음과 같이 시작하세요:

```
docs/REMAINING_TASKS.md 파일을 읽고 Phase 14(실시간 설문)를 진행해주세요.
```

또는 특정 Phase를 지정:

```
docs/REMAINING_TASKS.md 파일을 읽고 Phase 15(청중 참여 화면 개선)를 진행해주세요.
```

