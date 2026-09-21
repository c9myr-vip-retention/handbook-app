import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'

// Auth-gated shell. This is the skeleton: login, approval gate, and the app
// frame. Next step is to wire the reader pages and admin editor to the `sops`
// table, porting the prototype UI (the published Artifact) into components.

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    let alive = true
    supabase
      .from('profiles')
      .select('role, approved, full_name, email')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => { if (alive) setProfile(data) })
    return () => { alive = false }
  }, [session])

  if (loading) return <Centered>Loading…</Centered>
  if (!session) return <Login />
  if (!profile) return <Centered>Setting up your profile…</Centered>
  if (!profile.approved) return <Pending email={profile.email} />
  return <Shell profile={profile} />
}

function Centered({ children }) {
  return <div className="center"><div className="muted">{children}</div></div>
}

function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')

  const google = () => supabase.auth.signInWithOAuth({ provider: 'google' })

  const signin = async (e) => {
    e.preventDefault()
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setMsg(error.message)
  }

  return (
    <div className="center">
      <div className="card">
        <h1>C9MYR Handbook</h1>
        <p className="muted">Goals, SOPs, and the way we work.</p>
        <button className="btn google" onClick={google} type="button">Continue with Google</button>
        <div className="or"><span>or</span></div>
        <form onSubmit={signin}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@orionesofttech.com" />
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} />
          <button className="btn" type="submit">Sign in</button>
        </form>
        {msg && <p className="err">{msg}</p>}
        <p className="muted small">New staff sign in with Google. Personal emails need a one-time admin approval.</p>
      </div>
    </div>
  )
}

function Pending({ email }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Almost there</h1>
        <p className="muted">Your account ({email}) is waiting for admin approval. You will get access once an admin approves you.</p>
        <button className="btn" onClick={() => supabase.auth.signOut()} type="button">Sign out</button>
      </div>
    </div>
  )
}

function Shell({ profile }) {
  const sections = ['Start Here', 'SOP Book', 'HR & People', 'Frameworks & Strategy', 'Libraries']
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">C9MYR Handbook</div>
        {sections.map(s => <div key={s} className="navitem">{s}</div>)}
      </aside>
      <main className="main">
        <header className="top">
          <span>Welcome, {profile.full_name || profile.email}</span>
          <span className="role">{profile.role}</span>
          <button className="btn small" onClick={() => supabase.auth.signOut()} type="button">Sign out</button>
        </header>
        <div className="content">
          <h1>Handbook</h1>
          <p className="muted">
            Content loads from the <code>sops</code> table. Next step: wire the reader pages and
            the admin editor to the database, porting the prototype UI.
          </p>
          {profile.role === 'admin' && (
            <p className="muted">You are an admin, so you will be able to add and edit entries and approve new sign-ins here.</p>
          )}
        </div>
      </main>
    </div>
  )
}
