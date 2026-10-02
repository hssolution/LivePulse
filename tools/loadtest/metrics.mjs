// 대시보드 세션으로 최근 인프라 지표(CPU·메모리 등)를 읽는다(읽기 전용). 사용: node metrics.mjs [분=60]
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const mins = +(process.argv[2] || 60);
const attrs = ['max_cpu_usage', 'ram_usage', 'disk_io_budget', 'disk_io_consumption', 'pg_stat_database_num_backends'];
const js = `
const t = await openTab('https://supabase.com/dashboard/project/pfrdyviyzilhjarnmcec');
try { const out = await t.evaluate(async (a)=>{
 const tok = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')).access_token; const h={Authorization:'Bearer '+tok};
 const end=new Date(), start=new Date(Date.now()-a.mins*60000); const res={};
 for (const at of a.attrs){ const r=await fetch('https://api.supabase.com/platform/projects/pfrdyviyzilhjarnmcec/infra-monitoring?attribute='+at+'&startDate='+start.toISOString()+'&endDate='+end.toISOString()+'&interval=1m',{headers:h}); const j=await r.json().catch(()=>null); res[at]=(j&&j.data)||[];} return res;
},{mins:${mins},attrs:${JSON.stringify(attrs)}}); console.log('@@'+JSON.stringify(out)+'@@'); } finally { await closeTab(t); }`;
const r = spawnSync(path.join(os.homedir(), '.local/bin/aside'), ['repl', js], { encoding: 'utf8' });
const m = r.stdout.match(/@@(.*)@@/s);
if (!m) { console.error(r.stderr.slice(0, 300)); process.exit(1); }
const o = JSON.parse(m[1]);
const rows = {};
for (const [k, arr] of Object.entries(o)) for (const d of arr) (rows[d.period_start] ||= {})[k] = +(+d[k]).toFixed(1);
console.log('UTC시각  cpu%  ram%  ioBudget%  backends');
for (const [t, v] of Object.entries(rows).sort()) console.log(t.slice(11, 16), v.max_cpu_usage, v.ram_usage, v.disk_io_budget, v.pg_stat_database_num_backends);
