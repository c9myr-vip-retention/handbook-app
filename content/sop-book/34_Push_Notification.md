# SOP: Push Notification (General)
**Document Code:** C9MYR-RTN-SOP-A04
**Category:** Outreach / Communication
**Applies to:** All VIP CS; ATL/TL for content and cadence sign-off
**Owner:** VIP RTN | **Review cycle:** Quarterly or on material change | **Version:** 1.1
**Last updated:** 26 September 2026 (push sending now runs on automation, this SOP is the Fire Drill fallback; ad-hoc push default approver set to ATL or above, still unconfirmed; previous: 7 September 2026; source: Risk Push SOP + content-and-channels rules)

---

```sop-header
Process name: Push Notification (General)
Department: VIP Retention
Process owner: VIP Retention
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Confirm approval + copy | Before build: subject and content from the approved Template Tab or campaign set; ATL (or above) approval for any new or edited copy. | No ad-hoc copy without ATL (or above) approval. | Template Tab, Lark approval | ATL (or above) is the working default, not yet confirmed by the Supervisor. See the Open item at the end. |
| 2 | Build recipient list | After approval: correct brand tab; target segment only (tier / DSLD / campaign list). | RG and chase-flagged excluded. Segment only, no blanket send. | Team Engagement File, BO | RG / chase flag beats every push, route to welfare. |
| 3 | Export in platform format | Before upload: TC .txt, Zyra .csv; verify the format before leaving the file. | Wrong file format fails the upload. Verify every time. | Team Engagement File / Zyra BO |  |
| 4 | Open the push tool | Follow the exact entry path in the platform mechanics table for that platform. | TC: Interact Mgmt > Mail > Push > Send > Specific User > Firebase. Zyra: Notification > Push > Add. | TC BO / Zyra BO |  |
| 5 | Upload, input, send | Upload the file; paste approved subject + content per language slot; TC click OK, Zyra click Create. | EN/BM/CN where the push requires it. Approved copy only. | TC BO / Zyra BO |  |
| 6 | Log the send | Immediately after: QA Record with brand, segment, push type, recipient count, time; attach BO screenshot. | No screenshot, no proof of send. Never fabricate a send. | QA Record, Lark Base | Empty list: record it and inform the ATL. |

## Flow chart

```chart
title: Push Notification: flow
start: Push approved
check: RG / chase flag? | yes: stop Welfare, no push | no: next
step: Build list (segment)
step: Export .txt / .csv
step: Open push tool
step: Upload + send
end: Logged / done
```
## 1. Objective
Give one reusable procedure for sending any Push Notification (risk, campaign, event or informational), so every push is correctly targeted, correctly formatted per platform, approved, and logged. Risk Push, Weekend Campaign and Special Event all point here for the send mechanics.

## 2. Scope
Every push a VIP CS sends on TC or Zyra. This SOP owns the send mechanics, format and logging only. The trigger, list-building and messaging strategy stay with the calling SOP (Risk Push, Special Event, Weekend Campaign). Informational and offer pushes both covered.

**Fire Drill (manual fallback).** Pushes are sent by automation day to day (confirmed by the ATL, 26 Sep 2026). Run this manual procedure only when the automation is down or being verified.

## 3. Golden Rules
- **RG / chase flag beats every push.** Flagged players route to welfare; no push at all.
- Subject and content come from the approved Template Tab or the campaign's signed-off set. No ad-hoc copy without ATL (or above) approval.
- **Correct file format per platform: TC = .txt, Zyra = .csv.** Wrong format fails the upload.
- Any offer carried in a push states its validity; a push never over-promises.
- Log every send in the QA Record with a BO screenshot. No screenshot, no proof of send.

## 4. Platform Mechanics
| Platform | Entry path | File format | Target |
|---|---|---|---|
| TC Gaming | Interact Management > Mail > Push Notification > Send Notification > Specific User > Firebase App Messaging | `.txt` | Upload the user file |
| Zyra | Notification > Push Notification > Add Push Notification | `.csv` (export from BO) | Target Type: User |

## 5. Guards
- Wrong file format fails on upload; verify TC `.txt` / Zyra `.csv` every time.
- RG / chase flag: no push, route to welfare.
- Empty list: record it in the QA Record and inform the ATL. Never fabricate a send.
- No unapproved copy; Template Tab edits need ATL (or above) approval first.

## 6. Remarks
- **Cadence cap UNCONFIRMED.** The maximum pushes per player per day/week is not documented. Confirm with the ATL and lock it here to prevent push fatigue.
- **Approval authority for ad-hoc / non-template pushes UNCONFIRMED.** Working default: ATL or above signs off (set by the ATL, 26 Sep 2026). Not yet confirmed by the Supervisor.
- Campaign pushes use 3 slots x EN/BM/CN (JK32 ran 294 variants; the reference campaign carried 54 push pieces). Confirm whether informational pushes must also localise across all three languages.
