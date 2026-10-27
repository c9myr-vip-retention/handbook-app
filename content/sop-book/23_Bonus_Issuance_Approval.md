# SOP: Bonus Issuance & Approval
**Document Code:** C9MYR-RTN-SOP-BON01
**Category:** Bonus / Money Control
**Applies to:** All VIP CS; ATL for the approval gate
**Owner:** VIP RTN / ATL | **Review cycle:** Quarterly or on material change | **Version:** 1.2
**Last updated:** 3 October 2026 (V1.2: Livechat Compensation added (SW x 40%, ATL approval on every case); Birthday and Weekend ticket queries confirmed; Birthday ATL gate is lifetime Total Deposit; confirmed by the ATL; previous: V1.1 Birthday deposit-base floor confirmed 24 Sep 2026; source: bonus ladders + Birthday Bonus doc)

---

```sop-header
Process name: Bonus Issuance and Approval
Department: VIP Retention
Process owner: PIC: ATL / 2IC: Senior
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Verify eligibility | Confirm the player is on the eligible list and a logged contact precedes the (re)deposit within the task window. Unique ID; one count per player per month. | On the eligible list; contact before deposit; unique ID | Eligible list; contact_log; BO | No contact before deposit means no credit |
| 2 | Identify the task and ladder | Identify the task (Grace, LTV, Top P&L, Birthday, Weekend, Compensation) and its ladder. Confirm no same-day Reload, Compensation or LTV reward. | Exactly one task; no stacking | Bonus ladders | No stacking; skip if a same-day reward went out |
| 3 | Update the Secret Wallet | Refresh the SW figure today before any sizing. | SW refreshed today | BO; SW field | A stale SW is not a valid base |
| 4 | Size against the SW cap | Match the highest eligible 8-ending amount at or below the task SW cap (see table); above Max use Max. | Final at or below the cap; ends in 8 | Ladder; bonus calculator | Never exceed the task cap |
| 5 | Check the approval gate | If it crosses a threshold (see Approval authority; every Livechat Compensation goes to the ATL), route to ATL; otherwise CS issues within the cap. | Over-gate cases ATL-approved first | Lark; ATL | CS cannot self-issue an over-gate case |
| 6 | Issue and set turnover | Issue the sized credit; apply the task turnover (1x, or Birthday deposit-base 3x); state validity; apply the next-day rule where required. | Correct TO; validity stated | BO; claim ticket | Turnover must match the task |
| 7 | Record the issuance | Log player, task, amount, TO, SW deduction (y/n), issued by, time; tag status; claim via the task ticket query. | Fully recorded; claim ticket filed | QA Record; Lark ticket | No record means an unverifiable issuance |

## Flow chart

```chart
title: Bonus Issuance and Approval: flow
start: Bonus to issue
step: Verify eligibility + contact first
step: Update SW (same day)
step: Size within SW cap
check: Over approval gate? | yes: step ATL reviews and approves | no: step CS issues within cap
step: Issue credit, set TO
step: Record + claim ticket
end: Done
```
## 1. Objective
Give one controlled path for issuing any VIP bonus, so every credit is eligible, correctly sized against the Secret Wallet (SW) cap, approved at the right level, and recorded. This closes the over-issuance gap left by rules living in separate SOPs.

## 2. Scope
Applies to every bonus a VIP CS can issue: Grace Period Deposit Challenge, LTV, Top P&L, Birthday, Weekend Campaign, and Livechat Compensation. It governs sizing and approval only; each task's own SOP still owns its trigger and list-building.

## 3. Golden Rules (every bonus, no exceptions)
- **Contact precedes deposit.** No retention/reactivation credit without a logged contact before the (re)deposit.
- **SW updated same day** before sizing. A stale SW is not a valid base.
- **Size within the SW cap** for that task (see Section 4).
- **1x turnover** before withdrawal, unless the task states otherwise (Birthday deposit-base = 3x).
- **No stacking.** One bonus per event; skip if a same-day Reload / Compensation / LTV reward already went out.
- **State validity** every time.
- **Telegram never promises, implies or hints at a bonus.**

## 4. SW Cap by Task
| Task | SW cap | Turnover |
|---|---|---|
| Grace Period Deposit Challenge | SW x 20% | 1x |
| Birthday Bonus (Tier 3) | SW x 25% | 1x (SW base) |
| Birthday Bonus (Tier V) | SW x 30% | 1x (SW base) |
| LTV List | SW x 40% | 1x |
| Top P&L | SW x 40% | 1x |
| Livechat Compensation | SW x 40% (last-week P&L ladder) | 1x |

## 5. Approval Authority
| Situation | Who issues / approves |
|---|---|
| Within the SW cap, standard ladder | VIP CS issues directly |
| Birthday Bonus, lifetime Total Deposit >= RM 100,000 | ATL reviews value, claim history, risk tag and final amount; tags `Birthday Credit - ATL Reviewed` |
| Weekend Deposit Challenge (under testing) | ATL or TL sign-off before any issuance |
| Livechat Compensation, every case | ATL approves before issuance |
| Confirmed system fault (e.g. S0403) or any exception | ATL |

## 6. Claim Ticket Queries
| Task | Ticket query |
|---|---|
| Grace Period | `VVIP Grace Period` |
| LTV | `VVIP LTV 70 BONUS` |
| Top P&L | `VVIP TOP P&L BONUS` |
| Birthday | `Birthday bonus`; also mark Birthday Credit Rewarded |
| Weekend Campaign (Ang Bao, Redeem Code) | `Special Reload Bonus` |
| Livechat Compensation | `VVIP Complain player` |

## 7. Over-Issuance Guards
- **Top P&L:** monthly P&L must also be negative. A player who lost today but is profitable this month gets nothing.
- **Birthday, deposit base:** never below the Floor (Tier 3 RM 38, Tier V RM 68) and never above the Max (RM 188 / RM 388). Above the Floor, never exceed the calculated amount. Confirmed by the ATL on 24 Sep 2026.
- **Compensation:** last-week P&L must be negative; one compensation per player per week.
- **No stacking** and **no same-day double reward.**
- **Contact precedes deposit** for every retention/reactivation credit.

## 8. Remarks
- This SOP sizes and approves; each task SOP owns its trigger, list and messaging.
- Anything marked "confirm" or "pending" here is not settled; do not treat it as fact until the ATL confirms.
