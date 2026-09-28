// Small client for the Cloudflare Pages Functions API (/api/*).
// Identity comes from Cloudflare Access (the Worker reads the Access email
// header); there is no auth code in the browser.

// Plain-language errors for staff. The raw server text stays on err.detail
// and in the console for debugging.
const FRIENDLY = {
  401: 'Your sign-in has expired. Reload the page to sign in again.',
  403: "You don't have permission to do that.",
  404: "That couldn't be found. It may have been renamed or removed.",
}
const SERVER = 'Something went wrong on our side. Try again in a minute. If it keeps happening, tell an admin.'

async function req(path, opts = {}) {
  let res
  try {
    res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts })
  } catch (e) {
    throw Object.assign(new Error("Can't reach the handbook. Check your connection and try again."), { detail: String(e) })
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(FRIENDLY[res.status] || SERVER)
    err.status = res.status
    err.detail = body.error || ('API ' + res.status)
    console.error(path, res.status, err.detail)
    throw err
  }
  return res.json()
}

export const api = {
  me: () => req('/api/me'),
  sops: () => req('/api/sops'),
  sop: (id) => req('/api/sops/' + encodeURIComponent(id)),
  saveSop: (id, data) => req('/api/sops/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) }),
  createSop: (data) => req('/api/sops', { method: 'POST', body: JSON.stringify(data) }),
  versions: (id) => req('/api/sops/' + encodeURIComponent(id) + '/versions'),
  restore: (id, vid) => req('/api/sops/' + encodeURIComponent(id) + '/restore/' + vid, { method: 'POST' }),
  approvals: () => req('/api/admin/approvals'),
  approve: (email) => req('/api/admin/approvals/' + encodeURIComponent(email), { method: 'POST' }),
}

// Cloudflare Access logout URL.
export const signOut = () => { window.location.href = '/cdn-cgi/access/logout' }
