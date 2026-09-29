// One content shape for the reader, whatever the source.
//
// The D1 `sops` table is flat (one row per SOP). The reader wants a nav tree
// plus a page map. `toRows` flattens the built-in repo content into rows (the
// seed uses it too), and `fromRows` rebuilds the tree from rows. So the live
// API path and the local preview path go through the same code.

import { NAV, PAGES, KEYWORDS } from '../content/handbook.js'

import { SECTIONS, slug, fromRows } from './rows.js'
export { slug, fromRows }

// Repo content -> flat rows, in nav order (sort = position).
// `imported` maps row id -> { body, meta, version } converted from the SOP
// markdown (db/content/*.json, built by db/import-md.mjs). It fills catalog
// entries that have no hand-written page yet.
export function toRows(imported = {}) {
  const rows = []
  const add = (it, section, domain) => {
    const id = it.id || slug(it.title)
    const page = it.id && PAGES[it.id]
    const imp = !page && imported[id]
    let status = page || imp ? 'live' : (it.status || 'live')
    let restricted = false
    if (status === 'restricted') { restricted = true; status = 'live' }
    rows.push({
      id, section, domain, title: it.title,
      body: page ? page.blocks : imp ? imp.body : null,
      meta: page ? page.meta || null : imp ? imp.meta : null,
      version: imp ? imp.version : 'V1.0', owner: 'ATL',
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

export const localContent = (imported) => ({ ...fromRows(toRows(imported)), source: 'local' })
