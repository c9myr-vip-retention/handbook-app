import { useEffect, useState } from 'react'
import { api, signOut } from './lib/api.js'
import { fromRows } from './lib/rows.js'
import Handbook from './Handbook.jsx'
import NameForm from './NameForm.jsx'

// Auth is handled by Cloudflare Access. In production only /api (and the flow
// chart images) sit behind Access; the app shell itself is public and holds no
// handbook content. So the shell asks /api/me first: signed out (Access
// intercepts the call) -> send the visitor to /login. Signed in, content comes
// live from D1 via /api/sops.
//
// Locally (npm run dev, no Access) /api/me returns no email and the reader runs
// in preview mode on the repo content, which is only loaded in development
// builds so it never ships in the public bundle.

const goLogin = () => {
  const next = /^#\/[\w\-/%.]*$/.test(location.hash) ? location.hash : ''
  location.replace('/login/' + (next ? '?next=' + encodeURIComponent(next) : ''))
}

async function previewContent() {
  const [{ IMPORTED }, { localContent }] = await Promise.all([import('./lib/imported.js'), import('./lib/content.js')])
  return localContent(IMPORTED)
}

export default function App() {
  const [me, setMe] = useState(undefined)           // undefined = loading
  const [content, setContent] = useState(undefined) // { nav, pages, source }
  const [notice, setNotice] = useState(null)
  const [failed, setFailed] = useState(null)

  useEffect(() => {
    api.me()
      .then(m => {
        if (!m.email && !import.meta.env.DEV) return goLogin()
        setMe(m)
      })
      .catch(e => {
        if (e.status === 401) return goLogin()
        if (import.meta.env.DEV) return setMe({ email: null })
        setFailed(e.message)
      })
  }, [])

  useEffect(() => {
    if (me === undefined) return
    if (!me.email) {
      if (!import.meta.env.DEV) return
      previewContent().then(setContent)
      setNotice('Preview mode: sample content only. Nothing you change here is saved.')
      return
    }
    if (!me.approved) return
    api.sops()
      .then(rows => { setContent({ ...fromRows(rows), source: 'live' }); setNotice(null) })
      .catch(e => (e.status === 401 ? goLogin() : setFailed(e.message)))
  }, [me])

  // After an edit or restore: reload live rows, or in preview patch the local copy.
  const onPageSaved = async (id, patch) => {
    if (me?.email) {
      const rows = await api.sops()
      setContent({ ...fromRows(rows), source: 'live' })
    } else if (patch) {
      setContent(c => ({ ...c, pages: { ...c.pages, [id]: { ...c.pages[id], ...patch } } }))
    }
  }

  if (failed) return <Failed message={failed} />
  if (me === undefined) return <Centered>Loading…</Centered>
  if (me.email && me.rejected) return <Declined email={me.email} />
  if (me.email && !me.approved) return <Pending email={me.email} name={me.full_name} onName={n => setMe(m => ({ ...m, full_name: n }))} />
  if (content === undefined) return <Centered>Loading handbook…</Centered>
  if (!me.email) return <Handbook content={content} notice={notice} preview onPageSaved={onPageSaved} />
  return <Handbook content={content} notice={notice}
    profile={{ email: me.email, full_name: me.full_name, role: me.role }} onSignOut={signOut} onPageSaved={onPageSaved}
    onName={n => setMe(m => ({ ...m, full_name: n }))} />
}

function Centered({ children }) {
  return <div className="center"><div className="muted">{children}</div></div>
}

function Failed({ message }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Couldn't load the handbook</h1>
        <p className="muted">{message}</p>
        <button className="btn" onClick={() => location.reload()} type="button">Try again</button>
      </div>
    </div>
  )
}

function Declined({ email }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Access declined</h1>
        <p className="muted">Your account ({email}) was not approved for the handbook. If you think this is a mistake, ask your superior.</p>
        <button className="btn" onClick={signOut} type="button">Sign out</button>
      </div>
    </div>
  )
}

function Pending({ email, name, onName }) {
  const [saved, setSaved] = useState(!!name)
  return (
    <div className="center">
      <div className="card">
        <h1>Almost there</h1>
        <p className="muted">Your account ({email}) is waiting for an admin to approve it. Once approved, reload this page to open the handbook. Need it sooner? Ask your superior.</p>
        {saved
          ? <p className="small">Name on your request: <b>{name}</b> <button className="crumblink" type="button" onClick={() => setSaved(false)}>Change</button></p>
          : <NameForm initial={name || ''} label="Your full name, so the admin knows who you are" onSaved={n => { onName(n); setSaved(true) }} />}
        <button className="btn" onClick={signOut} type="button">Sign out</button>
      </div>
    </div>
  )
}
