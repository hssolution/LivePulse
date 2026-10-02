// 시험 세션([LOADTEST] 제목 + session.json 의 id)과 딸린 행을 지우고, 남은 행 수를 쿼리로 확인한다. 0 이어야 한다.
import fs from 'node:fs';
import { sql } from './db.mjs';

const { session_id: id } = JSON.parse(fs.readFileSync(new URL('./session.json', import.meta.url), 'utf8'));
if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('bad id');
const chk = sql([`select title from sessions where id='${id}'`])[0];
if (chk.length && !chk[0].title.startsWith('[LOADTEST]')) throw new Error('시험 세션이 아님 — 중단');
const where = `session_id='${id}'`;
sql([
  `delete from question_likes where question_id in (select id from questions where ${where})`,
  `delete from poll_responses where poll_id in (select id from polls where ${where})`,
  `delete from poll_options where poll_id in (select id from polls where ${where})`,
  `delete from polls where ${where}`,
  `delete from questions where ${where}`,
  `delete from anonymous_participants where ${where}`,
  `delete from session_members where ${where}`,
  `delete from sessions where id='${id}'`,
]);
const [r] = sql([`select
 (select count(*) from sessions where id='${id}') as sessions,
 (select count(*) from questions where ${where}) as questions,
 (select count(*) from question_likes where question_id in (select id from questions where ${where})) as likes,
 (select count(*) from polls where ${where}) as polls,
 (select count(*) from poll_responses where poll_id in (select id from polls where ${where})) as poll_responses,
 (select count(*) from anonymous_participants where ${where}) as participants,
 (select count(*) from sessions where title like '[LOADTEST]%') as loadtest_sessions,
 (select count(*) from sessions) as sessions_total`]);
console.log('남은 행', JSON.stringify(r[0]));
