# Backlog

The work queue for the Handbook App. An agent picks the first item marked **Ready**, works on a branch, and moves it to **Review** with a short report. Only the ATL marks items **Done** (after deploying).

Status: Ready (agent may start) · Waiting (needs an ATL answer first) · Review (built, waiting for the ATL) · Done.

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Design system batch 1: page templates (reading, list, task, admin) and shared components (page header, action panel, outline list, facts row, toggle, pop-up, empty and error states, one data-loading helper) | Ready | No visible change intended. Learn.jsx and Quizzes.jsx both copy `useLoad`. |
| 2 | Design system batch 2: move Quiz, Learn and Glossary onto the shared components | Waiting | After batch 1 is approved. |
| 3 | Design system batch 3: build check that fails on hard-coded colours, off-scale text sizes, em dashes and all-caps labels | Ready | Add to `npm run build` next to check-public. |
| 4 | Reviewer role limited to Learn publishing (no SOP editing, no approvals) | Waiting | ATL to decide if needed. |
| 5 | Add SOP 41 Test Accounts to the SOP Book | Waiting | 3 OPEN items in the SOP need ATL answers. |
| 6 | 5 Pillars assessment: extra questions per section so attempts differ in content | Waiting | Needs questions from the Team A ATL. |
| 7 | Learn drafts blocked by [CONFIRM]: Top Deposit, Reactivation, TG Engagement Tracker | Waiting | See docs/DECISIONS.md, Open. The other 13 modules are live (published by the team, 7 to 14 Oct). |
| 8 | Admin role check: the Senior who moved to Team A still has Admin (publishes, edits SOPs) | Done | ATL, 20 Oct: keep Admin for now. |
| 9 | More Learn modules and content (next SOP Book categories) | Waiting | ATL wants Learn to keep growing; pick the next category. |
