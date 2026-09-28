// Page body <-> markdown. One converter for three users:
//   db/import-md.mjs  (repo SOP markdown -> blocks, via parseBody)
//   the in-app editor (blocks -> markdown to edit, markdown -> blocks on save)
//   db/export.mjs     (app-edited blocks -> markdown back into the repo)
// parseBody must stay byte-stable for the repo sources: sync compares its output
// with live D1, so any change here shows up as a diff on every page.

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
const isSep = (line) => /^\|?\s*:?-{2,}/.test(line.trim())

// Unsettled items in the source ([CONFIRM ...]) become a visible pending
// callout instead of reading as settled fact.
function withPending(text, blocks, push) {
  const m = text.match(/^(.*?)\s*\[CONFIRM\s+([^\]]+)\]\s*(.*)$/i)
  if (!m) return push(text)
  if (m[1]) push(m[1])
  blocks.push({ t: 'callout', tone: 'warn', title: 'Pending confirmation', x: 'Confirm ' + m[2].trim() })
  if (m[3]) push(m[3])
}

// Markdown body (everything below the header rule) -> content blocks.
export function parseBody(md) {
  const lines = String(md).replace(/^﻿/, '').split(/\r?\n/)
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || /^---\s*$/.test(line)) { i++; continue }

    if (line.startsWith('## ') || line.startsWith('### ')) {
      // Keep the section number: body text cross-references it ("see Section 5").
      blocks.push({ t: 'h2', x: line.replace(/^#+\s+/, '') })
      i++; continue
    }
    if (line.startsWith('```')) {
      const body = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      blocks.push({ t: 'code', x: body.join('\n') })
      continue
    }
    if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!isSep(lines[i])) rows.push(cells(lines[i]))
        i++
      }
      blocks.push({ t: 'table', head: rows[0], rows: rows.slice(1) })
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s+/, ''))
      // Bullets marking an unsettled item (UNCONFIRMED / OPEN:) come out of the
      // list as warn callouts, so they never read as a settled rule.
      const open = items.filter(x => /\bUNCONFIRMED\b|\bOPEN:/.test(x))
      const rest = items.filter(x => !open.includes(x))
      if (rest.length) blocks.push({ t: 'list', x: rest })
      for (const x of open) blocks.push({ t: 'callout', tone: 'warn', title: 'Open item', x })
      continue
    }
    if (/^\+\s+/.test(line)) {
      // Pills (short tags in a row): the editor writes them as + lines.
      const items = []
      while (i < lines.length && /^\+\s+/.test(lines[i])) items.push(lines[i++].replace(/^\+\s+/, ''))
      blocks.push({ t: 'steps', ordered: false, x: items })
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ''))
      blocks.push({ t: 'steps', x: items })
      continue
    }
    if (line.startsWith('> ')) {
      const text = []
      while (i < lines.length && lines[i].startsWith('>')) text.push(lines[i++].replace(/^>\s?/, ''))
      let x = text.join(' ')
      // Explicit callout marker written by the editor: > [!warn|Title] text
      const tag = x.match(/^\[!(warn|info)(?:\|([^\]]*))?\]\s*/)
      if (tag) {
        x = x.slice(tag[0].length)
        blocks.push(tag[2] ? { t: 'callout', tone: tag[1], title: tag[2], x } : { t: 'callout', tone: tag[1], x })
        continue
      }
      // A quote flagging an unsettled item must not read as a neutral note.
      blocks.push(/unresolved|conflict|confirm with|confirm the/i.test(x)
        ? { t: 'callout', tone: 'warn', title: 'Open item', x }
        : { t: 'callout', tone: 'info', x })
      continue
    }
    withPending(line.trim(), blocks, (x) => blocks.push({ t: 'p', x }))
    i++
  }
  return blocks
}

// Content blocks -> markdown that parseBody turns back into the same blocks.
export function toMarkdown(blocks = []) {
  const cell = (c) => String(c ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')
  return blocks.map(b => {
    if (b.t === 'h2') return '## ' + b.x
    if (b.t === 'p') return b.x
    if (b.t === 'code') return '```\n' + b.x + '\n```'
    if (b.t === 'list') return b.x.map(x => '- ' + x).join('\n')
    if (b.t === 'steps' && b.ordered === false) return b.x.map(x => '+ ' + x).join('\n')
    if (b.t === 'steps') return b.x.map((x, i) => (i + 1) + '. ' + x).join('\n')
    if (b.t === 'table') {
      const head = b.head || []
      return ['| ' + head.map(cell).join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
        ...(b.rows || []).map(r => '| ' + r.map(cell).join(' | ') + ' |')].join('\n')
    }
    if (b.t === 'callout') return '> [!' + (b.tone === 'warn' ? 'warn' : 'info') + (b.title ? '|' + b.title : '') + '] ' + b.x
    return ''
  }).filter(Boolean).join('\n\n') + '\n'
}
