import { useEffect, useState } from 'react'
import { api, signOut } from './lib/api.js'
import Handbook from './Handbook.jsx'

// Auth is handled by Cloudflare Access in front of the app: it does the Google
// login and only lets allowed emails through. The Worker reads the Access email
// and returns the role/approval. Locally (no Access) /api/me returns no email
// and we render the reader UI in preview mode.

export default function App() {
  const [me, setMe] = useState(undefined) // undefined = loading

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe({ email: null }))
  }, [])

  if (me === undefined) return <Centered>Loading…</Centered>
  if (!me.email) return <Handbook preview />
  if (!me.approved) return <Pending email={me.email} />
  return <Handbook profile={{ email: me.email, full_name: me.full_name, role: me.role }} onSignOut={signOut} />
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
