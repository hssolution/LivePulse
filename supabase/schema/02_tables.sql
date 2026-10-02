-- 02 시퀀스·테이블(컬럼·기본값·NOT NULL·identity)
-- LivePulse 운영 DB(pfrdyviyzilhjarnmcec) 스키마 덤프 — 자동 생성(supabase/schema/dump.mjs). 직접 고치지 말고 다시 덤프한다.
-- 데이터는 없음(storage.buckets 메타 행 제외).

create table public.active_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  session_token text not null,
  ip_address text,
  user_agent text,
  device_info jsonb default '{}'::jsonb,
  last_activity_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table public.anonymous_participants (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamp with time zone default now()
);

create table public.app_config (
  key text not null,
  value text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.faqs (
  id uuid default gen_random_uuid() not null,
  category text default 'common'::text not null,
  question text not null,
  answer text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.inquiries (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  category text default 'general'::text not null,
  title text not null,
  content text not null,
  status text default 'pending'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.inquiry_replies (
  id uuid default gen_random_uuid() not null,
  inquiry_id uuid not null,
  user_id uuid not null,
  content text not null,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

create table public.instructor_profiles (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  partner_id uuid,
  display_name text not null,
  title text,
  bio text,
  image_url text,
  created_by uuid,
  is_public boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.language_categories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  description text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.language_keys (
  id uuid default gen_random_uuid() not null,
  key text not null,
  category_id uuid,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.languages (
  code text not null,
  name text not null,
  native_name text not null,
  is_default boolean default false not null,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.lecture_files (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  presenter_id uuid,
  title text not null,
  file_url text not null,
  file_path text,
  page_count integer default 0,
  file_size bigint,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  allow_download boolean default false not null,
  pages_path text
);

create table public.login_attempts (
  id uuid default gen_random_uuid() not null,
  email text not null,
  ip_address text not null,
  attempt_count integer default 1,
  first_attempt_at timestamp with time zone default now(),
  last_attempt_at timestamp with time zone default now(),
  locked_until timestamp with time zone
);

create table public.login_logs (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  email text not null,
  event_type text not null,
  failure_reason text,
  ip_address text,
  user_agent text,
  device_info jsonb default '{}'::jsonb,
  session_id text,
  created_at timestamp with time zone default now()
);

create table public.partner_agencies (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  company_name text not null,
  business_number text not null,
  industry text,
  client_type text,
  expected_scale text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.partner_instructors (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  display_name text,
  specialty text,
  bio text,
  profile_image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.partner_members (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  user_id uuid,
  email text not null,
  role text default 'member'::text,
  status text default 'pending'::text,
  invite_token text,
  invited_at timestamp with time zone default now(),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.partner_organizers (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  company_name text not null,
  business_number text,
  industry text,
  expected_scale text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.partner_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  partner_type text default 'organizer'::text not null,
  representative_name text not null,
  phone text not null,
  purpose text not null,
  company_name text,
  business_number text,
  status text default 'pending'::text not null,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  reject_reason text,
  industry text,
  expected_scale text,
  client_type text,
  display_name text,
  specialty text,
  bio text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.partners (
  id uuid default gen_random_uuid() not null,
  profile_id uuid not null,
  partner_type text default 'organizer'::text not null,
  representative_name text not null,
  phone text not null,
  purpose text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.poll_options (
  id uuid default gen_random_uuid() not null,
  poll_id uuid not null,
  option_text text not null,
  display_order integer default 0,
  created_at timestamp with time zone default now()
);

create table public.poll_responses (
  id uuid default gen_random_uuid() not null,
  poll_id uuid not null,
  option_id uuid,
  user_id uuid,
  anonymous_id text,
  response_text text,
  created_at timestamp with time zone default now()
);

create table public.polls (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  template_id uuid,
  question text not null,
  poll_type text default 'single'::text,
  is_required boolean default false,
  status text default 'draft'::text,
  display_order integer default 0,
  show_results boolean default false,
  allow_anonymous boolean default true,
  max_selections integer,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.posts (
  id bigint generated always as identity not null,
  title text not null,
  content text default ''::text not null,
  author text default '익명'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.profiles (
  id uuid not null,
  email text,
  display_name text,
  user_role text default 'user'::text not null,
  user_type text default 'user'::text not null,
  status text default 'active'::text not null,
  description text,
  preferred_language text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.qna_categories (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  name text not null,
  color text default '#4f46e5'::text,
  display_order integer default 0,
  is_visible boolean default true,
  created_at timestamp with time zone default now()
);

create table public.question_likes (
  id uuid default gen_random_uuid() not null,
  question_id uuid not null,
  user_id uuid,
  device_id text,
  created_at timestamp with time zone default now()
);

create table public.questions (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  presenter_id uuid,
  template_id uuid,
  content text not null,
  author_name text,
  author_id uuid,
  is_anonymous boolean default false,
  status text default 'pending'::text,
  is_pinned boolean default false,
  is_highlighted boolean default false,
  is_displayed boolean default false,
  is_broadcasting boolean default false,
  created_by_manager boolean default false,
  display_order integer default 0,
  likes_count integer default 0,
  answer text,
  answered_by uuid,
  answered_at timestamp with time zone,
  moderated_by uuid,
  moderated_at timestamp with time zone,
  reject_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  category_id uuid,
  participant_token text
);

create table public.session_assets (
  id uuid default gen_random_uuid() not null,
  session_id uuid,
  field_key text not null,
  value text,
  url text,
  open_new_tab boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.session_cues (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  presenter_id uuid,
  cue_type text not null,
  title text,
  lecture_file_id uuid,
  start_page integer default 1,
  poll_id uuid,
  qna_category_id uuid,
  notice_text text,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  planned_start_at timestamp with time zone,
  duration_min integer,
  is_public boolean default true not null,
  public_title text
);

create table public.session_designs (
  session_id uuid not null,
  draft jsonb,
  published jsonb,
  version integer default 0 not null,
  history jsonb default '[]'::jsonb not null,
  published_at timestamp with time zone,
  updated_at timestamp with time zone default now() not null
);

create table public.session_feedback (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  respondent_key text not null,
  rating smallint not null,
  comment text,
  created_at timestamp with time zone default now() not null
);

create table public.session_members (
  id uuid default gen_random_uuid() not null,
  session_id uuid,
  user_id uuid,
  role text default 'viewer'::text not null,
  assigned_by uuid,
  assigned_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table public.session_partners (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  partner_id uuid not null,
  status text default 'pending'::text,
  invited_by uuid,
  invited_at timestamp with time zone default now(),
  responded_at timestamp with time zone,
  reject_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.session_presenters (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  presenter_type text not null,
  user_id uuid,
  partner_id uuid,
  manual_name text,
  manual_title text,
  manual_bio text,
  manual_image text,
  display_name text,
  display_title text,
  display_order integer default 0,
  status text default 'confirmed'::text,
  invited_at timestamp with time zone default now(),
  responded_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  instructor_profile_id uuid
);

create table public.session_template_fields (
  id uuid default gen_random_uuid() not null,
  template_id uuid,
  field_key text not null,
  field_name text not null,
  field_type text default 'image'::text not null,
  is_required boolean default false,
  max_width integer,
  description text,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table public.session_templates (
  id uuid default gen_random_uuid() not null,
  name text not null,
  code text not null,
  description text,
  preview_image text,
  screen_type text default 'main'::text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.sessions (
  id uuid default gen_random_uuid() not null,
  partner_id uuid,
  template_id uuid,
  qna_template_id uuid,
  poll_template_id uuid,
  title text not null,
  venue_name text not null,
  venue_address text,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  contact_phone text not null,
  contact_email text not null,
  max_participants integer default 100 not null,
  code text not null,
  description text,
  status text default 'draft'::text,
  participant_count integer default 0,
  published_at timestamp with time zone,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  broadcast_settings jsonb default '{"width": 0, "fontSize": 150, "fontColor": "#c0392b", "textAlign": "center", "borderColor": "", "verticalAlign": "center", "backgroundColor": "#ffffff", "innerBackgroundColor": ""}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  broadcast_mode text default 'idle'::text,
  broadcast_pdf_id uuid,
  broadcast_pdf_page integer default 1,
  current_cue_id uuid,
  broadcast_notice text,
  qna_rev bigint default 0 not null,
  cues_rev bigint default 0 not null,
  current_cue_fired_at timestamp with time zone,
  broadcast_changed_at timestamp with time zone,
  max_page integer default 1 not null,
  audience_settings jsonb default '{}'::jsonb not null,
  survey_enabled boolean default true not null
);

create table public.translations (
  id uuid default gen_random_uuid() not null,
  key_id uuid not null,
  language_code text not null,
  value text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.user_theme_settings (
  user_id uuid not null,
  mode text default 'light'::text not null,
  preset text default 'theme-d'::text not null,
  custom_colors jsonb,
  font_size text default 'medium'::text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on column public.active_sessions.created_at is '세션 생성 시간';
comment on column public.active_sessions.device_info is '기기 정보';
comment on column public.active_sessions.ip_address is '접속 IP 주소';
comment on column public.active_sessions.last_activity_at is '마지막 활동 시간';
comment on column public.active_sessions.session_token is '세션 토큰 (고유)';
comment on column public.active_sessions.user_agent is '브라우저 User-Agent';
comment on column public.active_sessions.user_id is '사용자 ID';
comment on column public.anonymous_participants.email is '참여자 이메일';
comment on column public.anonymous_participants.name is '참여자 이름';
comment on column public.anonymous_participants.phone is '참여자 전화번호';
comment on column public.anonymous_participants.session_id is '참여한 세션 ID';
comment on column public.app_config.key is '설정 키 (고유)';
comment on column public.app_config.value is '설정 값';
comment on column public.faqs.answer is '답변';
comment on column public.faqs.category is '카테고리 - common: 공통, organizer: 행사자, agency: 대행사, instructor: 강연자';
comment on column public.faqs.created_by is '작성자 ID';
comment on column public.faqs.display_order is '표시 순서';
comment on column public.faqs.is_active is '활성화 여부';
comment on column public.faqs.question is '질문';
comment on column public.inquiries.category is '카테고리 - general: 일반, technical: 기술, billing: 결제, etc: 기타';
comment on column public.inquiries.content is '내용';
comment on column public.inquiries.partner_id is '문의한 파트너 ID';
comment on column public.inquiries.status is '상태 - pending: 대기, in_progress: 처리중, resolved: 완료';
comment on column public.inquiries.title is '제목';
comment on column public.inquiry_replies.content is '내용';
comment on column public.inquiry_replies.inquiry_id is '문의 ID';
comment on column public.inquiry_replies.is_admin is '관리자 답변 여부';
comment on column public.inquiry_replies.user_id is '작성자 ID';
comment on column public.instructor_profiles.created_by is '만든 사람 — 계정 없는 강사(수기 등록)는 그 주최자 계정이 관리';
comment on column public.instructor_profiles.partner_id is '강사 파트너(있으면)';
comment on column public.instructor_profiles.user_id is '강사 본인 계정(있으면). 본인만 수정';
comment on column public.language_categories.description is '카테고리 설명';
comment on column public.language_categories.name is '카테고리명 (예: common, auth, admin, partner)';
comment on column public.language_categories.sort_order is '정렬 순서';
comment on column public.language_keys.category_id is '소속 카테고리 ID';
comment on column public.language_keys.description is '키 설명 - 관리자가 키의 용도 파악용';
comment on column public.language_keys.key is '점(.)으로 구분된 키 (예: common.save, auth.login)';
comment on column public.languages.code is 'ISO 639-1 언어 코드 (예: ko, en, ja)';
comment on column public.languages.is_active is '활성 상태 - false면 선택 불가';
comment on column public.languages.is_default is '기본 언어 여부 - 하나만 true여야 함';
comment on column public.languages.name is '영문 언어명 (예: Korean, English, Japanese)';
comment on column public.languages.native_name is '해당 언어로 표기한 이름 (예: 한국어, English, 日本語)';
comment on column public.languages.sort_order is '정렬 순서';
comment on column public.lecture_files.file_path is 'storage 경로 (삭제용)';
comment on column public.lecture_files.file_url is 'storage 공개 URL';
comment on column public.lecture_files.page_count is '총 페이지 수 (업로드 시 pdf.js로 추출)';
comment on column public.lecture_files.pages_path is '사전 변환 페이지 이미지 경로 prefix (P1 렌더 방식 결정, PRD §3.4)';
comment on column public.login_attempts.attempt_count is '시도 횟수';
comment on column public.login_attempts.email is '시도한 이메일';
comment on column public.login_attempts.first_attempt_at is '첫 시도 시간';
comment on column public.login_attempts.ip_address is 'IP 주소';
comment on column public.login_attempts.last_attempt_at is '마지막 시도 시간';
comment on column public.login_attempts.locked_until is '잠금 해제 시간';
comment on column public.login_logs.created_at is '이벤트 발생 시간';
comment on column public.login_logs.device_info is '기기 정보 (브라우저, OS 등)';
comment on column public.login_logs.email is '로그인 시도 이메일';
comment on column public.login_logs.event_type is '이벤트 타입 - login_success: 로그인 성공, login_failed: 로그인 실패, logout: 로그아웃, session_expired: 세션 만료, forced_logout: 강제 로그아웃';
comment on column public.login_logs.failure_reason is '실패 사유 - invalid_password: 비밀번호 오류, user_not_found: 사용자 없음, account_disabled: 계정 비활성화, too_many_attempts: 시도 횟수 초과, duplicate_login: 중복 로그인으로 인한 강제 로그아웃';
comment on column public.login_logs.ip_address is '접속 IP 주소';
comment on column public.login_logs.session_id is '세션 식별자';
comment on column public.login_logs.user_agent is '브라우저 User-Agent';
comment on column public.login_logs.user_id is '사용자 ID (로그인 실패 시 NULL 가능)';
comment on column public.partner_agencies.business_number is '사업자번호 (필수)';
comment on column public.partner_agencies.client_type is '주요 클라이언트 유형';
comment on column public.partner_agencies.company_name is '회사명 (필수)';
comment on column public.partner_agencies.expected_scale is '예상 대행 규모';
comment on column public.partner_agencies.industry is '업종/분야';
comment on column public.partner_agencies.partner_id is '파트너 ID (FK)';
comment on column public.partner_instructors.bio is '소개';
comment on column public.partner_instructors.display_name is '활동명/닉네임';
comment on column public.partner_instructors.partner_id is '파트너 ID (FK)';
comment on column public.partner_instructors.profile_image_url is '프로필 이미지 URL';
comment on column public.partner_instructors.specialty is '전문 분야';
comment on column public.partner_members.accepted_at is '수락 일시';
comment on column public.partner_members.email is '멤버 이메일 (초대 시 사용)';
comment on column public.partner_members.invite_token is '초대 토큰 - 이메일 링크로 수락 시 사용';
comment on column public.partner_members.invited_at is '초대 일시';
comment on column public.partner_members.partner_id is '소속 파트너 ID';
comment on column public.partner_members.role is '역할 - owner: 소유자, admin: 관리자, member: 일반 멤버';
comment on column public.partner_members.status is '상태 - pending: 초대 대기, accepted: 수락, rejected: 거절';
comment on column public.partner_members.user_id is '연결된 사용자 ID - 초대 수락 후 설정';
comment on column public.partner_organizers.business_number is '사업자번호 (선택)';
comment on column public.partner_organizers.company_name is '회사/단체명 (필수)';
comment on column public.partner_organizers.expected_scale is '예상 행사 규모';
comment on column public.partner_organizers.industry is '업종/분야';
comment on column public.partner_organizers.partner_id is '파트너 ID (FK)';
comment on column public.partner_requests.bio is '소개 (강사용)';
comment on column public.partner_requests.business_number is '사업자번호';
comment on column public.partner_requests.client_type is '주요 클라이언트 유형 (대행업체용)';
comment on column public.partner_requests.company_name is '회사/단체명';
comment on column public.partner_requests.display_name is '활동명/닉네임 (강사용)';
comment on column public.partner_requests.expected_scale is '예상 규모 (행사자/대행업체용)';
comment on column public.partner_requests.industry is '업종/분야 (행사자/대행업체용)';
comment on column public.partner_requests.partner_type is '파트너 유형 - organizer: 행사자, agency: 대행업체, instructor: 강사';
comment on column public.partner_requests.phone is '연락처 (필수)';
comment on column public.partner_requests.purpose is '신청 목적 (필수)';
comment on column public.partner_requests.reject_reason is '거부 사유';
comment on column public.partner_requests.representative_name is '대표자명 (필수)';
comment on column public.partner_requests.reviewed_at is '검토 일시';
comment on column public.partner_requests.reviewed_by is '검토자 관리자 ID';
comment on column public.partner_requests.specialty is '전문 분야 (강사용)';
comment on column public.partner_requests.status is '상태 - pending: 대기, approved: 승인, rejected: 거부';
comment on column public.partner_requests.user_id is '신청자 사용자 ID';
comment on column public.partners.is_active is '활성 상태 - false시 비활성화 (데이터 유지)';
comment on column public.partners.partner_type is '파트너 유형 - organizer: 행사자, agency: 대행업체, instructor: 강사';
comment on column public.partners.phone is '연락처';
comment on column public.partners.profile_id is '연결된 사용자 프로필 ID (1:1)';
comment on column public.partners.purpose is '활동 목적';
comment on column public.partners.representative_name is '대표자명';
comment on column public.poll_options.display_order is '표시 순서';
comment on column public.poll_options.option_text is '보기 텍스트';
comment on column public.poll_options.poll_id is '설문 ID';
comment on column public.poll_responses.anonymous_id is '익명 ID - 비로그인 사용자 식별용 (device fingerprint 등)';
comment on column public.poll_responses.option_id is '선택한 보기 ID (single/multiple 타입) - null이면 주관식 응답';
comment on column public.poll_responses.poll_id is '설문 ID';
comment on column public.poll_responses.response_text is '주관식 응답 텍스트 - open 타입에서 사용';
comment on column public.poll_responses.user_id is '응답자 사용자 ID (로그인 사용자)';
comment on column public.polls.allow_anonymous is '익명 응답 허용 여부';
comment on column public.polls.display_order is '표시 순서';
comment on column public.polls.ended_at is '설문 종료 일시';
comment on column public.polls.is_required is '필수 응답 여부';
comment on column public.polls.max_selections is '최대 선택 수 - multiple 타입에서 선택 가능한 최대 개수 (null이면 무제한)';
comment on column public.polls.poll_type is '설문 유형 - single: 단일선택(Radio), multiple: 복수선택(Checkbox), open: 주관식';
comment on column public.polls.question is '설문 질문 내용';
comment on column public.polls.session_id is '세션 ID';
comment on column public.polls.show_results is '결과 공개 여부 - true면 청중에게 결과 표시';
comment on column public.polls.started_at is '설문 시작 일시';
comment on column public.polls.status is '상태 - draft: 초안, active: 진행중, closed: 종료';
comment on column public.polls.template_id is '송출 템플릿 ID - 화면 스타일';
comment on column public.profiles.description is '사용자 소개/설명';
comment on column public.profiles.display_name is '표시 이름 - 세션 및 협업 시 사용되는 이름';
comment on column public.profiles.email is '이메일 주소';
comment on column public.profiles.id is '사용자 ID - auth.users.id와 동일';
comment on column public.profiles.preferred_language is '선호 언어 코드 (null이면 브라우저 언어 사용)';
comment on column public.profiles.status is '상태 - active: 활성, suspended: 정지';
comment on column public.profiles.user_role is '역할 - user: 일반 사용자, admin: 관리자';
comment on column public.profiles.user_type is '유형 - user: 일반, partner: 파트너, admin: 관리자';
comment on column public.qna_categories.is_visible is '청중 화면 노출 여부 - 좌장이 토글';
comment on column public.question_likes.device_id is '디바이스 ID - 비로그인 사용자 식별용';
comment on column public.question_likes.question_id is '질문 ID';
comment on column public.question_likes.user_id is '좋아요 누른 사용자 ID (로그인 사용자)';
comment on column public.questions.answer is '답변 내용';
comment on column public.questions.answered_at is '답변 일시';
comment on column public.questions.answered_by is '답변자 사용자 ID';
comment on column public.questions.author_id is '작성자 사용자 ID (로그인 사용자)';
comment on column public.questions.author_name is '작성자 표시명 (익명시 null)';
comment on column public.questions.category_id is '질문 카테고리 - 청중 필터/좌장 노출 제어';
comment on column public.questions.content is '질문 내용';
comment on column public.questions.created_by_manager is '관리자가 직접 등록한 질문 여부';
comment on column public.questions.display_order is '표시 순서 - 드래그 앤 드랍으로 조정';
comment on column public.questions.is_anonymous is '익명 여부';
comment on column public.questions.is_broadcasting is '송출 중 여부 - 현재 프로젝터에 표시 중';
comment on column public.questions.is_displayed is '화면 표시 여부 - 강연자 리스트에 표시할 질문';
comment on column public.questions.is_highlighted is '하이라이트 여부 - 현재 답변 중인 질문';
comment on column public.questions.is_pinned is '상단 고정 여부';
comment on column public.questions.likes_count is '좋아요 수';
comment on column public.questions.moderated_at is '검토 일시';
comment on column public.questions.moderated_by is '검토자 사용자 ID';
comment on column public.questions.participant_token is '비로그인 청중 식별 토큰 - 내 질문(검토 중) 표시용. 편의 식별자일 뿐 무결성 보장 아님';
comment on column public.questions.presenter_id is '대상 강사 ID - 특정 강사에게 질문 시 지정';
comment on column public.questions.reject_reason is '거부 사유';
comment on column public.questions.session_id is '세션 ID';
comment on column public.questions.status is '상태 - pending: 대기, approved: 승인, answered: 답변완료, hidden: 숨김, rejected: 거부';
comment on column public.questions.template_id is '송출 템플릿 ID - 화면 스타일';
comment on column public.session_assets.field_key is '필드 키 - template_fields.field_key와 매칭';
comment on column public.session_assets.open_new_tab is '새 탭에서 열기 여부';
comment on column public.session_assets.session_id is '세션 ID';
comment on column public.session_assets.url is '클릭 시 이동 URL (배너용)';
comment on column public.session_assets.value is '값 - 이미지 URL 또는 텍스트';
comment on column public.session_cues.is_public is '청중 스케줄표 노출 여부 - 신규 기본 true, 015 적용 시점 기존 행은 false 백필';
comment on column public.session_cues.planned_start_at is '계획 시작 시각(선택) - 없으면 스케줄표는 순서 목록으로 강등';
comment on column public.session_cues.public_title is '청중용 표기 이름 (null이면 title)';
comment on column public.session_members.assigned_at is '역할 부여 일시';
comment on column public.session_members.assigned_by is '역할 부여자 ID';
comment on column public.session_members.role is '역할 - owner: 소유자, admin: 관리자, moderator: 진행자, presenter: 발표자, viewer: 참관자';
comment on column public.session_members.session_id is '세션 ID';
comment on column public.session_members.user_id is '사용자 ID';
comment on column public.session_partners.invited_at is '초대 일시';
comment on column public.session_partners.invited_by is '초대자 사용자 ID';
comment on column public.session_partners.partner_id is '초대된 파트너 ID';
comment on column public.session_partners.reject_reason is '거절 사유';
comment on column public.session_partners.responded_at is '응답 일시';
comment on column public.session_partners.session_id is '세션 ID';
comment on column public.session_partners.status is '상태 - pending: 대기, accepted: 수락, rejected: 거절';
comment on column public.session_presenters.display_name is '표시 이름 (모든 타입에서 사용)';
comment on column public.session_presenters.display_order is '표시 순서';
comment on column public.session_presenters.display_title is '표시 직책';
comment on column public.session_presenters.instructor_profile_id is '이 발표자의 강사 프로필(026). 비면 트리거가 찾아 잇는다';
comment on column public.session_presenters.manual_bio is '직접 입력 소개 (manual 타입)';
comment on column public.session_presenters.manual_image is '직접 입력 프로필 이미지 URL (manual 타입)';
comment on column public.session_presenters.manual_name is '직접 입력 이름 (manual 타입)';
comment on column public.session_presenters.manual_title is '직접 입력 직책/소속 (manual 타입)';
comment on column public.session_presenters.partner_id is '파트너 ID (partner 타입)';
comment on column public.session_presenters.presenter_type is '등록 유형 - member: 팀원 지정, partner: 강사 파트너 초대, manual: 직접 입력';
comment on column public.session_presenters.session_id is '세션 ID';
comment on column public.session_presenters.status is '상태 - pending: 초대 대기, confirmed: 확정, rejected: 거절';
comment on column public.session_presenters.user_id is '사용자 ID (member 타입)';
comment on column public.session_template_fields.description is '필드 설명 - 파트너에게 안내용';
comment on column public.session_template_fields.field_key is '필드 키 (예: background_image, logo, title_banner)';
comment on column public.session_template_fields.field_name is '필드 표시명 (예: 배경 이미지, 행사 로고)';
comment on column public.session_template_fields.field_type is '필드 유형 - image: 이미지, text: 텍스트, url: URL, boolean: 토글';
comment on column public.session_template_fields.is_required is '필수 여부';
comment on column public.session_template_fields.max_width is '이미지 최대 너비 (px)';
comment on column public.session_template_fields.sort_order is '표시 순서';
comment on column public.session_template_fields.template_id is '소속 템플릿 ID';
comment on column public.session_templates.code is '템플릿 코드 - 고유 식별자 (예: symposium, conference)';
comment on column public.session_templates.description is '템플릿 설명';
comment on column public.session_templates.is_active is '활성 상태 - false면 선택 불가';
comment on column public.session_templates.name is '템플릿명 (예: 학술 심포지엄, 컨퍼런스)';
comment on column public.session_templates.preview_image is '미리보기 이미지 URL';
comment on column public.session_templates.screen_type is '화면 유형 - main: 메인화면, qna: 질문 송출, poll: 설문';
comment on column public.session_templates.sort_order is '정렬 순서';
comment on column public.sessions.audience_settings is '청중 장면 동작 설정 JSONB (Q&A 노출 정책·스케줄표 on/off·열람 모드·ui_version 등)';
comment on column public.sessions.broadcast_changed_at is '송출 상태 최종 변경 시각 - 지연 계측용';
comment on column public.sessions.broadcast_mode is '현재 송출 모드 - idle: 대기, pdf: 강연자료, qna: 질문, survey: 설문, notice: 안내';
comment on column public.sessions.broadcast_notice is 'notice 모드 송출 시 청중/송출 화면에 표시할 안내 문구';
comment on column public.sessions.broadcast_pdf_id is '현재 송출 중인 강연자료(lecture_files) ID';
comment on column public.sessions.broadcast_pdf_page is '현재 송출 중인 강연자료 페이지 번호';
comment on column public.sessions.broadcast_settings is '송출 화면 설정 - width: 너비(0=자동), fontSize: 폰트크기, fontColor: 폰트색상, backgroundColor: 배경색상, borderColor: 테두리색상, innerBackgroundColor: 테두리안배경색상, textAlign: 정렬, verticalAlign: 세로정렬';
comment on column public.sessions.code is '참여 코드 - 6자리 영숫자, 청중 입장 시 사용';
comment on column public.sessions.contact_email is '대표 문의 이메일';
comment on column public.sessions.contact_phone is '대표 문의 전화';
comment on column public.sessions.cues_rev is '공개 큐시트 버전 - 변경 시에만 일정 목록 재전송';
comment on column public.sessions.current_cue_fired_at is '현재 큐 송출 시각 - 지연 판정·±N분 표시 기준 (PRD §5)';
comment on column public.sessions.current_cue_id is '지금 송출 중인 큐(session_cues) ID - 송출 시에만 설정, 브라우징은 변경 안 함';
comment on column public.sessions.description is '세션 설명';
comment on column public.sessions.end_at is '예정 종료 일시';
comment on column public.sessions.ended_at is '실제 종료 일시';
comment on column public.sessions.max_page is '강연자료 최대 도달 페이지 - 청중 자유 열람 상한 (PRD §3.4)';
comment on column public.sessions.max_participants is '최대 참여자 수';
comment on column public.sessions.participant_count is '현재 참여자 수';
comment on column public.sessions.partner_id is '주최 파트너 ID';
comment on column public.sessions.poll_template_id is '설문 화면 템플릿 ID - null이면 메인 템플릿 사용';
comment on column public.sessions.published_at is '공개 일시';
comment on column public.sessions.qna_rev is 'Q&A 목록 버전 - 변경 시에만 청중이 목록 재조회 (likes_count 단독 변경은 제외)';
comment on column public.sessions.qna_template_id is 'Q&A 화면 템플릿 ID - null이면 메인 템플릿 사용';
comment on column public.sessions.start_at is '예정 시작 일시';
comment on column public.sessions.started_at is '실제 시작 일시';
comment on column public.sessions.status is '상태 - draft: 초안, published: 공개, active: 진행중, ended: 종료, cancelled: 취소';
comment on column public.sessions.survey_enabled is '세션이 끝나면 청중에게 만족도 설문을 띄울지(기본 켬, 주최자가 끔) (026)';
comment on column public.sessions.template_id is '메인 화면 템플릿 ID';
comment on column public.sessions.title is '세션명';
comment on column public.sessions.venue_address is '상세 주소';
comment on column public.sessions.venue_name is '장소명';
comment on column public.translations.key_id is '번역 키 ID (FK)';
comment on column public.translations.language_code is '언어 코드 (FK)';
comment on column public.translations.value is '번역된 텍스트';
comment on column public.user_theme_settings.custom_colors is '커스텀 색상 설정 (JSON)';
comment on column public.user_theme_settings.font_size is '폰트 크기 - small: 작게, medium: 보통, large: 크게';
comment on column public.user_theme_settings.mode is '테마 모드 - light: 밝은 테마, dark: 어두운 테마';
comment on column public.user_theme_settings.preset is '테마 프리셋 - theme-a ~ theme-d 중 선택';
comment on column public.user_theme_settings.user_id is '사용자 ID';
comment on table public.active_sessions is '활성 세션 관리 (중복 로그인 방지)';
comment on table public.anonymous_participants is '익명 참여자 정보 (비로그인 사용자)';
comment on table public.app_config is '시스템 설정 - 키-값 형태의 전역 설정 저장';
comment on table public.faqs is 'FAQ - 자주 묻는 질문';
comment on table public.inquiries is '1:1 문의';
comment on table public.inquiry_replies is '1:1 문의 답변/댓글';
comment on table public.instructor_profiles is '강사 독립 프로필 — 세션과 무관하게 한 사람 = 한 행. session_presenters.instructor_profile_id 로 세션에 연결 (026)';
comment on table public.language_categories is '번역 키 카테고리 - 번역 키를 그룹화하여 관리';
comment on table public.language_keys is '번역 키 - 번역할 텍스트의 고유 식별자';
comment on table public.languages is '지원 언어 목록 - 시스템에서 지원하는 언어 정의';
comment on table public.lecture_files is '강연자료 - 세션별 PDF 파일(다중), 송출 화면에서 페이지 단위로 표시';
comment on table public.login_attempts is '로그인 시도 횟수 추적 (브루트포스 방지)';
comment on table public.login_logs is '로그인/로그아웃 로그 기록';
comment on table public.partner_agencies is '대행업체 추가 정보 - partner_type이 agency인 파트너의 상세 정보';
comment on table public.partner_instructors is '강사 추가 정보 - partner_type이 instructor인 파트너의 상세 정보';
comment on table public.partner_members is '파트너 팀원 - 파트너 조직의 멤버 및 초대 관리';
comment on table public.partner_organizers is '행사자 추가 정보 - partner_type이 organizer인 파트너의 상세 정보';
comment on table public.partner_requests is '파트너 신청 - 사용자의 파트너 등록 요청 관리';
comment on table public.partners is '파트너 - 승인된 파트너 기본 정보';
comment on table public.poll_options is '설문 보기 옵션 - 동적으로 추가/삭제 가능 (개수 제한 없음)';
comment on table public.poll_responses is '설문 응답 - 청중의 투표/응답 기록';
comment on table public.polls is '설문 - 세션별 실시간 투표/설문 관리';
comment on table public.profiles is '사용자 프로필 - 인증된 사용자의 추가 정보 관리';
comment on table public.qna_categories is '질문 카테고리 - 청중 필터 + 좌장 노출 제어';
comment on table public.question_likes is '질문 좋아요 - 중복 방지를 위한 기록';
comment on table public.questions is '질문 - 청중이 제출한 질문 관리';
comment on table public.session_assets is '세션 에셋 - 세션별 이미지/텍스트 값';
comment on table public.session_feedback is '세션 끝 만족도 응답(1~5점 + 한 줄). 이름·연락처·참가자 토큰 없음 — respondent_key 는 브라우저가 만든 설문 전용 난수의 md5(중복 응답 방지용) (026)';
comment on table public.session_members is '세션 멤버 - 세션에 참여하는 사용자 역할 관리';
comment on table public.session_partners is '세션 협업 파트너 - 세션에 초대된 대행업체/행사자 (1:1)';
comment on table public.session_presenters is '세션 강사/발표자 - 세션에 등록된 발표자 목록';
comment on table public.session_template_fields is '템플릿 필드 정의 - 템플릿에서 사용하는 이미지/텍스트 슬롯';
comment on table public.session_templates is '세션 템플릿 - 세션 화면의 레이아웃/디자인 정의';
comment on table public.sessions is '세션 - 파트너가 주최하는 행사/이벤트';
comment on table public.translations is '번역 값 - 각 키의 언어별 실제 번역 텍스트';
comment on table public.user_theme_settings is '사용자 테마 설정 - 개인별 UI 테마 저장';
