// Cloudflare Pages Function: the Handbook API at /api/*.
// Identity comes from Cloudflare Access, which injects the authenticated email
// header. Access has already blocked anyone not allowed by policy, so the
// header is trusted. Roles and approval live in D1 and are enforced here on
// every request (D1 has no row-level security, so this Worker is the wall).

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const email = request.headers.get('Cf-Access-Authenticated-User-Email') || null
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

  try {
    // Identity. No email = no Access in front (local dev) -> preview mode.
    if (parts[0] === 'me') {
      if (!email) return json({ email: null })
      const p = await ensureProfile(env, email)
      return json({ email, full_name: p.full_name, role: p.role, approved: !!p.approved })
    }

    if (!email) return json({ error: 'unauthenticated' }, 401)
    const me = await ensureProfile(env, email)
    if (!me.approved) return json({ error: 'pending approval' }, 403)
    const isAdmin = me.role === 'admin'

    // SOP content
    if (parts[0] === 'sops') {
      if (request.method === 'GET' && !parts[1]) {
        const stmt = isAdmin
          ? env.DB.prepare('select * from sops order by sort, title')
          : env.DB.prepare('select * from sops where restricted = 0 order by sort, title')
        const { results } = await stmt.all()
        return json(results.map(deserialize))
      }
      if (request.method === 'GET' && parts[1]) {
        const row = await env.DB.prepare('select * from sops where id = ?').bind(parts[1]).first()
        if (!row) return json({ error: 'not found' }, 404)
        if (row.restricted && !isAdmin) return json({ error: 'restricted' }, 403)
        return json(deserialize(row))
      }
      if (!isAdmin) return json({ error: 'admins only' }, 403)
      if (request.method === 'POST') {
        const b = await request.json()
        const id = b.id || crypto.randomUUID()
        await env.DB.prepare(
          `insert into sops (id, section, domain, subbranch, title, category, body, version, owner, restricted, status, keywords, updated_by)
           values (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(id, b.section, b.domain || null, b.subbranch || null, b.title, b.category || null,
          JSON.stringify(b.body || []), b.version || 'V1.0', b.owner || 'ATL',
          b.restricted ? 1 : 0, b.status || 'live', b.keywords || null, email).run()
        return json({ id })
      }
      if (request.method === 'PUT' && parts[1]) {
        const b = await request.json()
        const prev = await env.DB.prepare('select title, body, version from sops where id = ?').bind(parts[1]).first()
        if (prev) {
          await env.DB.prepare('insert into sop_versions (sop_id, title, body, version, edited_by) values (?,?,?,?,?)')
            .bind(parts[1], prev.title, prev.body, prev.version, email).run()
        }
        await env.DB.prepare(
          `update sops set title=?, category=?, body=?, version=?, restricted=?, status=?, keywords=?, updated_by=?, updated_at=datetime('now') where id=?`
        ).bind(b.title, b.category || null, JSON.stringify(b.body || []), b.version || 'V1.0',
          b.restricted ? 1 : 0, b.status || 'live', b.keywords || null, email, parts[1]).run()
        return json({ ok: true })
      }
      if (request.method === 'DELETE' && parts[1]) {
        await env.DB.prepare('delete from sops where id = ?').bind(parts[1]).run()
        return json({ ok: true })
      }
    }

    // Approvals (admin): list pending, approve one
    if (parts[0] === 'admin' && parts[1] === 'approvals') {
      if (!isAdmin) return json({ error: 'admins only' }, 403)
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare('select email, full_name, role, approved from profiles where approved = 0').all()
        return json(results)
      }
      if (request.method === 'POST' && parts[2]) {
        await env.DB.prepare('update profiles set approved = 1 where email = ?').bind(parts[2]).run()
        return json({ ok: true })
      }
    }

    return json({ error: 'not found' }, 404)
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500)
  }
}

async function ensureProfile(env, email) {
  let p = await env.DB.prepare('select * from profiles where email = ?').bind(email).first()
  if (!p) {
    const approved = email.toLowerCase().endsWith('@orionesofttech.com') ? 1 : 0
    await env.DB.prepare('insert into profiles (email, approved) values (?, ?) on conflict(email) do nothing')
      .bind(email, approved).run()
    p = await env.DB.prepare('select * from profiles where email = ?').bind(email).first()
  }
  return p
}

function deserialize(row) {
  return { ...row, body: safeJson(row.body), meta: safeJson(row.meta), restricted: !!row.restricted }
}
function safeJson(s) { try { return s ? JSON.parse(s) : null } catch { return null } }
