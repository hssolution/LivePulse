# 화면 디자인 편집기 재설계 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 파트너 세션 편집기의 "화면 디자인" 섹션을, 실제 청중 화면을 iframe으로 그대로 보여주는 고충실도 미리보기 + 아코디언 편집 패널 + 강화된 에셋 업로드 UX로 재설계한다.

**Architecture:** `SessionDetail.jsx`의 `DesignSection`만 재작성한다. DB 스키마와 청중 렌더 switch 함수는 불변. 우측 미리보기는 `DynamicTemplateRenderer`(범용·저충실도)를 버리고 실제 라우트(`/join`·`/live`·`/broadcast`)를 `?embed=true`로 iframe 임베드한다. 에셋/템플릿 저장은 이미 즉시 DB에 반영되므로, 저장 성공 시 iframe을 강제 리로드해 항상 최신 저장본과 일치시킨다.

**Tech Stack:** React 18, react-router-dom v7, Vite, Tailwind, Radix UI(@/components/ui: accordion·tabs·card·switch), Supabase.

**Testing note:** 이 레포에는 테스트 러너가 없다(`package.json`에 test 스크립트 없음). 자동화 테스트 도입은 이번 스코프 밖(YAGNI). 각 태스크는 **브라우저 수동 검증**으로 확인한다. 검증 계정: 관리자 `lhscj2466@gmail.com` → 파트너 보기 모드, 또는 파트너 직접 로그인. 검증 세션: 기존 세션 상세(`/partner/sessions/:id`) > "화면 디자인" 탭.

**Pre-flight (every task):** dev 서버는 `npm run dev`로 띄워둔다(기본 포트 5173). 빌드 검증은 `npm run build`로 한다.

---

## 사전 확인 (Task 0)

### Task 0: 베이스라인 확보

**Step 1:** `npm run dev` 실행, `http://localhost:5173/partner/sessions/<기존세션id>` 접속 → "화면 디자인" 탭이 현재대로 뜨는지 확인(기준점).

**Step 2:** `npm run build` 실행 → 현재 에러 없이 빌드되는지 확인. 이후 모든 태스크 후 이 명령으로 회귀 검증.

**Step 3:** 투표 송출 매핑 확인 (설계 미해결 항목). `poll_template_id`로 선택한 템플릿이 청중에게 **어디서** 렌더되는지 grep으로 확인:
- Run: `poll_template` 사용처를 `src/pages/` 전체에서 검색.
- 결과에 따라 Task 6의 "투표 탭" iframe src 확정. 후보: 투표는 전용 송출 라우트가 없으므로 **`/live/:code?preview=true&tab=now&embed=true`**(청중 라이브의 투표 뷰)를 기본값으로 한다. 별도 송출 화면이 발견되면 그 라우트로 교체.

**Step 4: Commit** (no-op이면 생략)

---

## Phase 1 — 청중 라우트 embed 모드 (iframe 임베드 준비)

> `JoinSession`은 이미 `?embed=true`를 지원([JoinSession.jsx:51,1075,1116](src/pages/JoinSession.jsx#L51)). `LiveSession`·`BroadcastQnA`에 동일 패턴을 추가한다. **렌더 본체 로직은 절대 바꾸지 않고**, 미리보기/설정/네비 등 크롬 UI만 숨긴다.

### Task 1: LiveSession에 embed 모드 추가

**Files:**
- Modify: `src/pages/LiveSession.jsx` (searchParams 영역 ~line 42-45, 그리고 미리보기 배너/네비 렌더부)

**Step 1: isEmbed 플래그 추가**

[LiveSession.jsx:44-45](src/pages/LiveSession.jsx#L44) 부근에 추가:

```jsx
const isPreview = searchParams.get('preview') === 'true'
const initialTabParam = searchParams.get('tab')
const isEmbed = searchParams.get('embed') === 'true' // iframe 임베드: 미리보기 배너/외곽 UI 숨김
```

**Step 2: 미리보기 배너/외곽 chrome를 embed일 때 숨김**

`isPreview` 미리보기 배너를 렌더하는 곳(JoinSession의 line 1075 패턴과 동일하게)에서 `if (!isPreview || isEmbed) return null` 적용. 상단 padding(`pt-12` 등)도 `isPreview && !isEmbed`로 조건화. 실제 위치는 LiveSession에서 `isPreview` 사용처를 grep해 동일 처리.

**Step 3: 수동 검증**

브라우저에서 직접 접속 비교:
- `/live/<code>?preview=true` → 미리보기 배너 보임(기존 동작 유지)
- `/live/<code>?preview=true&embed=true` → 배너/외곽 chrome 없이 콘텐츠만. 라이브 탭(현재/Q&A/정보) 정상 동작.

**Step 4: 빌드 검증** — `npm run build` 통과.

**Step 5: Commit**

```bash
git add src/pages/LiveSession.jsx
git commit -m "feat: LiveSession에 iframe embed 모드(?embed=true) 추가"
```

### Task 2: BroadcastQnA에 embed 모드 추가

**Files:**
- Modify: `src/pages/BroadcastQnA.jsx`

**Step 1: useSearchParams + isEmbed 추가**

import에 `useSearchParams`가 없으면 `react-router-dom`에서 추가. 컴포넌트 상단:

```jsx
const [searchParams] = useSearchParams()
const isEmbed = searchParams.get('embed') === 'true'
```

**Step 2: 설정 패널/조작 UI를 embed일 때 숨김**

BroadcastQnA는 송출 설정 패널(`showSettings`, `previewSettings`, 폭/폰트/색 입력 — [BroadcastQnA.jsx:359-429](src/pages/BroadcastQnA.jsx#L359))을 갖는다. embed 모드에서는 **설정 토글 버튼과 패널을 렌더하지 않는다**(읽기 전용 송출 화면처럼). 송출 본체(질문 표시)는 그대로. 저장된 `broadcast_settings`를 그대로 적용해 표시.

```jsx
{!isEmbed && (
  /* 기존 설정 토글 버튼 + 패널 */
)}
```

**Step 3: 수동 검증**

- `/broadcast/<code>` → 설정 패널/토글 보임(기존)
- `/broadcast/<code>?embed=true` → 설정 UI 없이 송출 화면만. 저장된 broadcast_settings 반영.

**Step 4: 빌드 검증** — `npm run build` 통과.

**Step 5: Commit**

```bash
git add src/pages/BroadcastQnA.jsx
git commit -m "feat: BroadcastQnA에 iframe embed 모드(?embed=true) 추가"
```

---

## Phase 2 — DesignSection 재작성

> 대상: [SessionDetail.jsx:886-1217](src/pages/partner/SessionDetail.jsx#L886)의 `DesignSection`. 기존 props 시그니처(template/templates/qnaTemplates/pollTemplates/templateFields/assets/previewData/setPreviewData/setAssets/onTemplateChange/onImageUpload/onImageDelete/onUrlSave/onSave/saving/session/previewDevice/setPreviewDevice/leftWidth/containerRef/onMouseDown/getPreviewSize)는 그대로 받되 내부 JSX를 재구성한다.

### Task 3: 우측 미리보기를 iframe 3탭으로 교체

**Files:**
- Modify: `src/pages/partner/SessionDetail.jsx` (DesignSection 우측 패널 [1157-1213](src/pages/partner/SessionDetail.jsx#L1157))
- Modify: import에 Tabs 컴포넌트 추가

**Step 1: 미리보기 탭 상태 + iframe refresh 키 추가 (DesignSection 내부)**

DesignSection 함수 상단에:

```jsx
const [previewTab, setPreviewTab] = useState('join') // 'join' | 'qna' | 'poll'
const [iframeNonce, setIframeNonce] = useState(0) // 저장 시 증가시켜 iframe 강제 리로드
```

**Step 2: 탭별 iframe src 헬퍼**

```jsx
const code = session?.code
const previewSrc = {
  join: `/join/${code}?preview=true&embed=true&n=${iframeNonce}`,
  qna: `/broadcast/${code}?embed=true&n=${iframeNonce}`,
  // Task 0 Step 3 결과로 확정. 기본값: 청중 라이브의 투표 뷰
  poll: `/live/${code}?preview=true&embed=true&tab=now&n=${iframeNonce}`,
}
```

**Step 3: 우측 패널 JSX 교체**

기존 `라이브 미리보기` 헤더 + `DynamicTemplateRenderer` 블록을 다음으로 교체. 기기 토글 버튼(mobile/tablet/desktop)은 **유지**. Light/Dark 토글은 추가하지 않음(설계상 폐기).

```jsx
<div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-800/50" style={{ width: `${100 - leftWidth}%` }}>
  {/* 상단 바: 탭 + 기기 토글 */}
  <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 gap-2">
    <div className="flex gap-1">
      {[
        { key: 'join', label: '참가' },
        { key: 'qna', label: 'Q&A' },
        { key: 'poll', label: '투표' },
      ].map((tabDef) => (
        <button
          key={tabDef.key}
          type="button"
          onClick={() => setPreviewTab(tabDef.key)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            previewTab === tabDef.key
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {tabDef.label}
        </button>
      ))}
    </div>
    <div className="flex gap-1 text-slate-400 dark:text-slate-500">
      {/* 기존 mobile/tablet/desktop 버튼 3개 그대로 이동 */}
    </div>
  </div>

  {/* iframe 미리보기 */}
  <div className="flex-1 overflow-auto p-4">
    {code ? (
      <div className={`mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${getPreviewSize()}`} style={{ height: 'min(720px, 100%)' }}>
        <iframe
          key={`${previewTab}-${iframeNonce}`}
          src={previewSrc[previewTab]}
          title="청중 화면 미리보기"
          className="w-full h-full border-0"
        />
      </div>
    ) : (
      <p className="text-center text-sm text-slate-400 mt-10">세션 코드가 없어 미리보기를 표시할 수 없습니다.</p>
    )}
  </div>

  {/* 미저장 안내 */}
  <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
    미리보기는 <b>저장된 내용</b>을 보여줍니다. 변경 후 저장하면 자동으로 갱신돼요.
  </div>
</div>
```

**Step 4: import 확인** — Tabs를 안 쓰고 버튼으로 구현하므로 추가 import 없음. `DynamicTemplateRenderer` import는 더 이상 쓰지 않으면 제거(미사용 경고 방지). `getDefaultSampleValue`가 다른 곳에서 쓰이는지 확인 후 정리.

**Step 5: 수동 검증**

- 화면 디자인 탭 → 우측에 [참가][Q&A][투표] 탭. 각 탭 클릭 시 해당 iframe 로드.
- 참가 탭에 입장 페이지가 chrome 없이 뜨는지.
- 기기 토글(모바일/태블릿/데스크탑) 전환 시 프레임 크기 변경.

**Step 6: 빌드 검증** — `npm run build` 통과.

**Step 7: Commit**

```bash
git add src/pages/partner/SessionDetail.jsx
git commit -m "feat: 화면 디자인 미리보기를 실제 화면 iframe 3탭(참가/Q&A/투표)으로 교체"
```

### Task 4: 저장/에셋 변경 시 iframe 자동 새로고침

**Files:**
- Modify: `src/pages/partner/SessionDetail.jsx`

> 컨텍스트: 에셋 업로드([302](src/pages/partner/SessionDetail.jsx#L302))·삭제([331](src/pages/partner/SessionDetail.jsx#L331))·URL저장([359](src/pages/partner/SessionDetail.jsx#L359))은 이미 즉시 DB에 반영된다. 기본 저장(`handleSaveBasic` [272](src/pages/partner/SessionDetail.jsx#L272))은 템플릿 선택을 저장한다. iframe은 DB를 읽으므로, 이들 성공 직후 `iframeNonce`를 증가시키면 미리보기가 최신화된다.

**Step 1: nonce를 부모로 끌어올리기**

`iframeNonce`/`setIframeNonce`를 `SessionDetail`(부모)로 이동하고 DesignSection에 prop으로 전달. (저장 핸들러가 부모에 있으므로.)

**Step 2: 성공 콜백에서 bump**

`handleSaveBasic`, `handleImageUpload`, `handleImageDelete`, `handleUrlSave`의 성공 분기 끝에 `setIframeNonce((n) => n + 1)` 추가. (각 핸들러는 이미 `loadSession()` 또는 state 갱신을 하므로 그 직후.)

**Step 3: 수동 검증**

- 참가 탭 미리보기 보이는 상태에서, 이미지/에셋 카드에 새 이미지 업로드 → 잠시 후 iframe이 새 이미지로 갱신.
- 템플릿 드롭다운 변경 후 저장 → 미리보기가 새 템플릿으로 갱신.

**Step 4: 빌드 검증** — `npm run build` 통과.

**Step 5: Commit**

```bash
git add src/pages/partner/SessionDetail.jsx
git commit -m "feat: 저장·에셋 변경 시 미리보기 iframe 자동 새로고침"
```

### Task 5: 좌측 패널을 아코디언 3섹션 + 상태 배지로 재구성

**Files:**
- Modify: `src/pages/partner/SessionDetail.jsx` (DesignSection 좌측 [935-1147](src/pages/partner/SessionDetail.jsx#L935))
- 사용: `src/components/ui/accordion.jsx` (이미 존재)

**Step 1: accordion import 추가**

```jsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
```

**Step 2: 상태 배지 계산 (DesignSection 내부)**

```jsx
const imageFields = templateFields.filter((f) => f.field_type === 'image')
const requiredImageFields = imageFields.filter((f) => f.is_required)
const missingRequired = requiredImageFields.filter((f) => !assets[f.field_key]?.value && !previewData[f.field_key]).length
const templateChosen = !!formData.template_id
```

**Step 3: 좌측을 Accordion으로 감싸기**

3개 `AccordionItem`:
- `① 템플릿` — 기존 템플릿 드롭다운 3개. 트리거 우측에 배지: `templateChosen ? '✓ 선택됨' : '⚠ 미선택'`. 각 드롭다운 행 끝에 🔍 버튼(Task 7).
- `② 이미지 / 에셋` — 기존 이미지 카드 목록(Task 6에서 강화). 트리거 우측 배지: `missingRequired > 0 ? '⚠ 필수 ' + missingRequired + '건 누락' : '✓ 완료'`.
- `③ 링크 / 기타 설정` — 기존 url 필드 목록 + (있으면) boolean/text 필드. 배지 없음.

기존 "실제 화면 새 창으로 열기" 블록([1107-1145](src/pages/partner/SessionDetail.jsx#L1107))은 ③ 하단 또는 별도 안내로 유지(🔍로 일부 대체되지만 전체 목록은 남겨도 무방).

기본 펼침: `defaultValue={['tpl','asset']}` (type="multiple").

**Step 4: 저장 버튼을 좌측 하단 sticky로 추가**

좌측 스크롤 영역 하단에 sticky 저장 바. 기존 우상단 저장 버튼은 유지하거나 제거(택1, 중복 피하려면 하단으로 단일화 권장):

```jsx
<div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3">
  <button type="button" onClick={onSave} disabled={saving}
    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2">
    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
    저장
  </button>
</div>
```

**Step 5: 수동 검증**

- 좌측에 3개 아코디언 섹션. 펼치고 접힘 동작.
- 템플릿 미선택 시 ① 배지 `⚠ 미선택`, 선택 시 `✓ 선택됨`.
- 필수 이미지 누락 시 ② 배지 `⚠ 필수 N건 누락`, 다 채우면 `✓ 완료`.
- 하단 sticky 저장 버튼으로 저장 동작.

**Step 6: 빌드 검증** — `npm run build` 통과.

**Step 7: Commit**

```bash
git add src/pages/partner/SessionDetail.jsx
git commit -m "feat: 화면 디자인 좌측을 아코디언 3섹션 + 상태 배지로 재구성"
```

### Task 6: 에셋 카드 UX 강화 (드래그앤드롭 + 사이즈 검증 + URL/파일 일원화)

**Files:**
- Create: `src/components/session/AssetField.jsx` (이미지 필드 카드 컴포넌트로 추출)
- Modify: `src/pages/partner/SessionDetail.jsx` (이미지 카드 map을 `<AssetField>`로 교체)

**Step 1: AssetField 컴포넌트 생성**

props: `field`(템플릿 필드), `value`(현재 이미지 URL = `assets[key]?.value`), `urlValue`, `onUploadFile(file)`, `onDelete()`, `onUrlChange(url)`, `onUrlSave()`.

기능:
- **드래그앤드롭 존**: `onDragOver`/`onDrop`로 파일 받기 + 클릭 업로드(`<input type=file>`). 드롭 시 `onUploadFile(file)`.
- **파일/URL 탭 전환**: 상단 작은 토글("파일" / "URL"). URL 탭이면 input + 저장 버튼.
- **권장 사이즈 표시**: `field.max_width`가 있으면 "권장 최대 {max_width}px" 표시.
- **업로드 후 검증 경고(비차단)**: 이미지 로드 시 `naturalWidth`를 읽어 `field.max_width`와 비교. 키워드 기반 비율 추정:
  ```js
  const ratioHint = /banner/.test(field.field_key) ? 'wide'
    : /logo/.test(field.field_key) ? 'square' : null
  ```
  너무 작으면(`naturalWidth < (max_width||0) * 0.5`) "권장보다 작아 흐릿할 수 있어요" 노란 경고.
- **썸네일 미리보기**: 현재 value를 `<img>`로. 삭제 버튼 오버레이(기존 [1049-1056](src/pages/partner/SessionDetail.jsx#L1049) 패턴).

**Step 2: SessionDetail에서 교체**

이미지 필드 map([1007-1068](src/pages/partner/SessionDetail.jsx#L1007))을 `<AssetField .../>`로 교체. 핸들러는 기존 `onImageUpload(field.field_key, file)`, `onImageDelete(field.field_key)`, `onUrlSave(field.field_key, url)` 연결.

**Step 3: 수동 검증**

- 카드에 파일을 드래그앤드롭 → 업로드되고 썸네일 표시.
- 작은 이미지 업로드 → 노란 경고 표시(차단 안 됨).
- "URL" 탭으로 전환 → URL 입력·저장.
- 삭제 → 썸네일 사라지고 ② 배지 갱신.

**Step 4: 빌드 검증** — `npm run build` 통과.

**Step 5: Commit**

```bash
git add src/components/session/AssetField.jsx src/pages/partner/SessionDetail.jsx
git commit -m "feat: 에셋 카드 드래그앤드롭·사이즈 검증·URL/파일 일원화"
```

### Task 7: 슬롯별 🔍 전체화면 미리보기 버튼

**Files:**
- Modify: `src/pages/partner/SessionDetail.jsx` (① 템플릿 섹션의 드롭다운 행)

**Step 1: 각 드롭다운 행에 🔍 버튼 추가**

참가/Q&A/투표 각 행에 `Eye`(또는 `ExternalLink`) 아이콘 버튼. 클릭 시 새 창으로 실제 라우트 열기(미저장 반영 안 됨 → 저장 후 사용 권장 툴팁):
- 참가: `/join/${code}?preview=true`
- Q&A: `/broadcast/${code}`
- 투표: Task 0 Step 3 결과 라우트(기본 `/live/${code}?preview=true&tab=now`)

```jsx
<button type="button" title="전체화면으로 실제 화면 보기"
  onClick={() => window.open(slotPreviewUrl, '_blank', 'noopener,noreferrer')}
  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 flex-shrink-0">
  <ExternalLink className="w-4 h-4" />
</button>
```

**Step 2: 수동 검증**

- 각 슬롯 🔍 클릭 → 새 탭에 해당 실제 화면(전체).

**Step 3: 빌드 검증** — `npm run build` 통과.

**Step 4: Commit**

```bash
git add src/pages/partner/SessionDetail.jsx
git commit -m "feat: 템플릿 슬롯별 전체화면 미리보기 버튼 추가"
```

---

## Phase 3 — 마무리 검증

### Task 8: 통합 수동 검증 + 정리

**Step 1: 골든 패스 시나리오**

파트너 계정으로 기존 세션 > 화면 디자인:
1. 참가 템플릿 선택 → ① 배지 `✓`, 우측 참가 탭 갱신.
2. 필수 이미지 업로드(드래그앤드롭) → ② 배지 `✓`, 우측 미리보기 갱신.
3. Q&A/투표 탭 전환 → 각 실제 화면 표시.
4. 기기 토글 3종 전환.
5. 🔍 버튼 → 새 탭 실제 화면.

**Step 2: 엣지 케이스**

- 코드 없는 세션(이론상) → 미리보기 자리 안내 문구.
- 템플릿 미선택 상태 → 배지/미리보기 깨지지 않음.
- 관리자 "보기 모드"(view-as)로 진입 → 동일 동작(데이터는 대상 파트너 기준), iframe도 정상.

**Step 3: 회귀 확인**

- 같은 페이지의 다른 섹션(기본 정보/발표자/콘텐츠/참가자/게시) 정상.
- `DynamicTemplateRenderer` 제거로 인한 미사용 import/경고 없음.

**Step 4: 최종 빌드** — `npm run build` 통과.

**Step 5: Commit** (정리 변경분이 있으면)

```bash
git add -A
git commit -m "chore: 화면 디자인 재설계 마무리 정리 및 미사용 코드 제거"
```

---

## 롤백/주의

- Phase 1(embed)은 청중 라우트에 영향. embed가 아닌 일반 접속 동작이 바뀌지 않았는지 각 Task에서 반드시 비교 검증.
- iframe은 동일 출처(localhost/같은 도메인)이므로 CSP/X-Frame-Options 이슈 없음(자체 SPA 라우트). 배포 환경에서도 동일 출처라 문제 없음.
- 미저장 변경은 iframe에 반영되지 않는 게 정상(설계 결정). 안내 문구로 커버.
