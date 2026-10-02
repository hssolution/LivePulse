-- 07 storage 버킷·storage.objects 정책·realtime·auth 트리거
-- LivePulse 운영 DB(pfrdyviyzilhjarnmcec) 스키마 덤프 — 자동 생성(supabase/schema/dump.mjs). 직접 고치지 말고 다시 덤프한다.
-- 데이터는 없음(storage.buckets 메타 행 제외).

-- auth 스키마 등 앱 밖 테이블에 건 우리 트리거(함수는 04 에 있음)
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- storage 버킷(메타 행만: 이름·public 여부, 있으면 크기·MIME 제한)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('editor-images', 'editor-images', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public) values ('session-assets', 'session-assets', true)
  on conflict (id) do update set public = excluded.public;

-- storage.objects 정책
create policy "Anyone can view editor images" on storage.objects as PERMISSIVE for SELECT
  using ((bucket_id = 'editor-images'::text));
create policy "Anyone can view session assets" on storage.objects as PERMISSIVE for SELECT to anon, authenticated
  using ((bucket_id = 'session-assets'::text));
create policy "Authenticated users can delete session assets" on storage.objects as PERMISSIVE for DELETE to authenticated
  using ((bucket_id = 'session-assets'::text));
create policy "Authenticated users can upload editor images" on storage.objects as PERMISSIVE for INSERT to authenticated
  with check ((bucket_id = 'editor-images'::text));
create policy "Authenticated users can upload session assets" on storage.objects as PERMISSIVE for INSERT to authenticated
  with check ((bucket_id = 'session-assets'::text));
create policy "Users can delete own editor images" on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'editor-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

-- realtime publication supabase_realtime
alter publication supabase_realtime add table public.poll_responses;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.sessions;
