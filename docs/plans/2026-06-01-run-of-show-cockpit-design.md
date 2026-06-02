# 강연 진행 플랜(큐시트) + 좌장 콕핏 개편 — 설계 문서

작성일 2026-06-01

## 배경 / 문제

좌장 콕핏(`/partner/sessions/:id/console`)에서:
1. 강연 진행 순서를 미리 짤 방법이 없다. 강사별로 "① 자료 p.1 → ② 설문 → ③ Q&A → ④ 자료2 …" 같은 큐시트를 만들고, 그대로 진행하거나 즉석 조정하고 싶다.
2. 좌측 무대 제어에서 강연자료/Q&A/설문 무엇을 골라도 **우측 패널은 항상 Q&A 모더레이션**이라, 우측이 활용되지 않는다.

## 확정된 요구사항 (브레인스토밍 결과)

- **2단계 송출 모델**: 큐를 클릭 = 선택·미리보기(송출 안 함). 각 큐의 **`▶ 송출` 버튼**을 눌러야 실제 청중 화면에 올라간다. 좌장이 왔다갔다 미리 보다가 원하는 순간 송출.
- **큐 종류 4가지**: `pdf`(강연자료+시작페이지), `survey`(설문), `qna`(Q&A 세그먼트, 강사/카테고리 필터), `notice`(인트로/휴식 등 안내).
- **강사별 그룹**: 플랜은 강사(`session_presenters`)별 섹션으로 묶어 표시. 공통(미지정)도 허용.
- **작성 위치**: 준비 마법사(콘텐츠 준비) + 라이브 콕핏 둘 다에서 작성·편집.
- **콕핏 레이아웃**: 좌=진행 플랜(큐시트), 우=탭 작업판 `현재 큐 / Q&A / 설문 / 강연자료`. 큐 선택 시 해당 종류 탭으로 자동 전환.

## 데이터 모델 (DB — 사용자가 SQL 적용)

`supabase/migrations/013_run_of_show.sql`

### sessions 컬럼 추가
- `current_cue_id UUID` — 지금 송출 중인 큐(브라우징은 변경 안 함, 송출 시에만 설정)
- `broadcast_notice TEXT` — notice 큐 송출 시 청중/송출 화면에 띄울 안내 문구
- `broadcast_mode`에 `'notice'` 값 추가 사용

### session_cues (신규)
| 컬럼 | 타입 | 용도 |
|---|---|---|
| id | uuid pk | |
| session_id | uuid → sessions | |
| presenter_id | uuid → session_presenters (null) | 강사 그룹(null=공통) |
| cue_type | text | pdf / survey / qna / notice |
| title | text | 표시 라벨 |
| lecture_file_id | uuid → lecture_files (null) | pdf 큐 대상 |
| start_page | int (null) | pdf 시작 페이지 |
| poll_id | uuid → polls (null) | survey 큐 대상 |
| qna_category_id | uuid → qna_categories (null) | qna 큐 필터(옵션) |
| notice_text | text (null) | notice 큐 문구 |
| display_order | int | 전체 정렬 |
| created_at, updated_at | timestamptz | |

- RLS: 관리 권한자(소유 파트너/협업/확정강연자/관리자)는 ALL, anon은 published/active 세션 SELECT (기존 lecture_files 정책과 동일 패턴).

### 프로시저 (기존 012 스타일: SECURITY DEFINER, JSON 반환, sp_can_control_session 권한 체크)
- `sp_partner_cues_q(p_session_id)` — 큐 목록 + 조인(lecture title/page_count, poll question, category name/color, presenter display_name). 강사 그룹 표시는 클라이언트에서.
- `sp_partner_cue_s(p_action, …)` — create / update / delete / reorder(`p_orders jsonb`).
- `sp_partner_cue_broadcast_s(p_session_id, p_cue_id)` — ⭐ 송출 디스패처. 큐 종류별로 sessions 필드를 직접 갱신:
  - pdf → broadcast_mode='pdf', broadcast_pdf_id, broadcast_pdf_page=start_page
  - survey → 해당 poll status='active'(타 poll closed), broadcast_mode='survey'
  - qna → broadcast_mode='qna' (+ 필요 시 카테고리 visible 조정은 추후)
  - notice → broadcast_mode='notice', broadcast_notice=notice_text
  - 공통: current_cue_id = p_cue_id
- `sp_live_broadcast_q(p_code)` 갱신 — 반환에 `broadcast_notice`, `current_cue_id` 포함, mode 'notice' 처리.

## 프론트엔드

### RunOfShowPanel.jsx (신규, 콕핏 좌측 + 준비 마법사 공용)
- props: `sessionId`, `live`(boolean: true면 ▶송출 버튼 노출), `selectedCueId`, `onSelect(cue)`, `currentCueId`.
- 강사별 섹션으로 큐 목록 렌더, dnd 정렬, 큐 추가/편집 다이얼로그(4종 타입별 입력), 삭제.
- 큐 클릭 → `onSelect(cue)`(선택). live일 때 각 큐에 `▶ 송출` → `sp_partner_cue_broadcast_s`. 현재 송출 큐 하이라이트.

### CockpitWorkspace.jsx (신규, 콕핏 우측)
- 탭: `현재 큐` / `Q&A` / `설문` / `강연자료`.
- props: `sessionId`, `sessionCode`, `selectedCue`, `activeTab`, `onTabChange`.
- 현재 큐 탭: 선택 큐 미리보기 + `▶ 송출` + 맥락 수동 제어(pdf 페이지 ◀▶ / survey 열기·닫기 / qna 카테고리 / notice 문구).
- Q&A 탭: 기존 `ManagerQnA` 그대로.
- 설문 탭 / 강연자료 탭: 기존 송출 RPC(`sp_partner_polls_q`, `sp_partner_poll_toggle_s`, `sp_partner_lectures_q`, `sp_partner_pdf_page_s`) 재사용한 수동 제어.
- 큐가 선택되면 그 종류 탭으로 자동 전환.

### SessionConsole.jsx 개편
- 본문을 `[RunOfShowPanel (좌, live)] + [CockpitWorkspace (우)]`로 교체. `selectedCue`/`activeTab` 상태를 콘솔이 보유해 둘을 연결. 기존 헤더·StagePhaseBar 유지.
- (StageControl은 PresenterQnA 현장판에서 계속 사용 — 변경 없음.)

### SessionDetail (콘텐츠 준비)
- 콘텐츠 준비 섹션에 `RunOfShowPanel`(live=false, 편집 전용) 추가 → 사전 플랜 작성.

### notice 송출 렌더
- `BroadcastQnA.jsx`, `LiveSession.jsx`, `SpeakerScreen.jsx`에서 `broadcast_mode==='notice'`일 때 `broadcast_notice` 안내 화면 표시.

## 역할 분담 (메모리 정책)
- DB SQL(013) 및 프로시저: 제가 **작성**, 적용은 사용자.
- 프론트엔드 전부: 제가 구현 + `vite build` 검증. 커밋/배포는 사용자.

## 검증
- `npx vite build`로 컴파일 검증.
- 엔드투엔드: 013 적용 후 콘솔에서 플랜 작성 → 큐 선택(미리보기) → ▶송출 → `/broadcast`·`/live` 반영 확인.

## 단계
1. DB 013 작성
2. RunOfShowPanel + CockpitWorkspace + SessionConsole 개편 (핵심)
3. 준비 마법사 편집 + notice 렌더
