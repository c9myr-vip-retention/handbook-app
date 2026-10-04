// Quiz API (/api/quizzes/*): stand-alone assessments on the Quiz page, open to
// every approved user (unlike Learn, which is still admins only).
//
// Integrity rules enforced here, not in the browser:
// - The answer key is the option sentence, never a letter. Options are shuffled
//   per attempt and shown without A/B/C; the browser sends back the sentence.
// - Staff never receive the key, before or after submitting. Only admins see
//   right and wrong, in the score report.
// - One clock per attempt (content.minutes). Answers after the deadline are
//   refused; an attempt left open past the deadline is closed with what was saved.
// - Publishing is refused while a question has no key, a key that matches no
//   option, or a written part without its marking guide.
// - Every attempt is kept. Admin runs of a draft are trials and never counted.
//
//   GET  /api/quizzes                          sets (staff: published only)
//   GET  /api/quizzes/:id                      set for taking, plus my open attempt and my results
//   POST /api/quizzes/:id/attempts             start, or resume the open attempt
//   PUT  /api/quizzes/attempts/:aid            { qid, choice, explain } save one answer
//   POST /api/quizzes/attempts/:aid/submit     finish and mark
//   GET  /api/quizzes/:id/draft                admin: full draft and what blocks publishing
//   POST /api/quizzes/:id/publish              admin: draft -> live
//   POST /api/quizzes/:id/close                admin: { closed: true|false } stop or allow new attempts
//   GET  /api/quizzes/:id/scores               admin: people x attempts
//   GET  /api/quizzes/:id/scores/:email        admin: one person's attempts, question by question
//   POST /api/quizzes/attempts/:aid/mark       admin: { qid, pts } mark a written reason

const GRACE_S = 15 // network slack on the clock
const MAX_TEXT = 2000

export async function handleQuiz({ request, env, parts, email, isAdmin, json }) {
  const DB = env.DB
  const method = request.method
  const [, a, b, c] = parts // parts[0] === 'quizzes'

  if (method === 'GET' && !a) return json(await listSets(DB, email, isAdmin))

  if (a === 'attempts' && b) {
    const at = await DB.prepare('select * from quiz_attempts where id = ?').bind(b).first()
    if (!at) return json({ error: 'not found' }, 404)
    if (c === 'mark' && method === 'POST') {
      if (!isAdmin) return json({ error: 'admins only' }, 403)
      return mark(DB, at, await request.json().catch(() => ({})), email, json)
    }
    if (at.email !== email) return json({ error: 'not found' }, 404)
    const content = await contentFor(DB, at)
    if (!content) return json({ error: 'This quiz changed. Start it again.' }, 409)
    if (method === 'PUT' && !c) return saveAnswer(DB, at, content, await request.json().catch(() => ({})), json)
    if (c === 'submit' && method === 'POST') {
      if (at.submitted_at) return json({ error: 'This attempt is already submitted.' }, 409)
      return json(await finish(DB, at, content))
    }
    return json({ error: 'not found' }, 404)
  }
  if (!a) return json({ error: 'not found' }, 404)

  const set = await DB.prepare('select * from quiz_sets where id = ?').bind(a).first()
  if (!set || (!set.live && !isAdmin)) return json({ error: 'not found' }, 404)

  if (method === 'GET' && !b) {
    const content = parse(set.live) || parse(set.draft)
    await closeExpired(DB, email, a)
    const open = await DB.prepare('select * from quiz_attempts where email = ? and set_id = ? and submitted_at is null order by started_at desc limit 1').bind(email, a).first()
    return json({ id: a, kind: set.kind, state: stateOf(set), content: forTaker(content), open: open ? running(open, await contentFor(DB, open)) : null, mine: await mine(DB, email, a) })
  }

  if (b === 'attempts' && method === 'POST') {
    await closeExpired(DB, email, a)
    const open = await DB.prepare('select * from quiz_attempts where email = ? and set_id = ? and submitted_at is null order by started_at desc limit 1').bind(email, a).first()
    if (open) return json(running(open, await contentFor(DB, open)))
    const trial = !set.live || set.closed ? isAdmin : false
    if (!set.live && !trial) return json({ error: 'This quiz is not open yet.' }, 409)
    if (set.closed && !trial) return json({ error: 'This quiz is closed.' }, 409)
    const content = trial ? parse(set.draft) : parse(set.live)
    if (!content?.questions?.length) return json({ error: 'This quiz has no questions yet.' }, 409)
    if (!trial && content.maxAttempts) {
      const n = await DB.prepare('select count(*) n from quiz_attempts where email = ? and set_id = ? and trial = 0').bind(email, a).first()
      if (n.n >= content.maxAttempts) return json({ error: `You have used all ${content.maxAttempts} attempts.` }, 409)
    }
    const plan = content.questions.map(q => ({ qid: q.id, order: shuffle(q.o.map((_, i) => i)) }))
    const now = new Date()
    const at = {
      id: crypto.randomUUID(), email, set_id: a, version: trial ? 'draft' : set.published_at, trial: trial ? 1 : 0,
      plan: JSON.stringify(plan), answers: '{}', started_at: now.toISOString(),
      deadline: new Date(now.getTime() + (content.minutes || 40) * 60000).toISOString(), max_score: maxScore(content),
    }
    await DB.prepare('insert into quiz_attempts (id, email, set_id, version, trial, plan, answers, started_at, deadline, max_score) values (?,?,?,?,?,?,?,?,?,?)')
      .bind(at.id, at.email, at.set_id, at.version, at.trial, at.plan, at.answers, at.started_at, at.deadline, at.max_score).run()
    return json(running(at, content))
  }

  if (!isAdmin) return json({ error: 'admins only' }, 403)

  if (b === 'draft' && method === 'GET') {
    const d = parse(set.draft)
    return json({ id: a, state: stateOf(set), content: d, problems: problems(d), draft_at: set.draft_at, published_at: set.published_at })
  }
  if (b === 'publish' && method === 'POST') {
    const bad = problems(parse(set.draft))
    if (bad.length) return json({ error: 'Not published. Fix these first: ' + bad.join(' ') }, 400)
    await DB.prepare(`update quiz_sets set live = draft, published_by = ?, published_at = ?, closed = 0 where id = ?`)
      .bind(email, new Date().toISOString(), a).run()
    return json({ ok: true })
  }
  if (b === 'close' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    await DB.prepare('update quiz_sets set closed = ? where id = ?').bind(body.closed ? 1 : 0, a).run()
    return json({ ok: true })
  }
  if (b === 'scores' && method === 'GET' && c) return json(await attemptReport(DB, a, c))
  if (b === 'scores' && method === 'GET') return json(await scores(DB, set))

  return json({ error: 'not found' }, 404)
}

// ---- taking --------------------------------------------------------------------

// What the taker sees for an open attempt: questions in order, options shuffled,
// no keys, no marking guides; their saved answers; seconds left.
function running(at, content) {
  const plan = parse(at.plan) || [], answers = parse(at.answers) || {}
  const byId = new Map((content?.questions || []).map(q => [q.id, q]))
  return {
    attempt: at.id, trial: !!at.trial, deadline: at.deadline,
    secondsLeft: Math.max(0, Math.round((Date.parse(at.deadline) - Date.now()) / 1000)),
    questions: plan.map(p => byId.get(p.qid)).filter(Boolean).map((q, i) => ({
      id: q.id, sec: q.sec, q: q.q, o: plan[i].order.map(k => q.o[k]),
      explain: q.explain ? { prompt: q.explain.prompt } : null,
    })),
    answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { c: v.c ?? null, x: v.x || '' }])),
  }
}

async function saveAnswer(DB, at, content, body, json) {
  if (at.submitted_at) return json({ error: 'This attempt is already submitted.' }, 409)
  if (Date.now() > Date.parse(at.deadline) + GRACE_S * 1000) {
    await finish(DB, at, content)
    return json({ error: 'Time is up. Your saved answers were submitted.' }, 409)
  }
  const q = content.questions.find(x => x.id === body.qid)
  if (!q) return json({ error: 'That question is not in this quiz.' }, 400)
  const choice = body.choice == null ? null : String(body.choice)
  if (choice !== null && !q.o.includes(choice)) return json({ error: 'That answer is not one of the options.' }, 400)
  const answers = parse(at.answers) || {}
  answers[q.id] = { c: choice, x: q.explain ? String(body.explain || '').slice(0, MAX_TEXT) : '' }
  const r = await DB.prepare('update quiz_attempts set answers = ? where id = ? and submitted_at is null').bind(JSON.stringify(answers), at.id).run()
  if (!r.meta?.changes) return json({ error: 'This attempt is already submitted.' }, 409)
  return json({ ok: true })
}

// Mark the choices (sentence against the key) and close the attempt.
// Staff get their score only; which questions were wrong stays with admins.
async function finish(DB, at, content) {
  const answers = parse(at.answers) || {}
  let auto = 0
  for (const q of content.questions) {
    const x = answers[q.id] || (answers[q.id] = { c: null, x: '' })
    x.ok = x.c != null && q.a && x.c === q.a ? 1 : 0
    if (x.ok) auto += q.pts || 1
  }
  const written = content.questions.filter(q => q.explain).length
  // No written part: nothing to mark, so the written score is 0, not pending.
  await DB.prepare(`update quiz_attempts set answers = ?, auto_score = ?, mark_score = ?, submitted_at = ? where id = ? and submitted_at is null`)
    .bind(JSON.stringify(answers), auto, written ? null : 0, new Date().toISOString(), at.id).run()
  return { submitted: true, auto, max: at.max_score, autoMax: content.questions.reduce((s, q) => s + (q.pts || 1), 0), written, trial: !!at.trial }
}

// Close any attempt of mine on this set whose clock ran out.
async function closeExpired(DB, email, setId) {
  const { results } = await DB.prepare('select * from quiz_attempts where email = ? and set_id = ? and submitted_at is null').bind(email, setId).all()
  for (const at of results) {
    if (Date.now() <= Date.parse(at.deadline) + GRACE_S * 1000) continue
    const content = await contentFor(DB, at)
    if (content) await finish(DB, at, content)
  }
}

// The content an attempt was started on: the draft for a trial, else the live set.
async function contentFor(DB, at) {
  const s = await DB.prepare('select draft, live, published_at from quiz_sets where id = ?').bind(at.set_id).first()
  if (!s) return null
  if (at.trial) return parse(s.draft)
  return parse(s.live)
}

async function mine(DB, email, setId) {
  const { results } = await DB.prepare(`select started_at, submitted_at, auto_score, mark_score, max_score, trial from quiz_attempts
    where email = ? and set_id = ? and submitted_at is not null order by started_at`).bind(email, setId).all()
  return results.filter(r => !r.trial).map((r, i) => ({ n: i + 1, at: r.submitted_at, score: total(r), max: r.max_score, pending: r.mark_score == null }))
}

async function listSets(DB, email, isAdmin) {
  const { results } = await DB.prepare('select id, kind, draft, live, closed, published_at, sort from quiz_sets order by sort, id').all()
  const out = []
  for (const s of results) {
    if (!s.live && !isAdmin) continue
    const c = parse(s.live) || parse(s.draft) || {}
    out.push({ id: s.id, kind: s.kind, state: stateOf(s), title: c.title, minutes: c.minutes, count: c.questions?.length || 0, max: maxScore(c), mine: await mine(DB, email, s.id) })
  }
  return out
}

// ---- admin ---------------------------------------------------------------------

async function scores(DB, set) {
  const c = parse(set.live) || parse(set.draft) || {}
  const { results: people } = await DB.prepare('select email, full_name from profiles where approved = 1 order by email').all()
  const { results: rows } = await DB.prepare(`select email, started_at, submitted_at, auto_score, mark_score, max_score, answers from quiz_attempts
    where set_id = ? and trial = 0 order by started_at`).bind(set.id).all()
  const by = new Map()
  for (const r of rows) { if (!by.has(r.email)) by.set(r.email, []); by.get(r.email).push(r) }
  // Question misses across submitted attempts.
  const miss = new Map()
  for (const r of rows) if (r.submitted_at) for (const [qid, x] of Object.entries(parse(r.answers) || {})) {
    const e = miss.get(qid) || { asked: 0, wrong: 0 }; e.asked++; if (!x.ok) e.wrong++; miss.set(qid, e)
  }
  const qs = c.questions || []
  return {
    id: set.id, title: c.title, state: stateOf(set), max: maxScore(c), bands: c.bands || [],
    missed: [...miss].filter(([, v]) => v.wrong).sort((x, y) => y[1].wrong / y[1].asked - x[1].wrong / x[1].asked).slice(0, 3)
      .map(([qid, v]) => ({ qid, n: qs.findIndex(q => q.id === qid) + 1, wrong: v.wrong, asked: v.asked })),
    people: people.map(p => {
      const list = (by.get(p.email) || []).filter(r => r.submitted_at)
      const t = list.map(total)
      return {
        email: p.email, name: p.full_name, attempts: list.length, open: (by.get(p.email) || []).some(r => !r.submitted_at),
        first: t.length ? t[0] : null, best: t.length ? Math.max(...t) : null, latest: t.length ? t[t.length - 1] : null,
        toMark: list.filter(r => r.mark_score == null).length, latestFinal: list.length ? list[list.length - 1].mark_score != null : false,
      }
    }),
  }
}

// One person's attempts on one set, question by question. Question text and the
// key come from the set's current content; the chosen answer is the sentence saved.
async function attemptReport(DB, setId, who) {
  const s = await DB.prepare('select live, draft from quiz_sets where id = ?').bind(setId).first()
  const qs = (parse(s?.live) || parse(s?.draft) || {}).questions || []
  const { results } = await DB.prepare(`select * from quiz_attempts where set_id = ? and email = ? and trial = 0 order by started_at`).bind(setId, who).all()
  return results.map((r, i) => {
    const answers = parse(r.answers) || {}, marks = parse(r.marks) || {}
    return {
      n: i + 1, id: r.id, started_at: r.started_at, submitted_at: r.submitted_at, version: r.version,
      auto: r.auto_score, marked: r.mark_score, score: r.submitted_at ? total(r) : null, max: r.max_score,
      items: qs.map((q, k) => {
        const x = answers[q.id] || {}
        return {
          k: k + 1, qid: q.id, q: q.q, chose: x.c ?? null, right: q.a || null, correct: !!x.ok, focus: q.focus || null,
          explain: q.explain ? { text: x.x || '', pts: q.explain.pts, rubric: q.explain.rubric || '', mark: marks[q.id] ?? null } : null,
        }
      }),
    }
  })
}

async function mark(DB, at, body, email, json) {
  if (!at.submitted_at) return json({ error: 'This attempt is not submitted yet.' }, 409)
  const content = await contentFor(DB, at)
  const q = content?.questions.find(x => x.id === body.qid)
  if (!q?.explain) return json({ error: 'That question has no written part.' }, 400)
  const pts = Number(body.pts)
  if (!Number.isInteger(pts) || pts < 0 || pts > q.explain.pts) return json({ error: `Give 0 to ${q.explain.pts} points.` }, 400)
  const marks = parse(at.marks) || {}
  marks[q.id] = pts
  const written = content.questions.filter(x => x.explain)
  // The written score counts once every written answer has a mark.
  const done = written.every(x => marks[x.id] != null)
  const sum = done ? written.reduce((s, x) => s + marks[x.id], 0) : null
  await DB.prepare('update quiz_attempts set marks = ?, mark_score = ?, marked_by = ? where id = ?').bind(JSON.stringify(marks), sum, email, at.id).run()
  return json({ ok: true, mark_score: sum })
}

// ---- helpers -------------------------------------------------------------------

function stateOf(s) { return !s.live ? 'draft' : s.closed ? 'closed' : 'live' }
function maxScore(c) { return (c?.questions || []).reduce((s, q) => s + (q.pts || 1) + (q.explain?.pts || 0), 0) }
function total(r) { return (r.auto_score || 0) + (r.mark_score || 0) }

// Takers get questions and options only: no keys, no marking guides.
function forTaker(c) {
  if (!c) return null
  return {
    title: c.title, intro: c.intro, minutes: c.minutes, maxAttempts: c.maxAttempts || null, ref: c.ref, sections: c.sections,
    count: c.questions?.length || 0, max: maxScore(c), written: (c.questions || []).filter(q => q.explain).length,
  }
}

// Things that block publishing.
function problems(c) {
  if (!c) return ['Content is missing.']
  const p = []
  if (!c.title) p.push('The quiz needs a title.')
  if (!(c.minutes > 0)) p.push('Set the time limit in minutes.')
  const qs = c.questions || []
  if (!qs.length) p.push('The quiz has no questions.')
  const ids = new Set()
  qs.forEach((q, i) => {
    const n = `Q${i + 1}`
    if (!q.id || ids.has(q.id)) p.push(`${n} needs its own id.`)
    ids.add(q.id)
    if (!q.q || !Array.isArray(q.o) || q.o.length < 2) p.push(`${n} is incomplete.`)
    else if (new Set(q.o).size !== q.o.length) p.push(`${n} has two options with the same wording.`)
    else if (!q.a) p.push(`${n} has no answer key.`)
    else if (!q.o.includes(q.a)) p.push(`${n}: the answer key does not match any option word for word.`)
    if (q.explain && !q.explain.rubric) p.push(`${n} needs a marking guide for the written part.`)
  })
  if (JSON.stringify(c).includes('[CONFIRM]')) p.push('Resolve every [CONFIRM] note.')
  return p
}

function shuffle(a) {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [x[i], x[j]] = [x[j], x[i]]
  }
  return x
}
function parse(s) { try { return s ? JSON.parse(s) : null } catch { return null } }
