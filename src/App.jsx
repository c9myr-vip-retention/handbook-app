import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import Handbook from './Handbook.jsx'

const hasEnv = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export default function App() {
  // Preview mode: no Supabase configured yet, so show the reader UI directly.
  // This is how the UI loads and stays interactive before the backend is wired.
  if (!hasEnv) return <Handbook preview />

  return <Authed />
}

function Authed() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    let alive = true
    supabase.from('profiles').select('role, approved, full_name, email').eq('id', session.user.id).single()
      .then(({ data }) => { if (alive) setProfile(data) })
    return () => { alive = false }
  }, [session])

  const signOut = () => supabase.auth.signOut()

  if (loading) return <Centered>Loading…</Centered>
  if (!session) return <Login />
  if (!profile) return <Centered>Setting up your profile…</Centered>
  if (!profile.approved) return <Pending email={profile.email} onSignOut={signOut} />
  return <Handbook profile={profile} onSignOut={signOut} />
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
    e.preventDefault(); setMsg('')
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

function Pending({ email, onSignOut }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Almost there</h1>
        <p className="muted">Your account ({email}) is waiting for admin approval. You will get access once an admin approves you.</p>
        <button className="btn" onClick={onSignOut} type="button">Sign out</button>
      </div>
    </div>
  )
}
