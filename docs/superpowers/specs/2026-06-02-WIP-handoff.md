# 진행 상황 핸드오프 — 큐 타이밍 + 설문 그룹

작성일: 2026-06-02
브랜치: `feat/survey-groups`
목적: 다른 PC에서 이어 작업하기 위한 현재 상태 정리

---

## ✅ 완료 (커밋됨)

### 1. 큐 예상 소요시간(duration) — 구현 완료
"절대 시각을 저장하지 않고 소요시간만 저장 → 시작/종료 시각은 누적 계산" 모델.
순서를 바꿔도 시간이 자동으로 다시 맞는다.

- `supabase/migrations/015_cue_duration.sql`
  - `session_cues.duration_min` 컬럼 추가
  - `sp_partner_cues_q` 결과에 `duration_min` 포함
  - `sp_partner_cue_s`에 `p_duration_min` 추가 (시그니처 변경 → DROP 후 재생성)
- `src/components/session/RunOfShowPanel.jsx`
  - 세션 `start_at`을 기준 시작시각으로 자동 사용
  - 큐별 시작/종료 시각을 누적으로 계산(파생값, `useMemo` timeline)
  - 큐 카드에 `시작시각 / 소요(분)` 표시, 패널 헤더에 `시작·총소요·종료` 요약
  - 큐 추가/편집 다이얼로그에 "소요(분)" 입력 칸
  - 드래그 순서변경 로직은 변경 없음(시간이 파생값이라 자동 정합)

### 2. 설문 그룹 재설계 — 설계 문서만 완료 (코드 미착수)
- `docs/superpowers/specs/2026-06-02-survey-groups-design.md`

---

## ⏳ 남은 일

### A. 마이그레이션 적용 (중요)
- `015_cue_duration.sql`이 **아직 Supabase에 적용 안 됨.** 적용 전에는 `duration_min` 컬럼이 없어 큐 저장이 실패한다.
- 로컬 supabase 설정은 제거된 상태(커밋 `a630d26`)이므로, **연결된 원격 Supabase 프로젝트에 직접 적용**해야 한다 (대시보드 SQL 에디터 또는 `supabase db push`).

### B. 설문 그룹 기능 구현 (설계 완료, 코드 0)
설계 문서 [2026-06-02-survey-groups-design.md] 기준. 요약:
- 신규 `poll_groups`(= 설문): `kind`(pre/live/post) + `display_mode`(takeover/tab)
- `polls.group_id`, `session_cues.poll_id → poll_group_id`
- 송출 로직(`sp_partner_cue_broadcast_s` survey 분기)을 그룹 활성화 + display_mode 처리로 재작성
- 설문 관리 화면(ManagerPolls) 그룹→문항 2단 개편, 큐 에디터는 그룹 선택
- 기존 설문 → "기존 설문" 그룹으로 보존 마이그레이션

### C. 검토/미해결 포인트 (설계 문서 §11)
1. `tab` 노출 방식의 청중 UX — '설문' 탭 존재/추가 여부 확인
2. 사전 설문 오픈 시점 — "콘솔 켤 때 첫 큐로 열기"로 통일했으나 자동 오픈 요구 시 옵션 추가
3. `poll_id` 컬럼 마이그레이션 후 DROP vs 보존

---

## 다음 단계
1. (사용자) 설계 문서 `2026-06-02-survey-groups-design.md` 검토 → 피드백
2. 피드백 반영 후 `writing-plans` 스킬로 구현 계획 작성
3. 계획대로 설문 그룹 구현
4. `015_cue_duration.sql` Supabase 적용 후 큐 소요시간 동작 확인

## 환경 메모
- Windows / PowerShell, Vite + React, Supabase
- 로컬 supabase 제거됨 → 마이그레이션은 원격 Supabase에 직접 적용
- `npm run build`로 컴파일 검증 (ESLint 설정 파일 없음)
