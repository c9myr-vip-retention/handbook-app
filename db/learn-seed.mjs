// Load Learn module content (db/learn/*.json) into D1 as the DRAFT.
// Never touches what staff see: an admin publishes the draft in the app.
//
//   node db/learn-seed.mjs            add modules that are not in D1 yet (remote)
//   node db/learn-seed.mjs --local    same, against the local wrangler database
//   node db/learn-seed.mjs --replace-draft=<id>[,<id>]   overwrite those drafts
//
// Run db/learn.sql first to create the tables.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WHERE = process.argv.includes('--local') ? '--local' : '--remote'
const REPLACE = new Set((process.argv.find(a => a.startsWith('--replace-draft=')) || '').replace('--replace-draft=', '').split(',').filter(Boolean))
const root = new URL('..', import.meta.url)
const WRANGLER = 'node_modules/wrangler/bin/wrangler.js'
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"

const dir = new URL('./learn/', import.meta.url)
const stmts = []
readdirSync(dir).filter(f => f.endsWith('.json')).forEach((f, i) => {
  const m = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  const content = q(JSON.stringify(m.content))
  stmts.push(`insert into learn_modules (id, draft, draft_by, draft_at, sort) values (${q(m.id)}, ${content}, 'seed', datetime('now'), ${i})
    on conflict(id) do ${REPLACE.has(m.id) ? `update set draft = excluded.draft, draft_by = 'seed', draft_at = datetime('now')` : 'nothing'};`)
  console.log((REPLACE.has(m.id) ? 'replace draft: ' : 'add if new:    ') + m.id)
})

const file = join(tmpdir(), 'learn-seed-' + Date.now() + '.sql')
writeFileSync(file, stmts.join('\n'))
try {
  execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', 'handbook', WHERE, '--file', file, '--yes'], { cwd: root, stdio: 'inherit' })
} finally { unlinkSync(file) }
console.log('Done. Drafts only: publish them in the app (Learn, the module, Publish).')
