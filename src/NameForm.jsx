// "Your name" form: staff set their own display name (POST /api/me/name).
// Used on the waiting-for-approval screen and as a prompt inside the handbook.
import { useState } from 'react'
import { api } from './lib/api.js'

export default function NameForm({ initial = '', onSaved, onCancel, label = 'Your full name', saveText = 'Save' }) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const save = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) { setErr('Enter your full name.'); return }
    setBusy(true); setErr('')
    try { await api.setMyName(n); onSaved?.(n) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <form className="nameform" onSubmit={save}>
      <label><span>{label}</span>
        <input value={name} maxLength={80} autoComplete="name" disabled={busy} onChange={e => { setName(e.target.value); setErr('') }} placeholder="e.g. Nur Aisyah binti Ahmad" />
      </label>
      <button className="btn small" disabled={busy} type="submit">{busy ? 'Saving…' : saveText}</button>
      {onCancel && <button className="btn small ghost" type="button" onClick={onCancel}>Cancel</button>}
      {err && <p className="err" role="alert">{err}</p>}
    </form>
  )
}
