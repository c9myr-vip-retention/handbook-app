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
import { parseBody } from '../src/lib/markdown.js'

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
  // Full v1.1 versions replace the short hand-written summaries.
  grace: '01_Grace_Period_List.md',
  ltv: '03_LTV_List.md',
  risk: '05_Risk_Push.md',
  pnl: '07_Top_PNL.md',
  // Formerly Lark-only.
  'birthday-bonus': '22_Birthday_Bonus.md',
  'zyra-forgot-password': '19_ZYRA_Forgot_Password.md',
  'redeem-code-s0403': '20_Redeem_Code_S0403.md',
  'app-first-link-recovery': '39_App_First_Link_Recovery.md',
  'daily-closing-report': '28_Daily_Closing_Report.md',
  'checking-conversation-history': '21_Checking_Conversation_History_VVIP.md',
  // Formerly "planned": written and enrolled in sop-book.
  'bonus-issuance-approval': '23_Bonus_Issuance_Approval.md',
  escalation: '25_Escalation.md',
  'reporting-data-integrity': '26_Reporting_Data_Integrity.md',
  'reactivation-win-back': '27_Reactivation_Winback.md',
  'shift-handover': '29_Shift_Handover.md',
  compensation: '30_Compensation.md',
  'new-agent-onboarding': '32_Onboarding.md',
  'push-notification': '34_Push_Notification.md',
  'special-event-campaign': '35_Special_Event_Campaign.md',
  'login-provisioning': '36_Login_Provisioning.md',
  'new-staff-incentive': '37_New_Staff_Incentive_Eligibility.md',
  // HR & People: clean pages rewritten from the 13 May workbook export.
  'work-policy': '../handbook-app/pages/hr/Work_Policy.md',
  'leave-policy': '../handbook-app/pages/hr/Leave_Policy.md',
  'al-blackout-policy': '../handbook-app/pages/hr/AL_Blackout_Policy.md',
  'resignation-policy': '../handbook-app/pages/hr/Resignation_Policy.md',
  'precaution-security': '../handbook-app/pages/hr/Precaution_Security.md',
  'jnr-probation-checklist': '../handbook-app/pages/hr/JNR_Probation_Checklist.md',
  'jnr-to-snr-probation': '../handbook-app/pages/hr/JNR_to_SNR_Probation.md',
  // Start Here, Frameworks & Strategy, Libraries.
  'department-overview': '../handbook-app/pages/start/Department_Overview.md',
  'team-structure': '../handbook-app/pages/start/Team_Structure.md',
  'engagement-strategy': '../handbook-app/pages/frameworks/Engagement_Strategy.md',
  'livechat-handling-framework': '../handbook-app/pages/frameworks/Livechat_Handling_Framework.md',
  'relationship-management': '../handbook-app/pages/frameworks/Relationship_Management.md',
  'crm-schedule': '../handbook-app/pages/frameworks/CRM_Schedule.md',
  'case-study-library': '../handbook-app/pages/libraries/Case_Study_Library.md',
  templates: '../handbook-app/pages/libraries/Templates.md',
  'learning-library': '../handbook-app/pages/libraries/Learning_Library.md',
  'material-library': '../handbook-app/pages/libraries/Material_Library.md',
  'tools-console': '../handbook-app/pages/libraries/Tools_Console.md',
  'shift-overview': '../handbook-app/pages/start/Shift_Overview.md',
  'kpi-framework': '../handbook-app/pages/frameworks/KPI_Framework.md',
  'tag-library': '../handbook-app/pages/libraries/Tag_Library.md',
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
  blocks.push(...parseBody(lines.slice(i).join('\n')))
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
