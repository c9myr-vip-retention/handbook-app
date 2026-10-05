// Rows -> the reader's { nav, pages }. Holds no handbook content itself, so the
// public app bundle can import it (content only ever arrives from the API).

// Sections are structure, not content: fixed order, fixed ids.
export const SECTIONS = [
  { id: 'start', name: 'Start Here' },
  { id: 'sop', name: 'SOP Book', domains: true },
  { id: 'hr', name: 'HR & People' },
  { id: 'fw', name: 'Frameworks & Strategy' },
  { id: 'lib', name: 'Libraries' },
]

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

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
      // Sub page: subbranch names the parent page's id (Start Here and the other flat sections).
      parent: !sec.domains && r.subbranch ? r.subbranch : undefined,
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
  // Sub pages sit right after their parent, in their own sort order.
  for (const s of nav) if (s.items) {
    const kids = s.items.filter(it => it.parent && s.items.some(p => p.id === it.parent))
    const top = s.items.filter(it => !kids.includes(it))
    s.items = top.flatMap(it => [it, ...kids.filter(k => k.parent === it.id)])
  }
  for (const s of nav) if (s.items) for (const it of s.items) if (it.parent && pages[it.id]) {
    const p = s.items.find(x => x.id === it.parent)
    if (p) pages[it.id].crumb = s.name + ' · ' + p.title
  }
  // Drop empty sections (e.g. a reader who cannot see any row in one).
  return { nav: nav.filter(s => (s.domains ? s.domains.length : s.items.length) > 0), pages }
}

