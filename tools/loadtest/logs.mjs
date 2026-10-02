// 대시보드 세션으로 로그 분석 쿼리(BigQuery 방언)를 읽기 전용으로 부른다. 사용: node logs.mjs "<sql>" [분=60]
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const q = process.argv[2], mins = +(process.argv[3] || 60);
const js = `
const t = await openTab('https://supabase.com/dashboard/project/pfrdyviyzilhjarnmcec');
try { const out = await t.evaluate(async (a)=>{
 const tok = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')).access_token; const h={Authorization:'Bearer '+tok};
 const end=new Date(), start=new Date(Date.now()-a.mins*60000);
 const u='https://api.supabase.com/platform/projects/pfrdyviyzilhjarnmcec/analytics/endpoints/logs.all?sql='+encodeURIComponent(a.q)+'&iso_timestamp_start='+start.toISOString()+'&iso_timestamp_end='+end.toISOString();
 const r=await fetch(u,{headers:h}); return r.status+' '+(await r.text()).slice(0,6000);
},{mins:${mins},q:${JSON.stringify(q)}}); console.log('@@'+out+'@@'); } finally { await closeTab(t); }`;
const r = spawnSync(path.join(os.homedir(), '.local/bin/aside'), ['repl', js], { encoding: 'utf8', maxBuffer: 64 << 20 });
console.log((r.stdout.match(/@@(.*)@@/s) || [, r.stderr.slice(0, 300)])[1]);
