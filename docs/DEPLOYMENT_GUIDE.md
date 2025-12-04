# LivePulse 배포 가이드

> Supabase (백엔드) + Vercel (프론트엔드) 배포 방법

---

## 📋 목차

1. [사전 준비](#사전-준비)
2. [Part A: Supabase 클라우드 설정](#part-a-supabase-클라우드-설정)
3. [Part B: Vercel 배포](#part-b-vercel-배포)
4. [Part C: 환경변수 설정](#part-c-환경변수-설정)
5. [Part D: 도메인 설정 (선택)](#part-d-도메인-설정-선택)
6. [문제 해결](#문제-해결)

---

## 사전 준비

### 필요한 계정
- [x] GitHub 계정
- [x] Supabase 계정 (https://supabase.com)
- [x] Vercel 계정 (https://vercel.com)

### 프로젝트 GitHub 업로드
```bash
# Git 초기화
git init

# 원격 저장소 연결
git remote add origin https://github.com/[USERNAME]/[REPO_NAME].git

# 파일 추가 및 커밋
git add .
git commit -m "초기 커밋"

# 푸시
git branch -M main
git push -u origin main
```

---

## Part A: Supabase 클라우드 설정

### A-1. 프로젝트 생성

1. **https://supabase.com/dashboard** 접속
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   - **Organization**: 본인 조직 선택
   - **Name**: `LivePulse` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 ⚠️ **반드시 메모!**
   - **Region**: `Northeast Asia (Seoul)` 권장
4. **Create new project** 클릭
5. 2-3분 대기 (프로젝트 생성 중)

### A-2. Project Reference ID 확인

프로젝트 생성 후 대시보드 URL에서 확인:
```
https://supabase.com/dashboard/project/[PROJECT_REF]
                                        ^^^^^^^^^^^^
                                        이 부분이 Project Reference ID
```

**예시**: `pfrdyviyzilhjarnmcec`

### A-3. API 키 확인

1. 프로젝트 대시보드 → **Settings** → **API**
2. 아래 정보 메모:

| 항목 | 위치 | 예시 |
|------|------|------|
| **Project URL** | Project URL | `https://pfrdyviyzilhjarnmcec.supabase.co` |
| **anon public** | Project API keys | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| **service_role** | Project API keys | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (⚠️ 비밀 유지!) |

### A-4. Supabase CLI 로그인

#### 방법 1: 브라우저 로그인 (권장)
```bash
npx supabase login
```
브라우저가 열리면 로그인 진행

#### 방법 2: Access Token 사용
1. https://supabase.com/dashboard/account/tokens 접속
2. **Generate new token** 클릭
3. 토큰 생성 후 복사
4. 환경변수 설정:
```bash
# Windows PowerShell
$env:SUPABASE_ACCESS_TOKEN="your-token-here"

# Windows CMD
set SUPABASE_ACCESS_TOKEN=your-token-here

# Mac/Linux
export SUPABASE_ACCESS_TOKEN="your-token-here"
```

### A-5. 프로젝트 연결

```bash
npx supabase link --project-ref [PROJECT_REF]
```

비밀번호 입력 요청 시 → A-1에서 설정한 **Database Password** 입력

**예시**:
```bash
npx supabase link --project-ref pfrdyviyzilhjarnmcec
# Enter your database password: [비밀번호 입력]
```

### A-6. 마이그레이션 푸시

로컬의 마이그레이션 파일들을 클라우드에 적용:
```bash
npx supabase db push
```

성공 시 출력:
```
Applying migration 001_init.sql...
Applying migration 002_language.sql...
...
Finished supabase db push.
```

### A-7. 시드 데이터 적용

#### 방법 1: Supabase Dashboard SQL Editor
1. 프로젝트 대시보드 → **SQL Editor**
2. `supabase/seeds/` 폴더의 파일들을 순서대로 실행:
   - `01_app_config.sql`
   - `02_languages.sql`
   - `03_categories.sql`
   - `04_helper_function.sql`
   - `05_trans_common.sql`
   - ... (나머지 파일들)

#### 방법 2: CLI 사용
```bash
# 시드 파일 직접 실행 (하나씩)
npx supabase db execute -f supabase/seeds/01_app_config.sql
npx supabase db execute -f supabase/seeds/02_languages.sql
# ... 반복
```

### A-8. 테스트 사용자 생성

```bash
node scripts/seed-users.js
```

⚠️ **주의**: `scripts/seed-users.js` 파일의 Supabase URL과 Service Role Key를 클라우드 값으로 변경해야 합니다.

```javascript
// scripts/seed-users.js 수정
const supabaseUrl = 'https://[PROJECT_REF].supabase.co'
const supabaseServiceKey = '[SERVICE_ROLE_KEY]'
```

---

## Part B: Vercel 배포

### B-1. Vercel 가입 및 GitHub 연결

1. **https://vercel.com** 접속
2. **Sign Up** → **Continue with GitHub** 선택
3. GitHub 계정 연동 승인

### B-2. 프로젝트 Import

1. Vercel 대시보드 → **Add New** → **Project**
2. **Import Git Repository**에서 `LivePulse` 리포지토리 선택
3. **Import** 클릭

### B-3. 빌드 설정

| 설정 | 값 |
|------|-----|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (기본값) |
| **Build Command** | `npm run build` (기본값) |
| **Output Directory** | `dist` (기본값) |
| **Install Command** | `npm install` (기본값) |

### B-4. 환경변수 설정

**Environment Variables** 섹션에서 추가:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase API 페이지의 `anon public` 키 |

### B-5. 배포

**Deploy** 클릭 → 빌드 완료까지 1-2분 대기

### B-6. 배포 URL 확인

배포 완료 후 URL 형식:
```
https://[PROJECT_NAME].vercel.app
```

---

## Part C: 환경변수 설정

### 로컬 개발용 (.env.local)

프로젝트 루트에 `.env.local` 파일 생성:
```env
# Supabase 로컬 개발 환경
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 프로덕션용 (.env.production)

```env
# Supabase 클라우드 환경
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel 환경변수

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**

| Key | Production | Preview | Development |
|-----|------------|---------|-------------|
| `VITE_SUPABASE_URL` | ✅ | ✅ | ✅ |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ |

---

## Part D: 도메인 설정 (선택)

### D-1. 커스텀 도메인 추가

1. Vercel 대시보드 → 프로젝트 → **Settings** → **Domains**
2. 도메인 입력 (예: `livepulse.example.com`)
3. **Add** 클릭

### D-2. DNS 설정

도메인 등록 업체에서 DNS 레코드 추가:

| 타입 | 이름 | 값 |
|------|------|-----|
| CNAME | `@` 또는 서브도메인 | `cname.vercel-dns.com` |

### D-3. Supabase Redirect URL 업데이트

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-domain.com`
3. **Redirect URLs**에 추가:
   - `https://your-domain.com/**`
   - `https://your-project.vercel.app/**`

---

## 문제 해결

### 마이그레이션 실패

```bash
# 마이그레이션 상태 확인
npx supabase migration list

# 특정 마이그레이션 다시 실행
npx supabase db reset --linked
```

### 환경변수 인식 안 됨

1. Vercel에서 환경변수 이름이 `VITE_`로 시작하는지 확인
2. 배포 후 **Redeploy** 필요할 수 있음

### CORS 에러

Supabase 대시보드 → **Settings** → **API** → **CORS**에 도메인 추가

### Auth Redirect 문제

Supabase 대시보드 → **Authentication** → **URL Configuration**에서:
- Site URL 확인
- Redirect URLs에 모든 도메인 추가

---

## 📝 배포 체크리스트

| 단계 | 항목 | 완료 |
|------|------|------|
| **준비** | GitHub에 코드 푸시 | ⬜ |
| **Supabase** | 클라우드 프로젝트 생성 | ⬜ |
| | CLI 로그인 | ⬜ |
| | 프로젝트 연결 (`supabase link`) | ⬜ |
| | 마이그레이션 푸시 (`db push`) | ⬜ |
| | 시드 데이터 적용 | ⬜ |
| | 테스트 사용자 생성 | ⬜ |
| **Vercel** | 프로젝트 Import | ⬜ |
| | 환경변수 설정 | ⬜ |
| | 배포 완료 | ⬜ |
| **확인** | 사이트 접속 테스트 | ⬜ |
| | 로그인 테스트 | ⬜ |
| | 기능 테스트 | ⬜ |

---

## 🔗 참고 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Vercel 공식 문서](https://vercel.com/docs)
- [Vite 환경변수 가이드](https://vitejs.dev/guide/env-and-mode.html)

---

**마지막 업데이트**: 2025-12-01
