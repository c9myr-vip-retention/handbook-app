// Pull pages edited in the in-app editor back into the repo markdown, so the
// SOP book and the Obsidian vault stay current. The app is the master copy for
// these pages; this only writes the repo side.
//
//   npm run export            write every app-edited page back to its .md source
//   npm run export -- --dry   show what would be written
//
// Per page: the header block (above the first ---) is kept, with Version, Last
// updated and the title line refreshed; everything below is regenerated from the
// live blocks. Each file is then re-converted and checked against D1.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MAP, convert } from './import-md.mjs'
import { toMarkdown } from '../src/lib/markdown.js'

const DRY = process.argv.includes('--dry')
const SRC = 'C:/Dev/personal-assistant/projects/sop-book'
const root = new URL('..', import.meta.url)
const WRANGLER = 'node_modules/wrangler/bin/wrangler.js'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const rows = d1Query('select id, title, body, version, updated_by, updated_at from sops where updated_by is not null order by id')
if (!rows.length) { console.log('No app-edited pages. Nothing to export.'); process.exit(0) }

let written = 0
for (const r of rows) {
  const file = MAP[r.id]
  if (!file) { console.log('  ? ' + r.id + ': no markdown source (hand-written page); edit lives in the app only'); continue }
  const path = join(SRC, file)
  const md = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const lines = md.split(/\r?\n/)
  const rule = lines.findIndex(l => /^---\s*$/.test(l))
  if (rule < 0) { console.log('  ! ' + r.id + ': no header rule in ' + file + ', skipped'); continue }

  // Edit date in Malaysia time (D1 stores UTC).
  const d = new Date(new Date(r.updated_at.replace(' ', 'T') + 'Z').getTime() + 8 * 3600e3)
  const when = d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
  const ver = String(r.version || 'V1.0').replace(/^V/i, '')
  const header = lines.slice(0, rule).map(l => {
    if (/^# /.test(l)) return /^# SOP:/.test(l) ? '# SOP: ' + r.title : '# ' + r.title
    if (/\*\*Version:\*\*/.test(l)) l = l.replace(/(\*\*Version:\*\*\s*)[^|]*?(\s*\||$)/, (m, k, tail) => k + ver + tail)
    if (/^\*\*Last updated:\*\*/.test(l)) {
      const prev = l.replace(/^\*\*Last updated:\*\*\s*/, '')
      if (!prev.startsWith(when + ' (edited in the Handbook App')) l = '**Last updated:** ' + when + ' (edited in the Handbook App; previous: ' + prev + ')'
    }
    return l
  })
  // The "Applies to" paragraph is generated from the header; do not duplicate it.
  const body = JSON.parse(r.body || '[]').filter((b, i) => !(i === 0 && b.t === 'p' && /^\*\*Applies to:\*\*/.test(b.x)))
  const out = header.join('\n').trimEnd() + '\n\n---\n\n' + toMarkdown(body)

  const check = convert(out)
  const same = JSON.stringify(check.body) === r.body && check.version === r.version
  console.log('  ' + (DRY ? '~ ' : 'w ') + r.id + ' -> ' + file + (same ? '' : '  (WARNING: re-converted page differs from D1, check the file)'))
  if (!DRY) { writeFileSync(path, out); written++ }
}
console.log(DRY ? '\n--dry: nothing written.' : `\nWrote ${written} file(s). Commit them in personal-assistant, then npm run sync shows them as unchanged.`)

function d1Query(command) {
  const out = execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', 'handbook', '--remote', '--json', '--command', command],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 })
  return JSON.parse(out.slice(out.indexOf('[')))[0].results
}
