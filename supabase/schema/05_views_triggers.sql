-- 05 뷰·트리거
-- LivePulse 운영 DB(pfrdyviyzilhjarnmcec) 스키마 덤프 — 자동 생성(supabase/schema/dump.mjs). 직접 고치지 말고 다시 덤프한다.
-- 데이터는 없음(storage.buckets 메타 행 제외).

-- 뷰 없음

-- 앱 테이블 트리거
CREATE TRIGGER handle_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_language_categories_updated BEFORE UPDATE ON language_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER on_language_keys_updated BEFORE UPDATE ON language_keys FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER on_languages_updated BEFORE UPDATE ON languages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_lecture_files_updated_at BEFORE UPDATE ON lecture_files FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_partner_agencies_updated BEFORE UPDATE ON partner_agencies FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_partner_instructors_updated BEFORE UPDATE ON partner_instructors FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_partner_members_updated_at BEFORE UPDATE ON partner_members FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_partner_organizers_updated BEFORE UPDATE ON partner_organizers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_partner_requests_updated BEFORE UPDATE ON partner_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER add_owner_after_partner_created AFTER INSERT ON partners FOR EACH ROW EXECUTE FUNCTION add_partner_owner_on_approval();
CREATE TRIGGER on_partners_updated BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_polls_updated_at BEFORE UPDATE ON polls FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER update_likes_count_on_delete AFTER DELETE ON question_likes FOR EACH ROW EXECUTE FUNCTION update_question_likes_count();
CREATE TRIGGER update_likes_count_on_insert AFTER INSERT ON question_likes FOR EACH ROW EXECUTE FUNCTION update_question_likes_count();
CREATE TRIGGER set_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_bump_qna_rev AFTER INSERT OR DELETE OR UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION bump_qna_rev();
CREATE TRIGGER set_session_assets_updated_at BEFORE UPDATE ON session_assets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_session_cues_updated_at BEFORE UPDATE ON session_cues FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_bump_cues_rev AFTER INSERT OR DELETE OR UPDATE ON session_cues FOR EACH ROW EXECUTE FUNCTION bump_cues_rev();
CREATE TRIGGER set_session_partners_updated_at BEFORE UPDATE ON session_partners FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_session_presenters_updated_at BEFORE UPDATE ON session_presenters FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_session_templates_updated_at BEFORE UPDATE ON session_templates FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER after_session_insert AFTER INSERT ON sessions FOR EACH ROW EXECUTE FUNCTION add_session_owner();
CREATE TRIGGER before_session_insert BEFORE INSERT ON sessions FOR EACH ROW EXECUTE FUNCTION handle_new_session();
CREATE TRIGGER set_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_translations_updated BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER on_user_theme_settings_updated BEFORE UPDATE ON user_theme_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
