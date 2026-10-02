// Aside 브라우저의 Supabase 대시보드 세션으로 pg-meta SELECT 를 부르는 얇은 래퍼.
// 토큰·connectionString 은 실행 중 브라우저 탭 안에서만 쓰고 어디에도 저장·출력하지 않는다.
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const REF = process.env.SUPABASE_REF || 'pfrdyviyzilhjarnmcec';
const ASIDE = process.env.ASIDE_BIN || path.join(os.homedir(), '.local/bin/aside');

/** queries: string[] (SELECT 만). 각 쿼리의 결과 행 배열을 같은 순서로 돌려준다. */
export function pgmeta(queries) {
  for (const q of queries) {
    if (!/^\s*(select|with)\b/i.test(q)) throw new Error('SELECT/WITH 만 허용: ' + q.slice(0, 60));
  }
  const js = `
const REF=${JSON.stringify(REF)};
const QS=${JSON.stringify(queries)};
const t = await openTab('https://supabase.com/dashboard/project/'+REF);
try {
  const out = await t.evaluate(async ({ref, qs})=>{
    const tok = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')).access_token;
    const h = {Authorization:'Bearer '+tok};
    const cs = (await (await fetch('https://api.supabase.com/platform/projects/'+ref,{headers:h})).json()).connectionString;
    const res = [];
    for (const query of qs) {
      const r = await fetch('https://api.supabase.com/platform/pg-meta/'+ref+'/query',{method:'POST',headers:{...h,'Content-Type':'application/json','x-connection-encrypted':cs},body:JSON.stringify({query})});
      const txt = await r.text();
      res.push({status:r.status, body:txt});
    }
    return res;
  }, {ref:REF, qs:QS});
  out.forEach((o,i)=>console.log('@@Q'+i+'@@'+JSON.stringify(o)+'@@END@@'));
} finally { await closeTab(t); }
`;
  const r = spawnSync(ASIDE, ['repl', js], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 && !r.stdout) throw new Error('aside repl 실패: ' + (r.stderr || '').slice(0, 300));
  const results = [];
  const re = /@@Q(\d+)@@([\s\S]*?)@@END@@/g;
  let m;
  while ((m = re.exec(r.stdout))) {
    const o = JSON.parse(m[2]);
    if (o.status >= 300) throw new Error(`쿼리 ${m[1]} 실패 HTTP ${o.status}: ${o.body.slice(0, 300)}`);
    results[+m[1]] = JSON.parse(o.body);
  }
  if (results.length !== queries.length) throw new Error('결과 수 불일치 ' + results.length + '/' + queries.length + '\n' + (r.stdout || '').slice(-500));
  return results;
}
