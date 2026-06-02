# 설문 그룹 · 시점(사전/라이브/사후) 재설계

작성일: 2026-06-02
상태: 설계 검토 대기

---

## 1. 배경 & 문제

현재 LivePulse 설문(`polls`)은 **질문 1개 = 설문 1개** 구조다. 진행 순서(큐시트)의 `survey` 큐는 `poll_id` 하나만 연동하고, 송출 시 그 설문 1개만 `active`로 만든다.

요구사항:
1. 한 큐에 **설문 여러 개(문항 묶음)**를 연동하고 싶다 → "설문 그룹".
2. 설문에 **시점(종류)**이 있다: **사전 / 라이브 / 사후**.
3. 설문 **노출 방식**을 관리자가 설문마다 고를 수 있어야 한다.
4. **모든 설문을 진행 순서(큐)로 통제**한다 (단일 컨트롤 타워).

관련 선행 작업: 큐 타이밍(예상 소요시간) — `session_cues.duration_min` 추가 + 시작/종료 시각 누적 계산(마이그레이션 `015_cue_duration.sql`, [RunOfShowPanel.jsx](../../../src/components/session/RunOfShowPanel.jsx)). 본 설계와 독립적으로 그대로 유지되며, 설문 큐에도 소요시간이 동일하게 적용된다.

## 2. 핵심 개념 & 용어

| 용어 | 의미 | 저장 위치 |
|------|------|-----------|
| **설문(그룹)** | 함께 송출/응답되는 문항 묶음. 청중에게 한 폼으로 보임 | 신규 `poll_groups` |
| **문항(question)** | 질문 1개 + 보기 + 단일/복수/주관식 | 기존 `polls` (이름만 "문항") |
| **종류/시점(kind)** | 사전(pre) / 라이브(live) / 사후(post) | `poll_groups.kind` |
| **노출 방식(display_mode)** | 청중에게 보이는 방식 (takeover / tab) | `poll_groups.display_mode` |

핵심 원칙: **진행 순서(큐시트)가 세션의 단일 컨트롤 타워.** 사전·라이브·사후 모든 설문은 큐로 "열고 닫는다". 종류는 (1) 큐시트에서의 위치, (2) 청중 노출 방식의 기본값, (3) 관리 화면 분류만 다르게 한다. 청중 노출의 실제 on/off는 **큐 송출(=문항 active 여부) + display_mode**가 결정한다.

## 3. 데이터 모델

### 3.1 신규 테이블 `poll_groups` (= 설문)

```sql
CREATE TABLE public.poll_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'live'
                  CHECK (kind IN ('pre','live','post')),
  display_mode  TEXT NOT NULL DEFAULT 'takeover'
                  CHECK (display_mode IN ('takeover','tab')),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

- `kind` — 사전/라이브/사후. 관리 UI 섹션 구분 + 기본 display_mode + 큐 배치 힌트.
- `display_mode`:
  - `takeover` — 큐 송출 시 청중 메인 화면을 설문으로 전환 (`broadcast_mode='survey'`)
  - `tab` — 메인 화면은 그대로 두고, 문항만 active → 청중 앱 '설문' 탭에 노출(강제 아님)
- RLS: 기존 `polls`와 동일 패턴(세션 관리자 ALL / 게시·진행 세션은 anon SELECT).

### 3.2 `polls` 변경 (= 문항)

```sql
ALTER TABLE public.polls
  ADD COLUMN group_id UUID REFERENCES public.poll_groups(id) ON DELETE CASCADE;
```

- 각 문항은 설문(그룹) 하나에 속한다. 그룹 삭제 시 문항 CASCADE 삭제.
- 기존 `status`(draft/active/closed)는 유지하되, **active 전환은 그룹(큐) 단위로 일괄 처리**된다. 문항별 노출 토글(👁)은 관리 UI에서 제거.

### 3.3 `session_cues` 변경

```sql
ALTER TABLE public.session_cues
  ADD COLUMN poll_group_id UUID REFERENCES public.poll_groups(id) ON DELETE SET NULL;
-- poll_id 컬럼은 더 이상 사용하지 않음 (마이그레이션 후 DROP 또는 보존)
```

- `survey` 큐는 이제 `poll_group_id`로 설문(그룹) 하나를 가리킨다.

## 4. 송출/활성화 로직

`sp_partner_cue_broadcast_s`의 `survey` 분기를 그룹 기준으로 재작성:

1. 대상 그룹의 모든 문항 → `status='active'`, `started_at` 설정.
2. 다른 그룹의 active 문항 → `status='closed'`, `ended_at` 설정.
3. `display_mode`에 따라:
   - `takeover`: `sessions.broadcast_mode='survey'`, `current_cue_id` 설정 (메인 화면 전환)
   - `tab`: `broadcast_mode`는 직전 값 유지(전환 안 함), `current_cue_id`만 설정. 문항이 active이므로 '설문' 탭에 노출.
4. 큐 닫기/다음 큐로 이동 시 해당 그룹 문항 `closed`.

> 시점별 동작은 전부 이 로직 + 큐 위치로 표현된다.
> - **사전**: 큐시트 맨 앞. 좌장이 콘솔(라이브)을 켜고 청중을 받기 시작할 때 가장 먼저 "열기".
> - **라이브**: 강연 중간 큐로 송출.
> - **사후**: 큐시트 맨 끝. 강연 마무리 후 "열기".

## 5. 청중 화면 (AudiencePolls)

현재 [AudiencePolls](../../../src/components/session/AudiencePolls.jsx)는 이미 `status='active'`인 설문을 전부 모아 한 폼으로 보여주고 "설문 등록"으로 일괄 제출한다. → **렌더 로직 거의 그대로 재사용.**

추가/변경:
- 활성 그룹의 **제목 헤더** 표시.
- `display_mode='takeover'`: 라이브 메인 화면이 설문 폼(현행과 동일).
- `display_mode='tab'`: 메인은 다른 콘텐츠(PDF 등), 설문은 '설문' 탭에서 접근. 탭에 "응답 가능한 설문 N개" 뱃지.
- `sp_live_broadcast_q`가 단일 `active_poll_id` 대신 **활성 그룹 정보(그룹 id/제목/문항 목록/ display_mode)**를 내려주도록 확장.

## 6. 설문 관리 화면 (ManagerPolls 개편)

- 최상위 = **설문(그룹) 목록**, 종류(사전/라이브/사후)로 섹션 구분 + 그룹 순서변경.
- `+ 설문 만들기` → 제목 + **종류** + **노출 방식** 선택.
- 각 설문 카드 안에 **문항 목록**(순서변경) + `+ 문항 추가`(기존 질문 편집기 재사용: 질문/타입/보기/필수/결과공개).
- 그룹 단위: 이름변경 · 삭제 · `응답 화면 미리보기`(그룹 기준).
- 문항별 노출(👁) 토글 제거 — 노출은 큐 송출(그룹 단위)로 통일.

## 7. 큐 에디터 (RunOfShowPanel)

- `survey` 큐의 드롭다운: 개별 문항이 아니라 **설문(그룹) 목록**을 보여주고 하나 선택.
- 선택한 그룹의 **종류 뱃지(사전/라이브/사후)**를 큐 카드에 표시.
- 큐 타이밍(소요시간) 입력은 현행 그대로 적용.

## 8. 기존 데이터 마이그레이션 (dev/테스트)

- 세션별로 기존 `polls`가 있으면 → `kind='live'`, `display_mode='takeover'`인 **"기존 설문" 그룹 1개** 생성 후 그 세션의 모든 문항을 담는다(`group_id` 채움).
- 기존 `survey` 큐의 `poll_id` 연동은 끊김(null) → 관리자가 그룹으로 다시 연결. (테스트 데이터라 안전)

## 9. 영향받는 RPC/함수 인벤토리

| 함수 | 변경 |
|------|------|
| `sp_partner_poll_s` | 문항 생성/수정 시 `p_group_id` 추가 |
| `sp_partner_polls_q` | 그룹 정보 포함하거나, 그룹별 조회로 분리 |
| (신규) `sp_partner_poll_group_q` / `_s` | 설문(그룹) 목록 조회 / 생성·수정·삭제·순서변경 |
| `sp_partner_cues_q` | `poll_group_id` + 그룹 제목/종류 반환 |
| `sp_partner_cue_s` | `p_poll_id` → `p_poll_group_id` |
| `sp_partner_cue_broadcast_s` | survey 분기를 그룹 활성화 + display_mode 처리로 재작성 |
| `sp_live_broadcast_q` | 활성 그룹(제목/문항/ display_mode) 반환 |

## 10. 범위 밖 (YAGNI)

- 한 문항을 여러 설문에 재사용(다대다) — 1문항 = 1그룹으로 한정.
- 자유 라벨 분류 — 고정 3종(pre/live/post)으로 한정.
- 사전 설문 자동 오픈(세션 게시 시 자동 active) — 일단 수동(큐 열기)으로. 필요 시 추후.
- 응답 기간/마감 시각 자동화 — 큐 열기/닫기로 대체.

## 11. 미해결/검토 포인트

1. **`tab` 노출 방식의 청중 UX** — '설문' 탭이 청중 앱에 이미 있는지/추가가 필요한지 구현 단계에서 확인.
2. **사전 설문 오픈 시점** — "콘솔 켤 때 첫 큐로 열기"로 통일했으나, 진짜 라이브 시작 전(게시 직후)부터 받고 싶다는 요구가 나오면 `kind='pre'` 그룹 자동 오픈 옵션을 추가할 수 있음.
3. **`poll_id` 컬럼 처리** — 마이그레이션 후 DROP할지 한동안 보존할지.
