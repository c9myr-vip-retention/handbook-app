// PREVIEW ONLY (branch preview/learning). Quick-version cards, a scenario quiz
// and an admin scoreboard, shown inside the real layout for review. Nothing is
// saved: read receipts and scores live in memory, and the scoreboard is sample data.
// Content comes from the confirmed Birthday Bonus SOP V1.2 (floor confirmed 24 Sep 2026).
import { useEffect, useState } from 'react'

const LEARN = {
  'birthday-bonus': {
    version: 'V1.2',
    changed: 'Deposit-base floor confirmed (24 Sep 2026). The old examples were replaced.',
    // The 30-second version as five short cards. Each card does one job.
    tour: [
      { key: 'when', label: 'When', kind: 'check', title: 'Is this player due a birthday credit?',
        items: ['Tier 3 or Tier V player', 'Birthday is today', 'Birthday Reward Claimed This Year = No'],
        done: 'All three: carry on to the steps.', notYet: 'Tick all three. Any "no" means no birthday credit today.' },
      { key: 'do', label: 'Do', kind: 'steps', title: 'Five steps, in this order',
        items: [['Screen', 'Skip on any yes: claimed this year, risk tag, same-day reward.'], ['Pick the base', 'Has a Secret Wallet? SW base. No SW? Deposit base.'], ['Size', 'Use the calculator on the Numbers card.'], ['Issue', 'Set the turnover and tell the player the validity.'], ['Record', 'Claimed This Year = Yes, then update the QA Record.']] },
      { key: 'never', label: 'Never', kind: 'never', title: 'Three hard stops',
        items: ['Stack it with a same-day Reload, Compensation or LTV reward.', 'Go above the tier max.', 'Promise an amount before the eligibility check.'] },
      { key: 'numbers', label: 'Numbers', kind: 'calc', title: 'Work out the amount' },
      { key: 'approver', label: 'Approver', kind: 'gate', title: 'Who can issue it?',
        q: 'Is the Total Deposit RM 100,000 or more?',
        yes: 'ATL or above only. The ATL confirms value, claim history, risk tag and amount, then tags "Birthday Credit - ATL Reviewed".',
        no: 'CS issues it, within the tier cap.' },
    ],
    quiz: {
      title: 'Birthday Bonus', count: 5, pass: 80, seconds: 60,
      pool: [
        { q: 'Tier V player has a Secret Wallet of RM 400. What birthday credit do you issue?', o: ['RM 120', 'RM 118', 'RM 128', 'RM 68'], a: 1, why: '400 x 30% = 120. Use the highest 8-ending amount at or below it: RM 118. Deduct from SW, 1x TO.' },
        { q: 'Tier 3 player, no SW, RM 10,000 deposit last month. What do you issue?', o: ['RM 10', 'RM 18', 'RM 38', 'RM 188'], a: 2, why: '0.1% is RM 10, below the Tier 3 floor. Issue the floor, RM 38, 3x TO.' },
        { q: "A player's Total Deposit is RM 150,000. Who issues the birthday credit?", o: ['CS, within the cap', 'ATL or above, tagged ATL Reviewed', 'Any Senior', 'Nobody, skip the player'], a: 1, why: 'RM 100,000 or more goes to the ATL or above. CS cannot issue it directly.' },
        { q: 'The player received a Reload bonus this morning. Their birthday is today. What do you do?', o: ['Issue both', 'Issue half the birthday credit', 'Skip the birthday credit', 'Ask the player to choose'], a: 2, why: 'No stacking with a same-day Reload, Compensation or LTV reward. Skip.' },
        { q: 'The player has a Secret Wallet. Which turnover applies?', o: ['1x, and deduct from SW', '3x, no deduction', '1x, no deduction', '3x, and deduct from SW'], a: 0, why: 'SW base: deduct from SW, 1x turnover. The deposit base is 3x with no deduction.' },
        { q: "The SW figure you have is from yesterday. What do you do first?", o: ["Size on yesterday's SW", 'Use the deposit base instead', 'Refresh the SW today, then size', 'Ask the ATL'], a: 2, why: 'A stale SW is not a valid base. Refresh it the same day before sizing.' },
      ],
    },
  },
}

const SAMPLE = [
  { who: 'Sample agent A', best: 100, tries: 1, read: true },
  { who: 'Sample agent B', best: 80, tries: 2, read: true },
  { who: 'Sample agent C', best: 60, tries: 1, read: true },
  { who: 'Sample agent D', best: null, tries: 0, read: false },
]

// In-memory stand-ins for the future D1 tables (read receipts, quiz attempts).
const mine = { read: {}, best: {}, tries: {} }

const shuffle = (a) => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1])

export const learningTitle = (route, PAGES) =>
  route.kind === 'quiz' ? 'Quiz: ' + (PAGES[route.key]?.title || route.key)
  : route.kind === 'scores' ? 'Learning scores' : null

export function PreviewBanner() {
  return <div className="banner">Preview of the learning features. Not live; nothing here is saved.</div>
}

// Highest amount ending in 8 at or below x (the SOP's "8-ending" rule). null when none fits.
const eight = (x) => (x < 8 ? null : Math.floor((x - 8) / 10) * 10 + 8)
const rm = (n) => 'RM ' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Numbers card: the SOP's sizing tables as a calculator (Birthday Bonus V1.2).
function BirthdayCalc() {
  const [tier, setTier] = useState('3')
  const [hasSw, setHasSw] = useState(true)
  const [amt, setAmt] = useState('')
  const v = Number(String(amt).replace(/[, ]/g, ''))
  const T = hasSw
    ? { pct: tier === '3' ? 0.25 : 0.30, max: tier === '3' ? 888 : 1688, floor: null, to: '1x turnover', sw: 'Deduct from SW' }
    : { pct: 0.001, max: tier === '3' ? 188 : 388, floor: tier === '3' ? 38 : 68, to: '3x turnover', sw: 'No SW deduction' }
  let out = null
  if (amt !== '' && Number.isFinite(v) && v >= 0) {
    const raw = v * T.pct
    const pctTx = hasSw ? Math.round(T.pct * 100) + '%' : '0.1%'
    if (raw >= T.max) out = { amount: T.max, why: `${rm(v)} x ${pctTx} = ${rm(raw)}, above the max. Issue the max.` }
    else if (T.floor != null && raw < T.floor) out = { amount: T.floor, why: `${rm(v)} x ${pctTx} = ${rm(raw)}, below the floor. Issue the floor.` }
    else {
      const e = eight(raw)
      out = e == null
        ? { amount: null, why: `${rm(v)} x ${pctTx} = ${rm(raw)}. No amount ending in 8 fits. Check with the ATL.` }
        : { amount: e, why: `${rm(v)} x ${pctTx} = ${rm(raw)}. Highest amount ending in 8: ${rm(e)}.` }
    }
  }
  const bad = amt !== '' && !(Number.isFinite(v) && v >= 0)
  return (
    <div className="calc">
      <div className="calc-row">
        <span className="calc-lbl" id="calc-tier">Tier</span>
        <div className="seg" role="radiogroup" aria-labelledby="calc-tier">
          {[['3', 'Tier 3'], ['V', 'Tier V']].map(([k, t]) => <button key={k} role="radio" aria-checked={tier === k} className={tier === k ? 'on' : ''} onClick={() => setTier(k)}>{t}</button>)}
        </div>
      </div>
      <div className="calc-row">
        <span className="calc-lbl" id="calc-sw">Secret Wallet?</span>
        <div className="seg" role="radiogroup" aria-labelledby="calc-sw">
          {[[true, 'Has SW'], [false, 'No SW']].map(([k, t]) => <button key={t} role="radio" aria-checked={hasSw === k} className={hasSw === k ? 'on' : ''} onClick={() => setHasSw(k)}>{t}</button>)}
        </div>
      </div>
      <label className="calc-row">
        <span className="calc-lbl">{hasSw ? 'SW balance (RM)' : 'Last month deposit (RM)'}</span>
        <input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} placeholder={hasSw ? '400' : '10000'} aria-invalid={bad} />
      </label>
      {bad && <p className="err" role="alert">Enter an amount in RM, numbers only.</p>}
      {out && hasSw && out.amount != null && out.amount >= 1000 && out.amount < T.max && (
        <p className="tour-note warn" role="note">[CONFIRM] Above RM 1,000 the SOP disagrees with itself: its rule gives this amount, but its example (Tier V, SW RM 4,000) says RM 1,188, not RM 1,198. Check with the ATL before issuing.</p>
      )}
      <div className="calc-out" aria-live="polite">
        {out
          ? <><p className="calc-amt">{out.amount == null ? 'Check with the ATL' : rm(out.amount)}</p>
              <p className="calc-why">{out.why}</p>
              <p className="calc-tags"><span className="chip ver">{T.to}</span><span className="chip ver">{T.sw}</span>{T.floor != null && <span className="chip ver">Floor {rm(T.floor)}</span>}<span className="chip ver">Max {rm(T.max)}</span></p></>
          : <p className="muted">Pick the tier and base, then type the amount.</p>}
      </div>
    </div>
  )
}

function TourPanel({ s }) {
  const [ticks, setTicks] = useState(() => (s.items || []).map(() => false))
  const [ans, setAns] = useState(null)
  if (s.kind === 'check') {
    const all = ticks.every(Boolean)
    return (
      <>
        <ul className="tour-checks">
          {s.items.map((t, i) => (
            <li key={t}><label><input type="checkbox" checked={ticks[i]} onChange={() => setTicks(a => a.map((x, j) => (j === i ? !x : x)))} /> {t}</label></li>
          ))}
        </ul>
        <p className={'tour-note' + (all ? ' ok' : '')} aria-live="polite">{all ? s.done : s.notYet}</p>
      </>
    )
  }
  if (s.kind === 'steps') return (
    <ol className="tour-steps">{s.items.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
  )
  if (s.kind === 'never') return (
    <ul className="tour-never">{s.items.map(t => <li key={t}>{t}</li>)}</ul>
  )
  if (s.kind === 'calc') return <BirthdayCalc />
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

export function QuickCard({ id, go, canEdit }) {
  const L = LEARN[id]
  const [read, setRead] = useState(!!mine.read[id])
  const [at, setAt] = useState(0)
  const [seen, setSeen] = useState(() => new Set([0]))
  const [all, setAll] = useState(false)
  if (!L) return null
  const steps = L.tour, n = steps.length, finished = at >= n
  const best = mine.best[id]
  const goTo = (i) => { setAt(i); setSeen(prev => new Set([...prev, i])) }
  const onKeys = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(n - 1, at + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(0, at - 1)) }
  }
  const s = steps[at]
  return (
    <section className="tour" aria-labelledby="tour-title">
      <div className="tour-head">
        <h2 id="tour-title">The 30-second version</h2>
        <span className="chip ver">{L.version}</span>
        <button className="crumblink tour-all" aria-pressed={all} onClick={() => setAll(a => !a)}>{all ? 'One card at a time' : 'Show all'}</button>
      </div>

      {all ? (
        <div className="tour-stack">
          {steps.map(x => <div key={x.key} className="tour-panel"><h3>{x.label}: {x.title}</h3><TourPanel s={x} /></div>)}
        </div>
      ) : (
        <>
          <div className="tour-tabs" role="tablist" aria-label="The 30-second version" onKeyDown={onKeys}>
            {steps.map((x, i) => (
              <button key={x.key} role="tab" id={'tt-' + x.key} aria-selected={at === i} aria-controls="tour-body" tabIndex={at === i ? 0 : -1}
                className={'tour-tab' + (at === i ? ' on' : '') + (seen.has(i) && at !== i ? ' seen' : '')} onClick={() => goTo(i)}>
                <span className="tour-dot" aria-hidden="true">{seen.has(i) && at !== i ? '✓' : i + 1}</span>{x.label}
              </button>
            ))}
          </div>
          {finished ? (
            <div className="tour-panel tour-finish">
              <h3>That's the 30-second version.</h3>
              <p className="muted">The full procedure is below for when you need the detail.</p>
            </div>
          ) : (
            <div className="tour-panel" id="tour-body" role="tabpanel" aria-labelledby={'tt-' + s.key}>
              <h3>{s.title}</h3>
              <TourPanel key={s.key} s={s} />
            </div>
          )}
          <div className="tour-nav">
            <button className="btn small ghost" onClick={() => goTo(Math.max(0, (finished ? n : at) - 1))} disabled={at === 0}>Back</button>
            <span className="muted small">{finished ? `${n} of ${n}` : `${at + 1} of ${n}`}</span>
            {!finished && <button className="btn small" onClick={() => (at === n - 1 ? setAt(n) : goTo(at + 1))}>{at === n - 1 ? 'Finish' : 'Next'}</button>}
          </div>
        </>
      )}

      <p className="qcard-changed"><b>What changed in {L.version}:</b> {L.changed}</p>
      <div className="qcard-actions">
        {read
          ? <span className="qcard-done">Read {L.version} today</span>
          : <button className="btn small ghost" onClick={() => { mine.read[id] = true; setRead(true) }}>I've read {L.version}</button>}
        <button className="btn small" onClick={() => go({ kind: 'quiz', key: id })}>{best != null ? `Retake quiz (best ${best}%)` : `Test yourself (${L.quiz.count} questions)`}</button>
        {canEdit && <button className="btn small ghost" onClick={() => go({ kind: 'scores' })}>Team scores</button>}
      </div>
    </section>
  )
}

export function QuizPage({ id, pages: PAGES, go }) {
  const Q = LEARN[id]?.quiz
  const [qs, setQs] = useState(null)
  const [i, setI] = useState(0)
  const [pick, setPick] = useState(null)
  const [shown, setShown] = useState(false)
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(0)
  const [err, setErr] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const start = () => {
    setQs(shuffle(Q.pool).slice(0, Q.count).map(x => ({ ...x, order: shuffle(x.o.map((_, k) => k)) })))
    setI(0); setPick(null); setShown(false); setTimedOut(false); setScore(0); setErr(''); setLeft(Q.seconds)
  }
  useEffect(() => {
    if (!qs || shown || i >= qs.length) return
    if (left <= 0) { setTimedOut(true); setShown(true); return }
    const t = setTimeout(() => setLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [qs, i, left, shown])
  if (!Q) return <p>No quiz for this page yet.</p>
  const title = PAGES[id]?.title || id

  if (!qs) return (
    <div className="view doc quiz">
      <PreviewBanner />
      <h1>Check your understanding: {title}</h1>
      <p className="lead">{Q.count} questions, picked at random. {Q.seconds} seconds each. Pass mark {Q.pass}%. Retakes are allowed; your best score is kept.</p>
      <ul className="bullets">
        <li>Scenario questions: what you would do on shift, not what the page says word for word.</li>
        <li>After each answer you see why, with the rule behind it.</li>
      </ul>
      <div className="quiz-actions">
        <button className="btn small" onClick={start}>Start quiz</button>
        <button className="btn small ghost" onClick={() => go({ kind: 'page', key: id })}>Back to the SOP</button>
      </div>
    </div>
  )

  if (i >= qs.length) {
    const pct = Math.round(score / qs.length * 100), pass = pct >= Q.pass
    return (
      <div className="view doc quiz">
        <PreviewBanner />
        <div className={'quiz-result ' + (pass ? 'pass' : 'retry')}>
          <p className="quiz-score">{pct}%</p>
          <p>{pass ? `Passed. ${title} module complete.` : `Not yet. You need ${Q.pass}% to pass.`}</p>
          <p className="muted small">Attempt {mine.tries[id]}. Best {mine.best[id]}% (would be saved to your record).</p>
        </div>
        <div className="quiz-actions">
          <button className="btn small" onClick={start}>Retake with new questions</button>
          <button className="btn small ghost" onClick={() => go({ kind: 'page', key: id })}>Back to the SOP</button>
        </div>
      </div>
    )
  }

  const x = qs[i], right = shown && !timedOut && pick === x.a
  const submit = () => {
    if (shown) {
      if (i === qs.length - 1) {
        const pct = Math.round(score / qs.length * 100)
        mine.best[id] = Math.max(mine.best[id] ?? 0, pct); mine.tries[id] = (mine.tries[id] || 0) + 1
      }
      setI(n => n + 1); setPick(null); setShown(false); setTimedOut(false); setLeft(Q.seconds); return
    }
    if (pick === null) { setErr('Choose an answer first.'); return }
    if (pick === x.a) setScore(s => s + 1)
    setShown(true)
  }
  return (
    <div className="view doc quiz">
      <PreviewBanner />
      <div className="quiz-top">
        <span>Question {i + 1} of {qs.length}</span>
        <span className={'quiz-timer' + (left <= 10 && !shown ? ' low' : '')} aria-live="off">{shown ? '' : `${left}s left`}</span>
      </div>
      <div className="quiz-bar" aria-hidden="true"><div style={{ width: (i / qs.length * 100) + '%' }} /></div>
      <h1 className="quiz-q">{x.q}</h1>
      <div className="quiz-opts" role="radiogroup" aria-label="Answers">
        {x.order.map(k => {
          const cls = shown ? (k === x.a ? ' ok' : k === pick ? ' bad' : '') : (k === pick ? ' sel' : '')
          return <button key={k} role="radio" aria-checked={pick === k} disabled={shown} className={'quiz-opt' + cls}
            onClick={() => { setPick(k); setErr('') }}>{x.o[k]}</button>
        })}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {shown && (
        <div className={'callout ' + (right ? '' : 'warn')} role="status">
          <div><b>{timedOut ? 'Time is up.' : right ? 'Correct.' : 'Not quite.'}</b><p>{x.why}</p></div>
        </div>
      )}
      <div className="quiz-actions">
        <button className="btn small" onClick={submit}>{!shown ? 'Check answer' : i < qs.length - 1 ? 'Next question' : 'See result'}</button>
      </div>
    </div>
  )
}

export function ScoresPage({ pages: PAGES, go }) {
  const modules = Object.keys(LEARN)
  return (
    <div className="view doc">
      <PreviewBanner />
      <h1>Learning scores</h1>
      <p className="lead">Who has read the latest version and passed each quiz. Sample data below; the real page reads from the database.</p>
      {modules.map(id => {
        const passed = SAMPLE.filter(s => s.best >= LEARN[id].quiz.pass).length
        const read = SAMPLE.filter(s => s.read).length
        return (
          <section key={id}>
            <h2>{PAGES[id]?.title || id} <span className="chip ver">{LEARN[id].version}</span></h2>
            <div className="scorestats">
              <div><span>Passed</span><b>{passed} of {SAMPLE.length}</b></div>
              <div><span>Read {LEARN[id].version}</span><b>{read} of {SAMPLE.length}</b></div>
              <div><span>Most missed</span><b>Deposit floor</b></div>
            </div>
            <div className="tbl-wrap"><table>
              <thead><tr><th>Staff</th><th>Read</th><th>Best score</th><th>Attempts</th><th>Status</th></tr></thead>
              <tbody>{SAMPLE.map(s => (
                <tr key={s.who}><td>{s.who}</td><td>{s.read ? 'Yes' : 'No'}</td><td>{s.best == null ? '-' : s.best + '%'}</td><td>{s.tries}</td>
                  <td>{s.best == null ? <span className="chip pending">Not started</span> : s.best >= LEARN[id].quiz.pass ? <span className="chip scorepass">Passed</span> : <span className="chip planned">Retake</span>}</td></tr>
              ))}</tbody>
            </table></div>
            <button className="btn small ghost" onClick={() => go({ kind: 'page', key: id })}>Open the SOP</button>
          </section>
        )
      })}
    </div>
  )
}
