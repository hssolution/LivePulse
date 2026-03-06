# 폴더 구조 리팩토링 완료

## 📋 작업 개요

페이지 파일들을 역할별로 명확하게 분리하여 프로젝트 구조를 개선했습니다.

## ✅ 이동된 파일

### 관리자 페이지 → `src/pages/admin/`

| 파일 | 이전 위치 | 새 위치 | 설명 |
|------|---------|--------|-----|
| `Dashboard.jsx` | `src/pages/` | `src/pages/admin/` | 관리자 대시보드 |
| `Users.jsx` | `src/pages/` | `src/pages/admin/` | 사용자 관리 |
| `ProfileTest.jsx` | `src/pages/` | `src/pages/admin/` | 프로필 테스트 페이지 |

### 기존 admin 폴더 파일들 (이동 없음)
- `FaqManagement.jsx` - FAQ 관리
- `InquiryManagement.jsx` - 문의 관리
- `LanguagePack.jsx` - 언어팩 관리
- `LoginLogs.jsx` - 로그인 로그
- `PartnerRequests.jsx` - 파트너 승인 요청
- `Partners.jsx` - 파트너 목록
- `Sessions.jsx` - 세션 관리
- `SessionTemplates.jsx` - 템플릿 관리
- `TemplatePreview.jsx` - 템플릿 미리보기

## 📂 최종 폴더 구조

```
src/pages/
├── admin/                    # 관리자 전용 페이지 (/adm)
│   ├── Dashboard.jsx         ✅ 이동됨 - 관리자 대시보드
│   ├── Users.jsx             ✅ 이동됨 - 사용자 관리
│   ├── ProfileTest.jsx       ✅ 이동됨 - 프로필 테스트
│   ├── PartnerRequests.jsx   - 파트너 승인 요청
│   ├── Partners.jsx          - 파트너 목록
│   ├── Sessions.jsx          - 세션 관리
│   ├── LoginLogs.jsx         - 로그인 로그
│   ├── FaqManagement.jsx     - FAQ 관리
│   ├── InquiryManagement.jsx - 문의 관리
│   ├── LanguagePack.jsx      - 언어팩 관리
│   ├── SessionTemplates.jsx  - 템플릿 관리
│   └── TemplatePreview.jsx   - 템플릿 미리보기
│
├── partner/                  # 파트너 전용 페이지 (/partner)
│   ├── PartnerDashboard.jsx  - 파트너 대시보드
│   ├── PartnerProfile.jsx    - 파트너 프로필
│   ├── Sessions.jsx          - 세션 목록
│   ├── SessionCreate.jsx     - 세션 생성
│   ├── SessionDetail.jsx     - 세션 상세
│   ├── TeamMembers.jsx       - 팀 멤버 관리
│   ├── Invitations.jsx       - 초대 관리
│   ├── Faq.jsx               - FAQ
│   └── Inquiry.jsx           - 문의
│
├── common/                   # 공통 페이지 (관리자 & 파트너)
│   ├── Profile.jsx           - 프로필
│   ├── Settings.jsx          - 설정
│   └── Support.jsx           - 지원
│
├── system/                   # 시스템 관리 페이지
│   ├── Database.jsx          - 데이터베이스
│   ├── Logs.jsx              - 로그
│   └── Backup.jsx            - 백업
│
├── content/                  # 콘텐츠 관리
│   └── Posts.jsx             - 게시물 관리
│
└── (공개 페이지 - 루트)       # 일반 사용자용 공개 페이지
    ├── Home.jsx              - 홈
    ├── Lectures.jsx          - 강의 목록
    ├── Instructors.jsx       - 강사 목록
    ├── Agencies.jsx          - 기관 목록
    ├── Login.jsx             - 로그인
    ├── Signup.jsx            - 회원가입
    ├── ServicePage.jsx       - 서비스 소개
    ├── MyPage.jsx            - 마이페이지
    ├── JoinSession.jsx       - 세션 참여
    ├── LiveSession.jsx       - 라이브 세션
    ├── PresenterQnA.jsx      - 발표자 Q&A
    ├── BroadcastQnA.jsx      - 방송 Q&A
    ├── InviteAccept.jsx      - 초대 수락
    ├── TemplatePreviewPublic.jsx - 템플릿 미리보기 (공개)
    └── NotFound.jsx          - 404 페이지
```

## 🔄 수정된 파일

### `src/App.jsx`

```javascript
// Before
const Dashboard = lazy(() => import('./pages/Dashboard'))
const UsersPage = lazy(() => import('./pages/Users'))
const ProfileTest = lazy(() => import('./pages/ProfileTest'))

// After
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const UsersPage = lazy(() => import('./pages/admin/Users'))
const ProfileTest = lazy(() => import('./pages/admin/ProfileTest'))
```

## 📍 라우팅 구조

### 관리자 영역 (`/adm`)
```
/adm                          → Dashboard.jsx
/adm/users                    → Users.jsx
/adm/profile-test             → ProfileTest.jsx
/adm/partner-requests         → PartnerRequests.jsx
/adm/partners                 → Partners.jsx
/adm/sessions                 → Sessions.jsx
/adm/system/login-logs        → LoginLogs.jsx
/adm/support/faq              → FaqManagement.jsx
/adm/support/inquiries        → InquiryManagement.jsx
/adm/system/language-pack     → LanguagePack.jsx
/adm/templates/:screenType    → SessionTemplates.jsx
```

### 파트너 영역 (`/partner`)
```
/partner                      → PartnerDashboard.jsx
/partner/partner-profile      → PartnerProfile.jsx
/partner/sessions             → Sessions.jsx
/partner/sessions/new         → SessionCreate.jsx
/partner/sessions/:id         → SessionDetail.jsx
/partner/team                 → TeamMembers.jsx
/partner/invitations          → Invitations.jsx
/partner/support/faq          → Faq.jsx
/partner/support/inquiry      → Inquiry.jsx
```

### 공개 영역 (루트)
```
/                             → Home.jsx
/lectures                     → Lectures.jsx
/instructors                  → Instructors.jsx
/agencies                     → Agencies.jsx
/login                        → Login.jsx
/signup                       → Signup.jsx
/service                      → ServicePage.jsx
/mypage                       → MyPage.jsx
/join/:code                   → JoinSession.jsx
/live/:sessionId              → LiveSession.jsx
```

## 🎯 개선 효과

### 1. 명확한 역할 분리
- ✅ 관리자 페이지: `admin/` 폴더
- ✅ 파트너 페이지: `partner/` 폴더
- ✅ 공개 페이지: 루트 폴더
- ✅ 공통 페이지: `common/` 폴더

### 2. 유지보수성 향상
- 파일 위치만으로 페이지 역할 파악 가능
- 관련 파일들이 같은 폴더에 모여있어 관리 용이

### 3. 확장성 개선
- 새로운 관리자 페이지 추가 시 `admin/` 폴더에 추가
- 새로운 파트너 페이지 추가 시 `partner/` 폴더에 추가
- 명확한 규칙으로 일관성 유지

### 4. 코드 가독성
- Import 경로에서 페이지 역할 명확히 표시
- `./pages/admin/Dashboard` → 관리자 대시보드임을 즉시 인지

## ✨ 네이밍 규칙

### 파일명
- 관리자 페이지: 일반적인 이름 (예: `Dashboard.jsx`, `Users.jsx`)
- 파트너 페이지: `Partner` 접두사 사용 (예: `PartnerDashboard.jsx`)
- 공통 페이지: 역할 명시 (예: `Profile.jsx`, `Settings.jsx`)

### 폴더 구조
```
pages/
  admin/        - 관리자 전용
  partner/      - 파트너 전용
  common/       - 공통 (관리자 & 파트너)
  system/       - 시스템 관리
  content/      - 콘텐츠 관리
  (루트)        - 공개 페이지
```

## 🎉 완료!

모든 관리자 페이지가 `admin/` 폴더로 정리되었습니다.
이제 프로젝트 구조가 더욱 명확하고 관리하기 쉬워졌습니다!

