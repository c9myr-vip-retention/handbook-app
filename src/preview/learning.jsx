// PREVIEW ONLY (branch preview/learning). Quick-version cards, a scenario quiz
// and an admin scoreboard, shown inside the real layout for review. Nothing is
// saved: read receipts and scores live in memory, and the scoreboard is sample data.
// Content comes from the confirmed Birthday Bonus SOP V1.2 (floor confirmed 24 Sep 2026).
import { useEffect, useState } from 'react'

const LEARN = {
  'birthday-bonus': {
    version: 'V1.2',
    changed: 'Deposit-base floor confirmed (24 Sep 2026). The old examples were replaced.',
    quick: [
      ['When', 'Tier 3 or Tier V player, birthday today, not claimed this year.'],
      ['Do', 'Screen, pick the base, size, issue, record.'],
      ['Never', 'Stack with a same-day Reload, Compensation or LTV reward. Go above the tier max.'],
      ['Numbers', 'Has SW: Tier 3 25% (max RM 888), Tier V 30% (max RM 1,688), 1x TO, deduct SW. No SW: 0.1% of deposit, floor RM 38 / RM 68, max RM 188 / RM 388, 3x TO.'],
      ['Approver', 'ATL or above when Total Deposit is RM 100,000 or more.'],
    ],
    practice: {
      q: 'Tier 3 player, no Secret Wallet, deposited RM 10,000 last month. 0.1% is RM 10. What do you issue?',
      a: 'RM 38. Below the floor, issue the floor. 3x turnover, no SW deduction.',
    },
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

export function QuickCard({ id, go, canEdit }) {
  const L = LEARN[id]
  const [read, setRead] = useState(!!mine.read[id])
  const [open, setOpen] = useState(false)
  if (!L) return null
  const best = mine.best[id]
  return (
    <section className="qcard" aria-labelledby="qcard-title">
      <div className="qcard-head">
        <h2 id="qcard-title">The 30-second version</h2>
        <span className="chip ver">{L.version}</span>
      </div>
      <dl className="qcard-list">
        {L.quick.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <p className="qcard-changed"><b>What changed in {L.version}:</b> {L.changed}</p>
      <div className="qcard-case">
        <button className="crumblink" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Try'} a practice case</button>
        {open && <><p>{L.practice.q}</p><p className="muted">{L.practice.a}</p></>}
      </div>
      <div className="qcard-actions">
        {read
          ? <span className="qcard-done">Read {L.version} today</span>
          : <button className="btn small ghost" onClick={() => { mine.read[id] = true; setRead(true) }}>I've read {L.version}</button>}
        <button className="btn small" onClick={() => go({ kind: 'quiz', key: id })}>{best != null ? `Retake quiz (best ${best}%)` : `Take the quiz (${L.quiz.count} questions)`}</button>
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
