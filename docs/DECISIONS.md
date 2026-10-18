# Settled decisions

ATL decisions that every change must respect. Add new ones at the end of the right section with the date. Content rules live in CONTENT.md and design rules in DESIGN.md; this file holds the rest.

## Product
- The app is the master copy of SOPs. Admins edit in the in-app editor; every save is snapshotted (History, Restore). `npm run sync` never overwrites an app-edited page. (28 Sep 2026)
- The SOP Book stays the official, unchanged reference. Training lives in Learn: short guides plus a quiz per SOP, each tied to one SOP version. When the SOP version changes, the guide shows "under review" and its quiz pauses. (30 Sep 2026)
- Culture & Conduct is a parent page with sub pages: The 5 Pillars, Company Doctrine, Redlines, SUCCESS. Each sub page uses the slide shape (CONTENT.md section 7). (5 Oct 2026)
- Present mode on every page: slide 1 = title and intro, then one slide per section. Answers show straight away; no click-to-reveal. (5 Oct 2026)

## Learn and Quiz
- Learn is open to staff (`LEARN_FOR_STAFF = "yes"`). Modules are reviewed by the team and published by an admin pressing Publish. An agent never publishes. (6 Oct 2026)
- Quiz answer keys are stored as the option sentence, never a letter. A/B/C/D are position labels only, reshuffled per attempt. (4 Oct 2026)
- Quiz rules: one clock per attempt, questions open in order (written reason needs 3+ words), every attempt recorded, unlimited attempts, staff never see keys or bands. (5 Oct 2026)
- Green/red feedback is a per-quiz switch, off for assessments. Assessments shuffle question order inside each section (`shuffle: "section"`). (5 Oct 2026)
- Sections show as "Section A", "Section B" only on the Quiz page. (6 Oct 2026)

## Access and roles
- Roles: reader < admin < master. Master (ATL) only: change roles, delete people, restricted pages. Admins: edit SOPs, publish Learn, Team scores, sign-in approvals, nicknames; they cannot touch a master account. (4 Oct 2026)
- Company emails are approved automatically; personal emails wait in Access Management.

## SOP versions
- Always flag when an SOP change is structural enough for a major version (steps added or removed, a rule reversed, a new approval gate, the sizing method replaced, scope changed). The ATL decides. (4 Oct 2026)
- Every SOP change in the app also gets a new version tab in the Lark SOP sheet, with a matching flow chart picture. The ATL swaps pictures in Lark. (3 Oct 2026)
- Lark chart pictures are horizontal by default, top-down only when wider than about 5:1, cropped tight, version in the title. Render from `src/Chart.jsx`, never a screenshot. (4 Oct 2026)

## Open (not settled, never treat as fact)
- Top Deposit bonus exception: who approves it.
- Reactivation and Win-back vs Risk Push at 7+ idle days: which rule wins; idle-days weighting.
- TG Engagement Tracker: quality level for exactly 2 replies and for 6 to 9.
- Compensation V1.1 may need renumbering to V2.0.
