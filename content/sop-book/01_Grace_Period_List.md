# SOP: Grace Period List
**Document Code:** C9MYR-RTN-SOP-D01
**Category:** Day Shift / VIP
**Applies to:** VIP CS, all brands
**Owner:** VIP RTN | **Review cycle:** Quarterly or on material change | **Version:** 1.2
**Last updated:** 3 October 2026 (V1.2: Potential Player uses the projected monthly deposit; valid / invalid defined by the Lark Base formula; contact step-down after target and the missing-list rule added; confirmed by the ATL; previous: 4-element retrofit 7 Sep 2026; source: Official Handbook, 13 May 2026, and Tier 3 / V Engagement Strategy)

---

```sop-header
Process name: Grace Period List (daily send)
Department: VIP Retention
Process owner: PIC: ATL / 2IC: Senior
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Receive the database | On a send day (Mon/Tue/Thu/Fri), open Team Engagement File > Handover Tab and take today’s Grace Period database from Retention Admin. | Correct send day; database is today’s, from the Handover Tab | Team Engagement File | No send Wed/Sat/Sun. Empty list: log in QA, tell the ATL |
| 2 | Paste into Lark Base | Copy the database and paste-values into Customer Approaching Lark Base > Grace Period (Day). | Pasted as values only; formulas intact | Lark Base | A normal paste breaks the formulas |
| 3 | Filter valid vs invalid | Split Grace Period Players (missed last month's threshold) from Potential Players (projected monthly deposit at or above the threshold), by brand and status; read Valid / Invalid from the formula column. | Every player classified; none left unclassified | Lark Base | Wrong status sends the wrong message |
| 4 | Move to the Engagement Tab | Move each filtered player under the correct brand column in the Engagement Tab, Grace Period column. | Each player under the correct brand column | Lark Base | Brand mismatch corrupts reporting |
| 5 | Send to valid players | Hand the valid username list to Retention Admin for SMS, then send IM + Push to the same players. | Valid list handed over; IM + Push sent to all valid | Lark / BO | VIP CS does not send the SMS; Admin does |
| 6 | Send to invalid players | Send IM + Push only to invalid players. | IM + Push sent; no SMS, no bonus mention | Lark / BO | No bonus mention to invalids; engagement only |
| 7 | Update the QA Record | After all IM is sent, record the task and attach a BO screenshot. | QA entry saved with a BO screenshot | Lark Base | No screenshot means no proof of send |

## Flow chart

```chart
title: Grace Period List: daily flow
start: Grace send day
step: Receive database
step: Paste to Lark Base
step: Filter by status
check: Valid player? | yes: step SMS (Admin) + IM + Push | no: step IM + Push only, no bonus
step: Update QA Record
end: Done
```
## 1. Objective
Filter eligible Grace Period players and send targeted Internal Mail to drive re-engagement before the grace period expires.

## 2. Scope
Applies to the daily Grace Period send on Monday, Tuesday, Thursday and Friday, across all brands. Monday and Tuesday are primary sends; Thursday and Friday are follow-ups.

## 3. Golden Rules
- Match the send to the scheduled day: Mon/Tue primary, Thu/Fri follow-up. No Grace send on Wed/Sat/Sun.
- SMS is sent by Retention Team Admin, not VIP CS. VIP CS prepares the list only.
- Invalid players get IM + Push only. No SMS, no bonus mention.
- A Grace bonus is issued only when SW x 20% reaches the minimum eligible tier, and SW is updated the same day before issuance.
- Verify player status before sending; skip anyone who already deposited or changed tier.
- Valid / Invalid comes from the Lark Base formula (Section 5). Only valid players get the SMS and the bonus offer.

## 4. Sending Schedule
| Day | Action | Send Type | Notes |
|---|---|---|---|
| Monday | Send Grace Period Player IM | Primary Send, List A | Grace Period Players (have NOT achieved monthly threshold). Pass eligible list to Admin for SMS. |
| Tuesday | Send Potential Player IM | Primary Send, List B | Potential Players (have achieved or exceeded monthly threshold). Pass eligible list to Admin for SMS. |
| Wednesday | No Grace Period IM required | - | Rest day for this task |
| Thursday | Follow-Up, Monday List (List A) | Follow-Up Send | Follow up on Monday's list. Target: non-responders and non-converts. |
| Friday | Follow-Up, Tuesday List (List B) | Follow-Up Send | Follow up on Tuesday's list. Target: non-responders and non-converts. |
| Saturday | No Grace Period IM required | - | Rest day for this task |
| Sunday | No Grace Period IM required | - | Rest day for this task |

## 5. Eligibility: Valid vs Invalid
| Status | Definition | Action |
|---|---|---|
| **Grace Period Player** (Mon + Thu) | Did NOT reach the tier's monthly deposit threshold last month; worked through the current month (the second-month chance). | IM + Push. Pass eligible list to Admin for SMS. Goal: activate deposit. |
| **Potential Player** (Tue + Fri) | Projected monthly deposit is at or above the threshold (forecast, see below). Filtered every weekend into the Handover File Tuesday column. | IM + Push. Pass eligible list to Admin for SMS. Goal: maintain engagement and loyalty. |

**Projected monthly deposit** = current monthly deposit / data updated days x 30. Use yesterday's completed data. Example: today is the 18th, data runs to the 17th: RM 45,630 / 17 x 30 = RM 80,523.53.

**Valid vs Invalid (Lark Base formula):** `IF(AND(Highest amount of BONUS > 0, (20% of SW - Highest amount of BONUS) >= 0), "Valid", "Invalid")`. Valid means SW x 20% covers at least the lowest bonus on the tier ladder (Tier 3 RM 18, Tier V RM 68). Invalid players get IM + Push only.

**Monthly deposit threshold:** the monthly deposit a player needs to keep their tier. It is set by the VIP threshold mechanism and can move; read it from the list, never guess it.

## 6. Bonus Logic: Grace Period Deposit Challenge
**Activation rule:** a bonus may only be issued when 20% of the customer's Secret Wallet (SW x 20%) reaches the minimum eligible threshold. Match that figure to the highest eligible tier. SW must be updated the same day before issuance.

| Tier | Deposit | Free Bonus | SW Cap |
|---|---|---|---|
| T3 | RM 100 | RM 18 | SW x 20% |
| T3 | RM 200 | RM 28 | SW x 20% |
| T3 | RM 300 | RM 38 | SW x 20% |
| T3 | RM 500 | RM 58 | SW x 20% (T3 cap) |
| TV | RM 600 | RM 68 | SW x 20% |
| TV | RM 700 | RM 78 | SW x 20% |
| TV | RM 800 | RM 88 | SW x 20% |
| TV | RM 900 | RM 98 | SW x 20% |
| TV | RM 1,000 | RM 108 | SW x 20% (TV cap) |
Withdrawable after 1x turnover. Offer applies to next-day deposits only, has a validity period, and starts when the customer confirms. Tag `Grace Active` when engaged, `Grace Converted` when deposited and claimed. Claim via Lark ticket, query `VVIP Grace Period`.

## 7. Guards
- Empty list on a scheduled day: record it in the QA Record and inform the ATL. Never skip silently.
- Never issue a Grace bonus above the SW x 20% cap.
- Do not send to players who already deposited or whose tier changed.
- If last month's Grace list is missing, run the current month's Grace mechanism (all Tier 3 and Tier V players below the threshold, one engagement broadcast) until last month's list arrives.

## 8. Remarks
- Eligible (Valid) enters segmentation and can claim the Deposit Challenge; Invalid gets IM + Push only.
- SW must be refreshed the same day before any sizing; a stale SW is not a valid base.
- After a player meets the target, reduce contact step by step: week 1 normal follow-up, week 2 less proactive contact, week 3 light interaction only, month end stop all Grace contact. The exact pace can follow each team's strategy; the default is to reduce when the player is active.
- Tier V uses the RM 600 to RM 1,000 rows of the ladder.
