// Quiz page (#/quizzes): stand-alone assessments for every approved user.
// Practice = multiple choice, marked on the server by the option sentence (no
// A/B/C, options shuffled per person). Staff see their score only, never the key.
// Essay (AI-reviewed written answers) is planned. See server/quiz.js.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from './lib/api.js'

function useLoad(fn, deps) {
  const [s, set] = useState({ data: null, err: '' })
  const reload = () => fn().then(data => set({ data, err: '' }), e => set({ data: null, err: e.message }))
  useEffect(() => { set({ data: null, err: '' }); reload() }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return [s.data, s.err, reload]
}
const Loading = () => <p className="muted">Loading…</p>
const Err = ({ msg }) => <p className="err" role="alert">{msg}</p>
const when = (s) => { if (!s) return '-'; const d = new Date(s.replace(' ', 'T') + (/Z|[+-]\d\d:\d\d$/.test(s) ? '' : 'Z')); return isNaN(d) ? s : d.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
const clock = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
const scoreText = (r) => r.pending ? `${r.score} of ${r.max}, written part waiting for review` : `${r.score} of ${r.max}`

function StateChip({ state }) {
  if (state === 'draft') return <span className="chip pending">Draft</span>
  if (state === 'closed') return <span className="chip planned">Closed</span>
  return null
}

// ---- leave guard ------------------------------------------------------------------

// While a quiz runs, the app asks before leaving it (sidebar, search, back button).
// Answers are already saved; the guard stops people thinking they lost them.
let running = null // { left: () => seconds, hash }
export function quizLeaveOk() {
  if (!running) return true
  return confirm(`Your quiz is still running, ${clock(running.left())} left. Your answers are saved and the clock keeps going. Leave anyway?`)
}
export const quizHash = () => running?.hash || null

// ---- list -----------------------------------------------------------------------

export function QuizzesHome({ go, isAdmin, showLearn }) {
  const [sets, err] = useLoad(() => api.quizzes(), [])
  const practice = (sets || []).filter(s => s.kind === 'practice')
  return (
    <div className="view doc learn">
      <h1>Quiz</h1>
      <p className="lead">Assessments for the whole department. Your answers are saved as you go and marked when you submit.</p>
      {showLearn && <p className="muted small">Short quizzes on each SOP are in Learn, with the guide.</p>}
      {err && <Err msg={err} />}
      {!sets && !err && <Loading />}
      {sets && <>
        <h2 className="learn-cat">Practice</h2>
        {practice.length === 0 && <div className="stubbox">No practice quiz is open yet.</div>}
        <div className="qz-list">
          {practice.map(s => {
            const last = s.mine[s.mine.length - 1]
            return (
              <div key={s.id} className="qz-card">
                <button className="qz-card-main" onClick={() => go({ kind: 'qset', key: s.id })}>
                  <span className="qz-card-title">{s.title} <StateChip state={s.state} /></span>
                  <span className="muted small">{s.count} questions · {s.minutes} minutes · {s.max} points</span>
                  {s.openLeft != null
                    ? <span className="small qz-inprogress">In progress, {clock(s.openLeft)} left. Resume</span>
                    : <span className="small">{last ? `Your last result: ${scoreText(last)}` : 'Not taken yet'}</span>}
                </button>
                {isAdmin && <button className="crumblink qz-card-scores" onClick={() => go({ kind: 'qscores', key: s.id })}>Scores</button>}
              </div>
            )
          })}
        </div>
        <p className="muted small">Essay quizzes, with written answers reviewed with AI, are coming soon.</p>
      </>}
    </div>
  )
}

// ---- one set: intro, run, result -----------------------------------------------------

export function QuizSet({ id, go, isAdmin }) {
  const [s, loadErr, reload] = useLoad(() => api.quiz(id), [id])
  const [run, setRun] = useState(null)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (s?.open && !run && !result) setRun(s.open) }, [s]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setErr(''); setBusy(true)
    try { setResult(null); setRun(await api.quizStart(id)) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const back = <button className="btn small ghost" onClick={() => go({ kind: 'quizzes' })}>All quizzes</button>

  if (loadErr) return <div className="view doc quiz"><Err msg={loadErr} />{back}</div>
  if (!s) return <div className="view doc quiz"><Loading /></div>
  const c = s.content || {}

  if (run) return <Runner key={run.attempt} run={run} content={c} onDone={r => { setRun(null); setResult(r); reload() }} />

  if (result?.late) return (
    <div className="view doc quiz">
      <div className="quiz-result"><p>Time ran out. The answers you saved were submitted.</p></div>
      <div className="quiz-actions">{back}</div>
    </div>
  )
  if (result) return (
    <div className="view doc quiz">
      <div className="quiz-result">
        <p className="muted small">{result.trial ? 'Trial run submitted (not counted)' : 'Submitted'}</p>
        <p className="quiz-score">{result.auto} of {result.max}</p>
        {result.written > 0
          ? <p>This counts your answer choices. Your {result.written} written answers can add up to {result.max - result.autoMax} more points after review.</p>
          : <p>Thank you.</p>}
        {!result.feedback && <p className="muted small">The answers are not shown, so the quiz stays fair for everyone.</p>}
      </div>
      <div className="quiz-actions">{back}</div>
    </div>
  )

  const used = s.mine.length
  const left = c.maxAttempts ? c.maxAttempts - used : null
  const canStart = s.state === 'live' && (left == null || left > 0)
  return (
    <div className="view doc quiz">
      <h1>{c.title} <StateChip state={s.state} /></h1>
      {(c.intro || []).map((p, i) => <p key={i} className={i === 0 ? 'lead' : ''}>{p}</p>)}
      <div className="scorestats">
        <div><span>Questions</span><b>{c.count}</b></div>
        <div><span>Time</span><b>{c.minutes} minutes</b></div>
        <div><span>Points</span><b>{c.max}</b></div>
      </div>
      {err && <Err msg={err} />}
      <div className="quiz-actions">
        {canStart && <button className="btn" disabled={busy} onClick={start}>{used ? 'Start again' : 'Start the quiz'}</button>}
        {back}
      </div>
      {s.state !== 'live' && !isAdmin && <p className="muted">This quiz is {s.state === 'closed' ? 'closed' : 'not open yet'}.</p>}
      <ul className="bullets">
        <li>One clock for the whole quiz. It keeps running if you close the page; when it ends, what you saved is submitted.</li>
        <li>Questions open in order: finish one to open the next.{c.feedback ? ' Check each answer to see if it is right; it locks once checked.' : ' You can go back and change answers until you submit.'}</li>
        {c.written > 0 && <li>An admin marks the written answers.</li>}
        <li>{left == null ? 'Every attempt is recorded.' : `Every attempt is recorded. Attempts left: ${left}.`}</li>
      </ul>
      {c.ref && <PillarRef refData={c.ref} />}
      {used > 0 && <>
        <h2>Your results</h2>
        <ul className="bullets">{s.mine.map(r => <li key={r.n}>Attempt {r.n}, {when(r.at)}: {scoreText(r)}</li>)}</ul>
      </>}
      {isAdmin && <AdminPanel id={id} state={s.state} go={go} onChange={reload} onTrial={start} busy={busy} />}
    </div>
  )
}

function PillarRef({ refData, open }) {
  return (
    <details className="qz-ref" open={open}>
      <summary>{refData.title}</summary>
      <dl>{refData.items.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
    </details>
  )
}

// One question at a time, in order: Next opens once the current question is
// complete. Every change is saved on the server. With feedback on, Check locks
// the answer and shows it green (right) or red (wrong) with the right one in green.
const LETTERS = 'ABCDEFGH'
function Runner({ run, content, onDone }) {
  const qs = run.questions
  const fb = !!run.feedback
  const minWords = run.minWords || 3
  const wordCount = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length
  const done = (q, a) => !!a?.c && (!q.explain || wordCount(a.x) >= minWords) && (!fb || !!a.locked)
  const firstOpen = () => { const k = qs.findIndex(q => !done(q, (run.answers || {})[q.id])); return k < 0 ? qs.length - 1 : k }
  const [i, setI] = useState(firstOpen)
  const [ans, setAns] = useState(run.answers || {})
  const [left, setLeft] = useState(run.secondsLeft)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState('') // '' until the first save, then 'saving' | 'saved'
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState('')
  const chain = useRef(Promise.resolve())
  const timers = useRef({})
  const endAt = useRef(Date.now() + run.secondsLeft * 1000)
  const latest = useRef(run.answers || {}) // current answers, read by saves that fire later
  const optRefs = useRef([])

  // Saves run one after another so an older one never lands last.
  const save = (qid, a, check) => {
    setSaved('saving')
    chain.current = chain.current.then(() => api.quizSave(run.attempt, qid, a.c, a.x, check))
      .then(r => {
        setErr(''); setSaved('saved')
        if (check) { latest.current = { ...latest.current, [qid]: { ...latest.current[qid], locked: true, correct: r.correct, right: r.right } }; setAns(latest.current) }
      }, e => { setErr(e.message); setSaved('') })
    return chain.current
  }
  const setAnswer = (qid, patch, now) => {
    if (latest.current[qid]?.locked) return
    const a = { c: null, x: '', ...latest.current[qid], ...patch }
    latest.current = { ...latest.current, [qid]: a }
    setAns(latest.current)
    clearTimeout(timers.current[qid])
    if (now) save(qid, a)
    else timers.current[qid] = setTimeout(() => { delete timers.current[qid]; save(qid, latest.current[qid]) }, 800)
  }
  const flush = () => {
    for (const [qid, t] of Object.entries(timers.current)) { clearTimeout(t); delete timers.current[qid]; save(qid, latest.current[qid]) }
    return chain.current
  }
  const check = async () => { clearTimeout(timers.current[q.id]); delete timers.current[q.id]; setBusy(true); await save(q.id, latest.current[q.id], true); setBusy(false) }
  const unanswered = qs.map((x, k) => (ans[x.id]?.c ? null : 'Q' + (k + 1))).filter(Boolean)
  const submit = async (auto) => {
    if (!auto) {
      const open = qs.map((x, k) => (latest.current[x.id]?.c ? null : 'Q' + (k + 1))).filter(Boolean)
      const msg = open.length
        ? `${open.length} questions are not answered yet (${open[0]}${open.length > 1 ? ' to ' + open[open.length - 1] : ''}). They count as wrong. Submit anyway? You can't change answers after this.`
        : "Submit your answers? You can't change them after this."
      if (!confirm(msg)) return
    }
    setBusy(true)
    try { await flush(); running = null; onDone(await api.quizSubmit(run.attempt)) }
    catch (e) { if (/already submitted|Time is up/.test(e.message)) { running = null; onDone({ late: true }) } else setErr(e.message) }
    finally { setBusy(false) }
  }

  // Leave guard while the quiz runs.
  useEffect(() => {
    running = { left: () => Math.max(0, Math.round((endAt.current - Date.now()) / 1000)), hash: location.hash }
    const unload = (e) => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', unload)
    return () => { running = null; removeEventListener('beforeunload', unload) }
  }, [])

  // Clock from the server's deadline; at zero, submit what is saved. Spoken
  // warnings at 5 minutes and 1 minute.
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(s)
      if (s <= 300 && s > 295) setAlert('5 minutes left. Submit before the time runs out.')
      if (s <= 60 && s > 55) setAlert('1 minute left.')
      if (s <= 0) { clearInterval(t); submit(true) }
    }, 1000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the current question visible in the navigator.
  useEffect(() => { document.querySelector('.qz-navcol .qz-step.on')?.scrollIntoView({ block: 'nearest' }) }, [i])

  const q = qs[i]
  const a = ans[q.id] || {}
  const sec = content.sections?.find(x => x.id === q.sec)
  const complete = qs.map(x => done(x, ans[x.id]))
  const reach = complete.indexOf(false) < 0 ? qs.length - 1 : complete.indexOf(false) // furthest question you may open
  const nDone = complete.filter(Boolean).length
  const goTo = (k) => { if (k <= reach) { setI(k); scrollTo(0, 0) } }
  const locked = !!a.locked
  const words = wordCount(a.x)
  // Radio group keys: arrows move and choose, as in a native radio group.
  const onOptKey = (e, k) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!d || locked) return
    e.preventDefault()
    const n = (k + d + q.o.length) % q.o.length
    setAnswer(q.id, { c: q.o[n] }, true)
    optRefs.current[n]?.focus()
  }
  const selIdx = q.o.indexOf(a.c)
  const optClass = (t) => {
    if (fb && locked) return t === a.right ? ' ok' : t === a.c ? ' bad' : ''
    return a.c === t ? ' sel' : ''
  }
  const need = !a.c ? 'Choose an answer to continue.' : q.explain && words < minWords ? `Write at least ${minWords} words to continue.` : fb && !locked ? 'Check your answer to continue.' : ''
  // Vertical navigator: questions grouped by section; each row shows its state
  // (current, done, right/wrong with feedback on, not open yet) and its opening words.
  const stateOf = (x, k) => fb && ans[x.id]?.locked ? (ans[x.id].correct ? 'ok' : 'bad') : complete[k] ? 'done' : k > reach ? 'shut' : 'open'
  const groups = []
  qs.forEach((x, k) => { const g = groups[groups.length - 1]; if (g && g.sec === x.sec) g.items.push(k); else groups.push({ sec: x.sec, items: [k] }) })
  const secLabel = (id) => (content.sections?.find(s => s.id === id)?.title || '').replace(/^Section\s+/, '')
  const nav = (
    <div className="qz-nav">
      <div className="qz-nav-head"><b>Progress</b><span>{nDone} of {qs.length}</span></div>
      <div className="qz-nav-bar" aria-hidden="true"><span style={{ width: (nDone / qs.length * 100) + '%' }} /></div>
      {groups.map(g => (
        <div key={g.sec + g.items[0]} className="qz-nav-group">
          {g.sec && <p className="qz-nav-sec">{secLabel(g.sec)}</p>}
          <ol>
            {g.items.map(k => {
              const x = qs[k], st = stateOf(x, k)
              return (
                <li key={x.id}>
                  <button className={'qz-step ' + st + (k === i ? ' on' : '')} disabled={st === 'shut'} onClick={() => goTo(k)} aria-current={k === i ? 'step' : undefined}
                    aria-label={'Question ' + (k + 1) + ({ ok: ', correct', bad: ', wrong', done: ', done', shut: ', not open yet', open: '' })[st]}>
                    <span className="qz-step-dot" aria-hidden="true">{st === 'ok' || st === 'done' ? '✓' : st === 'bad' ? '✗' : k + 1}</span>
                    <span className="qz-step-text"><span className="qz-step-n">Q{k + 1}</span> {x.q.split('\n')[0]}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
      {fb && <p className="muted small qz-legend"><span className="qz-dot ok" /> correct <span className="qz-dot bad" /> wrong</p>}
    </div>
  )

  return (
    <div className="view doc qz-run">
      <div className={'qz-sticky' + (left <= 300 ? ' low' : '')}>
        <span>{run.trial ? 'Trial · ' : ''}Question {i + 1} of {qs.length} · {nDone} done</span>
        <span className="quiz-timer" role="timer" aria-label={'Time left ' + clock(left)}>{clock(left)} left</span>
        <button className="btn small ghost" disabled={busy} onClick={() => submit(false)}>{busy ? 'Submitting…' : 'Submit'}</button>
      </div>
      {left <= 300 && <p className="qz-warn">Less than 5 minutes left. What you saved is submitted when the time runs out.</p>}
      <p className="sr-only" aria-live="assertive">{alert}</p>

      <div className="qz-cols">
        <nav className="qz-navcol" aria-label="Questions">{nav}</nav>
        <div className="qz-main">
          <details className="qz-navfold"><summary>All questions <span className="muted">({nDone} of {qs.length} done)</span></summary>{nav}</details>
          {sec && <p className="qz-sec"><b>{sec.title}</b>{sec.note && !q.explain && <span className="muted"> {sec.note}</span>}</p>}
          <h1 className="quiz-q qz-q"><span className="qz-qn">Q{i + 1}.</span> {q.q}</h1>
          <div className="quiz-opts" role="radiogroup" aria-label="Answers">
            {q.o.map((t, k) => (
              <button key={t} ref={el => (optRefs.current[k] = el)} role="radio" aria-checked={a.c === t} tabIndex={k === (selIdx < 0 ? 0 : selIdx) ? 0 : -1}
                className={'quiz-opt qz-opt' + optClass(t)} disabled={busy || locked}
                onKeyDown={e => onOptKey(e, k)} onClick={() => setAnswer(q.id, { c: t }, true)}>
                <span className="qz-letter" aria-hidden="true">{LETTERS[k]}</span><span>{t}</span>
              </button>
            ))}
          </div>
          {q.explain && (
            <label className="led-field qz-explain"><span>{q.explain.prompt}</span>
              <textarea rows="5" maxLength={2000} value={a.x || ''} disabled={busy || locked}
                onChange={e => setAnswer(q.id, { x: e.target.value })} onBlur={() => Object.keys(timers.current).length && flush()} />
              <small className={'qz-words' + (words >= minWords ? ' ok' : '')}>{words} {words === 1 ? 'word' : 'words'}{words < minWords ? `, at least ${minWords} needed` : ''}</small>
            </label>
          )}
          {fb && locked && (
            <div className={'callout ' + (a.correct ? '' : 'warn')} role="status"><div><b>{a.correct ? 'Correct.' : 'Not quite.'}</b>{!a.correct && <p>The right answer is in green.</p>}</div></div>
          )}
          {err && <Err msg={err} />}
          <div className="quiz-actions">
            <button className="btn small ghost" disabled={i === 0} onClick={() => goTo(i - 1)}>Previous</button>
            {fb && !locked
              ? <button className="btn small" disabled={busy || !a.c || (q.explain && words < minWords)} onClick={check}>Check answer</button>
              : i < qs.length - 1
                ? <button className="btn small" disabled={!complete[i]} onClick={() => goTo(i + 1)}>Next question</button>
                : <button className="btn small" disabled={busy} onClick={() => submit(false)}>{busy ? 'Submitting…' : 'Submit answers'}</button>}
            <span className="muted small qz-saved" aria-live="polite">{saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : ''}</span>
          </div>
          {need && <p className="muted small">{need}</p>}
        </div>

        {content.ref && <aside className="qz-side" aria-label="Reference"><PillarRef refData={content.ref} open={wide()} /></aside>}
      </div>
    </div>
  )
}
const wide = () => typeof matchMedia === 'function' && matchMedia('(min-width:1100px)').matches

// ---- admin ----------------------------------------------------------------------

function AdminPanel({ id, state, go, onChange, onTrial, busy }) {
  const [d, err, reload] = useLoad(() => api.quizDraft(id), [id])
  const [msg, setMsg] = useState('')
  const act = async (fn, ok) => { setMsg(''); try { await fn(); setMsg(ok); reload(); onChange() } catch (e) { setMsg(e.message) } }
  return (
    <section className="qz-admin" aria-labelledby="qz-admin-h">
      <h2 id="qz-admin-h">Admin</h2>
      {err && <Err msg={err} />}
      {d && (d.problems.length
        ? <div className="callout warn"><div><b>Can't publish yet ({d.problems.length}).</b><ul className="bullets">{d.problems.slice(0, 12).map(p => <li key={p}>{p}</li>)}{d.problems.length > 12 && <li>and {d.problems.length - 12} more</li>}</ul></div></div>
        : <p className="muted small">The draft is ready to publish.</p>)}
      <div className="quiz-actions">
        <button className="btn small" disabled={!d || d.problems.length > 0} onClick={() => act(() => api.quizPublish(id), 'Published. Staff can take it now.')}>{state === 'draft' ? 'Publish' : 'Publish the draft again'}</button>
        {state !== 'live' && <button className="btn small ghost" disabled={busy} onClick={onTrial}>Try the draft (not counted)</button>}
        {state === 'live' && <button className="btn small ghost" onClick={() => confirm('Close this quiz? Nobody can start a new attempt until you open it again.') && act(() => api.quizClose(id, true), 'Closed.')}>Close the quiz</button>}
        {state === 'closed' && <button className="btn small ghost" onClick={() => act(() => api.quizClose(id, false), 'Open again.')}>Open again</button>}
        <button className="btn small ghost" onClick={() => go({ kind: 'qscores', key: id })}>Scores</button>
      </div>
      {d && <label className="qz-switch"><input type="checkbox" checked={!!d.feedback} onChange={e => act(() => api.quizSettings(id, { feedback: e.target.checked }), e.target.checked ? 'Feedback on: staff see right or wrong after each question.' : 'Feedback off: staff see their score only.')} /> Show right or wrong after each question (green and red). Off for assessments: it shows the answer key.</label>}
      {msg && <p className="small" role="status">{msg}</p>}
    </section>
  )
}

export function QuizScores({ id, go }) {
  const [s, err, reload] = useLoad(() => api.quizScores(id), [id])
  const [open, setOpen] = useState(null)
  const title = s?.title || 'Quiz scores'
  if (err) return <div className="view doc"><h1>Quiz scores</h1><Err msg={err} /></div>
  if (!s) return <div className="view doc"><h1>Quiz scores</h1><Loading /></div>
  const took = s.people.filter(p => p.attempts > 0)
  const toMark = s.people.reduce((n, p) => n + p.toMark, 0)
  return (
    <div className="view doc">
      <h1>Scores: {title} <StateChip state={s.state} /></h1>
      <p className="lead">Every attempt is kept. First shows the first try; best and latest show the rest. Written answers count once marked.</p>
      {open && <QuizAttemptReport sel={open} onClose={() => { setOpen(null); reload() }} />}
      <div className="scorestats">
        <div><span>Took the quiz</span><b>{took.length} of {s.people.length}</b></div>
        <div><span>Waiting to be marked</span><b>{toMark}</b></div>
        <div><span>Most missed</span><b>{s.missed[0] ? `Q${s.missed[0].n}, ${s.missed[0].wrong} of ${s.missed[0].asked} wrong` : '-'}</b></div>
      </div>
      <div className="tbl-wrap tbl-stack qz-scores"><table>
        <thead><tr><th>Staff</th><th>Attempts</th><th>First</th><th>Best</th><th>Latest</th><th>Band</th><th>To mark</th></tr></thead>
        <tbody>{s.people.map(p => (
          <tr key={p.email}>
            <td data-label="Staff">{p.name || p.email}{p.open && <span className="muted small"> (in progress)</span>}</td>
            <td data-label="Attempts">{p.attempts > 0 ? <button className="crumblink attempts-link" onClick={() => setOpen({ id, email: p.email, name: p.name || p.email, title })} aria-label={'See ' + p.attempts + ' attempts by ' + (p.name || p.email)}>{p.attempts}</button> : 0}</td>
            <td data-label="First">{p.first ?? '-'}</td><td data-label="Best">{p.best ?? '-'}</td><td data-label="Latest">{p.latest ?? '-'}</td>
            <td data-label="Band">{p.latest == null ? '-' : !p.latestFinal ? <span className="muted small">after marking</span> : (s.bands.find(b => p.latest >= b[0] && p.latest <= b[1])?.[2] || '-')}</td>
            <td data-label="To mark">{p.toMark || '-'}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="muted small">Scores are out of {s.max}. Band is for the latest attempt, once its written answers are marked.</p>
      {s.bands.length > 0 && <details className="qz-ref"><summary>Score bands (trainers only)</summary><dl>{s.bands.map(b => <div key={b[2]}><dt>{b[0]} to {b[1]}: {b[2]}</dt><dd>{b[3]}</dd></div>)}</dl></details>}
      <button className="btn small ghost" onClick={() => go({ kind: 'qset', key: id })}>Back to the quiz</button>
    </div>
  )
}

function QuizAttemptReport({ sel, onClose }) {
  const [list, err, reload] = useLoad(() => api.quizAttempts(sel.id, sel.email), [sel.id, sel.email])
  const [pick, setPick] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const give = async (aid, qid, pts) => { setMsg(''); try { await api.quizMark(aid, qid, pts); reload() } catch (e) { setMsg(e.message) } }
  return createPortal(
    <div className="attempt-overlay" role="dialog" aria-modal="true" aria-labelledby="qatt-title" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="attempt-modal">
        <div className="attempt-head">
          <div><h2 id="qatt-title">{sel.name}</h2><p className="muted small">{sel.title}. Tap a question to see the answer and mark written parts.</p></div>
          <button className="btn small ghost" onClick={onClose} autoFocus>Close</button>
        </div>
        {err && <Err msg={err} />}
        {msg && <Err msg={msg} />}
        {!list && !err && <Loading />}
        {list?.map(a => {
          const open = a.items.find(x => pick === a.n + '-' + x.k)
          const unmarked = a.items.filter(x => x.explain && x.explain.mark == null).length
          return (
            <div key={a.n} className="attempt-row">
              <div className="attempt-line">
                <b>Attempt {a.n}</b>
                {a.submitted_at
                  ? <span className="attempt-score">{a.score} of {a.max}</span>
                  : <span className="muted">In progress</span>}
                {a.submitted_at && unmarked > 0 && <span className="muted small">{unmarked} written to mark</span>}
                <span className="muted small">{when(a.started_at)}</span>
              </div>
              {a.submitted_at && <div className="qcodes" role="list">
                {a.items.map(x => (
                  <button key={x.k} role="listitem" className={'qcode ' + (x.correct ? 'ok' : 'bad') + (pick === a.n + '-' + x.k ? ' on' : '')}
                    aria-label={'Question ' + x.k + (x.correct ? ' correct' : x.chose == null ? ' not answered' : ' wrong')} onClick={() => setPick(pick === a.n + '-' + x.k ? null : a.n + '-' + x.k)}>
                    Q{x.k} <span className="mk" aria-hidden="true">{x.correct ? '✓' : x.chose == null ? '-' : '✗'}</span>{x.explain && <span className="mk" aria-hidden="true">{x.explain.mark == null ? '✎' : '+' + x.explain.mark}</span>}
                  </button>
                ))}
              </div>}
              {open && (
                <div className="qdetail">
                  <p className="qz-q">{open.q}</p>
                  {open.correct
                    ? <p>Answered: <span className="right">{open.chose}</span></p>
                    : <p>{open.chose == null ? 'Not answered' : 'Chose: ' + open.chose}{open.right && <> · Correct: <span className="right">{open.right}</span></>}{!open.right && <> · <span className="muted">no answer key yet</span></>}</p>}
                  {open.focus && <p className="muted small">Primary pillar: {open.focus}</p>}
                  {open.explain && <>
                    <p><b>Written answer:</b> {open.explain.text || <span className="muted">left blank</span>}</p>
                    {open.explain.rubric && <p className="muted small">Marking guide: {open.explain.rubric}</p>}
                    <div className="quiz-actions">
                      {Array.from({ length: open.explain.pts + 1 }, (_, p) => (
                        <button key={p} className={'btn small' + (open.explain.mark === p ? '' : ' ghost')} aria-pressed={open.explain.mark === p} onClick={() => give(a.id, open.qid, p)}>{p} {p === 1 ? 'point' : 'points'}</button>
                      ))}
                    </div>
                  </>}
                </div>
              )}
            </div>
          )
        })}
        <p className="muted small qlegend">✓ correct · ✗ wrong · - not answered · ✎ written part to mark · +n written points given</p>
      </div>
    </div>,
    document.body
  )
}
