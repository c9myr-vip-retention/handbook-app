import { useEffect, useMemo, useRef, useState } from 'react'

// SOP flow charts in the house style (the approved Birthday Bonus chart): a
// line of steps, amber decision diamonds, side boxes that rejoin the line or
// end in a red stop / orange escalate. Stored as a short text block that the
// chart drawer edits, so every chart lives in the page and is editable:
//
//   ```chart
//   title: Birthday Bonus: issuance flow
//   start: Pull birthday list
//   check: Screen pass? | yes: next | no: stop Skip player
//   check: Has Secret Wallet? | yes: step SW base | no: step Deposit base
//   step: Issue credit, set TO
//   end: Done
//   ```
//
// Branches: next (carry on along the line) · step <text> (side box, rejoins) ·
// jump <text> (side box, then to the last box) · done <text> (side box, ends there) ·
// finish <text> (end box) · stop <text> · escalate <text>. Branch names default to
// Yes / No; `| labels: LiveChat, Telegram` renames them.

export const KINDS = { start: 'Start', step: 'Step', check: 'Decision', escalate: 'Escalate', stop: 'Stop', end: 'End' }
export const BRANCHES = { next: 'Carry on', step: 'Side step, then rejoin', jump: 'Side step, then go to the end', done: 'Side step, ends there', finish: 'End here', stop: 'Stop (red)', escalate: 'Escalate (orange)' }
const SIDE_SHAPE = { stop: 'stop', escalate: 'escalate', finish: 'end' }

export function parseChart(src) {
  const chart = { title: '', nodes: [] }
  for (const raw of String(src).split(/\r?\n/)) {
    const line = raw.trim()
    const m = line.match(/^(title|start|step|check|escalate|stop|end)\s*:\s*(.*)$/i)
    if (!m) continue
    const kind = m[1].toLowerCase()
    if (kind === 'title') { chart.title = m[2].trim(); continue }
    if (kind !== 'check') { chart.nodes.push({ kind, text: m[2].trim() }); continue }
    const [q, ...parts] = m[2].split('|').map(s => s.trim())
    const node = { kind, text: q, yes: { kind: 'next', text: '' }, no: { kind: 'next', text: '' } }
    for (const p of parts) {
      const b = p.match(/^(yes|no)\s*:\s*(next|step|jump|done|finish|stop|escalate)?\s*(.*)$/i)
      if (b) node[b[1].toLowerCase()] = { kind: (b[2] || 'step').toLowerCase(), text: b[3].trim() }
      const l = p.match(/^labels\s*:\s*(.+?)\s*,\s*(.+)$/i)
      if (l) node.labels = [l[1].trim(), l[2].trim()]
    }
    chart.nodes.push(node)
  }
  return chart
}

export function serializeChart({ title, nodes }) {
  const clean = (s) => String(s || '').replace(/[|\r\n]+/g, ' ').trim()
  const br = (b) => b.kind === 'next' ? 'next' : b.kind + ' ' + clean(b.text)
  return [title && 'title: ' + clean(title), ...nodes.map(n => n.kind === 'check'
    ? `check: ${clean(n.text)} | yes: ${br(n.yes)} | no: ${br(n.no)}` + labelPart(n.labels)
    : `${n.kind}: ${clean(n.text)}`)].filter(Boolean).join('\n')
}
function labelPart(l) {
  if (!l || (l[0] === 'Yes' && l[1] === 'No')) return ''
  const c = (s) => String(s || '').replace(/[|,\r\n]+/g, ' ').trim()
  return ` | labels: ${c(l[0]) || 'Yes'}, ${c(l[1]) || 'No'}`
}

// Plain-language reading of the chart for screen readers.
export function chartText({ title, nodes }) {
  const say = (b) => b.kind === 'next' ? 'carry on' : (b.kind === 'stop' ? 'stop: ' : b.kind === 'escalate' ? 'escalate: ' : '') + b.text
  return (title ? title + '. ' : 'Flow chart. ') + nodes.map(n => n.kind === 'check'
    ? `${n.text} ${n.labels?.[0] || 'Yes'}: ${say(n.yes)}. ${n.labels?.[1] || 'No'}: ${say(n.no)}.`
    : n.text + '.').join(' ')
}

// ---- layout -------------------------------------------------------------

const FONT = 13, LINE = 17, PADX = 14, PADY = 10, GAP = 46, SIDE = 44, CHAR = 7.1
function wrap(text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w
    if (next.length * CHAR > maxW && cur) { lines.push(cur); cur = w } else cur = next
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}
function measure(kind, text, across) {
  if (kind === 'check') {
    const lines = wrap(text, 118)
    return { lines, w: Math.max(176, 120 + 8 * Math.max(...lines.map(l => l.length))), h: Math.max(104, lines.length * LINE + 62) }
  }
  const lines = wrap(text, across ? 180 : 230)
  const w = Math.max(kind === 'start' || kind === 'end' ? 120 : 110, Math.max(...lines.map(l => l.length)) * CHAR + 2 * PADX)
  return { lines, w: Math.round(w), h: lines.length * LINE + 2 * PADY + (kind === 'start' || kind === 'end' ? 4 : 0) }
}

// Lays the chart out along a main axis (m) with branches on the cross axis (c).
// across = left to right (Lark style); otherwise top to bottom.
export function layout(chart, across) {
  const shapes = [], edges = [], labels = []
  const sz = (b) => across ? { m: b.w, c: b.h } : { m: b.h, c: b.w }
  let cursor = 0
  const spine = []
  const jumps = []
  chart.nodes.forEach((n, i) => {
    const box = measure(n.kind, n.text, across), s = sz(box)
    // A side box wider than its diamond would overlap the arrow coming in: shift right.
    if (n.kind === 'check') {
      const sideHalf = Math.max(0, ...[n.yes, n.no].filter(b => b && b.kind !== 'next')
        .map(b => sz(measure(SIDE_SHAPE[b.kind] || 'step', b.text, across)).m / 2))
      cursor += Math.max(0, sideHalf - s.m / 2)
    }
    const node = { ...n, box, m0: cursor, mc: cursor + s.m / 2, m1: cursor + s.m, cHalf: s.c / 2 }
    shapes.push({ kind: n.kind, lines: box.lines, w: box.w, h: box.h, m: node.mc, c: 0 })
    let exit = node.m1, merge = null
    if (n.kind === 'check') {
      const sides = [['yes', -1, n.yes], ['no', 1, n.no]].filter(([, , b]) => b && b.kind !== 'next')
      let far = node.m1
      for (const [key, dir, b] of sides) {
        const sb = measure(SIDE_SHAPE[b.kind] || 'step', b.text, across), ss = sz(sb)
        const cc = dir * (node.cHalf + SIDE + ss.c / 2)
        const shape = { kind: SIDE_SHAPE[b.kind] || 'step', lines: sb.lines, w: sb.w, h: sb.h, m: node.mc, c: cc }
        shapes.push(shape)
        edges.push({ pts: [[node.mc, dir * node.cHalf], [node.mc, cc - dir * ss.c / 2]], arrow: true })
        labels.push({ text: key === 'yes' ? (n.labels?.[0] || 'Yes') : (n.labels?.[1] || 'No'), m: node.mc, c: dir * (node.cHalf + SIDE / 2), side: true })
        far = Math.max(far, node.mc + ss.m / 2)
        if (b.kind === 'step') shape.rejoin = true
        if (b.kind === 'jump') jumps.push({ from: shape, dir, ss })
      }
      const rejoin = shapes.filter(sh => sh.rejoin && sh.m === node.mc)
      if (rejoin.length) {
        merge = far + GAP * 0.6
        for (const sh of rejoin) {
          const half = sz({ w: sh.w, h: sh.h })
          edges.push({ pts: [[sh.m + half.m / 2, sh.c], [merge, sh.c], [merge, 0]], arrow: false })
          delete sh.rejoin
        }
      }
      const straight = [['yes', n.yes], ['no', n.no]].find(([, b]) => !b || b.kind === 'next')
      if (straight) labels.push({ text: straight[0] === 'yes' ? (n.labels?.[0] || 'Yes') : (n.labels?.[1] || 'No'), m: node.m1 + 12, c: 0, along: true })
      if (merge != null) {
        if (straight) edges.push({ pts: [[node.m1, 0], [merge, 0]], arrow: false })
        exit = merge
      } else if (!straight) exit = null // both branches end: nothing continues
      cursor = Math.max(node.m1, merge ?? 0, far)
    } else cursor = node.m1
    node.exit = exit
    spine.push(node)
    cursor += GAP
  })
  for (let i = 1; i < spine.length; i++) {
    const a = spine[i - 1], b = spine[i]
    if (a.exit != null) edges.push({ pts: [[a.exit, 0], [b.m0, 0]], arrow: true })
  }
  // Side step that jumps to the end: route on an outer lane, into the last box.
  const last = spine[spine.length - 1]
  for (const j of jumps) {
    const lane = j.dir * (Math.max(...shapes.map(s => Math.abs(s.c) + sz(s).c / 2)) + 22)
    const edge = j.from.c + j.dir * j.ss.c / 2
    if (last) edges.push({ pts: [[j.from.m, edge], [j.from.m, lane], [last.mc, lane], [last.mc, j.dir * last.cHalf]], arrow: true })
  }
  // flow coords -> x/y
  const xy = ([m, c]) => across ? [m, c] : [c, m]
  // Keep the main line in the middle: pad the lighter side so both sides of the
  // line reach equally far.
  const titleW = chart.title ? chart.title.length * 8.6 : 0
  const reach = Math.max(across ? 0 : titleW / 2, ...shapes.map(s => Math.abs(s.c) + sz(s).c / 2), ...edges.flatMap(e => e.pts.map(p => Math.abs(p[1]))))
  const all = [...shapes.flatMap(s => { const [x, y] = xy([s.m, s.c]); return [[x - s.w / 2, y - s.h / 2], [x + s.w / 2, y + s.h / 2]] }),
    ...edges.flatMap(e => e.pts.map(xy)), xy([0, -reach]), xy([0, reach]), ...(across && titleW ? [[titleW, 0]] : [])]
  const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]))
  const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]))
  const pad = 18, top = chart.title ? 36 : 0
  const ox = pad - minX, oy = pad + top - minY
  const T = (p) => { const [x, y] = xy(p); return [Math.round(x + ox), Math.round(y + oy)] }
  return {
    width: Math.ceil(maxX - minX + pad * 2), height: Math.ceil(maxY - minY + pad * 2 + top),
    shapes: shapes.map(s => { const [x, y] = T([s.m, s.c]); return { ...s, x, y } }),
    edges: edges.map(e => ({ ...e, pts: e.pts.map(T) })),
    labels: labels.map(l => {
      const [x, y] = T([l.m, l.c])
      // Across: side names sit right of the up/down arrow. Down: centred above the sideways arrow.
      return across ? { ...l, x: l.side ? x + 8 : x, y: l.side ? y + 4 : y - 7 } : { ...l, x: l.side ? x : x + 8, y: l.side ? y - 7 : y + 4, mid: l.side }
    }),
    centre: T([0, 0])[across ? 1 : 0],
  }
}

// ---- drawing ------------------------------------------------------------

function Shape({ s }) {
  const { x, y, w, h, kind, lines } = s
  const cls = 'ch-' + kind
  const body = kind === 'check'
    ? <polygon className={cls} points={`${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`} />
    : <rect className={cls} x={x - w / 2} y={y - h / 2} width={w} height={h} rx={kind === 'start' || kind === 'end' ? h / 2 : 6} />
  const y0 = y - ((lines.length - 1) * LINE) / 2 + FONT * 0.35
  return (
    <g>
      {body}
      <text className={cls + '-tx'} x={x} textAnchor="middle" fontSize={FONT} fontWeight={kind === 'start' || kind === 'end' ? 700 : 500}>
        {lines.map((l, i) => <tspan key={i} x={x} y={y0 + i * LINE}>{l}</tspan>)}
      </text>
    </g>
  )
}

export function ChartSvg({ chart, across }) {
  const L = useMemo(() => layout(chart, across), [chart, across])
  const id = useMemo(() => 'ar' + Math.random().toString(36).slice(2, 8), [])
  return (
    <svg className="chartsvg" viewBox={`0 0 ${L.width} ${L.height}`} width={L.width} height={L.height} role="img" aria-label={chartText(chart)}>
      <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ch-arrow" /></marker></defs>
      {chart.title && <text className="ch-title" x={across ? 18 : L.centre} y="28" textAnchor={across ? 'start' : 'middle'} fontSize="15" fontWeight="700">{chart.title}</text>}
      {L.edges.map((e, i) => <polyline key={i} className="ch-edge" points={e.pts.map(p => p.join(',')).join(' ')} markerEnd={e.arrow ? `url(#${id})` : undefined} />)}
      {L.shapes.map((s, i) => <Shape key={i} s={s} />)}
      {L.labels.map((l, i) => <text key={i} className="ch-label" x={l.x} y={l.y} textAnchor={l.mid ? 'middle' : 'start'} fontSize="11.5">{l.text}</text>)}
    </svg>
  )
}

// Picks left-to-right when it fits the column, top-down otherwise.
export function Chart({ code, onEnlarge }) {
  const chart = useMemo(() => parseChart(code), [code])
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const acrossW = useMemo(() => layout(chart, true).width, [chart])
  const across = width > 0 && acrossW <= width
  if (!chart.nodes.length) return <p className="err" role="alert">This chart is empty. An admin can add steps in Edit.</p>
  return (
    <div ref={wrapRef} className="chartwrap">
      {width > 0 && <ChartSvg chart={chart} across={across} />}
    </div>
  )
}

// ---- drawer (admin form) ------------------------------------------------

const blank = () => ({ title: '', nodes: [{ kind: 'start', text: '' }, { kind: 'step', text: '' }, { kind: 'end', text: 'Done' }] })

export function ChartDrawer({ open, initial, onCancel, onSave }) {
  const ref = useRef(null)
  const [chart, setChart] = useState(blank)
  const [err, setErr] = useState(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open) { setChart(initial ? parseChart(initial) : blank()); setErr(null); if (!d.open) d.showModal() }
    else if (d.open) d.close()
  }, [open])
  const set = (i, patch) => setChart(c => ({ ...c, nodes: c.nodes.map((n, j) => j === i ? { ...n, ...patch } : n) }))
  const setKind = (i, kind) => set(i, kind === 'check'
    ? { kind, yes: chart.nodes[i].yes || { kind: 'next', text: '' }, no: chart.nodes[i].no || { kind: 'stop', text: '' } }
    : { kind })
  const move = (i, d) => setChart(c => { const n = [...c.nodes]; const j = i + d; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return { ...c, nodes: n } })
  const remove = (i) => setChart(c => ({ ...c, nodes: c.nodes.filter((_, j) => j !== i) }))
  const add = (kind) => setChart(c => {
    const n = [...c.nodes], at = n.length && n[n.length - 1].kind === 'end' ? n.length - 1 : n.length
    n.splice(at, 0, kind === 'check' ? { kind, text: '', yes: { kind: 'next', text: '' }, no: { kind: 'stop', text: '' } } : { kind, text: '' })
    return { ...c, nodes: n }
  })
  const save = () => {
    const empty = chart.nodes.findIndex(n => !n.text.trim() || (n.kind === 'check' && [n.yes, n.no].some(b => b.kind !== 'next' && !b.text.trim())))
    if (!chart.nodes.length) return setErr('Add at least one box.')
    if (empty >= 0) return setErr(`Box ${empty + 1} needs its text filled in.`)
    onSave(serializeChart(chart))
  }
  // Plain function (not a component) so inputs keep focus while typing.
  const branch = (i, which) => {
    const b = chart.nodes[i][which]
    const upd = (patch) => set(i, { [which]: { ...b, ...patch } })
    return (
      <div className="cd-branch" key={which}>
        <input className="cd-yn" value={(chart.nodes[i].labels || ['Yes', 'No'])[which === 'yes' ? 0 : 1]}
          aria-label={`Box ${i + 1}, name of the ${which === 'yes' ? 'first' : 'second'} branch`}
          onChange={e => { const l = [...(chart.nodes[i].labels || ['Yes', 'No'])]; l[which === 'yes' ? 0 : 1] = e.target.value; set(i, { labels: l }) }} />
        <select value={b.kind} onChange={e => upd({ kind: e.target.value })} aria-label={`Box ${i + 1}, if ${which}`}>
          {Object.entries(BRANCHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {b.kind !== 'next' && <input value={b.text} onChange={e => upd({ text: e.target.value })} placeholder="What happens" aria-label={`Box ${i + 1}, if ${which}: text`} />}
      </div>
    )
  }
  return (
    <dialog ref={ref} className="zoom drawer" aria-label="Chart drawer" onClose={onCancel}>
      <div className="zoombar"><span>Chart drawer</span><button className="btn small ghost" onClick={onCancel}>Cancel</button></div>
      <div className="cd-body">
        <div className="cd-form">
          <label>Chart title<input value={chart.title} onChange={e => setChart(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Escalation: flow" /></label>
          <ol className="cd-rows">
            {chart.nodes.map((n, i) => (
              <li key={i} className={'cd-row cd-' + n.kind}>
                <div className="cd-main">
                  <span className="cd-num">{i + 1}</span>
                  <select value={n.kind} onChange={e => setKind(i, e.target.value)} aria-label={`Box ${i + 1} type`}>
                    {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input value={n.text} onChange={e => set(i, { text: e.target.value })} placeholder={n.kind === 'check' ? 'Question, e.g. Screen pass?' : 'What happens'} aria-label={`Box ${i + 1} text`} />
                  <button className="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move box ${i + 1} up`}>↑</button>
                  <button className="icon" onClick={() => move(i, 1)} disabled={i === chart.nodes.length - 1} aria-label={`Move box ${i + 1} down`}>↓</button>
                  <button className="icon" onClick={() => remove(i)} aria-label={`Delete box ${i + 1}`}>✕</button>
                </div>
                {n.kind === 'check' && <div className="cd-branches">{branch(i, 'yes')}{branch(i, 'no')}</div>}
              </li>
            ))}
          </ol>
          <div className="cd-add">
            <span className="muted small">Add:</span>
            <button className="btn small ghost" onClick={() => add('step')}>Step</button>
            <button className="btn small ghost" onClick={() => add('check')}>Decision</button>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="edactions"><button className="btn small ghost" onClick={onCancel}>Cancel</button><button className="btn small" onClick={save}>Save chart</button></div>
        </div>
        <div className="cd-preview" aria-label="Preview">
          {chart.nodes.length ? <ChartSvg chart={chart} across /> : <p className="muted">Add a box to see the chart.</p>}
        </div>
      </div>
    </dialog>
  )
}
