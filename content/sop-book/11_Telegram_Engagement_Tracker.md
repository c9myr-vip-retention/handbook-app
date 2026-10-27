# SOP: Telegram Engagement Tracker
**Document Code:** C9MYR-RTN-SOP-OUT03
**Category:** Outreach / Communication (All Shifts)
**Applies to:** VIP CS and RTN Leaders
**Owner:** ATL | **Review cycle:** Quarterly or on material change | **Version:** 1.1 (4-element retrofit 7 Sep 2026)
**Last updated:** 7 September 2026 (4-element retrofit; source: Official Handbook, Tracker v1.0, 28 May 2026)

---

```sop-header
Process name: Telegram Engagement Tracker
Department: VIP Retention
Process owner: ATL
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Add target churn players | RTN Leaders identify target churn players and add them to the Player List. | Refresh the P&L Table daily, or new players never enter the workflow and levels go stale. | Lark Base |  |
| 2 | Drag New to On Going | CS starts contact: drag the card from New to On Going Engagement. | All status changes via Kanban drag. No direct edits to the Score Table. | Lark Base (Kanban) |  |
| 3 | Drag to Follow Up | More nurturing needed: drag to Follow Up. | Each move fires an automation that writes to the Score Table. | Lark Base (Kanban) |  |
| 4 | Drag to Successful | Reactivated and deposits: drag to Successful. | Never delete records; use an archival status. | Lark Base (Kanban) |  |
| 5 | Read the Report Table | Review KPI from the Report Table only. | The Report Table is the only official KPI source. Escalate anomalies to the ATL; do not recalculate manually. | Lark Base |  |

## Flow chart

```chart
title: Telegram Engagement Tracker: Kanban flow
start: New
step: On Going Engagement
step: Follow Up
end: Successful
```
## 1. Objective
Record, score and report Telegram engagement with churned and at-risk VIP players, through an automated Lark Base workflow. Read alongside the Telegram Approach SOP: that covers how to engage, this covers how it is tracked.

## 2. Scope
Tracks previously unrecorded KPI components: engagement rate, follow-up rate, reactivated churn count, CS engagement performance, RTN team productivity. This SOP is the tracker specification; it has no per-step procedure of its own, the engagement steps live in the Telegram Approach SOP.

## 3. Golden Rules
- Never delete records. Use an archival status.
- All status changes via Kanban drag. No direct edits to the Score Table.
- The Report Table is the only official KPI source. If figures look wrong, escalate to the ATL; do not recalculate manually.
- Refresh the P&L Table daily, or new players never enter the workflow and levels go stale.

## 4. Roles
- **RTN Leaders (ATL / TL):** identify target churn players, add them to the Player List, monitor progress, review reports. Edit + config access.
- **CS:** conduct engagement, update player status by Kanban drag, record engagement quality. Edit access.

## 5. Status Flow (Kanban)
CS drags player cards across four columns. Each move fires an automation that writes to the Score Table.
`New` (default) -> `On Going Engagement` (CS starts contact) -> `Follow Up` (more nurturing needed) -> `Successful` (reactivated and deposits).

## 6. Engagement Quality Classification
The single source of truth for engagement quality across the Handbook.

| Level | Requirement |
|---|---|
| HIGH | at least 10 meaningful replies |
| MEDIUM | roughly 3 to 5 meaningful replies |
| LOW | one reply, an emoji, or nothing |

## 7. Player Level (auto from days since last deposit)
Used for KPI scoring. Separate from the Telegram Approach priority tiers (which decide who to approach first).

| Level | Inactivity | Difficulty weight |
|---|---|---|
| 0 | 1 day | none |
| 1 | 2 to 3 days | 1.0x |
| 2 | 4 to 7 days | 1.5x |
| 3 | 8 days and above | 2.0x |

## 8. KPI Formulas
```
Contact Rate     = (Total Engagement / VIP Base) x 15      max 0.15
Follow Up Rate   = (Total Follow Up / Total Engagement) x 10   max 0.10
Engagement Score = Contact Rate + Follow Up Rate           max 0.25
Total Follow Up  = Grand Total Engagement - Total Engagement
```
VIP Base = count of players with a Telegram link. Total Engagement = unique username/UID per PIC per brand.

## 9. Reactivation Measurement
Official reactivation counts use month-end P&L only. Real-time reactivation is not available; a successful engagement can happen before the official Reactivated flag appears. The Report Table is the final source.

## 10. Common Mistakes (Guards)
| Mistake | Impact | Severity |
|---|---|---|
| Contacted but status still New | engagement not recorded | High |
| Engaged repeatedly without status update | Follow Up KPI inaccurate | Medium |
| Wrong PIC assigned | score credited to the wrong person | High |
| Player deleted from workflow | historical record lost | Critical |

## 11. Remarks
- Never delete records; use an archival status.
- The Report Table is the only official KPI source. Escalate anomalies to the ATL, do not recalculate manually.
