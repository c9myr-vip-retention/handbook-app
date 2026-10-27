# SOP: App-First Link Recovery
**Document Code:** Not yet assigned
**Category:** Service / Exceptions (Chat SOP)
**Applies to:** All PIC, Team B brands, LiveChat and Telegram
**Owner:** ATL | **Review cycle:** Quarterly or on material change | **Version:** 1.0
**Last updated:** 26 September 2026 (imported into the Handbook App from the Lark doc "SOP: App-First Link Recovery", v1.0, 15 Aug 2026; source: Telegram handling, 14 Aug 2026)

---

```sop-header
Process name: App-First Link Recovery
Department: VIP Retention
Process owner: ATL
Effective date: 
Approved by: 
```

## Procedure

| Step no. | Step name | Specific action | Operating standard | Tools / forms used | Points to note |
|---|---|---|---|---|---|
| 1 | Acknowledge + point to the app | First reply: confirm the problem (site not loading vs not findable are different). Say the app is the fastest way in. | Do not explain why the site is missing from search; do not speculate on the cause. | LiveChat / Telegram |  |
| 2 | Send the app download link | After step 1: one link only, copied from the locked reference; check the correct brand row first. | Never type a link from memory. One URL per message. | Locked reference (Lark) |  |
| 3 | Send the download-button screenshot | Straight after the link, as a separate message: use the stored brand asset. | Do not screenshot it yourself. | Stored brand asset (R2) |  |
| 4 | Confirm the download worked | After step 3: ask directly and wait for the answer. | Do not proceed until the player confirms. No reply after 3 minutes: prompt once, do not close the chat. | LiveChat / Telegram |  |
| 5 | Send the official site link as backup | After the download is confirmed: one link only, from the locked reference. | Tell the player to save it; invite to the official Telegram channel. | Locked reference (Lark) |  |
| 6 | Give the trusted-source warning | Every chat, no exceptions: use the canned line word for word. | Never name the fake domain, even when warning about it. | Canned response |  |
| 7 | Capture UID and log | After access is fixed: ask for UID now, not earlier. | Log in contact_log with the tag Access Recovery. No UID means no attribution. | contact_log |  |
| 8 | If a suspicious site is reported | Whenever it comes up: ask for a screenshot only. | Do not ask for the URL, do not open it. Escalate to ATL the same shift with the screenshot attached. | Screenshot, ATL |  |

## Flow chart

```chart
title: App-First Link Recovery: flow
start: Locked out
step: Point to app
step: Send app link
step: Send screenshot
check: Download done? | yes: next | no: escalate Prompt once, wait
step: Site backup link
step: Trusted-source warning
end: Capture UID + log
```
## 1. Objective
Get a locked-out player back in through the brand app first, with the official site as backup, then capture their UID so the recovery is attributed.

## 2. Scope
Use this SOP when a player:
- cannot find the brand on Google or any search engine
- cannot open or load the site
- asks for "the usual link", "link lama", "link apps" or similar
- sends a screenshot of search results with the brand missing
- reports a site that looked like ours but behaved wrongly

Effective from publication. Not applied to chats handled before that date.

## 3. Golden Rules
- **App first, site second.** The app removes the search dependency permanently. The site link only solves today.
- **Fix the access, then capture the identity.** Ask for UID only after the player is back in.
- One link per message, always copied from the locked reference in Lark. Never type a link from memory.
- The trusted-source warning is mandatory on every chat under this SOP.
- Never name, send or open a suspected fake domain.

## 4. Canned Responses, English
```
[1] Noted boss. Fastest way in is our app, and it does not depend on Google. Sending the download link now.
[2] SK69 app download: [LOCKED APP URL]
[3] After opening the link, tap the download button as shown here. [ATTACH LOCKED SCREENSHOT]
[4] Download done boss?
[5] For backup, this is our official site: [LOCKED SITE URL]. Save this link and join our official Telegram channel so you always have the latest one.
[6] One important reminder boss: only use links sent here or from our official channel. Do not use links from Google search. There are copycat sites out there.
[7] May I have your UID so I can note this on your account?
```
Line [2] uses SK69 as the example. Swap in the player's brand.

## 5. Canned Responses, Bahasa Malaysia
```
[1] Baik bos. Cara paling cepat masuk adalah melalui app kami, dan app ini tak bergantung pada Google. Saya hantar link download sekarang.
[2] Link download app SK69: [LOCKED APP URL]
[3] Lepas buka link tu, tekan butang download macam dalam gambar ni ya bos. [ATTACH LOCKED SCREENSHOT]
[4] Sudah berjaya download bos?
[5] Untuk backup, ini link website rasmi kami: [LOCKED SITE URL]. Simpan link ni dan join channel Telegram rasmi kami supaya bos sentiasa ada link terkini.
[6] Satu peringatan penting bos: guna link yang kami hantar di sini atau dari channel rasmi kami sahaja. Jangan guna link dari carian Google. Ada pihak buat website tiruan.
[7] Boleh bagi UID bos, saya nak record dalam account bos.
```

## 6. Guards (never do this)
- Say or imply the site cannot be listed, is blocked, or is being hidden.
- "Faham-faham lah" or anything that invites the player to read between the lines.
- Name or send the fake domain to a player, even as a warning.
- Put two URLs in one message.
- Send any domain not on the locked reference sheet.
- Ask for UID before the access problem is solved.
- Close the chat without confirming the player got in.
- Open a suspected fake site on a work device.

## 7. Escalation Ladder
| Step | Action | Who | Time cap |
|---|---|---|---|
| 1 | Verify and understand the customer's actual problem | PIC | First |
| 2 | Check yourself: Handbook, SOP, locked reference, pinned posts | PIC | 5 min |
| 3 | Cannot find the answer: go to the upline with the screenshot and what you already checked | PIC to ATL | Immediately |
| 4 | Upline cannot resolve: escalate to management | ATL to Supervisor to Department Head | Same shift |

- The five-minute cap on step 2 is firm. Still searching at five minutes is a step 3. Tell the player you are checking and keep them warm.
- Step 4 triggers automatically, no judgement call, if any of these apply: money at risk, a third-party site impersonating the brand, player data or credentials exposed, or the same issue hitting more than one player.

## 8. Remarks
- Why the five-minute cap: in the source case an agent checked for ten minutes, found nothing, and lost the chat to inactivity. At five minutes it becomes an escalation instead of a lost player.
- The Lark source says "all seven brands". Team B now runs 8 brands, so the locked reference must cover all 8.

## 9. Rollout Prerequisites
Status as recorded in the Lark doc on 15 Aug 2026. Confirm the current status before relying on it.

1. Locked domain reference table in Lark, all brands, ATL edit rights only. Owner: ATL. Status then: not built, blocker for steps 2 and 5.
2. Download-button screenshots stored in the R2 bucket, one per brand. Owner: ATL. Status then: one exists, agent-taken, blocker for step 3.
3. Canned responses loaded into LiveChat and Telegram saved replies. Owner: Trainer. Status then: pending.
4. Team briefed and acknowledgement confirmed. Owner: Trainer and QA PIC. Status then: pending.
