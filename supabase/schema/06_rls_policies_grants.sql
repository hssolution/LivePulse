-- 06 RLS·정책·GRANT
-- LivePulse 운영 DB(pfrdyviyzilhjarnmcec) 스키마 덤프 — 자동 생성(supabase/schema/dump.mjs). 직접 고치지 말고 다시 덤프한다.
-- 데이터는 없음(storage.buckets 메타 행 제외).

-- RLS 켜기
alter table public.active_sessions enable row level security;
alter table public.anonymous_participants enable row level security;
alter table public.app_config enable row level security;
alter table public.faqs enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_replies enable row level security;
alter table public.instructor_profiles enable row level security;
alter table public.language_categories enable row level security;
alter table public.language_keys enable row level security;
alter table public.languages enable row level security;
alter table public.lecture_files enable row level security;
alter table public.login_attempts enable row level security;
alter table public.login_logs enable row level security;
alter table public.partner_agencies enable row level security;
alter table public.partner_instructors enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_organizers enable row level security;
alter table public.partner_requests enable row level security;
alter table public.partners enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_responses enable row level security;
alter table public.polls enable row level security;
alter table public.posts enable row level security;
alter table public.profiles enable row level security;
alter table public.qna_categories enable row level security;
alter table public.question_likes enable row level security;
alter table public.questions enable row level security;
alter table public.session_assets enable row level security;
alter table public.session_cues enable row level security;
alter table public.session_designs enable row level security;
alter table public.session_feedback enable row level security;
alter table public.session_members enable row level security;
alter table public.session_partners enable row level security;
alter table public.session_presenters enable row level security;
alter table public.session_template_fields enable row level security;
alter table public.session_templates enable row level security;
alter table public.sessions enable row level security;
alter table public.translations enable row level security;
alter table public.user_theme_settings enable row level security;

-- 정책(public)
create policy active_sessions_admin_all on public.active_sessions as PERMISSIVE for ALL to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy active_sessions_insert on public.active_sessions as PERMISSIVE for INSERT to authenticated
  with check ((user_id = auth.uid()));
create policy active_sessions_own_delete on public.active_sessions as PERMISSIVE for DELETE to authenticated
  using ((user_id = auth.uid()));
create policy active_sessions_own_select on public.active_sessions as PERMISSIVE for SELECT to authenticated
  using ((user_id = auth.uid()));
create policy active_sessions_own_update on public.active_sessions as PERMISSIVE for UPDATE to authenticated
  using ((user_id = auth.uid()));
create policy "Anyone can check duplicates" on public.anonymous_participants as PERMISSIVE for SELECT
  using (true);
create policy "Anyone can insert their participation" on public.anonymous_participants as PERMISSIVE for INSERT
  with check (true);
create policy "App config is viewable by everyone" on public.app_config as PERMISSIVE for SELECT
  using (true);
create policy "Only admins can modify app config" on public.app_config as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy faqs_admin_all on public.faqs as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy faqs_select_active on public.faqs as PERMISSIVE for SELECT
  using ((is_active = true));
create policy inquiries_admin_all on public.inquiries as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy inquiries_partner_insert on public.inquiries as PERMISSIVE for INSERT
  with check (((partner_id IN ( SELECT p.id
   FROM (partners p
     JOIN partner_members pm ON ((pm.partner_id = p.id)))
  WHERE ((pm.user_id = auth.uid()) AND (pm.status = 'accepted'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy inquiries_partner_select on public.inquiries as PERMISSIVE for SELECT
  using (((partner_id IN ( SELECT p.id
   FROM (partners p
     JOIN partner_members pm ON ((pm.partner_id = p.id)))
  WHERE ((pm.user_id = auth.uid()) AND (pm.status = 'accepted'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy inquiry_replies_admin_all on public.inquiry_replies as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy inquiry_replies_insert on public.inquiry_replies as PERMISSIVE for INSERT
  with check (((user_id = auth.uid()) AND ((inquiry_id IN ( SELECT inquiries.id
   FROM inquiries
  WHERE ((inquiries.partner_id IN ( SELECT p.id
           FROM (partners p
             JOIN partner_members pm ON ((pm.partner_id = p.id)))
          WHERE ((pm.user_id = auth.uid()) AND (pm.status = 'accepted'::text)))) OR (inquiries.partner_id IN ( SELECT partners.id
           FROM partners
          WHERE (partners.profile_id = auth.uid())))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))))));
create policy inquiry_replies_select on public.inquiry_replies as PERMISSIVE for SELECT
  using (((inquiry_id IN ( SELECT inquiries.id
   FROM inquiries
  WHERE ((inquiries.partner_id IN ( SELECT p.id
           FROM (partners p
             JOIN partner_members pm ON ((pm.partner_id = p.id)))
          WHERE ((pm.user_id = auth.uid()) AND (pm.status = 'accepted'::text)))) OR (inquiries.partner_id IN ( SELECT partners.id
           FROM partners
          WHERE (partners.profile_id = auth.uid())))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy instructor_profiles_insert on public.instructor_profiles as PERMISSIVE for INSERT to authenticated
  with check ((((user_id = auth.uid()) OR ((user_id IS NULL) AND (created_by = auth.uid()))) AND ((partner_id IS NULL) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))))));
create policy instructor_profiles_select on public.instructor_profiles as PERMISSIVE for SELECT to anon, authenticated
  using ((is_public OR (user_id = auth.uid()) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy instructor_profiles_update on public.instructor_profiles as PERMISSIVE for UPDATE to authenticated
  using (((user_id = auth.uid()) OR ((user_id IS NULL) AND (created_by = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))))
  with check (((((user_id = auth.uid()) OR ((user_id IS NULL) AND (created_by = auth.uid()))) AND ((partner_id IS NULL) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy "Categories are viewable by everyone" on public.language_categories as PERMISSIVE for SELECT
  using (true);
create policy "Only admins can modify categories" on public.language_categories as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Language keys are viewable by everyone" on public.language_keys as PERMISSIVE for SELECT
  using (true);
create policy "Only admins can modify language keys" on public.language_keys as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Languages are viewable by everyone" on public.languages as PERMISSIVE for SELECT
  using (true);
create policy "Only admins can modify languages" on public.languages as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can view lecture files of public sessions" on public.lecture_files as PERMISSIVE for SELECT to anon, authenticated
  using ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = ANY (ARRAY['published'::text, 'active'::text])))));
create policy "Session managers can manage lecture files" on public.lecture_files as PERMISSIVE for ALL to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))))
  with check (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy login_attempts_anon_insert on public.login_attempts as PERMISSIVE for INSERT to anon, authenticated
  with check (true);
create policy login_attempts_anon_select on public.login_attempts as PERMISSIVE for SELECT to anon, authenticated
  using (true);
create policy login_attempts_anon_update on public.login_attempts as PERMISSIVE for UPDATE to anon, authenticated
  using (true);
create policy login_logs_select on public.login_logs as PERMISSIVE for SELECT to authenticated
  using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM (partner_members pm1
     JOIN partner_members pm2 ON ((pm1.partner_id = pm2.partner_id)))
  WHERE ((pm1.user_id = auth.uid()) AND (pm1.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (pm1.status = 'accepted'::text) AND (pm2.user_id = login_logs.user_id)))) OR (user_id = auth.uid())));
create policy login_logs_service_insert on public.login_logs as PERMISSIVE for INSERT to authenticated
  with check (true);
create policy partner_agencies_insert_admin on public.partner_agencies as PERMISSIVE for INSERT
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy partner_agencies_select_admin on public.partner_agencies as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy partner_agencies_select_own on public.partner_agencies as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM partners p
  WHERE ((p.id = partner_agencies.partner_id) AND (p.profile_id = auth.uid())))));
create policy partner_agencies_update on public.partner_agencies as PERMISSIVE for UPDATE
  using (((EXISTS ( SELECT 1
   FROM partners p
  WHERE ((p.id = partner_agencies.partner_id) AND (p.profile_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy partner_instructors_insert_admin on public.partner_instructors as PERMISSIVE for INSERT
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy partner_instructors_select_admin on public.partner_instructors as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy partner_instructors_select_own on public.partner_instructors as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM partners p
  WHERE ((p.id = partner_instructors.partner_id) AND (p.profile_id = auth.uid())))));
create policy partner_instructors_update on public.partner_instructors as PERMISSIVE for UPDATE
  using (((EXISTS ( SELECT 1
   FROM partners p
  WHERE ((p.id = partner_instructors.partner_id) AND (p.profile_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy accepted_member_select on public.partner_members as PERMISSIVE for SELECT to authenticated
  using (((user_id = auth.uid()) AND (status = 'accepted'::text)));
create policy admin_select_partner_members on public.partner_members as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy own_invite_select on public.partner_members as PERMISSIVE for SELECT to authenticated
  using ((email = ( SELECT profiles.email
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
create policy partner_owner_delete_members on public.partner_members as PERMISSIVE for DELETE to authenticated
  using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy partner_owner_insert_members on public.partner_members as PERMISSIVE for INSERT to authenticated
  with check (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy partner_owner_select_members on public.partner_members as PERMISSIVE for SELECT to authenticated
  using ((partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))));
create policy partner_owner_update_members on public.partner_members as PERMISSIVE for UPDATE to authenticated
  using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))) OR (email = ( SELECT profiles.email
   FROM profiles
  WHERE (profiles.id = auth.uid())))));
create policy public_invite_select on public.partner_members as PERMISSIVE for SELECT to anon
  using (((invite_token IS NOT NULL) AND (status = 'pending'::text)));
create policy partner_organizers_insert_admin on public.partner_organizers as PERMISSIVE for INSERT
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy partner_organizers_select_admin on public.partner_organizers as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy partner_organizers_select_own on public.partner_organizers as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM partners p
  WHERE ((p.id = partner_organizers.partner_id) AND (p.profile_id = auth.uid())))));
create policy partner_organizers_update on public.partner_organizers as PERMISSIVE for UPDATE
  using (((EXISTS ( SELECT 1
   FROM partners p
  WHERE ((p.id = partner_organizers.partner_id) AND (p.profile_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy "Admins can update partner requests" on public.partner_requests as PERMISSIVE for UPDATE
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Admins can view all partner requests" on public.partner_requests as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Users can insert partner requests" on public.partner_requests as PERMISSIVE for INSERT
  with check ((auth.uid() = user_id));
create policy "Users can view own partner requests" on public.partner_requests as PERMISSIVE for SELECT
  using ((auth.uid() = user_id));
create policy "Active partners are viewable by partners" on public.partners as PERMISSIVE for SELECT
  using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'partner'::text))))));
create policy "Admins can insert partners" on public.partners as PERMISSIVE for INSERT
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Admins can update partners" on public.partners as PERMISSIVE for UPDATE
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Admins can view all partners" on public.partners as PERMISSIVE for SELECT
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Users can view own partner info" on public.partners as PERMISSIVE for SELECT
  using ((profile_id = auth.uid()));
create policy "Anyone can view poll options" on public.poll_options as PERMISSIVE for SELECT to anon, authenticated
  using (true);
create policy "Session managers can manage poll options" on public.poll_options as PERMISSIVE for ALL to authenticated
  using ((poll_id IN ( SELECT p.id
   FROM ((polls p
     JOIN sessions s ON ((p.session_id = s.id)))
     JOIN partners pt ON ((s.partner_id = pt.id)))
  WHERE (pt.profile_id = auth.uid()))))
  with check ((poll_id IN ( SELECT p.id
   FROM ((polls p
     JOIN sessions s ON ((p.session_id = s.id)))
     JOIN partners pt ON ((s.partner_id = pt.id)))
  WHERE (pt.profile_id = auth.uid()))));
create policy "Admins can view all responses" on public.poll_responses as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can submit responses" on public.poll_responses as PERMISSIVE for INSERT to anon, authenticated
  with check ((poll_id IN ( SELECT polls.id
   FROM polls
  WHERE (polls.status = 'active'::text))));
create policy "Session managers can view responses" on public.poll_responses as PERMISSIVE for SELECT to authenticated
  using ((poll_id IN ( SELECT p.id
   FROM ((polls p
     JOIN sessions s ON ((p.session_id = s.id)))
     JOIN partners pt ON ((s.partner_id = pt.id)))
  WHERE (pt.profile_id = auth.uid()))));
create policy "Admins can view all polls" on public.polls as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can view active polls" on public.polls as PERMISSIVE for SELECT to anon, authenticated
  using (((status = ANY (ARRAY['active'::text, 'closed'::text])) AND (session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = ANY (ARRAY['published'::text, 'active'::text]))))));
create policy "Partners can insert polls" on public.polls as PERMISSIVE for INSERT to authenticated
  with check ((EXISTS ( SELECT 1
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE ((s.id = polls.session_id) AND (p.profile_id = auth.uid())))));
create policy "Session managers can manage polls" on public.polls as PERMISSIVE for ALL to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text))))))
  with check (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text))))));
create policy posts_delete_all on public.posts as PERMISSIVE for DELETE
  using (true);
create policy posts_insert_all on public.posts as PERMISSIVE for INSERT
  with check (true);
create policy posts_select_all on public.posts as PERMISSIVE for SELECT
  using (true);
create policy posts_update_all on public.posts as PERMISSIVE for UPDATE
  using (true)
  with check (true);
create policy "Admins can update all profiles" on public.profiles as PERMISSIVE for UPDATE to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.user_role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.user_role = 'admin'::text)))));
create policy "Public profiles are viewable by everyone" on public.profiles as PERMISSIVE for SELECT
  using (true);
create policy "Users can update own profile" on public.profiles as PERMISSIVE for UPDATE
  using ((auth.uid() = id));
create policy "Anyone can view qna categories of public sessions" on public.qna_categories as PERMISSIVE for SELECT to anon, authenticated
  using ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = ANY (ARRAY['published'::text, 'active'::text])))));
create policy "Session managers can manage qna categories" on public.qna_categories as PERMISSIVE for ALL to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))))
  with check (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy "Anyone can view likes" on public.question_likes as PERMISSIVE for SELECT to anon, authenticated
  using (true);
create policy "Admins can delete all questions" on public.questions as PERMISSIVE for DELETE to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Admins can update all questions" on public.questions as PERMISSIVE for UPDATE to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Admins can view all questions" on public.questions as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can submit questions" on public.questions as PERMISSIVE for INSERT to anon, authenticated
  with check ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = 'active'::text))));
create policy "Anyone can view approved questions" on public.questions as PERMISSIVE for SELECT to anon, authenticated
  using (((status = ANY (ARRAY['approved'::text, 'answered'::text])) AND (session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = ANY (ARRAY['published'::text, 'active'::text]))))));
create policy "Session managers can delete questions" on public.questions as PERMISSIVE for DELETE to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text))))));
create policy "Session managers can insert questions" on public.questions as PERMISSIVE for INSERT to authenticated
  with check (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy "Session managers can update questions" on public.questions as PERMISSIVE for UPDATE to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text))))));
create policy "Session managers can view all questions" on public.questions as PERMISSIVE for SELECT to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text))))));
create policy "Anyone can view assets of published sessions" on public.session_assets as PERMISSIVE for SELECT
  using ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = ANY (ARRAY['published'::text, 'active'::text])))));
create policy "Session owners can manage assets" on public.session_assets as PERMISSIVE for ALL to authenticated
  using ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.partner_id IN ( SELECT partners.id
           FROM partners
          WHERE (partners.profile_id = auth.uid()))))))
  with check ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.partner_id IN ( SELECT partners.id
           FROM partners
          WHERE (partners.profile_id = auth.uid()))))));
create policy "Session managers can manage cues" on public.session_cues as PERMISSIVE for ALL to authenticated
  using (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))))
  with check (((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text))))));
create policy "managers manage designs" on public.session_designs as PERMISSIVE for ALL
  using (sp_can_control_session(session_id))
  with check (sp_can_control_session(session_id));
create policy session_feedback_select_manager on public.session_feedback as PERMISSIVE for SELECT to authenticated
  using (fn_can_manage_session(session_id));
create policy "Members can view their own membership" on public.session_members as PERMISSIVE for SELECT to authenticated
  using ((user_id = auth.uid()));
create policy "Session owners can manage members" on public.session_members as PERMISSIVE for ALL to authenticated
  using ((EXISTS ( SELECT 1
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE ((s.id = session_members.session_id) AND (p.profile_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE ((s.id = session_members.session_id) AND (p.profile_id = auth.uid())))));
create policy "Users can cancel their participation" on public.session_members as PERMISSIVE for DELETE to authenticated
  using (((user_id = auth.uid()) AND (role = 'participant'::text)));
create policy "Users can join sessions" on public.session_members as PERMISSIVE for INSERT to authenticated
  with check (((user_id = auth.uid()) AND (role = 'participant'::text)));
create policy "Admins can view all session_partners" on public.session_partners as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Invited partners can update status" on public.session_partners as PERMISSIVE for UPDATE to authenticated
  using ((partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))))
  with check ((partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))));
create policy "Invited partners can view and respond" on public.session_partners as PERMISSIVE for SELECT to authenticated
  using ((partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))));
create policy "Session owners can manage session_partners" on public.session_partners as PERMISSIVE for ALL to authenticated
  using ((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))))
  with check ((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))));
create policy "Admins can view all session_presenters" on public.session_presenters as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can view presenters of public sessions" on public.session_presenters as PERMISSIVE for SELECT to anon, authenticated
  using ((session_id IN ( SELECT sessions.id
   FROM sessions
  WHERE (sessions.status = ANY (ARRAY['published'::text, 'active'::text])))));
create policy "Invited partners can manage presenters" on public.session_presenters as PERMISSIVE for ALL to authenticated
  using ((session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))))
  with check ((session_id IN ( SELECT sp.session_id
   FROM (session_partners sp
     JOIN partners p ON ((sp.partner_id = p.id)))
  WHERE ((p.profile_id = auth.uid()) AND (sp.status = 'accepted'::text)))));
create policy "Presenter partners can update status" on public.session_presenters as PERMISSIVE for UPDATE to authenticated
  using (((presenter_type = 'partner'::text) AND (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))))
  with check (((presenter_type = 'partner'::text) AND (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy "Presenter partners can view and respond" on public.session_presenters as PERMISSIVE for SELECT to authenticated
  using (((presenter_type = 'partner'::text) AND (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy "Session owners can manage session_presenters" on public.session_presenters as PERMISSIVE for ALL to authenticated
  using ((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))))
  with check ((session_id IN ( SELECT s.id
   FROM (sessions s
     JOIN partners p ON ((s.partner_id = p.id)))
  WHERE (p.profile_id = auth.uid()))));
create policy "Admins can manage template fields" on public.session_template_fields as PERMISSIVE for ALL to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can view template fields" on public.session_template_fields as PERMISSIVE for SELECT
  using (true);
create policy "Admins can manage templates" on public.session_templates as PERMISSIVE for ALL to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Anyone can view active templates" on public.session_templates as PERMISSIVE for SELECT
  using ((is_active = true));
create policy sessions_delete_owner_or_admin on public.sessions as PERMISSIVE for DELETE to authenticated
  using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy sessions_insert_partner on public.sessions as PERMISSIVE for INSERT to authenticated
  with check ((partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid()))));
create policy sessions_select_all on public.sessions as PERMISSIVE for SELECT
  using (true);
create policy sessions_update_owner_or_admin on public.sessions as PERMISSIVE for UPDATE to authenticated
  using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))))
  with check (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))) OR (partner_id IN ( SELECT partners.id
   FROM partners
  WHERE (partners.profile_id = auth.uid())))));
create policy "Only admins can modify translations" on public.translations as PERMISSIVE for ALL
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_role = 'admin'::text)))));
create policy "Translations are viewable by everyone" on public.translations as PERMISSIVE for SELECT
  using (true);
create policy "Users can delete own theme settings" on public.user_theme_settings as PERMISSIVE for DELETE
  using ((auth.uid() = user_id));
create policy "Users can insert own theme settings" on public.user_theme_settings as PERMISSIVE for INSERT
  with check ((auth.uid() = user_id));
create policy "Users can update own theme settings" on public.user_theme_settings as PERMISSIVE for UPDATE
  using ((auth.uid() = user_id));
create policy "Users can view own theme settings" on public.user_theme_settings as PERMISSIVE for SELECT
  using ((auth.uid() = user_id));

-- GRANT: 운영 ACL 그대로. 객체별로 anon/authenticated/service_role/public 기본 권한을 먼저 걷어내고 운영 값만 준다.
-- (소유자 postgres 의 권한은 소유자라 항상 있어 적지 않음)
-- public 스키마 ACL(운영): {pg_database_owner=UC/pg_database_owner,=U/pg_database_owner,postgres=U/pg_database_owner,anon=U/pg_database_owner,authenticated=U/pg_database_owner,service_role=U/pg_database_owner,supabase_auth_admin=U/pg_database_owner}
revoke all on table public.active_sessions from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.active_sessions to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.active_sessions to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.active_sessions to service_role;
revoke all on table public.anonymous_participants from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.anonymous_participants to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.anonymous_participants to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.anonymous_participants to service_role;
revoke all on table public.app_config from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.app_config to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.app_config to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.app_config to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.app_config to supabase_auth_admin;
revoke all on table public.faqs from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.faqs to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.faqs to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.faqs to service_role;
revoke all on table public.inquiries from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.inquiries to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.inquiries to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.inquiries to service_role;
revoke all on table public.inquiry_replies from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.inquiry_replies to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.inquiry_replies to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.inquiry_replies to service_role;
revoke all on table public.instructor_profiles from public, anon, authenticated, service_role;
grant select on table public.instructor_profiles to anon;
grant insert, select, update on table public.instructor_profiles to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.instructor_profiles to service_role;
revoke all on table public.language_categories from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.language_categories to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.language_categories to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.language_categories to service_role;
revoke all on table public.language_keys from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.language_keys to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.language_keys to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.language_keys to service_role;
revoke all on table public.languages from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.languages to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.languages to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.languages to service_role;
revoke all on table public.lecture_files from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.lecture_files to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.lecture_files to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.lecture_files to service_role;
revoke all on table public.login_attempts from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.login_attempts to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.login_attempts to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.login_attempts to service_role;
revoke all on table public.login_logs from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.login_logs to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.login_logs to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.login_logs to service_role;
revoke all on table public.partner_agencies from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_agencies to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_agencies to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_agencies to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_agencies to supabase_auth_admin;
revoke all on table public.partner_instructors from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_instructors to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_instructors to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_instructors to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_instructors to supabase_auth_admin;
revoke all on table public.partner_members from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_members to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_members to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_members to service_role;
revoke all on table public.partner_organizers from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_organizers to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_organizers to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_organizers to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_organizers to supabase_auth_admin;
revoke all on table public.partner_requests from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_requests to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_requests to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_requests to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partner_requests to supabase_auth_admin;
revoke all on table public.partners from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partners to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partners to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partners to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.partners to supabase_auth_admin;
revoke all on table public.poll_options from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.poll_options to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.poll_options to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.poll_options to service_role;
revoke all on table public.poll_responses from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.poll_responses to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.poll_responses to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.poll_responses to service_role;
revoke all on table public.polls from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.polls to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.polls to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.polls to service_role;
revoke all on table public.posts from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.posts to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.posts to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.posts to service_role;
revoke all on table public.profiles from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.profiles to supabase_auth_admin;
revoke all on table public.qna_categories from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.qna_categories to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.qna_categories to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.qna_categories to service_role;
revoke all on table public.question_likes from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.question_likes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.question_likes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.question_likes to service_role;
revoke all on table public.questions from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.questions to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.questions to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.questions to service_role;
revoke all on table public.session_assets from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_assets to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_assets to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_assets to service_role;
revoke all on table public.session_cues from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_cues to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_cues to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_cues to service_role;
revoke all on table public.session_designs from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_designs to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_designs to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_designs to service_role;
revoke all on table public.session_feedback from public, anon, authenticated, service_role;
grant select on table public.session_feedback to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_feedback to service_role;
revoke all on table public.session_members from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_members to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_members to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_members to service_role;
revoke all on table public.session_partners from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_partners to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_partners to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_partners to service_role;
revoke all on table public.session_presenters from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_presenters to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_presenters to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_presenters to service_role;
revoke all on table public.session_template_fields from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_template_fields to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_template_fields to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_template_fields to service_role;
revoke all on table public.session_templates from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_templates to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_templates to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.session_templates to service_role;
revoke all on table public.sessions from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.sessions to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.sessions to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.sessions to service_role;
revoke all on table public.translations from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.translations to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.translations to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.translations to service_role;
revoke all on table public.user_theme_settings from public, anon, authenticated, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.user_theme_settings to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.user_theme_settings to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.user_theme_settings to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.user_theme_settings to supabase_auth_admin;
revoke all on sequence public.posts_id_seq from public, anon, authenticated, service_role;
grant select, update, usage on sequence public.posts_id_seq to anon;
grant select, update, usage on sequence public.posts_id_seq to authenticated;
grant select, update, usage on sequence public.posts_id_seq to service_role;
revoke all on function public._seed_trans(p_key text, p_cat_id uuid, p_ko text, p_en text) from public, anon, authenticated, service_role;
grant execute on function public._seed_trans(p_key text, p_cat_id uuid, p_ko text, p_en text) to anon;
grant execute on function public._seed_trans(p_key text, p_cat_id uuid, p_ko text, p_en text) to authenticated;
grant execute on function public._seed_trans(p_key text, p_cat_id uuid, p_ko text, p_en text) to public;
grant execute on function public._seed_trans(p_key text, p_cat_id uuid, p_ko text, p_en text) to service_role;
revoke all on function public.accept_partner_invite(p_token text) from public, anon, authenticated, service_role;
grant execute on function public.accept_partner_invite(p_token text) to anon;
grant execute on function public.accept_partner_invite(p_token text) to authenticated;
grant execute on function public.accept_partner_invite(p_token text) to public;
grant execute on function public.accept_partner_invite(p_token text) to service_role;
revoke all on function public.add_partner_owner_on_approval() from public, anon, authenticated, service_role;
grant execute on function public.add_partner_owner_on_approval() to anon;
grant execute on function public.add_partner_owner_on_approval() to authenticated;
grant execute on function public.add_partner_owner_on_approval() to public;
grant execute on function public.add_partner_owner_on_approval() to service_role;
revoke all on function public.add_session_owner() from public, anon, authenticated, service_role;
grant execute on function public.add_session_owner() to anon;
grant execute on function public.add_session_owner() to authenticated;
grant execute on function public.add_session_owner() to public;
grant execute on function public.add_session_owner() to service_role;
revoke all on function public.bump_cues_rev() from public, anon, authenticated, service_role;
grant execute on function public.bump_cues_rev() to anon;
grant execute on function public.bump_cues_rev() to authenticated;
grant execute on function public.bump_cues_rev() to public;
grant execute on function public.bump_cues_rev() to service_role;
revoke all on function public.bump_qna_rev() from public, anon, authenticated, service_role;
grant execute on function public.bump_qna_rev() to anon;
grant execute on function public.bump_qna_rev() to authenticated;
grant execute on function public.bump_qna_rev() to public;
grant execute on function public.bump_qna_rev() to service_role;
revoke all on function public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid) to anon;
grant execute on function public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid) to authenticated;
grant execute on function public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid) to public;
grant execute on function public.check_partner_collaboration_compatibility(p_session_id uuid, p_target_partner_id uuid) to service_role;
revoke all on function public.check_question_liked(p_question_id uuid, p_device_id text) from public, anon, authenticated, service_role;
grant execute on function public.check_question_liked(p_question_id uuid, p_device_id text) to anon;
grant execute on function public.check_question_liked(p_question_id uuid, p_device_id text) to authenticated;
grant execute on function public.check_question_liked(p_question_id uuid, p_device_id text) to public;
grant execute on function public.check_question_liked(p_question_id uuid, p_device_id text) to service_role;
revoke all on function public.cleanup_old_sessions() from public, anon, authenticated, service_role;
grant execute on function public.cleanup_old_sessions() to anon;
grant execute on function public.cleanup_old_sessions() to authenticated;
grant execute on function public.cleanup_old_sessions() to public;
grant execute on function public.cleanup_old_sessions() to service_role;
revoke all on function public.custom_access_token_hook(event jsonb) from public, anon, authenticated, service_role;
grant execute on function public.custom_access_token_hook(event jsonb) to service_role;
grant execute on function public.custom_access_token_hook(event jsonb) to supabase_auth_admin;
revoke all on function public.decrement_participant_count(session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.decrement_participant_count(session_id uuid) to anon;
grant execute on function public.decrement_participant_count(session_id uuid) to authenticated;
grant execute on function public.decrement_participant_count(session_id uuid) to public;
grant execute on function public.decrement_participant_count(session_id uuid) to service_role;
revoke all on function public.fn_can_manage_session(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.fn_can_manage_session(p_session_id uuid) to authenticated;
grant execute on function public.fn_can_manage_session(p_session_id uuid) to service_role;
revoke all on function public.fn_session_presenter_link_profile() from public, anon, authenticated, service_role;
grant execute on function public.fn_session_presenter_link_profile() to service_role;
revoke all on function public.generate_invite_token() from public, anon, authenticated, service_role;
grant execute on function public.generate_invite_token() to anon;
grant execute on function public.generate_invite_token() to authenticated;
grant execute on function public.generate_invite_token() to public;
grant execute on function public.generate_invite_token() to service_role;
revoke all on function public.generate_session_code() from public, anon, authenticated, service_role;
grant execute on function public.generate_session_code() to anon;
grant execute on function public.generate_session_code() to authenticated;
grant execute on function public.generate_session_code() to public;
grant execute on function public.generate_session_code() to service_role;
revoke all on function public.get_invite_by_token(p_token text) from public, anon, authenticated, service_role;
grant execute on function public.get_invite_by_token(p_token text) to anon;
grant execute on function public.get_invite_by_token(p_token text) to authenticated;
grant execute on function public.get_invite_by_token(p_token text) to public;
grant execute on function public.get_invite_by_token(p_token text) to service_role;
revoke all on function public.get_login_statistics(p_days integer) from public, anon, authenticated, service_role;
grant execute on function public.get_login_statistics(p_days integer) to anon;
grant execute on function public.get_login_statistics(p_days integer) to authenticated;
grant execute on function public.get_login_statistics(p_days integer) to public;
grant execute on function public.get_login_statistics(p_days integer) to service_role;
revoke all on function public.get_my_partner_id() from public, anon, authenticated, service_role;
grant execute on function public.get_my_partner_id() to anon;
grant execute on function public.get_my_partner_id() to authenticated;
grant execute on function public.get_my_partner_id() to public;
grant execute on function public.get_my_partner_id() to service_role;
revoke all on function public.get_translations(lang_code text) from public, anon, authenticated, service_role;
grant execute on function public.get_translations(lang_code text) to anon;
grant execute on function public.get_translations(lang_code text) to authenticated;
grant execute on function public.get_translations(lang_code text) to public;
grant execute on function public.get_translations(lang_code text) to service_role;
revoke all on function public.get_user_language() from public, anon, authenticated, service_role;
grant execute on function public.get_user_language() to anon;
grant execute on function public.get_user_language() to authenticated;
grant execute on function public.get_user_language() to public;
grant execute on function public.get_user_language() to service_role;
revoke all on function public.handle_new_session() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_session() to anon;
grant execute on function public.handle_new_session() to authenticated;
grant execute on function public.handle_new_session() to public;
grant execute on function public.handle_new_session() to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to anon;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_user() to public;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_new_user() to supabase_auth_admin;
revoke all on function public.handle_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.handle_updated_at() to anon;
grant execute on function public.handle_updated_at() to authenticated;
grant execute on function public.handle_updated_at() to public;
grant execute on function public.handle_updated_at() to service_role;
grant execute on function public.handle_updated_at() to supabase_auth_admin;
revoke all on function public.increment_participant_count(session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.increment_participant_count(session_id uuid) to anon;
grant execute on function public.increment_participant_count(session_id uuid) to authenticated;
grant execute on function public.increment_participant_count(session_id uuid) to public;
grant execute on function public.increment_participant_count(session_id uuid) to service_role;
revoke all on function public.increment_poll_option_votes(option_id_input uuid) from public, anon, authenticated, service_role;
grant execute on function public.increment_poll_option_votes(option_id_input uuid) to anon;
grant execute on function public.increment_poll_option_votes(option_id_input uuid) to authenticated;
grant execute on function public.increment_poll_option_votes(option_id_input uuid) to public;
grant execute on function public.increment_poll_option_votes(option_id_input uuid) to service_role;
revoke all on function public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid) to anon;
grant execute on function public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid) to authenticated;
grant execute on function public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid) to public;
grant execute on function public.invite_partner_to_session(p_session_id uuid, p_partner_id uuid) to service_role;
revoke all on function public.is_partner_admin_or_owner(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_partner_admin_or_owner(p_partner_id uuid) to anon;
grant execute on function public.is_partner_admin_or_owner(p_partner_id uuid) to authenticated;
grant execute on function public.is_partner_admin_or_owner(p_partner_id uuid) to public;
grant execute on function public.is_partner_admin_or_owner(p_partner_id uuid) to service_role;
revoke all on function public.is_partner_member(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_partner_member(p_partner_id uuid) to anon;
grant execute on function public.is_partner_member(p_partner_id uuid) to authenticated;
grant execute on function public.is_partner_member(p_partner_id uuid) to public;
grant execute on function public.is_partner_member(p_partner_id uuid) to service_role;
revoke all on function public.is_partner_owner(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_partner_owner(p_partner_id uuid) to anon;
grant execute on function public.is_partner_owner(p_partner_id uuid) to authenticated;
grant execute on function public.is_partner_owner(p_partner_id uuid) to public;
grant execute on function public.is_partner_owner(p_partner_id uuid) to service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.set_updated_at() to anon;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_at() to public;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.set_updated_at() to supabase_auth_admin;
revoke all on function public.sp_admin_active_sessions_q() from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_active_sessions_q() to anon;
grant execute on function public.sp_admin_active_sessions_q() to authenticated;
grant execute on function public.sp_admin_active_sessions_q() to public;
grant execute on function public.sp_admin_active_sessions_q() to service_role;
revoke all on function public.sp_admin_dashboard_q() from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_dashboard_q() to anon;
grant execute on function public.sp_admin_dashboard_q() to authenticated;
grant execute on function public.sp_admin_dashboard_q() to public;
grant execute on function public.sp_admin_dashboard_q() to service_role;
revoke all on function public.sp_admin_faq_d(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_faq_d(p_id uuid) to anon;
grant execute on function public.sp_admin_faq_d(p_id uuid) to authenticated;
grant execute on function public.sp_admin_faq_d(p_id uuid) to public;
grant execute on function public.sp_admin_faq_d(p_id uuid) to service_role;
revoke all on function public.sp_admin_faq_reorder_s(p_orders json) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_faq_reorder_s(p_orders json) to anon;
grant execute on function public.sp_admin_faq_reorder_s(p_orders json) to authenticated;
grant execute on function public.sp_admin_faq_reorder_s(p_orders json) to public;
grant execute on function public.sp_admin_faq_reorder_s(p_orders json) to service_role;
revoke all on function public.sp_admin_faq_s(p_id uuid, p_category text, p_question text, p_answer text, p_is_active boolean, p_display_order integer, p_created_by uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_faq_s(p_id uuid, p_category text, p_question text, p_answer text, p_is_active boolean, p_display_order integer, p_created_by uuid) to anon;
grant execute on function public.sp_admin_faq_s(p_id uuid, p_category text, p_question text, p_answer text, p_is_active boolean, p_display_order integer, p_created_by uuid) to authenticated;
grant execute on function public.sp_admin_faq_s(p_id uuid, p_category text, p_question text, p_answer text, p_is_active boolean, p_display_order integer, p_created_by uuid) to public;
grant execute on function public.sp_admin_faq_s(p_id uuid, p_category text, p_question text, p_answer text, p_is_active boolean, p_display_order integer, p_created_by uuid) to service_role;
revoke all on function public.sp_admin_faq_toggle_s(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_faq_toggle_s(p_id uuid) to anon;
grant execute on function public.sp_admin_faq_toggle_s(p_id uuid) to authenticated;
grant execute on function public.sp_admin_faq_toggle_s(p_id uuid) to public;
grant execute on function public.sp_admin_faq_toggle_s(p_id uuid) to service_role;
revoke all on function public.sp_admin_faqs_q(p_category text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_faqs_q(p_category text) to anon;
grant execute on function public.sp_admin_faqs_q(p_category text) to authenticated;
grant execute on function public.sp_admin_faqs_q(p_category text) to public;
grant execute on function public.sp_admin_faqs_q(p_category text) to service_role;
revoke all on function public.sp_admin_force_logout_s(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_force_logout_s(p_session_id uuid) to anon;
grant execute on function public.sp_admin_force_logout_s(p_session_id uuid) to authenticated;
grant execute on function public.sp_admin_force_logout_s(p_session_id uuid) to public;
grant execute on function public.sp_admin_force_logout_s(p_session_id uuid) to service_role;
revoke all on function public.sp_admin_inquiries_q(p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_inquiries_q(p_status text) to anon;
grant execute on function public.sp_admin_inquiries_q(p_status text) to authenticated;
grant execute on function public.sp_admin_inquiries_q(p_status text) to public;
grant execute on function public.sp_admin_inquiries_q(p_status text) to service_role;
revoke all on function public.sp_admin_inquiry_replies_q(p_inquiry_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_inquiry_replies_q(p_inquiry_id uuid) to anon;
grant execute on function public.sp_admin_inquiry_replies_q(p_inquiry_id uuid) to authenticated;
grant execute on function public.sp_admin_inquiry_replies_q(p_inquiry_id uuid) to public;
grant execute on function public.sp_admin_inquiry_replies_q(p_inquiry_id uuid) to service_role;
revoke all on function public.sp_admin_inquiry_reply_s(p_inquiry_id uuid, p_user_id uuid, p_content text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_inquiry_reply_s(p_inquiry_id uuid, p_user_id uuid, p_content text) to anon;
grant execute on function public.sp_admin_inquiry_reply_s(p_inquiry_id uuid, p_user_id uuid, p_content text) to authenticated;
grant execute on function public.sp_admin_inquiry_reply_s(p_inquiry_id uuid, p_user_id uuid, p_content text) to public;
grant execute on function public.sp_admin_inquiry_reply_s(p_inquiry_id uuid, p_user_id uuid, p_content text) to service_role;
revoke all on function public.sp_admin_inquiry_status_s(p_inquiry_id uuid, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_inquiry_status_s(p_inquiry_id uuid, p_status text) to anon;
grant execute on function public.sp_admin_inquiry_status_s(p_inquiry_id uuid, p_status text) to authenticated;
grant execute on function public.sp_admin_inquiry_status_s(p_inquiry_id uuid, p_status text) to public;
grant execute on function public.sp_admin_inquiry_status_s(p_inquiry_id uuid, p_status text) to service_role;
revoke all on function public.sp_admin_langpack_init_q() from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_langpack_init_q() to anon;
grant execute on function public.sp_admin_langpack_init_q() to authenticated;
grant execute on function public.sp_admin_langpack_init_q() to public;
grant execute on function public.sp_admin_langpack_init_q() to service_role;
revoke all on function public.sp_admin_langpack_key_d(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_langpack_key_d(p_id uuid) to anon;
grant execute on function public.sp_admin_langpack_key_d(p_id uuid) to authenticated;
grant execute on function public.sp_admin_langpack_key_d(p_id uuid) to public;
grant execute on function public.sp_admin_langpack_key_d(p_id uuid) to service_role;
revoke all on function public.sp_admin_langpack_key_s(p_id uuid, p_key text, p_category_id uuid, p_description text, p_translations jsonb) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_langpack_key_s(p_id uuid, p_key text, p_category_id uuid, p_description text, p_translations jsonb) to anon;
grant execute on function public.sp_admin_langpack_key_s(p_id uuid, p_key text, p_category_id uuid, p_description text, p_translations jsonb) to authenticated;
grant execute on function public.sp_admin_langpack_key_s(p_id uuid, p_key text, p_category_id uuid, p_description text, p_translations jsonb) to public;
grant execute on function public.sp_admin_langpack_key_s(p_id uuid, p_key text, p_category_id uuid, p_description text, p_translations jsonb) to service_role;
revoke all on function public.sp_admin_langpack_keys_q(p_category_id uuid, p_search text, p_page integer, p_page_size integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_langpack_keys_q(p_category_id uuid, p_search text, p_page integer, p_page_size integer) to anon;
grant execute on function public.sp_admin_langpack_keys_q(p_category_id uuid, p_search text, p_page integer, p_page_size integer) to authenticated;
grant execute on function public.sp_admin_langpack_keys_q(p_category_id uuid, p_search text, p_page integer, p_page_size integer) to public;
grant execute on function public.sp_admin_langpack_keys_q(p_category_id uuid, p_search text, p_page integer, p_page_size integer) to service_role;
revoke all on function public.sp_admin_langpack_translation_s(p_key_id uuid, p_language_code text, p_value text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_langpack_translation_s(p_key_id uuid, p_language_code text, p_value text) to anon;
grant execute on function public.sp_admin_langpack_translation_s(p_key_id uuid, p_language_code text, p_value text) to authenticated;
grant execute on function public.sp_admin_langpack_translation_s(p_key_id uuid, p_language_code text, p_value text) to public;
grant execute on function public.sp_admin_langpack_translation_s(p_key_id uuid, p_language_code text, p_value text) to service_role;
revoke all on function public.sp_admin_login_logs_q(p_page integer, p_page_size integer, p_event_type text, p_days integer, p_search_email text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_login_logs_q(p_page integer, p_page_size integer, p_event_type text, p_days integer, p_search_email text) to anon;
grant execute on function public.sp_admin_login_logs_q(p_page integer, p_page_size integer, p_event_type text, p_days integer, p_search_email text) to authenticated;
grant execute on function public.sp_admin_login_logs_q(p_page integer, p_page_size integer, p_event_type text, p_days integer, p_search_email text) to public;
grant execute on function public.sp_admin_login_logs_q(p_page integer, p_page_size integer, p_event_type text, p_days integer, p_search_email text) to service_role;
revoke all on function public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid) to anon;
grant execute on function public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid) to authenticated;
grant execute on function public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid) to public;
grant execute on function public.sp_admin_partner_approve_s(p_request_id uuid, p_reviewer_id uuid) to service_role;
revoke all on function public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text) to anon;
grant execute on function public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text) to authenticated;
grant execute on function public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text) to public;
grant execute on function public.sp_admin_partner_reject_s(p_request_id uuid, p_reviewer_id uuid, p_reason text) to service_role;
revoke all on function public.sp_admin_partner_requests_q(p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_partner_requests_q(p_status text) to anon;
grant execute on function public.sp_admin_partner_requests_q(p_status text) to authenticated;
grant execute on function public.sp_admin_partner_requests_q(p_status text) to public;
grant execute on function public.sp_admin_partner_requests_q(p_status text) to service_role;
revoke all on function public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean) to anon;
grant execute on function public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean) to authenticated;
grant execute on function public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean) to public;
grant execute on function public.sp_admin_partner_toggle_s(p_partner_id uuid, p_activate boolean) to service_role;
revoke all on function public.sp_admin_partners_q(p_type text, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_partners_q(p_type text, p_status text) to anon;
grant execute on function public.sp_admin_partners_q(p_type text, p_status text) to authenticated;
grant execute on function public.sp_admin_partners_q(p_type text, p_status text) to public;
grant execute on function public.sp_admin_partners_q(p_type text, p_status text) to service_role;
revoke all on function public.sp_admin_sessions_q(p_status text, p_partner_id uuid, p_search text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_sessions_q(p_status text, p_partner_id uuid, p_search text) to anon;
grant execute on function public.sp_admin_sessions_q(p_status text, p_partner_id uuid, p_search text) to authenticated;
grant execute on function public.sp_admin_sessions_q(p_status text, p_partner_id uuid, p_search text) to public;
grant execute on function public.sp_admin_sessions_q(p_status text, p_partner_id uuid, p_search text) to service_role;
revoke all on function public.sp_admin_template_d(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_template_d(p_id uuid) to anon;
grant execute on function public.sp_admin_template_d(p_id uuid) to authenticated;
grant execute on function public.sp_admin_template_d(p_id uuid) to public;
grant execute on function public.sp_admin_template_d(p_id uuid) to service_role;
revoke all on function public.sp_admin_template_field_d(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_template_field_d(p_id uuid) to anon;
grant execute on function public.sp_admin_template_field_d(p_id uuid) to authenticated;
grant execute on function public.sp_admin_template_field_d(p_id uuid) to public;
grant execute on function public.sp_admin_template_field_d(p_id uuid) to service_role;
revoke all on function public.sp_admin_template_field_s(p_id uuid, p_template_id uuid, p_field_key text, p_field_name text, p_field_type text, p_is_required boolean, p_max_width integer, p_description text, p_sort_order integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_template_field_s(p_id uuid, p_template_id uuid, p_field_key text, p_field_name text, p_field_type text, p_is_required boolean, p_max_width integer, p_description text, p_sort_order integer) to anon;
grant execute on function public.sp_admin_template_field_s(p_id uuid, p_template_id uuid, p_field_key text, p_field_name text, p_field_type text, p_is_required boolean, p_max_width integer, p_description text, p_sort_order integer) to authenticated;
grant execute on function public.sp_admin_template_field_s(p_id uuid, p_template_id uuid, p_field_key text, p_field_name text, p_field_type text, p_is_required boolean, p_max_width integer, p_description text, p_sort_order integer) to public;
grant execute on function public.sp_admin_template_field_s(p_id uuid, p_template_id uuid, p_field_key text, p_field_name text, p_field_type text, p_is_required boolean, p_max_width integer, p_description text, p_sort_order integer) to service_role;
revoke all on function public.sp_admin_template_fields_q(p_template_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_template_fields_q(p_template_id uuid) to anon;
grant execute on function public.sp_admin_template_fields_q(p_template_id uuid) to authenticated;
grant execute on function public.sp_admin_template_fields_q(p_template_id uuid) to public;
grant execute on function public.sp_admin_template_fields_q(p_template_id uuid) to service_role;
revoke all on function public.sp_admin_template_s(p_id uuid, p_name text, p_code text, p_description text, p_screen_type text, p_is_active boolean, p_sort_order integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_template_s(p_id uuid, p_name text, p_code text, p_description text, p_screen_type text, p_is_active boolean, p_sort_order integer) to anon;
grant execute on function public.sp_admin_template_s(p_id uuid, p_name text, p_code text, p_description text, p_screen_type text, p_is_active boolean, p_sort_order integer) to authenticated;
grant execute on function public.sp_admin_template_s(p_id uuid, p_name text, p_code text, p_description text, p_screen_type text, p_is_active boolean, p_sort_order integer) to public;
grant execute on function public.sp_admin_template_s(p_id uuid, p_name text, p_code text, p_description text, p_screen_type text, p_is_active boolean, p_sort_order integer) to service_role;
revoke all on function public.sp_admin_template_toggle_s(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_template_toggle_s(p_id uuid) to anon;
grant execute on function public.sp_admin_template_toggle_s(p_id uuid) to authenticated;
grant execute on function public.sp_admin_template_toggle_s(p_id uuid) to public;
grant execute on function public.sp_admin_template_toggle_s(p_id uuid) to service_role;
revoke all on function public.sp_admin_templates_q(p_screen_type text) from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_templates_q(p_screen_type text) to anon;
grant execute on function public.sp_admin_templates_q(p_screen_type text) to authenticated;
grant execute on function public.sp_admin_templates_q(p_screen_type text) to public;
grant execute on function public.sp_admin_templates_q(p_screen_type text) to service_role;
revoke all on function public.sp_admin_users_q() from public, anon, authenticated, service_role;
grant execute on function public.sp_admin_users_q() to anon;
grant execute on function public.sp_admin_users_q() to authenticated;
grant execute on function public.sp_admin_users_q() to public;
grant execute on function public.sp_admin_users_q() to service_role;
revoke all on function public.sp_can_control_session(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_can_control_session(p_session_id uuid) to anon;
grant execute on function public.sp_can_control_session(p_session_id uuid) to authenticated;
grant execute on function public.sp_can_control_session(p_session_id uuid) to public;
grant execute on function public.sp_can_control_session(p_session_id uuid) to service_role;
revoke all on function public.sp_check_admin_initialized_q() from public, anon, authenticated, service_role;
grant execute on function public.sp_check_admin_initialized_q() to anon;
grant execute on function public.sp_check_admin_initialized_q() to authenticated;
grant execute on function public.sp_check_admin_initialized_q() to public;
grant execute on function public.sp_check_admin_initialized_q() to service_role;
revoke all on function public.sp_init_q(p_user_id uuid, p_language_code text) from public, anon, authenticated, service_role;
grant execute on function public.sp_init_q(p_user_id uuid, p_language_code text) to anon;
grant execute on function public.sp_init_q(p_user_id uuid, p_language_code text) to authenticated;
grant execute on function public.sp_init_q(p_user_id uuid, p_language_code text) to public;
grant execute on function public.sp_init_q(p_user_id uuid, p_language_code text) to service_role;
revoke all on function public.sp_instructor_profile_q(p_profile_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_instructor_profile_q(p_profile_id uuid) to anon;
grant execute on function public.sp_instructor_profile_q(p_profile_id uuid) to authenticated;
grant execute on function public.sp_instructor_profile_q(p_profile_id uuid) to service_role;
revoke all on function public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text) from public, anon, authenticated, service_role;
grant execute on function public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text) to anon;
grant execute on function public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text) to authenticated;
grant execute on function public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text) to public;
grant execute on function public.sp_join_session_anon_s(p_session_id uuid, p_name text, p_email text, p_phone text) to service_role;
revoke all on function public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid) to anon;
grant execute on function public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid) to authenticated;
grant execute on function public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid) to public;
grant execute on function public.sp_join_session_auth_s(p_session_id uuid, p_user_id uuid) to service_role;
revoke all on function public.sp_join_session_q(p_code text, p_user_id uuid, p_is_preview boolean) from public, anon, authenticated, service_role;
grant execute on function public.sp_join_session_q(p_code text, p_user_id uuid, p_is_preview boolean) to anon;
grant execute on function public.sp_join_session_q(p_code text, p_user_id uuid, p_is_preview boolean) to authenticated;
grant execute on function public.sp_join_session_q(p_code text, p_user_id uuid, p_is_preview boolean) to public;
grant execute on function public.sp_join_session_q(p_code text, p_user_id uuid, p_is_preview boolean) to service_role;
revoke all on function public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid) to anon;
grant execute on function public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid) to authenticated;
grant execute on function public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid) to public;
grant execute on function public.sp_leave_session_auth_s(p_session_id uuid, p_user_id uuid) to service_role;
revoke all on function public.sp_live_broadcast_q(p_code text) from public, anon, authenticated, service_role;
grant execute on function public.sp_live_broadcast_q(p_code text) to anon;
grant execute on function public.sp_live_broadcast_q(p_code text) to authenticated;
grant execute on function public.sp_live_broadcast_q(p_code text) to public;
grant execute on function public.sp_live_broadcast_q(p_code text) to service_role;
revoke all on function public.sp_live_design_q(p_code text) from public, anon, authenticated, service_role;
grant execute on function public.sp_live_design_q(p_code text) to anon;
grant execute on function public.sp_live_design_q(p_code text) to authenticated;
grant execute on function public.sp_live_design_q(p_code text) to public;
grant execute on function public.sp_live_design_q(p_code text) to service_role;
revoke all on function public.sp_live_feedback_s(p_code text, p_key text, p_rating integer, p_comment text) from public, anon, authenticated, service_role;
grant execute on function public.sp_live_feedback_s(p_code text, p_key text, p_rating integer, p_comment text) to anon;
grant execute on function public.sp_live_feedback_s(p_code text, p_key text, p_rating integer, p_comment text) to authenticated;
grant execute on function public.sp_live_feedback_s(p_code text, p_key text, p_rating integer, p_comment text) to service_role;
revoke all on function public.sp_live_qna_q(p_code text, p_token text, p_limit integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_live_qna_q(p_code text, p_token text, p_limit integer) to anon;
grant execute on function public.sp_live_qna_q(p_code text, p_token text, p_limit integer) to authenticated;
grant execute on function public.sp_live_qna_q(p_code text, p_token text, p_limit integer) to public;
grant execute on function public.sp_live_qna_q(p_code text, p_token text, p_limit integer) to service_role;
revoke all on function public.sp_live_state_q(p_code text, p_cues_rev bigint) from public, anon, authenticated, service_role;
grant execute on function public.sp_live_state_q(p_code text, p_cues_rev bigint) to anon;
grant execute on function public.sp_live_state_q(p_code text, p_cues_rev bigint) to authenticated;
grant execute on function public.sp_live_state_q(p_code text, p_cues_rev bigint) to public;
grant execute on function public.sp_live_state_q(p_code text, p_cues_rev bigint) to service_role;
revoke all on function public.sp_login_attempt_c(p_email text, p_ip_address text) from public, anon, authenticated, service_role;
grant execute on function public.sp_login_attempt_c(p_email text, p_ip_address text) to anon;
grant execute on function public.sp_login_attempt_c(p_email text, p_ip_address text) to authenticated;
grant execute on function public.sp_login_attempt_c(p_email text, p_ip_address text) to public;
grant execute on function public.sp_login_attempt_c(p_email text, p_ip_address text) to service_role;
revoke all on function public.sp_login_attempt_clear_s(p_email text, p_ip_address text) from public, anon, authenticated, service_role;
grant execute on function public.sp_login_attempt_clear_s(p_email text, p_ip_address text) to anon;
grant execute on function public.sp_login_attempt_clear_s(p_email text, p_ip_address text) to authenticated;
grant execute on function public.sp_login_attempt_clear_s(p_email text, p_ip_address text) to public;
grant execute on function public.sp_login_attempt_clear_s(p_email text, p_ip_address text) to service_role;
revoke all on function public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text, p_ip_address text, p_user_agent text, p_device_info jsonb, p_session_id text) from public, anon, authenticated, service_role;
grant execute on function public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text, p_ip_address text, p_user_agent text, p_device_info jsonb, p_session_id text) to anon;
grant execute on function public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text, p_ip_address text, p_user_agent text, p_device_info jsonb, p_session_id text) to authenticated;
grant execute on function public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text, p_ip_address text, p_user_agent text, p_device_info jsonb, p_session_id text) to public;
grant execute on function public.sp_login_event_s(p_email text, p_event_type text, p_failure_reason text, p_ip_address text, p_user_agent text, p_device_info jsonb, p_session_id text) to service_role;
revoke all on function public.sp_login_failure_s(p_email text, p_ip_address text) from public, anon, authenticated, service_role;
grant execute on function public.sp_login_failure_s(p_email text, p_ip_address text) to anon;
grant execute on function public.sp_login_failure_s(p_email text, p_ip_address text) to authenticated;
grant execute on function public.sp_login_failure_s(p_email text, p_ip_address text) to public;
grant execute on function public.sp_login_failure_s(p_email text, p_ip_address text) to service_role;
revoke all on function public.sp_partner_apply_s(p_partner_type text, p_representative_name text, p_company_name text, p_phone text, p_purpose text, p_business_number text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_apply_s(p_partner_type text, p_representative_name text, p_company_name text, p_phone text, p_purpose text, p_business_number text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) to authenticated;
grant execute on function public.sp_partner_apply_s(p_partner_type text, p_representative_name text, p_company_name text, p_phone text, p_purpose text, p_business_number text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) to service_role;
revoke all on function public.sp_partner_broadcast_mode_s(p_session_id uuid, p_mode text, p_pdf_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_broadcast_mode_s(p_session_id uuid, p_mode text, p_pdf_id uuid) to anon;
grant execute on function public.sp_partner_broadcast_mode_s(p_session_id uuid, p_mode text, p_pdf_id uuid) to authenticated;
grant execute on function public.sp_partner_broadcast_mode_s(p_session_id uuid, p_mode text, p_pdf_id uuid) to public;
grant execute on function public.sp_partner_broadcast_mode_s(p_session_id uuid, p_mode text, p_pdf_id uuid) to service_role;
revoke all on function public.sp_partner_broadcast_settings_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_broadcast_settings_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_broadcast_settings_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_broadcast_settings_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_broadcast_settings_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_broadcast_settings_s(p_session_id uuid, p_settings jsonb) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_broadcast_settings_s(p_session_id uuid, p_settings jsonb) to anon;
grant execute on function public.sp_partner_broadcast_settings_s(p_session_id uuid, p_settings jsonb) to authenticated;
grant execute on function public.sp_partner_broadcast_settings_s(p_session_id uuid, p_settings jsonb) to public;
grant execute on function public.sp_partner_broadcast_settings_s(p_session_id uuid, p_settings jsonb) to service_role;
revoke all on function public.sp_partner_broadcast_state_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_broadcast_state_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_broadcast_state_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_broadcast_state_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_broadcast_state_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_collaboration_q(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_collaboration_q(p_partner_id uuid) to anon;
grant execute on function public.sp_partner_collaboration_q(p_partner_id uuid) to authenticated;
grant execute on function public.sp_partner_collaboration_q(p_partner_id uuid) to public;
grant execute on function public.sp_partner_collaboration_q(p_partner_id uuid) to service_role;
revoke all on function public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid) to anon;
grant execute on function public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid) to authenticated;
grant execute on function public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid) to public;
grant execute on function public.sp_partner_collaboration_q(p_session_id uuid, p_partner_id uuid) to service_role;
revoke all on function public.sp_partner_cue_broadcast_s(p_session_id uuid, p_cue_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_cue_broadcast_s(p_session_id uuid, p_cue_id uuid) to anon;
grant execute on function public.sp_partner_cue_broadcast_s(p_session_id uuid, p_cue_id uuid) to authenticated;
grant execute on function public.sp_partner_cue_broadcast_s(p_session_id uuid, p_cue_id uuid) to public;
grant execute on function public.sp_partner_cue_broadcast_s(p_session_id uuid, p_cue_id uuid) to service_role;
revoke all on function public.sp_partner_cue_s(p_action text, p_session_id uuid, p_cue_id uuid, p_presenter_id uuid, p_cue_type text, p_title text, p_lecture_file_id uuid, p_start_page integer, p_poll_id uuid, p_qna_category_id uuid, p_notice_text text, p_display_order integer, p_orders jsonb, p_set_schedule boolean, p_planned_start_at timestamp with time zone, p_duration_min integer, p_is_public boolean, p_public_title text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_cue_s(p_action text, p_session_id uuid, p_cue_id uuid, p_presenter_id uuid, p_cue_type text, p_title text, p_lecture_file_id uuid, p_start_page integer, p_poll_id uuid, p_qna_category_id uuid, p_notice_text text, p_display_order integer, p_orders jsonb, p_set_schedule boolean, p_planned_start_at timestamp with time zone, p_duration_min integer, p_is_public boolean, p_public_title text) to anon;
grant execute on function public.sp_partner_cue_s(p_action text, p_session_id uuid, p_cue_id uuid, p_presenter_id uuid, p_cue_type text, p_title text, p_lecture_file_id uuid, p_start_page integer, p_poll_id uuid, p_qna_category_id uuid, p_notice_text text, p_display_order integer, p_orders jsonb, p_set_schedule boolean, p_planned_start_at timestamp with time zone, p_duration_min integer, p_is_public boolean, p_public_title text) to authenticated;
grant execute on function public.sp_partner_cue_s(p_action text, p_session_id uuid, p_cue_id uuid, p_presenter_id uuid, p_cue_type text, p_title text, p_lecture_file_id uuid, p_start_page integer, p_poll_id uuid, p_qna_category_id uuid, p_notice_text text, p_display_order integer, p_orders jsonb, p_set_schedule boolean, p_planned_start_at timestamp with time zone, p_duration_min integer, p_is_public boolean, p_public_title text) to public;
grant execute on function public.sp_partner_cue_s(p_action text, p_session_id uuid, p_cue_id uuid, p_presenter_id uuid, p_cue_type text, p_title text, p_lecture_file_id uuid, p_start_page integer, p_poll_id uuid, p_qna_category_id uuid, p_notice_text text, p_display_order integer, p_orders jsonb, p_set_schedule boolean, p_planned_start_at timestamp with time zone, p_duration_min integer, p_is_public boolean, p_public_title text) to service_role;
revoke all on function public.sp_partner_cues_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_cues_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_cues_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_cues_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_cues_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_dashboard_q(p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_dashboard_q(p_user_id uuid) to anon;
grant execute on function public.sp_partner_dashboard_q(p_user_id uuid) to authenticated;
grant execute on function public.sp_partner_dashboard_q(p_user_id uuid) to public;
grant execute on function public.sp_partner_dashboard_q(p_user_id uuid) to service_role;
revoke all on function public.sp_partner_design_s(p_session_id uuid, p_action text, p_design jsonb, p_version integer, p_history_index integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_design_s(p_session_id uuid, p_action text, p_design jsonb, p_version integer, p_history_index integer) to anon;
grant execute on function public.sp_partner_design_s(p_session_id uuid, p_action text, p_design jsonb, p_version integer, p_history_index integer) to authenticated;
grant execute on function public.sp_partner_design_s(p_session_id uuid, p_action text, p_design jsonb, p_version integer, p_history_index integer) to public;
grant execute on function public.sp_partner_design_s(p_session_id uuid, p_action text, p_design jsonb, p_version integer, p_history_index integer) to service_role;
revoke all on function public.sp_partner_faqs_q(p_category text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_faqs_q(p_category text) to anon;
grant execute on function public.sp_partner_faqs_q(p_category text) to authenticated;
grant execute on function public.sp_partner_faqs_q(p_category text) to public;
grant execute on function public.sp_partner_faqs_q(p_category text) to service_role;
revoke all on function public.sp_partner_info_q(p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_info_q(p_user_id uuid) to anon;
grant execute on function public.sp_partner_info_q(p_user_id uuid) to authenticated;
grant execute on function public.sp_partner_info_q(p_user_id uuid) to public;
grant execute on function public.sp_partner_info_q(p_user_id uuid) to service_role;
revoke all on function public.sp_partner_inquiries_q(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_inquiries_q(p_partner_id uuid) to anon;
grant execute on function public.sp_partner_inquiries_q(p_partner_id uuid) to authenticated;
grant execute on function public.sp_partner_inquiries_q(p_partner_id uuid) to public;
grant execute on function public.sp_partner_inquiries_q(p_partner_id uuid) to service_role;
revoke all on function public.sp_partner_inquiry_replies_q(p_inquiry_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_inquiry_replies_q(p_inquiry_id uuid) to anon;
grant execute on function public.sp_partner_inquiry_replies_q(p_inquiry_id uuid) to authenticated;
grant execute on function public.sp_partner_inquiry_replies_q(p_inquiry_id uuid) to public;
grant execute on function public.sp_partner_inquiry_replies_q(p_inquiry_id uuid) to service_role;
revoke all on function public.sp_partner_inquiry_s(p_action text, p_partner_id uuid, p_category text, p_title text, p_content text, p_inquiry_id uuid, p_user_id uuid, p_is_admin boolean) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_inquiry_s(p_action text, p_partner_id uuid, p_category text, p_title text, p_content text, p_inquiry_id uuid, p_user_id uuid, p_is_admin boolean) to anon;
grant execute on function public.sp_partner_inquiry_s(p_action text, p_partner_id uuid, p_category text, p_title text, p_content text, p_inquiry_id uuid, p_user_id uuid, p_is_admin boolean) to authenticated;
grant execute on function public.sp_partner_inquiry_s(p_action text, p_partner_id uuid, p_category text, p_title text, p_content text, p_inquiry_id uuid, p_user_id uuid, p_is_admin boolean) to public;
grant execute on function public.sp_partner_inquiry_s(p_action text, p_partner_id uuid, p_category text, p_title text, p_content text, p_inquiry_id uuid, p_user_id uuid, p_is_admin boolean) to service_role;
revoke all on function public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text) to anon;
grant execute on function public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text) to authenticated;
grant execute on function public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text) to public;
grant execute on function public.sp_partner_invitation_respond_s(p_invite_id uuid, p_accept boolean, p_reject_reason text) to service_role;
revoke all on function public.sp_partner_invitations_q(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_invitations_q(p_partner_id uuid) to anon;
grant execute on function public.sp_partner_invitations_q(p_partner_id uuid) to authenticated;
grant execute on function public.sp_partner_invitations_q(p_partner_id uuid) to public;
grant execute on function public.sp_partner_invitations_q(p_partner_id uuid) to service_role;
revoke all on function public.sp_partner_lecture_s(p_action text, p_session_id uuid, p_lecture_id uuid, p_title text, p_file_url text, p_file_path text, p_page_count integer, p_file_size bigint, p_display_order integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_lecture_s(p_action text, p_session_id uuid, p_lecture_id uuid, p_title text, p_file_url text, p_file_path text, p_page_count integer, p_file_size bigint, p_display_order integer) to anon;
grant execute on function public.sp_partner_lecture_s(p_action text, p_session_id uuid, p_lecture_id uuid, p_title text, p_file_url text, p_file_path text, p_page_count integer, p_file_size bigint, p_display_order integer) to authenticated;
grant execute on function public.sp_partner_lecture_s(p_action text, p_session_id uuid, p_lecture_id uuid, p_title text, p_file_url text, p_file_path text, p_page_count integer, p_file_size bigint, p_display_order integer) to public;
grant execute on function public.sp_partner_lecture_s(p_action text, p_session_id uuid, p_lecture_id uuid, p_title text, p_file_url text, p_file_path text, p_page_count integer, p_file_size bigint, p_display_order integer) to service_role;
revoke all on function public.sp_partner_lectures_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_lectures_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_lectures_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_lectures_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_lectures_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_participants_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_participants_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_participants_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_participants_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_participants_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_pdf_page_s(p_session_id uuid, p_page integer) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_pdf_page_s(p_session_id uuid, p_page integer) to anon;
grant execute on function public.sp_partner_pdf_page_s(p_session_id uuid, p_page integer) to authenticated;
grant execute on function public.sp_partner_pdf_page_s(p_session_id uuid, p_page integer) to public;
grant execute on function public.sp_partner_pdf_page_s(p_session_id uuid, p_page integer) to service_role;
revoke all on function public.sp_partner_poll_delete_s(p_poll_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_poll_delete_s(p_poll_id uuid) to anon;
grant execute on function public.sp_partner_poll_delete_s(p_poll_id uuid) to authenticated;
grant execute on function public.sp_partner_poll_delete_s(p_poll_id uuid) to public;
grant execute on function public.sp_partner_poll_delete_s(p_poll_id uuid) to service_role;
revoke all on function public.sp_partner_poll_results_q(p_poll_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_poll_results_q(p_poll_id uuid) to anon;
grant execute on function public.sp_partner_poll_results_q(p_poll_id uuid) to authenticated;
grant execute on function public.sp_partner_poll_results_q(p_poll_id uuid) to public;
grant execute on function public.sp_partner_poll_results_q(p_poll_id uuid) to service_role;
revoke all on function public.sp_partner_poll_s(p_poll_id uuid, p_session_id uuid, p_question text, p_poll_type text, p_options jsonb, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_poll_s(p_poll_id uuid, p_session_id uuid, p_question text, p_poll_type text, p_options jsonb, p_status text) to anon;
grant execute on function public.sp_partner_poll_s(p_poll_id uuid, p_session_id uuid, p_question text, p_poll_type text, p_options jsonb, p_status text) to authenticated;
grant execute on function public.sp_partner_poll_s(p_poll_id uuid, p_session_id uuid, p_question text, p_poll_type text, p_options jsonb, p_status text) to public;
grant execute on function public.sp_partner_poll_s(p_poll_id uuid, p_session_id uuid, p_question text, p_poll_type text, p_options jsonb, p_status text) to service_role;
revoke all on function public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text) to anon;
grant execute on function public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text) to authenticated;
grant execute on function public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text) to public;
grant execute on function public.sp_partner_poll_toggle_s(p_poll_id uuid, p_status text) to service_role;
revoke all on function public.sp_partner_polls_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_polls_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_polls_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_polls_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_polls_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_profile_s(p_partner_id uuid, p_partner_type text, p_representative_name text, p_phone text, p_company_name text, p_business_number text, p_address text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_profile_s(p_partner_id uuid, p_partner_type text, p_representative_name text, p_phone text, p_company_name text, p_business_number text, p_address text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) to anon;
grant execute on function public.sp_partner_profile_s(p_partner_id uuid, p_partner_type text, p_representative_name text, p_phone text, p_company_name text, p_business_number text, p_address text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) to authenticated;
grant execute on function public.sp_partner_profile_s(p_partner_id uuid, p_partner_type text, p_representative_name text, p_phone text, p_company_name text, p_business_number text, p_address text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) to public;
grant execute on function public.sp_partner_profile_s(p_partner_id uuid, p_partner_type text, p_representative_name text, p_phone text, p_company_name text, p_business_number text, p_address text, p_industry text, p_expected_scale text, p_client_type text, p_display_name text, p_specialty text, p_bio text) to service_role;
revoke all on function public.sp_partner_qna_broadcast_s(p_question_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_broadcast_s(p_question_id uuid) to anon;
grant execute on function public.sp_partner_qna_broadcast_s(p_question_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_broadcast_s(p_question_id uuid) to public;
grant execute on function public.sp_partner_qna_broadcast_s(p_question_id uuid) to service_role;
revoke all on function public.sp_partner_qna_categories_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_categories_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_qna_categories_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_categories_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_qna_categories_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_qna_category_s(p_action text, p_session_id uuid, p_category_id uuid, p_name text, p_color text, p_display_order integer, p_is_visible boolean) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_category_s(p_action text, p_session_id uuid, p_category_id uuid, p_name text, p_color text, p_display_order integer, p_is_visible boolean) to anon;
grant execute on function public.sp_partner_qna_category_s(p_action text, p_session_id uuid, p_category_id uuid, p_name text, p_color text, p_display_order integer, p_is_visible boolean) to authenticated;
grant execute on function public.sp_partner_qna_category_s(p_action text, p_session_id uuid, p_category_id uuid, p_name text, p_color text, p_display_order integer, p_is_visible boolean) to public;
grant execute on function public.sp_partner_qna_category_s(p_action text, p_session_id uuid, p_category_id uuid, p_name text, p_color text, p_display_order integer, p_is_visible boolean) to service_role;
revoke all on function public.sp_partner_qna_delete_s(p_question_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_delete_s(p_question_id uuid) to anon;
grant execute on function public.sp_partner_qna_delete_s(p_question_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_delete_s(p_question_id uuid) to public;
grant execute on function public.sp_partner_qna_delete_s(p_question_id uuid) to service_role;
revoke all on function public.sp_partner_qna_presenters_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_presenters_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_qna_presenters_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_presenters_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_qna_presenters_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_qna_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_qna_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_qna_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_qna_s(p_question_id uuid, p_session_id uuid, p_content text, p_author_name text, p_is_anonymous boolean, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_s(p_question_id uuid, p_session_id uuid, p_content text, p_author_name text, p_is_anonymous boolean, p_status text) to anon;
grant execute on function public.sp_partner_qna_s(p_question_id uuid, p_session_id uuid, p_content text, p_author_name text, p_is_anonymous boolean, p_status text) to authenticated;
grant execute on function public.sp_partner_qna_s(p_question_id uuid, p_session_id uuid, p_content text, p_author_name text, p_is_anonymous boolean, p_status text) to public;
grant execute on function public.sp_partner_qna_s(p_question_id uuid, p_session_id uuid, p_content text, p_author_name text, p_is_anonymous boolean, p_status text) to service_role;
revoke all on function public.sp_partner_qna_set_category_s(p_question_id uuid, p_category_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_set_category_s(p_question_id uuid, p_category_id uuid) to anon;
grant execute on function public.sp_partner_qna_set_category_s(p_question_id uuid, p_category_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_set_category_s(p_question_id uuid, p_category_id uuid) to public;
grant execute on function public.sp_partner_qna_set_category_s(p_question_id uuid, p_category_id uuid) to service_role;
revoke all on function public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text, p_answered_by uuid, p_status text, p_is_pinned boolean, p_is_highlighted boolean, p_is_displayed boolean, p_presenter_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text, p_answered_by uuid, p_status text, p_is_pinned boolean, p_is_highlighted boolean, p_is_displayed boolean, p_presenter_id uuid) to anon;
grant execute on function public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text, p_answered_by uuid, p_status text, p_is_pinned boolean, p_is_highlighted boolean, p_is_displayed boolean, p_presenter_id uuid) to authenticated;
grant execute on function public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text, p_answered_by uuid, p_status text, p_is_pinned boolean, p_is_highlighted boolean, p_is_displayed boolean, p_presenter_id uuid) to public;
grant execute on function public.sp_partner_qna_update_s(p_action text, p_question_id uuid, p_answer text, p_answered_by uuid, p_status text, p_is_pinned boolean, p_is_highlighted boolean, p_is_displayed boolean, p_presenter_id uuid) to service_role;
revoke all on function public.sp_partner_search_q(p_partner_type text, p_exclude_partner_id uuid, p_search_query text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_search_q(p_partner_type text, p_exclude_partner_id uuid, p_search_query text) to anon;
grant execute on function public.sp_partner_search_q(p_partner_type text, p_exclude_partner_id uuid, p_search_query text) to authenticated;
grant execute on function public.sp_partner_search_q(p_partner_type text, p_exclude_partner_id uuid, p_search_query text) to public;
grant execute on function public.sp_partner_search_q(p_partner_type text, p_exclude_partner_id uuid, p_search_query text) to service_role;
revoke all on function public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text, p_url text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text, p_url text) to anon;
grant execute on function public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text, p_url text) to authenticated;
grant execute on function public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text, p_url text) to public;
grant execute on function public.sp_partner_session_asset_s(p_action text, p_session_id uuid, p_field_key text, p_value text, p_url text) to service_role;
revoke all on function public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid) to anon;
grant execute on function public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid) to authenticated;
grant execute on function public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid) to public;
grant execute on function public.sp_partner_session_basic_s(p_session_id uuid, p_title text, p_venue_name text, p_venue_address text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_contact_phone text, p_contact_email text, p_max_participants integer, p_description text, p_template_id uuid, p_qna_template_id uuid, p_poll_template_id uuid) to service_role;
revoke all on function public.sp_partner_session_complete_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_complete_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_session_complete_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_session_complete_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_session_complete_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_session_create_q() from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_create_q() to anon;
grant execute on function public.sp_partner_session_create_q() to authenticated;
grant execute on function public.sp_partner_session_create_q() to public;
grant execute on function public.sp_partner_session_create_q() to service_role;
revoke all on function public.sp_partner_session_detail_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_detail_q(p_session_id uuid) to anon;
grant execute on function public.sp_partner_session_detail_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_session_detail_q(p_session_id uuid) to public;
grant execute on function public.sp_partner_session_detail_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_session_duplicate_s(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_duplicate_s(p_session_id uuid) to anon;
grant execute on function public.sp_partner_session_duplicate_s(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_session_duplicate_s(p_session_id uuid) to public;
grant execute on function public.sp_partner_session_duplicate_s(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_session_feedback_q(p_session_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_feedback_q(p_session_id uuid) to authenticated;
grant execute on function public.sp_partner_session_feedback_q(p_session_id uuid) to service_role;
revoke all on function public.sp_partner_session_status_s(p_session_id uuid, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_status_s(p_session_id uuid, p_status text) to anon;
grant execute on function public.sp_partner_session_status_s(p_session_id uuid, p_status text) to authenticated;
grant execute on function public.sp_partner_session_status_s(p_session_id uuid, p_status text) to public;
grant execute on function public.sp_partner_session_status_s(p_session_id uuid, p_status text) to service_role;
revoke all on function public.sp_partner_session_survey_s(p_session_id uuid, p_enabled boolean) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_session_survey_s(p_session_id uuid, p_enabled boolean) to authenticated;
grant execute on function public.sp_partner_session_survey_s(p_session_id uuid, p_enabled boolean) to service_role;
revoke all on function public.sp_partner_sessions_q(p_partner_id uuid, p_status text, p_search text) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_sessions_q(p_partner_id uuid, p_status text, p_search text) to anon;
grant execute on function public.sp_partner_sessions_q(p_partner_id uuid, p_status text, p_search text) to authenticated;
grant execute on function public.sp_partner_sessions_q(p_partner_id uuid, p_status text, p_search text) to public;
grant execute on function public.sp_partner_sessions_q(p_partner_id uuid, p_status text, p_search text) to service_role;
revoke all on function public.sp_partner_team_q(p_partner_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_partner_team_q(p_partner_id uuid) to anon;
grant execute on function public.sp_partner_team_q(p_partner_id uuid) to authenticated;
grant execute on function public.sp_partner_team_q(p_partner_id uuid) to public;
grant execute on function public.sp_partner_team_q(p_partner_id uuid) to service_role;
revoke all on function public.sp_pending_invites_c(p_email text) from public, anon, authenticated, service_role;
grant execute on function public.sp_pending_invites_c(p_email text) to anon;
grant execute on function public.sp_pending_invites_c(p_email text) to authenticated;
grant execute on function public.sp_pending_invites_c(p_email text) to public;
grant execute on function public.sp_pending_invites_c(p_email text) to service_role;
revoke all on function public.sp_profile_q(p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_profile_q(p_user_id uuid) to anon;
grant execute on function public.sp_profile_q(p_user_id uuid) to authenticated;
grant execute on function public.sp_profile_q(p_user_id uuid) to public;
grant execute on function public.sp_profile_q(p_user_id uuid) to service_role;
revoke all on function public.sp_profile_s(p_user_id uuid, p_display_name text) from public, anon, authenticated, service_role;
grant execute on function public.sp_profile_s(p_user_id uuid, p_display_name text) to anon;
grant execute on function public.sp_profile_s(p_user_id uuid, p_display_name text) to authenticated;
grant execute on function public.sp_profile_s(p_user_id uuid, p_display_name text) to public;
grant execute on function public.sp_profile_s(p_user_id uuid, p_display_name text) to service_role;
revoke all on function public.sp_template_fields_q(p_template_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_template_fields_q(p_template_id uuid) to anon;
grant execute on function public.sp_template_fields_q(p_template_id uuid) to authenticated;
grant execute on function public.sp_template_fields_q(p_template_id uuid) to public;
grant execute on function public.sp_template_fields_q(p_template_id uuid) to service_role;
revoke all on function public.sp_theme_q(p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_theme_q(p_user_id uuid) to anon;
grant execute on function public.sp_theme_q(p_user_id uuid) to authenticated;
grant execute on function public.sp_theme_q(p_user_id uuid) to public;
grant execute on function public.sp_theme_q(p_user_id uuid) to service_role;
revoke all on function public.sp_theme_s(p_user_id uuid, p_mode text, p_preset text, p_custom_colors json, p_font_size text) from public, anon, authenticated, service_role;
grant execute on function public.sp_theme_s(p_user_id uuid, p_mode text, p_preset text, p_custom_colors json, p_font_size text) to anon;
grant execute on function public.sp_theme_s(p_user_id uuid, p_mode text, p_preset text, p_custom_colors json, p_font_size text) to authenticated;
grant execute on function public.sp_theme_s(p_user_id uuid, p_mode text, p_preset text, p_custom_colors json, p_font_size text) to public;
grant execute on function public.sp_theme_s(p_user_id uuid, p_mode text, p_preset text, p_custom_colors json, p_font_size text) to service_role;
revoke all on function public.sp_user_language_q(p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.sp_user_language_q(p_user_id uuid) to anon;
grant execute on function public.sp_user_language_q(p_user_id uuid) to authenticated;
grant execute on function public.sp_user_language_q(p_user_id uuid) to public;
grant execute on function public.sp_user_language_q(p_user_id uuid) to service_role;
revoke all on function public.sp_user_language_s(p_user_id uuid, p_language_code text) from public, anon, authenticated, service_role;
grant execute on function public.sp_user_language_s(p_user_id uuid, p_language_code text) to anon;
grant execute on function public.sp_user_language_s(p_user_id uuid, p_language_code text) to authenticated;
grant execute on function public.sp_user_language_s(p_user_id uuid, p_language_code text) to public;
grant execute on function public.sp_user_language_s(p_user_id uuid, p_language_code text) to service_role;
revoke all on function public.sp_user_session_activity_s(p_session_token text) from public, anon, authenticated, service_role;
grant execute on function public.sp_user_session_activity_s(p_session_token text) to anon;
grant execute on function public.sp_user_session_activity_s(p_session_token text) to authenticated;
grant execute on function public.sp_user_session_activity_s(p_session_token text) to public;
grant execute on function public.sp_user_session_activity_s(p_session_token text) to service_role;
revoke all on function public.sp_user_session_end_s(p_session_token text) from public, anon, authenticated, service_role;
grant execute on function public.sp_user_session_end_s(p_session_token text) to anon;
grant execute on function public.sp_user_session_end_s(p_session_token text) to authenticated;
grant execute on function public.sp_user_session_end_s(p_session_token text) to public;
grant execute on function public.sp_user_session_end_s(p_session_token text) to service_role;
revoke all on function public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text, p_user_agent text, p_device_info jsonb) from public, anon, authenticated, service_role;
grant execute on function public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text, p_user_agent text, p_device_info jsonb) to anon;
grant execute on function public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text, p_user_agent text, p_device_info jsonb) to authenticated;
grant execute on function public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text, p_user_agent text, p_device_info jsonb) to public;
grant execute on function public.sp_user_session_register_s(p_user_id uuid, p_session_token text, p_ip_address text, p_user_agent text, p_device_info jsonb) to service_role;
revoke all on function public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[], p_response_text text, p_anonymous_id text) from public, anon, authenticated, service_role;
grant execute on function public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[], p_response_text text, p_anonymous_id text) to anon;
grant execute on function public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[], p_response_text text, p_anonymous_id text) to authenticated;
grant execute on function public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[], p_response_text text, p_anonymous_id text) to public;
grant execute on function public.submit_poll_response(p_poll_id uuid, p_option_ids uuid[], p_response_text text, p_anonymous_id text) to service_role;
revoke all on function public.toggle_question_like(p_question_id uuid, p_device_id text) from public, anon, authenticated, service_role;
grant execute on function public.toggle_question_like(p_question_id uuid, p_device_id text) to anon;
grant execute on function public.toggle_question_like(p_question_id uuid, p_device_id text) to authenticated;
grant execute on function public.toggle_question_like(p_question_id uuid, p_device_id text) to public;
grant execute on function public.toggle_question_like(p_question_id uuid, p_device_id text) to service_role;
revoke all on function public.update_poll_status(p_poll_id uuid, p_status text) from public, anon, authenticated, service_role;
grant execute on function public.update_poll_status(p_poll_id uuid, p_status text) to anon;
grant execute on function public.update_poll_status(p_poll_id uuid, p_status text) to authenticated;
grant execute on function public.update_poll_status(p_poll_id uuid, p_status text) to public;
grant execute on function public.update_poll_status(p_poll_id uuid, p_status text) to service_role;
revoke all on function public.update_question_likes_count() from public, anon, authenticated, service_role;
grant execute on function public.update_question_likes_count() to anon;
grant execute on function public.update_question_likes_count() to authenticated;
grant execute on function public.update_question_likes_count() to public;
grant execute on function public.update_question_likes_count() to service_role;
revoke all on function public.update_user_language(lang_code text) from public, anon, authenticated, service_role;
grant execute on function public.update_user_language(lang_code text) to anon;
grant execute on function public.update_user_language(lang_code text) to authenticated;
grant execute on function public.update_user_language(lang_code text) to public;
grant execute on function public.update_user_language(lang_code text) to service_role;

-- 기본 권한(운영 pg_default_acl, 참고용 — Supabase 가 프로젝트 생성 때 기본으로 걸어 주므로 적용하지 않음)
--   role=postgres schema=public type=S acl={postgres=rwU/postgres,anon=rwU/postgres,authenticated=rwU/postgres,service_role=rwU/postgres}
--   role=postgres schema=public type=f acl={postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   role=postgres schema=public type=r acl={postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}
--   role=supabase_admin schema=public type=S acl={postgres=rwU/supabase_admin,anon=rwU/supabase_admin,authenticated=rwU/supabase_admin,service_role=rwU/supabase_admin}
--   role=supabase_admin schema=public type=f acl={postgres=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}
--   role=supabase_admin schema=public type=r acl={postgres=arwdDxtm/supabase_admin,anon=arwdDxtm/supabase_admin,authenticated=arwdDxtm/supabase_admin,service_role=arwdDxtm/supabase_admin}
