// Publish Learn drafts from the command line, with the same checks as the
// Publish button: a module goes live only if its draft has no shape errors,
// no missing glossary meaning and no [CONFIRM] note. It is pinned to the
// SOP version shown on the SOP page, exactly like server/learn.js does.
//
//   node db/learn-publish.mjs                 dry run: list what would publish (remote)
//   node db/learn-publish.mjs --go            publish every clean draft (remote)
//   node db/learn-publish.mjs --go --only=a,b publish only these ids
//   add --local to use the local wrangler database
import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { shapeErrors, problems, sopVersion } from '../server/learn.js'

const WHERE = process.argv.includes('--local') ? '--local' : '--remote'
const GO = process.argv.includes('--go')
const ONLY = new Set((process.argv.find(a => a.startsWith('--only=')) || '').replace('--only=', '').split(',').filter(Boolean))
const BY = 'claude-for-atl'
const root = new URL('..', import.meta.url)
const WRANGLER = 'node_modules/wrangler/bin/wrangler.js'
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
const d1 = (args) => execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', 'handbook', WHERE, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const rows = JSON.parse(d1(['--json', '--command', 'select m.id, m.draft, m.live, m.sop_version, s.title, s.version, s.meta from learn_modules m join sops s on s.id = m.id order by m.sort']))[0].results
const parse = (s) => { try { return s ? JSON.parse(s) : null } catch { return null } }

const ready = [], blocked = []
for (const r of rows) {
  if (ONLY.size && !ONLY.has(r.id)) continue
  const d = parse(r.draft)
  const bad = [...shapeErrors(d), ...problems(d)]
  const now = sopVersion(r)
  const same = r.live && r.live === r.draft && r.sop_version === now
  if (bad.length) blocked.push([r.id, bad.join(' ')])
  else if (same) console.log('already live: ' + r.id + ' (' + now + ')')
  else ready.push([r.id, now, r.title])
}
for (const [id, v, t] of ready) console.log('ready:   ' + id + ' (' + t + ', SOP ' + v + ')')
for (const [id, why] of blocked) console.log('blocked: ' + id + ': ' + why)

if (!GO) { console.log('\nDry run. Add --go to publish the ready ones.'); process.exit(0) }
if (!ready.length) { console.log('Nothing to publish.'); process.exit(0) }
const file = join(tmpdir(), 'learn-publish-' + Date.now() + '.sql')
writeFileSync(file, ready.map(([id, v]) => `update learn_modules set live = draft, sop_version = ${q(v)}, published_by = ${q(BY)}, published_at = datetime('now') where id = ${q(id)};`).join('\n'))
try { d1(['--file', file, '--yes']) } finally { unlinkSync(file) }
console.log(`\nPublished ${ready.length}.`)
