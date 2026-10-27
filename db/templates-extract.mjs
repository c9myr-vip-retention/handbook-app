// One-time migration: put the enrolled SOP template (Lark layout) on top of each
// SOP page. Reads projects/sop-templates/<Folder>/Template_DRAFT.xlsx (header
// fields + 6-column steps table) and Flowchart_DRAFT.png, then inserts into the
// matching projects/sop-book/*.md, right under the header rule:
//
//   ```sop-header ... ```      process fields (the page supplies the version)
//   ## Procedure               6-column steps table
//   ## Flow chart              image, copied to public/flowcharts/<id>.png
//
//   node db/templates-extract.mjs          dry run: prints what it would do
//   node db/templates-extract.mjs --write  writes the .md files and PNGs
//
// Pages that already have a ```sop-header block are skipped, so it is safe to re-run.
import ExcelJS from 'exceljs'
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAP } from './import-md.mjs'

const WRITE = process.argv.includes('--write')
const TPL = fileURLToPath(new URL('../content/sop-templates', import.meta.url))
const SRC = fileURLToPath(new URL('../content/sop-book', import.meta.url))
const PUB = new URL('../public/flowcharts/', import.meta.url)

// Template folder -> page id. Channel Login stays a restricted placeholder;
// Promotion Run Timeline (SOP 40) is not in the app yet. Chat Case Library and
// Process-Landing Layer use their own layouts (case table, method map), not the steps template.
const FOLDERS = {
  App_First_Link_Recovery_SOP: 'app-first-link-recovery', Attendance_Pre_Shift_SOP: 'attendance-pre-shift',
  Birthday_Bonus_SOP: 'birthday-bonus', Bonus_Issuance_SOP: 'bonus-issuance-approval',
  Case_Study_Logging_SOP: 'case-study-logging',
  Checking_Conversation_History_SOP: 'checking-conversation-history', Compensation_SOP: 'compensation',
  Complaint_Handling_SOP: 'complaint-handling', Daily_Closing_Report_SOP: 'daily-closing-report',
  Escalation_SOP: 'escalation', Grace_Period_SOP: 'grace', Incognito_Browsing_SOP: 'incognito-browsing',
  Internal_Mail_Approach_SOP: 'internal-mail-approach', KPI_Scoring_SOP: 'kpi-scoring', LTV_List_SOP: 'ltv',
  Login_Provisioning_SOP: 'login-provisioning', New_Agent_Onboarding_SOP: 'new-agent-onboarding',
  New_Staff_Incentive_Eligibility_SOP: 'new-staff-incentive', Output_Report_SOP: 'output-report',
  Push_Notification_SOP: 'push-notification',
  QA_Record_SOP: 'qa-record', ROI_Table_SOP: 'roi-table', Reactivation_Winback_SOP: 'reactivation-win-back',
  Redeem_Code_S0403_SOP: 'redeem-code-s0403', Reporting_Data_Integrity_SOP: 'reporting-data-integrity',
  Risk_Push_SOP: 'risk', SMS_Script_SOP: 'sms-script', Shift_Handover_SOP: 'shift-handover',
  Special_Event_Campaign_SOP: 'special-event-campaign', Telegram_Approach_SOP: 'telegram-approach',
  Telegram_Engagement_Tracker_SOP: 'tg-engagement-tracker', Top_Deposit_SOP: 'top-deposit', Top_PNL_SOP: 'pnl',
  VVIP_Blast_SOP: 'vvip-blast', Weekend_Campaign_SOP: 'weekend-campaign', ZYRA_Forgot_Password_SOP: 'zyra-forgot-password',
}

// Changes made in the live Lark tabs after the local drafts were built
// (26 to 28 Sep 2026). Applied to the extracted text so the app matches Lark.
const LARK_FIXES = {
  'attendance-pre-shift': [['select LPK01 or TH01', 'select server M01, M02 or M03']],
  'push-notification': [['TL approval', 'ATL (or above) approval']],
  'special-event-campaign': [['ATL/TL approve structure and budget.', 'the Supervisor approves structure and budget for every special event.']],
  'login-provisioning': [['After creation: deliver securely to the CS.', "After creation: the CS's own team leader (ATL) hands over one BO login per assigned brand."]],
}

const val = (c) => {
  const v = c?.value
  if (v == null) return ''
  if (typeof v === 'object') return (v.richText ? v.richText.map(t => t.text).join('') : v.text || v.result || '').toString()
  return String(v)
}
const clean = (s) => String(s).replace(/\r?\n/g, ' ').replace(/\|/g, '/').replace(/\s+/g, ' ').trim()

let done = 0
for (const [folder, id] of Object.entries(FOLDERS)) {
  const file = MAP[id]
  if (!file) { console.log('  ? ' + id + ': not in MAP'); continue }
  const mdPath = join(SRC, file)
  const md = readFileSync(mdPath, 'utf8')
  if (md.includes('```sop-header')) { console.log('  = ' + id + ': already has the template'); continue }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(join(TPL, folder, 'Template_DRAFT.xlsx'))
  const ws = wb.worksheets[0]
  const cell = (a) => clean(val(ws.getCell(a)))
  const header = [
    ['Process name', cell('B3')], ['Department', cell('B4').replace(/ *\(Team B\)/, '')], ['Process owner', cell('B5')],
    ['Effective date', cell('D4')], ['Approved by', cell('D5')],
  ]
  const steps = []
  for (let r = 8; r < 60; r++) {
    const no = cell('A' + r), name = cell('B' + r)
    if (!no && !name) break
    steps.push([no, name, cell('C' + r), cell('D' + r), cell('E' + r), cell('F' + r)])
  }
  let chunk = '```sop-header\n' + header.map(([k, v]) => k + ': ' + v).join('\n') + '\n```\n\n' +
    '## Procedure\n\n| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |\n|---|---|---|---|---|---|\n' +
    steps.map(s => '| ' + s.join(' | ') + ' |').join('\n') + '\n\n' +
    '## Flow chart\n\n![Flow chart: ' + header[0][1] + '](/flowcharts/' + id + '.png)\n\n'
  for (const [a, b] of LARK_FIXES[id] || []) chunk = chunk.split(a).join(b)

  const lines = md.split(/\r?\n/)
  const rule = lines.findIndex(l => /^---\s*$/.test(l))
  const out = lines.slice(0, rule + 1).join('\n') + '\n\n' + chunk + lines.slice(rule + 1).join('\n').replace(/^\n+/, '')
  console.log('  ' + (WRITE ? 'w' : '~') + ' ' + id.padEnd(30) + steps.length + ' steps  ' + (header[0][1] || '(no process name)'))
  if (WRITE) {
    writeFileSync(mdPath, out)
    mkdirSync(PUB, { recursive: true })
    const png = join(TPL, folder, 'Flowchart_DRAFT.png')
    if (existsSync(png)) copyFileSync(png, new URL(id + '.png', PUB))
    done++
  }
}
console.log(WRITE ? `\nWrote ${done} page(s).` : '\nDry run. Add --write to apply.')
