// Handbook content model.
// A page body is an array of blocks. This is also the shape we store in the
// D1 `sops.body` column (as a JSON string), so the reader renderer never changes
// when content moves from here to the database.
//
// Block types:
//   { t: 'p',    x: 'text' }
//   { t: 'h2',   x: 'Heading' }
//   { t: 'steps',x: ['step one', 'step two'] }
//   { t: 'table',head: ['A','B'], rows: [['1','2']] }
//   { t: 'list', x: ['bullet', 'bullet'] }
//   { t: 'code', x: 'preformatted text' }
//   { t: 'callout', tone: 'good' | 'warn' | 'info', title?: '...', x: '...' }
// Text in p/list/steps/table/callout may use inline **bold** and `code`.

export const PAGES = {
  culture: {
    title: 'Culture & Conduct',
    crumb: 'Start Here',
    meta: ['V1.0', 'Everyone reads this first', 'Updated 17 Sep 2026'],
    blocks: [
      { t: 'p', x: 'The 5 Pillars are how we think. The Doctrine is how we operate. The Redlines are what ends employment. Leaders included: lead by example.' },
      { t: 'h2', x: 'The 5 Pillars' },
      { t: 'table', head: ['Pillar', 'In short'], rows: [
        ['Ownership Mentality', 'Own your tasks and outcomes. No excuses, no blame, finish what you start.'],
        ['Progress Over Perfection', 'Move and deliver fast, then improve on real feedback. Done beats drafted.'],
        ['Data-Driven Thinking', 'Decide on numbers and clear reasoning, not assumptions or feelings.'],
        ['Continuous Growth', 'Get a little better every week. Learn from mistakes, build better habits.'],
        ['Team Before Ego', 'Put team success above personal ego. No gossip, no politics, open to feedback.'],
      ] },
      { t: 'h2', x: 'Company Doctrine' },
      { t: 'steps', ordered: false, x: [
        'Company comes first', 'Ownership over excuses', 'System over individuals',
        'Loyalty and trust are earned', 'Discipline creates freedom', 'Data over assumption',
        'Leaders lead by example', 'Improve every month', 'No toxic behavior', 'Build something bigger',
      ] },
      { t: 'h2', x: 'Redlines — zero tolerance' },
      { t: 'callout', tone: 'warn', title: 'Immediate termination', x: 'Data betrayal · Player or financial misconduct · Theft or fraud · Unauthorized player handling · Security violations · Dishonesty with leadership · External business conflicts · Substance abuse on duty · Public defamation · Unauthorized contact with ex-staff.' },
    ],
  },

  grace: {
    title: 'Grace Period List',
    crumb: 'SOP Book · Money Control & Bonuses',
    meta: ['V1.0', 'Day Shift', 'Owner: ATL', 'Updated 13 May 2026'],
    blocks: [
      { t: 'h2', x: 'Objective' },
      { t: 'p', x: 'Filter eligible Grace Period players and send targeted Internal Mail to re-engage them before the grace window expires. First daily task, once the feed lands.' },
      { t: 'h2', x: 'Sending schedule' },
      { t: 'table', head: ['Day', 'Action'], rows: [
        ['Monday', 'Grace Period Player IM (List A)'],
        ['Tuesday', 'Potential Player IM (List B)'],
        ['Thursday', 'Follow-up List A'],
        ['Friday', 'Follow-up List B'],
        ['Wed / Sat / Sun', 'No Grace IM'],
      ] },
      { t: 'h2', x: 'Procedure' },
      { t: 'steps', x: [
        'Receive the Grace Period database from Retention Admin (Handover tab).',
        'Copy into the Customer Approaching Lark Base, Grace Period (Day). Paste values only.',
        'Filter Valid vs Invalid by brand and status.',
        'Valid: pass list to Admin for SMS, CS sends IM + Push. Invalid: IM + Push only, no bonus mention.',
        'Update the QA Record with a BO screenshot.',
      ] },
      { t: 'h2', x: 'Bonus ladder' },
      { t: 'table', head: ['Tier', 'Deposit', 'Free bonus', 'Cap'], rows: [
        ['T3', 'RM 100', 'RM 18', 'SW × 20%'],
        ['T3', 'RM 500', 'RM 58', 'SW × 20%'],
        ['TV', 'RM 600', 'RM 68', 'SW × 20%'],
        ['TV', 'RM 900', 'RM 98', 'SW × 20%'],
      ] },
      { t: 'callout', tone: 'good', title: 'Guardrails', x: 'Contact before any deposit credit. Never contact HEALTHY or WATCH players. Counts are weighted, never a simple average.' },
    ],
  },

  ltv: {
    title: 'LTV List',
    crumb: 'SOP Book · Engagement Outreach',
    meta: ['V1.0', 'Day Shift', 'Owner: ATL', 'Updated 13 May 2026'],
    blocks: [
      { t: 'h2', x: 'Objective' },
      { t: 'p', x: 'Approach selected LTV players for targeted retention via Internal Mail. Top 70 LTV pool split into 10 players per day, Monday to Sunday.' },
      { t: 'h2', x: 'Procedure' },
      { t: 'steps', x: [
        "Open the Handover tab, take today's 10-player batch. Use today's exact day.",
        'Deduplicate: remove anyone already given Daily P&L or this week’s LTV.',
        'Per-player check: not given this week, active, SW sufficient (bonus ≤ SW × 40%).',
        'Trigger interaction, player must engage before issuance.',
        'On target, submit Lark ticket (VVIP LTV 70 BONUS). Tag and update the QA Record.',
      ] },
      { t: 'h2', x: 'Bonus ladder' },
      { t: 'table', head: ['LTV', 'Free bonus', 'Cap'], rows: [
        ['2,000', 'RM 28', 'SW × 40%'],
        ['10,000', 'RM 118', 'SW × 40%'],
        ['20,000', 'RM 228', 'SW × 40%'],
        ['≥ 21,000', 'RM 288', 'SW × 40% · cap'],
      ] },
      { t: 'callout', tone: 'good', title: 'Guardrails', x: 'Exactly 10 players a day, never carry over. SW × 40% hard cap. CS prepares the list; Admin sends the SMS.' },
    ],
  },

  risk: {
    title: 'Risk Push',
    crumb: 'SOP Book · Engagement Outreach',
    meta: ['V1.0', 'Day Shift', 'Owner: ATL', 'Updated 13 May 2026'],
    blocks: [
      { t: 'h2', x: 'Objective' },
      { t: 'p', x: 'Send tier-graduated Push and Internal Messages to inactive players, to re-engage before the risk level escalates.' },
      { t: 'h2', x: 'Risk tiers' },
      { t: 'table', head: ['Inactivity', 'Channels', 'Strategy'], rows: [
        ['1 day', 'Push only', 'Light reminder'],
        ['3 days', 'SMS + Message', 'Soft emotional pull'],
        ['7 / 14 / 30 days', 'SMS + Message', 'Reload bonus, 1× turnover, urgency'],
      ] },
      { t: 'callout', tone: 'warn', title: 'Do not mix file formats', x: 'TC uploads .txt, Zyra uploads .csv. Wrong format fails. For 3D and above, Admin sends the SMS; CS prepares the list.' },
    ],
  },

  pnl: {
    title: 'Top PNL',
    crumb: 'SOP Book · Engagement Outreach',
    meta: ['V1.0', 'Night Shift', 'Owner: ATL', 'Updated 13 May 2026'],
    blocks: [
      { t: 'h2', x: 'Objective' },
      { t: 'p', x: 'Top 10 highest-loss players today get tiered Free Bonus compensation, capped at SW × 40%. Night Shift; export at 7:00 PM, engage at 8:00 PM.' },
      { t: 'h2', x: 'Eligibility (all must pass)' },
      { t: 'table', head: ['Check', 'Pass'], rows: [
        ['Daily P&L', 'Negative (lost today)'],
        ['Today’s reward', 'Not yet claimed'],
        ['Secret Wallet', 'Bonus ≤ SW × 40%'],
        ['Monthly P&L', 'Negative overall'],
      ] },
      { t: 'callout', tone: 'good', title: 'Guardrails', x: 'Sort loss high to low. SW × 40% is the hard cap. If Monthly P&L is profitable, no bonus (over-issuance exception).' },
    ],
  },
}

// Navigation. Items with a matching PAGES id render a real page; others render
// a status stub until imported from the database.
export const NAV = [
  { id: 'start', name: 'Start Here', items: [
    { id: 'culture', title: 'Culture & Conduct' },
    { title: 'Department Overview', status: 'pending' },
    { title: 'Team Structure', status: 'pending' },
  ] },
  { id: 'sop', name: 'SOP Book', badge: 'sub-project', domains: [
    { name: 'Governance & Integrity', items: [
      { title: 'Case Study Logging', status: 'pending' }, { title: 'Reporting & Data Integrity', status: 'planned' },
      { title: 'Escalation', status: 'planned' }, { title: 'Process Landing Layer', status: 'pending' } ] },
    { name: 'Money Control & Bonuses', items: [
      { id: 'grace', title: 'Grace Period List' }, { title: 'Birthday Bonus', status: 'external' },
      { title: 'Weekend Campaign', status: 'pending' }, { title: 'Bonus Issuance & Approval', status: 'planned' },
      { title: 'Compensation', status: 'planned' } ] },
    { name: 'Reporting & Data', items: [
      { title: 'QA Record', status: 'pending' }, { title: 'Output Report', status: 'pending' }, { title: 'ROI Table', status: 'pending' } ] },
    { name: 'Engagement Outreach', items: [
      { id: 'ltv', title: 'LTV List' }, { id: 'pnl', title: 'Top PNL' }, { title: 'Top Deposit', status: 'pending' },
      { title: 'VVIP Blast', status: 'pending' }, { title: 'Internal Mail Approach', status: 'pending' },
      { title: 'Telegram Approach', status: 'pending' }, { title: 'TG Engagement Tracker', status: 'pending' },
      { title: 'SMS Script', status: 'pending' }, { title: 'Push Notification', status: 'planned' },
      { id: 'risk', title: 'Risk Push' }, { title: 'Reactivation & Win-back', status: 'planned' },
      { title: 'Special Event Campaign', status: 'planned' } ] },
    { name: 'Service & Exceptions', items: [
      { title: 'Complaint Handling', status: 'pending' }, { title: 'Chat SOP', status: 'pending' },
      { title: 'Checking Conversation History', status: 'external' }, { title: 'ZYRA Forgot Password', status: 'external' },
      { title: 'Redeem Code S0403', status: 'external' } ] },
    { name: 'People & Operations', items: [
      { title: 'KPI Scoring', status: 'pending' }, { title: 'New Agent Onboarding', status: 'planned' },
      { title: 'New Staff Incentive', status: 'planned' }, { title: 'Attendance (Pre-Shift)', status: 'pending' },
      { title: 'Shift Overview', status: 'pending' }, { title: 'Shift Handover', status: 'planned' },
      { title: 'Channel Login', status: 'restricted' } ] },
    { name: 'Systems, Automation & Continuity', items: [
      { title: 'Login Provisioning', status: 'planned' }, { title: 'Incognito Browsing', status: 'pending' },
      { title: 'Panic Switch (PYM)', status: 'restricted' } ] },
  ] },
  { id: 'hr', name: 'HR & People', items: [
    { title: 'Work Policy', status: 'pending' }, { title: 'Leave Policy', status: 'pending' },
    { title: 'AL Blackout Policy', status: 'pending' }, { title: 'Resignation Policy', status: 'pending' },
    { title: 'Precaution & Security', status: 'pending' }, { title: 'JNR Probation Checklist', status: 'pending' },
    { title: 'JNR to SNR Probation', status: 'pending' }, { title: 'Roster', status: 'restricted' },
    { title: 'Staff Records', status: 'restricted' } ] },
  { id: 'fw', name: 'Frameworks & Strategy', items: [
    { title: 'Engagement Strategy', status: 'pending' }, { title: 'KPI Framework', status: 'pending' },
    { title: 'Livechat Handling Framework', status: 'pending' }, { title: 'Relationship Management', status: 'pending' },
    { title: 'CRM Schedule', status: 'pending' } ] },
  { id: 'lib', name: 'Libraries', items: [
    { title: 'Templates', status: 'pending' }, { title: 'Material Library', status: 'pending' },
    { title: 'Case Study Library', status: 'pending' }, { title: 'Learning Library', status: 'pending' },
    { title: 'Tools & Console', status: 'pending' }, { title: 'Tag Library', status: 'pending' } ] },
]

// Extra search keywords per entry (title -> space-separated terms). Search also
// matches the title, section, domain, and (for real pages) the body text, so
// these are just the synonyms and shorthands people actually type.
// In the database this becomes a `keywords` column on the sops row.
export const KEYWORDS = {
  'Culture & Conduct': 'pillars doctrine redlines values conduct ownership integrity',
  'Grace Period List': 'bonus deposit grace expiry re-engage internal mail day shift',
  'LTV List': 'bonus loyalty lifetime value top 70 retention',
  'Risk Push': 'inactive churn push reactivate 1d 3d 7d 14d 30d reload notification',
  'Top PNL': 'loss compensation night bonus pnl p&l biggest loser',
  'Top Deposit': 'winner depositor vip care night engagement no bonus',
  'VVIP Blast': 'welcome upgrade newly upgraded new vip tier',
  'SMS Script': 'sms list preparation admin blast',
  'QA Record': 'evidence screenshot proof quality reporting',
  'Output Report': 'shift summary reporting cs output livechat count',
  'ROI Table': 'deposit withdrawal 3 day before after roi bonus claim',
  'Internal Mail Approach': 'im blast back office mail tc zyra',
  'Telegram Approach': 'telegram churn priority scripts soft skill outreach',
  'TG Engagement Tracker': 'telegram kanban score kpi reactivation tracker lark base',
  'Chat SOP': 'otp password withdraw bank register account case library troubleshoot',
  'Complaint Handling': 'complaint livechat empathy credit angry losing',
  'Weekend Campaign': 'angpao ang bao free spin deposit challenge saturday sunday',
  'Attendance (Pre-Shift)': 'vpn nordlayer clock in insightful workpuls incognito setup',
  'Shift Overview': 'run sheet task order morning night schedule',
  'KPI Scoring': 'kpi frt discipline deposit growth retention target score',
  'Case Study Logging': 'incident exploit lesson severity case study',
  'Channel Login': 'login discord livechat setup pre-shift',
  'Department Overview': 'mission scope brands tiers roles about',
  'Team Structure': 'org chart headcount roles about',
  'Work Policy': 'discipline penalty attendance annex wfh',
  'Leave Policy': 'annual leave al sick mc paternity maternity entitlement',
  'AL Blackout Policy': 'blackout peak leave restriction',
  'Resignation Policy': 'notice period resign forfeiture',
  'Precaution & Security': 'safety security comms account handling',
  'KPI Framework': 'kpi team a b c bonus metrics weights',
  'Engagement Strategy': 'framework segment sw control timetable',
  'Relationship Management': 'rapport vip long term relationship',
  'Livechat Handling Framework': 'livechat pillars uid profile',
  'CRM Schedule': 'calendar campaign monthly cadence',
  'Templates': 'reply templates livechat en bm cn',
  'Material Library': 'assets creative brand templates',
  'Case Study Library': 'incidents log learning',
  'Learning Library': 'lessons learning group archive',
  'Tools & Console': 'tools console vvip tracker imessage hr portal',
  'Tag Library': 'tags categories chat tagging',
  'ZYRA Forgot Password': 'password reset zyra forgot',
  'Redeem Code S0403': 'redeem code s0403',
  'Birthday Bonus': 'birthday bonus',
  'Panic Switch (PYM)': 'panic switch pym emergency shutdown',
  'Checking Conversation History': 'conversation history vvip check',
}
