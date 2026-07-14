-- 023_session_duplicate
-- 세션 복제 (설정 재사용) — 소유 파트너만. 새 draft 세션으로
-- 디자인·발표자·Q&A 카테고리·강연자료·투표(+선택지)·큐시트를 통째 복제(id 리매핑).
-- 원격에 mcp__supabase__apply_migration 로 직접 적용됨(2026-07-13). 이력 보관용 사본.

create or replace function public.sp_partner_session_duplicate_s(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_src   public.sessions;
  v_new_id uuid := gen_random_uuid();
  v_code  text;
  v_try   int := 0;
begin
  select * into v_src from public.sessions where id = p_session_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;
  if not public.is_partner_owner(v_src.partner_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  loop
    v_try := v_try + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.sessions where code = v_code);
    if v_try > 30 then
      return jsonb_build_object('success', false, 'error', 'code_gen_failed');
    end if;
  end loop;

  insert into public.sessions (
    id, partner_id, template_id, qna_template_id, poll_template_id,
    title, venue_name, venue_address, start_at, end_at,
    contact_phone, contact_email, max_participants, code, description,
    status, participant_count, broadcast_settings, audience_settings,
    broadcast_mode, broadcast_pdf_page, qna_rev, cues_rev, max_page
  )
  select
    v_new_id, v_src.partner_id, template_id, qna_template_id, poll_template_id,
    title || ' (복사본)', venue_name, venue_address, start_at, end_at,
    contact_phone, contact_email, max_participants, v_code, description,
    'draft', 0, broadcast_settings, audience_settings,
    'idle', 1, 0, 0, 1
  from public.sessions where id = p_session_id;

  create temp table _pres on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.session_presenters where session_id = p_session_id;
  insert into public.session_presenters (id, session_id, presenter_type, user_id, partner_id, manual_name, manual_title, manual_bio, manual_image, display_name, display_title, display_order, status)
  select m.new_id, v_new_id, sp.presenter_type, sp.user_id, sp.partner_id, sp.manual_name, sp.manual_title, sp.manual_bio, sp.manual_image, sp.display_name, sp.display_title, sp.display_order, sp.status
  from public.session_presenters sp join _pres m on m.old_id = sp.id;

  create temp table _cat on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.qna_categories where session_id = p_session_id;
  insert into public.qna_categories (id, session_id, name, color, display_order, is_visible)
  select m.new_id, v_new_id, c.name, c.color, c.display_order, c.is_visible
  from public.qna_categories c join _cat m on m.old_id = c.id;

  create temp table _lec on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.lecture_files where session_id = p_session_id;
  insert into public.lecture_files (id, session_id, presenter_id, title, file_url, file_path, page_count, file_size, display_order, allow_download, pages_path)
  select m.new_id, v_new_id, pm.new_id, l.title, l.file_url, l.file_path, l.page_count, l.file_size, l.display_order, l.allow_download, l.pages_path
  from public.lecture_files l join _lec m on m.old_id = l.id
  left join _pres pm on pm.old_id = l.presenter_id;

  create temp table _poll on commit drop as
    select id as old_id, gen_random_uuid() as new_id from public.polls where session_id = p_session_id;
  insert into public.polls (id, session_id, template_id, question, poll_type, is_required, status, display_order, show_results, allow_anonymous, max_selections)
  select m.new_id, v_new_id, p.template_id, p.question, p.poll_type, p.is_required, p.status, p.display_order, p.show_results, p.allow_anonymous, p.max_selections
  from public.polls p join _poll m on m.old_id = p.id;
  insert into public.poll_options (id, poll_id, option_text, display_order)
  select gen_random_uuid(), m.new_id, o.option_text, o.display_order
  from public.poll_options o join _poll m on m.old_id = o.poll_id;

  insert into public.session_cues (id, session_id, presenter_id, cue_type, title, lecture_file_id, start_page, poll_id, qna_category_id, notice_text, display_order, planned_start_at, duration_min, is_public, public_title)
  select gen_random_uuid(), v_new_id, prm.new_id, c.cue_type, c.title, lm.new_id, c.start_page, plm.new_id, cm.new_id, c.notice_text, c.display_order, c.planned_start_at, c.duration_min, c.is_public, c.public_title
  from public.session_cues c
  left join _pres prm on prm.old_id = c.presenter_id
  left join _lec  lm  on lm.old_id  = c.lecture_file_id
  left join _poll plm on plm.old_id = c.poll_id
  left join _cat  cm  on cm.old_id  = c.qna_category_id
  where c.session_id = p_session_id;

  insert into public.session_designs (session_id, draft, published, version, history, published_at)
  select v_new_id, draft, published, coalesce(version, 0), history, null
  from public.session_designs where session_id = p_session_id;

  return jsonb_build_object('success', true, 'session_id', v_new_id, 'code', v_code, 'title', v_src.title || ' (복사본)');
end;
$$;

grant execute on function public.sp_partner_session_duplicate_s(uuid) to authenticated;
