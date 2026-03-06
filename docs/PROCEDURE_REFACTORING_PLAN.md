# 프로시저 네이밍 리팩토링 계획

## 네이밍 규칙

**형식**: `sp_[중간자]_[메인구분]_[타입]`

- `_q`: 조회(Query)
- `_s`: 저장(Save) - INSERT, UPDATE, DELETE
- `_c`: 확인/체크(Check)

## 현재 상태 및 변경 계획

### ✅ 완료
- `sp_dashboard_q` → `sp_partner_dashboard_q` ✓

### 🔄 파트너 관련 프로시저 (변경 필요)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_partner_info_q` | `sp_partner_info_q` | 조회 | 파트너 정보 조회 (변경 불필요) |
| `sp_partner_profile_s` | `sp_partner_profile_s` | 저장 | 파트너 프로필 저장 (변경 불필요) |
| `sp_partner_search_q` | `sp_partner_search_q` | 조회 | 파트너 검색 (변경 불필요) |
| `sp_team_q` | `sp_partner_team_q` | 조회 | 파트너 팀 멤버 조회 |
| `sp_invitation_q` | `sp_partner_invitations_q` | 조회 | 파트너 초대 목록 조회 |
| `sp_inquiry_q` | `sp_partner_inquiries_q` | 조회 | 파트너 문의 목록 조회 |
| `sp_inquiry_s` | `sp_partner_inquiry_s` | 저장 | 파트너 문의 저장 |
| `sp_inquiry_reply_q` | `sp_partner_inquiry_replies_q` | 조회 | 문의 답변 조회 |
| `sp_faq_q` | `sp_partner_faqs_q` | 조회 | FAQ 목록 조회 |

### 🔄 세션 관련 프로시저 (파트너용)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_session_create_q` | `sp_partner_session_create_q` | 조회 | 세션 생성 페이지 데이터 |
| `sp_session_list_q` | `sp_partner_sessions_q` | 조회 | 파트너 세션 목록 |
| `sp_session_detail_q` | `sp_partner_session_detail_q` | 조회 | 세션 상세 조회 |
| `sp_session_detail_complete_q` | `sp_partner_session_complete_q` | 조회 | 세션 전체 데이터 조회 |
| `sp_session_basic_s` | `sp_partner_session_basic_s` | 저장 | 세션 기본 정보 저장 |
| `sp_session_status_s` | `sp_partner_session_status_s` | 저장 | 세션 상태 변경 |
| `sp_session_asset_s` | `sp_partner_session_asset_s` | 저장 | 세션 자산 저장 |

### 🔄 Q&A 관련 프로시저 (파트너용)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_qna_q` | `sp_partner_qna_q` | 조회 | Q&A 목록 조회 |
| `sp_qna_create_s` | `sp_partner_qna_s` | 저장 | Q&A 생성 |
| `sp_qna_update_s` | `sp_partner_qna_update_s` | 저장 | Q&A 업데이트 |
| `sp_qna_delete_s` | `sp_partner_qna_delete_s` | 저장 | Q&A 삭제 |
| `sp_qna_broadcast_s` | `sp_partner_qna_broadcast_s` | 저장 | Q&A 방송 |
| `sp_qna_presenters_q` | `sp_partner_qna_presenters_q` | 조회 | 발표자 목록 |

### 🔄 투표 관련 프로시저 (파트너용)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_polls_q` | `sp_partner_polls_q` | 조회 | 투표 목록 조회 |
| `sp_poll_create_s` | `sp_partner_poll_s` | 저장 | 투표 생성/수정 |
| `sp_poll_delete_s` | `sp_partner_poll_delete_s` | 저장 | 투표 삭제 |
| `sp_poll_toggle_s` | `sp_partner_poll_toggle_s` | 저장 | 투표 활성화/비활성화 |
| `sp_poll_results_q` | `sp_partner_poll_results_q` | 조회 | 투표 결과 조회 |

### 🔄 협업 관련 프로시저 (파트너용)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_collaboration_q` | `sp_partner_collaboration_q` | 조회 | 협업 정보 조회 |
| `sp_participants_q` | `sp_partner_participants_q` | 조회 | 참여자 목록 조회 |

### 🔄 방송 설정 관련 프로시저 (파트너용)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_broadcast_settings_q` | `sp_partner_broadcast_settings_q` | 조회 | 방송 설정 조회 |
| `sp_broadcast_settings_s` | `sp_partner_broadcast_settings_s` | 저장 | 방송 설정 저장 |

### 🔄 공통 프로시저 (중간자 없음)

| 현재 이름 | 새 이름 | 타입 | 설명 |
|---------|--------|-----|-----|
| `sp_init_q` | `sp_init_q` | 조회 | 앱 초기화 데이터 (변경 불필요) |
| `sp_theme_q` | `sp_theme_q` | 조회 | 테마 조회 (변경 불필요) |
| `sp_theme_s` | `sp_theme_s` | 저장 | 테마 저장 (변경 불필요) |
| `sp_template_fields_q` | `sp_template_fields_q` | 조회 | 템플릿 필드 조회 (변경 불필요) |

### 🔄 헬퍼 함수 (변경 불필요)

- `get_my_partner_id()`
- `is_partner_owner()`
- `is_partner_admin_or_owner()`
- `is_partner_member()`
- `check_partner_collaboration_compatibility()`
- `generate_session_code()`
- `accept_partner_invite()`
- `invite_partner_to_session()`
- `respond_to_session_invite()`

### 🆕 관리자 프로시저 (신규 생성 필요)

| 프로시저명 | 타입 | 설명 |
|---------|-----|-----|
| `sp_admin_dashboard_q` | 조회 | 관리자 대시보드 데이터 |
| `sp_admin_users_q` | 조회 | 사용자 목록 조회 |
| `sp_admin_partners_q` | 조회 | 파트너 목록 조회 |
| `sp_admin_partner_requests_q` | 조회 | 파트너 승인 요청 목록 |
| `sp_admin_partner_approve_s` | 저장 | 파트너 승인/거절 |
| `sp_admin_sessions_q` | 조회 | 전체 세션 목록 |
| `sp_admin_login_logs_q` | 조회 | 로그인 로그 조회 |

## 작업 순서

1. ✅ 룰 파일 생성 (`.cursor/rules/database-procedure-rules.mdc`)
2. ✅ 파트너 대시보드 프로시저 변경
3. 🔄 파트너 세션 관련 프로시저 일괄 변경
4. 🔄 파트너 Q&A/투표 프로시저 일괄 변경
5. 🔄 파트너 기타 프로시저 변경
6. 🔄 관리자 대시보드 프로시저 생성
7. 🔄 관리자 기타 프로시저 생성
8. 🔄 프론트엔드 코드 일괄 수정

## 주의사항

- 기존 프로시저는 DROP 후 새 이름으로 생성
- 프론트엔드에서 사용 중인 모든 `supabase.rpc()` 호출 수정 필요
- 각 프로시저에 상세 주석 추가
- 마이그레이션 파일로 관리

