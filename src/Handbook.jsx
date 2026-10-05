import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from './lib/api.js'
import { parseBody, toMarkdown } from './lib/markdown.js'
import { Chart, ChartSvg, ChartDrawer, parseChart, chartText } from './Chart.jsx'
import NameForm from './NameForm.jsx'
import { GlossaryPage } from './Glossary.jsx'
import { QuizzesHome, QuizSet, QuizScores, quizLeaveOk, quizHash } from './Quizzes.jsx'
import { LearnHome, LearnModule, QuizPage, ScoresPage, SopLearnLink } from './Learn.jsx'
import { LearnEditor } from './LearnEditor.jsx'

const STATUS_LABEL = { pending: 'Coming soon', planned: 'Not written yet', external: 'Lark doc', restricted: 'Admins only' }

// Flatten every nav leaf into a searchable list, once per content load.
// The SOP header goes last: still searchable, but snippets show page text first.
function bodyText(page) {
  if (!page) return ''
  const text = (b) => {
    if (b.t === 'p' || b.t === 'h2' || b.t === 'code' || b.t === 'flow') return b.x
    if (b.t === 'chart') return chartText(parseChart(b.x))
    if (b.t === 'sopheader') return (b.f || []).map(([k, v]) => k + ' ' + v).join(' ')
    if (b.t === 'callout') return (b.title || '') + ' ' + (b.x || '')
    if (b.t === 'steps' || b.t === 'list') return b.x.join(' ')
    if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.flat().join(' ')
    return ''
  }
  const rest = page.blocks.filter(b => b.t !== 'sopheader'), head = page.blocks.filter(b => b.t === 'sopheader')
  return [...rest, ...head].map(text).join(' ').replace(/\*\*|`/g, '')
}

// Inline marks inside block text: **bold** and `code`. Plain text otherwise.
// Bare URLs get a span that may break anywhere, so they never widen a table.
function Inline({ x }) {
  const parts = String(x ?? '').split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/\S+)/g)
  return parts.map((s, i) =>
    s.startsWith('**') && s.endsWith('**') && s.length > 4 ? <b key={i}>{s.slice(2, -2)}</b>
    : s.startsWith('`') && s.endsWith('`') && s.length > 2 ? <code key={i}>{s.slice(1, -1)}</code>
    : /^https?:\/\//.test(s) ? <span key={i} className="url">{s}</span>
    : s)
}
function buildIndex(nav, pages) {
  const out = []
  const mk = (it, section, domain) => {
    const page = it.id && pages[it.id]
    const body = bodyText(page)
    const text = [it.title, section, domain, it.keywords || '', body].join(' ').toLowerCase()
    return { title: it.title, section, domain, id: it.id, status: it.status, real: !!page, text, body,
      tl: it.title.toLowerCase(), kw: (it.keywords || '').toLowerCase() }
  }
  for (const sec of nav) {
    if (sec.domains) {
      for (const d of sec.domains) for (const it of d.items) out.push(mk(it, 'SOP Book', d.name))
    } else {
      for (const it of sec.items) out.push(mk(it, sec.name, ''))
    }
  }
  return out
}

function search(index, q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return index
    .map(item => {
      let score = 0
      for (const t of terms) {
        if (!item.text.includes(t)) return null
        if (item.tl.includes(t)) score += 5
        else if (item.kw.includes(t)) score += 3
        else score += 1
      }
      return { item, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item)
}

export default function Handbook({ content, profile, onSignOut, preview, notice, onPageSaved, onName }) {
  // Name prompt: shown until the person sets their name; Later hides it for this visit.
  const [nameOpen, setNameOpen] = useState(() => !!profile && !profile.full_name)
  const { nav: NAV, pages: PAGES } = content
  const INDEX = useMemo(() => buildIndex(NAV, PAGES), [NAV, PAGES])
  const [route, setRoute] = useState(() => parseHash(location.hash, NAV))
  useEffect(() => {
    const onHash = () => {
      // A running quiz asks before it is left; staying puts its address back.
      const qh = quizHash()
      if (qh && location.hash !== qh && !skipGuard.current && !quizLeaveOk()) { history.pushState(null, '', qh); return }
      skipGuard.current = false
      setRoute(parseHash(location.hash, NAV)); setNavOpen(false); setRailOpen(false); setQuery(''); setSearchOpen(false)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [NAV])
  const [navOpen, setNavOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(false) // page tools drawer (narrow screens)
  const [searchOpen, setSearchOpen] = useState(false) // phone: search bar opened from its icon
  const searchBtn = useRef(null), searchBox = useRef(null)
  const closeSearch = () => { setSearchOpen(false); setQuery(''); searchBtn.current?.focus() }
  useEffect(() => { if (searchOpen) searchBox.current?.focus() }, [searchOpen])
  const [openSecs, setOpenSecs] = useState(() => ({ start: true }))
  const [query, setQuery] = useState('')

  const scrollPos = useRef({}), pushing = useRef(false), firstRoute = useRef(true), skipGuard = useRef(false)
  useEffect(() => {
    const onScroll = () => { scrollPos.current[location.hash || '#/'] = scrollY }
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const y = pushing.current ? 0 : (scrollPos.current[location.hash || '#/'] || 0)
    pushing.current = false
    requestAnimationFrame(() => {
      scrollTo(0, y)
      // Keyboard and screen-reader users land on the new page's heading.
      // Skipped on first load and on Home, where the search box takes focus.
      if (!firstRoute.current && route.kind !== 'home') {
        const h = document.querySelector('.content h1')
        if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) }
      }
      firstRoute.current = false
    })
  }, [route])

  const go = (r) => {
    const qh = quizHash()
    if (qh && toHash(r) !== qh) {
      if (!quizLeaveOk()) return
      skipGuard.current = true
    }
    setNavOpen(false)
    setQuery('')
    const h = toHash(r)
    pushing.current = true
    if (location.hash !== h) location.hash = h
    else setRoute(r)
  }
  const back = () => (history.length > 1 ? history.back() : go({ kind: 'home' }))
  // Keyboard: "/" focuses search, Escape closes the mobile menu or clears search.
  const menuBtn = useRef(null)
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        const box = document.querySelector(route.kind === 'home' ? '.herosearch' : '.searchbar input')
        if (box && !box.offsetParent) setSearchOpen(true)
        else box?.focus()
      } else if (e.key === 'Escape' && railOpen) {
        setRailOpen(false)
      } else if (e.key === 'Escape' && navOpen) {
        setNavOpen(false)
        menuBtn.current?.focus()
      } else if (e.key === 'Escape' && searchOpen) {
        closeSearch()
      } else if (e.key === 'Escape' && query) {
        setQuery('')
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [route, query, navOpen, railOpen, searchOpen])
  const openLeaf = (item) => {
    setQuery('')
    go(item.real ? { kind: 'page', key: item.id } : { kind: 'stub', title: item.title, status: item.status })
  }
  const results = useMemo(() => search(INDEX, query.trim()), [INDEX, query])
  const isAdmin = profile?.role === 'admin' || profile?.role === 'master'
  const canEdit = isAdmin || !!preview
  const [learnMods, setLearnMods] = useState([])
  useEffect(() => {
    if (preview) return
    api.learn().then(setLearnMods, () => setLearnMods([]))
  }, [preview, route.kind])
  const showLearn = !preview && (isAdmin || learnMods.some(m => m.state !== 'draft'))
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')
  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { localStorage.setItem('hb-theme', next ? 'dark' : 'light') } catch {}
  }

  // Open the sidebar branch that holds the current page.
  const [openDoms, setOpenDoms] = useState({})
  useEffect(() => {
    if (route.kind !== 'page' && route.kind !== 'domain') return
    for (const sec of NAV) {
      if (sec.domains) {
        const d = sec.domains.find(d => route.kind === 'domain' ? d.name === route.key : d.items.some(it => it.id === route.key))
        if (d) { setOpenSecs(o => ({ ...o, [sec.id]: true })); setOpenDoms(o => ({ ...o, [d.name]: true })) }
      } else if (route.kind === 'page' && sec.items.some(it => it.id === route.key)) {
        setOpenSecs(o => ({ ...o, [sec.id]: true }))
      }
    }
  }, [route, NAV])

  const title = useMemo(() => {
    if (route.kind === 'home') return 'Home'
    if (route.kind === 'domain') return route.key
    if (route.kind === 'page') return PAGES[route.key]?.title || route.key
    if (route.kind === 'stub') return route.title
    if (route.kind === 'approvals') return 'Access Management'
    if (route.kind === 'charts') return 'Chart review'
    if (route.kind === 'learn') return route.key ? (route.edit ? 'Edit guide: ' : 'Learn: ') + (PAGES[route.key]?.title || route.key) : 'Learn'
    if (route.kind === 'quiz') return 'Quiz: ' + (PAGES[route.key]?.title || route.key)
    if (route.kind === 'scores') return 'Learning scores'
    if (route.kind === 'glossary') return 'Glossary'
    if (route.kind === 'quizzes') return 'Quiz'
    if (route.kind === 'qset') return 'Quiz'
    if (route.kind === 'qscores') return 'Quiz scores'
    if (route.kind === 'edit') return 'Edit: ' + (PAGES[route.key]?.title || route.key)
    if (route.kind === 'history') return 'History: ' + (PAGES[route.key]?.title || route.key)
    return ''
  }, [route])
  useEffect(() => { document.title = (title && title !== 'Home' ? title + ' · ' : '') + 'C9MYR VIP Retention Handbook' }, [title])

  return (
    <div className={'hb' + (navOpen ? ' nav-open' : '') + (railOpen ? ' rail-open' : '')}>
      <a className="skip" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
      <div className="scrim" onClick={() => { setNavOpen(false); setRailOpen(false) }} />
      <aside className="side" id="sidenav">
        <button className="brand" onClick={() => { setQuery(''); go({ kind: 'home' }) }} aria-label="C9MYR VIP Retention Handbook, home"><svg className="logo" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6C39 23 12 37 12 58c0 13 11 22 23 20 6-1 10-4 13-8-1 10-5 18-12 24h28c-7-6-11-14-12-24 3 4 7 7 13 8 12 2 23-7 23-20 0-21-27-35-38-52z" /></svg><span className="brandtext"><small>C9MYR</small><b>VIP Retention Handbook</b></span></button>
        <button className={'navitem homeitem' + (route.kind === 'home' ? ' active' : '')} aria-current={route.kind === 'home' ? 'page' : undefined}
          onClick={() => { setQuery(''); go({ kind: 'home' }) }}><span>Home</span></button>
        {showLearn && <button className={'navitem homeitem' + (['learn', 'quiz', 'scores'].includes(route.kind) ? ' active' : '')} aria-current={route.kind === 'learn' && !route.key ? 'page' : undefined}
          onClick={() => { setQuery(''); go({ kind: 'learn' }) }}><span>Learn</span></button>}
        {!preview && <button className={'navitem homeitem' + (route.kind === 'glossary' ? ' active' : '')} aria-current={route.kind === 'glossary' ? 'page' : undefined}
          onClick={() => { setQuery(''); go({ kind: 'glossary' }) }}><span>Glossary</span></button>}
        {!preview && <button className={'navitem homeitem' + (['quizzes', 'qset', 'qscores'].includes(route.kind) ? ' active' : '')} aria-current={route.kind === 'quizzes' ? 'page' : undefined}
          onClick={() => { setQuery(''); go({ kind: 'quizzes' }) }}><span>Quiz</span></button>}
        <nav aria-label="Handbook sections">
          {NAV.map(sec => (
            <div key={sec.id} className={'navsec' + (openSecs[sec.id] ? ' open' : '')}>
              <button className="navhead" aria-expanded={!!openSecs[sec.id]} onClick={() => setOpenSecs(s => ({ ...s, [sec.id]: !s[sec.id] }))}>
                <span>{sec.name}</span>
                <span className="chev" aria-hidden>›</span>
              </button>
              <div className="navsub">
                {sec.domains
                  ? sec.domains.map(d => (
                      <div key={d.name} className={'navdom' + (openDoms[d.name] ? ' open' : '')}>
                        <button className={'navitem navdomhead' + (route.kind === 'domain' && route.key === d.name ? ' active' : '')}
                          aria-expanded={!!openDoms[d.name]}
                          onClick={() => { setOpenDoms(o => ({ ...o, [d.name]: !o[d.name] })); if (!openDoms[d.name]) go({ kind: 'domain', key: d.name }) }}>
                          <span>{d.name}</span><span className="chev" aria-hidden>›</span>
                        </button>
                        {openDoms[d.name] && (
                          <div className="navleaves">
                            {d.items.map(it => <NavLeaf key={it.id || it.title} it={it} route={route} go={go} pages={PAGES} />)}
                          </div>
                        )}
                      </div>
                    ))
                  : sec.items.map(it => (
                      <NavLeaf key={it.id || it.title} it={it} route={route} go={go} pages={PAGES} child={!!it.parent} />
                    ))}
              </div>
            </div>
          ))}
          {(isAdmin || preview) && (
            <div className="navsec admin-nav">
              <button className="navitem" onClick={() => { setQuery(''); go({ kind: 'approvals' }) }}>Access Management</button>
              <button className="navitem" onClick={() => { setQuery(''); go({ kind: 'charts' }) }}>Chart review (admin)</button>
            </div>
          )}
        </nav>
      </aside>

      <div className="main">
        <header className="top">
          <button ref={menuBtn} className="icon menu" aria-label="Menu" aria-expanded={navOpen} aria-controls="sidenav" onClick={() => setNavOpen(true)}>☰</button>
          {route.kind !== 'home' && <button className="icon backbtn" onClick={back} aria-label="Go back" title="Back"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
          <div className="ptitle">{title}</div>
          <div className={'searchbar' + (route.kind === 'home' ? ' on-home' : '') + (searchOpen ? ' open' : '')}>
            <input
              ref={searchBox}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search the handbook…"
              aria-label="Search the handbook"
            />
            <button className="btn small ghost searchclose" onClick={closeSearch}>Cancel</button>
          </div>
          {route.kind !== 'home' && (
            <button ref={searchBtn} className="icon searchbtn" aria-label="Search the handbook" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
            </button>
          )}
          {profile && <button className="whoami" title={profile.email + ' (click to change your name)'} onClick={() => setNameOpen(true)}>{profile.full_name || profile.email} <span className="rolechip">{ROLE_LABEL[profile.role] || profile.role}</span></button>}
          {preview && <span className="chip pending preview-chip">preview</span>}
          {(isAdmin || preview) && <button className="btn small ghost admin-btn" onClick={() => { setQuery(''); go({ kind: 'approvals' }) }}>Access Management</button>}
          {route.kind === 'page' && !query.trim() && (
            <button className="icon railbtn" aria-label="Page tools" title="Page tools" aria-expanded={railOpen} aria-controls="pagerail" onClick={() => setRailOpen(o => !o)}>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3.5" width="14" height="13" rx="2.5"/><path d="M12 3.5v13"/><path d="M14 7h1M14 10h1M14 13h1" strokeLinecap="round"/></svg>
            </button>
          )}
          <button className="btn small ghost theme-btn" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? 'Light' : 'Dark'}</button>
          {onSignOut && <button className="btn small" onClick={onSignOut}>Sign out</button>}
        </header>

        <main className="content" id="main" tabIndex={-1}>
          {nameOpen && profile && (
            <div className="nameprompt" role="region" aria-label="Your name">
              {!profile.full_name && <p><b>Add your working nickname</b> (the name the team calls you at work) so admins and your team know who you are.</p>}
              <NameForm initial={profile.full_name || ''} onSaved={n => { onName?.(n); setNameOpen(false) }} onCancel={() => setNameOpen(false)} />
            </div>
          )}
          {route.kind === 'home'
            ? <Home go={go} nav={NAV} pages={PAGES} notice={notice} query={query} setQuery={setQuery} results={results} open={openLeaf} showLearn={showLearn} />
            : query.trim()
            ? <SearchResults query={query} results={results} open={openLeaf} pages={PAGES} />
            : <>
                {route.kind === 'domain' && <DomainList name={route.key} go={go} nav={NAV} pages={PAGES} />}
                {route.kind === 'page' && <Page id={route.key} sec={route.sec} mod={learnMods.find(m => m.id === route.key)} pages={PAGES} nav={NAV} canEdit={canEdit} go={go} railOpen={railOpen} onRailClose={() => setRailOpen(false)} />}
                {route.kind === 'edit' && <Editor key={route.key + '/' + (route.sec ?? '')} id={route.key} sec={route.sec} pages={PAGES} preview={preview} go={go} onPageSaved={onPageSaved} />}
                {route.kind === 'history' && <History id={route.key} pages={PAGES} preview={preview} go={go} onPageSaved={onPageSaved} />}
                {route.kind === 'stub' && <Stub title={route.title} status={route.status} />}
                {route.kind === 'approvals' && <Approvals preview={preview} me={profile?.email} myRole={preview ? 'master' : profile?.role} />}
                {route.kind === 'charts' && <ChartReview pages={PAGES} go={go} />}
                {route.kind === 'learn' && (route.key
                  ? (route.edit && isAdmin ? <LearnEditor key={route.key} id={route.key} go={go} /> : <LearnModule key={route.key} id={route.key} go={go} canEdit={isAdmin} />)
                  : <LearnHome go={go} canEdit={isAdmin} pages={PAGES} nav={NAV} />)}
                {route.kind === 'quiz' && <QuizPage key={route.key} id={route.key} go={go} />}
                {route.kind === 'scores' && <ScoresPage go={go} />}
                {route.kind === 'glossary' && <GlossaryPage go={go} pages={PAGES} canEdit={isAdmin} />}
                {route.kind === 'quizzes' && <QuizzesHome go={go} isAdmin={isAdmin} showLearn={showLearn} />}
                {route.kind === 'qset' && <QuizSet key={route.key} id={route.key} go={go} isAdmin={isAdmin} />}
                {route.kind === 'qscores' && (isAdmin ? <QuizScores key={route.key} id={route.key} go={go} /> : <QuizzesHome go={go} />)}
              </>}
        </main>
      </div>
    </div>
  )
}

function NavLeaf({ it, route, go, pages: PAGES, child }) {
  const real = !!it.id && !!PAGES[it.id]
  const onClick = () => real ? go({ kind: 'page', key: it.id }) : go({ kind: 'stub', title: it.title, status: it.status })
  const active = real && route.kind === 'page' && route.key === it.id
  return (
    <button className={'navitem' + (child ? ' navchild' : '') + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} onClick={onClick}>
      <span>{it.title}</span>
      {!real && it.status && <span className={'dot ' + it.status} title={STATUS_LABEL[it.status]} />}
      {!real && it.status && <span className="sr-only">({STATUS_LABEL[it.status]})</span>}
    </button>
  )
}

const MONTH_IX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
// "Updated 26 Sep 2026" chip -> timestamp (0 when the page has none).
function updatedTime(page) {
  const m = (page?.meta || []).map(x => x.match(/^Updated (\d{1,2}) ([A-Z][a-z]{2}) (\d{4})/)).find(Boolean)
  return m && MONTH_IX[m[2]] != null ? new Date(+m[3], MONTH_IX[m[2]], +m[1]).getTime() : 0
}
const versionOf = (page) => (page?.meta || []).find(m => /^V\d/.test(m)) || 'V1.0'

// The pages staff open most, in daily order (ATL-approved list, 28 Sep 2026).
const ESSENTIALS = ['shift-overview', 'attendance-pre-shift', 'tag-library', 'grace', 'ltv', 'pnl', 'escalation', 'bonus-issuance-approval']
const SECTION_DESC = {
  start: 'Culture, department overview and team structure',
  sop: 'Step-by-step procedures for every task',
  hr: 'Work policy, leave, security and probation',
  fw: 'Engagement, KPI and relationship frameworks',
  lib: 'Templates, tags, case studies and tools',
}

function Home({ go, nav: NAV, pages: PAGES, notice, query, setQuery, results, open, showLearn }) {
  const leafRoute = (it) => it.id && PAGES[it.id] ? { kind: 'page', key: it.id } : { kind: 'stub', title: it.title, status: it.status }
  const essentials = ESSENTIALS.filter(id => PAGES[id])
  const recent = Object.entries(PAGES)
    .map(([id, p]) => ({ id, p, t: updatedTime(p) }))
    .filter(x => x.t)
    .sort((a, b) => b.t - a.t)
    .slice(0, 5)
  const q = query.trim()
  const dept = deptFacts(PAGES)
  return (
    <div className="view home">
      {notice && <div className="banner">{notice}</div>}
      <section className="hero">
        <p className="slogan">Winning Together! Growing Forever!</p>
        <h1>VIP Retention Handbook</h1>
        <p className="herolead">Every SOP, policy and playbook the department runs on. Always the current version.</p>
        <label className="searchlabel" htmlFor="homesearch">What do you need to do?</label>
        <input id="homesearch" className="herosearch" type="search" value={query} autoFocus
          onChange={e => setQuery(e.target.value)}
          placeholder="Try “bonus”, “vpn”, “handover”…" />
      </section>

      {q
        ? <SearchResults query={query} results={results} open={open} pages={PAGES} embedded />
        : <>
          {showLearn && <div className="learnlink home"><span><b>New here, or want a refresher?</b> Learn the key SOPs in 5-minute guides with a quick quiz.</span><button className="btn small" onClick={() => go({ kind: 'learn' })}>Start learning</button></div>}
          {essentials.length > 0 && <>
            <div className="sectitle"><h2>Daily essentials</h2><p>The pages you open every shift.</p></div>
            <ul className="tiles">
              {essentials.map((id) => (
                <li key={id}>
                  <button className="tile" onClick={() => go({ kind: 'page', key: id })}>
                    <b>{PAGES[id].title}</b>
                    <small>{String(PAGES[id].crumb || '').replace(/^SOP Book · /, '')}</small>
                  </button>
                </li>
              ))}
            </ul>
          </>}

          <About pages={PAGES} go={go} dept={dept} />

          <div className="sectitle"><h2>Browse by section</h2></div>
          <div className="list">
            {NAV.map(sec => {
              const n = sec.domains ? sec.domains.reduce((a, d) => a + d.items.length, 0) : sec.items.length
              const first = sec.domains ? { kind: 'domain', key: sec.domains[0].name } : leafRoute(sec.items[0])
              return (
                <Row key={sec.id} title={sec.name} sub={SECTION_DESC[sec.id]}
                  meta={n + (n === 1 ? ' page' : ' pages')} onClick={() => go(first)} />
              )
            })}
          </div>

          {recent.length > 0 && <>
            <div className="sectitle"><h2>Recently updated</h2></div>
            <div className="list">
              {recent.map(({ id, p }) => (
                <Row key={id} title={p.title} sub={p.crumb}
                  meta={(p.meta || []).find(m => m.startsWith('Updated'))}
                  chip={versionOf(p)}
                  onClick={() => go({ kind: 'page', key: id })} />
              ))}
            </div>
          </>}
        </>}
    </div>
  )
}

// Everything on Home about the department is read from its own pages
// (Department Overview, Culture & Conduct), so an edit there updates Home too.
function sectionAfter(page, head) {
  if (!page) return []
  const i = page.blocks.findIndex(b => b.t === 'h2' && head.test(b.x))
  if (i < 0) return []
  const end = page.blocks.findIndex((b, j) => j > i && b.t === 'h2')
  return page.blocks.slice(i + 1, end < 0 ? undefined : end)
}
function deptFacts(PAGES) {
  const dept = PAGES['department-overview']
  const table = (head) => sectionAfter(dept, head).find(b => b.t === 'table')?.rows || []
  const roles = table(/roles/i).map(([role, fn, scope]) => ({ role, fn, scope }))
  const teams = table(/brands by team/i).map(([team, list]) => ({
    team: String(team).replace(/\s*\(\d+\)$/, ''),
    brands: String(list).split(/,\s*/).map(x => ({ name: x.replace(/\s*\(TC\)$/, ''), tc: /\(TC\)$/.test(x) })),
  }))
  return { mission: sectionAfter(dept, /mission/i).find(b => b.t === 'p')?.x, roles, teams }
}

function About({ pages: PAGES, go, dept }) {
  const pillars = sectionAfter(PAGES.culture, /pillars/i).find(b => b.t === 'table')?.rows || []
  const { mission, roles, teams } = dept
  if (!mission && !pillars.length && !roles.length) return null
  // Home starts the chain at the Supervisor (ATL decision, 28 Sep 2026); the
  // full list, Department Head included, stays on Department Overview.
  const chain = roles.filter(r => !/admin|department head/i.test(r.role)), support = roles.filter(r => /admin/i.test(r.role))
  return (
    <>
      <div className="sectitle"><h2>Who we are</h2></div>
      <section className="who">
        {mission && <blockquote className="mission"><p>{mission}</p></blockquote>}

        <div className="whogrid">
          {chain.length > 0 && (
            <div className="whocard">
              <h3>How we're organised</h3>
              <ol className="chain">
                {chain.map(r => <li key={r.role}><b>{r.role}</b><span>{r.fn}</span></li>)}
              </ol>
              {support.map(r => <p key={r.role} className="support"><b>{r.role}</b> {r.scope}</p>)}
              <button className="crumblink" onClick={() => go({ kind: 'page', key: 'team-structure' })}>Team structure ›</button>
            </div>
          )}
          {teams.length > 0 && (
            <div className="whocard">
              <h3>Our brands</h3>
              {teams.map(t => (
                <div key={t.team} className="team">
                  <div className="teamname">{t.team} <span>{t.brands.length}</span></div>
                  <div className="brandchips">{t.brands.map(b => <span key={b.name} className={'brandchip' + (b.tc ? ' tc' : '')}>{b.name}</span>)}</div>
                </div>
              ))}
              <p className="legend"><span className="brandchip tc">TC</span> TC Gaming <span className="brandchip">Zyra</span> Zyra Gaming</p>
              <button className="crumblink" onClick={() => go({ kind: 'page', key: 'department-overview' })}>Department overview ›</button>
            </div>
          )}
        </div>

        {pillars.length > 0 && <>
          <h3 className="pillarhead">Our culture: the {pillars.length} Pillars</h3>
          <ol className="pillars">
            {pillars.map(([name, short]) => <li key={name}><b>{name}</b><span>{short}</span></li>)}
          </ol>
          <button className="crumblink" onClick={() => go({ kind: 'page', key: 'culture' })}>Culture &amp; Conduct ›</button>
        </>}
      </section>
    </>
  )
}

// "SOP Book · Money Control & Bonuses" -> links back up the tree.
function Crumb({ crumb, go, nav: NAV }) {
  const parts = String(crumb).split(' · ')
  const sop = NAV.find(s => s.domains)
  return (
    <div className="crumb">
      <button className="crumblink" onClick={() => go({ kind: 'home' })}>Home</button>
      {parts.map((part, i) => {
        const isDomain = sop?.domains.some(d => d.name === part)
        const sec = NAV.find(s => s.name === part && !s.domains)
        const parentPage = !isDomain && !sec && i > 0 ? NAV.find(s => s.name === parts[i - 1] && !s.domains)?.items.find(it => it.title === part) : null
        return (
          <span key={i}> / {isDomain
            ? <button className="crumblink" onClick={() => go({ kind: 'domain', key: part })}>{part}</button>
            : sec ? <button className="crumblink" onClick={() => go(sec.items[0]?.id ? { kind: 'page', key: sec.items[0].id } : { kind: 'home' })}>{part}</button>
            : parentPage ? <button className="crumblink" onClick={() => go({ kind: 'page', key: parentPage.id })}>{part}</button>
            : part}</span>
        )
      })}
    </div>
  )
}

// A parent page's sub pages as large cards. They rise in one by one, left to
// right, the first time the list scrolls into view.
function SubPages({ kids, pages: PAGES, go }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver !== 'function') { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <nav ref={ref} className={'subpages' + (seen ? ' in' : '')} aria-labelledby="subpages-h">
      <h2 id="subpages-h" className="subpages-h">Read each part</h2>
      <p className="subpages-lead">Each part has its own page with examples.</p>
      <ol className="subpages-list">{kids.map((k, n) => {
        const intro = PAGES[k.id].blocks.find(b => b.t === 'p')
        return (
          <li key={k.id} style={{ '--i': n }}>
            <button className="subpage" onClick={() => go({ kind: 'page', key: k.id })}>
              <span className="subpage-n" aria-hidden="true">{n + 1}</span>
              <span className="subpage-t">{k.title}</span>
              {intro && <span className="subpage-d">{firstSentence(intro.x)}</span>}
              <span className="subpage-go" aria-hidden="true">Open page ›</span>
            </button>
          </li>
        )
      })}</ol>
    </nav>
  )
}

const firstSentence = (x) => { const s = String(x).replace(/\*\*/g, ''); const m = s.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : s).trim() }

function DomainList({ name, go, nav: NAV, pages: PAGES }) {
  const domain = NAV.find(s => s.domains)?.domains.find(d => d.name === name)
  const items = domain?.items || []
  return (
    <div className="view">
      <div className="crumb"><button className="crumblink" onClick={() => go({ kind: 'home' })}>Home</button> / SOP Book / <b>{name}</b></div>
      <h1>{name}</h1>
      <p className="muted lead">{items.length} {items.length === 1 ? 'SOP' : 'SOPs'} in this domain.</p>
      <div className="list">
        {items.map(it => {
          const real = !!it.id && !!PAGES[it.id]
          return (
            <Row key={it.id || it.title} title={it.title}
              meta={real ? (PAGES[it.id].meta || []).find(m => m.startsWith('Updated')) || '' : STATUS_LABEL[it.status] || ''}
              chip={real ? versionOf(PAGES[it.id]) : it.status}
              onClick={() => real ? go({ kind: 'page', key: it.id }) : go({ kind: 'stub', title: it.title, status: it.status })} />
          )
        })}
      </div>
    </div>
  )
}

// Admin: people who signed in through Access but are not approved yet.
// Company emails are approved on first sign-in; personal emails land here.
// Waiting people can be approved or rejected; rejected people stay listed below
// so a mistake can be undone. In preview (no API) it shows a labelled sample.
const SAMPLE = [{ email: 'staff.one@example.com', approved: 0 }, { email: 'staff.two@example.com', approved: -1 }, { email: 'staff.three@example.com', full_name: 'Staff Three', role: 'reader', approved: 1, created_at: '2026-09-24 10:00:00' }]
const ROLE_LABEL = { reader: 'Reader', admin: 'Admin', master: 'Master Admin' }
// D1 stores UTC ("YYYY-MM-DD HH:MM:SS"); show Malaysia time.
function myt(s, withTime) {
  if (!s) return '-'
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (isNaN(d)) return '-'
  return d.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) })
}
// Name with inline edit: click to edit, Enter saves, Escape cancels.
function NameCell({ p, busy, onSave }) {
  const [edit, setEdit] = useState(null)
  if (edit === null) return (
    <button className="crumblink namecell" disabled={busy} title="Edit nickname" onClick={() => setEdit(p.full_name || '')}>
      {p.full_name || <span className="muted">Add nickname</span>}
    </button>
  )
  const save = async () => { if (await onSave(edit.trim())) setEdit(null) }
  return (
    <span className="nameedit">
      <input autoFocus aria-label={"Nickname for " + p.email} value={edit} maxLength={80} disabled={busy}
        onChange={e => setEdit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEdit(null) }} />
      <button className="btn small" disabled={busy} onClick={save}>Save</button>
      <button className="btn small ghost" disabled={busy} onClick={() => setEdit(null)}>Cancel</button>
    </span>
  )
}
function Approvals({ preview, me, myRole }) {
  const master = myRole === 'master'
  const [list, setList] = useState(preview ? SAMPLE : null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  useEffect(() => {
    if (preview) return
    api.approvals().then(setList).catch(e => setErr(e.message))
  }, [preview])
  const setRole = async (p, role) => {
    if (role === p.role) return
    const ask = { master: 'Make ' + p.email + ' a Master Admin? They can change roles, delete people and see restricted pages.', admin: 'Make ' + p.email + ' an Admin? Admins can edit SOPs and Learn, and approve sign-ins.', reader: 'Change ' + p.email + ' to Reader?' }
    if (!confirm(ask[role])) return
    setBusy(p.email); setErr(null)
    try {
      if (!preview) await api.setRole(p.email, role)
      setList(l => l.map(x => x.email === p.email ? { ...x, role } : x))
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }
  const decide = async (email, reject) => {
    if (reject && !confirm('Reject ' + email + '? They will see "access declined". You can approve them later from this page.')) return
    setBusy(email); setErr(null)
    try {
      if (!preview) await (reject ? api.reject(email) : api.approve(email))
      setList(l => l.map(p => p.email === email ? { ...p, approved: reject ? -1 : 1 } : p))
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }
  const saveName = async (p, name) => {
    setBusy(p.email); setErr(null)
    try {
      if (!preview) await api.setName(p.email, name)
      setList(l => l.map(x => x.email === p.email ? { ...x, full_name: name || null } : x))
      return true
    } catch (e) { setErr(e.message); return false } finally { setBusy(null) }
  }
  const remove = async (p) => {
    if (!confirm('Delete ' + p.email + '? They lose access now. If they sign in again they start over as a new request (company emails are let in automatically). Learning scores are kept.')) return
    setBusy(p.email); setErr(null)
    try {
      if (!preview) await api.removePerson(p.email)
      setList(l => l.filter(x => x.email !== p.email))
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }
  const name = (p) => (p.role === 'master' && !master && p.email !== me)
    ? (p.full_name || '-')
    : <NameCell p={p} busy={busy === p.email} onSave={n => saveName(p, n)} />
  const waiting = (list || []).filter(p => p.approved === 0), rejected = (list || []).filter(p => p.approved === -1)
  const RANK = { master: 0, admin: 1, reader: 2 }
  const members = (list || []).filter(p => p.approved === 1).sort((a, b) => (RANK[a.role] - RANK[b.role]) || a.email.localeCompare(b.email))
  const count = (r) => members.filter(p => p.role === r).length
  const table = (rows, isRejected) => (
    <div className="tbl-wrap"><table>
      <thead><tr><th>Email</th><th>Nickname</th><th><span className="sr-only">Action</span></th></tr></thead>
      <tbody>{rows.map(p => (
        <tr key={p.email}>
          <td>{p.email}</td><td>{name(p)}</td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            {!isRejected && <button className="btn small ghost" disabled={busy === p.email} onClick={() => decide(p.email, true)}>Reject</button>}
            {isRejected && master && <button className="btn small ghost danger" disabled={busy === p.email} onClick={() => remove(p)}>Delete</button>}{' '}
            <button className="btn small" disabled={busy === p.email} onClick={() => decide(p.email, false)}>{busy === p.email ? 'Saving…' : 'Approve'}</button>
          </td>
        </tr>))}
      </tbody>
    </table></div>
  )
  return (
    <div className="view doc">
      <h1>Access Management</h1>
      {preview && <div className="stubbox">Preview: sample entries only. Nothing is saved.</div>}
      {err && <p className="err" role="alert">{err}</p>}
      {list === null && !err && <p className="muted">Loading…</p>}
      <h2>Waiting for approval</h2>
      {list && waiting.length === 0 && <div className="stubbox">No one is waiting for approval.</div>}
      {waiting.length > 0 && table(waiting, false)}
      {members.length > 0 && <>
        <h2>Registered</h2>
        <p className="muted small">{members.length} total · {count('master')} master admin{count('master') === 1 ? '' : 's'} · {count('admin')} admin{count('admin') === 1 ? '' : 's'} · {count('reader')} reader{count('reader') === 1 ? '' : 's'}</p>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Email</th><th>Nickname</th><th>Role</th><th>Registered</th><th>Last seen</th><th><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{members.map(p => (
            <tr key={p.email}><td>{p.email}</td><td>{name(p)}</td>
              <td>{p.email === me || !master
                ? <span className={'chip ' + (p.role === 'reader' ? 'ver' : 'scorepass')}>{ROLE_LABEL[p.role] || p.role}{p.email === me ? ' (you)' : ''}</span>
                : <select aria-label={'Role for ' + p.email} value={p.role} disabled={busy === p.email} onChange={e => setRole(p, e.target.value)}>
                    <option value="reader">Reader</option><option value="admin">Admin</option><option value="master">Master Admin</option>
                  </select>}</td>
              <td>{myt(p.created_at, false)}</td><td>{myt(p.last_seen, true)}</td>
              <td style={{ textAlign: 'right' }}>{master && p.email !== me && <button className="btn small ghost danger" disabled={busy === p.email} onClick={() => remove(p)}>Delete</button>}</td></tr>
          ))}</tbody>
        </table></div>
      </>}
      {rejected.length > 0 && <>
        <h2>Rejected</h2>
        {table(rejected, true)}
      </>}
    </div>
  )
}

// Admin: every SOP chart next to the original drawing it was read from
// (public/flowcharts/<id>.png), to check the conversion page by page.
function ChartReview({ pages: PAGES, go }) {
  const list = Object.entries(PAGES).map(([id, p]) => ({ id, p, chart: p.blocks.find(b => b.t === 'chart') })).filter(x => x.chart)
    .sort((a, b) => a.p.title.localeCompare(b.p.title))
  return (
    <div className="view">
      <h1>Chart review</h1>
      <p className="muted lead">{list.length} SOP charts, each drawn from its page next to the original picture. If one differs, open the page, choose Edit, then Edit chart.</p>
      {list.map(({ id, p, chart }) => (
        <section key={id} className="review">
          <div className="reviewhead"><b>{p.title}</b><button className="crumblink" onClick={() => go({ kind: 'page', key: id })}>Open page ›</button></div>
          <div className="reviewgrid">
            <figure className="figure"><figcaption className="small muted">Original</figcaption><img src={'/flowcharts/' + id + '.png'} alt={'Original chart for ' + p.title} loading="lazy" /></figure>
            <figure className="figure chartfig"><figcaption className="small muted">In the handbook</figcaption><Chart code={chart.x} /></figure>
          </div>
        </section>
      ))}
    </div>
  )
}

// Header chips: keep the version chip and the "Updated" chip in step with an edit.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const verOf = (page) => (page?.meta || []).find(m => /^V\d/.test(m)) || 'V1.0'
function editedMeta(meta, version, note) {
  const d = new Date(), updated = 'Updated ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear()
  const out = [...(meta || [])]
  const vi = out.findIndex(m => /^V\d/.test(m))
  if (vi >= 0) out[vi] = version; else out.unshift(version)
  const ui = out.findIndex(m => /^Updated /.test(m))
  if (ui >= 0) out[ui] = updated; else out.push(updated)
  // Change note for the side panel: replaced on every save, dropped when left empty.
  const kept = out.filter(m => !/^Change: /.test(m))
  const n = String(note || '').replace(/\s+/g, ' ').trim()
  return n ? [...kept, 'Change: ' + n] : kept
}

// Admin editor. The page text is edited as markdown (the same format as the SOP
// book) and saved as blocks. Every save keeps the previous version in History.
function Editor({ id, sec, pages: PAGES, preview, go, onPageSaved }) {
  const all = PAGES[id]?.blocks || []
  const range = useMemo(() => {
    if (sec == null || all[sec]?.t !== 'h2') return [0, all.length]
    let end = all.findIndex((b, i) => i > sec && b.t === 'h2')
    return [sec, end < 0 ? all.length : end]
  }, [id, sec])
  const scoped = range[0] !== 0 || range[1] !== all.length
  const page = PAGES[id]
  const startText = useMemo(() => toMarkdown(all.slice(range[0], range[1])), [id, range])
  const [row, setRow] = useState(preview ? {} : null)
  const [title, setTitle] = useState(page?.title || '')
  const [version, setVersion] = useState(verOf(page))
  const [note, setNote] = useState('')
  const [text, setText] = useState(startText)
  const [show, setShow] = useState(false)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const dirty = title !== (page?.title || '') || text !== startText || version !== verOf(page) || note.trim() !== ''

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (preview) return
    api.sop(id).then(setRow).catch(e => setErr(e.message))
  }, [id, preview])

  const blocks = useMemo(() => (show ? parseBody(text) : []), [show, text])

  // Chart drawer: charts are ```chart blocks in the text; the drawer edits one
  // in place, or inserts a new one where the cursor is.
  const textRef = useRef(null)
  const [drawer, setDrawer] = useState(null)
  const CHART_RE = /```chart\r?\n([\s\S]*?)\r?\n```/g
  const charts = useMemo(() => [...text.matchAll(CHART_RE)].map(m => ({ code: m[1], at: m.index, len: m[0].length, title: parseChart(m[1]).title })), [text])
  const saveChart = (code) => {
    const block = '```chart\n' + code + '\n```'
    if (drawer.index >= 0) {
      const c = charts[drawer.index]
      setText(text.slice(0, c.at) + block + text.slice(c.at + c.len))
    } else {
      const at = textRef.current?.selectionStart ?? text.length
      setText(text.slice(0, at).replace(/\s*$/, '') + '\n\n' + block + '\n\n' + text.slice(at).replace(/^\s*/, ''))
    }
    setDrawer(null)
  }
  const cancel = () => { if (!dirty || confirm('Leave without saving? Your changes will be lost.')) go({ kind: 'page', key: id }) }
  const save = async () => {
    const t = title.trim(), v = version.trim()
    if (!t) return setErr('Add a title before saving.')
    if (!/^V\d+(\.\d+)?$/.test(v)) return setErr('Version must be a V followed by numbers, like V1.2.')
    setSaving(true); setErr(null)
    const body = [...all.slice(0, range[0]), ...parseBody(text), ...all.slice(range[1])]
    const meta = editedMeta(row?.meta || page?.meta, v, note)
    try {
      if (!preview) await api.saveSop(id, { ...row, title: t, version: v, body, meta })
      await onPageSaved?.(id, { title: t, blocks: body, meta })
      go({ kind: 'page', key: id })
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  if (!page) return <Stub title={id} />
  return (
    <div className="view doc editor">
      {preview && <div className="stubbox">Preview: edits stay in this browser tab and are not saved to the live handbook.</div>}
      {scoped && <div className="banner">Editing one section: <b>{all[range[0]]?.x}</b>. The rest of the page is unchanged. <button className="crumblink" onClick={() => go({ kind: 'edit', key: id })}>Edit the whole page instead</button></div>}
      <div className="edrow">
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="ver">Version<input value={version} onChange={e => setVersion(e.target.value)} /></label>
        <label className="note">What changed <span className="optional">(optional, shown to readers)</span><input value={note} maxLength={140} placeholder="e.g. Floor rule updated" onChange={e => setNote(e.target.value)} /></label>
      </div>
      <div className="edtabs">
        <button className={'tab' + (!show ? ' on' : '')} aria-pressed={!show} onClick={() => setShow(false)}>Write</button>
        <button className={'tab' + (show ? ' on' : '')} aria-pressed={show} onClick={() => setShow(true)}>Preview</button>
        <button className="btn small ghost" onClick={() => setDrawer({ index: -1 })}>+ Insert chart</button>
        {charts.map((c, i) => <button key={i} className="btn small ghost" onClick={() => setDrawer({ index: i })}>Edit chart{charts.length > 1 ? ' ' + (i + 1) : ''}{c.title ? ': ' + c.title : ''}</button>)}
      </div>
      <p className="muted small edhint">## heading · - bullet · 1. step · | table | · &gt; [!warn|Title] callout · **bold**</p>
      {show
        ? <div className="edpreview">{blocks.map((b, i) => <Block key={i} b={b} />)}</div>
        : <textarea ref={textRef} className="edtext" value={text} onChange={e => setText(e.target.value)} spellCheck />}
      <ChartDrawer open={!!drawer} initial={drawer && drawer.index >= 0 ? charts[drawer.index].code : null}
        onCancel={() => setDrawer(null)} onSave={saveChart} />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="edactions">
        <button className="btn small ghost" onClick={cancel} disabled={saving}>Cancel</button>
        <button className="btn small" onClick={save} disabled={saving || !row || !dirty}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

// Saved versions of one page, newest first. Restore snapshots the current text
// first, so a restore can itself be undone.
function History({ id, pages: PAGES, preview, go, onPageSaved }) {
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    if (preview) return
    api.versions(id).then(setList).catch(e => setErr(e.message))
  }, [id, preview])
  const restore = async (v) => {
    if (!confirm('Restore ' + v.version + ' (saved ' + v.edited_at + ' UTC)? The current version stays in History, so you can undo this.')) return
    try { await api.restore(id, v.id); await onPageSaved?.(id); go({ kind: 'page', key: id }) }
    catch (e) { setErr(e.message) }
  }
  return (
    <div className="view doc">
      <div className="doctools"><button className="btn small ghost" onClick={() => go({ kind: 'page', key: id })}>Back to page</button></div>
      <h1>History</h1>
      <p className="muted">Earlier versions of {PAGES[id]?.title}, newest first. Each one is the page as it was just before someone saved or restored it.</p>
      {preview && <div className="stubbox">History needs the live app. Nothing to show in preview.</div>}
      {err && <p className="err" role="alert">{err}</p>}
      {!preview && list === null && !err && <p className="muted">Loading…</p>}
      {list && list.length === 0 && <div className="stubbox">No earlier versions yet. The first save creates one.</div>}
      {list && list.length > 0 && (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Version</th><th>Title</th><th>Changed by</th><th>When (UTC)</th><th><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{list.map(v => (
            <tr key={v.id}><td>{v.version}</td><td>{v.title}</td><td>{v.edited_by}</td><td>{v.edited_at}</td>
              <td style={{ textAlign: 'right' }}><button className="btn small ghost" onClick={() => restore(v)}>Restore</button></td></tr>))}
          </tbody>
        </table></div>)}
    </div>
  )
}

function Row({ title, sub, meta, chip, onClick }) {
  return (
    <button className="row" onClick={onClick}>
      <span className={'mk ' + (chip === 'restricted' ? 'restricted' : '')} />
      <span className="rmain"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      {chip && <span className={'chip ' + (/^V\d/.test(chip) ? 'ver' : chip)}>{chip}</span>}
      {meta && <span className="rmeta">{meta}</span>}
    </button>
  )
}

// Only on paper: a printed SOP can go out of date, so say so, with the version
// and the moment it was printed (refreshed just before printing).
function PrintNote({ version }) {
  const stamp = () => {
    const d = new Date()
    return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  }
  const [when, setWhen] = useState(stamp)
  useEffect(() => {
    const on = () => setWhen(stamp())
    addEventListener('beforeprint', on)
    return () => removeEventListener('beforeprint', on)
  }, [])
  return <p className="printnote">Printed copy of {version}, {when}. It may be out of date: check the VIP Retention Handbook for the current version before use.</p>
}

// Thin reading-progress line under the top bar, on SOP pages.
function ReadBar() {
  const ref = useRef(null)
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - innerHeight
      if (ref.current) ref.current.style.width = (max > 0 ? Math.min(100, (scrollY / max) * 100) : 0) + '%'
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(draw) }
    draw()
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll)
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])
  return <div className="readbar" aria-hidden="true"><i ref={ref} /></div>
}

// Right-hand panel of an SOP page: contents, a small flow chart (hidden while the
// full chart is on screen), related pages and what changed. On narrow screens it
// becomes a drawer opened from the "Page tools" button in the top bar.
function PageRail({ p, id, heads, jump, related, canEdit, go, open, onClose }) {
  const ref = useRef(null)
  const chartBlock = p.blocks.find(b => b.t === 'chart')
  const chart = useMemo(() => (chartBlock ? parseChart(chartBlock.x) : null), [chartBlock?.x])
  const [zoom, setZoom] = useState(false)
  const [chartInView, setChartInView] = useState(false)
  const version = versionOf(p)
  const updated = (p.meta || []).find(m => /^Updated /.test(m))
  const note = (p.meta || []).find(m => /^Change: /.test(m))?.slice(8)

  // Drawer (narrow screens): focus moves in on open, and back to the Page tools
  // button on close, unless the close already sent focus somewhere (a heading, a page).
  const closeBtn = useRef(null), wasOpen = useRef(false)
  useEffect(() => {
    if (open) closeBtn.current?.focus()
    else if (wasOpen.current) {
      const a = document.activeElement
      if (!a || a === document.body || ref.current?.contains(a)) document.querySelector('.railbtn')?.focus()
    }
    wasOpen.current = open
  }, [open])

  // Stick at the top when the panel fits the screen; otherwise let it scroll with
  // the page and stick once its bottom is on screen (no scrollbar of its own).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => { el.style.top = Math.min(80, innerHeight - el.offsetHeight - 16) + 'px' }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(el)
    addEventListener('resize', fit)
    return () => { ro.disconnect(); removeEventListener('resize', fit) }
  }, [id])

  // The same chart never shows twice: hide the small copy while the full one is visible.
  useEffect(() => {
    if (!chart) return
    const big = document.querySelector('.doc .chartfig')
    if (!big) return
    const io = new IntersectionObserver(([e]) => setChartInView(e.isIntersecting), { rootMargin: '-60px 0px -80px 0px', threshold: 0.15 })
    io.observe(big)
    return () => io.disconnect()
  }, [id, chart])

  const hasToc = heads.length > 2
  if (!hasToc && !chart && !related.length) return null
  return (
    <aside ref={ref} id="pagerail" className={'rail' + (open ? ' open' : '')} aria-label="Page tools">
      <div className="railhead"><b>Page tools</b><button ref={closeBtn} className="btn small ghost" onClick={onClose}>Close</button></div>
      {hasToc && (
        <nav className="railsec" aria-label="On this page">
          <div className="tochead">On this page</div>
          {heads.map(h => <button key={h.i} className="tocitem" onClick={() => { onClose(); jump(h.i) }}>{h.x}</button>)}
        </nav>
      )}
      {chart && (
        <button className={'railcard railchart' + (chartInView ? ' away' : '')} onClick={() => setZoom(true)}
          aria-label="Open the flow chart full size" tabIndex={chartInView ? -1 : 0}>
          <span className="tochead">Flow chart</span>
          <ChartSvg chart={chart} across={false} />
          <span className="railhint">Click to enlarge</span>
        </button>
      )}
      {chart && <Zoom open={zoom} onClose={() => setZoom(false)} label={chart.title || 'Flow chart'}><ChartSvg chart={chart} across /></Zoom>}
      {related.length > 0 && (
        <div className="railcard">
          <div className="tochead">Related SOPs</div>
          {related.map(it => <button key={it.id} className="raillink" onClick={() => { onClose(); go({ kind: 'page', key: it.id }) }}><span>{it.title}</span><span aria-hidden="true">›</span></button>)}
        </div>
      )}
      <div className="railcard">
        <div className="tochead">What changed</div>
        <p className="railp"><b>{version}</b>{updated && <> · {updated.replace(/^Updated /, 'updated ')}</>}</p>
        <p className="railp muted">{note || 'No change note for this version.'}{canEdit && <> <button className="crumblink" onClick={() => { onClose(); go({ kind: 'history', key: id }) }}>History ›</button></>}</p>
      </div>
    </aside>
  )
}

function Page({ id, sec, mod, pages: PAGES, nav: NAV, canEdit, go, railOpen, onRailClose }) {
  // Arriving with a section (#/p/<id>/s/<section name>), e.g. from a Learn guide:
  // scroll to that heading after the route's own scroll and focus have run.
  useEffect(() => {
    if (!sec) return
    const t = setTimeout(() => {
      // Match on the section name, ignoring its number ("9. Step 5: ..." matches "Step 5"), so renumbering never breaks a link.
      const name = (x) => x.textContent.trim().replace(/^\d+\.\s*/, '')
      const h = [...document.querySelectorAll('.doc h2')].find(x => name(x).startsWith(sec) || x.textContent.trim().startsWith(sec))
      if (h) { h.scrollIntoView({ block: 'start' }); h.tabIndex = -1; h.focus({ preventScroll: true }) }
    }, 120)
    return () => clearTimeout(t)
  }, [id, sec])
  const p = PAGES[id]
  if (!p) return <Stub title={id} />
  const heads = p.blocks.map((b, i) => b.t === 'h2' ? { i, x: b.x } : null).filter(Boolean)
  const group = siblingsOf(NAV, id).filter(it => it.id && PAGES[it.id])
  const at = group.findIndex(it => it.id === id)
  const prev = at > 0 ? group[at - 1] : null, next = at >= 0 && at < group.length - 1 ? group[at + 1] : null
  const jump = (i) => {
    const h = document.getElementById('sec-' + i)
    if (!h) return
    h.scrollIntoView({ behavior: 'smooth', block: 'start' })
    h.tabIndex = -1; h.focus({ preventScroll: true })
  }
  const meta = (p.meta || []).filter(m => !/^Change: /.test(m))
  const [presenting, setPresenting] = useState(false)
  const presentBtn = useRef(null)
  const kids = (NAV.find(s => !s.domains && s.items.some(it => it.id === id))?.items || []).filter(it => it.parent === id && PAGES[it.id])
  // Sub pages are listed at the end of the parent page.
  const kidsAt = kids.length ? -1 : -2
  const subpages = kids.length > 0 && <SubPages kids={kids} pages={PAGES} go={go} />
  const words = bodyText(p).split(/\s+/).filter(Boolean).length
  const readMin = Math.max(1, Math.round(words / 200))
  return (
    <div className="pagewrap">
    <PageRail p={p} id={id} heads={heads} jump={jump} related={group.filter(it => it.id !== id).slice(0, 4)}
      canEdit={canEdit} go={go} open={railOpen} onClose={onRailClose} />
    <ReadBar />
    <div className="view doc">
      <div className="doctools">
        <button ref={presentBtn} className="btn small ghost doctools-present" onClick={() => setPresenting(true)}>Present</button>
        <button className="btn small ghost" onClick={() => print()}>Print / PDF</button>
        {canEdit && <button className="btn small ghost" onClick={() => go({ kind: 'history', key: id })}>History</button>}
        {canEdit && <button className="btn small" onClick={() => go({ kind: 'edit', key: id })}>Edit</button>}
      </div>
      {presenting && <Present p={p} onClose={() => { setPresenting(false); presentBtn.current?.focus() }} />}
      {p.crumb && <Crumb crumb={p.crumb} go={go} nav={NAV} />}
      <h1>{p.title}</h1>
      <div className="docmeta">{meta.map((m, i) => <span key={i}>{m}</span>)}<span>About {readMin} min read</span></div>
      <PrintNote version={versionOf(p)} />
      <SopLearnLink mod={mod} go={go} />
      {p.blocks.map((b, i) => <div key={i} style={{ display: 'contents' }}>
        {b.t === 'h2' && canEdit
          ? <div className="edh2"><h2 id={'sec-' + i}>{b.x}</h2><button className="secedit" onClick={() => go({ kind: 'edit', key: id, sec: i })} aria-label={'Edit section ' + b.x}>Edit</button></div>
          : <Block b={b} id={b.t === 'h2' ? 'sec-' + i : undefined} version={versionOf(p)} />}
        {i === kidsAt && subpages}
      </div>)}
      {kidsAt < 0 && subpages}
      <SopLearnLink mod={mod} go={go} place="end" />
      {(prev || next) && (
        <nav className="pager" aria-label="More in this section">
          {prev ? <button className="pagerbtn" onClick={() => go({ kind: 'page', key: prev.id })}><small>Previous</small><b>{prev.title}</b></button> : <span />}
          {next ? <button className="pagerbtn next" onClick={() => go({ kind: 'page', key: next.id })}><small>Next</small><b>{next.title}</b></button> : <span />}
        </nav>
      )}
    </div>
    </div>
  )
}

// The items listed next to a page: its SOP Book domain, or its section.
function siblingsOf(NAV, id) {
  for (const sec of NAV) {
    if (sec.domains) { for (const d of sec.domains) if (d.items.some(it => it.id === id)) return d.items }
    else if (sec.items.some(it => it.id === id)) return sec.items
  }
  return []
}

// SOP template header, laid out like the Lark SOP sheet.
// Blank until the SOP is approved (SOP template header standard).
const PENDING = new Set(['Effective date', 'Approved by'])
function SopHeader({ f = [], version }) {
  const get = (k) => (f.find(([key]) => key.toLowerCase() === k.toLowerCase()) || [])[1]
  const cells = [['Process name', get('Process name')], ['Version number', version || get('Version')],
    ['Department', get('Department')], ['Effective date', get('Effective date')],
    ['Process owner', get('Process owner')], ['Approved by', get('Approved by')]]
  return (
    <div className="sophead">
      <div className="sophead-title">Standard operating procedure</div>
      <dl>{cells.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || <span className="unset">{PENDING.has(k) ? 'Pending approval' : 'Not set'}</span>}</dd></div>)}</dl>
    </div>
  )
}

// House-style chart drawn from a ```chart block (see Chart.jsx).
function ChartFigure({ code }) {
  const [zoom, setZoom] = useState(false)
  const chart = useMemo(() => parseChart(code), [code])
  return (
    <figure className="figure chartfig">
      <Chart code={code} />
      <figcaption className="figcap"><button className="crumblink" onClick={() => setZoom(true)}>Enlarge chart</button></figcaption>
      <Zoom open={zoom} onClose={() => setZoom(false)} label={chart.title || 'Flow chart'}>
        <ChartSvg chart={chart} across />
      </Zoom>
    </figure>
  )
}

// Chart image from the enrolled Lark template. Shown at page width; Enlarge
// opens it at full size.
// Our own SVG illustrations (/flowcharts/<name>.svg) are drawn inline, so they
// use the app's colour tokens and follow light and dark mode.
const OWN_SVG = /^\/flowcharts\/[\w-]+\.svg$/
const svgCache = {}
function InlineSvg({ src, alt }) {
  const [svg, setSvg] = useState(svgCache[src] || null)
  const [zoom, setZoom] = useState(false)
  useEffect(() => {
    if (svgCache[src]) return
    fetch(src).then(r => (r.ok ? r.text() : Promise.reject())).then(t => {
      // Own files only; still drop anything script-like before inlining.
      if (!/^\s*<svg[\s>]/.test(t) || /<script|on\w+\s*=|javascript:/i.test(t)) return
      svgCache[src] = t; setSvg(t)
    }).catch(() => {})
  }, [src])
  if (!svg) return <figure className="figure figure-svg"><img src={src} alt={alt || ''} /></figure>
  return (
    <figure className="figure figure-svg">
      <div className="svgwrap" role="img" aria-label={alt || ''} onClick={() => setZoom(true)} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="figcap"><button className="crumblink" onClick={() => setZoom(true)}>Enlarge picture</button></figcaption>
      <Zoom open={zoom} onClose={() => setZoom(false)} label={alt || 'Picture'}>
        <div className="svgwrap zoomed" dangerouslySetInnerHTML={{ __html: svg }} />
      </Zoom>
    </figure>
  )
}

function ImageFigure({ src, alt }) {
  const [zoom, setZoom] = useState(false)
  if (OWN_SVG.test(src)) return <InlineSvg src={src} alt={alt} />
  return (
    <figure className="figure">
      <img src={src} alt={alt || ''} loading="lazy" onClick={() => setZoom(true)} style={{ cursor: 'zoom-in' }} />
      <figcaption className="figcap"><button className="crumblink" onClick={() => setZoom(true)}>Enlarge chart</button></figcaption>
      <Zoom open={zoom} onClose={() => setZoom(false)} label={alt || 'Chart'}>
        <img src={src} alt={alt || ''} />
      </Zoom>
    </figure>
  )
}

// Full-size view in a native modal dialog: focus is trapped, Escape closes.
function Zoom({ open, onClose, label, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="zoom" aria-label={label} onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose() }}>
      <div className="zoombar"><span>{label}</span><button className="btn small ghost" onClick={onClose}>Close</button></div>
      <div className="zoombody">{open && children}</div>
    </dialog>
  )
}

// Present mode: the page as slides. Slide 1 = title and intro, then one slide
// per section (h2). Arrow keys, Space, Page Up/Down, Home/End; Esc closes.
function slidesOf(p) {
  const blocks = p.blocks.filter(b => b.t !== 'sopheader')
  const slides = [{ title: p.title, intro: true, blocks: [] }]
  for (const b of blocks) {
    if (b.t === 'h2') slides.push({ title: b.x, blocks: [] })
    else slides[slides.length - 1].blocks.push(b)
  }
  return slides
}
function Present({ p, onClose }) {
  const slides = useMemo(() => slidesOf(p), [p])
  const [n, setN] = useState(0)
  const box = useRef(null), body = useRef(null)
  const go = (k) => setN(x => Math.max(0, Math.min(slides.length - 1, typeof k === 'function' ? k(x) : k)))
  useEffect(() => {
    box.current?.focus()
    const el = document.documentElement
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {})
    const onFs = () => { if (!document.fullscreenElement) onClose() }
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { body.current?.scrollTo(0, 0) }, [n])
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(x => x + 1) }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(x => x - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1) }
  }
  const s = slides[n]
  return createPortal(
    <div className="present" role="dialog" aria-modal="true" aria-label={'Presenting ' + p.title} tabIndex={-1} ref={box} onKeyDown={onKey}>
      <div className="present-bar" aria-hidden="true"><span style={{ width: ((n + 1) / slides.length * 100) + '%' }} /></div>
      <div className="present-body" ref={body}>
        <div className={'present-slide doc' + (s.intro ? ' intro' : '')} aria-live="polite">
          {s.intro ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}
          {s.blocks.map((b, i) => <Block key={n + '-' + i} b={b} />)}
          {s.intro && slides.length > 1 && <p className="present-hint">{slides.length - 1} sections. Use the arrow keys or the buttons below.</p>}
        </div>
      </div>
      <div className="present-controls">
        <span className="present-title">{p.title}</span>
        <button className="btn small ghost" onClick={() => go(x => x - 1)} disabled={n === 0} aria-label="Previous slide">‹ Previous</button>
        <span className="present-count">{n + 1} / {slides.length}</span>
        <button className="btn small" onClick={() => go(x => x + 1)} disabled={n === slides.length - 1} aria-label="Next slide">Next ›</button>
        <button className="btn small ghost" onClick={onClose}>Exit</button>
      </div>
    </div>,
    document.body
  )
}

function Block({ b, id, version }) {
  if (b.t === 'h2') return <h2 id={id}>{b.x}</h2>
  if (b.t === 'sopheader') return <SopHeader f={b.f} version={version} />
  if (b.t === 'img') return <ImageFigure src={b.src} alt={b.alt} />
  if (b.t === 'chart') return <ChartFigure code={b.x} />
  if (b.t === 'flow') return <pre className="codeblock">{b.x}</pre>
  if (b.t === 'p') return <p><Inline x={b.x} /></p>
  if (b.t === 'callout') return (
    <div className={'callout ' + (b.tone || 'good')}>
      <div>{b.title && <b>{b.title}</b>}<p><Inline x={b.x} /></p></div>
    </div>
  )
  if (b.t === 'steps' && b.ordered === false) return (
    <div className="pills">{b.x.map((s, i) => <span key={i} className="pill">{s}</span>)}</div>
  )
  if (b.t === 'steps') return (
    <ol className="steps">{b.x.map((s, i) => <li key={i}><Inline x={s} /></li>)}</ol>
  )
  if (b.t === 'list') return (
    <ul className="bullets">{b.x.map((s, i) => <li key={i}><Inline x={s} /></li>)}</ul>
  )
  if (b.t === 'code') return <pre className="codeblock">{b.x}</pre>
  if (b.t === 'table') return <TableBlock b={b} />
  return null
}

// Tables of 5+ columns turn into one card per row on phones (see .tbl-stack).
// Explicit roles keep them a table for screen readers once the CSS stacks them.
// A table that still overflows becomes a focusable region, so keys can scroll it.
function TableBlock({ b }) {
  const ref = useRef(null)
  const [over, setOver] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1)
    check()
    // Watch the table too: a new page can put different content in the same wrapper.
    const ro = new ResizeObserver(check); ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [b])
  const stack = b.head.length >= 5
  const numbered = stack && /^(step\s*no\.?|no\.?|#)$/i.test(String(b.head[0]).trim())
  const plain = (s) => String(s ?? '').replace(/\*\*|`/g, '')
  const role = (r) => (stack ? { role: r } : {})
  return (
    <div ref={ref} className={'tbl-wrap' + (stack ? ' tbl-stack' : '') + (numbered ? ' tbl-num' : '')}
      {...(over ? { tabIndex: 0, role: 'region', 'aria-label': 'Table: scroll sideways for more columns' } : {})}>
      <table {...role('table')}>
        <thead {...role('rowgroup')}><tr {...role('row')}>{b.head.map((h, i) => <th key={i} {...role('columnheader')}><Inline x={h} /></th>)}</tr></thead>
        <tbody {...role('rowgroup')}>{b.rows.map((r, i) => (
          <tr key={i} {...role('row')}>{r.map((c, j) => <td key={j} {...role('cell')} data-label={plain(b.head[j])} className={/^[\s-]*$/.test(plain(c)) ? 'blank' : undefined}><Inline x={c} /></td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}

// route <-> URL hash
function toHash(r) {
  const e = encodeURIComponent
  if (r.kind === 'page') return '#/p/' + e(r.key) + (r.sec ? '/s/' + e(r.sec) : '')
  if (r.kind === 'domain') return '#/d/' + e(r.key)
  if (r.kind === 'stub') return '#/s/' + e(r.title)
  if (r.kind === 'edit') return '#/edit/' + e(r.key) + (r.sec != null ? '/' + r.sec : '')
  if (r.kind === 'history') return '#/history/' + e(r.key)
  if (r.kind === 'approvals') return '#/approvals'
  if (r.kind === 'charts') return '#/charts'
  if (r.kind === 'learn') return '#/learn' + (r.key ? '/' + e(r.key) + (r.edit ? '/edit' : '') : '')
  if (r.kind === 'quiz') return '#/quiz/' + e(r.key)
  if (r.kind === 'scores') return '#/scores'
  if (r.kind === 'glossary') return '#/glossary'
  if (r.kind === 'quizzes') return '#/quizzes'
  if (r.kind === 'qset') return '#/quizzes/' + e(r.key)
  if (r.kind === 'qscores') return '#/quizzes/' + e(r.key) + '/scores'
  return '#/'
}
function parseHash(hash, NAV) {
  const [, kind, raw] = String(hash || '').match(/^#\/([a-z]+)\/?(.*)$/) || []
  const v = raw ? decodeURIComponent(raw) : ''
  if (kind === 'p' && v) { const [key, sec] = v.split('/s/'); return sec ? { kind: 'page', key, sec } : { kind: 'page', key } }
  if (kind === 'd' && v) return { kind: 'domain', key: v }
  if (kind === 'edit' && v) { const [key, sec] = v.split('/'); return sec != null && sec !== '' ? { kind: 'edit', key, sec: +sec } : { kind: 'edit', key } }
  if (kind === 'history' && v) return { kind: 'history', key: v }
  if (kind === 'approvals') return { kind: 'approvals' }
  if (kind === 'charts') return { kind: 'charts' }
  if (kind === 'learn') { if (!v) return { kind: 'learn' }; const [key, sub] = v.split('/'); return sub === 'edit' ? { kind: 'learn', key, edit: true } : { kind: 'learn', key } }
  if (kind === 'quiz' && v) return { kind: 'quiz', key: v }
  if (kind === 'scores') return { kind: 'scores' }
  if (kind === 'glossary') return { kind: 'glossary' }
  if (kind === 'quizzes') { if (!v) return { kind: 'quizzes' }; const [key, sub] = v.split('/'); return sub === 'scores' ? { kind: 'qscores', key } : { kind: 'qset', key } }
  if (kind === 's' && v) {
    for (const sec of NAV) for (const it of (sec.domains ? sec.domains.flatMap(d => d.items) : sec.items))
      if (it.title === v) return { kind: 'stub', title: v, status: it.status }
    return { kind: 'stub', title: v }
  }
  return { kind: 'home' }
}

function Stub({ title, status }) {
  const msg = status === 'external' ? "This document is in Lark for now, not in the handbook yet. Ask your ATL for the link."
    : status === 'restricted' ? 'Only admins can see this page.'
    : status === 'planned' ? "This SOP hasn't been written yet. Until it is, ask your ATL how to handle this task."
    : "This page is coming soon. Until it's here, ask your ATL."
  return (
    <div className="view">
      <div className="crumb"><b>{title}</b></div>
      <h1>{title}</h1>
      <div className="stubbox">{msg}</div>
    </div>
  )
}

// A short piece of the page text around the first search word.
function snippet(body, terms) {
  if (!body || !terms.length) return ''
  const low = body.toLowerCase()
  const at = terms.map(t => low.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0]
  if (at == null) return ''
  const start = Math.max(0, at - 60), end = Math.min(body.length, at + 110)
  return (start > 0 ? '… ' : '') + body.slice(start, end).trim() + (end < body.length ? ' …' : '')
}
function Mark({ text, terms }) {
  if (!terms.length) return text
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c)
  const re = new RegExp('(' + terms.map(esc).join('|') + ')', 'gi')
  return String(text).split(re).map((part, i) => i % 2 ? <mark key={i}>{part}</mark> : part)
}

function SearchResults({ query, results, open, pages: PAGES, embedded }) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return (
    <div className="view">
      {!embedded && <h1>Search</h1>}
      <p className="muted lead" role="status">{results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”</p>
      {results.length === 0
        ? <div className="stubbox">Nothing matches “{query.trim()}”. Try a shorter or different word, like “bonus”, “otp” or “vpn”.</div>
        : <div className="list">
            {results.map(item => (
              <button key={(item.id || item.title)} className="row" onClick={() => open(item)}>
                <span className={'mk ' + (item.status === 'restricted' ? 'restricted' : '')} />
                <span className="rmain">
                  <b><Mark text={item.title} terms={terms} /></b>
                  <small>{item.domain || item.section}</small>
                  {snippet(item.body, terms) && <span className="snip"><Mark text={snippet(item.body, terms)} terms={terms} /></span>}
                </span>
                {item.real ? <span className="chip ver">{versionOf(PAGES[item.id])}</span> : item.status && <span className={'chip ' + item.status}>{STATUS_LABEL[item.status] || item.status}</span>}
              </button>
            ))}
          </div>}
    </div>
  )
}
