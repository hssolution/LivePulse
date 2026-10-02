// 시험 전용 세션 1개 + 설문 1개(선택지 3) + 승인된 질문 5개를 만든다. 운영 사용자·실제 행사 행은 건드리지 않는다.
// 제목 «[LOADTEST]» 로 표시하고 partner_id 는 비운다(세션 소유자 트리거가 아무 것도 만들지 않음).
// 결과는 session.json(커밋 안 함)에 적는다. 끝나면 cleanup.mjs 로 지운다.
import fs from 'node:fs';
import { sql } from './db.mjs';

const code = 'LT' + Math.random().toString(36).slice(2, 8).toUpperCase();
const [s] = sql([`
with s as (
  insert into sessions (title, venue_name, start_at, end_at, contact_phone, contact_email, max_participants, code, status, started_at, survey_enabled)
  values ('[LOADTEST] 부하 시험 — 삭제 예정', 'loadtest', now() - interval '1 hour', now() + interval '6 hours', '000-0000-0000', 'loadtest@example.invalid', 100000, '${code}', 'active', now(), false)
  returning id, code, qna_rev
), p as (
  insert into polls (session_id, question, poll_type, status, show_results, allow_anonymous, started_at)
  select id, '[LOADTEST] 설문', 'single', 'active', true, true, now() from s returning id, session_id
), o as (
  insert into poll_options (poll_id, option_text, display_order)
  select p.id, x.t, x.n from p, (values ('A',1),('B',2),('C',3)) as x(t,n) returning id, poll_id
), q as (
  insert into questions (session_id, content, is_anonymous, status)
  select id, '[LOADTEST] 시드 질문 ' || g, true, 'approved' from s, generate_series(1,5) g returning id
)
select (select id from s) as session_id, (select code from s) as code, (select id from p) as poll_id,
       (select json_agg(id) from o) as option_ids, (select json_agg(id) from q) as question_ids
`]);
const row = s[0];
fs.writeFileSync(new URL('./session.json', import.meta.url), JSON.stringify(row, null, 2));
console.log('시험 세션 생성', row.code, row.session_id);
