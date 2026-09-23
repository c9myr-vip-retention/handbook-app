// Generate seed.sql for D1 from the repo content model.
// Every nav leaf becomes a sops row: full block body where we have one, else a
// catalog row carrying section/domain/title/status/keywords/restricted.
//   node db/seed.mjs > db/seed.sql
import { NAV, PAGES, KEYWORDS } from '../src/content/handbook.js'

const q = (s) => (s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'")
const idFor = (it) => it.id || it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const rows = []
function add(it, section, domain) {
  const id = idFor(it)
  const real = it.id && PAGES[it.id]
  const body = real ? JSON.stringify(PAGES[it.id].blocks) : null
  let status = real ? 'live' : (it.status || 'live')
  let restricted = 0
  if (status === 'restricted') { restricted = 1; status = 'live' }
  rows.push(
    'insert or replace into sops (id, section, domain, title, body, version, restricted, status, keywords) values (' +
    [q(id), q(section), q(domain), q(it.title), body ? q(body) : 'NULL', "'V1.0'", restricted, q(status), q(KEYWORDS[it.title] || null)].join(', ') +
    ');'
  )
}
for (const sec of NAV) {
  if (sec.domains) { for (const d of sec.domains) for (const it of d.items) add(it, 'SOP Book', d.name) }
  else { for (const it of sec.items) add(it, sec.name, null) }
}
console.log(rows.join('\n'))
console.error('rows: ' + rows.length)
