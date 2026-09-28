// One-time migration: read each hand-drawn SOP flow chart (the house-style SVG in
// projects/sop-templates/<Folder>/Flowchart_DRAFT.svg) back into a ```chart block,
// so every chart is editable in the app's chart drawer.
//
//   node db/charts-extract.mjs            dry run: prints each chart and any doubts
//   node db/charts-extract.mjs --write    replaces the PNG image line in projects/sop-book/*.md
//
// The SVGs share one grammar: a line of boxes on one y, amber diamonds, side boxes
// above/below each diamond that rejoin the line (a path back), jump to the end (a
// path to the last box) or stop (red / orange). Anything that does not fit is
// reported, not guessed. The PNGs stay in public/flowcharts for side-by-side review.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { MAP } from './import-md.mjs'

const WRITE = process.argv.includes('--write')
const TPL = 'C:/Dev/personal-assistant/projects/sop-templates'
const SRC = 'C:/Dev/personal-assistant/projects/sop-book'
// Folder -> page id, as used by templates-extract.mjs.
const FOLDERS = Object.fromEntries([...readFileSync(new URL('./templates-extract.mjs', import.meta.url), 'utf8')
  .matchAll(/(\w+_SOP): '([\w-]+)'/g)].map(m => [m[1], m[2]]))

const FILL = { E1F5EE: 'term', E6F1FB: 'step', FCEBEB: 'stop', FFE6CC: 'escalate', F1EFE8: 'step', FAEEDA: 'check' }
const attr = (tag, a) => { const m = tag.match(new RegExp('\\s' + a + '="([^"]*)"')); return m ? m[1] : null }
const num = (tag, a) => +attr(tag, a)
const unesc = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()

function read(svg) {
  const shapes = [], texts = [], paths = [], lines = []
  for (const m of svg.matchAll(/<rect\b[^>]*>/g)) {
    const t = m[0], fill = (attr(t, 'fill') || '').replace('#', '').toUpperCase()
    if (!FILL[fill]) continue
    const x = num(t, 'x'), y = num(t, 'y'), w = num(t, 'width'), h = num(t, 'height')
    shapes.push({ kind: FILL[fill], x0: x, x1: x + w, y0: y, y1: y + h, cx: x + w / 2, cy: y + h / 2, text: [] })
  }
  for (const m of svg.matchAll(/<polygon\b[^>]*>/g)) {
    const t = m[0], fill = (attr(t, 'fill') || '').replace('#', '').toUpperCase()
    if (FILL[fill] !== 'check') continue
    const pts = attr(t, 'points').trim().split(/\s+/).map(p => p.split(',').map(Number))
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
    shapes.push({ kind: 'check', x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys),
      cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, text: [] })
  }
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    texts.push({ x: num(m[0], 'x'), y: num(m[0], 'y'), size: num(m[0], 'font-size'), s: unesc(m[2]), mid: attr(m[0], 'text-anchor') === 'middle' })
  }
  for (const m of svg.matchAll(/<path\b[^>]*\sd="([^"]+)"[^>]*>/g)) {
    if (/fill="#5F5E5A"/.test(m[0]) && /z/.test(m[1])) continue // arrow head
    const pts = [...m[1].matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map(p => [+p[1], +p[2]])
    if (pts.length > 1) paths.push(pts)
  }
  for (const m of svg.matchAll(/<line\b[^>]*>/g)) {
    lines.push([[num(m[0], 'x1'), num(m[0], 'y1')], [num(m[0], 'x2'), num(m[0], 'y2')]])
  }
  return { shapes, texts, paths, lines }
}

function convert(svg) {
  const { shapes, texts, paths, lines } = read(svg)
  const doubts = []
  const title = texts.find(t => t.size >= 14)?.s || ''
  // Put each text in the shape that contains it.
  const loose = []
  for (const t of texts) {
    if (t.size >= 14) continue
    // Box text is centred; branch names (Yes / No) are left-aligned beside the arrows.
    const s = t.mid && shapes.find(s => t.x >= s.x0 - 2 && t.x <= s.x1 + 2 && t.y >= s.y0 - 2 && t.y <= s.y1 + 6)
    if (s) s.text.push(t); else loose.push(t)
  }
  for (const s of shapes) s.label = s.text.sort((a, b) => a.y - b.y || a.x - b.x).map(t => t.s).join(' ')
  const start = shapes.filter(s => s.kind === 'term').sort((a, b) => a.x0 - b.x0)[0]
  if (!start) return { doubts: ['no start box'] }
  const spineY = start.cy
  const onSpine = shapes.filter(s => Math.abs(s.cy - spineY) < 8).sort((a, b) => a.cx - b.cx)
  const side = shapes.filter(s => !onSpine.includes(s))
  const last = onSpine[onSpine.length - 1]
  const nodes = []
  const used = new Set()
  // Every drawn segment (lines and path legs), to follow a side box's way out.
  const segs = [...lines, ...paths.flatMap(pts => pts.slice(1).map((p, k) => [pts[k], p]))]
  const follow = (x, y) => {
    for (let hop = 0; hop < 6; hop++) {
      const seg = segs.find(([a]) => Math.abs(a[0] - x) < 4 && Math.abs(a[1] - y) < 4)
      if (!seg) return hop ? [x, y] : null
      ;[x, y] = seg[1]
    }
    return [x, y]
  }
  // Side boxes belong to the diamond they overlap most closely.
  const checks = onSpine.filter(s => s.kind === 'check')
  const owner = new Map(side.map(b => [b, checks.filter(c => b.x1 >= c.x0 && b.x0 <= c.x1)
    .sort((p, q) => Math.abs(p.cx - b.cx) - Math.abs(q.cx - b.cx))[0]]))
  onSpine.forEach((s, i) => {
    if (s.kind !== 'check') {
      const kind = s.kind === 'term' ? (i === 0 ? 'start' : i === onSpine.length - 1 ? 'end' : 'step') : s.kind
      nodes.push({ kind, text: s.label })
      return
    }
    const node = { kind: 'check', text: s.label, yes: { kind: 'next', text: '' }, no: { kind: 'next', text: '' } }
    const mine = side.filter(b => owner.get(b) === s)
    const up = mine.filter(b => b.cy < spineY), down = mine.filter(b => b.cy > spineY)
    if (up.length > 1 || down.length > 1) doubts.push(`"${s.label}" has more than one box on a side`)
    // Branch names: the loose text beside the arrow into each side box, or on the line going on.
    const near = (x0, x1, y0, y1) => loose.find(t => t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1 && t.s.length <= 14)
    const sideLabel = (b) => b && near(s.cx - 40, s.cx + 70, Math.min(b.y1, s.y0) - 4, Math.max(b.y0, s.y1) + 4)
    const straightLabel = near(s.x1 - 5, s.x1 + 70, spineY - 25, spineY + 6)
    const goesOn = lines.some(([a, b]) => Math.abs(a[0] - s.x1) < 4 && Math.abs(a[1] - spineY) < 4 && b[0] > a[0])
    const branch = (b) => {
      if (b.kind === 'stop' || b.kind === 'escalate') return { kind: b.kind, text: b.label }
      if (b.kind === 'term') return { kind: 'finish', text: b.label }
      const end = follow(b.x1, b.cy)
      if (!end) return { kind: 'done', text: b.label }
      return end[0] >= last.x0 - 5 ? { kind: 'jump', text: b.label } : { kind: 'step', text: b.label }
    }
    // Slot 1 ("yes") is the upper box, or the line going on; slot 2 ("no") the lower box.
    const slots = []
    if (up[0]) slots.push({ b: up[0], l: sideLabel(up[0]) })
    else if (goesOn) slots.push({ b: null, l: straightLabel })
    if (down[0]) slots.push({ b: down[0], l: sideLabel(down[0]) })
    else if (goesOn && up[0]) slots.push({ b: null, l: straightLabel })
    for (const x of slots) if (x.b) used.add(x.b)
    const names = slots.map(x => x.l?.s)
    const yesNo = names.every(n => n && /^(yes|no)$/i.test(n)) && new Set(names.map(n => n.toLowerCase())).size === slots.length
    if (yesNo) {
      for (const x of slots) node[x.l.s.toLowerCase()] = x.b ? branch(x.b) : { kind: 'next', text: '' }
    } else {
      slots.forEach((x, k) => { node[k ? 'no' : 'yes'] = x.b ? branch(x.b) : { kind: 'next', text: '' } })
      node.labels = [names[0] || 'Yes', names[1] || 'No']
      if (names.some(n => !n)) doubts.push(`"${s.label}": a branch has no name; named ${node.labels.join(' / ')}`)
    }
    if (node.yes.kind !== 'next' && node.no.kind !== 'next' && goesOn) doubts.push(`"${s.label}": both branches go sideways but the line also goes on`)
    nodes.push(node)
  })
  const stray = side.filter(b => !used.has(b))
  for (const b of stray) doubts.push(`box "${b.label}" is not under or over a decision; left out`)
  const clean = (x) => String(x).replace(/\|/g, '/')
  const br = (b) => b.kind === 'next' ? 'next' : b.kind + ' ' + clean(b.text)
  const code = [title && 'title: ' + title, ...nodes.map(n => n.kind === 'check'
    ? `check: ${clean(n.text)} | yes: ${br(n.yes)} | no: ${br(n.no)}` + (n.labels ? ` | labels: ${n.labels.map(l => clean(l).replace(/,/g, ' ')).join(', ')}` : '')
    : `${n.kind}: ${clean(n.text)}`)].filter(Boolean).join('\n')
  return { code, doubts }
}

let done = 0, flagged = 0
for (const [folder, id] of Object.entries(FOLDERS)) {
  const file = MAP[id], svgPath = join(TPL, folder, 'Flowchart_DRAFT.svg')
  if (!file || !existsSync(svgPath)) { console.log('? ' + id + ': no page or no SVG'); continue }
  const mdPath = join(SRC, file)
  const md = readFileSync(mdPath, 'utf8')
  // The PNG image line, or the one interim Mermaid chart (Weekend Campaign).
  const img = md.match(/^!\[[^\]]*\]\(\/flowcharts\/[\w-]+\.png\)\s*$/m) || md.match(/^```mermaid\r?\n[\s\S]*?\r?\n```\s*$/m)
  if (!img) { console.log('= ' + id + ': already a chart block'); continue }
  const { code, doubts } = convert(readFileSync(svgPath, 'utf8'))
  if (doubts.length) flagged++
  console.log(`\n## ${id}${doubts.length ? '  (' + doubts.length + ' to check)' : ''}\n${code || ''}`)
  for (const d of doubts) console.log('  ! ' + d)
  if (WRITE && code) {
    writeFileSync(mdPath, md.replace(img[0], '```chart\n' + code + '\n```'))
    done++
  }
}
console.log(`\n${WRITE ? 'Wrote ' + done + ' chart(s).' : 'Dry run.'} ${flagged} with points to check.`)
