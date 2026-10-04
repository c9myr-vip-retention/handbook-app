// Learn API (/api/learn/*), called from functions/api/[[path]].js after the
// caller is signed in and approved. Guides and quizzes sit on top of the SOP
// Book; the SOP stays the official rule.
//
// Integrity rules enforced here, not in the browser:
// - Readers only get the live content, with the quiz answers and reasons removed.
// - Questions are picked and marked on the server, one at a time, with a time
//   limit per question. The answer is revealed only after it is submitted.
// - A module is tied to the SOP version it was approved for. When the SOP moves
//   on, no new attempts start until an admin publishes content for the new version.
// - Publishing is refused while anything is still marked [CONFIRM] or a glossary
//   meaning is missing: staff are never taught or tested on unconfirmed content.
//
//   GET  /api/learn                       modules (readers: published only)
//   GET  /api/learn/scores                admin: people x modules, most-missed questions
//   GET  /api/learn/:id                   module for reading (?draft=1: admin, full draft)
//   PUT  /api/learn/:id/draft             admin: save draft content
//   POST /api/learn/:id/publish           admin: draft -> live, pinned to the current SOP version
//   POST /api/learn/:id/read              tick "guide read" for the current version
//   POST /api/learn/:id/attempts          start a quiz, returns the first question
//   POST /api/learn/attempts/:aid/answer  { qid, choice } -> marked result and the next question

const GRACE_S = 5 // network slack on the per-question timer

export async function handleLearn({ request, env, parts, email, isAdmin, isMaster, json }) {
  const DB = env.DB
  const method = request.method
  const [, a, b, c] = parts // parts[0] === 'learn'

  // Staff lock: until LEARN_FOR_STAFF = "yes" in wrangler.toml, Learn is admins
  // only, even for published modules. Staff get an empty list and nothing else.
  if (!isAdmin && env.LEARN_FOR_STAFF !== 'yes') {
    return method === 'GET' && !a ? json([]) : json({ error: 'not found' }, 404)
  }

  if (method === 'GET' && !a) return json(await listModules(DB, email, isAdmin, isMaster))
  if (method === 'GET' && a === 'scores') {
    if (!isAdmin) return json({ error: 'admins only' }, 403)
    return json(await scores(DB))
  }
  if (a === 'attempts' && b && c === 'answer' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    return answer(DB, email, b, body.choice, body.qid, json)
  }
  if (!a) return json({ error: 'not found' }, 404)

  // Admin: start a module for an SOP that has none yet (an empty draft to fill in).
  if (b === 'create' && method === 'POST') {
    if (!isAdmin) return json({ error: 'admins only' }, 403)
    const sopRow = await DB.prepare('select id from sops where id = ?').bind(a).first()
    if (!sopRow) return json({ error: 'That SOP does not exist.' }, 400)
    const r = await DB.prepare(`insert into learn_modules (id, draft, draft_by, draft_at, sort) values (?, ?, ?, datetime('now'), (select coalesce(max(sort), 0) + 1 from learn_modules))
      on conflict(id) do nothing`).bind(a, JSON.stringify(skeleton()), email).run()
    if (!r.meta?.changes) return json({ error: 'This SOP already has a module.' }, 409)
    return json({ ok: true })
  }

  const mod = await DB.prepare('select * from learn_modules where id = ?').bind(a).first()
  if (!mod) return json({ error: 'not found' }, 404)
  const sop = await DB.prepare('select title, version, meta, restricted from sops where id = ?').bind(a).first()
  if (!sop || (sop.restricted && !isMaster)) return json({ error: 'not found' }, 404)
  const st = state(mod, sop)

  if (method === 'GET' && !b) {
    if (new URL(request.url).searchParams.get('draft') && isAdmin) {
      const d = parse(mod.draft)
      return json({ id: a, title: sop.title, ...st, content: d, draft_by: mod.draft_by, draft_at: mod.draft_at, problems: [...shapeErrors(d), ...problems(d)] })
    }
    if (!mod.live && !isAdmin) return json({ error: 'not found' }, 404)
    const content = parse(mod.live) || (isAdmin ? parse(mod.draft) : null)
    return json({ id: a, title: sop.title, ...st, content: forReader(content), me: await myProgress(DB, email, a, mod.sop_version) })
  }

  if (b === 'draft' && method === 'PUT') {
    if (!isAdmin) return json({ error: 'admins only' }, 403)
    // A draft may be unfinished: save it, and report what still blocks publishing.
    const body = await request.json().catch(() => null)
    const c = body?.content
    if (!c || typeof c !== 'object' || Array.isArray(c)) return json({ error: 'Nothing to save.' }, 400)
    const text = JSON.stringify(c)
    if (text.length > 200000) return json({ error: 'This module is too large to save.' }, 400)
    await DB.prepare(`update learn_modules set draft = ?, draft_by = ?, draft_at = datetime('now') where id = ?`)
      .bind(text, email, a).run()
    return json({ ok: true, problems: [...shapeErrors(c), ...problems(c)] })
  }

  if (b === 'publish' && method === 'POST') {
    if (!isAdmin) return json({ error: 'admins only' }, 403)
    const draft = parse(mod.draft)
    const bad = [...shapeErrors(draft), ...problems(draft)]
    if (bad.length) return json({ error: 'Not published. Fix these first: ' + bad.join(' ') }, 400)
    await DB.prepare(`update learn_modules set live = draft, sop_version = ?, published_by = ?, published_at = datetime('now') where id = ?`)
      .bind(st.sop_now, email, a).run()
    return json({ ok: true, sop_version: st.sop_now })
  }

  if (b === 'read' && method === 'POST') {
    if (st.state !== 'live') return json({ error: 'This guide is not open right now.' }, 409)
    await DB.prepare('insert into learn_reads (email, module_id, sop_version) values (?,?,?) on conflict do nothing')
      .bind(email, a, mod.sop_version).run()
    return json({ ok: true })
  }

  if (b === 'attempts' && method === 'POST') {
    if (st.state !== 'live') return json({ error: st.state === 'review' ? 'The SOP was updated. This quiz is paused until the guide is reviewed.' : 'This quiz is not open yet.' }, 409)
    const quiz = parse(mod.live).quiz
    const picked = shuffle(quiz.pool).slice(0, quiz.count)
    const plan = picked.map(q => ({ qid: q.id, order: shuffle(q.o.map((_, i) => i)) }))
    const id = crypto.randomUUID()
    await DB.prepare('insert into learn_attempts (id, email, module_id, sop_version, plan, served_at, total) values (?,?,?,?,?,?,?)')
      .bind(id, email, a, mod.sop_version, JSON.stringify(plan), new Date().toISOString(), plan.length).run()
    return json({ attempt: id, total: plan.length, seconds: quiz.seconds, pass: quiz.pass, index: 0, question: shown(picked[0], plan[0].order) })
  }

  return json({ error: 'not found' }, 404)
}

async function answer(DB, email, aid, choice, qid, json) {
  const at = await DB.prepare('select * from learn_attempts where id = ? and email = ?').bind(aid, email).first()
  if (!at) return json({ error: 'not found' }, 404)
  if (at.finished_at) return json({ error: 'This attempt is already finished.' }, 409)
  const mod = await DB.prepare('select live from learn_modules where id = ?').bind(at.module_id).first()
  const quiz = parse(mod?.live)?.quiz
  const plan = parse(at.plan), answers = parse(at.answers) || []
  const i = answers.length
  const step = plan[i], q = quiz?.pool.find(x => x.id === step?.qid)
  if (!q) return json({ error: 'This question changed. Start the quiz again.' }, 409)
  // The answer names its question, so a repeat click never answers the next one unseen.
  if (qid !== step.qid) return json({ error: 'That answer was already recorded.' }, 409)

  const elapsed = (Date.now() - Date.parse(at.served_at)) / 1000
  const timedOut = elapsed > quiz.seconds + GRACE_S
  const shownIdx = Number.isInteger(choice) && choice >= 0 && choice < step.order.length ? choice : null
  const original = timedOut || shownIdx === null ? null : step.order[shownIdx]
  const correct = original === q.a
  answers.push({ qid: q.id, choice: original, correct, at: new Date().toISOString() })
  const score = at.score + (correct ? 1 : 0)
  const done = answers.length >= plan.length
  const pct = done ? Math.round(score / plan.length * 100) : null
  const passed = done ? (pct >= quiz.pass ? 1 : 0) : null

  // Only one submission per question counts (guards double clicks and replays).
  const r = await DB.prepare(`update learn_attempts set answers = ?, score = ?, served_at = ?, pct = ?, passed = ?,
      finished_at = case when ? then datetime('now') else null end
    where id = ? and json_array_length(answers) = ? and finished_at is null`)
    .bind(JSON.stringify(answers), score, new Date().toISOString(), pct, passed, done ? 1 : 0, aid, i).run()
  if (!r.meta?.changes) return json({ error: 'That answer was already recorded.' }, 409)

  const res = { correct, timedOut, correctChoice: step.order.indexOf(q.a), why: q.why, index: i, total: plan.length, score }
  if (done) {
    const best = await DB.prepare('select max(pct) best, count(*) n from learn_attempts where email = ? and module_id = ? and finished_at is not null')
      .bind(email, at.module_id).first()
    res.result = { pct, passed: !!passed, pass: quiz.pass, best: best.best, attempts: best.n }
  } else {
    const nq = quiz.pool.find(x => x.id === plan[i + 1].qid)
    res.next = { index: i + 1, question: shown(nq, plan[i + 1].order) }
  }
  return json(res)
}

async function listModules(DB, email, isAdmin, isMaster) {
  const { results } = await DB.prepare(`select m.id, m.live, m.draft, m.sop_version, m.sort, s.title, s.version, s.meta, s.restricted
    from learn_modules m join sops s on s.id = m.id order by m.sort, s.title`).all()
  const out = []
  for (const m of results) {
    if (m.restricted && !isMaster) continue
    if (!m.live && !isAdmin) continue
    const st = state(m, m)
    const content = parse(m.live) || parse(m.draft) || {}
    out.push({ id: m.id, title: m.title, ...st, minutes: content.minutes, count: content.quiz?.count, me: await myProgress(DB, email, m.id, m.sop_version) })
  }
  return out
}

async function myProgress(DB, email, id, version) {
  const best = await DB.prepare('select max(pct) best, count(*) n, max(passed) passed from learn_attempts where email = ? and module_id = ? and finished_at is not null')
    .bind(email, id).first()
  const read = version ? await DB.prepare('select 1 from learn_reads where email = ? and module_id = ? and sop_version = ?').bind(email, id, version).first() : null
  return { best: best?.best ?? null, attempts: best?.n || 0, passed: !!best?.passed, read: !!read }
}

async function scores(DB) {
  const { results: mods } = await DB.prepare(`select m.id, m.live, m.draft, m.sop_version, s.title, s.version, s.meta
    from learn_modules m join sops s on s.id = m.id order by m.sort, s.title`).all()
  const { results: people } = await DB.prepare('select email, full_name from profiles where approved = 1 order by email').all()
  const out = []
  for (const m of mods) {
    const content = parse(m.live) || parse(m.draft) || {}
    const { results: agg } = await DB.prepare(`select email, max(pct) best, count(*) n from learn_attempts
      where module_id = ? and finished_at is not null group by email`).bind(m.id).all()
    const { results: reads } = await DB.prepare('select email from learn_reads where module_id = ? and sop_version = ?').bind(m.id, m.sop_version || '').all()
    const { results: done } = await DB.prepare('select answers from learn_attempts where module_id = ? and finished_at is not null').bind(m.id).all()
    const byEmail = new Map(agg.map(r => [r.email, r])), readSet = new Set(reads.map(r => r.email))
    const miss = new Map()
    for (const d of done) for (const x of parse(d.answers) || []) {
      const e = miss.get(x.qid) || { asked: 0, wrong: 0 }
      e.asked++; if (!x.correct) e.wrong++
      miss.set(x.qid, e)
    }
    const pool = content.quiz?.pool || []
    const missed = [...miss].filter(([, v]) => v.wrong).sort((x, y) => y[1].wrong / y[1].asked - x[1].wrong / x[1].asked).slice(0, 3)
      .map(([qid, v]) => ({ qid, q: pool.find(p => p.id === qid)?.q || qid, wrong: v.wrong, asked: v.asked }))
    out.push({
      id: m.id, title: m.title, ...state(m, m), pass: content.quiz?.pass,
      people: people.map(p => ({ email: p.email, name: p.full_name, read: readSet.has(p.email), best: byEmail.get(p.email)?.best ?? null, attempts: byEmail.get(p.email)?.n || 0 })),
      missed,
    })
  }
  return out
}

// The SOP version is the header chip (as the app shows it), else the version column.
function sopVersion(row) {
  const meta = parse(row.meta)
  return (Array.isArray(meta) && meta.find(x => /^V\d/.test(x))) || row.version || 'V1.0'
}
function state(mod, sop) {
  const sop_now = sopVersion(sop)
  const s = !mod.live ? 'draft' : mod.sop_version !== sop_now ? 'review' : 'live'
  return { state: s, sop_version: mod.sop_version, sop_now }
}

// Readers never receive answers or reasons.
function forReader(content) {
  if (!content) return null
  const { quiz, ...rest } = content
  return { ...rest, quiz: quiz ? { count: quiz.count, pass: quiz.pass, seconds: quiz.seconds } : null }
}
function shown(q, order) { return { id: q.id, q: q.q, o: order.map(i => q.o[i]) } }

// A new module's starting draft: the four standard cards, empty, and no questions.
function skeleton() {
  return {
    minutes: 5,
    words: [],
    tour: [
      { key: 'when', label: 'When', kind: 'check', title: '', sec: '', secLabel: '', items: [], done: '', notYet: '' },
      { key: 'do', label: 'Do', kind: 'steps', title: '', sec: 'Procedure', secLabel: 'Procedure', items: [] },
      { key: 'never', label: 'Never', kind: 'never', title: '', sec: 'Guards', secLabel: 'Guards', items: [] },
      { key: 'approver', label: 'Approver', kind: 'gate', title: '', sec: '', secLabel: '', q: '', yes: '', no: '' },
    ],
    quiz: { count: 5, pass: 80, seconds: 60, pool: [] },
  }
}

function shapeErrors(c) {
  const e = []
  if (!c || typeof c !== 'object') return ['Content is missing.']
  if (!Array.isArray(c.words)) e.push('Words must be a list.')
  if (!Array.isArray(c.tour) || !c.tour.length) e.push('The guide needs at least one card.')
  const q = c.quiz
  if (!q || !Array.isArray(q.pool)) e.push('The quiz is missing.')
  else {
    if (!(q.count >= 1) || q.pool.length < q.count) e.push(`The quiz asks ${q.count} questions but has ${q.pool.length}.`)
    const ids = new Set()
    q.pool.forEach((x, i) => {
      if (!x.id || ids.has(x.id)) e.push(`Question ${i + 1} needs its own id.`)
      ids.add(x.id)
      if (!x.q || !Array.isArray(x.o) || x.o.length < 2 || !(x.a >= 0 && x.a < x.o.length) || !x.why) e.push(`Question ${i + 1} is incomplete.`)
    })
  }
  return e
}
// Things that block publishing: unconfirmed content.
function problems(c) {
  if (!c) return []
  const p = []
  for (const [t, d] of c.words || []) if (!t || !d) p.push(t ? `Write the meaning of "${t}".` : 'A glossary row has no term.')
  for (const t of c.tour || []) {
    const name = `The "${t.label || 'untitled'}" card`
    if (!t.label) p.push(`A card has no tab label.`)
    if (!t.title) p.push(`${name} needs a title.`)
    if (['check', 'steps', 'never'].includes(t.kind) && !(t.items || []).length) p.push(`${name} has no items.`)
    if (t.kind === 'gate' && !(t.q && t.yes && t.no)) p.push(`${name} needs the question and both answers.`)
    if (t.kind === 'ladder' && !(t.ladder?.rows?.length && t.ladder.capPct > 0 && t.ladder.input)) p.push(`${name} needs ladder rows, the SW cap and the amount label.`)
  }
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
