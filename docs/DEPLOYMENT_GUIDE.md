# LivePulse 배포 가이드

> Supabase (백엔드) + Tongbig nginx 정적 (프론트엔드) 배포 방법

---

## 📋 목차

1. [사전 준비](#사전-준비)
2. [Part A: Supabase 클라우드 설정](#part-a-supabase-클라우드-설정)
3. [Part B: 운영 배포](#part-b-운영-배포-tongbig-nginx-정적)
4. [Part C: 환경변수 설정](#part-c-환경변수-설정)
5. [Part D: Supabase 인증 URL](#part-d-supabase-인증-url)
6. [문제 해결](#문제-해결)

---

## 사전 준비

### 필요한 계정
- [x] GitHub 계정
- [x] Supabase 계정 (https://supabase.com)
- [x] Tongbig 서버 접근 권한

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

## Part B: 운영 배포 (Tongbig nginx 정적)

운영 주소 `https://livepulse.noligo.co.kr` 는 Tongbig 서버(125.141.139.219)의 nginx 가 정적 파일로 서비스한다.
서버 경로는 `/home/livepulse/www` (출처: 노리고 ERP `docs/참고/추가 참고/DOMAINS.md` 의 도메인 표).
Node 프로세스(pm2)는 없다 — 빌드 산출물 `dist/` 를 그 폴더에 올리는 것이 배포다.

### B-1. 빌드

```bash
npm install
npm run build        # vite build → dist/
```

빌드는 루트의 `.env.production` 을 읽는다(아래 Part C). 이 파일이 없으면 Supabase 연결 값이 비어 화면이 동작하지 않는다.

### B-2. 업로드

`dist/` 의 내용을 서버 `/home/livepulse/www/` 로 올린다.
- 이 저장소에는 배포 스크립트(`deploy*.sh`)나 `package.json` 의 deploy 스크립트가 **없다.** 업로드 방법(rsync/scp 등)과 계정은 이 저장소에서 확인되지 않는다.
- 접속 방법은 노리고 ERP `docs/archive/09_server_access_and_local_sync.md` 에 있다(키 파일은 저장소 밖).

### B-3. 배포 후 확인

- `https://livepulse.noligo.co.kr` 접속·로그인
- 브라우저에서 옛 번들이 남으면 강력 새로고침

---

## Part C: 환경변수 설정

### 로컬 개발 환경 (.env.local)

로컬 개발 시에도 운영 DB(또는 개발용 리모트 DB)에 연결합니다. 로컬 Supabase 인스턴스는 사용하지 않습니다.

프로젝트 루트에 `.env.local` 파일 생성:
```env
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[anon public 키]
```

### 운영 빌드용 (.env.production)

`.env.production` 은 **git 에서 추적하지 않는다**(`.gitignore`). 새 환경에서 빌드하려면 직접 만든다. 키 이름은 두 개뿐이다.

```env
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[anon public 키]
```

- 값은 Supabase 대시보드 → Settings → API 에서 복사한다.
- `VITE_*` 값은 번들에 그대로 들어가므로 **anon 키만** 쓴다. `service_role` 키는 절대 넣지 않는다.

---

## Part D: Supabase 인증 URL

운영 도메인을 Supabase 에 등록한다.

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. **Site URL**: `https://livepulse.noligo.co.kr`
3. **Redirect URLs**: `https://livepulse.noligo.co.kr/**`

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

1. 환경변수 이름이 `VITE_`로 시작하는지 확인
2. `.env.production` 수정 후에는 다시 `npm run build` 하고 `dist/` 를 다시 올려야 한다

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
| **배포** | `.env.production` 준비 | ⬜ |
| | `npm run build` | ⬜ |
| | `dist/` → `/home/livepulse/www/` 업로드 | ⬜ |
| **확인** | 사이트 접속 테스트 | ⬜ |
| | 로그인 테스트 | ⬜ |
| | 기능 테스트 | ⬜ |

---

## 🔗 참고 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Vite 환경변수 가이드](https://vitejs.dev/guide/env-and-mode.html)

---

**마지막 업데이트**: 2025-12-01
