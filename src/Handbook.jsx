import { useEffect, useMemo, useState } from 'react'
import { NAV, PAGES } from './content/handbook.js'

const STATUS_LABEL = { pending: 'Coming soon', planned: 'Not written yet', external: 'Lark doc', restricted: 'Admins only' }

export default function Handbook({ profile, onSignOut, preview }) {
  const [route, setRoute] = useState({ kind: 'home' })
  const [navOpen, setNavOpen] = useState(false)
  const [openSecs, setOpenSecs] = useState(() => ({ start: true }))

  useEffect(() => { window.scrollTo(0, 0) }, [route])

  const go = (r) => { setRoute(r); setNavOpen(false) }
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
                      <NavLeaf key={it.title} it={it} route={route} go={go} />
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
          <div className="spacer" />
          {profile && <span className="who">{profile.full_name || profile.email} · <b>{profile.role}</b></span>}
          {preview && <span className="chip pending">preview</span>}
          <button className="icon" aria-label="Toggle theme" onClick={toggleTheme}>◐</button>
          {onSignOut && <button className="btn small" onClick={onSignOut}>Sign out</button>}
        </header>

        <div className="content">
          {route.kind === 'home' && <Home go={go} />}
          {route.kind === 'domain' && <DomainList name={route.key} go={go} />}
          {route.kind === 'page' && <Page id={route.key} />}
          {route.kind === 'stub' && <Stub title={route.title} status={route.status} />}
        </div>
      </div>
    </div>
  )
}

function NavLeaf({ it, route, go }) {
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

function Home({ go }) {
  return (
    <div className="view">
      <div className="banner">Prototype. Culture and a few SOPs are real; the rest arrive when content is imported.</div>
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
      <div className="sectitle"><h2>Recently updated</h2><span className="line" /></div>
      <div className="list">
        <Row title="Culture & Conduct" sub="Start Here" meta="Updated 17 Sep" onClick={() => go({ kind: 'page', key: 'culture' })} />
        <Row title="Grace Period List" sub="SOP Book · Money Control" meta="Updated 13 May" onClick={() => go({ kind: 'page', key: 'grace' })} />
        <Row title="Top PNL" sub="SOP Book · Engagement" meta="Updated 13 May" onClick={() => go({ kind: 'page', key: 'pnl' })} />
      </div>
    </div>
  )
}

function leafRoute(it) {
  return it.id && PAGES[it.id] ? { kind: 'page', key: it.id } : { kind: 'stub', title: it.title, status: it.status }
}

function DomainList({ name, go }) {
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
            <Row key={it.title} title={it.title}
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

function Page({ id }) {
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
