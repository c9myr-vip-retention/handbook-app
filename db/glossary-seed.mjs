// Load db/glossary.json into D1 (table glossary). Adds terms that are not in D1
// yet; never overwrites a term an admin has edited, unless named in --replace.
//
//   node db/glossary-seed.mjs            remote
//   node db/glossary-seed.mjs --local    local wrangler database
//   node db/glossary-seed.mjs --replace=<id>[,<id>]
//
// Run db/glossary.sql first to create the table.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WHERE = process.argv.includes('--local') ? '--local' : '--remote'
const REPLACE = new Set((process.argv.find(a => a.startsWith('--replace=')) || '').replace('--replace=', '').split(',').filter(Boolean))
const root = new URL('..', import.meta.url)
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
export const slug = (t) => t.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const { terms } = JSON.parse(readFileSync(new URL('./glossary.json', import.meta.url), 'utf8'))
const stmts = terms.map((t, i) => {
  const id = slug(t.term)
  const vals = [q(id), q(t.cat), q(t.term), q(JSON.stringify(t.aka || [])), q(t.meaning), q(JSON.stringify(t.context || [])), i]
  const onConflict = REPLACE.has(id)
    ? `update set cat = excluded.cat, term = excluded.term, aka = excluded.aka, meaning = excluded.meaning, context = excluded.context, sort = excluded.sort, updated_by = 'seed', updated_at = datetime('now')`
    : 'nothing'
  return `insert into glossary (id, cat, term, aka, meaning, context, sort, updated_by) values (${vals.join(', ')}, 'seed') on conflict(id) do ${onConflict};`
})
const file = join(tmpdir(), 'glossary-seed-' + Date.now() + '.sql')
writeFileSync(file, stmts.join('\n'))
try {
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'handbook', WHERE, '--file', file, '--yes'], { cwd: root, stdio: 'inherit' })
} finally { unlinkSync(file) }
console.log(`Done: ${terms.length} terms (new ones added${REPLACE.size ? ', ' + REPLACE.size + ' replaced' : ''}).`)
