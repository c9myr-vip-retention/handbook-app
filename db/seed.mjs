// Generate seed.sql for D1 from the repo content model.
// Rows come from src/lib/content.js toRows(), the same flattening the reader's
// preview path uses, so seed and UI cannot drift apart. Imported SOP bodies
// (db/content/*.json, from db/import-md.mjs) fill the catalog entries.
//   node db/import-md.mjs && node db/seed.mjs > db/seed.sql
import { readdirSync, readFileSync } from 'node:fs'
import { toRows } from '../src/lib/content.js'

const dir = new URL('./content/', import.meta.url)
const imported = {}
for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  imported[j.id] = j
}

const q = (s) => (s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'")
const j = (v) => (v == null ? 'NULL' : q(JSON.stringify(v)))

const rows = toRows(imported).map(r =>
  'insert or replace into sops (id, section, domain, title, body, meta, version, owner, restricted, status, keywords, sort) values (' +
  [q(r.id), q(r.section), q(r.domain), q(r.title), j(r.body), j(r.meta), q(r.version), q(r.owner),
   r.restricted ? 1 : 0, q(r.status), q(r.keywords), r.sort].join(', ') + ');'
)
console.log(rows.join('\n'))
console.error('rows: ' + rows.length + ', with body: ' + toRows(imported).filter(r => r.body).length)
