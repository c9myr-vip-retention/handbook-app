// Cloudflare Pages Function: the Handbook API at /api/*.
// Identity comes from Cloudflare Access. Access signs a JWT for every request
// (Cf-Access-Jwt-Assertion); we verify its signature against the team's public
// keys and check the audience, so a forged email header gets nothing. Roles and
// approval live in D1 and are enforced here on every request (D1 has no
// row-level security, so this Worker is the wall).

import { handleLearn } from '../../server/learn.js'

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  // Segments are URL-encoded (an email arrives as name%40gmail.com): decode them.
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(s => {
    try { return decodeURIComponent(s) } catch { return s }
  })
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

  // No token = no Access in front (local dev) -> preview mode. A token that
  // fails verification is rejected outright.
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  let email = null
  if (token) {
    try {
      email = await verifyAccessJwt(token, env)
    } catch (e) {
      return json({ error: 'invalid access token' }, 401)
    }
  } else if (env.DEV_EMAIL && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    // Local testing only (wrangler pages dev): DEV_EMAIL comes from .dev.vars,
    // which is never deployed, and only a localhost address can use it.
    email = String(env.DEV_EMAIL).toLowerCase()
  }

  try {
    // Identity. No email = no Access in front (local dev) -> preview mode.
    if (parts[0] === 'me') {
      if (!email) return json({ email: null })
      const p = await ensureProfile(env, email)
      // POST /api/me/name {name}: anyone signed in (also while waiting for
      // approval, so admins can recognise them) sets their own name.
      if (parts[1] === 'name' && request.method === 'POST') {
        if (p.approved === -1) return json({ error: 'access declined' }, 403)
        const b = await request.json().catch(() => ({}))
        const name = String(b.name || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        if (name.length < 2) return json({ error: 'Enter your working nickname.' }, 400)
        await env.DB.prepare('update profiles set full_name = ? where email = ?').bind(name, email).run()
        return json({ ok: true, full_name: name })
      }
      // Last seen = last app open, written at most every 5 minutes.
      await env.DB.prepare("update profiles set last_seen = datetime('now') where email = ? and (last_seen is null or last_seen < datetime('now', '-5 minutes'))").bind(email).run()
      // approved: 1 approved, 0 pending, -1 rejected. Only exactly 1 gets in.
      return json({ email, full_name: p.full_name, role: p.role, approved: p.approved === 1, rejected: p.approved === -1 })
    }

    // Sign-in hop from the public /login page. Access only lets the request
    // reach here after Google sign-in, so we just send the person back into the
    // app, to the page they asked for (a #/ route only, never another site).
    if (parts[0] === 'login' && request.method === 'GET') {
      const next = url.searchParams.get('next') || ''
      const safe = /^#\/[\w\-/%.]*$/.test(next) ? next : ''
      return new Response(null, { status: 302, headers: { location: url.origin + '/' + safe, 'cache-control': 'no-store' } })
    }

    if (!email) return json({ error: 'unauthenticated' }, 401)
    const me = await ensureProfile(env, email)
    if (me.approved !== 1) return json({ error: me.approved === -1 ? 'access declined' : 'pending approval' }, 403)
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
      if (request.method === 'GET' && parts[1] && !parts[2]) {
        const row = await env.DB.prepare('select * from sops where id = ?').bind(parts[1]).first()
        if (!row) return json({ error: 'not found' }, 404)
        if (row.restricted && !isAdmin) return json({ error: 'restricted' }, 403)
        return json(deserialize(row))
      }
      if (!isAdmin) return json({ error: 'admins only' }, 403)
      // Version history: snapshots taken before each save (newest first).
      if (request.method === 'GET' && parts[1] && parts[2] === 'versions') {
        const { results } = await env.DB.prepare(
          'select id, title, version, edited_by, edited_at from sop_versions where sop_id = ? order by id desc limit 50'
        ).bind(parts[1]).all()
        return json(results)
      }
      // Restore a snapshot: the current state is snapshotted first, so a restore can be undone.
      if (request.method === 'POST' && parts[1] && parts[2] === 'restore' && parts[3]) {
        const v = await env.DB.prepare('select * from sop_versions where id = ? and sop_id = ?').bind(parts[3], parts[1]).first()
        if (!v) return json({ error: 'version not found' }, 404)
        const cur = await env.DB.prepare('select title, body, version from sops where id = ?').bind(parts[1]).first()
        if (!cur) return json({ error: 'not found' }, 404)
        await env.DB.prepare('insert into sop_versions (sop_id, title, body, version, edited_by) values (?,?,?,?,?)')
          .bind(parts[1], cur.title, cur.body, cur.version, email).run()
        await env.DB.prepare(`update sops set title=?, body=?, version=?, updated_by=?, updated_at=datetime('now') where id=?`)
          .bind(v.title, v.body, v.version, email, parts[1]).run()
        return json({ ok: true })
      }
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
        if (Array.isArray(b.meta)) {
          await env.DB.prepare('update sops set meta=? where id=?').bind(JSON.stringify(b.meta), parts[1]).run()
        }
        return json({ ok: true })
      }
      if (request.method === 'DELETE' && parts[1]) {
        await env.DB.prepare('delete from sops where id = ?').bind(parts[1]).run()
        return json({ ok: true })
      }
    }

    // Learn section (guides and quizzes). See server/learn.js.
    if (parts[0] === 'learn') return await handleLearn({ request, env, parts, email, isAdmin, json })

    // Access Management (admin): list everyone who has signed in (approved, pending, rejected).
    // POST   /api/admin/approvals/<email>          approve
    // POST   /api/admin/approvals/<email>/reject   reject (can be approved later)
    // POST   /api/admin/approvals/<email>/role/<admin|reader>   change role
    // POST   /api/admin/approvals/<email>/name     set name, body { name }
    // DELETE /api/admin/approvals/<email>          delete the profile (learning records are kept)
    if (parts[0] === 'admin' && parts[1] === 'approvals') {
      if (!isAdmin) return json({ error: 'admins only' }, 403)
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'select email, full_name, role, approved, created_at, last_seen from profiles order by created_at desc'
        ).all()
        return json(results)
      }
      // Name can be set for anyone, yourself included.
      if (request.method === 'POST' && parts[2] && parts[3] === 'name') {
        const b = await request.json().catch(() => ({}))
        const name = String(b.name || '').trim().slice(0, 80) || null
        const r = await env.DB.prepare('update profiles set full_name = ? where email = ?').bind(name, parts[2]).run()
        if (!r.meta?.changes) return json({ error: 'not found' }, 404)
        return json({ ok: true })
      }
      if (parts[2] && parts[2].toLowerCase() === email.toLowerCase()) return json({ error: 'cannot change your own access' }, 400)
      // Delete: the person loses access now; signing in again starts a new request.
      if (request.method === 'DELETE' && parts[2] && !parts[3]) {
        const r = await env.DB.prepare('delete from profiles where email = ?').bind(parts[2]).run()
        if (!r.meta?.changes) return json({ error: 'not found' }, 404)
        return json({ ok: true })
      }
      if (request.method === 'POST' && parts[2]) {
        if (parts[3] === 'role') {
          if (!['admin', 'reader'].includes(parts[4])) return json({ error: 'role must be admin or reader' }, 400)
          const r = await env.DB.prepare('update profiles set role = ? where email = ? and approved = 1').bind(parts[4], parts[2]).run()
          if (!r.meta?.changes) return json({ error: 'not found' }, 404)
          return json({ ok: true })
        }
        const value = parts[3] === 'reject' ? -1 : parts[3] ? null : 1
        if (value === null) return json({ error: 'not found' }, 404)
        const r = await env.DB.prepare('update profiles set approved = ? where email = ?').bind(value, parts[2]).run()
        if (!r.meta?.changes) return json({ error: 'not found' }, 404)
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

// Verify a Cloudflare Access JWT (RS256) and return its email claim.
// Team domain and audience tag come from wrangler.toml [vars].
let jwksCache = null // { keys: Map<kid, CryptoKey>, at: ms }
async function verifyAccessJwt(token, env) {
  const team = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD
  if (!team || !aud) throw new Error('access not configured')
  const [h, p, s] = token.split('.')
  if (!s) throw new Error('malformed')
  const header = JSON.parse(b64urlText(h))
  const payload = JSON.parse(b64urlText(p))
  if (header.alg !== 'RS256') throw new Error('alg')

  const key = await accessKey(team, header.kid)
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s),
    new TextEncoder().encode(h + '.' + p))
  if (!ok) throw new Error('signature')

  const now = Math.floor(Date.now() / 1000)
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!auds.includes(aud)) throw new Error('aud')
  if (payload.iss !== 'https://' + team) throw new Error('iss')
  if (!payload.exp || payload.exp < now) throw new Error('expired')
  if (!payload.email) throw new Error('no email')
  return String(payload.email).toLowerCase()
}

async function accessKey(team, kid) {
  const fresh = jwksCache && Date.now() - jwksCache.at < 3600e3
  if (!fresh || !jwksCache.keys.has(kid)) {
    const res = await fetch('https://' + team + '/cdn-cgi/access/certs')
    const { keys } = await res.json()
    const map = new Map()
    for (const jwk of keys) {
      map.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']))
    }
    jwksCache = { keys: map, at: Date.now() }
  }
  const key = jwksCache.keys.get(kid)
  if (!key) throw new Error('unknown kid')
  return key
}

function b64urlBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}
function b64urlText(s) { return new TextDecoder().decode(b64urlBytes(s)) }

function deserialize(row) {
  return { ...row, body: safeJson(row.body), meta: safeJson(row.meta), restricted: !!row.restricted }
}
function safeJson(s) { try { return s ? JSON.parse(s) : null } catch { return null } }
