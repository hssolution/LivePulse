// 시험 중 운영 DB 의 대기 상태를 N초 간격으로 읽어 한 줄씩 출력한다(읽기 전용). 사용: node sample.mjs [횟수=10] [간격초=10]
import { sql } from './db.mjs';
const n = +(process.argv[2] || 10), gap = +(process.argv[3] || 10);
for (let i = 0; i < n; i++) {
  try {
    const [a, b] = sql([
      `select coalesce(state,'-') s, coalesce(wait_event_type,'-')||'/'||coalesce(wait_event,'-') w, count(*) c from pg_stat_activity where datname='postgres' and pid<>pg_backend_pid() and backend_type='client backend' group by 1,2 order by 3 desc`,
      `select max(extract(epoch from now()-query_start))::int as oldest_s from pg_stat_activity where state='active' and pid<>pg_backend_pid() and datname='postgres'`,
    ]);
    console.log(new Date().toISOString().slice(11, 19), JSON.stringify(a.map((r) => `${r.s}:${r.w}=${r.c}`)), 'oldest_active_s=' + b[0].oldest_s);
  } catch (e) { console.log('err', e.message.slice(0, 100)); }
  await new Promise((r) => setTimeout(r, gap * 1000));
}
