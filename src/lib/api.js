// Small client for the Cloudflare Pages Functions API (/api/*).
// Identity comes from Cloudflare Access (the Worker reads the Access email
// header); there is no auth code in the browser.

async function req(path, opts = {}) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || ('API ' + res.status))
    err.status = res.status
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
