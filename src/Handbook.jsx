import { useEffect, useMemo, useState } from 'react'

const STATUS_LABEL = { pending: 'Coming soon', planned: 'Not written yet', external: 'Lark doc', restricted: 'Admins only' }

// Flatten every nav leaf into a searchable list, once per content load.
function bodyText(page) {
  if (!page) return ''
  return page.blocks.map(b => {
    if (b.t === 'p' || b.t === 'h2') return b.x
    if (b.t === 'callout') return (b.title || '') + ' ' + (b.x || '')
    if (b.t === 'steps') return b.x.join(' ')
    if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.flat().join(' ')
    return ''
  }).join(' ')
}
function buildIndex(nav, pages) {
  const out = []
  const mk = (it, section, domain) => {
    const page = it.id && pages[it.id]
    const text = [it.title, section, domain, it.keywords || '', bodyText(page)].join(' ').toLowerCase()
    return { title: it.title, section, domain, id: it.id, status: it.status, real: !!page, text }
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
        if (item.title.toLowerCase().includes(t)) score += 3
        else score += 1
      }
      return { item, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item)
}

export default function Handbook({ content, profile, onSignOut, preview, notice }) {
  const { nav: NAV, pages: PAGES } = content
  const INDEX = useMemo(() => buildIndex(NAV, PAGES), [NAV, PAGES])
  const [route, setRoute] = useState({ kind: 'home' })
  const [navOpen, setNavOpen] = useState(false)
  const [openSecs, setOpenSecs] = useState(() => ({ start: true }))
  const [query, setQuery] = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [route])

  const go = (r) => { setRoute(r); setNavOpen(false) }
  const openLeaf = (item) => {
    setQuery('')
    go(item.real ? { kind: 'page', key: item.id } : { kind: 'stub', title: item.title, status: item.status })
  }
  const results = useMemo(() => search(INDEX, query.trim()), [INDEX, query])
  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute('data-theme')
    const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark')
  }

  const title = useMemo(() => {
    if (route.kind === 'home') return 'Home'
    if (route.kind === 'domain') return route.key
    if (route.kind === 'page') return PAGES[route.key]?.title || route.key
    if (route.kind === 'stub') return route.title
    return ''
  }, [route])

  return (
    <div className={'hb' + (navOpen ? ' nav-open' : '')}>
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <aside className="side">
        <div className="brand"><span className="logo">C9</span><b>Handbook</b></div>
        <nav>
          {NAV.map(sec => (
            <div key={sec.id} className={'navsec' + (openSecs[sec.id] ? ' open' : '')}>
              <button className="navhead" onClick={() => setOpenSecs(s => ({ ...s, [sec.id]: !s[sec.id] }))}>
                <span>{sec.name}</span>
                {sec.badge && <span className="badge">{sec.badge}</span>}
                <span className="chev" aria-hidden>›</span>
              </button>
              <div className="navsub">
                {sec.domains
                  ? sec.domains.map(d => (
                      <button key={d.name} className={'navitem' + (route.kind === 'domain' && route.key === d.name ? ' active' : '')} onClick={() => go({ kind: 'domain', key: d.name })}>{d.name}</button>
                    ))
                  : sec.items.map(it => (
                      <NavLeaf key={it.id || it.title} it={it} route={route} go={go} pages={PAGES} />
                    ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="top">
          <button className="icon menu" aria-label="Menu" onClick={() => setNavOpen(true)}>☰</button>
          <div className="ptitle">{title}</div>
          <div className="searchbar">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search SOPs, keywords…"
              aria-label="Search the handbook"
            />
          </div>
          {profile && <span className="who">{profile.full_name || profile.email} · <b>{profile.role}</b></span>}
          {preview && <span className="chip pending">preview</span>}
          <button className="icon" aria-label="Toggle theme" onClick={toggleTheme}>◐</button>
          {onSignOut && <button className="btn small" onClick={onSignOut}>Sign out</button>}
        </header>

        <div className="content">
          {query.trim()
            ? <SearchResults query={query} results={results} open={openLeaf} />
            : <>
                {route.kind === 'home' && <Home go={go} nav={NAV} pages={PAGES} notice={notice} />}
                {route.kind === 'domain' && <DomainList name={route.key} go={go} nav={NAV} pages={PAGES} />}
                {route.kind === 'page' && <Page id={route.key} pages={PAGES} />}
                {route.kind === 'stub' && <Stub title={route.title} status={route.status} />}
              </>}
        </div>
      </div>
    </div>
  )
}

function NavLeaf({ it, route, go, pages: PAGES }) {
  const real = !!it.id && !!PAGES[it.id]
  const onClick = () => real ? go({ kind: 'page', key: it.id }) : go({ kind: 'stub', title: it.title, status: it.status })
  const active = real && route.kind === 'page' && route.key === it.id
  return (
    <button className={'navitem' + (active ? ' active' : '')} onClick={onClick}>
      <span>{it.title}</span>
      {!real && it.status && <span className={'dot ' + it.status} title={STATUS_LABEL[it.status]} />}
    </button>
  )
}

function Home({ go, nav: NAV, pages: PAGES, notice }) {
  const leafRoute = (it) => it.id && PAGES[it.id] ? { kind: 'page', key: it.id } : { kind: 'stub', title: it.title, status: it.status }
  const recent = [['culture', 'Start Here'], ['grace', 'SOP Book · Money Control'], ['pnl', 'SOP Book · Engagement']]
    .filter(([id]) => PAGES[id])
  return (
    <div className="view">
      {notice && <div className="banner">{notice}</div>}
      <h1>The C9MYR Handbook</h1>
      <p className="muted lead">Every SOP, policy and playbook in one place. Always the current version.</p>
      <div className="cards">
        {NAV.map(sec => {
          const n = sec.domains ? sec.domains.length + ' domains' : sec.items.length + ' items'
          const first = sec.domains ? { kind: 'domain', key: sec.domains[0].name } : leafRoute(sec.items[0])
          return (
            <button key={sec.id} className="card" onClick={() => go(first)}>
              <h3>{sec.name}</h3><p className="muted">{n}</p>
            </button>
          )
        })}
      </div>
      {recent.length > 0 && <>
        <div className="sectitle"><h2>Recently updated</h2><span className="line" /></div>
        <div className="list">
          {recent.map(([id, sub]) => (
            <Row key={id} title={PAGES[id].title} sub={sub}
              meta={(PAGES[id].meta || []).find(m => m.startsWith('Updated'))}
              onClick={() => go({ kind: 'page', key: id })} />
          ))}
        </div>
      </>}
    </div>
  )
}

function DomainList({ name, go, nav: NAV, pages: PAGES }) {
  const domain = NAV.find(s => s.domains)?.domains.find(d => d.name === name)
  const items = domain?.items || []
  return (
    <div className="view">
      <div className="crumb">SOP Book / <b>{name}</b></div>
      <h1>{name}</h1>
      <p className="muted lead">SOPs in this domain. The ones marked Open have real content.</p>
      <div className="list">
        {items.map(it => {
          const real = !!it.id && !!PAGES[it.id]
          return (
            <Row key={it.id || it.title} title={it.title}
              meta={real ? 'Open' : STATUS_LABEL[it.status] || ''}
              chip={real ? 'ver' : it.status}
              onClick={() => real ? go({ kind: 'page', key: it.id }) : go({ kind: 'stub', title: it.title, status: it.status })} />
          )
        })}
      </div>
    </div>
  )
}

function Row({ title, sub, meta, chip, onClick }) {
  return (
    <button className="row" onClick={onClick}>
      <span className={'mk ' + (chip === 'restricted' ? 'restricted' : '')} />
      <span className="rmain"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      {chip && <span className={'chip ' + chip}>{chip === 'ver' ? 'V1.0' : chip}</span>}
      {meta && <span className="rmeta">{meta}</span>}
    </button>
  )
}

function Page({ id, pages: PAGES }) {
  const p = PAGES[id]
  if (!p) return <Stub title={id} />
  return (
    <div className="view doc">
      {p.crumb && <div className="crumb">{p.crumb}</div>}
      <h1>{p.title}</h1>
      {p.meta && <div className="docmeta">{p.meta.map((m, i) => <span key={i}>{m}</span>)}</div>}
      {p.blocks.map((b, i) => <Block key={i} b={b} />)}
    </div>
  )
}

function Block({ b }) {
  if (b.t === 'h2') return <h2>{b.x}</h2>
  if (b.t === 'p') return <p>{b.x}</p>
  if (b.t === 'callout') return (
    <div className={'callout ' + (b.tone || 'good')}>
      <div><b>{b.title}</b><p>{b.x}</p></div>
    </div>
  )
  if (b.t === 'steps' && b.ordered === false) return (
    <div className="pills">{b.x.map((s, i) => <span key={i} className="pill">{s}</span>)}</div>
  )
  if (b.t === 'steps') return (
    <ol className="steps">{b.x.map((s, i) => <li key={i}>{s}</li>)}</ol>
  )
  if (b.t === 'table') return (
    <div className="tbl-wrap"><table>
      <thead><tr>{b.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table></div>
  )
  return null
}

function Stub({ title, status }) {
  const msg = status === 'external' ? 'This one lives as a Lark doc. In the app it links out or gets imported.'
    : status === 'restricted' ? 'Restricted content. Visible to admins only.'
    : status === 'planned' ? 'Not written yet. This SOP will be authored, then imported.'
    : 'Content for this page imports from the database. Coming soon.'
  return (
    <div className="view">
      <div className="crumb"><b>{title}</b></div>
      <h1>{title}</h1>
      <div className="stubbox">{msg}</div>
    </div>
  )
}

function SearchResults({ query, results, open }) {
  return (
    <div className="view">
      <h1>Search</h1>
      <p className="muted lead">{results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”</p>
      {results.length === 0
        ? <div className="stubbox">No SOP matches that. Try another word, like “bonus”, “otp”, or “vpn”.</div>
        : <div className="list">
            {results.map(item => (
              <button key={(item.id || item.title)} className="row" onClick={() => open(item)}>
                <span className={'mk ' + (item.status === 'restricted' ? 'restricted' : '')} />
                <span className="rmain"><b>{item.title}</b><small>{item.domain || item.section}</small></span>
                {item.real ? <span className="chip ver">V1.0</span> : item.status && <span className={'chip ' + item.status}>{item.status}</span>}
              </button>
            ))}
          </div>}
    </div>
  )
}
