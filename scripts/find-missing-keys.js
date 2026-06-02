// scripts/find-missing-keys.js
// Scans all .jsx/.tsx for t('key') and t('key', ...) calls,
// reports keys not present in ko.json, grouped by file.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')

const ko = JSON.parse(readFileSync(join(SRC, 'locales', 'ko.json'), 'utf8'))

// Match t('key') or t("key") — anything after that doesn't matter
const re = /\bt\(\s*['"]([\w.\-]+)['"]/g

// Also pick up bare string literals that LOOK like translation keys (e.g. `'template.symposium'`)
// because some pages call `t(record.name)` where record.name is a constant key.
// We restrict to known namespaces to avoid false positives.
const NAMESPACES = new Set([
  'common', 'admin', 'error', 'success', 'auth', 'nav', 'footer', 'header',
  'mypage', 'profile', 'home', 'partner', 'session', 'template', 'team',
  'qna', 'poll', 'support', 'invite', 'join', 'editor', 'participant',
  'dashboard', 'theme', 'userDetail', 'loginLog', 'errorBoundary', 'notFound',
  'user', 'status',
])
const reBareKey = /['"]([a-z][a-zA-Z]*\.[a-zA-Z][\w.]*)['"]/g

const missingByFile = {}
const allMissing = new Set()
const allKeys = new Set()

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === 'locales') continue
      walk(p)
      continue
    }
    if (!/\.(jsx?|tsx?)$/.test(entry)) continue
    const src = readFileSync(p, 'utf8')
    let m
    re.lastIndex = 0
    while ((m = re.exec(src)) !== null) {
      const key = m[1]
      allKeys.add(key)
      if (ko[key] === undefined) {
        allMissing.add(key)
        const rel = relative(ROOT, p).replace(/\\/g, '/')
        if (!missingByFile[rel]) missingByFile[rel] = new Set()
        missingByFile[rel].add(key)
      }
    }
    // Bare-key heuristic: only flag if namespace prefix is in our allowlist.
    reBareKey.lastIndex = 0
    while ((m = reBareKey.exec(src)) !== null) {
      const key = m[1]
      const ns = key.split('.')[0]
      if (!NAMESPACES.has(ns)) continue
      // Skip if the key looks like a file path or CSS class etc. by quick heuristic
      if (/\.(jsx?|tsx?|css|svg|png|jpg)$/.test(key)) continue
      allKeys.add(key)
      if (ko[key] === undefined) {
        allMissing.add(key)
        const rel = relative(ROOT, p).replace(/\\/g, '/')
        if (!missingByFile[rel]) missingByFile[rel] = new Set()
        missingByFile[rel].add(key)
      }
    }
  }
}

walk(SRC)

console.log(`Total unique t() keys: ${allKeys.size}`)
console.log(`Missing from ko.json: ${allMissing.size}`)
console.log('')
const files = Object.keys(missingByFile).sort()
for (const f of files) {
  const keys = [...missingByFile[f]].sort()
  console.log(`\n=== ${f} (${keys.length}) ===`)
  for (const k of keys) console.log(`  ${k}`)
}
console.log(`\nFiles with missing keys: ${files.length}`)
