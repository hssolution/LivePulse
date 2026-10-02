// LivePulse 청중 부하 시험 — 청중 한 명이 실제로 하는 요청 흐름을 N명 동시에 재현한다(src/pages/JoinSession·LiveSession, hooks/useLiveState, AudienceQnA·AudiencePolls 기준).
//   입장: sp_join_session_q → sp_join_session_anon_s → 세션·발표자·자산·디자인·설문 조회
//   유지: sp_live_state_q GET 을 4.5초±15% 간격으로 폴링(청중은 Realtime 을 쓰지 않는다), qna_rev 가 바뀌면 sp_live_qna_q GET
//   참여: 질문(질문 등록 0.5건/초, 전체), 좋아요(5건/초, 전체), 설문 투표(1인 1회 + 결과 조회)
// Realtime 은 발표자·타이머 화면(sessions UPDATE 구독)만 쓰므로 소수(--rt)만 붙여 전달 지연을 잰다.
// 사용: node load.mjs --vus 500 --duration 150 --ramp 30 --label s500   (.env 의 VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY, session.json 필요)
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createClient } from '@supabase/supabase-js';
import { Agent, setGlobalDispatcher } from 'undici';

// 시험 장비 한계 방어: 기본 설정은 4.5초 폴링마다 새 TCP·TLS 연결을 열어(keep-alive 4초) 2,000명이면 초당 수백 개의 연결이 생겨
// 공유기·맥미니 쪽 연결 표가 먼저 막힌다(2026-10-03 첫 시도에서 실제로 그랬다). 연결을 재사용하는 풀로 고정해 서버 쪽 한계만 잰다.
setGlobalDispatcher(new Agent({ connections: +(process.env.LT_CONNS || 300), keepAliveTimeout: 60000, keepAliveMaxTimeout: 120000 }));

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VUS = +arg('vus', 100), DURATION = +arg('duration', 150) * 1000, RAMP = +arg('ramp', 30) * 1000;
const RT = +arg('rt', 20), LABEL = arg('label', 'run');
const QRATE = +arg('qrate', 0.5), LRATE = +arg('lrate', 5);

function loadEnv() {
  for (const f of ['.env', 'loadtest.env', '../../.env', '../../.env.production']) {
    const p = new URL(f, import.meta.url);
    if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim(); }
  }
}
loadEnv();
const URL_ = process.env.VITE_SUPABASE_URL, KEY = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 없음(.env)');
const S = JSON.parse(fs.readFileSync(new URL('./session.json', import.meta.url), 'utf8'));
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// ── 계측 ──
const lat = {};       // 엔드포인트별 지연(ms)
const cnt = {};       // 엔드포인트별 {ok, err}
const errKinds = {};
let knownMissing = 0;
let winReq = 0, winErr = 0, totalReq = 0, totalErr = 0;
function rec(name, ms, ok, kind) {
  (lat[name] ||= []).push(ms);
  const c = (cnt[name] ||= { ok: 0, err: 0 });
  totalReq++; winReq++;
  if (ok) c.ok++; else { c.err++; totalErr++; winErr++; errKinds[kind] = (errKinds[kind] || 0) + 1; }
}
async function req(name, path, { method = 'GET', body, prefer, okBody } = {}) {
  const t0 = performance.now();
  try {
    const r = await fetch(URL_ + '/rest/v1/' + path, {
      method, headers: { ...H, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
    });
    const txt = await r.text();
    const ms = performance.now() - t0;
    let ok = r.ok;
    let json = null;
    if (txt) { try { json = JSON.parse(txt); } catch {} }
    if (ok && okBody && !okBody(json)) { rec(name, ms, false, 'app:' + (json?.error || 'false')); return { ok: false, json, ms }; }
    // 운영에 get_poll_results 함수가 없어 앱이 원래 404 를 받는다(기존 결함) — 오류율에서 빼고 따로 센다
    if (!ok && name === 'get_poll_results' && r.status === 404) { knownMissing++; ok = true; }
    rec(name, ms, ok, ok ? '' : 'http' + r.status);
    return { ok, json, ms };
  } catch (e) {
    const ms = performance.now() - t0;
    rec(name, ms, false, e?.name === 'TimeoutError' ? 'timeout' : 'net:' + (e?.cause?.code || e?.name || 'err'));
    return { ok: false, json: null, ms };
  }
}
const rpc = (name, params, opts = {}) => opts.get
  ? req(name, `rpc/${name}?` + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString())
  : req(name, `rpc/${name}`, { method: 'POST', body: params, okBody: opts.okBody });

const RUN = String(Date.now() % 10000).padStart(4, '0'); // 실행마다 전화번호가 겹치지 않게
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jit = (ms) => ms * (0.85 + Math.random() * 0.3);
const t00 = performance.now();
const now = () => performance.now() - t00;

let stopping = false, aborted = null;
const vus = [];
let joined = 0, joinFail = 0;

async function runVu(i) {
  const vu = { i, obs: [], offline: false, offlineEver: false, fails: 0, started: 0, votes: false };
  vus.push(vu);
  await sleep((i / VUS) * RAMP);
  vu.started = now();
  // 입장
  const info = await rpc('sp_join_session_q', { p_code: S.code, p_user_id: null, p_is_preview: false }, { okBody: (j) => j && !j.error });
  const j = await rpc('sp_join_session_anon_s', { p_session_id: S.session_id, p_name: 'lt' + i, p_email: `lt${i}-${Date.now()}@example.invalid`, p_phone: '010-' + RUN + '-' + String(i).padStart(4, '0') }, { okBody: (x) => x?.success });
  if (j.ok) joined++; else joinFail++;
  vu.token = crypto.randomUUID();
  // 라이브 화면 진입 시 초기 조회
  await Promise.all([
    req('sessions_get', `sessions?select=*&code=eq.${S.code}`),
    req('presenters_get', `session_presenters?select=*&session_id=eq.${S.session_id}&status=eq.confirmed&order=display_order`),
    req('assets_get', `session_assets?select=*&session_id=eq.${S.session_id}`),
    rpc('sp_live_design_q', { p_code: S.code }),
    req('polls_get', `polls?select=*,poll_options(id,option_text,display_order)&session_id=eq.${S.session_id}&status=eq.active&order=display_order`),
  ]);
  await req('poll_resp_get', `poll_responses?select=poll_id&poll_id=in.(${S.poll_id})&anonymous_id=in.(${vu.token})`);
  await loadQna(vu);
  // 설문 투표 시각(전체 시험의 30~45% 지점)
  const voteAt = vu.started + 0; // 상대 지연으로 처리
  const voteDelay = DURATION * (0.30 + Math.random() * 0.15);
  const tVote = now() + voteDelay;
  let nextPoll = now();
  let backoff = 0;
  while (!stopping) {
    // 설문 투표
    if (!vu.votes && now() >= tVote) {
      vu.votes = true;
      const opt = S.option_ids[Math.floor(Math.random() * S.option_ids.length)];
      await rpc('submit_poll_response', { p_poll_id: S.poll_id, p_option_ids: [opt], p_response_text: null, p_anonymous_id: vu.token }, { okBody: (x) => x?.success });
      await rpc('get_poll_results', { p_poll_id: S.poll_id });
    }
    // 상태 폴링
    const r = await rpc('sp_live_state_q', { p_code: S.code }, { get: true });
    if (r.ok && r.json?.success) {
      vu.fails = 0; backoff = 0; vu.offline = false;
      const rev = r.json.qna_rev;
      if (vu.lastRev !== rev) {
        vu.obs.push([now(), rev]);
        if (vu.lastRev !== undefined) loadQna(vu); // qna_rev 변경 → 재조회(앱 동작)
        vu.lastRev = rev;
      }
      await sleep(jit(4500));
    } else {
      vu.fails++;
      if (vu.fails >= 2) { vu.offline = true; vu.offlineEver = true; }
      backoff = Math.min(30000, Math.max(1000, backoff * 2 || 1000));
      await sleep(Math.random() * backoff);
    }
  }
}
async function loadQna(vu) {
  const r = await rpc('sp_live_qna_q', { p_code: S.code, p_limit: 200, p_token: vu.token }, { get: true });
  if (r.ok && r.json?.questions?.length) vu.qs = r.json.questions.map((q) => q.id);
}

// ── 질문·좋아요 발생기 ──
const qInserts = []; // {k, ack}
let qCount = 0;
async function questionLoop() {
  const base = await rpc('sp_live_state_q', { p_code: S.code }, { get: true });
  const r0 = base.json?.qna_rev ?? 0;
  S._r0 = r0;
  await sleep(RAMP * 0.6 + 3000); // 어느 정도 입장한 뒤부터
  while (!stopping) {
    const t = performance.now();
    const k = ++qCount;
    const r = await req('question_insert', 'questions', { method: 'POST', prefer: 'return=minimal', body: { session_id: S.session_id, content: `[LOADTEST] 질문 ${k}`, author_name: null, is_anonymous: true, status: 'pending', participant_token: crypto.randomUUID() } });
    if (r.ok) qInserts.push({ k: qInserts.length + 1, ack: now(), sent: t - t00 });
    else qCount--;
    await sleep(-Math.log(1 - Math.random()) * (1000 / QRATE) + 500);
  }
}
async function likeLoop() {
  while (!stopping) {
    const cand = vus.filter((v) => v.qs?.length);
    if (cand.length) {
      const v = cand[Math.floor(Math.random() * cand.length)];
      const q = v.qs[Math.floor(Math.random() * v.qs.length)];
      rpc('toggle_question_like', { p_question_id: q, p_device_id: v.token }, { okBody: (x) => x?.success });
    }
    await sleep(-Math.log(1 - Math.random()) * (1000 / LRATE));
  }
}

// ── Realtime(발표자·타이머 화면 모사) ──
const rt = { subs: 0, errors: 0, closed: 0, events: [] }; // events: [ts, rev]
function startRealtime() {
  for (let i = 0; i < RT; i++) {
    const c = createClient(URL_, KEY, { realtime: { params: { eventsPerSecond: 10 } }, auth: { persistSession: false, autoRefreshToken: false } });
    const idx = i;
    c.channel(`lt-${LABEL}-${i}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${S.session_id}` }, (p) => rt.events.push([now(), p.new?.qna_rev, idx]))
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') rt.subs++;
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') rt.errors++;
        else if (st === 'CLOSED') rt.closed++;
      });
  }
}

// ── 감시: 클라 이벤트루프 지연·오류율 급증 중단 ──
const lag = [];
let prevTick = performance.now();
const lagTimer = setInterval(() => { const n = performance.now(); lag.push(n - prevTick - 100); prevTick = n; }, 100);
let badWindows = 0;
const monitor = setInterval(() => {
  const rate = winReq ? winErr / winReq : 0;
  const act = vus.filter((v) => v.started).length;
  console.log(`[${(now() / 1000).toFixed(0)}s] vus=${act} joined=${joined} req=${totalReq} err=${totalErr} win_err=${(rate * 100).toFixed(1)}% rt_subs=${rt.subs}`);
  if (winReq >= 100 && rate > 0.25) badWindows++; else badWindows = 0;
  if (badWindows >= 2 && !aborted) { aborted = `오류율 ${(rate * 100).toFixed(0)}% 가 10초 연속(창 ${winReq}건) — 운영 보호를 위해 중단`; stopping = true; }
  winReq = winErr = 0;
}, 5000);

const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]); };

console.log(`시작 ${LABEL}: vus=${VUS} duration=${DURATION / 1000}s ramp=${RAMP / 1000}s rt=${RT} code=${S.code}`);
startRealtime();
const tasks = [questionLoop(), likeLoop()];
for (let i = 0; i < VUS; i++) tasks.push(runVu(i));
const end = performance.now() + RAMP + DURATION;
while (performance.now() < end && !stopping) await sleep(500);
stopping = true;
const stopAt = now();
await Promise.race([Promise.allSettled(tasks), sleep(20000)]);
clearInterval(monitor); clearInterval(lagTimer);

// ── 전달 지연 계산: 질문 k 등록 ack 이후 각 청중이 qna_rev >= r0+k 를 처음 본 시각 ──
const r0 = S._r0 ?? 0;
const deliver = [];
for (const q of qInserts) {
  const target = r0 + q.k;
  for (const v of vus) {
    if (!v.obs.length || v.obs[0][0] > q.ack) continue; // 이 질문 전에 이미 붙어 있던 청중만
    const o = v.obs.find(([, rev]) => rev >= target);
    if (o) deliver.push(Math.max(0, o[0] - q.ack));
  }
}
const rtLat = [];
for (const q of qInserts) {
  const target = r0 + q.k;
  for (let i = 0; i < RT; i++) { const e = rt.events.find((x) => x[2] === i && x[1] >= target && x[0] >= q.sent); if (e) rtLat.push(Math.max(0, e[0] - q.ack)); }
}
const expectedRt = qInserts.length * rt.subs;
const result = {
  label: LABEL, vus: VUS, duration_s: DURATION / 1000, ramp_s: RAMP / 1000, aborted, ran_s: Math.round(stopAt / 1000),
  join: { ok: joined, fail: joinFail, success_rate: vus.length ? +(joined / vus.length * 100).toFixed(2) : 0 },
  requests: { total: totalReq, errors: totalErr, error_rate: totalReq ? +(totalErr / totalReq * 100).toFixed(2) : 0, per_sec: +(totalReq / (stopAt / 1000)).toFixed(1), error_kinds: errKinds },
  endpoints: Object.fromEntries(Object.keys(lat).map((k) => [k, { n: lat[k].length, err: cnt[k].err, p50: pct(lat[k], 0.5), p95: pct(lat[k], 0.95), p99: pct(lat[k], 0.99) }])),
  offline_vus: vus.filter((v) => v.offlineEver).length, offline_now: vus.filter((v) => v.offline).length,
  known_missing_get_poll_results_404: knownMissing,
  questions_sent: qInserts.length,
  delivery_poll_ms: { n: deliver.length, p50: pct(deliver, 0.5), p95: pct(deliver, 0.95), max: pct(deliver, 1) },
  realtime: { subscribers: RT, subscribed: rt.subs, errors: rt.errors, closed: rt.closed, events: rt.events.length, expected: expectedRt, delivery_ms: { n: rtLat.length, p50: pct(rtLat, 0.5), p95: pct(rtLat, 0.95), max: pct(rtLat, 1) } },
  client_loop_lag_ms: { p50: pct(lag, 0.5), p95: pct(lag, 0.95), max: pct(lag, 1) },
};
fs.mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL(`./results/${LABEL}.json`, import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(0);
