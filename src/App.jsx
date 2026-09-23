import { useEffect, useState } from 'react'
import { api, signOut } from './lib/api.js'
import { fromRows, localContent } from './lib/content.js'
import Handbook from './Handbook.jsx'

// Auth is handled by Cloudflare Access in front of the app: it does the Google
// login and only lets allowed emails through. The Worker reads the Access email
// and returns the role/approval. Locally (no Access) /api/me returns no email
// and we render the reader UI in preview mode on the built-in repo content.
// Signed in, content comes live from D1 via /api/sops.

export default function App() {
  const [me, setMe] = useState(undefined)           // undefined = loading
  const [content, setContent] = useState(undefined) // { nav, pages, source }
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe({ email: null }))
  }, [])

  useEffect(() => {
    if (me === undefined) return
    if (!me.email) {
      setContent(localContent())
      setNotice('Preview. Showing the built-in sample content, not the live database.')
      return
    }
    if (!me.approved) return
    api.sops()
      .then(rows => { setContent({ ...fromRows(rows), source: 'live' }); setNotice(null) })
      .catch(e => {
        setContent(localContent())
        setNotice('Could not load the live handbook (' + e.message + '). Showing the built-in copy, which may be out of date.')
      })
  }, [me])

  if (me === undefined) return <Centered>Loading…</Centered>
  if (me.email && !me.approved) return <Pending email={me.email} />
  if (content === undefined) return <Centered>Loading handbook…</Centered>
  if (!me.email) return <Handbook content={content} notice={notice} preview />
  return <Handbook content={content} notice={notice}
    profile={{ email: me.email, full_name: me.full_name, role: me.role }} onSignOut={signOut} />
}

function Centered({ children }) {
  return <div className="center"><div className="muted">{children}</div></div>
}

function Pending({ email }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Almost there</h1>
        <p className="muted">Your account ({email}) is waiting for admin approval. You will get access once an admin approves you.</p>
        <button className="btn" onClick={signOut} type="button">Sign out</button>
      </div>
    </div>
  )
}
