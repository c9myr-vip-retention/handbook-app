# SOP: ROI Table
**Document Code:** C9MYR-RTN-SOP-R03
**Category:** Reporting
**Applies to:** VIP CS, assigned brands
**Owner:** VIP RTN | **Review cycle:** Quarterly or on material change | **Version:** 1.1 (4-element retrofit 7 Sep 2026)
**Last updated:** 7 September 2026 (4-element retrofit; source: Official Handbook, 13 May 2026)

---

```sop-header
Process name: ROI Table
Department: VIP Retention
Process owner: VIP Retention
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Filter the ROI Table | Customer Approaching File > ROI Table; filter Brand is your brand(s) AND Bonus Amount is not empty. | Removes players who have not claimed. | Customer Approaching File |  |
| 2 | Confirm the claim date | Per player: confirm the claim date in the ROI Table before setting any BO range. | The claim date is excluded from both windows. | Customer Approaching File |  |
| 3 | Read the before-window | claim minus 3 to claim minus 1: record approved DP into 3D Before DP, withdrawals into 3D Before WD. | TC: approved deposits only, DP/WD on separate tabs, use username. Zyra: same overview, use UID. | TC / Zyra BO |  |
| 4 | Read the after-window | claim plus 1 to claim plus 3: record DP into 3D After DP, WD into 3D After WD. | Complete all four columns for one player before the next. | TC / Zyra BO |  |
| 5 | Record 0 for empty ranges | If a player has no DP/WD in a range, record 0. | Do not leave it blank. | Customer Approaching File |  |
| 6 | Repeat for every player | Until the list is clear. |  | Customer Approaching File |  |

## Flow chart

```chart
title: ROI Table: flow
start: ROI Table
step: Filter brand + bonus
step: Confirm claim date
step: Before-window DP/WD
step: After-window DP/WD
end: Next player
```
## 1. Objective
Track deposit and withdrawal amounts for bonus-claiming players across a 3-day window before and after the bonus claim date, to measure ROI per outreach campaign.

## 2. Scope
Applies to every player who claimed a bonus in the current month, on both TC and Zyra.

## 3. Golden Rules
- The claim date is excluded from both windows. Before = claim minus 3 to claim minus 1. After = claim plus 1 to claim plus 3.
- TC: approved deposits only (exclude pending/rejected); DP and WD are on separate tabs. Zyra: DP and WD are in the same overview.
- If a player has no DP/WD in a range, record 0. Do not leave it blank.
- Complete all four columns for one player before moving to the next.
- TC uses username; Zyra uses UID.

## 4. The Four Tracked Columns
The claim date itself is never included in either window. Before = up to claim minus 1. After = from claim plus 1.

| Column | Measures | Range (claim 3 May example) |
|---|---|---|
| 3D Before DP | Approved deposits, 3 days before | 30 Apr to 2 May |
| 3D Before WD | Withdrawals, 3 days before | 30 Apr to 2 May |
| 3D After DP | Approved deposits, 3 days after | 4 May to 6 May |
| 3D After WD | Withdrawals, 3 days after | 4 May to 6 May |
> Confirmed 10 Sep 2026: the window is 3 days each side. Before = claim minus 3 to claim minus 1; After = claim plus 1 to claim plus 3. The 2-day reading in an earlier source example was wrong.

## 5. Detailed steps: Filter the ROI Table
| # | Action | Sequence (when) | Degree / standard | Tool |
|---|---|---|---|---|
| 1 | Open Customer Approaching File > ROI Table | Task start | All players who claimed a bonus this month | Customer Approaching File |
| 2 | Apply two conditions | Before selecting players | Both active | Customer Approaching File |
| 2a | Brand is your group's brand(s) | With step 2 | e.g. LPK for LPK777 | Customer Approaching File |
| 2b | Bonus Amount is not empty | With step 2 | Removes players who have not claimed | Customer Approaching File |
| 3 | Identify the four columns to fill | After filtering | 3D Before DP, 3D Before WD, 3D After DP, 3D After WD | Customer Approaching File |
| 4 | Copy the username of each player with any empty tracked column | After identifying | Those need BO lookup | Customer Approaching File |

## 6. Detailed steps: TC Gaming Retrieval
| # | Action | Sequence (when) | Degree / standard | Tool |
|---|---|---|---|---|
| 1 | Customer Search, paste the username | Per player | One player at a time, exact match | TC Gaming BO |
| 2 | Open the profile, go to Deposit Record | After search | Correct player | TC Gaming BO |
| 3 | Confirm the claim date in the ROI Table | Before setting ranges | Match the ROI Table | Customer Approaching File |
| 4 | Set the deposit date range to 3 days before claim | After confirming date | claim minus 3 to claim minus 1 | TC Gaming BO |
| 5 | Record total approved deposits into 3D Before DP | After range set | Approved only, exclude pending/rejected | Customer Approaching File |
| 6 | Go to Withdrawal Record | After DP recorded | Correct tab | TC Gaming BO |
| 7 | Same before-range, record total withdrawals into 3D Before WD | After opening WD | Same range | Customer Approaching File |
| 8 | Set the range to 3 days after claim | After before-window done | claim plus 1 to claim plus 3 | TC Gaming BO |
| 9 | Record total approved deposits into 3D After DP | After range set | Approved only | Customer Approaching File |
| 10 | Same after-range, record total withdrawals into 3D After WD | After DP recorded | Same range | Customer Approaching File |
| 11 | Repeat for every player | Until list clear | Complete all four columns per player before moving on | Customer Approaching File |

## 7. Detailed steps: Zyra Retrieval
| # | Action | Sequence (when) | Degree / standard | Tool |
|---|---|---|---|---|
| 1 | Betting Record > User Betting Record Overview | Per player | Correct BO path | Zyra BO |
| 2 | Paste the UID (not username) | After opening | Verify it matches the ROI Table | Zyra BO |
| 3 | Confirm the claim date in the ROI Table | Before setting ranges | Match the ROI Table | Customer Approaching File |
| 4 | Set range to 3 days before claim, Search | After confirming date | claim minus 3 to claim minus 1 | Zyra BO |
| 5 | Read Deposit and Withdrawal from the same overview | After search | No tab navigation needed | Zyra BO |
| 6 | Record Deposit into 3D Before DP, Withdrawal into 3D Before WD | After reading | Correct columns | Customer Approaching File |
| 7 | Change range to 3 days after claim, Search | After before-window done | claim plus 1 to claim plus 3 | Zyra BO |
| 8 | Record Deposit into 3D After DP, Withdrawal into 3D After WD | After search | Correct columns | Customer Approaching File |
| 9 | Repeat for every player | Until list clear | All four columns per player | Customer Approaching File |

## 8. Guards
- Always confirm the claim date in the ROI Table before setting any BO date range.
- If a player has no DP/WD in a range, record 0. Do not leave blank.
- Complete all four columns for one player before the next, to avoid cross-referencing errors.

## 9. Remarks
- TC: DP and WD are on separate tabs, approved amounts only. Zyra: both are in the same overview.
- The claim date is excluded from both windows.
