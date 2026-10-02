# LivePulse 청중 부하 시험 (K-011 6단계)

청중 한 명의 요청 흐름(입장 → 4.5초 상태 폴링 → 질문 목록·좋아요·설문 투표)을 N명 동시에 재현한다.
청중 화면은 Realtime 을 쓰지 않고 폴링한다(`src/hooks/useLiveState.js`). Realtime 은 발표자·타이머 화면만 쓴다 — `--rt` 로 소수만 붙여 잰다.

| 파일 | 하는 일 |
|---|---|
| `setup.mjs` | 시험 전용 세션 1개(제목 `[LOADTEST]`)·설문·질문 5개를 만든다 → `session.json` |
| `load.mjs` | 부하 발생. `node load.mjs --vus 500 --duration 150 --ramp 30 --rt 5 --label s500` → `results/<label>.json` |
| `cleanup.mjs` | 시험 세션과 딸린 행을 지우고 남은 행 수를 쿼리로 확인(전부 0) |
| `sample.mjs` · `metrics.mjs` · `logs.mjs` | 시험 중 DB 대기 상태·인프라 지표·API 로그를 읽는다(읽기 전용) |

키는 저장소 `.env`(또는 `loadtest.env`)의 `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY` 에서 읽는다(커밋 안 함). 세션 만들기·지우기·지표는 Aside 의 대시보드 세션(`db.mjs`)을 쓴다.
부하는 맥미니에서: `assist-cli mini sync` → `cd repos/LivePulse/tools/loadtest && npm i && ulimit -n 20000 && node load.mjs …`.
오류율이 10초 연속 25% 를 넘으면 스스로 중단한다(운영 보호). 운영 사용자·실제 행사 행은 건드리지 않는다.
