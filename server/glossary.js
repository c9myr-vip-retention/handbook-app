// Work glossary API (table glossary, see db/glossary.sql).
//   GET    /api/glossary          every approved user
//   POST   /api/glossary          admins: create or update { id?, cat, term, aka[], meaning, context[[task, meaning]] }
//   DELETE /api/glossary/<id>     admins
const slug = (t) => String(t).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const parse = (s) => { try { return JSON.parse(s) } catch { return [] } }
const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n)

export async function handleGlossary({ request, env, parts, email, isAdmin, json }) {
  const DB = env.DB
  if (request.method === 'GET' && !parts[1]) {
    const { results } = await DB.prepare('select * from glossary order by cat, sort, term').all()
    return json(results.map(r => ({ ...r, aka: parse(r.aka), context: parse(r.context) })))
  }
  if (!isAdmin) return json({ error: 'admins only' }, 403)
  if (request.method === 'POST' && !parts[1]) {
    const b = await request.json().catch(() => ({}))
    const term = clean(b.term, 80), meaning = clean(b.meaning, 600), cat = clean(b.cat, 40) || 'Other'
    if (!term || !meaning) return json({ error: 'A term and its meaning are both needed.' }, 400)
    const aka = (Array.isArray(b.aka) ? b.aka : []).map(a => clean(a, 40)).filter(Boolean).slice(0, 12)
    const context = (Array.isArray(b.context) ? b.context : []).filter(c => Array.isArray(c) && c[0] && c[1]).map(([t, m]) => [clean(t, 40), clean(m, 400)]).slice(0, 8)
    const id = b.id || slug(term)
    if (!id) return json({ error: 'That term has no usable letters.' }, 400)
    if (!b.id && await DB.prepare('select 1 from glossary where id = ?').bind(id).first()) return json({ error: 'That term is already in the glossary.' }, 409)
    await DB.prepare(`insert into glossary (id, cat, term, aka, meaning, context, sort, updated_by) values (?,?,?,?,?,?, (select coalesce(max(sort), 0) + 1 from glossary), ?)
      on conflict(id) do update set cat = excluded.cat, term = excluded.term, aka = excluded.aka, meaning = excluded.meaning, context = excluded.context, updated_by = excluded.updated_by, updated_at = datetime('now')`)
      .bind(id, cat, term, JSON.stringify(aka), meaning, JSON.stringify(context), email).run()
    return json({ ok: true, id })
  }
  if (request.method === 'DELETE' && parts[1]) {
    const r = await DB.prepare('delete from glossary where id = ?').bind(parts[1]).run()
    if (!r.meta?.changes) return json({ error: 'not found' }, 404)
    return json({ ok: true })
  }
  return json({ error: 'not found' }, 404)
}
