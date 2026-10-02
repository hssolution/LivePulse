# LivePulse 배포 가이드

> Supabase (백엔드) + Tongbig nginx 정적 (프론트엔드) — 지금 실제로 쓰는 배포 방법

---

## 📋 목차

1. [지금 쓰는 배포 순서(요약)](#지금-쓰는-배포-순서요약)
2. [Part A: 운영 DB 변경(Supabase)](#part-a-운영-db-변경supabase)
3. [Part B: 운영 배포](#part-b-운영-배포-tongbig-nginx-정적)
4. [Part C: 환경변수 설정](#part-c-환경변수-설정)
5. [Part D: Supabase 인증 URL](#part-d-supabase-인증-url)
6. [문제 해결](#문제-해결)

---

## 지금 쓰는 배포 순서(요약)

운영 = Supabase 프로젝트 `pfrdyviyzilhjarnmcec`(DB·인증) + Tongbig nginx 정적 파일(`https://livepulse.noligo.co.kr`).
DB 를 바꾸는 변경은 **DB 먼저, 화면 나중**이다(새 화면이 아직 없는 함수를 부르지 않게).

1. 마이그레이션 파일 `supabase/migrations/NNN_YYYYMMDD_설명.sql` 을 쓴다(번호는 이어서, 추가 위주, `BEGIN; … COMMIT;`).
2. 로컬 재현 DB 에서 먼저 돌려 본다(`supabase/schema/README.md` 의 «재현 시험» — `_local_stub.sql` → 00~07 → 새 마이그레이션).
3. 운영 DB 에 적용한다(아래 A-1).
4. `node supabase/schema/dump.mjs` 로 스키마 덤프를 다시 떠서 커밋한다(«지금 운영 모양» 정본, 026 부터 규칙).
5. `npm run build` 통과 확인 → `npm run deploy`(Part B).
6. 운영 주소에서 직접 확인하고, 시험 데이터는 지운다.

커밋 예: 기능 커밋(마이그레이션+화면) 하나 + `chore(db): NNN 적용 뒤 운영 스키마 다시 덤프` 하나.

---

## Part A: 운영 DB 변경(Supabase)

### A-1. 마이그레이션 적용 — 대시보드 세션으로 pg-meta

이 저장소에는 **Supabase CLI 연결·서비스 키·DB 비밀번호가 없다.** 운영 DB 에 SQL 을 올리는 길은 하나다:
Aside 브라우저에 로그인된 Supabase 대시보드 세션으로, 백그라운드 탭에서
`api.supabase.com/platform/pg-meta/<ref>/query` 를 부른다(프로젝트 조회의 `connectionString` 을 `x-connection-encrypted` 헤더로).

- 읽기 전용 조회는 `supabase/schema/pgmeta.mjs` 의 `pgmeta([...])`(SELECT/WITH 만 허용)를 쓴다.
- 마이그레이션 적용도 같은 방식으로 파일 내용을 그대로 보낸다(파일 안의 `BEGIN/COMMIT` 이 한 묶음으로 처리).
  토큰·접속 문자열은 탭 안에서만 쓰고 저장·출력하지 않는다.
- 대안: 대시보드 **SQL Editor** 에 파일 내용을 붙여 넣고 실행해도 된다.
- 적용 뒤 `pgmeta` 로 새 컬럼·함수·정책이 실제로 생겼는지 확인한다.

### A-2. 스키마 덤프 갱신

```bash
node supabase/schema/dump.mjs     # supabase/schema/00~07*.sql, counts.json 을 다시 쓴다
git diff --stat supabase/schema
```

`supabase/schema/` 가 운영 DB 모양의 정본이다. 마이그레이션(`supabase/migrations/`)은 변경 이력이다.

### A-3. 새 Supabase 프로젝트를 세울 때(평소엔 안 함)

마이그레이션 001~ 을 다시 돌리지 않는다(운영에 직접 만든 객체가 많아 그것만으로는 재현되지 않는다).
`supabase/schema/` 의 00~07 을 순서대로 적용하고(`supabase/schema/README.md`), 시드(`supabase/seeds/`)를 넣은 뒤
대시보드 전용 설정(Auth Hook·메일 템플릿·URL·SMTP·Edge Functions)을 `supabase/manual/` 대로 맞춘다.

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
- 빌드와 업로드를 한 번에: `npm run deploy` (`vite build` → rsync, `--delete` 없음. root 계정·키 `~/.ssh/tongbig_ed25519`, 소유자 `livepulse:livepulse`). 직전 `www` 백업은 서버의 `/home/livepulse/www.bak-20261001`.
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

- 파일이 `BEGIN; … COMMIT;` 로 묶여 있으면 실패 시 아무것도 바뀌지 않는다. 오류 메시지를 보고 로컬 재현 DB 에서 고친 뒤 다시 올린다.
- `supabase db reset` 같은 초기화 명령은 운영에 절대 쓰지 않는다(운영 데이터가 지워진다).

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
| **DB** | 마이그레이션 파일 작성(번호 이어서) | ⬜ |
| | 로컬 재현 DB 에서 적용 시험 | ⬜ |
| | 운영 적용(pg-meta 또는 SQL Editor) 후 객체 확인 | ⬜ |
| | `node supabase/schema/dump.mjs` 후 커밋 | ⬜ |
| **화면** | `.env.production` 준비 | ⬜ |
| | `npm run build` 통과 | ⬜ |
| | `npm run deploy` (`dist/` → `/home/livepulse/www/`) | ⬜ |
| **확인** | 운영 주소 접속·바뀐 기능 확인 | ⬜ |
| | 시험 데이터 정리 | ⬜ |

---

## 🔗 참고 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Vite 환경변수 가이드](https://vitejs.dev/guide/env-and-mode.html)

---

**마지막 업데이트**: 2026-10-03 (실제 DB 반영 방식·마이그레이션 순서로 정정)
