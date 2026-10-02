# 운영 DB 스키마 덤프 (supabase/schema)

운영 Supabase(프로젝트 `pfrdyviyzilhjarnmcec`)의 **스키마만**(행 데이터 없음) 카탈로그에서 뽑은 것이다.
마이그레이션(`../migrations` 001~025)만으로는 운영 DB 를 다시 세울 수 없어서(운영에 직접 만든 함수·정책이 많음) 만들었다.
**이 폴더가 «지금 운영 DB 모양»의 정본**이다.

- 덤프 날짜: **2026-10-02** (운영 Postgres 17.6)
- 대상: `public` 스키마(앱 스키마는 이것뿐) + 우리가 건 `auth` 트리거 + `storage` 버킷·`storage.objects` 정책 + realtime publication

## 적용 순서

빈 Supabase 프로젝트(또는 로컬 시험은 `_local_stub.sql` 먼저)에서 번호 순서대로:

| 파일 | 내용 |
|---|---|
| `00_extensions.sql` | 확장(pgcrypto, uuid-ossp) |
| `01_types.sql` | 사용자 타입·enum (현재 없음) |
| `02_tables.sql` | 시퀀스, 테이블(컬럼·기본값·NOT NULL·identity), 주석 |
| `03_constraints_indexes.sql` | PK·UNIQUE·CHECK → FK, 인덱스 |
| `04_functions.sql` | 함수·프로시저 전부 (`check_function_bodies=false` 로 적용) |
| `05_views_triggers.sql` | 뷰(현재 없음), 앱 테이블 트리거 |
| `06_rls_policies_grants.sql` | RLS 켜기, 정책, 테이블·시퀀스·함수 GRANT |
| `07_storage_realtime.sql` | `auth.users` 트리거, storage 버킷 행, `storage.objects` 정책, realtime publication |

`psql -v ON_ERROR_STOP=1 -d <DB> -f <파일>` 로 한 파일씩 순서대로 적용한다.

## 객체 수 (운영 vs 덤프 vs 재현한 로컬 DB)

| 객체 | 운영 | 덤프 | 재현 DB |
|---|---|---|---|
| 테이블(public) | 37 | 37 | 37 |
| 함수·프로시저(public, aggregate 제외) | 139 | 139 | 139 |
| 트리거(public 테이블) | 30 | 30 | 30 |
| 트리거(auth.users, 우리 함수) | 1 | 1 | 1 |
| 정책(public) | 119 | 119 | 119 |
| 정책(storage.objects) | 6 | 6 | 6 |
| 인덱스(public) | 135 | 135 | 135 |
| 제약(PK·UNIQUE·CHECK·FK) | 130 | 130 | 130 |
| RLS 켜진 테이블 | 37 | 37 | 37 |
| 시퀀스 / 뷰 / 사용자 타입 | 1 / 0 / 0 | 1 / 0 / 0 | 1 / 0 / 0 |
| storage 버킷 | 2 | 2 | 2 |
| realtime 테이블 | 4 | 4 | 4 |

함수 정의 전체·정책 전체·인덱스 정의 전체의 md5 도 운영과 재현 DB 가 같다(`pg_get_functiondef` 이어붙인 값 등).
(함수가 «약 104종»이라 알려져 있었으나 실제 운영은 139종 — 모두 확장 소유가 아닌 앱 함수다.)

## 재현 시험 (2026-10-02)

로컬 Postgres 18 에 빈 DB 를 만들고 `_local_stub.sql`(롤 anon/authenticated/service_role/supabase_auth_admin, `auth.users`·`auth.uid()/role()/jwt()`,
`storage.buckets/objects`, `supabase_realtime` publication, 기본 권한) → 00~07 을 `ON_ERROR_STOP=1` 로 적용: **오류 0건**.
시험 환경은 쓰고 정지·폐기했다.

## 한계 (알아둘 것)

- 함수 본문은 `check_function_bodies=false` 로 적용한다(함수끼리·테이블 참조 순서 문제를 피함). 생성은 되지만 본문 오류는 호출 때 드러난다.
- GRANT 는 운영 ACL 그대로 적는다(`revoke all … from public, anon, authenticated, service_role` 후 운영 값만 부여). ACL 이 비어 있던(기본값) 객체는 적지 않는다.
- 소유자는 모두 `postgres` — 적용하는 롤이 소유자가 된다.
- **대시보드에서만 하는 설정은 여기 없다**: Auth Hook·이메일 템플릿·URL·SMTP·Edge Functions·Secrets → `../manual/` 문서.
- 행 데이터·`auth.users` 계정은 없다. storage 버킷은 메타 행(이름·public·크기/MIME 제한)만 넣는다.
- 확장 `pg_stat_statements`·`supabase_vault` 는 플랫폼 기본이라 만들지 않는다.

## 마이그레이션 001~025 와의 관계

`../migrations` 는 변경 이력이고 이 폴더는 «지금 모양»이다. 새 DB 를 세울 때는 **이 폴더만** 적용한다(마이그레이션과 같이 돌리지 않는다).
이미 운영에 있는 DB 에는 새 마이그레이션만 올리면 된다. 운영 DB 를 바꾼 뒤에는 아래대로 다시 덤프해 이 폴더도 갱신한다.

## 다시 덤프하는 법

```bash
node supabase/schema/dump.mjs     # 00~07*.sql, counts.json 을 다시 쓴다
git diff --stat supabase/schema   # 바뀐 것 = 운영과 저장소의 차이
```

- 조건: Aside 브라우저에 Supabase 대시보드가 로그인돼 있을 것. `pgmeta.mjs` 가 **백그라운드 탭**을 열어 대시보드 세션 토큰으로
  `api.supabase.com/platform/pg-meta/<ref>/query` 에 **SELECT 만** 보내고 탭을 닫는다. 토큰·접속 문자열은 탭 안에서만 쓰이고 저장·출력되지 않는다.
- 다른 프로젝트: `SUPABASE_REF=<ref>` 환경변수.
- 덤프 후 재현 시험은 위 «재현 시험» 절차대로. 운영 수는 `counts.json` 에 기록된다.
