// scripts/sync-inline-fallbacks.js
// Scans .jsx/.tsx files for t('key', 'fallback') patterns and merges
// any keys missing from src/locales/ko.json into ko.json/en.json.
// - Korean fallback is added to ko.json.
// - en.json gets the same fallback (TODO: translate later) so language
//   switch doesn't fall back to raw keys.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')
const KO_PATH = join(__dirname, '..', 'src', 'locales', 'ko.json')
const EN_PATH = join(__dirname, '..', 'src', 'locales', 'en.json')

const ko = JSON.parse(readFileSync(KO_PATH, 'utf8'))
const en = JSON.parse(readFileSync(EN_PATH, 'utf8'))

// Match: t('key.name', 'fallback text')  OR  t("key.name", "fallback text")
// Fallback may contain Korean. Excludes object-form 2nd arg.
const re = /\bt\(\s*['"]([\w.\-]+)['"]\s*,\s*(['"])((?:(?!\2).)*)\2\s*\)/g

const collected = {}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
      walk(p)
      continue
    }
    if (!/\.(jsx?|tsx?)$/.test(entry)) continue
    const src = readFileSync(p, 'utf8')
    let m
    re.lastIndex = 0
    while ((m = re.exec(src)) !== null) {
      const key = m[1]
      const fallback = m[3]
      if (!collected[key]) collected[key] = { fallback, files: [] }
      else if (collected[key].fallback !== fallback) {
        // First wins, but report.
        console.warn(`[fallback-mismatch] ${key}: "${collected[key].fallback}" vs "${fallback}" (${p})`)
      }
      collected[key].files.push(p)
    }
  }
}

walk(SRC)

let addedKo = 0
let addedEn = 0
for (const [key, { fallback }] of Object.entries(collected)) {
  if (ko[key] === undefined) { ko[key] = fallback; addedKo++ }
  if (en[key] === undefined) { en[key] = fallback; addedEn++ }
}

const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]))
writeFileSync(KO_PATH, JSON.stringify(sortObj(ko), null, 2) + '\n', 'utf8')
writeFileSync(EN_PATH, JSON.stringify(sortObj(en), null, 2) + '\n', 'utf8')

console.log(`Inline t() fallbacks found: ${Object.keys(collected).length}`)
console.log(`Added to ko.json: ${addedKo}`)
console.log(`Added to en.json: ${addedEn} (uses Korean fallback — translate later)`)
