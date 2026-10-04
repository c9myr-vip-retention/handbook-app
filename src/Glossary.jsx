// Work glossary (#/glossary): niche terms with plain meanings, grouped and
// searchable, each linked to the SOP pages that use it. Data from /api/glossary;
// admins add, edit and delete terms in place.
import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api.js'

const CATS = ['Money and bonuses', 'Players and segments', 'Flags and safety', 'Tools and files', 'Channels and messaging', 'Other']
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c)
const keysOf = (g) => [g.term.replace(/\s*\(.*?\)\s*/g, ' ').trim(), ...(g.aka || [])].filter(k => k && k.length >= 2)

// SOP pages that mention a term: short all-caps forms (SW, BO, LTV) match case-sensitively
// as whole words, longer names match case-insensitively.
function usedIn(g, texts) {
  const res = keysOf(g).map(k => /^[A-Z0-9&./+-]{2,6}$/.test(k) ? new RegExp('(^|[^A-Za-z0-9])' + esc(k) + '([^A-Za-z0-9]|$)') : new RegExp(esc(k), 'i'))
  return texts.filter(t => res.some(re => re.test(t.text))).slice(0, 6)
}

export function GlossaryPage({ go, pages: PAGES, canEdit }) {
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null) // term id being edited, or 'new'
  const load = () => api.glossary().then(setList, e => setErr(e.message))
  useEffect(() => { load() }, [])
  const texts = useMemo(() => Object.entries(PAGES || {}).filter(([, p]) => /^SOP Book/.test(p.crumb || ''))
    .map(([id, p]) => ({ id, title: p.title, text: p.title + ' ' + JSON.stringify(p.blocks || []) })), [PAGES])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (list || []).filter(g => !s || [g.term, g.meaning, ...(g.aka || [])].some(x => String(x).toLowerCase().includes(s)))
  }, [list, q])
  const groups = CATS.map(c => [c, shown.filter(g => (CATS.includes(g.cat) ? g.cat : 'Other') === c).sort((a, b) => a.term.localeCompare(b.term))]).filter(([, l]) => l.length)

  return (
    <div className="view doc gloss">
      <h1>Glossary</h1>
      <p className="lead">Work words in plain language. Tap a page under a term to see it used in an SOP.</p>
      <input className="gloss-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a word, for example SW, turnover or DSLD" aria-label="Find a word in the glossary" />
      {err && <p className="err" role="alert">{err}</p>}
      {!list && !err && <p className="muted">Loading…</p>}
      {canEdit && list && (edit === 'new'
        ? <TermForm onDone={() => { setEdit(null); load() }} onCancel={() => setEdit(null)} />
        : <div className="learn-links"><button className="btn small ghost" onClick={() => setEdit('new')}>Add a term</button></div>)}
      {list && shown.length === 0 && <div className="stubbox">No word matches “{q.trim()}”. Try a shorter word{canEdit ? ', or add it' : ''}.</div>}
      {groups.map(([cat, items]) => (
        <section key={cat} aria-labelledby={'g-' + cat}>
          <h2 id={'g-' + cat} className="learn-cat">{cat}</h2>
          <dl className="gloss-list">
            {items.map(g => edit === g.id
              ? <div key={g.id} className="gloss-item"><TermForm g={g} onDone={() => { setEdit(null); load() }} onCancel={() => setEdit(null)} /></div>
              : <div key={g.id} className="gloss-item">
                  <dt>{g.term}{g.aka?.length > 0 && <span className="gloss-aka"> also: {g.aka.join(', ')}</span>}</dt>
                  <dd>
                    <p>{g.meaning}</p>
                    {g.context?.length > 0 && <ul className="gloss-ctx">{g.context.map(([t, m]) => <li key={t}><b>{t}:</b> {m}</li>)}</ul>}
                    {(() => { const u = usedIn(g, texts); return u.length > 0 && (
                      <p className="gloss-used">Used in: {u.map((p, i) => <span key={p.id}>{i > 0 && ', '}<button className="crumblink" onClick={() => go({ kind: 'page', key: p.id })}>{p.title}</button></span>)}</p>) })()}
                    {canEdit && <div className="gloss-admin">
                      <button className="crumblink" onClick={() => setEdit(g.id)}>Edit</button>
                      <button className="crumblink danger-link" onClick={async () => { if (confirm('Delete "' + g.term + '" from the glossary?')) { try { await api.glossaryDelete(g.id); load() } catch (e) { setErr(e.message) } } }}>Delete</button>
                    </div>}
                  </dd>
                </div>)}
          </dl>
        </section>
      ))}
    </div>
  )
}

function TermForm({ g, onDone, onCancel }) {
  const [term, setTerm] = useState(g?.term || '')
  const [aka, setAka] = useState((g?.aka || []).join(', '))
  const [cat, setCat] = useState(g?.cat || CATS[0])
  const [meaning, setMeaning] = useState(g?.meaning || '')
  const [ctx, setCtx] = useState((g?.context || []).map(([t, m]) => t + ': ' + m).join('\n'))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      await api.glossarySave({
        id: g?.id, term, cat, meaning,
        aka: aka.split(',').map(s => s.trim()).filter(Boolean),
        context: ctx.split('\n').map(l => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null }).filter(Boolean),
      })
      onDone()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <form className="gloss-form" onSubmit={save}>
      <div className="led-grid">
        <label className="led-field"><span>Term</span><input value={term} onChange={e => setTerm(e.target.value)} maxLength={80} required /></label>
        <label className="led-field"><span>Group</span><select value={cat} onChange={e => setCat(e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="led-field"><span>Other names and short forms (comma between)</span><input value={aka} onChange={e => setAka(e.target.value)} placeholder="SW, Secret Wallet" /></label>
      <label className="led-field"><span>Plain meaning</span><textarea rows="3" value={meaning} onChange={e => setMeaning(e.target.value)} maxLength={600} required /></label>
      <label className="led-field"><span>Meaning by task, if it differs (one per line, as "Task: meaning")</span><textarea rows="2" value={ctx} onChange={e => setCtx(e.target.value)} placeholder="Grace: ..." /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="learn-links"><button className="btn small" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="btn small ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  )
}
