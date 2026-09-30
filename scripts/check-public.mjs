// Build guard. The app shell is public (only /api and /flowcharts sit behind
// Cloudflare Access), so the built files must not carry any handbook content.
// Fails the build if a page title or a sentence from any page body is found in
// dist/ (flowcharts excluded: that folder stays behind Access).
//
//   node scripts/check-public.mjs      (runs after vite build)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const dist = join(root, 'dist')
const content = join(root, 'db', 'content')

// Probes: every page title (12+ chars) and up to 3 long sentences per page.
const probes = new Set()
const textOf = (b) => b.t === 'table' ? b.rows.flat().join(' ') : Array.isArray(b.x) ? b.x.join(' ') : String(b.x || '')
for (const f of readdirSync(content).filter(f => f.endsWith('.json'))) {
  const page = JSON.parse(readFileSync(join(content, f), 'utf8'))
  const body = page.body || []
  const titleRow = body.find(b => b.t === 'sopheader')?.f?.find(([k]) => k === 'Process name')?.[1]
  for (const t of [titleRow].filter(Boolean)) if (t.length >= 12) probes.add(t)
  body.map(textOf).join(' ').split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/\*\*|`/g, '').trim())
    .filter(s => s.length >= 40)
    .slice(0, 3)
    .forEach(s => probes.add(s.slice(0, 40)))
}

// The learning preview (branch preview/learning) bundles SOP numbers and quiz
// answers. It must never deploy: this probe fails any build that includes it.
probes.add('Preview of the learning features')

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== 'flowcharts') walk(p) }
    else if (/\.(js|html|css|json|txt|map)$/.test(name)) files.push(p)
  }
}
walk(dist)

const leaks = []
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  for (const p of probes) if (text.includes(p)) leaks.push(f.replace(dist, 'dist') + ': "' + p + '"')
}
if (leaks.length) {
  console.error('\nPUBLIC BUILD CHECK FAILED: handbook content found in public files.\n' + leaks.slice(0, 20).join('\n'))
  process.exit(1)
}
console.log(`Public build check passed: ${probes.size} content probes, ${files.length} files, no content found.`)
