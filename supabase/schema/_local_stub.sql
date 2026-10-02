-- 재현 시험용 최소 스텁: Supabase 가 프로젝트를 만들 때 기본으로 주는 것 중 이 스키마가 기대는 것만.
-- 실제 Supabase 프로젝트에는 적용하지 않는다(이미 있다). 빈 로컬 Postgres 에서 00~07 을 시험할 때만 먼저 실행.
--   psql -v ON_ERROR_STOP=1 -d <빈DB> -f _local_stub.sql
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin noinherit; end if;
end $$;

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists realtime;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
grant usage on schema auth, public to supabase_auth_admin;

-- auth
create table auth.users (
  instance_id uuid, id uuid primary key default gen_random_uuid(), aud varchar(255), role varchar(255),
  email varchar(255), encrypted_password varchar(255), email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token varchar(255), confirmation_sent_at timestamptz, recovery_token varchar(255), recovery_sent_at timestamptz,
  last_sign_in_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_super_admin boolean,
  created_at timestamptz, updated_at timestamptz, phone text unique, phone_confirmed_at timestamptz,
  banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean not null default false
);
create or replace function auth.uid() returns uuid language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create or replace function auth.role() returns text language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
create or replace function auth.email() returns text language sql stable as
$$ select nullif(current_setting('request.jwt.claim.email', true), '')::text $$;
grant execute on function auth.uid(), auth.role(), auth.jwt(), auth.email() to anon, authenticated, service_role;
grant select on auth.users to supabase_auth_admin;

-- storage
create table storage.buckets (
  id text primary key, name text not null unique, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
  public boolean default false, avif_autodetection boolean default false, file_size_limit bigint, allowed_mime_types text[], owner_id text
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid,
  created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz default now(),
  metadata jsonb, path_tokens text[] generated always as (string_to_array(name, '/')) stored, version text, owner_id text, user_metadata jsonb
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language plpgsql as
$$ declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[1:array_length(_parts,1)-1]; end $$;
create or replace function storage.filename(name text) returns text language plpgsql as
$$ declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[array_length(_parts,1)]; end $$;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

-- realtime
create publication supabase_realtime;

-- Supabase 기본 권한(public 에 새로 만든 객체를 anon/authenticated/service_role 이 모두 받는다)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
