# SOP: Top PNL
**Document Code:** C9MYR-RTN-SOP-N01
**Category:** Night Shift / Reporting + Compensation
**Applies to:** VIP CS, all brands
**Owner:** VIP RTN | **Review cycle:** Quarterly or on material change | **Version:** 1.2
**Last updated:** 4 October 2026 (V1.2: eligible / not eligible send split (SMS via Admin for eligible only); take the full top 10; tag Daily P&L Rewarded with amount and time; P&L counted as deposit minus withdraw, monthly on both platforms (replaces the Zyra last-7-day check); TC VVIP = Tier 3 and Tier V; confirmed by the ATL; previous: 4-element retrofit 7 Sep 2026; source: Official Handbook, 13 May 2026, and Tier 3 / V Engagement Strategy)

---

```sop-header
Process name: Top PNL
Department: VIP Retention
Process owner: VIP Retention
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Export the daily report | Night shift: export from 7:00 PM (TC: Report Mgmt > Player Analysis; Zyra: Betting Record Overview). | Wait for full data load before export. Do not export early. | TC / Zyra BO |  |
| 2 | Sort + filter to top 10 | Paste into CS SORTING FILE; filter to Tier 3 + Tier V (TC: Member Label VVIP); sort Total P&L A to Z; take the full top 10. | Biggest losses at top. | CS SORTING FILE |  |
| 3 | Run eligibility per player | Lost today and lost this month (deposit more than withdraw this month); today's reward not claimed; bonus <= SW x 40%. | All must pass. Monthly profitable = cannot issue, even on a daily loss. | Customer Approaching File | Engage from 8:00 PM after data is stable. |
| 4 | Issue the ladder bonus | Match the highest eligible tier; submit Lark ticket (query VVIP TOP P&L BONUS) with screenshot; tick Claimed. | Max = SW x 40%. Same-day SW update mandatory. | Lark Base |  |
| 5 | Send by eligibility, verify on claim | Eligible: pass the username list to Admin for SMS, send IM + Push. Not eligible: IM + Push only, no SMS, no bonus mention. On claim: verify on the list and the amount before processing. | Always separate bonus and non-bonus messages. | BO |  |
| 6 | Tag + QA | Tag Daily P&L Rewarded and record the amount and time; update the QA Record with BO screenshots. | Fully recorded | Lark Base |  |

## Flow chart

```chart
title: Top PNL V1.2: flow
start: 7PM export
step: Sort P&L A-Z
step: Top 10 by loss
check: Eligible? | yes: next | no: stop IM + Push only, no bonus mention
step: Issue + ticket
end: SMS (Admin) + IM/Push, tag + QA
```
## 1. Objective
Identify the top 10 highest-loss players from today's data and issue tiered Free Bonus compensation via the Daily P&L ladder, subject to the SW x 40% rule.

## 2. Scope
Night shift only, daily at 8:00 PM. Export and filter the namelist from 7:00 PM; start engagement at 8:00 PM after the data is relatively stable. Target the full top 10 Tier 3 and Tier V players by daily P&L.

## 3. Golden Rules
- Night shift only. Export and filter from 7:00 PM; engage from 8:00 PM after data is stable.
- SW x 40% is the absolute hard cap. Same-day SW update is mandatory before issuance.
- Monthly P&L must be negative. If the player is monthly profitable, the bonus cannot be issued (over-issuance exception).
- Daily P&L must be negative (player lost today).
- Sort Total P&L A to Z; highest-loss players sit at the top.
- P&L is counted as deposit minus withdraw. If the player deposited more than they withdrew, they are losing; if they withdrew more, they are profitable.
- SMS only for eligible players (sent by Retention Team Admin). Not eligible: IM + Push only, no bonus mention.

## 4. Eligibility Screening (all must pass)
| Check | Pass condition | Fail action |
|---|---|---|
| Daily P&L direction | Negative (player lost today) | Positive, SKIP |
| Today's reward | Not yet claimed | Already claimed, SKIP |
| Secret Wallet | Bonus <= SW x 40% | Over cap, cannot issue |
| Monthly P&L direction | Player lost this month (this month's deposit minus withdraw is above zero) | Monthly profitable, cannot issue |

## 5. Daily P&L Bonus Ladder
Rule: bonus <= SW x 40%. Same-day SW update mandatory. Claim via Lark ticket, query `VVIP TOP P&L BONUS`.

| Daily loss | Free Bonus | | Daily loss | Free Bonus |
|---|---|---|---|---|
| RM 1,000 | RM 18 | | RM 11,000 | RM 128 |
| RM 2,000 | RM 28 | | RM 12,000 | RM 138 |
| RM 3,000 | RM 38 | | RM 13,000 | RM 158 |
| RM 4,000 | RM 58 | | RM 14,000 | RM 168 |
| RM 5,000 | RM 68 | | RM 15,000 | RM 178 |
| RM 6,000 | RM 78 | | RM 16,000 | RM 188 |
| RM 7,000 | RM 88 | | RM 17,000 | RM 198 |
| RM 8,000 | RM 98 | | RM 18,000 | RM 208 |
| RM 9,000 | RM 108 | | RM 19,000 | RM 218 |
| RM 10,000 | RM 118 | | RM 20,000 | RM 228 |
| | | | >= RM 21,000 | RM 288 (cap) |

## 6. Detailed steps: TC Gaming Platform
| # | Action | Sequence (when) | Degree / standard | Tool |
|---|---|---|---|---|
| 1 | Go to Report Management > Player Analysis | Task start | Correct BO path | TC Gaming BO |
| 2 | Select today's date, confirm it displays | After opening | Today's date only | TC Gaming BO |
| 3 | Search and wait for data to fully load | Before export | Do not export early | TC Gaming BO |
| 4 | Export the Excel report | After full load | Save to the designated folder | TC Gaming BO |
| 5 | Open CS SORTING FILE, paste into the correct brand sheet | After export | Correct brand sheet | CS SORTING FILE |
| 6 | Under Member Label, filter to VVIP only | After paste | Remove non-VVIP | CS SORTING FILE |
| 7 | Sort Total P&L A to Z (lowest first) | After filtering | Biggest losses at top | CS SORTING FILE |
| 8 | Copy the first 10 usernames | After sort | Top 10 priority | CS SORTING FILE |
| 9 | Paste into Customer Approaching File > Top 10 P&L (Night), correct brand | After copy | Correct brand column | Customer Approaching File |
| 10 | Run the Section 4 eligibility checks per player | Before issuance | Skip any that fail | Customer Approaching File |
| 11 | Check SW x 40%, match the highest eligible ladder tier | Before issuance | Max = SW x 40% | BO, bonus ladder |
| 12 | Submit Lark ticket (query `VVIP TOP P&L BONUS`) with conversation screenshot, username, bonus amount | On issuance | Complete all ticket fields | Lark Base |
| 13 | Tick Claimed after submitting | After ticket | Mark status | Lark Base |
| 14 | Eligible: Admin sends SMS, you send IM + Push. Not eligible: IM + Push only, no bonus mention | After claim | Double-check content | BO |
| 15 | On claim: verify on list, verify amount, process | On player claim | Verify before processing | BO |
| 16 | Update the QA Record | After recording and issuance | Attach BO screenshots | Lark Base |

## 7. Detailed steps: Zyra Platform
| # | Action | Sequence (when) | Degree / standard | Tool |
|---|---|---|---|---|
| 1 | Go to Betting Record > User Betting Record Overview | Task start | Correct BO path | Zyra BO |
| 2 | Report Date: Today; Export Daily Data | After opening | Save to the folder | Zyra BO |
| 3 | Open CS SORTING FILE, paste into the correct brand tab | After export | Correct brand tab | CS SORTING FILE |
| 4 | Sort Total P&L A to Z | After paste | Biggest losses at top | CS SORTING FILE |
| 5 | Open Customer Approaching File > Top 10 P&L (Night) | After sort | Correct section | Customer Approaching File |
| 6 | Filter to Tier 3 and Tier V only | After opening | Remove other tiers | Customer Approaching File |
| 7 | Copy and paste the top 10 qualifying players | After filtering | Top 10 only | Customer Approaching File |
| 8 | Run the eligibility checks per player | Before issuance | Skip any that fail | Customer Approaching File |
| 9 | Check SW x 40%; check this month's P&L: User Betting Record > Search UID > this month > Deposit minus Withdraw | Before issuance | Proceed only if the player lost this month (deposit minus withdraw above zero) | Zyra BO |
| 10 | Match the highest eligible ladder tier | Before issuance | Max = SW x 40% | Bonus ladder |
| 11 | Submit Lark ticket (query `VVIP TOP P&L BONUS`) with conversation screenshot, UID, bonus amount | On issuance | Complete all ticket fields | Lark Base |
| 12 | Tick Claimed | After ticket | Mark status | Lark Base |
| 13 | Eligible: Admin sends SMS, you send IM + Push. Not eligible: IM + Push only, no bonus mention | After claim | Double-check content | Zyra BO |
| 14 | On claim: verify on list, verify amount, process | On player claim | Verify before processing | Zyra BO |
| 15 | Update the QA Record | After recording and issuance | Attach BO screenshots | Lark Base |

## 8. Guards
- SW x 40% is the absolute hard cap; a bonus above it cannot be issued.
- If monthly P&L is profitable, the bonus cannot be issued, even on a daily loss.
- Do not export before the data has fully loaded.

## 9. Remarks
- Night shift only.
- TC: filter to VVIP (= Tier 3 and Tier V) before sorting. Zyra: filter to Tier 3 and Tier V.
- Always check monthly P&L direction before issuing.
