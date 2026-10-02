-- 00 확장
-- LivePulse 운영 DB(pfrdyviyzilhjarnmcec) 스키마 덤프 — 자동 생성(supabase/schema/dump.mjs). 직접 고치지 말고 다시 덤프한다.
-- 데이터는 없음(storage.buckets 메타 행 제외).

create schema if not exists public;
create schema if not exists extensions;

-- pg_stat_statements (스키마 extensions): Supabase 플랫폼 기본 제공 — 생성하지 않음
create extension if not exists "pgcrypto" with schema extensions;
-- plpgsql (스키마 pg_catalog): Supabase 플랫폼 기본 제공 — 생성하지 않음
-- supabase_vault (스키마 vault): Supabase 플랫폼 기본 제공 — 생성하지 않음
create extension if not exists "uuid-ossp" with schema extensions;
