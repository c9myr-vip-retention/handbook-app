// One content shape for the reader, whatever the source.
//
// The D1 `sops` table is flat (one row per SOP). The reader wants a nav tree
// plus a page map. `toRows` flattens the built-in repo content into rows (the
// seed uses it too), and `fromRows` rebuilds the tree from rows. So the live
// API path and the local preview path go through the same code.

import { NAV, PAGES, KEYWORDS } from '../content/handbook.js'

// Sections are structure, not content: fixed order, fixed ids.
const SECTIONS = [
  { id: 'start', name: 'Start Here' },
  { id: 'sop', name: 'SOP Book', badge: 'sub-project', domains: true },
  { id: 'hr', name: 'HR & People' },
  { id: 'fw', name: 'Frameworks & Strategy' },
  { id: 'lib', name: 'Libraries' },
]

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Repo content -> flat rows, in nav order (sort = position).
export function toRows() {
  const rows = []
  const add = (it, section, domain) => {
    const page = it.id && PAGES[it.id]
    let status = page ? 'live' : (it.status || 'live')
    let restricted = false
    if (status === 'restricted') { restricted = true; status = 'live' }
    rows.push({
      id: it.id || slug(it.title),
      section, domain, title: it.title,
      body: page ? page.blocks : null,
      meta: page ? page.meta || null : null,
      version: 'V1.0', owner: 'ATL',
      restricted, status,
      keywords: KEYWORDS[it.title] || null,
      sort: rows.length + 1,
    })
  }
  for (const sec of NAV) {
    if (sec.domains) { for (const d of sec.domains) for (const it of d.items) add(it, sec.name, d.name) }
    else { for (const it of sec.items) add(it, sec.name, null) }
  }
  return rows
}

// Rows -> { nav, pages }. A row with a non-empty body is a real page; the rest
// are catalog entries that render a status stub.
export function fromRows(rows) {
  const ordered = [...rows].sort((a, b) =>
    (a.sort ?? 1e9) - (b.sort ?? 1e9) || a.title.localeCompare(b.title))
  const pages = {}
  const nav = SECTIONS.map(s => s.domains
    ? { id: s.id, name: s.name, badge: s.badge, domains: [] }
    : { id: s.id, name: s.name, items: [] })

  for (const r of ordered) {
    const sec = nav.find(s => s.name === r.section)
    if (!sec) continue // unknown section: skip rather than invent a place for it
    const real = Array.isArray(r.body) && r.body.length > 0
    const item = {
      id: r.id,
      title: r.title,
      status: real ? undefined : (r.restricted ? 'restricted' : r.status),
      keywords: r.keywords || '',
    }
    if (real) {
      pages[r.id] = {
        title: r.title,
        crumb: r.domain ? 'SOP Book · ' + r.domain : r.section,
        meta: r.meta && r.meta.length ? r.meta : [r.version, 'Owner: ' + r.owner],
        blocks: r.body,
      }
    }
    if (sec.domains) {
      const dname = r.domain || 'Unsorted'
      let d = sec.domains.find(x => x.name === dname)
      if (!d) sec.domains.push(d = { name: dname, items: [] })
      d.items.push(item)
    } else {
      sec.items.push(item)
    }
  }
  // Drop empty sections (e.g. a reader who cannot see any row in one).
  return { nav: nav.filter(s => (s.domains ? s.domains.length : s.items.length) > 0), pages }
}

export const localContent = () => ({ ...fromRows(toRows()), source: 'local' })
