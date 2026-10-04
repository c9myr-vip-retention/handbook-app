// Learn section: short guides and quizzes on top of the SOP Book.
// Everything comes from /api/learn (behind Access); nothing about a module is
// bundled into the public app shell. Quiz questions arrive one at a time and are
// marked on the server; the browser never holds the answers. See server/learn.js.
import { useEffect, useState } from 'react'
import { api } from './lib/api.js'

// ---- shared ---------------------------------------------------------------

function useLoad(fn, deps) {
  const [s, set] = useState({ data: null, err: '' })
  const reload = () => fn().then(data => set({ data, err: '' }), e => set({ data: null, err: e.message }))
  useEffect(() => { set({ data: null, err: '' }); reload() }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return [s.data, s.err, reload]
}
const Loading = () => <p className="muted">Loading…</p>
const Err = ({ msg }) => <p className="err" role="alert">{msg}</p>

// Open the SOP at the section whose heading starts with `sec`.
export const openSop = (go, id, sec) => go({ kind: 'page', key: id, ...(sec ? { sec } : {}) })

function StatusChip({ m }) {
  if (m.state === 'draft') return <span className="chip pending">Draft</span>
  if (m.state === 'review') return <span className="chip planned">Under review</span>
  if (m.me?.passed) return <span className="chip scorepass">Passed {m.me.best}%</span>
  if (m.me?.best != null) return <span className="chip planned">Best {m.me.best}%</span>
  return <span className="chip pending">Not started</span>
}

// ---- Learn home: the learning path --------------------------------------------

// Group modules under their SOP Book category (from the page crumb
// "SOP Book · <category>"). Categories and the modules inside them follow the
// SOP Book sidebar order.
function groupByCategory(mods, PAGES, NAV) {
  const domains = (NAV || []).find(s => s.domains)?.domains || []
  const order = domains.map(d => d.name)
  const itemOrder = domains.flatMap(d => d.items.map(it => it.id).filter(Boolean))
  const at = (list, x) => { const i = list.indexOf(x); return i < 0 ? list.length : i }
  const groups = new Map()
  for (const m of mods) {
    const cat = (PAGES?.[m.id]?.crumb || '').split(' · ')[1] || 'Other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push(m)
  }
  for (const list of groups.values()) list.sort((a, b) => at(itemOrder, a.id) - at(itemOrder, b.id))
  return [...groups].sort((a, b) => at(order, a[0]) - at(order, b[0]))
}

export function LearnHome({ go, canEdit, pages: PAGES, nav: NAV }) {
  const [mods, err] = useLoad(() => api.learn(), [])
  if (err) return <div className="view doc learn"><h1>Learn</h1><Err msg={err} /></div>
  if (!mods) return <div className="view doc learn"><h1>Learn</h1><Loading /></div>
  const open = mods.filter(m => m.state !== 'draft')
  const passed = open.filter(m => m.me?.passed).length
  return (
    <div className="view doc learn">
      <h1>Learn</h1>
      <p className="lead">Short guides and quizzes for new joiners and refreshers. The SOP Book stays the official rule; each guide links to it.</p>
      {open.length > 0 && <p className="learn-progress"><b>{passed} of {open.length}</b> modules passed</p>}
      {mods.length === 0
        ? <div className="stubbox">No modules yet.</div>
        : groupByCategory(mods, PAGES, NAV).map(([cat, list]) => (
            <section key={cat} className="learn-group" aria-labelledby={'lc-' + cat}>
              <h2 className="learn-cat" id={'lc-' + cat}>{cat}</h2>
              <ol className="learn-path">
                {list.map(m => (
                  <li key={m.id}>
                    <button className="learn-mod" onClick={() => go({ kind: 'learn', key: m.id })}>
                      <b>{m.title}</b>
                      <small>{m.minutes} min · 5 cards · {m.count}-question quiz{m.sop_version ? ` · based on SOP ${m.sop_version}` : ''}</small>
                      <StatusChip m={m} />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
      {canEdit && <div className="learn-links"><button className="btn small ghost" onClick={() => go({ kind: 'scores' })}>Team scores</button></div>}
      {canEdit && <AddModule pages={PAGES} have={mods.map(m => m.id)} go={go} />}
    </div>
  )
}

// Admins: start a module for an SOP Book page that has none yet.
function AddModule({ pages: PAGES, have, go }) {
  const [pick, setPick] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const options = Object.entries(PAGES || {}).filter(([id, p]) => /^SOP Book/.test(p.crumb || '') && !have.includes(id)).sort((a, b) => a[1].title.localeCompare(b[1].title))
  const create = async () => {
    if (!pick) { setErr('Choose an SOP first.'); return }
    setBusy(true); setErr('')
    try { await api.learnCreate(pick); go({ kind: 'learn', key: pick, edit: true }) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <section className="learn-add" aria-labelledby="add-mod">
      <h2 id="add-mod">Add a module</h2>
      <p className="muted small">Starts an empty draft for an SOP. Staff see nothing until you fill it in and publish.</p>
      <div className="led-add">
        <label className="led-field"><span>SOP</span>
          <select value={pick} onChange={e => { setPick(e.target.value); setErr('') }}><option value="">Choose an SOP</option>{options.map(([id, p]) => <option key={id} value={id}>{p.title}</option>)}</select>
        </label>
        <button className="btn small" disabled={busy} onClick={create}>Start the draft</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  )
}

// ---- One module --------------------------------------------------------------

export function LearnModule({ id, go, canEdit }) {
  const [m, err, reload] = useLoad(() => api.learnModule(id), [id])
  const [read, setRead] = useState(false)
  const [msg, setMsg] = useState('')
  if (err) return <div className="view doc learn"><Err msg={err} /></div>
  if (!m) return <div className="view doc learn"><Loading /></div>
  const c = m.content || {}
  const isRead = read || m.me?.read
  const markRead = async () => { try { await api.learnRead(id); setRead(true) } catch (e) { setMsg(e.message) } }
  return (
    <div className="view doc learn">
      <div className="crumb"><button className="crumblink" onClick={() => go({ kind: 'learn' })}>Learn</button> / <b>{m.title}</b></div>
      <h1>{m.title}</h1>
      <div className="docmeta"><span>{c.minutes} min guide</span>{m.sop_version && <span>Based on SOP {m.sop_version}</span>}{m.sop_now !== m.sop_version && <span>SOP now {m.sop_now}</span>}</div>
      <div className="learn-links"><button className="btn small ghost" onClick={() => openSop(go, id)}>Open the official SOP</button></div>
      {m.state === 'review' && (
        <div className="callout warn" role="status"><div><b>The SOP was updated to {m.sop_now}.</b><p>This guide was written for {m.sop_version}. It is under review, and the quiz is paused until an admin approves the updated guide and questions. Use the SOP for now.</p></div></div>
      )}
      {canEdit && <AdminPanel id={id} m={m} onDone={reload} go={go} />}
      {c.tour?.length > 0 && <TourCard id={id} tour={c.tour} go={go} />}
      {c.words?.length > 0 && <Words words={c.words} />}
      <section className="learn-test" aria-labelledby="test-title">
        <h2 id="test-title">Test yourself</h2>
        {m.state !== 'live'
          ? <p className="muted">{m.state === 'review' ? 'Paused while the guide is reviewed.' : 'Opens once an admin publishes this module.'}</p>
          : <>
              <p className="muted">{c.quiz.count} scenario questions, {c.quiz.seconds} seconds each, pass mark {c.quiz.pass}%. Retakes are allowed; your best score counts.</p>
              <div className="qcard-actions">
                <button className="btn small" onClick={() => go({ kind: 'quiz', key: id })}>{m.me?.attempts ? `Retake the quiz (best ${m.me.best}%)` : 'Start the quiz'}</button>
                {isRead ? <span className="qcard-done">Guide read</span> : <button className="btn small ghost" onClick={markRead}>Mark the guide as read</button>}
                {canEdit && <button className="btn small ghost" onClick={() => go({ kind: 'scores' })}>Team scores</button>}
              </div>
              {msg && <Err msg={msg} />}
            </>}
      </section>
    </div>
  )
}

// Admins: what state the module is in, what blocks publishing, and Publish.
function AdminPanel({ id, m, onDone, go }) {
  const [d, err, reload] = useLoad(() => api.learnModule(id, true), [id, m.state])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  if (err) return <Err msg={err} />
  if (!d) return null
  const publish = async () => {
    setBusy(true); setMsg('')
    try { const r = await api.learnPublish(id); setMsg(`Published for SOP ${r.sop_version}.`); reload(); onDone() } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  const label = m.state === 'draft' ? 'Not published yet' : m.state === 'review' ? `SOP moved to ${m.sop_now}: review the draft, then publish` : `Live for SOP ${m.sop_version}`
  return (
    <div className="learn-admin">
      <p><b>Admin:</b> {label}. Draft last saved {d.draft_at || '-'} by {d.draft_by || '-'}.</p>
      {d.problems?.length > 0
        ? <><p className="muted small">Publishing is blocked until these are fixed in the draft:</p><ul className="bullets">{d.problems.map(p => <li key={p}>{p}</li>)}</ul></>
        : <button className="btn small" disabled={busy} onClick={publish}>{m.state === 'live' ? 'Publish the draft again' : `Publish for SOP ${m.sop_now}`}</button>}
      <div className="learn-links"><button className="btn small ghost" onClick={() => go({ kind: 'learn', key: id, edit: true })}>Edit the draft</button></div>
      {msg && <p className="small" role="status">{msg}</p>}
    </div>
  )
}

// Glossary, folded by default so the cards come first on a phone. Opens by
// itself while a meaning is still missing (admins only see drafts).
function Words({ words }) {
  const gap = words.some(([, d]) => !d)
  return (
    <details className="words" open={gap}>
      <summary><h2>Words you need <span className="muted">({words.length})</span></h2></summary>
      <dl>{words.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d || <span className="words-todo">[CONFIRM] Meaning to be written by the ATL.</span>}</dd></div>)}</dl>
    </details>
  )
}

// ---- The 30-second version: five cards, one at a time -----------------------

function TourCard({ id, tour, go }) {
  const [at, setAt] = useState(0)
  const [seen, setSeen] = useState(() => new Set([0]))
  const [all, setAll] = useState(false)
  const n = tour.length, finished = at >= n
  const goTo = (i) => { setAt(i); setSeen(prev => new Set([...prev, i])) }
  const onKeys = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(n - 1, at + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(0, at - 1)) }
  }
  const s = tour[at]
  const official = (x) => x.sec && <button className="crumblink tour-src" onClick={() => openSop(go, id, x.sec)}>Official rule: {x.secLabel || x.sec} ›</button>
  return (
    <section className="tour" aria-labelledby="tour-title">
      <div className="tour-head">
        <h2 id="tour-title">The 30-second version</h2>
        <button className="crumblink tour-all" aria-pressed={all} onClick={() => setAll(a => !a)}>{all ? 'One card at a time' : 'Show all'}</button>
      </div>
      {all ? (
        <div className="tour-stack">{tour.map(x => <div key={x.key} className="tour-panel"><h3>{x.label}: {x.title}</h3><TourPanel s={x} />{official(x)}</div>)}</div>
      ) : (
        <>
          <div className="tour-tabs" role="tablist" aria-label="The 30-second version" onKeyDown={onKeys}>
            {tour.map((x, i) => (
              <button key={x.key} role="tab" id={'tt-' + x.key} aria-selected={at === i} aria-controls="tour-body" tabIndex={at === i ? 0 : -1}
                className={'tour-tab' + (at === i ? ' on' : '') + (seen.has(i) && at !== i ? ' seen' : '')} onClick={() => goTo(i)}>
                <span className="tour-dot" aria-hidden="true">{seen.has(i) && at !== i ? '✓' : i + 1}</span>{x.label}
              </button>
            ))}
          </div>
          {finished
            ? <div className="tour-panel tour-finish"><h3>That's the 30-second version.</h3><p className="muted">Next: test yourself below, or read the full SOP.</p></div>
            : <div className="tour-panel" id="tour-body" role="tabpanel" aria-labelledby={'tt-' + s.key}><h3>{s.title}</h3><TourPanel key={s.key} s={s} />{official(s)}</div>}
          <div className="tour-nav">
            <button className="btn small ghost" onClick={() => goTo(Math.max(0, (finished ? n : at) - 1))} disabled={at === 0}>Back</button>
            <span className="muted small">{finished ? `${n} of ${n}` : `${at + 1} of ${n}`}</span>
            {!finished && <button className="btn small" onClick={() => (at === n - 1 ? setAt(n) : goTo(at + 1))}>{at === n - 1 ? 'Finish' : 'Next'}</button>}
          </div>
        </>
      )}
    </section>
  )
}

function TourPanel({ s }) {
  const [ticks, setTicks] = useState(() => (s.items || []).map(() => false))
  const [ans, setAns] = useState(null)
  if (s.kind === 'check') {
    const all = ticks.every(Boolean)
    return (
      <>
        <ul className="tour-checks">{s.items.map((t, i) => <li key={t}><label><input type="checkbox" checked={ticks[i]} onChange={() => setTicks(a => a.map((x, j) => (j === i ? !x : x)))} /> {t}</label></li>)}</ul>
        <p className={'tour-note' + (all ? ' ok' : '')} aria-live="polite">{all ? s.done : s.notYet}</p>
      </>
    )
  }
  if (s.kind === 'steps') return <ol className="tour-steps">{s.items.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
  if (s.kind === 'never') return <ul className="tour-never">{s.items.map(t => <li key={t}>{t}</li>)}</ul>
  if (s.kind === 'calc' && s.calc) return <Calc cfg={s.calc} />
  if (s.kind === 'ladder' && s.ladder) return <Ladder cfg={s.ladder} />
  if (s.kind === 'gate') return (
    <>
      <p className="tour-q">{s.q}</p>
      <div className="seg" role="radiogroup" aria-label={s.q}>
        {[['yes', 'Yes'], ['no', 'No']].map(([k, t]) => <button key={k} role="radio" aria-checked={ans === k} className={ans === k ? 'on' : ''} onClick={() => setAns(k)}>{t}</button>)}
      </div>
      {ans && <p className={'tour-note' + (ans === 'yes' ? ' warn' : ' ok')} aria-live="polite">{ans === 'yes' ? s.yes : s.no}</p>}
    </>
  )
  return null
}

// Tier-and-base credit calculator. All numbers come from the module content:
// percent, floor and max per tier, and the "ending in 8" rounding.
const eight = (x) => (x < 8 ? null : Math.floor((x - 8) / 10) * 10 + 8)
const rm = (n) => 'RM ' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
// Ladder calculator (LTV, Top P&L, Compensation): the amount picks the highest
// ladder row reached; the bonus may not exceed SW x cap%. If the row's bonus is
// above the cap, the highest row that fits is used; if none fits, no bonus.
// Rows are [threshold, bonus] in RM, lowest first.
function Ladder({ cfg }) {
  const [amt, setAmt] = useState('')
  const [sw, setSw] = useState('')
  const rows = [...(cfg.rows || [])].sort((a, b) => a[0] - b[0])
  const n = (x) => Number(String(x).replace(/[, ]/g, ''))
  const a = n(amt), w = n(sw)
  const bad = (amt !== '' && !(Number.isFinite(a) && a >= 0)) || (sw !== '' && !(Number.isFinite(w) && w >= 0))
  let out = null
  if (amt !== '' && sw !== '' && !bad) {
    const hit = rows.filter(r => a >= r[0]).pop()
    const cap = w * cfg.capPct / 100
    if (!hit) out = { amount: null, why: `${rm(a)} is below the first ladder row (${rm(rows[0]?.[0] ?? 0)}). No bonus.` }
    else if (hit[1] <= cap) out = { amount: hit[1], why: `${rm(a)} reaches the ${rm(hit[0])} row: ${rm(hit[1])}. SW x ${cfg.capPct}% = ${rm(cap)}, so it fits.` }
    else {
      const fit = rows.filter(r => r[1] <= cap && r[0] <= hit[0]).pop()
      out = fit
        ? { amount: fit[1], why: `The ${rm(hit[0])} row is ${rm(hit[1])}, above SW x ${cfg.capPct}% = ${rm(cap)}. Highest row that fits: ${rm(fit[1])}.` }
        : { amount: null, why: `SW x ${cfg.capPct}% = ${rm(cap)} is below the smallest bonus (${rm(rows[0][1])}). SW not enough: no bonus.` }
    }
  }
  return (
    <div className="calc">
      <label className="calc-row"><span className="calc-lbl">{cfg.input}</span>
        <input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} placeholder={cfg.example || ''} /></label>
      <label className="calc-row"><span className="calc-lbl">SW balance today (RM)</span>
        <input inputMode="decimal" value={sw} onChange={e => setSw(e.target.value)} placeholder="500" /></label>
      {bad && <p className="err" role="alert">Enter amounts in RM, numbers only.</p>}
      <div className="calc-out" aria-live="polite">
        {out
          ? <><p className="calc-amt">{out.amount == null ? 'No bonus' : rm(out.amount)}</p>
              <p className="calc-why">{out.why}</p>
              {(cfg.notes || []).length > 0 && <p className="calc-tags">{cfg.notes.map(t => <span key={t} className="chip ver">{t}</span>)}</p>}</>
          : <p className="muted">Type the amount and today's SW balance.</p>}
      </div>
      <details className="ladder-rows"><summary>See the full ladder</summary>
        <div className="tbl-wrap"><table><thead><tr><th>{cfg.rowLabel || 'From'}</th><th>Bonus</th></tr></thead>
          <tbody>{rows.map(([t, b]) => <tr key={t}><td>{rm(t)}{t === rows[rows.length - 1][0] ? ' and above' : ''}</td><td>{rm(b)}</td></tr>)}</tbody></table></div>
      </details>
    </div>
  )
}

function Calc({ cfg }) {
  const [tier, setTier] = useState(cfg.tiers[0][0])
  const [baseKey, setBaseKey] = useState(cfg.bases[0].key)
  const [amt, setAmt] = useState('')
  const B = cfg.bases.find(x => x.key === baseKey)
  const pct = B.pct[tier], max = B.max[tier], floor = B.floor ? B.floor[tier] : null
  const v = Number(String(amt).replace(/[, ]/g, ''))
  const bad = amt !== '' && !(Number.isFinite(v) && v >= 0)
  let out = null
  if (amt !== '' && !bad) {
    const raw = v * pct / 100, head = `${rm(v)} x ${pct}% = ${rm(raw)}`
    if (raw >= max) out = { amount: max, why: `${head}, above the max. Issue the max.` }
    else if (floor != null && raw < floor) out = { amount: floor, why: `${head}, below the floor. Issue the floor.` }
    else {
      const e = eight(raw)
      out = e == null ? { amount: null, why: `${head}. No amount ending in 8 fits. Check with the ATL.` } : { amount: e, why: `${head}. Highest amount ending in 8: ${rm(e)}.` }
    }
  }
  return (
    <div className="calc">
      <div className="calc-row">
        <span className="calc-lbl" id="calc-tier">Tier</span>
        <div className="seg" role="radiogroup" aria-labelledby="calc-tier">
          {cfg.tiers.map(([k, t]) => <button key={k} role="radio" aria-checked={tier === k} className={tier === k ? 'on' : ''} onClick={() => setTier(k)}>{t}</button>)}
        </div>
      </div>
      <div className="calc-row">
        <span className="calc-lbl" id="calc-base">{cfg.baseLabel}</span>
        <div className="seg" role="radiogroup" aria-labelledby="calc-base">
          {cfg.bases.map(x => <button key={x.key} role="radio" aria-checked={baseKey === x.key} className={baseKey === x.key ? 'on' : ''} onClick={() => setBaseKey(x.key)}>{x.label}</button>)}
        </div>
      </div>
      <label className="calc-row">
        <span className="calc-lbl">{B.input}</span>
        <input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} placeholder={B.example} aria-invalid={bad} />
      </label>
      {bad && <p className="err" role="alert">Enter an amount in RM, numbers only.</p>}
      {B.confirm && <p className="tour-note warn" role="note">{B.confirm}</p>}
      <div className="calc-out" aria-live="polite">
        {out
          ? <><p className="calc-amt">{out.amount == null ? 'Check with the ATL' : rm(out.amount)}</p>
              <p className="calc-why">{out.why}</p>
              <p className="calc-tags">{B.notes.map(t => <span key={t} className="chip ver">{t}</span>)}{floor != null && <span className="chip ver">Floor {rm(floor)}</span>}<span className="chip ver">Max {rm(max)}</span></p></>
          : <p className="muted">Pick the tier and base, then type the amount.</p>}
      </div>
    </div>
  )
}

// ---- Quiz: one question at a time, marked on the server ----------------------

export function QuizPage({ id, go }) {
  const [m, loadErr] = useLoad(() => api.learnModule(id), [id])
  const [run, setRun] = useState(null) // { attempt, total, seconds, pass, index, question, score }
  const [pick, setPick] = useState(null)
  const [fb, setFb] = useState(null)   // marked answer for the current question
  const [result, setResult] = useState(null)
  const [left, setLeft] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setErr(''); setBusy(true)
    try {
      const r = await api.learnStart(id)
      setRun({ ...r, score: 0 }); setPick(null); setFb(null); setResult(null); setLeft(r.seconds)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const send = async (choice) => {
    setBusy(true); setErr('')
    try {
      const r = await api.learnAnswer(run.attempt, run.question.id, choice)
      setFb(r); setRun(x => ({ ...x, score: r.score }))
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  // Countdown; at zero the server is told (it also enforces the limit itself).
  useEffect(() => {
    if (!run || fb || result) return
    if (left <= 0) { send(null); return }
    const t = setTimeout(() => setLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [run, fb, result, left]) // eslint-disable-line react-hooks/exhaustive-deps

  const title = m?.title || id
  const back = <button className="btn small ghost" onClick={() => go({ kind: 'learn', key: id })}>Back to the guide</button>
  if (loadErr) return <div className="view doc quiz"><Err msg={loadErr} /></div>
  if (!m) return <div className="view doc quiz"><Loading /></div>

  if (!run) return (
    <div className="view doc quiz">
      <h1>{m.state === 'live' ? `Check your understanding: ${title}` : `Quiz paused: ${title}`}</h1>
      {m.state === 'live'
        ? <><p className="lead">{m.content.quiz.count} questions, picked at random. {m.content.quiz.seconds} seconds each. Pass mark {m.content.quiz.pass}%. Retakes are allowed; your best score counts.</p>
            <ul className="bullets"><li>Scenario questions: what you would do on shift.</li><li>After each answer you see why, with the rule behind it.</li></ul></>
        : <p className="lead">{m.state === 'review' ? 'The SOP was updated. This quiz comes back once an admin approves the updated questions.' : 'This quiz opens once an admin publishes the module.'}</p>}
      {err && <Err msg={err} />}
      <div className="quiz-actions">{m.state === 'live' && <button className="btn small" disabled={busy} onClick={start}>Start the quiz</button>}{back}</div>
    </div>
  )

  if (result) return (
    <div className="view doc quiz">
      <div className={'quiz-result ' + (result.passed ? 'pass' : 'retry')}>
        <p className="quiz-score">{result.pct}%</p>
        <p>{result.passed ? `Passed. ${title} module complete.` : `Not yet. You need ${result.pass}% to pass.`}</p>
        <p className="muted small">Attempt {result.attempts}. Your best: {result.best}%.</p>
      </div>
      <div className="quiz-actions"><button className="btn small" disabled={busy} onClick={start}>Retake with new questions</button>{back}</div>
    </div>
  )

  const q = run.question
  const next = () => {
    if (fb.result) { setResult(fb.result); return }
    setRun(x => ({ ...x, index: fb.next.index, question: fb.next.question })); setPick(null); setFb(null); setLeft(run.seconds)
  }
  return (
    <div className="view doc quiz">
      <div className="quiz-top">
        <span>Question {run.index + 1} of {run.total}</span>
        <span className={'quiz-timer' + (left <= 10 && !fb ? ' low' : '')}>{fb ? '' : `${left}s left`}</span>
      </div>
      <div className="quiz-bar" aria-hidden="true"><div style={{ width: (run.index / run.total * 100) + '%' }} /></div>
      <h1 className="quiz-q">{q.q}</h1>
      <div className="quiz-opts" role="radiogroup" aria-label="Answers">
        {q.o.map((t, k) => {
          const cls = fb ? (k === fb.correctChoice ? ' ok' : k === pick ? ' bad' : '') : (k === pick ? ' sel' : '')
          return <button key={k} role="radio" aria-checked={pick === k} disabled={!!fb || busy} className={'quiz-opt' + cls} onClick={() => { setPick(k); setErr('') }}>{t}</button>
        })}
      </div>
      {err && <Err msg={err} />}
      {fb && (
        <div className={'callout ' + (fb.correct ? '' : 'warn')} role="status">
          <div><b>{fb.timedOut ? 'Time is up.' : fb.correct ? 'Correct.' : 'Not quite.'}</b><p>{fb.why}</p></div>
        </div>
      )}
      <div className="quiz-actions">
        {fb
          ? <button className="btn small" onClick={next}>{fb.result ? 'See result' : 'Next question'}</button>
          : <button className="btn small" disabled={busy} onClick={() => (pick === null ? setErr('Choose an answer first.') : send(pick))}>Check answer</button>}
      </div>
    </div>
  )
}

// ---- Admin: team scores -------------------------------------------------------

export function ScoresPage({ go }) {
  const [mods, err] = useLoad(() => api.learnScores(), [])
  if (err) return <div className="view doc"><h1>Learning scores</h1><Err msg={err} /></div>
  if (!mods) return <div className="view doc"><h1>Learning scores</h1><Loading /></div>
  return (
    <div className="view doc">
      <h1>Learning scores</h1>
      <p className="lead">Who has read the guide and passed each quiz. Best score counts; retakes are allowed.</p>
      {mods.map(m => {
        const passed = m.people.filter(p => p.best != null && p.best >= m.pass).length
        const read = m.people.filter(p => p.read).length
        return (
          <section key={m.id}>
            <h2>{m.title} {m.sop_version && <span className="chip ver">SOP {m.sop_version}</span>} {m.state !== 'live' && <span className="chip planned">{m.state === 'draft' ? 'Draft' : 'Under review'}</span>}</h2>
            <div className="scorestats">
              <div><span>Passed</span><b>{passed} of {m.people.length}</b></div>
              <div><span>Read the guide</span><b>{read} of {m.people.length}</b></div>
              <div><span>Most missed</span><b>{m.missed[0] ? `${m.missed[0].wrong} of ${m.missed[0].asked} wrong` : '-'}</b></div>
            </div>
            {m.missed[0] && <p className="muted small">Most missed question: {m.missed[0].q}</p>}
            <div className="tbl-wrap"><table>
              <thead><tr><th>Staff</th><th>Read</th><th>Best</th><th>Attempts</th><th>Status</th></tr></thead>
              <tbody>{m.people.map(p => (
                <tr key={p.email}><td>{p.name || p.email}</td><td>{p.read ? 'Yes' : 'No'}</td><td>{p.best == null ? '-' : p.best + '%'}</td><td>{p.attempts}</td>
                  <td>{p.best == null ? <span className="chip pending">Not started</span> : p.best >= m.pass ? <span className="chip scorepass">Passed</span> : <span className="chip planned">Retake</span>}</td></tr>
              ))}</tbody>
            </table></div>
            <button className="btn small ghost" onClick={() => go({ kind: 'learn', key: m.id })}>Open the guide</button>
          </section>
        )
      })}
    </div>
  )
}

// ---- On the SOP page -----------------------------------------------------------

export function SopLearnLink({ mod, go, place }) {
  if (!mod) return null
  if (place === 'end') return (
    <div className="learnlink end">
      <span><b>Test yourself on this SOP.</b> {mod.count} questions, about {mod.minutes} minutes with the guide.</span>
      <button className="btn small" onClick={() => go({ kind: 'learn', key: mod.id })}>Go to the guide</button>
    </div>
  )
  return (
    <div className="learnlink">
      <span><b>New to this?</b> {mod.state === 'review' ? 'The short guide is being updated for this version.' : mod.state === 'draft' ? 'A short guide is being prepared (admins only).' : `Learn it in ${mod.minutes} minutes: 5 short cards and a quiz.`}</span>
      <button className="btn small ghost" onClick={() => go({ kind: 'learn', key: mod.id })}>Open the guide</button>
    </div>
  )
}
