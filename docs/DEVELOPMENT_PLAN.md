# LivePulse 개발 기획서

## 📋 서비스 개요

오프라인 강좌 환경에서 강사와 청중 간의 실시간 상호작용을 극대화하는 플랫폼.
설문, Q&A, 피드백 등을 실시간으로 주고받으며 강좌의 몰입도와 효과를 높이는 것을 목표로 합니다.

---

## 🏗️ 시스템 구조

### URL 구조
```
📱 청중용 (모바일 최적화, 로그인 불필요)
─────────────────────────
/join/:code    → 세션 참여 (QR/코드 입력)
/live/:code    → 실시간 참여 화면 (설문, Q&A, 피드백)

🌐 일반 사용자 (로그인 후)
─────────────────────────
/              → 랜딩 페이지
/login         → 로그인
/signup        → 회원가입 (이메일/비밀번호만)
/mypage        → 내 정보 (파트너 신청 가능)

💼 파트너용 (승인된 파트너만, 데스크톱 최적화)
─────────────────────────
/partner                → 대시보드
/partner/sessions       → 세션 관리
/partner/sessions/:id   → 세션 진행 화면 (프레젠터 뷰)
/partner/polls          → 설문 템플릿 관리
/partner/reports        → 분석 리포트
/partner/profile        → 내 정보
/partner/settings       → 설정

🔧 관리자용
─────────────────────────
/adm                    → 관리자 대시보드
/adm/users              → 회원 관리
/adm/partner-requests   → 파트너 신청 관리 (승인/거부)
/adm/languages          → 언어팩 관리
/adm/system/*           → 시스템 관리
```

### 사용자 유형 및 권한
| 유형 | user_type | status | 접근 가능 영역 |
|------|-----------|--------|---------------|
| 일반 회원 | `user` | `active` | 일반 페이지, 청중 참여 |
| 파트너 신청자 | `user` | `active` + 파트너 신청 중 | 일반 페이지, 청중 참여 |
| 파트너 | `partner` | `active` | 일반 페이지, 파트너 페이지, 청중 참여 |
| 관리자 | `admin` | `active` | 모든 페이지 |

---

## 📊 데이터베이스 구조

### 1. 사용자 관련 테이블

#### `profiles` (기존 - 수정 필요)
```sql
-- 기존 컬럼 유지, 일부 수정
id              UUID PRIMARY KEY (auth.users 참조)
email           TEXT
user_role       TEXT ('user' | 'admin')  -- 기존 role에서 변경됨
user_type       TEXT ('user' | 'partner' | 'admin')
status          TEXT ('active' | 'suspended')
description     TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `partner_requests` (신규) - 파트너 신청
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES auth.users(id)
representative_name TEXT NOT NULL -- 신청자 이름 (필수)
phone               TEXT NOT NULL -- 연락처 (필수)
purpose             TEXT NOT NULL -- 사용 목적 (필수)
company_name        TEXT          -- 회사/소속명 (선택)
business_number     TEXT          -- 사업자번호 (선택)
status              TEXT ('pending' | 'approved' | 'rejected') DEFAULT 'pending'
reviewed_by         UUID          -- 처리한 관리자
reviewed_at         TIMESTAMPTZ   -- 처리 일시
reject_reason       TEXT          -- 거부 사유
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()
```

#### `partners` (기존 - 역할 변경)
```sql
-- 파트너 승인 후 정보 저장 (해제되어도 데이터 유지)
id                  UUID PRIMARY KEY
profile_id          UUID REFERENCES profiles(id) UNIQUE
representative_name TEXT NOT NULL
phone               TEXT NOT NULL
purpose             TEXT
company_name        TEXT
business_number     TEXT
is_active           BOOLEAN DEFAULT true  -- 파트너 활성화 상태 (해제 시 false)
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()
```

### 2. 언어팩 테이블

#### `languages` (신규) - 지원 언어 목록
```sql
id          UUID PRIMARY KEY
code        TEXT UNIQUE NOT NULL  -- 'ko', 'en', 'ja' 등
name        TEXT NOT NULL         -- '한국어', 'English', '日本語'
is_default  BOOLEAN DEFAULT false -- 기본 언어 여부
is_active   BOOLEAN DEFAULT true  -- 활성화 여부
sort_order  INTEGER DEFAULT 0     -- 정렬 순서
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

#### `language_keys` (신규) - 번역 키 목록
```sql
id          UUID PRIMARY KEY
key         TEXT UNIQUE NOT NULL  -- 'common.save', 'auth.login' 등
description TEXT                  -- 키 설명 (관리용)
category    TEXT                  -- 'common', 'auth', 'admin', 'partner' 등
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

#### `translations` (신규) - 실제 번역 데이터
```sql
id              UUID PRIMARY KEY
language_code   TEXT REFERENCES languages(code)
key             TEXT REFERENCES language_keys(key)
value           TEXT NOT NULL     -- 번역된 텍스트
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE(language_code, key)  -- 언어+키 조합 유니크
```

### 3. 세션 관련 테이블 (Phase 7+)

#### `sessions` - 강좌 세션
```sql
id              UUID PRIMARY KEY
partner_id      UUID REFERENCES partners(id)
title           TEXT NOT NULL
description     TEXT
code            TEXT UNIQUE NOT NULL  -- 6자리 참여 코드
status          TEXT ('draft' | 'active' | 'ended')
started_at      TIMESTAMPTZ
ended_at        TIMESTAMPTZ
settings        JSONB         -- 세션 설정
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `session_participants` - 세션 참여자
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
nickname        TEXT
device_info     JSONB
joined_at       TIMESTAMPTZ
left_at         TIMESTAMPTZ
```

#### `polls` - 설문/투표
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
type            TEXT ('multiple_choice' | 'open_ended' | 'word_cloud' | 'rating')
question        TEXT NOT NULL
options         JSONB         -- 선택지 (객관식)
settings        JSONB         -- 설정 (복수선택 등)
status          TEXT ('draft' | 'active' | 'closed')
created_at      TIMESTAMPTZ
```

#### `poll_responses` - 설문 응답
```sql
id              UUID PRIMARY KEY
poll_id         UUID REFERENCES polls(id)
participant_id  UUID REFERENCES session_participants(id)
response        JSONB         -- 응답 데이터
created_at      TIMESTAMPTZ
```

#### `questions` - Q&A 질문
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
participant_id  UUID REFERENCES session_participants(id)
content         TEXT NOT NULL
likes           INTEGER DEFAULT 0
is_answered     BOOLEAN DEFAULT false
is_pinned       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
```

---

## 🔄 Phase 계획

### ✅ 완료된 Phase
- [x] Phase 1: 반응형 디자인
- [x] Phase 2: 테마 시스템 (관리자 DB 저장, 일반 localStorage)
- [x] Phase 3: 역할 분리 (관리자/파트너 레이아웃)
- [x] Phase 4: 모던 디자인 적용
- [x] Phase 5: 최적화 (코드 스플리팅, Toast, 에러 처리)
- [x] Phase 6: 회원 시스템 개편
- [x] Phase 7: 언어팩 시스템
- [x] Phase 7.5: 기존 하드코딩 텍스트 언어팩 교체

### 📋 예정된 Phase

#### Phase 8: 청중 참여 시스템
- [ ] 8.1 세션 참여 페이지 (`/join/:code`)
- [ ] 8.2 실시간 참여 화면 (`/live/:code`)
- [ ] 8.3 청중용 모바일 최적화 UI
- [ ] 8.4 Supabase Realtime 연동

#### Phase 9: 파트너 - 세션 관리
- [ ] 9.1 sessions 테이블 생성
- [ ] 9.2 세션 목록/생성/수정/삭제
- [ ] 9.3 세션 코드 생성 및 QR 코드
- [ ] 9.4 세션 진행 화면 (프레젠터 뷰)

#### Phase 10: 파트너 - 설문/투표
- [ ] 10.1 polls 테이블 생성
- [ ] 10.2 설문 템플릿 관리
- [ ] 10.3 실시간 설문 진행
- [ ] 10.4 결과 시각화 (차트)

#### Phase 11: 파트너 - Q&A
- [ ] 11.1 questions 테이블 생성
- [ ] 11.2 실시간 질문 수신
- [ ] 11.3 질문 좋아요/핀 기능
- [ ] 11.4 질문 답변 처리

#### Phase 12: 분석 및 리포트
- [ ] 12.1 세션 통계 대시보드
- [ ] 12.2 참여율/응답률 분석
- [ ] 12.3 리포트 내보내기 (PDF/Excel)

---

## 🔧 기술 스택

- **프론트엔드**: React.js (Vite), Tailwind CSS, shadcn/ui
- **백엔드**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **실시간**: Supabase Realtime
- **차트**: Recharts 또는 Chart.js
- **QR 코드**: qrcode.react
- **PDF 생성**: @react-pdf/renderer

---

## ✅ 확정된 사항

### 1. 언어팩 DB 구조
- **3개 테이블 구조** 채택 (languages, language_keys, translations)
- **카테고리 포함** (관리 편의성을 위해)
- **관리자가 키/번역 직접 추가/수정/삭제 가능**

### 2. 파트너 신청 프로세스
**필수 정보:**
- 이름
- 연락처
- 사용 목적

**선택 정보:**
- 회사명
- 사업자번호

**프로세스:**
1. 일반 회원가입 (이메일/비밀번호만)
2. 마이페이지에서 파트너 신청 (필수 정보 입력)
3. 관리자 승인/거부
4. 승인 시 파트너 기능 활성화

### 3. 파트너 해제 정책
- **파트너 해제 시**: 파트너 기능만 일시 중단
- **데이터 유지**: 세션, 설문 등 기존 데이터는 그대로 보존
- **권한 제한**: 파트너 페이지 접근 불가 (데이터는 DB에 존재)
- **재승인 가능**: 관리자가 다시 승인하면 기존 데이터로 복귀

### 4. 기존 데이터 처리
- **DB 초기화** 진행 (테스트 데이터 삭제)
- 새로운 테이블 구조로 시작

---

## 📅 작업 순서

각 Phase 시작 전 상세 내용 확인 후 진행합니다.

### Phase 6: 회원 시스템 개편
```
6.1 DB 스키마 변경
    - profiles 테이블 수정 (user_type 기본값 'user')
    - partner_requests 테이블 생성
    - partners 테이블 수정 (신청 정보 → 승인된 파트너 정보)
    
6.2 회원가입 단순화
    - 이메일/비밀번호만 입력
    - 바로 active 상태의 일반 회원으로 등록
    
6.3 일반 회원 마이페이지 (/mypage)
    - 내 정보 확인
    - 파트너 신청 버튼/폼
    - 신청 상태 확인
    
6.4 파트너 신청 기능
    - 신청 폼 (이름*, 연락처*, 사용목적*, 회사명, 사업자번호)
    - partner_requests 테이블에 저장
    
6.5 관리자: 파트너 신청 관리
    - 신청 목록 조회
    - 승인/거부 처리
    - 거부 시 사유 입력
    
6.6 파트너 승인 로직
    - user_type을 'partner'로 변경
    - partners 테이블에 정보 복사
    
6.7 파트너 해제 기능
    - user_type을 'user'로 변경
    - partners 데이터는 유지 (is_active 플래그 또는 별도 관리)
    
6.8 UI 조건부 표시
    - 일반 페이지: 파트너인 경우 "파트너 관리" 버튼 표시
    - 로그인 후 역할에 따른 네비게이션
```

### Phase 7: 언어팩 시스템
```
7.1 DB 테이블 생성
    - languages (지원 언어 목록)
    - language_keys (번역 키 + 카테고리)
    - translations (번역 값)
    
7.2 기본 언어팩 초기 데이터
    - 한국어 기본 설정
    - 공통 키 등록 (common.save, common.cancel 등)
    - 인증 키 등록 (auth.login, auth.signup 등)
    - 관리자 키 등록
    - 파트너 키 등록
    
7.3 언어팩 Context
    - 앱 로딩 시 translations fetch
    - t('key') 함수로 번역 텍스트 반환
    - 언어 변경 기능
    
7.4 관리자: 언어팩 관리 페이지
    - 언어 추가/수정/삭제
    - 키 추가/수정/삭제
    - 번역 추가/수정/삭제
    - 카테고리별 필터링
    - 검색 기능
    
7.5 기존 텍스트 교체
    - 하드코딩된 텍스트를 t('key')로 교체
    - 단계적으로 진행
    
7.6 언어 선택 UI
    - 헤더 또는 푸터에 언어 선택 드롭다운
    - 선택한 언어 localStorage 저장
```

### Phase 8: 파트너 타입 확장 ✅
```
8.1 DB 스키마 변경
    - partners 테이블 수정 (공통 컬럼만 유지, partner_type 추가)
    - partner_organizers 테이블 생성 (행사자 전용)
    - partner_agencies 테이블 생성 (대행업체 전용)
    - partner_instructors 테이블 생성 (강사 전용)
    - partner_requests 테이블 수정 (타입별 컬럼 추가)
    - RLS 정책 설정

8.2 파트너 신청 화면 수정
    - 파트너 타입 선택 UI 추가
    - 타입별 입력 폼 분기 (행사자/대행업체/강사)
    - 유효성 검증 (타입별 필수값)

8.3 관리자: 파트너 신청 관리 수정
    - 신청 목록에 파트너 타입 표시
    - 상세 보기에서 타입별 정보 표시
    - 승인 시 타입별 테이블에 데이터 저장

8.4 관리자: 파트너 목록 화면 (신규)
    - 승인된 파트너 목록
    - 타입별 필터링
    - 파트너 상세 보기
    - 파트너 비활성화/활성화

8.5 언어팩 추가
    - 파트너 타입 관련 키 추가
```

### Phase 9: 팀원 관리 시스템 ✅
```
9.1 DB 스키마
    - partner_members 테이블 생성
    - RLS 정책 설정
    - 초대 토큰 생성 함수
    - 초대 수락 함수

9.2 파트너: 팀원 관리 화면 (신규)
    - 팀원 목록 조회
    - 팀원 초대 (이메일 입력)
    - 초대 상태 표시 (대기/수락/거부)
    - 팀원 역할 변경 (admin/member)
    - 팀원 삭제
    - 초대 링크 복사

9.3 초대 처리
    - 초대 토큰 생성
    - 초대 수락 페이지 (/invite/:token)
    - 로그인/회원가입 후 수락 처리
    - 이메일 일치 검증

9.4 강사 타입 제한
    - 강사 파트너는 팀원 관리 메뉴 숨김
    - 팀원 초대 불가 메시지 표시

9.5 자동 owner 추가
    - 파트너 승인 시 신청자가 자동으로 owner로 등록

9.6 언어팩 추가
    - 팀원 관리 관련 키 추가
    - 초대 수락 페이지 키 추가
```

### Phase 10: 세션 기본 구조 ✅
```
10.1 DB 스키마
    - sessions 테이블 생성
    - session_templates 테이블 생성
    - session_template_fields 테이블 생성
    - session_assets 테이블 생성
    - session_members 테이블 생성
    - RLS 정책 설정
    - 참여 코드 자동 생성 트리거

10.2 파트너: 세션 목록 화면
    - 내 세션 목록
    - 상태별 필터 (draft/published/active/ended)
    - 세션 생성 버튼

10.3 파트너: 세션 생성 화면
    - 필수 입력: 세션명, 장소, 일시, 연락처, 예상 참여자 수
    - 템플릿 선택
    - 참여 코드 자동 생성

10.4 파트너: 세션 상세 화면
    - 기본 정보 수정
    - 템플릿 에셋 업로드 (이미지 등)
    - 세션 상태 변경 (공개/시작/종료)
    - 참여 코드/QR 코드 표시

10.5 청중 참여 페이지 (/join/:code)
    - 템플릿 기반 렌더링
    - 세션 정보 표시
    - 참여 버튼

10.6 미리보기 기능
    - 비공개(draft) 세션도 파트너/관리자가 미리보기 가능
    - ?preview=true 파라미터로 접근
    - 미리보기 모드 배너 표시

10.7 언어팩 추가
    - 세션 관련 키 추가
```

### Phase 11: 템플릿 관리 시스템 ✅
```
11.1 관리자: 템플릿 목록 화면
    - 템플릿 목록 조회
    - 템플릿 추가/수정/삭제
    - 활성화/비활성화

11.2 관리자: 템플릿 미리보기/편집 화면
    - 좌측: 필드 설정 패널
    - 우측: 실시간 미리보기 패널
    - 리사이즈 가능한 패널 (드래그로 좌우 크기 조절)
    - 반응형 미리보기 (모바일/태블릿/데스크톱)

11.3 필드 관리
    - 필드 추가/수정/삭제
    - 필드 순서 변경 (▲/▼ 버튼)
    - 필드 타입: 이미지, 텍스트, URL, 토글
    - 샘플 데이터 입력 및 실시간 반영

11.4 동적 템플릿 렌더링
    - 필드 키워드 기반 자동 스타일 적용
    - 배경, 로고, 배너, 텍스트 자동 배치

11.5 언어팩 추가
    - 템플릿 관리 관련 키 추가
```

---

## 🚧 남은 Phase

### Phase 12: 세션 강사/파트너 연결 ✅
```
12.1 DB 스키마
    - session_partners 테이블 생성 (초대된 파트너)
    - session_presenters 테이블 생성 (강사)
    - RLS 정책 설정
    - 파트너 호환성 체크 함수 (organizer ↔ agency)
    - 초대/응답 RPC 함수

12.2 세션에 파트너 초대
    - 세션 상세 > 협업 탭에서 파트너 초대 기능
    - 행사자 → 대행업체만 / 대행업체 → 행사자만
    - 1개만 초대 가능 제한
    - 초대 상태 표시 (대기/수락/거절)
    - 초대 취소 기능

12.3 세션에 강사 등록
    - 방식 1: 팀원 중 선택 (승인 불필요)
    - 방식 2: 강사 파트너 검색 → 초대 (승인 필요)
    - 방식 3: 이름 직접 입력 (승인 불필요)
    - 강사 목록 관리 (순서 변경, 수정, 삭제)

12.4 파트너: 초대 관리 화면
    - 받은 세션 초대 목록 (파트너 협업)
    - 받은 강사 초대 목록 (강사 파트너용)
    - 수락/거부 처리 (거부 시 사유 입력)

12.5 언어팩 추가
    - 초대/강사 관련 키 추가
```

### Phase 13: 실시간 Q&A ✅
```
13.1 DB 스키마
    - questions 테이블 생성
    - question_likes 테이블 생성 (중복 좋아요 방지)
    - RLS 정책 설정
    - 좋아요 수 동기화 트리거
    - toggle_question_like, check_question_liked RPC 함수
    - Supabase Realtime 활성화

13.2 청중: 질문 등록 (/live/:code)
    - 질문 입력 폼 (최대 500자)
    - 익명/실명 선택
    - 질문 제출 (pending 상태로 저장)
    - 실시간 질문 목록 업데이트

13.3 청중: 질문 좋아요
    - 다른 청중의 질문에 좋아요/취소
    - 비로그인 사용자는 device_id로 식별
    - 인기순/최신순 정렬

13.4 파트너: 질문 관리 (세션 상세 > Q&A 탭)
    - 질문 목록 실시간 표시
    - 상태별 필터 (전체/대기/미답변/답변됨)
    - 질문 승인/거부
    - 답변 작성/수정
    - 질문 고정/하이라이트/숨기기/삭제
    - 통계 표시 (전체/대기/답변완료)

13.5 실시간 업데이트
    - Supabase Realtime 구독
    - 새 질문 알림
    - 상태 변경 실시간 반영

13.6 언어팩 추가
    - Q&A 관련 키 추가 (40+ 키)
```

### Phase 14: 실시간 설문 (예정)
```
14.1 DB 스키마
    - polls 테이블 생성
    - poll_options 테이블 생성
    - poll_responses 테이블 생성
    - RLS 정책 설정

14.2 파트너: 설문 생성
    - 설문 제목/질문 입력
    - 선택지 추가 (2~10개)
    - 단일/복수 선택 설정
    - 결과 공개 여부 설정

14.3 파트너: 설문 활성화/종료
    - 설문 활성화 (청중에게 표시)
    - 설문 종료 (응답 마감)
    - 결과 공개

14.4 청중: 설문 응답
    - 활성화된 설문 표시
    - 선택지 선택
    - 응답 제출

14.5 결과 실시간 표시
    - 응답률 표시
    - 선택지별 비율 차트
    - 실시간 업데이트

14.6 언어팩 추가
    - 설문 관련 키 추가
```

### Phase 15: 청중 참여 화면 개선 (예정)
```
15.1 실시간 참여 화면 (/live/:code)
    - Q&A, 설문 통합 화면
    - 탭 또는 섹션 구분
    - 실시간 알림

15.2 모바일 최적화
    - 터치 친화적 UI
    - 스와이프 제스처
    - 푸시 알림 (PWA)

15.3 참여자 카운트
    - 실시간 참여자 수 표시
    - 참여자 목록 (선택적)

15.4 언어팩 추가
    - 실시간 참여 관련 키 추가
```

### Phase 16: 구독 플랜 시스템 (예정)
```
16.1 DB 스키마
    - subscription_plans 테이블 생성
    - partner_subscriptions 테이블 생성

16.2 플랜 정의
    - Free: 활성 세션 1개, 참여자 50명
    - Starter: 활성 세션 5개, 참여자 200명
    - Pro: 무제한

16.3 제한 체크 로직
    - 세션 생성 시 플랜 체크
    - 참여자 수 제한 체크

16.4 플랜 선택/변경 UI
    - 플랜 비교 화면
    - 결제 연동 (추후)

16.5 언어팩 추가
    - 구독 관련 키 추가
```

### Phase 17: 분석 및 리포트 (예정)
```
17.1 세션 통계
    - 참여자 수 추이
    - 질문 수/응답률
    - 설문 결과 요약

17.2 리포트 내보내기
    - PDF 리포트 생성
    - Excel 데이터 내보내기

17.3 대시보드 개선
    - 통계 위젯
    - 차트 시각화

17.4 언어팩 추가
    - 분석/리포트 관련 키 추가
```

---

## ✅ 완료된 Phase 요약

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 반응형 디자인 | ✅ 완료 |
| 2 | 테마 시스템 | ✅ 완료 |
| 3 | 역할 분리 (관리자/파트너 레이아웃) | ✅ 완료 |
| 4 | 모던 디자인 적용 | ✅ 완료 |
| 5 | 최적화 | ✅ 완료 |
| 6 | 회원 시스템 개편 | ✅ 완료 |
| 7 | 언어팩 시스템 | ✅ 완료 |
| 7.5 | 기존 텍스트 언어팩 교체 | ✅ 완료 |
| 8 | 파트너 타입 확장 | ✅ 완료 |
| 9 | 팀원 관리 시스템 | ✅ 완료 |
| 10 | 세션 기본 구조 | ✅ 완료 |
| 11 | 템플릿 관리 시스템 | ✅ 완료 |
| 12 | 세션 강사/파트너 연결 | ✅ 완료 |
| 13 | 실시간 Q&A | ✅ 완료 |

---

## 🔜 다음 우선순위

1. **Phase 14**: 실시간 설문 - 핵심 기능
2. **Phase 15**: 청중 참여 화면 개선 - UX 개선
3. **Phase 16**: 구독 플랜 시스템
4. **Phase 17**: 분석 및 리포트

