import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './lib/api.js'
import { parseBody, toMarkdown } from './lib/markdown.js'
import { Chart, ChartSvg, ChartDrawer, parseChart, chartText } from './Chart.jsx'

const STATUS_LABEL = { pending: 'Coming soon', planned: 'Not written yet', external: 'Lark doc', restricted: 'Admins only' }

// Flatten every nav leaf into a searchable list, once per content load.
function bodyText(page) {
  if (!page) return ''
  return page.blocks.map(b => {
    if (b.t === 'p' || b.t === 'h2' || b.t === 'code' || b.t === 'flow') return b.x
    if (b.t === 'chart') return chartText(parseChart(b.x))
    if (b.t === 'sopheader') return (b.f || []).map(([k, v]) => k + ' ' + v).join(' ')
    if (b.t === 'callout') return (b.title || '') + ' ' + (b.x || '')
    if (b.t === 'steps' || b.t === 'list') return b.x.join(' ')
    if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.flat().join(' ')
    return ''
  }).join(' ').replace(/\*\*|`/g, '')
}

// Inline marks inside block text: **bold** and `code`. Plain text otherwise.
function Inline({ x }) {
  const parts = String(x ?? '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((s, i) =>
    s.startsWith('**') && s.endsWith('**') && s.length > 4 ? <b key={i}>{s.slice(2, -2)}</b>
    : s.startsWith('`') && s.endsWith('`') && s.length > 2 ? <code key={i}>{s.slice(1, -1)}</code>
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

export default function Handbook({ content, profile, onSignOut, preview, notice, onPageSaved }) {
  const { nav: NAV, pages: PAGES } = content
  const INDEX = useMemo(() => buildIndex(NAV, PAGES), [NAV, PAGES])
  const [route, setRoute] = useState(() => parseHash(location.hash, NAV))
  useEffect(() => {
    const onHash = () => { setRoute(parseHash(location.hash, NAV)); setNavOpen(false); setRailOpen(false); setQuery('') }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [NAV])
  const [navOpen, setNavOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(false) // page tools drawer (narrow screens)
  const [openSecs, setOpenSecs] = useState(() => ({ start: true }))
  const [query, setQuery] = useState('')

  const scrollPos = useRef({}), pushing = useRef(false), firstRoute = useRef(true)
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
        box?.focus()
      } else if (e.key === 'Escape' && railOpen) {
        setRailOpen(false)
      } else if (e.key === 'Escape' && navOpen) {
        setNavOpen(false)
        menuBtn.current?.focus()
      } else if (e.key === 'Escape' && query) {
        setQuery('')
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [route, query, navOpen, railOpen])
  const openLeaf = (item) => {
    setQuery('')
    go(item.real ? { kind: 'page', key: item.id } : { kind: 'stub', title: item.title, status: item.status })
  }
  const results = useMemo(() => search(INDEX, query.trim()), [INDEX, query])
  const canEdit = profile?.role === 'admin' || !!preview
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
    if (route.kind === 'approvals') return 'Approvals'
    if (route.kind === 'charts') return 'Chart review'
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
                      <NavLeaf key={it.id || it.title} it={it} route={route} go={go} pages={PAGES} />
                    ))}
              </div>
            </div>
          ))}
          {(profile?.role === 'admin' || preview) && (
            <div className="navsec admin-nav">
              <button className="navitem" onClick={() => { setQuery(''); go({ kind: 'approvals' }) }}>Approvals (admin)</button>
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
          <div className={'searchbar' + (route.kind === 'home' ? ' on-home' : '')}>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search the handbook…"
              aria-label="Search the handbook"
            />
          </div>
          {profile && <span className="who">{profile.full_name || profile.email} · <b>{profile.role}</b></span>}
          {preview && <span className="chip pending preview-chip">preview</span>}
          {(profile?.role === 'admin' || preview) && <button className="btn small ghost admin-btn" onClick={() => { setQuery(''); go({ kind: 'approvals' }) }}>Approvals</button>}
          {route.kind === 'page' && !query.trim() && (
            <button className="icon railbtn" aria-label="Page tools" title="Page tools" aria-expanded={railOpen} aria-controls="pagerail" onClick={() => setRailOpen(o => !o)}>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3.5" width="14" height="13" rx="2.5"/><path d="M12 3.5v13"/><path d="M14 7h1M14 10h1M14 13h1" strokeLinecap="round"/></svg>
            </button>
          )}
          <button className="btn small ghost theme-btn" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? 'Light' : 'Dark'}</button>
          {onSignOut && <button className="btn small" onClick={onSignOut}>Sign out</button>}
        </header>

        <main className="content" id="main" tabIndex={-1}>
          {route.kind === 'home'
            ? <Home go={go} nav={NAV} pages={PAGES} notice={notice} query={query} setQuery={setQuery} results={results} open={openLeaf} />
            : query.trim()
            ? <SearchResults query={query} results={results} open={openLeaf} pages={PAGES} />
            : <>
                {route.kind === 'domain' && <DomainList name={route.key} go={go} nav={NAV} pages={PAGES} />}
                {route.kind === 'page' && <Page id={route.key} pages={PAGES} nav={NAV} canEdit={canEdit} go={go} railOpen={railOpen} onRailClose={() => setRailOpen(false)} />}
                {route.kind === 'edit' && <Editor key={route.key + '/' + (route.sec ?? '')} id={route.key} sec={route.sec} pages={PAGES} preview={preview} go={go} onPageSaved={onPageSaved} />}
                {route.kind === 'history' && <History id={route.key} pages={PAGES} preview={preview} go={go} onPageSaved={onPageSaved} />}
                {route.kind === 'stub' && <Stub title={route.title} status={route.status} />}
                {route.kind === 'approvals' && <Approvals preview={preview} />}
                {route.kind === 'charts' && <ChartReview pages={PAGES} go={go} />}
              </>}
        </main>
      </div>
    </div>
  )
}

function NavLeaf({ it, route, go, pages: PAGES }) {
  const real = !!it.id && !!PAGES[it.id]
  const onClick = () => real ? go({ kind: 'page', key: it.id }) : go({ kind: 'stub', title: it.title, status: it.status })
  const active = real && route.kind === 'page' && route.key === it.id
  return (
    <button className={'navitem' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} onClick={onClick}>
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

function Home({ go, nav: NAV, pages: PAGES, notice, query, setQuery, results, open }) {
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
        <div className="eyebrow">C9MYR · VIP Retention</div>
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
          {essentials.length > 0 && <>
            <div className="sectitle"><h2>Daily essentials</h2><p>The pages you open every shift, in order.</p></div>
            <ol className="tiles">
              {essentials.map((id, i) => (
                <li key={id}>
                  <button className="tile" onClick={() => go({ kind: 'page', key: id })}>
                    <span className="tilenum" aria-hidden="true">{i + 1}</span>
                    <b>{PAGES[id].title}</b>
                    <small>{String(PAGES[id].crumb || '').replace(/^SOP Book · /, '')}</small>
                  </button>
                </li>
              ))}
            </ol>
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
        return (
          <span key={i}> / {isDomain
            ? <button className="crumblink" onClick={() => go({ kind: 'domain', key: part })}>{part}</button>
            : sec ? <button className="crumblink" onClick={() => go(sec.items[0]?.id ? { kind: 'page', key: sec.items[0].id } : { kind: 'home' })}>{part}</button>
            : part}</span>
        )
      })}
    </div>
  )
}

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
const SAMPLE = [{ email: 'staff.one@example.com', approved: 0 }, { email: 'staff.two@example.com', approved: -1 }]
function Approvals({ preview }) {
  const [list, setList] = useState(preview ? SAMPLE : null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  useEffect(() => {
    if (preview) return
    api.approvals().then(setList).catch(e => setErr(e.message))
  }, [preview])
  const decide = async (email, reject) => {
    if (reject && !confirm('Reject ' + email + '? They will see "access declined". You can approve them later from this page.')) return
    setBusy(email); setErr(null)
    try {
      if (!preview) await (reject ? api.reject(email) : api.approve(email))
      setList(l => reject ? l.map(p => p.email === email ? { ...p, approved: -1 } : p) : l.filter(p => p.email !== email))
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }
  const waiting = (list || []).filter(p => p.approved !== -1), rejected = (list || []).filter(p => p.approved === -1)
  const table = (rows, isRejected) => (
    <div className="tbl-wrap"><table>
      <thead><tr><th>Email</th><th>Name</th><th><span className="sr-only">Action</span></th></tr></thead>
      <tbody>{rows.map(p => (
        <tr key={p.email}>
          <td>{p.email}</td><td>{p.full_name || '-'}</td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            {!isRejected && <button className="btn small ghost" disabled={busy === p.email} onClick={() => decide(p.email, true)}>Reject</button>}{' '}
            <button className="btn small" disabled={busy === p.email} onClick={() => decide(p.email, false)}>{busy === p.email ? 'Saving…' : 'Approve'}</button>
          </td>
        </tr>))}
      </tbody>
    </table></div>
  )
  return (
    <div className="view doc">
      <h1>Approvals</h1>
      <p className="muted">People who signed in with a personal email and are waiting for access. Approve only staff you recognise. Company emails are approved automatically.</p>
      {preview && <div className="stubbox">Preview: sample entries only. Nothing is saved.</div>}
      {err && <p className="err" role="alert">{err}</p>}
      {list === null && !err && <p className="muted">Loading…</p>}
      {list && waiting.length === 0 && <div className="stubbox">No one is waiting for approval.</div>}
      {waiting.length > 0 && table(waiting, false)}
      {rejected.length > 0 && <>
        <h2>Rejected</h2>
        <p className="muted small">They see "access declined". Approve to let them in after all.</p>
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
      <div className="railhead"><b>Page tools</b><button className="btn small ghost" onClick={onClose}>Close</button></div>
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

function Page({ id, pages: PAGES, nav: NAV, canEdit, go, railOpen, onRailClose }) {
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
  const words = bodyText(p).split(/\s+/).filter(Boolean).length
  const readMin = Math.max(1, Math.round(words / 200))
  return (
    <div className="pagewrap">
    <PageRail p={p} id={id} heads={heads} jump={jump} related={group.filter(it => it.id !== id).slice(0, 4)}
      canEdit={canEdit} go={go} open={railOpen} onClose={onRailClose} />
    <ReadBar />
    <div className="view doc">
      <div className="doctools">
        <button className="btn small ghost" onClick={() => print()}>Print / PDF</button>
        {canEdit && <button className="btn small ghost" onClick={() => go({ kind: 'history', key: id })}>History</button>}
        {canEdit && <button className="btn small" onClick={() => go({ kind: 'edit', key: id })}>Edit</button>}
      </div>
      {p.crumb && <Crumb crumb={p.crumb} go={go} nav={NAV} />}
      <h1>{p.title}</h1>
      <div className="docmeta">{meta.map((m, i) => <span key={i}>{m}</span>)}<span>About {readMin} min read</span></div>
      <PrintNote version={versionOf(p)} />
      {p.blocks.map((b, i) => b.t === 'h2' && canEdit
        ? <h2 key={i} id={'sec-' + i} className="edh2">{b.x}<button className="secedit" onClick={() => go({ kind: 'edit', key: id, sec: i })} aria-label={'Edit section ' + b.x}>Edit</button></h2>
        : <Block key={i} b={b} id={b.t === 'h2' ? 'sec-' + i : undefined} version={versionOf(p)} />)}
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
      <div className="sophead-title">Standard Operating Procedure</div>
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
function ImageFigure({ src, alt }) {
  const [zoom, setZoom] = useState(false)
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
  if (b.t === 'table') return (
    <div className="tbl-wrap"><table>
      <thead><tr>{b.head.map((h, i) => <th key={i}><Inline x={h} /></th>)}</tr></thead>
      <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Inline x={c} /></td>)}</tr>)}</tbody>
    </table></div>
  )
  return null
}

// route <-> URL hash
function toHash(r) {
  const e = encodeURIComponent
  if (r.kind === 'page') return '#/p/' + e(r.key)
  if (r.kind === 'domain') return '#/d/' + e(r.key)
  if (r.kind === 'stub') return '#/s/' + e(r.title)
  if (r.kind === 'edit') return '#/edit/' + e(r.key) + (r.sec != null ? '/' + r.sec : '')
  if (r.kind === 'history') return '#/history/' + e(r.key)
  if (r.kind === 'approvals') return '#/approvals'
  if (r.kind === 'charts') return '#/charts'
  return '#/'
}
function parseHash(hash, NAV) {
  const [, kind, raw] = String(hash || '').match(/^#\/([a-z]+)\/?(.*)$/) || []
  const v = raw ? decodeURIComponent(raw) : ''
  if (kind === 'p' && v) return { kind: 'page', key: v }
  if (kind === 'd' && v) return { kind: 'domain', key: v }
  if (kind === 'edit' && v) { const [key, sec] = v.split('/'); return sec != null && sec !== '' ? { kind: 'edit', key, sec: +sec } : { kind: 'edit', key } }
  if (kind === 'history' && v) return { kind: 'history', key: v }
  if (kind === 'approvals') return { kind: 'approvals' }
  if (kind === 'charts') return { kind: 'charts' }
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
