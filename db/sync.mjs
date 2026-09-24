// One-command content sync: SOP markdown -> block JSON -> live D1 -> verify.
//
//   npm run sync           convert, push, verify
//   npm run sync -- --dry  convert and show what would change, push nothing
//
// Source of truth is the repo (db/content/*.json + src/content/handbook.js).
// Rows are upserted: only rows whose content actually changed are written, so
// updated_at stays meaningful. User data (profiles, sop_versions) is never
// touched. When the in-app editor exists (Batch 9) this must stop overwriting
// rows that were edited in the app.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toRows } from '../src/lib/content.js'

const DRY = process.argv.includes('--dry')
const DB = 'handbook'
const root = new URL('..', import.meta.url)
const WRANGLER = 'node_modules/wrangler/bin/wrangler.js'

// 1. Convert markdown -> db/content/*.json
run(['db/import-md.mjs'])

// 2. Build rows exactly as the seed and the preview do.
const dir = new URL('./content/', import.meta.url)
const imported = {}
for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  imported[j.id] = j
}
const rows = toRows(imported)

// 3. Compare with live D1 so we only report (and write) real changes.
const live = new Map(d1Query('select id, body, meta, version, status, sort, keywords, title, section, domain, restricted from sops')
  .map(r => [r.id, r]))
const cols = ['section', 'domain', 'title', 'body', 'meta', 'version', 'owner', 'restricted', 'status', 'keywords', 'sort']
const asDb = (r) => ({
  ...r,
  body: r.body ? JSON.stringify(r.body) : null,
  meta: r.meta ? JSON.stringify(r.meta) : null,
  restricted: r.restricted ? 1 : 0,
})
const changed = [], added = []
for (const r of rows.map(asDb)) {
  const l = live.get(r.id)
  if (!l) { added.push(r); continue }
  const diff = ['section', 'domain', 'title', 'body', 'meta', 'version', 'status', 'sort', 'keywords', 'restricted']
    .filter(c => (l[c] ?? null) !== (r[c] ?? null))
  if (diff.length) changed.push({ r, diff })
}
const orphans = [...live.keys()].filter(id => !rows.some(r => r.id === id))

console.log(`\nrepo rows: ${rows.length} | live rows: ${live.size}`)
console.log(`new: ${added.length} | changed: ${changed.length} | unchanged: ${rows.length - added.length - changed.length}`)
for (const r of added) console.log('  + ' + r.id)
for (const { r, diff } of changed) console.log('  ~ ' + r.id + ' (' + diff.join(', ') + ')')
if (orphans.length) console.log('  ! in D1 but not in repo (left alone): ' + orphans.join(', '))

if (DRY) { console.log('\n--dry: nothing pushed.'); process.exit(0) }
const todo = [...added, ...changed.map(c => c.r)]
if (!todo.length) { console.log('\nD1 already matches the repo. Nothing to push.'); process.exit(0) }

// 4. Push the changed rows as upserts.
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'")
const sql = todo.map(r =>
  `insert into sops (id, ${cols.join(', ')}) values (${[r.id, ...cols.map(c => r[c])].map(q).join(', ')})
   on conflict(id) do update set ${cols.map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = datetime('now');`
).join('\n')
const file = join(tmpdir(), 'handbook-sync.sql')
writeFileSync(file, sql)
try {
  run([WRANGLER, 'd1', 'execute', DB, '--remote', '--file', file, '--yes'])
} finally {
  unlinkSync(file)
}

// 5. Verify: every repo row must now match D1 byte for byte.
const after = new Map(d1Query('select id, body, meta, sort from sops').map(r => [r.id, r]))
const bad = rows.map(asDb).filter(r => {
  const l = after.get(r.id)
  return !l || (l.body ?? null) !== r.body || (l.meta ?? null) !== r.meta || l.sort !== r.sort
})
if (bad.length) {
  console.error('\nVERIFY FAILED for: ' + bad.map(r => r.id).join(', '))
  process.exit(1)
}
console.log(`\nPushed ${todo.length} row(s). Verified: all ${rows.length} rows match D1.`)

// Run node scripts (and wrangler's own JS entry) with this Node binary: no
// shell, so nothing is re-parsed and it works the same on Windows.
function run(args) {
  execFileSync(process.execPath, args, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
}
function d1Query(command) {
  const out = execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', DB, '--remote', '--json', '--command', command],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 })
  return JSON.parse(out.slice(out.indexOf('[')))[0].results
}
