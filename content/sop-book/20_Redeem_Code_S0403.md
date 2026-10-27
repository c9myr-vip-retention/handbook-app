# SOP: Redeem Code Shows "Expired" or "Invalid" Error (S0403)
**Document Code:** C9MYR-RTN-SOP-002
**Category:** Technical / Account Support
**Applies to:** All VIP CS
**Owner:** VIP RTN; ATL for confirmed faults | **Review cycle:** Quarterly or on material change | **Version:** 1.1 (4-element retrofit 7 Sep 2026)
**Last updated:** 7 September 2026 (4-element retrofit; source: Implemented SOP Compilation, 3 Sep 2026)

---

```sop-header
Process name: Redeem Code S0403 Error
Department: VIP Retention
Process owner: VIP Retention; ATL for confirmed faults
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Check the Redeem Code File | Task start: open it in the Customer Approaching File, search the member Username or UID. | Locate the record before anything else. | Customer Approaching File |  |
| 2 | Verify customer information | After locating the record: UID correct, correct customer account, correct brand. | All three must match. | Customer Approaching File / BO |  |
| 3 | Verify the redeem code | After customer info: the code the customer entered matches the code assigned in the system. | Do not conclude expiry from the error alone. | Customer Approaching File |  |
| 4 | Check the Status field | After code check: Claimed means already claimed; Expired means check whether it has actually expired. | Read the status, do not assume. | Customer Approaching File |  |
| 5 | Check in BO | Before any escalation: Event > Redeem Code > Redeem Code Payout; enter the code. | Status "approved" means the member already claimed it. | BO |  |
| 6 | Escalate only if all 4 criteria | After all checks: escalate to ATL only when eligible + correct code + not claimed + system still shows S0403. | ATL step is for confirmed faults only. Use the escalation template. | Lark to ATL | Most cases resolve at the CS step. |

## Flow chart

```chart
title: Redeem Code S0403: verify then escalate
start: S0403 error
step: Check redeem file
step: Verify customer
step: Verify code
step: Check status
step: Check BO
check: All 4 criteria? | yes: next | no: finish Resolved at CS
escalate: Escalate to ATL
```
## 1. Objective
Standardise the verification sequence before a redeem code fault is escalated, so that only genuine system faults reach the Assistant Team Leader.

## 2. Scope
Applies when a player confirmed to be on the eligible list cannot redeem their assigned code and gets an "Expired" or "Invalid" (S0403) response.

## 3. Golden Rules
- Complete all verification steps before escalating. The ATL step is for confirmed faults only.
- Do not conclude a code is expired from the error alone; verify eligibility, the assigned code, status and claim first.
- Escalate only when all four escalation criteria are confirmed.

## 4. Escalation Criteria
Escalate to the ATL only when ALL of these are confirmed:
- Customer is eligible
- Correct redeem code
- Code is not claimed
- System still shows S0403 / Invalid or Expired

## 5. Escalation Template
Provide all of the following to the ATL:
```
UID: [uid]
Brand: [brand]
Redeem Code: [code entered]
Error: Invalid or Expired
Code assigned in system: [assigned code]
Issue: Customer is eligible and entered the assigned code, but the system
still returns an Invalid/Expired (S0403) error. Please assist to verify.
```

## 6. Expected Outcome
Most cases resolve at the CS step (wrong code, not eligible, or already claimed). Only a genuine S0403 fault, with everything else confirmed correct, reaches the ATL.

## 7. Guards
- Complete all five verification steps before escalating.
- Do not escalate on the error message alone; confirm eligibility, assigned code, status and claim first.

## 8. Remarks
- The ATL step is for confirmed faults only.
- Most S0403 reports resolve at the CS verification step.
