// Aside 브라우저의 Supabase 대시보드 세션으로 pg-meta SQL 을 부른다(supabase/schema/pgmeta.mjs 와 같은 길).
// 시험 세션 만들기·지우기·확인 전용 — 쓰기 문장도 허용하므로 setup/cleanup 만 쓴다. 토큰은 저장·출력하지 않는다.
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const REF = process.env.SUPABASE_REF || 'pfrdyviyzilhjarnmcec';
const ASIDE = process.env.ASIDE_BIN || path.join(os.homedir(), '.local/bin/aside');

export function sql(queries) {
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
      res.push({status:r.status, body:await r.text()});
    }
    return res;
  }, {ref:REF, qs:QS});
  out.forEach((o,i)=>console.log('@@Q'+i+'@@'+JSON.stringify(o)+'@@END@@'));
} finally { await closeTab(t); }
`;
  const r = spawnSync(ASIDE, ['repl', js], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const results = [];
  const re = /@@Q(\d+)@@([\s\S]*?)@@END@@/g;
  let m;
  while ((m = re.exec(r.stdout))) {
    const o = JSON.parse(m[2]);
    if (o.status >= 300) throw new Error(`쿼리 ${m[1]} 실패 HTTP ${o.status}: ${o.body.slice(0, 300)}`);
    results[+m[1]] = JSON.parse(o.body);
  }
  if (results.length !== queries.length) throw new Error('결과 수 불일치\n' + (r.stderr || r.stdout || '').slice(-400));
  return results;
}
