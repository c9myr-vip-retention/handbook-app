// Admin editor for a Learn module's DRAFT: words, the guide cards (including the
// calculator numbers) and the quiz. Saving never changes what staff see; the
// module page's Publish button does that, and the server refuses to publish
// while anything is missing or marked [CONFIRM].
import { useEffect, useRef, useState } from 'react'
import { api } from './lib/api.js'

const clone = (x) => JSON.parse(JSON.stringify(x))
const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a }
const newId = () => 'q-' + Math.random().toString(36).slice(2, 8)

const KINDS = {
  check: 'Tick list (for example "When")',
  steps: 'Numbered steps (for example "Do")',
  never: 'Hard stops (for example "Never")',
  gate: 'Yes / no question (for example "Approver")',
  calc: 'Calculator (for example "Numbers")',
}
const blankCard = (kind) => ({
  key: kind + '-' + Math.random().toString(36).slice(2, 6), label: '', kind, title: '', sec: '', secLabel: '',
  ...(kind === 'check' ? { items: [], done: '', notYet: '' } : {}),
  ...(kind === 'steps' || kind === 'never' ? { items: [] } : {}),
  ...(kind === 'gate' ? { q: '', yes: '', no: '' } : {}),
  ...(kind === 'calc' ? { calc: { tiers: [['3', 'Tier 3'], ['V', 'Tier V']], baseLabel: '', bases: [] } } : {}),
})

export function LearnEditor({ id, go }) {
  const [orig, setOrig] = useState(null)
  const [c, setC] = useState(null)
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const [problems, setProblems] = useState([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    api.learnModule(id, true).then(d => { setOrig(d.content); setC(clone(d.content)); setTitle(d.title); setProblems(d.problems || []) }, e => setErr(e.message))
  }, [id])
  const dirty = c && orig && JSON.stringify(c) !== JSON.stringify(orig)
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  if (err && !c) return <div className="view doc"><p className="err" role="alert">{err}</p></div>
  if (!c) return <div className="view doc"><p className="muted">Loading…</p></div>

  const set = (fn) => setC(prev => { const n = clone(prev); fn(n); return n })
  const save = async () => {
    setBusy(true); setErr(''); setSaved('')
    try {
      const r = await api.learnSaveDraft(id, c)
      setOrig(clone(c)); setProblems(r.problems || []); setSaved('Draft saved. Staff still see the published version until you publish.')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const leave = () => { if (!dirty || confirm('Leave without saving? Your changes to this draft will be lost.')) go({ kind: 'learn', key: id }) }

  return (
    <div className="view doc led">
      <div className="crumb"><button className="crumblink" onClick={() => go({ kind: 'learn' })}>Learn</button> / <button className="crumblink" onClick={leave}>{title}</button> / <b>Edit draft</b></div>
      <h1>Edit draft: {title}</h1>
      <p className="lead">Changes are saved to the draft only. Staff keep seeing the published guide until you press Publish on the module page.</p>

      <div className="led-bar" role="region" aria-label="Save">
        <span className={'small ' + (dirty ? 'led-dirty' : 'muted')}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button className="btn small ghost" onClick={leave}>Back to the module</button>
        <button className="btn small ghost" disabled={!dirty || busy} onClick={() => setC(clone(orig))}>Discard changes</button>
        <button className="btn small" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save draft'}</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {saved && <p className="small led-ok" role="status">{saved}</p>}
      {problems.length > 0 && (
        <div className="callout warn" role="status"><div><b>Before this can be published</b><ul className="bullets">{problems.map(p => <li key={p}>{p}</li>)}</ul></div></div>
      )}

      <section className="led-sec" aria-labelledby="led-basics">
        <h2 id="led-basics">Basics</h2>
        <Field label="Minutes to read the guide"><input type="number" min="1" max="60" value={c.minutes ?? ''} onChange={e => set(n => { n.minutes = Number(e.target.value) || '' })} /></Field>
      </section>

      <section className="led-sec" aria-labelledby="led-words">
        <h2 id="led-words">Words you need</h2>
        <p className="muted small">Each term a beginner meets on this SOP, with a one-line meaning in plain words.</p>
        {(c.words || []).map(([t, d], i) => (
          <div className="led-row" key={i}>
            <Field label={`Term ${i + 1}`}><input value={t || ''} onChange={e => set(n => { n.words[i][0] = e.target.value })} /></Field>
            <Field label="Meaning"><textarea rows="2" value={d || ''} onChange={e => set(n => { n.words[i][1] = e.target.value || null })} /></Field>
            <RowTools i={i} len={c.words.length} what={`term ${i + 1}`} onMove={d2 => set(n => { n.words = move(n.words, i, d2) })} onRemove={() => set(n => { n.words.splice(i, 1) })} />
          </div>
        ))}
        <button className="btn small ghost" onClick={() => set(n => { n.words = [...(n.words || []), ['', null]] })}>Add a term</button>
      </section>

      <section className="led-sec" aria-labelledby="led-cards">
        <h2 id="led-cards">The 30-second version (cards)</h2>
        {(c.tour || []).map((card, i) => (
          <fieldset className="led-card" key={card.key || i}>
            <legend>Card {i + 1}: {card.label || 'untitled'} <span className="chip ver">{KINDS[card.kind]?.split(' (')[0] || card.kind}</span></legend>
            <div className="led-grid">
              <Field label="Tab label (one word)"><input value={card.label || ''} onChange={e => set(n => { n.tour[i].label = e.target.value })} /></Field>
              <Field label="Card title"><input value={card.title || ''} onChange={e => set(n => { n.tour[i].title = e.target.value })} /></Field>
              <Field label="Official rule: SOP section name" hint='Start of the heading, without its number, for example "Step 5" or "Guards".'><input value={card.sec || ''} onChange={e => set(n => { n.tour[i].sec = e.target.value })} /></Field>
              <Field label="Official rule: link text"><input value={card.secLabel || ''} onChange={e => set(n => { n.tour[i].secLabel = e.target.value })} /></Field>
            </div>
            <CardBody card={card} onChange={fn => set(n => fn(n.tour[i]))} />
            <RowTools i={i} len={c.tour.length} what={`card ${i + 1}`} onMove={d => set(n => { n.tour = move(n.tour, i, d) })} onRemove={() => set(n => { n.tour.splice(i, 1) })} />
          </fieldset>
        ))}
        <AddCard onAdd={kind => set(n => { n.tour = [...(n.tour || []), blankCard(kind)] })} />
      </section>

      <section className="led-sec" aria-labelledby="led-quiz">
        <h2 id="led-quiz">Quiz</h2>
        <div className="led-grid three">
          <Field label="Questions per attempt"><input type="number" min="1" max="20" value={c.quiz.count} onChange={e => set(n => { n.quiz.count = Number(e.target.value) || 1 })} /></Field>
          <Field label="Pass mark (%)"><input type="number" min="1" max="100" value={c.quiz.pass} onChange={e => set(n => { n.quiz.pass = Number(e.target.value) || 80 })} /></Field>
          <Field label="Seconds per question"><input type="number" min="10" max="600" value={c.quiz.seconds} onChange={e => set(n => { n.quiz.seconds = Number(e.target.value) || 60 })} /></Field>
        </div>
        <p className="muted small">Each attempt picks {c.quiz.count} of the {c.quiz.pool.length} questions below at random. Keep more questions than that so retakes differ. Write scenarios from real shifts.</p>
        {c.quiz.pool.map((q, i) => (
          <fieldset className="led-card" key={q.id}>
            <legend>Question {i + 1}</legend>
            <Field label="Question"><textarea rows="2" value={q.q} onChange={e => set(n => { n.quiz.pool[i].q = e.target.value })} /></Field>
            <div className="led-opts" role="radiogroup" aria-label={`Correct answer for question ${i + 1}`}>
              {q.o.map((o, k) => (
                <div className="led-opt" key={k}>
                  <label className="led-correct"><input type="radio" name={'correct-' + q.id} checked={q.a === k} onChange={() => set(n => { n.quiz.pool[i].a = k })} /> Correct</label>
                  <input aria-label={`Answer ${k + 1}`} value={o} onChange={e => set(n => { n.quiz.pool[i].o[k] = e.target.value })} />
                  <button className="icon" aria-label={`Remove answer ${k + 1}`} disabled={q.o.length <= 2} onClick={() => set(n => { const x = n.quiz.pool[i]; x.o.splice(k, 1); if (x.a >= x.o.length) x.a = x.o.length - 1; else if (x.a > k) x.a-- })}>✕</button>
                </div>
              ))}
              {q.o.length < 6 && <button className="btn small ghost" onClick={() => set(n => { n.quiz.pool[i].o.push('') })}>Add an answer</button>}
            </div>
            <Field label="Why (shown after answering)"><textarea rows="2" value={q.why} onChange={e => set(n => { n.quiz.pool[i].why = e.target.value })} /></Field>
            <RowTools i={i} len={c.quiz.pool.length} what={`question ${i + 1}`} onMove={d => set(n => { n.quiz.pool = move(n.quiz.pool, i, d) })} onRemove={() => set(n => { n.quiz.pool.splice(i, 1) })} />
          </fieldset>
        ))}
        <button className="btn small ghost" onClick={() => set(n => { n.quiz.pool.push({ id: newId(), q: '', o: ['', '', '', ''], a: 0, why: '' }) })}>Add a question</button>
      </section>
    </div>
  )
}

function Field({ label, hint, children }) {
  return <label className="led-field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>
}

function RowTools({ i, len, what, onMove, onRemove }) {
  return (
    <div className="led-tools">
      <button className="icon" aria-label={`Move ${what} up`} disabled={i === 0} onClick={() => onMove(-1)}>↑</button>
      <button className="icon" aria-label={`Move ${what} down`} disabled={i === len - 1} onClick={() => onMove(1)}>↓</button>
      <button className="btn small ghost" onClick={() => { if (confirm(`Remove ${what}?`)) onRemove() }}>Remove</button>
    </div>
  )
}

function AddCard({ onAdd }) {
  const [kind, setKind] = useState('check')
  return (
    <div className="led-add">
      <label className="led-field"><span>New card type</span>
        <select value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(KINDS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
      </label>
      <button className="btn small ghost" onClick={() => onAdd(kind)}>Add a card</button>
    </div>
  )
}

// One line per item; for steps, "Name: what to do" per line.
function Lines({ label, value, onChange, pairs }) {
  const text = (value || []).map(x => (pairs ? `${x[0]}: ${x[1]}` : x)).join('\n')
  const [draft, setDraft] = useState(text)
  // Typing updates the content straight away; outside changes (Discard) refresh the box.
  const typed = useRef(false)
  useEffect(() => { if (typed.current) { typed.current = false; return } setDraft(text) }, [text])
  const change = (t) => {
    setDraft(t); typed.current = true
    const lines = t.split('\n').map(s => s.trim()).filter(Boolean)
    onChange(pairs ? lines.map(l => { const at = l.indexOf(':'); return at > 0 ? [l.slice(0, at).trim(), l.slice(at + 1).trim()] : [l, ''] }) : lines)
  }
  return (
    <Field label={label} hint={pairs ? 'One step per line, as "Name: what to do".' : 'One per line.'}>
      <textarea rows={Math.max(3, (value || []).length + 1)} value={draft} onChange={e => change(e.target.value)} />
    </Field>
  )
}

function CardBody({ card, onChange }) {
  if (card.kind === 'check') return (
    <>
      <Lines label="Things to tick" value={card.items} onChange={v => onChange(x => { x.items = v })} />
      <div className="led-grid">
        <Field label="Message when all are ticked"><input value={card.done || ''} onChange={e => onChange(x => { x.done = e.target.value })} /></Field>
        <Field label="Message until then"><input value={card.notYet || ''} onChange={e => onChange(x => { x.notYet = e.target.value })} /></Field>
      </div>
    </>
  )
  if (card.kind === 'steps') return <Lines label="Steps" pairs value={card.items} onChange={v => onChange(x => { x.items = v })} />
  if (card.kind === 'never') return <Lines label="Hard stops" value={card.items} onChange={v => onChange(x => { x.items = v })} />
  if (card.kind === 'gate') return (
    <div className="led-grid">
      <Field label="Question"><input value={card.q || ''} onChange={e => onChange(x => { x.q = e.target.value })} /></Field>
      <span />
      <Field label='Answer when "Yes"'><textarea rows="2" value={card.yes || ''} onChange={e => onChange(x => { x.yes = e.target.value })} /></Field>
      <Field label='Answer when "No"'><textarea rows="2" value={card.no || ''} onChange={e => onChange(x => { x.no = e.target.value })} /></Field>
    </div>
  )
  if (card.kind === 'calc') return <CalcEditor calc={card.calc} onChange={fn => onChange(x => fn(x.calc))} />
  return null
}

// Calculator numbers: per base (for example "Has SW" / "No SW") and per tier,
// the percent, the floor (optional) and the max. Results round down to an amount ending in 8.
function CalcEditor({ calc, onChange }) {
  const tiers = calc.tiers || []
  const num = (v) => (v === '' ? '' : Number(v))
  return (
    <div className="led-calc">
      <Field label="Choice label above the bases"><input value={calc.baseLabel || ''} onChange={e => onChange(x => { x.baseLabel = e.target.value })} /></Field>
      <p className="muted small">Tiers: {tiers.map(t => t[1]).join(', ')}. Amounts round down to the nearest amount ending in 8; below the floor the floor is used, above the max the max.</p>
      {(calc.bases || []).map((b, i) => (
        <fieldset className="led-base" key={i}>
          <legend>Base {i + 1}: {b.label || 'untitled'}</legend>
          <div className="led-grid">
            <Field label="Button label"><input value={b.label || ''} onChange={e => onChange(x => { x.bases[i].label = e.target.value })} /></Field>
            <Field label="Amount box label"><input value={b.input || ''} onChange={e => onChange(x => { x.bases[i].input = e.target.value })} /></Field>
          </div>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Tier</th><th>Percent</th><th>Floor (RM, optional)</th><th>Max (RM)</th></tr></thead>
            <tbody>{tiers.map(([k, t]) => (
              <tr key={k}><td>{t}</td>
                <td><input aria-label={`${t} percent`} type="number" step="0.01" value={b.pct?.[k] ?? ''} onChange={e => onChange(x => { x.bases[i].pct = { ...(x.bases[i].pct || {}), [k]: num(e.target.value) } })} /></td>
                <td><input aria-label={`${t} floor`} type="number" value={b.floor?.[k] ?? ''} onChange={e => onChange(x => { const f = { ...(x.bases[i].floor || {}), [k]: num(e.target.value) }; x.bases[i].floor = Object.values(f).every(v => v === '') ? null : f })} /></td>
                <td><input aria-label={`${t} max`} type="number" value={b.max?.[k] ?? ''} onChange={e => onChange(x => { x.bases[i].max = { ...(x.bases[i].max || {}), [k]: num(e.target.value) } })} /></td></tr>
            ))}</tbody>
          </table></div>
          <Lines label="Notes shown with the result" value={b.notes} onChange={v => onChange(x => { x.bases[i].notes = v })} />
          <Field label="Warning shown on this base (optional)" hint="Use [CONFIRM] for anything not yet confirmed; it blocks publishing."><input value={b.confirm || ''} onChange={e => onChange(x => { if (e.target.value) x.bases[i].confirm = e.target.value; else delete x.bases[i].confirm })} /></Field>
          <button className="btn small ghost" onClick={() => { if (confirm('Remove this base?')) onChange(x => { x.bases.splice(i, 1) }) }}>Remove base</button>
        </fieldset>
      ))}
      <button className="btn small ghost" onClick={() => onChange(x => { x.bases = [...(x.bases || []), { key: 'b' + Math.random().toString(36).slice(2, 5), label: '', input: '', example: '', pct: {}, max: {}, floor: null, notes: [] }] })}>Add a base</button>
    </div>
  )
}
