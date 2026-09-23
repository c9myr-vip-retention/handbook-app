// Convert house-format SOP markdown (personal-assistant/projects/sop-book) into
// the Handbook block model, one JSON file per SOP in db/content/<id>.json.
// seed.mjs merges these into the rows it generates.
//
//   node db/import-md.mjs [sourceDir]
//
// sourceDir defaults to the sop-book folder in the personal-assistant repo.
// Mapping below: D1 row id (the catalog slug) -> source file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = process.argv[2] || 'C:/Dev/personal-assistant/projects/sop-book'
const OUT = join(here, 'content')

export const MAP = {
  'case-study-logging': '31_Case_Study_Logging.md',
  'process-landing-layer': '33_Process_Landing_Layer.md',
  'weekend-campaign': '15_Weekend_Campaign.md',
  'qa-record': '12_QA_Record.md',
  'output-report': '13_Output_Report.md',
  'roi-table': '14_ROI_Table.md',
  'top-deposit': '08_Top_Deposit.md',
  'vvip-blast': '04_VVIP_Blast.md',
  'internal-mail-approach': '09_Internal_Mail_Approach.md',
  'telegram-approach': '10_Telegram_Approach.md',
  'tg-engagement-tracker': '11_Telegram_Engagement_Tracker.md',
  'sms-script': '06_SMS_Script.md',
  'complaint-handling': '18_Complaint_Handling.md',
  'chat-sop': '17_Chat_SOP_Case_Library.md',
  'kpi-scoring': '24_KPI_Scoring.md',
  'attendance-pre-shift': '16_Attendance_Pre_Shift_Setup.md',
  'incognito-browsing': '38_Incognito_Browsing.md',
}

const MONTHS = { january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun', july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec' }

// Header lines like **Owner:** ATL | **Version:** 1.0 -> { owner, version, ... }
function parseHeader(lines) {
  const h = {}
  for (const line of lines) {
    for (const part of line.split(/\s\|\s/)) {
      const m = part.match(/^\*\*([^*:]+):\*\*\s*(.*)$/)
      if (m) h[m[1].trim().toLowerCase()] = m[2].trim()
    }
  }
  return h
}

function metaFrom(h) {
  const meta = []
  if (h['document code']) meta.push(h['document code'])
  const ver = h.version && h.version.match(/^\d+(\.\d+)?/)
  if (ver) meta.push('V' + (ver[0].includes('.') ? ver[0] : ver[0] + '.0'))
  if (h.category) meta.push(h.category)
  if (h.owner) meta.push('Owner: ' + h.owner.split(/[;(]/)[0].trim())
  const d = h['last updated'] && h['last updated'].match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})/)
  if (d) meta.push('Updated ' + d[1] + ' ' + (MONTHS[d[2].toLowerCase()] || d[2]) + ' ' + d[3])
  return meta
}

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

export function convert(md) {
  const lines = md.replace(/^\uFEFF/, '').split(/\r?\n/)
  const headerLines = []
  let i = 0
  // Skip the title and collect header lines up to the first --- rule.
  while (i < lines.length && !/^---\s*$/.test(lines[i])) {
    if (lines[i].startsWith('**')) headerLines.push(lines[i])
    i++
  }
  i++
  const h = parseHeader(headerLines)
  const blocks = []
  if (h['applies to']) blocks.push({ t: 'p', x: '**Applies to:** ' + h['applies to'] })

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
      blocks.push({ t: 'list', x: items })
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
      blocks.push({ t: 'callout', tone: 'info', x: text.join(' ') })
      continue
    }
    withPending(line.trim(), blocks, (x) => blocks.push({ t: 'p', x }))
    i++
  }
  const ver = h.version && h.version.match(/^\d+(\.\d+)?/)
  return {
    version: ver ? 'V' + (ver[0].includes('.') ? ver[0] : ver[0] + '.0') : 'V1.0',
    meta: metaFrom(h),
    body: blocks,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(OUT, { recursive: true })
  for (const [id, file] of Object.entries(MAP)) {
    const out = { id, source: file, ...convert(readFileSync(join(SRC, file), 'utf8')) }
    writeFileSync(join(OUT, id + '.json'), JSON.stringify(out, null, 1) + '\n')
    const counts = out.body.reduce((a, b) => (a[b.t] = (a[b.t] || 0) + 1, a), {})
    console.log(id.padEnd(24), out.version, JSON.stringify(counts))
  }
}
