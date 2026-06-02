// scripts/extract-translations.js
// Parses supabase/seeds/*_trans_*.sql + 21_trans_home_extra.sql
// and writes src/locales/ko.json + src/locales/en.json

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEEDS_DIR = join(__dirname, '..', 'supabase', 'seeds')
const LOCALES_DIR = join(__dirname, '..', 'src', 'locales')

if (!existsSync(LOCALES_DIR)) mkdirSync(LOCALES_DIR, { recursive: true })

// Match _seed_trans('key', uuid[::uuid], 'ko', 'en')
// Values can contain doubled single quotes ('') for escaping.
const reCall = /_seed_trans\(\s*'((?:[^']|'')*)'\s*,\s*'[^']+'(?:::uuid)?\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g

// Match: INSERT INTO public.translations (...) SELECT id, 'ko'|'en', 'value' FROM public.language_keys WHERE key = 'keyname'
const reInsert = /INSERT INTO public\.translations[^;]*?SELECT\s+id\s*,\s*'(ko|en)'\s*,\s*'((?:[^']|'')*)'\s+FROM\s+public\.language_keys\s+WHERE\s+key\s*=\s*'((?:[^']|'')*)'/gi

const unescape = (s) => s.replace(/''/g, "'")

const ko = {}
const en = {}
const sourceMap = {} // key -> array of files that defined it

const files = readdirSync(SEEDS_DIR)
  .filter((f) => /trans/i.test(f) && f.endsWith('.sql') && !f.startsWith('ALL_SEEDS'))
  .sort()

let total = 0
for (const file of files) {
  const sql = readFileSync(join(SEEDS_DIR, file), 'utf8')
  let m
  reCall.lastIndex = 0
  let countInFile = 0
  while ((m = reCall.exec(sql)) !== null) {
    const key = unescape(m[1])
    const koVal = unescape(m[2])
    const enVal = unescape(m[3])
    if (ko[key] !== undefined && (ko[key] !== koVal || en[key] !== enVal)) {
      console.warn(`[dup-conflict] ${key} — ${sourceMap[key].join(', ')} -> ${file} (overwriting)`)
    }
    ko[key] = koVal
    en[key] = enVal
    sourceMap[key] = sourceMap[key] || []
    sourceMap[key].push(file)
    countInFile++
  }
  // Parse INSERT INTO public.translations ... pattern (e.g. 90_dashboard_translations.sql)
  reInsert.lastIndex = 0
  while ((m = reInsert.exec(sql)) !== null) {
    const lang = m[1]
    const val = unescape(m[2])
    const key = unescape(m[3])
    const bucket = lang === 'ko' ? ko : en
    if (bucket[key] !== undefined && bucket[key] !== val) {
      console.warn(`[dup-conflict-${lang}] ${key} — ${sourceMap[key]?.join(', ') || '?'} -> ${file} (overwriting)`)
    }
    bucket[key] = val
    sourceMap[key] = sourceMap[key] || []
    if (!sourceMap[key].includes(file)) sourceMap[key].push(file)
    countInFile++
  }
  console.log(`  ${file}: ${countInFile} keys`)
  total += countInFile
}

const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]))
const koSorted = sortObj(ko)
const enSorted = sortObj(en)

writeFileSync(join(LOCALES_DIR, 'ko.json'), JSON.stringify(koSorted, null, 2) + '\n', 'utf8')
writeFileSync(join(LOCALES_DIR, 'en.json'), JSON.stringify(enSorted, null, 2) + '\n', 'utf8')

console.log(`\nTotal calls parsed: ${total}`)
console.log(`Unique keys: ${Object.keys(ko).length}`)
console.log(`Wrote: ${join(LOCALES_DIR, 'ko.json')}`)
console.log(`Wrote: ${join(LOCALES_DIR, 'en.json')}`)
