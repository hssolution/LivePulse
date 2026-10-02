// scripts/check-en-hangul.js
// 영어 화면 점검:
//  1) en.json 값에 한글이 남았거나 en 에 없는 키 (ko 기준)
//  2) 컴포넌트에 직접 박힌 한국어 줄 (주석·console·en 에 키가 있는 t('key','기본값') 제외)
// 사용: node scripts/check-en-hangul.js [--list]

import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const ko = JSON.parse(readFileSync(join(SRC, 'locales', 'ko.json'), 'utf8'))
const en = JSON.parse(readFileSync(join(SRC, 'locales', 'en.json'), 'utf8'))
const HANGUL = /[가-힣ㄱ-ㆎ]/
const list = process.argv.includes('--list')

const missing = Object.keys(ko).filter((k) => !(k in en))
const hangul = Object.keys(en).filter((k) => typeof en[k] === 'string' && HANGUL.test(en[k]))
console.log(`[locales] ko ${Object.keys(ko).length} · en ${Object.keys(en).length} · en 누락 ${missing.length} · en 값에 한글 ${hangul.length}`)
if (list) for (const k of [...missing, ...hangul]) console.log(`  ${k}: ${ko[k]}`)

const perFile = {}
const lines = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) { walk(p); continue }
    if (!/\.(jsx?|tsx?)$/.test(e.name)) continue
    const src = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    src.split('\n').forEach((line, i) => {
      let c = line.replace(/(^|[^:'"`])\/\/.*$/, '$1')
      if (/console\.(log|error|warn|info)/.test(c)) return
      c = c.replace(/\bt\(\s*['"`]([\w.]+)['"`]\s*,\s*(['"`])(?:(?!\2).)*\2/g, (m, k) => (k in en ? 't(' : m))
      if (!HANGUL.test(c)) return
      const f = relative(SRC, p)
      perFile[f] = (perFile[f] || 0) + 1
      lines.push(`${f}:${i + 1}: ${c.trim().slice(0, 140)}`)
    })
  }
}
walk(SRC)
console.log(`[hardcoded] 한국어가 직접 박힌 줄 ${lines.length} · 파일 ${Object.keys(perFile).length}`)
for (const [f, n] of Object.entries(perFile).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`)
if (list) for (const l of lines) console.log(l)
