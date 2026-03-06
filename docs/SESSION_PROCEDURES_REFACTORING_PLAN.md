# 파트너 세션 관리 프로시저 전면 재정리 계획

## 📋 현황 분석

### 사용 중인 프로시저 (파트너 페이지별)

#### 1. Sessions.jsx (세션 목록)
- ✅ `sp_partner_sessions_q` - 이미 정리됨

#### 2. SessionCreate.jsx (세션 생성)
- ✅ `sp_partner_session_create_q` - 이미 정리됨

#### 3. SessionDetail.jsx (세션 상세)
- ❌ `sp_session_detail_complete_q` → `sp_partner_session_complete_q`
- ✅ `sp_partner_session_basic_s` - 이미 정리됨
- ✅ `sp_partner_session_status_s` - 이미 정리됨
- ❌ `sp_session_asset_s` → `sp_partner_session_asset_s`
- ❌ `sp_template_fields_q` → 유지 (공통)

#### 4. PartnerDashboard.jsx
- ✅ `sp_partner_dashboard_q` - 이미 정리됨

#### 5. PartnerProfile.jsx
- ✅ `sp_partner_profile_s` - 이미 정리됨

#### 6. TeamMembers.jsx
- ❌ `sp_team_q` → `sp_partner_team_q`

#### 7. Invitations.jsx
- ❌ `sp_invitation_q` → `sp_partner_invitations_q`
- ❌ `respond_to_session_invite` → `sp_partner_invitation_respond_s`

#### 8. Inquiry.jsx
- ❌ `sp_inquiry_q` → `sp_partner_inquiries_q`
- ❌ `sp_inquiry_reply_q` → `sp_partner_inquiry_replies_q`
- ❌ `sp_inquiry_s` → `sp_partner_inquiry_s`

#### 9. Faq.jsx
- ❌ `sp_faq_q` → `sp_partner_faqs_q`

### Q&A 관련 (SessionDetail 내부 컴포넌트)
- ❌ `sp_qna_q` → `sp_partner_qna_q`
- ❌ `sp_qna_create_s` → `sp_partner_qna_s`
- ❌ `sp_qna_update_s` → `sp_partner_qna_update_s`
- ❌ `sp_qna_delete_s` → `sp_partner_qna_delete_s`
- ❌ `sp_qna_broadcast_s` → `sp_partner_qna_broadcast_s`
- ❌ `sp_qna_presenters_q` → `sp_partner_qna_presenters_q`

### Poll 관련 (SessionDetail 내부 컴포넌트)
- ❌ `sp_polls_q` → `sp_partner_polls_q`
- ❌ `sp_poll_create_s` → `sp_partner_poll_s`
- ❌ `sp_poll_delete_s` → `sp_partner_poll_delete_s`
- ❌ `sp_poll_toggle_s` → `sp_partner_poll_toggle_s`
- ❌ `sp_poll_results_q` → `sp_partner_poll_results_q`

### 협업 관련
- ❌ `sp_collaboration_q` → `sp_partner_collaboration_q`
- ❌ `sp_participants_q` → `sp_partner_participants_q`

### 방송 설정
- ❌ `sp_broadcast_settings_q` → `sp_partner_broadcast_settings_q`
- ❌ `sp_broadcast_settings_s` → `sp_partner_broadcast_settings_s`

## 🎯 작업 순서

### Phase 1: 세션 기본 관리 (우선순위 높음)
1. ✅ Sessions.jsx - 완료
2. ✅ SessionCreate.jsx - 완료
3. 🔄 SessionDetail.jsx
   - `sp_session_detail_complete_q` → `sp_partner_session_complete_q`
   - `sp_session_asset_s` → `sp_partner_session_asset_s`

### Phase 2: 팀 및 초대 관리
4. TeamMembers.jsx
   - `sp_team_q` → `sp_partner_team_q`
5. Invitations.jsx
   - `sp_invitation_q` → `sp_partner_invitations_q`
   - `respond_to_session_invite` → `sp_partner_invitation_respond_s`

### Phase 3: 지원 시스템
6. Inquiry.jsx
   - `sp_inquiry_q` → `sp_partner_inquiries_q`
   - `sp_inquiry_reply_q` → `sp_partner_inquiry_replies_q`
   - `sp_inquiry_s` → `sp_partner_inquiry_s`
7. Faq.jsx
   - `sp_faq_q` → `sp_partner_faqs_q`

### Phase 4: Q&A 시스템
8. Q&A 프로시저 일괄 정리
   - 6개 프로시저 네이밍 변경

### Phase 5: Poll 시스템
9. Poll 프로시저 일괄 정리
   - 5개 프로시저 네이밍 변경

### Phase 6: 협업 및 방송
10. 협업 관련
11. 방송 설정 관련

## 📝 네이밍 규칙 재확인

```
sp_partner_[기능]_[타입]

타입:
- _q: 조회 (Query)
- _s: 저장 (Save)
- _c: 확인 (Check)

예시:
sp_partner_session_complete_q     - 세션 전체 정보 조회
sp_partner_session_asset_s        - 세션 자산 저장
sp_partner_team_q                 - 팀 멤버 조회
sp_partner_invitations_q          - 초대 목록 조회
sp_partner_invitation_respond_s   - 초대 응답
sp_partner_qna_q                  - Q&A 목록 조회
sp_partner_qna_s                  - Q&A 생성/수정
```

## 🔄 작업 프로세스

각 프로시저마다:
1. 기존 프로시저 정의 확인
2. 새 이름으로 프로시저 생성 (주석 추가)
3. 기존 프로시저 삭제
4. 프론트엔드 코드 수정
5. 테스트

## 📊 진행 상황

- ✅ 완료: 5개
- 🔄 진행 중: 0개
- ⏳ 대기: 30개 이상

총 예상 작업량: 약 35개 프로시저 정리

