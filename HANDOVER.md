# Handbook App: Handover Pack

From: VIP Retention, ATL (1st PIC)
To: AI Department
Handover date: 28 Oct 2026
Status: Final, approved by the ATL on 28 Oct 2026

## 1. What it is

The C9MYR VIP Retention Handbook. It holds the department SOPs, Learn modules, quizzes and the glossary. Staff sign in with Google through Cloudflare Access.

- Live URL: https://c9myr-rtn-handbook.pages.dev
- Users: VIP Retention staff. Company emails (`@orionesofttech.com`) are approved automatically. Other emails wait for an admin to approve them.

Full detail (every screen, API route, script, table, role and troubleshooting case) is in the **Technical appendix** at the end of this pack.

## 2. Stack

| Part | Detail |
|---|---|
| Front end | React 18 + Vite 5 (`src/`: Handbook, Learn, LearnEditor, Quizzes, Glossary, Chart) |
| API | One Cloudflare Pages Function, `functions/api/[[path]].js`, which routes to `server/learn.js`, `server/quiz.js` and `server/glossary.js` |
| Database | Cloudflare D1 |
| Login | Cloudflare Access (Zero Trust Free, 50 seats) with Google login |
| Public shell | The app shell is public and holds no SOP text. Only `/api` and `/flowcharts` sit behind Access. `scripts/check-public.mjs` fails the build if SOP text ends up in `dist/`. |

## 3. Cloudflare and Google resources

| Resource | Value |
|---|---|
| Pages project | `c9myr-rtn-handbook`, branch `main` |
| D1 database | `handbook`, id `4e523ae5-28aa-4709-8082-ad6ed1507716`, binding `DB` |
| Access team domain | `c9myr-rtn.cloudflareaccess.com` |
| Access app | "C9MYR VIP Retention Handbook". It protects `/api`, `/flowcharts` and `*.c9myr-rtn-handbook.pages.dev`. Keep the wildcard row, because old preview copies still contain SOP text. |
| Google OAuth | Consent screen is External and In production; the privacy page is `/privacy/`. GCP project: "C9MYR RTN Login" (`c9myr-rtn-login`), inside the company Google organisation `orionesofttech.com`. Its only Owner is the ATL's company email. |
| Variables (wrangler `[vars]`) | `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `LEARN_FOR_STAFF` |
| Local only | `DEV_EMAIL` in `.dev.vars` (gitignored) |
| Secrets | None |
| Cloudflare account | The same account as the VVIP Console: "Aldok.ma@orionesofttech.com's Account". It has 3 Super Administrators, two of them personal Gmails; see the Console pack, section 4. |

## 4. Commands

Local:
- Front end only: `npm run dev`
- Full stack: `npm run build`, then `node node_modules/wrangler/bin/wrangler.js pages dev dist --port 8789` (or `npm run dev:full`, port 8788)

Build and deploy:
- Build: `npm run build` (runs `vite build`, then `check-public`)
- Deploy: `npm run deploy` (runs `wrangler pages deploy dist --project-name=c9myr-rtn-handbook --branch=main`)
- Verify a deploy: the `index-*.js` name served by the live URL must match the one in `dist/assets`.

Rollback:
- App code: Cloudflare dashboard > Pages > `c9myr-rtn-handbook` > Deployments > roll back to the previous deployment. Or redeploy an older commit.
- SOP content: in-app History and Restore (stored in the `sop_versions` table).

Database scripts (each one accepts `--local`):
- Schema: `npx wrangler d1 execute handbook --remote --file=db/schema.sql`, plus `db/learn.sql`, `db/quiz.sql` and `db/glossary.sql`
- Sync SOP content: `npm run sync` (`-- --dry` previews; `-- --take-repo=<id>` forces the repo copy of one page)
- Export app edits to markdown: `npm run export`
- Learn: `node db/learn-seed.mjs` loads drafts. `node db/learn-publish.mjs` is a dry run; it only publishes with `--go`.
- Quiz: `node db/quiz-seed.mjs [--replace-draft=<id>]`
- Glossary: `node db/glossary-seed.mjs`

## 5. Login and roles

- Every API request checks the `Cf-Access-Jwt-Assertion` header. It must be RS256, verified against the team certs, with matching aud, iss and exp. A bad token gets a 401.
- Approval states: 1 = approved, 0 = pending, -1 = rejected. Only state 1 gets data.
- Roles:
  - **reader:** reads.
  - **admin:** edits SOPs, publishes Learn, approves sign-ins, sets nicknames.
  - **master:** everything an admin does, plus changes roles, deletes people, and opens restricted pages.
- Restricted pages are Channel Login, Panic Switch (PYM), Roster and Staff Records. Their content exists only in live D1, not in the repo.

## 6. D1 tables

| Table | Purpose |
|---|---|
| profiles | Users: email, nickname, role, approval state, last seen |
| sops | Handbook pages as JSON blocks, with version, restricted flag, status, nav order and meta |
| sop_versions | A snapshot on every in-app save, used for History and Restore |
| learn_modules | Learn guides, draft and published |
| learn_reads | Which user has read which module |
| learn_attempts | Learn quiz attempts |
| quiz_sets | Assessment quizzes |
| quiz_attempts | Assessment attempts |
| glossary | Terms, aliases and meanings |

## 7. Content rules (business owner: VIP Retention)

- **The app is the master copy** of SOP content (decided 28 Sep 2026). Admins edit in the app, and every save is snapshotted.
- `npm run sync` never overwrites a page that was edited in the app.
- `[CONFIRM ...]` markers and unresolved conflict quotes render as orange callouts. They are not settled fact.
- Content style and the intake rules are in `CONTENT.md`. The look is in `DESIGN.md`. Read both before any change.

### 7.1 Lark SOP sheets (reference copies)

Each SOP also has a Lark sheet in the department's Lark template (one tab per version; never edit an old tab). The Handbook App is the master copy. The Lark sheets are the reference and print copies.

**Important:**
- These sheets sit in the ATL's **personal** Lark wiki space (checked 28 Oct 2026).
- **Decided (ATL, 28 Oct 2026):** they move to a shared **VIP Retention** Lark wiki space. VIP Retention owns the SOP content; give the AI Department view access. Until they move, they stay tied to one person's account.
- When an SOP changes in the app, the rule is to add a new version tab in its Lark sheet, chart picture included.

| No. | SOP | Lark template sheet | Earlier Lark doc | Note |
|---|---|---|---|---|
| 01 | Grace Period | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/LDk3w4yfiifS3WkIoBela6cnggh) | - | Latest tab v1.2 |
| 02 | Channel Login | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Pjr0wgp0Fi2QE0kaPROlzFurgxg) | - | Restricted page in the app |
| 03 | LTV List | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/WajBwqOiXiLfo1krIYDljbCDgIf) | - | Latest tab v1.2 |
| 04 | VVIP Blast | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/YvLewdmjri6tf2kWWHdliGyUgRh) | - |  |
| 05 | Risk Push | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/YKoqw386eiVhOgk1V83lYSsAgef) | - | Latest tab v1.2 |
| 06 | SMS Script | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/AdSOwfMAViulXSkuUsOlJwJLgif) | - |  |
| 07 | Top PNL | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/BvAIwZzwoijjLjkdr26lcrlUgvg) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/CiJ4wdGnWikqP4kQkOClzcisgke) | Latest tab v1.2 |
| 08 | Top Deposit | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/VQ06wuqyUiUZqzkBTJWlQzaEgsg) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/F6FnwgI3ui8DvPkvPpll5UQHgke) | Latest tab v1.2 |
| 09 | Internal Mail Approach | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/PGKDwkC8TiR1TXkNGPMlZG6pgcF) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Cl2qwnZIEiF3YEkNdaolEGKZgde) |  |
| 10 | Telegram Approach | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/T280wTZ0RiiWHpkiSp8lu446gVd) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Ko36wZbTniFzr8kCi5elqAwhghc) |  |
| 11 | Telegram Engagement Tracker | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/A079w9n0bixvvdkpq3wlXCtEgeg) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/QPIuwMnSni7kqVk7Vtilirp1gAh) |  |
| 12 | QA Record | - | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Zkr5wc7eBi0V9VkXMs7lxhWdgqf) | No template sheet found |
| 13 | Output Report | - | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/DFrjwdgl7iLYcrkBbMilEHi6gSd) | No template sheet found |
| 14 | ROI Table | - | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/U9zAwKXgjiLJExkKeWnlbBRBgfd) | No template sheet found |
| 15 | Weekend Campaign | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/FRPKw97fkiN7k9kU3bAlzURAgPe) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Fay3wsITNidq2BkyJQ7lAIB4gAe) | Latest tab v1.3 |
| 16 | Attendance (Pre-Shift Setup) | - | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Dym1wH2AFi3o6lkkwpJlat1Cgbh) | No template sheet found |
| 17 | Chat SOP Case Library | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/MVMEwUtNqiwfHQkrqPYlmIUmgag) | - | Listed as "SOP - Chat Case" |
| 18 | Complaint Handling | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/NrM9wUm7hiE46WkYV97lGPxegEf) | - | Latest tab v1.2 |
| 19 | ZYRA Forgot Password | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/GPnjwAx4jiJQjLkpH3RlyoIFgSe) | - |  |
| 20 | Redeem Code S0403 | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Wa26wKDUkioZK9kSjfGl9wp7gph) | - | Original source doc: [Open](https://ijpv8dp20kxz.jp.larksuite.com/wiki/CPmhw2TCXilN7BkxJnvjL35ppSe) (another Lark tenant) |
| 21 | Checking Conversation History | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/YjdiwwyRVi5r3DkByMBlnpctgag) | - |  |
| 22 | Birthday Bonus | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/JLj0wdv4RiXwWWkqSphlLzXngNd) | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/QN8pwiGoli5fYvknHXvl0Ma2gxg) | Latest tab v1.3. A second sheet with the same name exists: [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/RfOkwMpNQiyh8xk8Xo4lDGBOgGb); confirm which one to keep |
| 23 | Bonus Issuance Approval | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/VQtbw2NHqiKnHIkxdgOlrhh4gDA) | - | Latest tab v1.2 |
| 24 | KPI Scoring | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/BPAmwC3MFiREeVkXWwXleYgvg5d) | - |  |
| 25 | Escalation | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/FXE9w9mzSixNatk2n5Xlt5Stg0f) | - |  |
| 26 | Reporting Data Integrity | - | - | Not found in the Lark tree |
| 27 | Reactivation Winback | - | - | Not found in the Lark tree |
| 28 | Daily Closing Report | - | - | Not found in the Lark tree |
| 29 | Shift Handover | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/RRj1wQWw0iOKbYkxzKfl3u7AgAF) | - |  |
| 30 | Compensation | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Fhp9wsJG3iP60ykIRDRlYXhrgtf) | - | Latest tab v1.1 |
| 31 | Case Study Logging | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/XtIEwUjAiiBeeak1wXIlAvZOgJh) | - |  |
| 32 | New Agent Onboarding | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/HoMCwtZOyicJSek0cwhlFxikg4g) | - |  |
| 33 | Process Landing Layer | - | - | Not found in the Lark tree (own layout in the app) |
| 34 | Push Notification | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Dn8rwG0wainZeykYL3UlEUUkgCf) | - |  |
| 35 | Special Event Campaign | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/RXrhwoSisiAOH1knK38lYmCDgPe) | - |  |
| 36 | Login Provisioning | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/VdyLwbtc2imr5nkwBcTl2RgggWd) | - |  |
| 37 | New Staff Incentive Eligibility | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/GTCIwatTqiuZO1kx9DvlzNDcgJQ) | - |  |
| 38 | Incognito Browsing | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/EnqKwQUCWivW8Uk3RWblnCsfgJh) | - | Listed as "SOP - Incognito Browser" |
| 39 | App-First Link Recovery | - | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/ZRhQwSAVRimBO0k5JDblX1C8gfg) | Source doc only |
| 40 | Promotion Run Timeline | - | - | Not found in the Lark tree |
| 41 | Test Accounts | [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/DEoewswVQi1tkokfWk3le00QgPc) | - |  |

Index pages:
- SOP Book Enrollment List: [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/TEPLwJfVniNV9gkVscVlaDIMg1f)
- Implemented SOPs List: [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/R8rewBxg3iVt9KkyWdNlURsJgoe)
- Official Handbook (Lark, older): [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/PqMnwAZrPiuNCmk2My8lWrimgwg)
- HR SOPs and Policy Library: [Open](https://msgyb9oc635y.sg.larksuite.com/wiki/Z3V7wSHbdir3vbkQdNHlkYQ6gVg)
- Panic Switch (PYM), restricted: [Open](https://msgyb9oc635y.sg.larksuite.com/docx/RMdrdNUWEo08UfxVY6ilPXUUgoc)

Not found in the Lark tree: SOPs 26, 27, 28, 33 and 40. They exist only in the app and in `content/sop-book/`.

## 8. Open backlog (`docs/BACKLOG.md`)

- Ready:
  - #1 shared design components
  - #3 build lint (colours, sizes, em dashes, all-caps)
  - #11 Learn drafts for People & Operations
  - #12 Chat SOP forgot-password fix
- Waiting:
  - #2 design batch 2
  - #4 reviewer role
  - #5 SOP 41 Test Accounts
  - #6 more 5 Pillars questions
  - #9 more Learn modules
- In review:
  - #7 Top Deposit, Reactivation and TG Engagement Tracker drafts
  - #10 six Service & Exceptions drafts, on unmerged branch `agent/learn-service-exceptions`
- Known issue: the Cloudflare "App Launcher / NoAuth" page sometimes shows after sign-in. The cause is unconfirmed.
- Risk: `npm run sync -- --take-repo=<id>` overwrites an app-edited page without saving it to History first. Run `npm run export` before using it.
- Docs out of date: README still describes 2 roles and admin-only restricted pages. The code has 3 roles, and restricted pages are master only.
- `sync` and `export` always run against the live database; they don't take `--local`.

## 9. Handover status

Done before handover (27 to 28 Oct 2026):
1. **Code on GitHub.** The code is in the private repo `c9myr-vip-retention/handbook-app`, and `master` is the default branch.
2. **Content in the repo.** The SOP markdown (`content/sop-book`), the templates (`content/sop-templates`) and the page sources (`content/pages`) are in the repo, and the scripts read them from there.
3. **Clean-up.** Removed the personal email, names, private folder links, the personal AI workflow notes and the stale `.env.example`.
4. **Database backup.** A full D1 export was taken on 27 Oct 2026; the checksum is kept by the ATL.

To do at handover:
1. **Master role.** Move it to the AI Department owner, and lower the ATL to admin or reader.
2. **Restricted pages.** Agree who may open them after handover.
3. **Old branch.** `preview/learning` has 4 commits that are not in `master`. Merge them or drop them.
4. **Content drift.** The generated Top Deposit page (`db/content/top-deposit.json`) is still V1.1, while its source is V1.2.

## 10. Open question for management

Who edits SOP and Learn content after handover? Content work is not development. If VIP Retention admins keep their admin role, the department can still update SOPs without going through the AI Department queue. Recommended: VIP Retention keeps admin (content), and the AI Department holds master (code, roles, access).

## 11. What the AI Department receives

| Item | How it is handed over |
|---|---|
| Code | Owner role in the GitHub organisation `c9myr-vip-retention` (repo `handbook-app`) |
| Hosting, database, Access | Super Administrator on the Cloudflare account |
| Google sign-in | Owner on the Google Cloud project "C9MYR RTN Login" (`c9myr-rtn-login`) |
| Master Admin | Sign in once with a company email, then set the role with `npx wrangler d1 execute handbook --remote --command "update profiles set role='master' where email='<email>'"` |
| Database backup | Full export of 27 Oct 2026, through a company drive link, to the named owner only |
| Documentation | This file (`HANDOVER.md`), CONTENT.md, DESIGN.md and `docs/` |

## 12. Risks and open items

| No. | Item | Risk | Action | Owner |
|---|---|---|---|---|
| 1 | Two personal Gmail accounts are Super Administrators on the shared Cloudflare account | Full control from personal accounts; one has no 2FA | Remove both at handover | ATL, at the meeting |
| 2 | The ATL's Cloudflare account has no 2FA | Account takeover | Turn on 2FA | ATL |
| 3 | Lark SOP sheets sit in a personal Lark space | Lost if the account changes | Move to a shared VIP Retention wiki space (decided 28 Oct 2026) | ATL |
| 4 | Who edits content after handover is not settled | SOP updates could slow down | Recommended: VIP Retention keeps the Admin role for content | Supervisor to confirm |
| 5 | Cloudflare Zero Trust is on the free plan (50 seats) | Sign-ins fail past 50 users | Watch the seat count; check the billing owner | AI Department |
| 6 | `sync --take-repo` overwrites app edits without a History snapshot | Lost edits | Run `npm run export` first | AI Department |
| 7 | Branch `preview/learning` has 4 unmerged commits | Lost work or confusion | Merge or drop | AI Department |
| 8 | Top Deposit content drift (V1.1 in `db/content`, V1.2 in source) | Wrong version if re-seeded | Re-run the import for that page | AI Department |

## 13. Acceptance

The handover is complete when the AI Department can, without the ATL:
1. Build, deploy and roll back the app once.
2. Sign in as Master Admin and open a restricted page.
3. Run `npm run sync -- --dry` and get a clean report.

## 14. Support after handover

- The ATL gives 2 weeks of Q&A support from the handover date. Answers only: no deploys, no code changes.
- Request channel and response time: agreed at the handover meeting.
- Content rules (CONTENT.md) and SOP meaning stay owned by VIP Retention.

## Sign-off

| | Name / role | Date |
|---|---|---|
| Handed over by | ATL, VIP Retention | |
| Received by | AI Department | |
| Acknowledged | Supervisor | |

---

# Technical appendix

Prepared for the AI Department handover, 28 Oct 2026. Built from the source code in the `handbook-app` repo (branch `master`). File and line references point at that repo. Where the code does not settle a point, the text says "Not confirmed from code".

Quick facts:

| Item | Value |
|---|---|
| Live URL | `https://c9myr-rtn-handbook.pages.dev` (from CLAUDE.md) |
| Cloudflare Pages project | `c9myr-rtn-handbook` (wrangler.toml, package.json `deploy`) |
| Deploy branch flag | `--branch=main` (package.json `deploy`); the git branch in the repo is `master` |
| D1 binding / database name | `DB` / `handbook` (wrangler.toml) |
| Access team domain var | `ACCESS_TEAM_DOMAIN` (wrangler.toml `[vars]`) |
| Access audience var | `ACCESS_AUD` (wrangler.toml `[vars]`) |
| Learn staff switch | `LEARN_FOR_STAFF = "yes"` (wrangler.toml `[vars]`) |
| Local-only identity var | `DEV_EMAIL` in `.dev.vars` (git-ignored, never deployed) |
| Front end | React 18, Vite 5 (`src/`) |
| API | One Pages Function, `functions/api/[[path]].js`, plus `server/learn.js`, `server/quiz.js`, `server/glossary.js` |

---

## Appendix A. Screen guide

### A.1 How routing works

The app is a single page. All screens are hash routes, parsed by `parseHash` and built by `toHash` in `src/Handbook.jsx:1312-1350`. Unknown hashes fall back to Home. The login and privacy pages are separate static HTML files in `public/`.

Before any route renders, `src/App.jsx` decides which gate to show:

1. `GET /api/me` (App.jsx:33-44). A 401, or no email in production, sends the browser to `/login/` with the current hash kept as `?next=` (App.jsx:17-20).
2. Rejected user: "Access declined" card (App.jsx:97-107).
3. Pending user: "Almost there" waiting card (App.jsx:109-123).
4. Approved user: `GET /api/sops`, then the Handbook shell (App.jsx:46-58).
5. Any other failure: "Couldn't load the handbook" with a Try again button (App.jsx:85-95).

Role labels in the UI: Reader, Admin, Master Admin (`ROLE_LABEL`, Handbook.jsx:598). In this appendix "admin" means admin or master unless it says "master only".

### A.2 Gate screens (outside the Handbook shell)

| Screen | Path or trigger | Who sees it | What it shows and does | API | Notes |
|---|---|---|---|---|---|
| Login | `/login/` (`public/login/index.html`) | Anyone, public | Brand card and one "Sign in with Google" button. `?out=1` shows "You've signed out". | Button goes to `/api/login?next=<hash>`. On load it calls `GET /api/me`; if an email comes back it skips straight into the app. | Only `#/` routes are accepted for `next` (regex `^#\/[\w\-/%.]*$`), so it cannot redirect to another site. Theme follows the `hb-theme` localStorage key. `noindex`. |
| Privacy notice | `/privacy/` (`public/privacy/index.html`) | Anyone, public | Plain notice: name and email from Google, why, Cloudflare sign-in records, edit records, removal via the superior. Link back to sign in. | None | Comment says it is linked from the Google sign-in screen. The Google consent screen setting itself is not in code. |
| Loading | App start | Everyone | "Loading..." then "Loading handbook..." | `/api/me`, `/api/sops` | |
| Waiting screen (pending) | `approved = 0` | Signed-in, not yet approved | Email, "waiting for an admin to approve it", reload hint, nickname form, Sign out. | `POST /api/me/name` | The person must reload after approval; there is no polling. |
| Access declined | `approved = -1` | Rejected users | Email, "was not approved", Sign out. | None | A master or admin can approve them later from Access Management. |
| Couldn't load | Any non-401 error on `/api/me` or `/api/sops` in production | Anyone | Error text in plain words, Try again (page reload). | | Error wording comes from `src/lib/api.js:7-12`. |
| Preview mode | `npm run dev` with no Access (no email) | Developer only | Full reader UI on repo content, banner "Preview mode: sample content only. Nothing you change here is saved." Editing works in memory only. | None for content (repo content is loaded with a dynamic import) | Only in development builds (`import.meta.env.DEV`). Learn, Glossary and Quiz links are hidden in preview. |

Sign out (header button and gate screens) calls `/cdn-cgi/access/logout` in the background, then goes to `/login/?out=1` (`src/lib/api.js:86-89`).

### A.3 Handbook shell (all approved users)

Defined in `Handbook()` (Handbook.jsx:79-337).

- **Sidebar:** brand (Home), Home, Learn (only when `showLearn`), Glossary, Quiz, then the five sections (Start Here, SOP Book with domains, HR & People, Frameworks & Strategy, Libraries). Sub pages nest under their parent. Admin and master also get "Access Management" and "Chart review (admin)" (Handbook.jsx:262-267).
- **Top bar:** menu (phone), Back, page title, search box, search icon (not on Home), name chip with role (click to change nickname), Access Management button (admin), Page tools button (SOP pages only), Light/Dark toggle (saved in `hb-theme`), Sign out.
- **Keyboard:** `/` focuses search; Escape closes the page tools drawer, the menu, the phone search, or clears the search (Handbook.jsx:140-163).
- **Name prompt:** an inline "Add your working nickname" form at the top of the content area while `full_name` is empty. Cancel hides it for this visit. Calls `POST /api/me/name` (Handbook.jsx:305-310, `src/NameForm.jsx`). Minimum 2 characters, maximum 80.
- **Search:** client side only, over the content already loaded (titles, section, domain, keywords, page text, chart text). Title hits score 5, keyword hits 3, body hits 1; every word must match (Handbook.jsx:14-77). No API call.
- **Learn link logic:** `showLearn` is true for admins, or for anyone when `GET /api/learn` returns at least one module that is not a draft (Handbook.jsx:171-176). That list is reloaded on every route change.
- **Quiz leave guard:** while a Quiz page attempt runs, any navigation asks "Your quiz is still running..." (Handbook.jsx:85-95, 126-138; Quizzes.jsx:32-37).

### A.4 Reader screens

| Screen | Route | Who | What it shows | Actions | API | Notable rules |
|---|---|---|---|---|---|---|
| Home | `#/` | Approved | Hero search, Learn banner (if `showLearn`), "Daily essentials" tiles, "Who we are" (mission, chain, brands, pillars), "Browse by section", "Recently updated" (top 5 by the "Updated" chip). | Search, open tiles and rows. | None (uses loaded content); Learn list for the banner | Daily essentials is a fixed id list (`ESSENTIALS`, Handbook.jsx:361). "Who we are" is read from the `department-overview` and `culture` pages, so editing those pages changes Home (Handbook.jsx:441-510). Missing pages simply hide their tile. |
| Search results | any route with text in the search box | Approved | Matching pages with a text snippet. | Open a result. | None | Results replace the current view until the search is cleared. |
| SOP Book domain list | `#/d/<domain>` | Approved | All SOPs in one domain, version chip, "Updated" date or status. | Open a page or stub. | None | |
| Page | `#/p/<id>` and `#/p/<id>/s/<section>` | Approved (restricted pages: master only) | Breadcrumb, title, header chips, "About N min read", print note (print only), Learn link (if a module exists), blocks, sub page cards, Learn link at the end, Previous / Next in the same group. | Present, Print / PDF. Admin: History, Edit, per-section Edit buttons on each `##` heading. | None at render (content already loaded); Learn list for the link | `/s/<section>` scrolls to the heading whose text starts with that name, ignoring a leading number (Handbook.jsx:1024-1035). Header chips that start with "Change: " are hidden from the meta row and shown in the page tools panel. |
| Stub | `#/s/<title>` | Approved | Status message for a catalog entry with no body: "Coming soon", "Not written yet", "Lark doc", or "Only admins can see this page". | None | None | Status comes from `sops.status` and `sops.restricted` via `fromRows` (`src/lib/rows.js:28-37`). |
| Page tools panel | Right rail on wide screens; drawer from the "Page tools" button on narrow screens | Approved | "On this page" table of contents (only when the page has more than 2 sections), a small flow chart (hidden while the full chart is on screen; click to enlarge), up to 4 related SOPs (same domain or section), "What changed" (version, updated date, change note). | Jump to section, enlarge chart, open related page. Admin: History link. | None | Panel is hidden when there is no TOC, chart or related page (Handbook.jsx:944-1021). |
| Present mode | Present button on any page (no route) | Approved | Full-screen slides: slide 1 title and intro, then one slide per `##` section. SOP header block is left out. | Arrow keys, Space, Page Up/Down, Home/End, Escape; Previous / Next / Exit buttons. | None | Requests browser full screen; leaving full screen closes Present mode (Handbook.jsx:1195-1251). Hidden in print. |
| Print / PDF | Print / PDF button (`window.print()`) | Approved | Clean page, light colours, no sidebar, top bar, rail, pager, tools, banners, breadcrumbs, sub page cards or Learn links. Adds "Printed copy of Vx.x, <date time>. It may be out of date..." | Browser print dialog | None | Print stamp refreshes on `beforeprint` (Handbook.jsx:909-921). Print CSS in `src/styles.css:474` onward. |
| Charts and images inside a page | `chart`, `img` blocks | Approved | House-style SVG chart drawn from a ` ```chart ` block, with "Enlarge chart". `img` blocks show the picture; own SVGs under `/flowcharts/*.svg` are fetched and drawn inline so they follow the theme. | Enlarge (native modal dialog). | `GET /flowcharts/<file>` (static, behind Access) | Inline SVG is refused if it contains `<script`, `on...=` attributes or `javascript:` (Handbook.jsx:1138-1161). Chart layout picks left to right, then top-down, then shrink to 70%, then sideways scroll (Chart.jsx:223-255). |
| SOP header block | `sopheader` block | Approved | Lark-style header: Process name, Version number (from the page version chip), Department, Effective date, Process owner, Approved by. | None | None | Empty Effective date and Approved by show "Pending approval"; other empty cells show "Not set" (Handbook.jsx:1103-1117). |
| Glossary | `#/glossary` | Approved | Terms grouped into 6 fixed categories, search box, other names, meaning, meaning by task, and "Used in" links to SOP pages that mention the term. | Search; open a linked SOP. Admin: add, edit, delete terms. | `GET /api/glossary`; admin `POST /api/glossary`, `DELETE /api/glossary/<id>` | "Used in" is computed in the browser: short all-caps forms match as whole words, case-sensitive; longer names match case-insensitive; up to 6 pages (Glossary.jsx:13-16). Not shown in preview mode. |
| Learn home | `#/learn` | Admin always; staff when `LEARN_FOR_STAFF = "yes"` and a module is published | Modules grouped by SOP Book domain, each with minutes, quiz size, SOP version and a status chip (Draft, Under review, Passed, Best, Not started). "N of M modules passed". | Open a module. Admin: Team scores, "Add a module". | `GET /api/learn`; admin `POST /api/learn/<id>/create` | Staff never see drafts. Modules for restricted SOPs are hidden from everyone except the master. |
| Learn module (guide) | `#/learn/<id>` | As Learn home | Title, minutes, "Based on SOP Vx", "SOP now Vy" when they differ, "Open the official SOP", review warning when the SOP moved on, "The 30-second version" cards (tabs or Show all), "Words you need", "Test yourself". | Step through cards, tick lists, yes/no gate, calculators, open the SOP at the rule's section, Start/Retake the quiz, Mark the guide as read. Admin: admin panel. | `GET /api/learn/<id>`, `POST /api/learn/<id>/read` | Readers receive the live content with quiz questions, answers and reasons removed (server/learn.js:281-286). Read ticks are per SOP version. |
| Learn quiz | `#/quiz/<id>` | As Learn home | Intro (count, seconds per question, pass mark), then one question at a time with a countdown, then the marked result and the "why", then the final score, pass or "Not yet", attempt number and best score. | Start, Check answer, Next question, See result, Retake with new questions. | `POST /api/learn/<id>/attempts`, `POST /api/learn/attempts/<aid>/answer` | Questions are picked at random from the pool and options are shuffled on the server. The browser never holds the key before answering. At 0 seconds the browser sends no answer; the server also enforces the limit with 5 seconds grace. Paused when the module is a draft or under review. |
| Quiz page list | `#/quizzes` | Approved | "Practice" quiz cards: title, question count, minutes, points, "In progress, mm:ss left. Resume" or the last result. Note that essay quizzes are coming. | Open a quiz. Admin: Scores link per card. | `GET /api/quizzes` | Staff only see published sets. Only `kind = practice` sets are listed. |
| Quiz intro | `#/quizzes/<id>` | Approved (published sets); admin (drafts too) | Title, intro, section outline, rules, attempts used and left, past results, reference panel. | Start or Resume. Admin: "Try the draft" (trial, not counted), admin tools. | `GET /api/quizzes/<id>`, `POST /api/quizzes/<id>/attempts` | An open attempt resumes automatically. If `maxAttempts` is set and used up, start is refused (server/quiz.js:80-83). |
| Quiz runner | inside `#/quizzes/<id>` | Taker | One clock for the attempt, question navigator by section, options without A/B/C keys, written reason box when a question has one, saved status, 5 minute and 1 minute warnings, Submit. | Choose, write, Next (only when complete), Check (when feedback is on), Submit. | `PUT /api/quizzes/attempts/<aid>`, `POST /api/quizzes/attempts/<aid>/submit` | Answers save 800 ms after typing stops, one save at a time. A written reason needs 3 words. Questions open in order. At 0 the runner submits what is saved. With feedback on, a checked answer locks. Leaving asks for confirmation. |
| Quiz result | after submit | Taker | "N of M" for the choices; written parts "can add up to X more points after review"; trial label for admin runs; "Time ran out" if late. | All quizzes | | Staff never see which questions were wrong unless feedback is on. |

### A.5 Admin screens (admin and master)

| Screen | Route | Who | What it shows | Actions | API | Notable rules |
|---|---|---|---|---|---|---|
| Page editor | `#/edit/<id>` (whole page) and `#/edit/<id>/<blockIndex>` (one section) | Admin; master for restricted pages | Title, Version, "What changed" note (optional, max 140 characters, shown to readers), Write and Preview tabs, markdown text area, chart buttons. Section mode shows a banner and edits only that `##` section. | Save, Cancel, + Insert chart, Edit chart N. | `GET /api/sops/<id>` (load the row), `PUT /api/sops/<id>` (save) | Version must match `V<number>[.<number>]`. Save refreshes the version chip, the "Updated <date>" chip and the "Change: " chip (Handbook.jsx:745-759). Every save snapshots the previous state into History on the server. Leaving with unsaved text asks first. The route itself is not role-guarded in the browser; a reader who types the URL gets a 403 on Save. |
| Chart drawer | Dialog opened from the editor | Admin | Form of boxes (Start, Step, Decision, Escalate, Stop, End), each decision with two branches (carry on, side step, jump to end, done, finish, stop, escalate) and editable branch names, live preview on the right. | Add step or decision, move, delete, Save chart, Cancel. | None (edits the editor text; saved with the page) | Saving needs every box text filled in. The chart is written back as a ` ```chart ` block in the page text (Chart.jsx:262-342, Handbook.jsx:798-814). |
| History | `#/history/<id>` | Admin; master for restricted pages | Up to 50 earlier versions, newest first: version, title, changed by, when (UTC). | Restore. | `GET /api/sops/<id>/versions`, `POST /api/sops/<id>/restore/<vid>` | Each row is the page as it was just before a save or restore. Restore snapshots the current state first, so a restore can be undone. "Changed by" shows the editor's email. |
| Chart review | `#/charts` | Linked for admin only | Every page with a chart: the original picture (`/flowcharts/<id>.png`) next to the chart drawn by the app. | Open page. | Static `/flowcharts/*.png` only | Not role-guarded in the browser; a reader who types the URL sees only charts of pages they can already read. |
| Access Management | `#/approvals` | Admin and master | "Waiting for approval", "Registered" (with counts per role, registered date and last seen in Malaysia time), "Rejected". | Approve, Reject, edit nickname inline. Master only: role dropdown, Delete. | `GET /api/admin/approvals` and the approval routes in Appendix B | Admins cannot change an already approved account or anything about a master account. Nobody can change their own access (nickname is allowed). Delete keeps learning and quiz records. Confirm dialogs before role change, reject and delete. A reader who types the URL gets "You don't have permission to do that." |
| Learn admin panel | Inside `#/learn/<id>` | Admin | State (not published, under review with the new SOP version, live for SOP Vx), who saved the draft and when, the list of publish blockers, Publish button. | Publish (or "Publish the draft again"), Edit the draft. | `GET /api/learn/<id>?draft=1`, `POST /api/learn/<id>/publish` | Publish pins the module to the SOP's current version. Publishing is refused while any blocker remains. |
| Learn editor | `#/learn/<id>/edit` | Admin | Basics (minutes), Words you need (term and meaning), cards (tab label, title, official SOP section name and link text, items by card type: tick list, steps, hard stops, yes/no gate, calculator, ladder calculator), Quiz (questions per attempt, pass mark, seconds per question, question pool with options, correct option and "why"). | Save draft, Discard changes, Back, add, move and remove rows, cards and questions. | `GET /api/learn/<id>?draft=1`, `PUT /api/learn/<id>/draft` | Saving never changes what staff see. After each save the server returns what still blocks publishing. Draft size limit 200,000 characters. Learn answer keys here are stored as an option index (`a`), unlike the Quiz page. |
| Add a module | Section on Learn home | Admin | Dropdown of SOP Book pages with no module yet. | Start the draft (opens the editor). | `POST /api/learn/<id>/create` | Creates the 4 standard empty cards (When, Do, Never, Approver) and an empty quiz (5 questions, 80% pass, 60 seconds). |
| Team scores (Learn) | `#/scores` | Admin | Per module: SOP version, state, Passed N of M, Read the guide N of M, most missed question; table per approved person: read, best, attempts, status. | Click an attempts count to open one person's attempt report (question, their choice, the right answer, timed out). | `GET /api/learn/scores`, `GET /api/learn/scores/<id>/<email>` | Only approved profiles are listed. "Read" counts only ticks for the live SOP version; "best" counts attempts on any version. |
| Quiz admin tools | Inside `#/quizzes/<id>` | Admin | Ready state, list of publish blockers (up to 12 shown), feedback switch. | Publish / Publish the draft again, Close the quiz, Open again, Scores, toggle "Show right or wrong after each question". | `GET /api/quizzes/<id>/draft`, `POST .../publish`, `POST .../close`, `POST .../settings` | There is no in-app editor for quiz content. Quiz drafts only come from `db/quiz/*.json` via `db/quiz-seed.mjs`. Publishing re-opens a closed quiz. |
| Quiz scores | `#/quizzes/<id>/scores` | Admin | Took the quiz N of M, waiting to be marked, most missed; table per approved person: attempts, first, best, latest, band, to mark, "(in progress)". Score bands panel. | Open one person's attempts; per question see the chosen sentence, the key, the pillar focus, the written reason and its marking guide; give 0 to max points. | `GET /api/quizzes/<id>/scores`, `GET /api/quizzes/<id>/scores/<email>`, `POST /api/quizzes/attempts/<aid>/mark` | Loading scores closes every expired open attempt on that set first. Trial runs are never counted. Band shows only once the latest attempt's written parts are all marked. |
| Glossary admin | Inside `#/glossary` | Admin | Add form, Edit and Delete on each term. | Save, Delete (with confirm). | `POST /api/glossary`, `DELETE /api/glossary/<id>` | Term max 80 characters, meaning max 600, up to 12 other names, up to 8 task meanings. A new term whose id already exists is refused (409). |

### A.6 What each role sees in the sidebar

| Item | Reader | Admin | Master |
|---|---|---|---|
| Home, Glossary, Quiz, SOP sections | Yes | Yes | Yes |
| Learn | Only if `LEARN_FOR_STAFF = "yes"` and at least one module is published | Yes | Yes |
| Restricted entries in the nav | No (the API never sends them) | No | Yes |
| Access Management, Chart review | No | Yes | Yes |
| Edit, History, section Edit buttons on pages | No | Yes | Yes |

---

## Appendix B. API routes

All routes live under `/api/` and go through `onRequest` in `functions/api/[[path]].js`. Path segments are URL-decoded (an email arrives as `name%40domain`). Every response is JSON except the `/api/login` redirect. An uncaught error returns 500 with the error text (`[[path]].js:211-213`).

Who column:
- **Signed in** = a valid Access JWT, any approval state.
- **Approved** = `profiles.approved = 1`. Everything below `[[path]].js:68-70` needs this. Pending gets 403 "pending approval", rejected gets 403 "access declined".
- **Admin** = role admin or master. **Master** = role master only.
- In production nothing is public: the API sits behind Cloudflare Access. With no JWT and no local `DEV_EMAIL`, `/api/me` returns `{ email: null }` and everything else returns 401.

### B.1 Identity and sign-in

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| GET | `/api/me` | Signed in | Creates the profile on first visit (company domain auto-approved), updates `last_seen` at most every 5 minutes, returns `{ email, full_name, role, approved, rejected }`. No email returns `{ email: null }`. | `functions/api/[[path]].js:40-57` |
| POST | `/api/me/name` | Signed in, not rejected (pending allowed) | Sets your own nickname. Body `{ name }`; whitespace collapsed, 2 to 80 characters. | `functions/api/[[path]].js:45-52` |
| GET | `/api/login?next=#/...` | Signed in (Access runs Google sign-in before the request arrives) | 302 to `/<next>`. `next` must match `^#\/[\w\-/%.]*$`, else it goes to `/`. `cache-control: no-store`. | `functions/api/[[path]].js:62-66` |

### B.2 SOP pages

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| GET | `/api/sops` | Approved | All rows ordered by `sort, title`. Non-master callers never receive restricted rows. `body` and `meta` are parsed JSON, `restricted` is a boolean. | `functions/api/[[path]].js:78-84` |
| GET | `/api/sops/<id>` | Approved (restricted: master) | One row. 404 if missing, 403 "restricted" for non-master. | `functions/api/[[path]].js:85-90` |
| GET | `/api/sops/<id>/versions` | Admin (restricted: master) | Last 50 snapshots: `id, title, version, edited_by, edited_at`, newest first. | `functions/api/[[path]].js:98-103` |
| POST | `/api/sops/<id>/restore/<vid>` | Admin (restricted: master) | Snapshots the current state, then copies title, body and version from the snapshot. Sets `updated_by`. | `functions/api/[[path]].js:105-115` |
| POST | `/api/sops` | Admin | Creates a row (id from body or a new UUID). `restricted` is only honoured for master. Defaults: version V1.0, owner ATL, status live. No UI calls this today. | `functions/api/[[path]].js:116-126` |
| PUT | `/api/sops/<id>` | Admin (restricted: master) | Snapshots the previous title, body and version into `sop_versions`, then updates title, category, body, version, restricted (master only), status, keywords, `updated_by`, `updated_at`. Updates `meta` when an array is sent. | `functions/api/[[path]].js:127-142` |
| DELETE | `/api/sops/<id>` | Admin (restricted: master) | Deletes the row. History rows stay. No UI calls this today. | `functions/api/[[path]].js:143-146` |

The admin and restricted checks for all write routes are at `[[path]].js:91-96`.

### B.3 Access Management

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| GET | `/api/admin/approvals` | Admin | Every profile: `email, full_name, role, approved, created_at, last_seen`, newest first. | `functions/api/[[path]].js:167-172` |
| POST | `/api/admin/approvals/<email>/name` | Admin (master accounts: master only) | Sets anyone's nickname, yourself included. Body `{ name }`, max 80, empty clears it. | `functions/api/[[path]].js:177-183` |
| POST | `/api/admin/approvals/<email>` | Admin for pending or rejected people; master for approved people | Approve (`approved = 1`). | `functions/api/[[path]].js:192-207` |
| POST | `/api/admin/approvals/<email>/reject` | Admin for pending people; master for approved people | Reject (`approved = -1`). Can be approved later. | `functions/api/[[path]].js:192-207` |
| POST | `/api/admin/approvals/<email>/role/<reader\|admin\|master>` | Master | Changes the role of an approved person. | `functions/api/[[path]].js:193-199` |
| DELETE | `/api/admin/approvals/<email>` | Master | Deletes the profile. Learn and Quiz records are kept. Signing in again starts a new request. | `functions/api/[[path]].js:186-191` |

Guards for this block: admin check `:166`; a master account can only be changed by a master `:175`; "cannot change your own access" (400) for everything except the name route `:184`.

### B.4 Learn (`/api/learn/*`, `server/learn.js`)

Staff lock first: if the caller is not an admin and `LEARN_FOR_STAFF` is not exactly `"yes"`, `GET /api/learn` returns `[]` and every other Learn route returns 404 (`server/learn.js:68-70`).

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| GET | `/api/learn` | Approved (staff lock applies) | Module list with state (draft, review, live), SOP versions, minutes, question count and my progress. Staff get published modules only; restricted SOPs only for master. | `server/learn.js:72`, `:201-213` |
| GET | `/api/learn/scores` | Admin | Per module: approved people with read tick (current live SOP version), best %, attempts; top 3 most missed questions. | `server/learn.js:77-80`, `:240-268` |
| GET | `/api/learn/scores/<id>/<email>` | Admin | One person's attempts on one module, question by question. | `server/learn.js:73-76`, `:225-238` |
| POST | `/api/learn/attempts/<aid>/answer` | Approved, own attempt | Body `{ qid, choice }` (shown option index or null). Marks the current question, enforces seconds per question plus 5 s grace, returns correct, the correct shown index, "why", and the next question or the final result. Only one answer per question counts (compare on answer count). | `server/learn.js:81-84`, `:158-199` |
| POST | `/api/learn/<id>/create` | Admin | Creates an empty draft module for an existing SOP id. 409 if one exists. | `server/learn.js:88-96` |
| GET | `/api/learn/<id>` | Approved (staff lock; restricted SOP: master) | Module for reading: live content without quiz pool, keys or reasons, plus my progress. Admins see the draft if nothing is live yet. | `server/learn.js:104-112` |
| GET | `/api/learn/<id>?draft=1` | Admin | Full draft, who saved it and when, and the list of publish blockers. | `server/learn.js:105-108` |
| PUT | `/api/learn/<id>/draft` | Admin | Saves the draft. Body `{ content }`. Max 200,000 characters. Returns blockers. | `server/learn.js:114-125` |
| POST | `/api/learn/<id>/publish` | Admin | Copies draft to live and pins `sop_version` to the SOP's current version. Refused while any shape error or blocker remains, including any `[CONFIRM` text. | `server/learn.js:127-135`, `:304-338` |
| POST | `/api/learn/<id>/read` | Approved | Ticks "guide read" for the live SOP version. 409 unless the module is live. | `server/learn.js:137-142` |
| POST | `/api/learn/<id>/attempts` | Approved | Starts a quiz attempt: random questions from the pool, shuffled options. Returns the first question. 409 when draft or under review. | `server/learn.js:144-153` |

SOP version used by Learn: the first header chip that starts with `V<digit>`, else the `version` column, else V1.0 (`server/learn.js:270-274`). When the SOP's version differs from the module's pinned `sop_version`, the state is `review`.

### B.5 Quiz page (`/api/quizzes/*`, `server/quiz.js`)

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| GET | `/api/quizzes` | Approved | Sets (staff: published only) with title, minutes, count, max points, my past results and seconds left on an open attempt. Closes my expired attempts first. | `server/quiz.js:40`, `:217-229` |
| GET | `/api/quizzes/<id>` | Approved (draft sets: admin) | Set for taking without keys, guides or bands; my open attempt (resumed); my results. | `server/quiz.js:64-69` |
| POST | `/api/quizzes/<id>/attempts` | Approved | Resumes the open attempt, or starts one: shuffle by section when `shuffle = "section"`, options always shuffled, deadline = minutes (default 40). Admin on a draft or closed set gets a trial. Checks `maxAttempts`. | `server/quiz.js:71-99` |
| PUT | `/api/quizzes/attempts/<aid>` | Approved, own attempt | Body `{ qid, choice, explain, check }`. Choice must be one of the option sentences. Explain max 2,000 characters. `check` (feedback sets only) locks the answer and returns right or wrong. Refused after the deadline plus 15 s (and the attempt is then submitted). Compare-and-set on the stored answers. | `server/quiz.js:52`, `:151-171` |
| POST | `/api/quizzes/attempts/<aid>/submit` | Approved, own attempt | Marks choices by sentence and closes the attempt. Returns auto score, max, written count, trial flag. | `server/quiz.js:53-56`, `:175-188` |
| POST | `/api/quizzes/attempts/<aid>/mark` | Admin | Body `{ qid, pts }`, 0 to the question's written points. The written score is set once every written part has a mark. | `server/quiz.js:45-48`, `:284-299` |
| GET | `/api/quizzes/<id>/draft` | Admin | Full draft, publish blockers, draft and publish times, feedback flag. | `server/quiz.js:103-106` |
| POST | `/api/quizzes/<id>/publish` | Admin | Draft to live, `published_at` = now (also the version stamp), re-opens the set. Refused while blockers remain. | `server/quiz.js:107-113`, `:321-342` |
| POST | `/api/quizzes/<id>/close` | Admin | Body `{ closed: true\|false }`. Stops or allows new attempts. | `server/quiz.js:114-118` |
| POST | `/api/quizzes/<id>/settings` | Admin | Body `{ feedback: true\|false }`. Written into both draft and live content. | `server/quiz.js:119-124` |
| GET | `/api/quizzes/<id>/scores` | Admin | Closes everyone's expired attempts, then people x attempts (first, best, latest, to mark, open), top 3 missed, bands. Trials excluded. | `server/quiz.js:125-127`, `:233-260` |
| GET | `/api/quizzes/<id>/scores/<email>` | Admin | One person's attempts, question by question, with key, focus, written text, marking guide and mark. | `server/quiz.js:126`, `:264-282` |

### B.6 Glossary (`/api/glossary`, `server/glossary.js`)

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| GET | `/api/glossary` | Approved | All terms ordered by category, sort, term; `aka` and `context` parsed. | `server/glossary.js:11-14` |
| POST | `/api/glossary` | Admin | Create (no `id`, id = slug of term, 409 if it exists) or update (with `id`). Sets `updated_by`. | `server/glossary.js:16-29` |
| DELETE | `/api/glossary/<id>` | Admin | Deletes one term. | `server/glossary.js:30-34` |

### B.7 Everything else

| Method | Path | Who | What it does | file:line |
|---|---|---|---|---|
| any | any other `/api/...` | Approved | 404 `{ error: "not found" }` | `functions/api/[[path]].js:210` |
| GET | `/cdn-cgi/access/logout` | Cloudflare Access, not our code | Ends the Access session. Called by Sign out. | `src/lib/api.js:86-89` |
| GET | `/flowcharts/*` | Static files, behind Access (per code comments) | Original chart PNGs and own SVG illustrations. | `public/flowcharts/` |

---

## Appendix C. Content pipeline and scripts

### C.1 The master-copy rule

- **The app is the master copy** of every page edited in the in-app editor (docs/DECISIONS.md, 28 Sep 2026). Such rows have `sops.updated_by` set (the editor's email). `npm run sync` never overwrites their page text.
- **The repo is the source** for pages nobody has edited in the app (`updated_by` is NULL). Sync pushes repo changes to those rows.
- **Navigation placement always follows the repo** (section, domain, sort, keywords, status, restricted), even for app-edited rows (`db/sync.mjs:55-61`).
- **Learn modules, quiz sets and the glossary** are seeded from the repo as drafts or new rows only. After that the app is the master copy. Seed scripts never overwrite unless you name the id.
- **Culture sub pages** (5 Pillars, Doctrine, Redlines, SUCCESS) live only in D1. `db/culture/*.md` is a record of what was loaded (db/culture/README.md). No script in the repo loads them. How they were first inserted: Not confirmed from code.
- **Hand-written pages** in `src/content/handbook.js` (`PAGES`, for example `culture`) are rows produced by `toRows`. `npm run export` cannot write them back ("no markdown source ... edit lives in the app only").

Content sources now:

| Folder | What | Used by |
|---|---|---|
| `content/sop-book/*.md` | House-format SOP markdown (01 to 41, plus index) | `db/import-md.mjs` (via `MAP`), `db/export.mjs`, `db/templates-extract.mjs`, `db/charts-extract.mjs` |
| `content/pages/{start,hr,frameworks,libraries}/*.md` | Start Here, HR & People, Frameworks, Libraries pages | `db/import-md.mjs` (via `MAP`, paths like `../pages/hr/...`) |
| `content/sop-templates/<Folder>_SOP/` | Lark template drafts: `Template_DRAFT.xlsx`, `Flowchart_DRAFT.png`, `.svg`, `.html` | `db/templates-extract.mjs`, `db/charts-extract.mjs` |
| `src/content/handbook.js` | The catalog: `NAV` (sections, domains, items, statuses), hand-written `PAGES`, search `KEYWORDS` | `src/lib/content.js` `toRows` (sync, seed, preview) |
| `db/content/*.json` | Generated block JSON, one per mapped page (59 files today) | sync, seed, preview, `scripts/check-public.mjs` |
| `db/learn/*.json` | Learn module content `{ id, content }` (22 files) | `db/learn-seed.mjs`, check-public |
| `db/quiz/*.json` | Quiz sets `{ id, kind, content }` (1 file) | `db/quiz-seed.mjs` |
| `db/glossary.json` | `{ note, terms: [...] }` | `db/glossary-seed.mjs` |
| `db/culture/*.md` | Record of the culture sub pages | Reading only |

Note: the header comments of `templates-extract.mjs` and `charts-extract.mjs` still say `projects/sop-templates` and `projects/sop-book`; the code itself reads `content/sop-templates` and `content/sop-book`.

### C.2 How a repo SOP becomes a live page

1. Edit `content/sop-book/<NN>_<Name>.md` (or a `content/pages` file). A new page also needs a `MAP` entry in `db/import-md.mjs:18-83` and a catalog item in `src/content/handbook.js` `NAV`.
2. `db/import-md.mjs` reads the header lines above the first `---` (Owner, Version, Category, Last updated, Document code, Applies to) and converts the body with `parseBody` (`src/lib/markdown.js`) into blocks. It writes `db/content/<id>.json`.
3. `toRows` (`src/lib/content.js`) merges catalog, hand-written pages and imported bodies into flat rows in nav order (`sort` = position).
4. `db/sync.mjs` compares rows with live D1 and upserts only real changes, then verifies.

Markdown features `parseBody` understands: `##` / `###` headings, ` ```sop-header `, ` ```chart `, ` ```flow `, other code fences, `![alt](src)` images, pipe tables, bullet and numbered lists, `> [!tone|Title]` callouts, `[CONFIRM ...]` (becomes an orange "Pending confirmation" callout), open items (orange "Open item" callout). `parseBody` must stay byte-stable: any change shows up as a diff on every page in sync (`src/lib/markdown.js:1-6`).

### C.3 Every script and command

| Command | Reads | Writes | Local or remote | Safe to run? |
|---|---|---|---|---|
| `npm run dev` | `src/`, repo content (preview only) | Nothing | Local (Vite dev server) | Yes. Preview mode, nothing saved. |
| `npm run build` (`vite build && node scripts/check-public.mjs`) | `src/`, `public/`, `db/content`, `db/learn` | `dist/` | Local | Yes. Fails if content leaks into `dist/`. |
| `npm run preview` | `dist/` | Nothing | Local | Yes. Static shell only, no API. |
| `npm run pages:dev` (`wrangler pages dev dist --d1 DB=handbook`) | `dist/`, `functions/`, local D1 | Local D1 (`.wrangler/`) | Local | Yes. Uses the local database. |
| `npm run dev:full` (`wrangler pages dev dist --port 8788`) | as above | Local D1 | Local | Yes. CLAUDE.md suggests port 8789 with `node node_modules/wrangler/bin/wrangler.js pages dev dist --port 8789`. `DEV_EMAIL` in `.dev.vars` gives a local identity (localhost only). |
| `npm run deploy` | `dist/` after a build | Cloudflare Pages production (`--branch=main`) | **Remote** | Owner only. No dry run. |
| `npm run sync` (`node db/sync.mjs`) | `content/` via import-md, `db/content`, live `sops` | `db/content/*.json`, live `sops` rows | **Remote** (hard-coded `--remote`; no `--local` option) | Dry run first: `npm run sync -- --dry` (still reads live D1 and regenerates `db/content`, but pushes nothing). Never touches profiles, history, Learn, Quiz or Glossary. |
| `npm run sync -- --take-repo=<id>[,<id>]` | as above | Overwrites app-edited rows with the repo copy and sets `updated_by = NULL` | **Remote** | Destructive. Sync does not snapshot into History, so the current app text is lost unless exported first. |
| `npm run export` (`node db/export.mjs`) | Live `sops` where `updated_by` is not null | `content/sop-book/*.md` (and `content/pages` files via `MAP`) | Reads **remote**, writes local files | `npm run export -- --dry` lists what would be written. Writing is local only; commit the files after. Warns when a re-converted file would differ from D1. |
| `node db/import-md.mjs [sourceDir]` | `content/sop-book` (default) and `content/pages` via `MAP` | `db/content/<id>.json` | Local | Yes. Overwrites the generated JSON. |
| `node db/seed.mjs > db/seed.sql` | `db/content`, `src/content/handbook.js` | stdout (SQL `insert or replace` for every row) | Local | Yes to generate. Applying `seed.sql` to D1 with `insert or replace` would wipe `updated_by` and overwrite app edits: never apply it to the live database. |
| `node db/templates-extract.mjs` | `content/sop-templates/*/Template_DRAFT.xlsx`, `Flowchart_DRAFT.png` | With `--write`: `content/sop-book/*.md`, `public/flowcharts/<id>.png` | Local | Dry run by default. One-time migration; skips pages that already have a sop-header. All 37 mapped pages already have one. |
| `node db/charts-extract.mjs` | `content/sop-templates/*/Flowchart_DRAFT.svg`, `content/sop-book/*.md` | With `--write`: replaces the PNG image line with a ` ```chart ` block | Local | Dry run by default; reports doubts instead of guessing. One-time migration; 37 pages already have chart blocks and none still use the PNG line. |
| `node db/learn-seed.mjs` | `db/learn/*.json` | `learn_modules` drafts (new ids only) | **Remote** by default; `--local` for local | Adds drafts only, never live content. `--replace-draft=<id>[,<id>]` overwrites those drafts. No dry run. |
| `node db/learn-publish.mjs` | `learn_modules` join `sops` | With `--go`: `live`, `sop_version`, `published_by = 'claude-for-atl'` | **Remote** by default; `--local` | Dry run by default (lists ready, blocked, already live). `--go --only=a,b` limits ids. Same checks as the Publish button. CLAUDE.md: never add `--go` unless the owner asks. |
| `node db/quiz-seed.mjs` | `db/quiz/*.json` | `quiz_sets` drafts (new ids only) | **Remote** by default; `--local` | Drafts only. `--replace-draft=<id>` overwrites a draft. This is the only way to change quiz content. |
| `node db/glossary-seed.mjs` | `db/glossary.json` | `glossary` (new terms only) | **Remote** by default; `--local` | Adds new terms only. `--replace=<id>[,<id>]` overwrites those terms (and their admin edits). |
| `node scripts/check-public.mjs` | `db/content`, `db/learn`, `dist/` | Nothing | Local | Yes. Runs inside `npm run build`. |
| `wrangler d1 execute handbook --remote --file=db/<schema>.sql` | `db/schema.sql`, `learn.sql`, `quiz.sql`, `glossary.sql` | Creates tables if missing | **Remote** | `create table if not exists`, safe to re-run, but still a remote write: owner only. Use `--local` for a local database. |

All remote scripts call `node_modules/wrangler/bin/wrangler.js` with the current Node binary and the database name `handbook`, so they act on whatever Cloudflare account wrangler is logged into.

### C.4 Sync in detail (`db/sync.mjs`)

1. Runs `import-md.mjs` (regenerates `db/content`).
2. Builds rows with `toRows`.
3. Reads live `sops` (`id, body, meta, version, status, sort, keywords, title, section, domain, restricted, updated_by`).
4. Sorts rows into: new, changed, app-edited kept (text differs but `updated_by` is set), nav-only updates for app-edited rows, unchanged, and orphans (in D1, not in the repo, left alone).
5. Prints the report. `--dry` stops here.
6. Writes one SQL file to the temp folder and runs it with `--remote --yes`. New and changed rows are upserted with `updated_by = NULL`; nav-only rows get an `update` of the placement columns.
7. Verifies body, meta and sort for every non-kept row. Exit code 1 and "VERIFY FAILED" on a mismatch.

Never touched by sync: `profiles`, `sop_versions`, Learn, Quiz and Glossary tables, and `subbranch`.

### C.5 Export in detail (`db/export.mjs`)

For each app-edited row with a `MAP` entry: keep the markdown header above the first `---`, refresh the title line, `**Version:**` and `**Last updated:**` (the edit date in Malaysia time, with "edited in the Handbook App; previous: ..."), regenerate everything below from the live blocks with `toMarkdown`, drop the generated "Applies to" paragraph, then re-convert and compare with D1. After writing, commit; the next sync shows those rows as unchanged. `updated_by` stays set in D1, so the page stays app-owned.

### C.6 Build guard (`scripts/check-public.mjs`)

The app shell (`/`, `/assets/*`, `/login/`, `/privacy/`) is public, so the built files must not carry handbook content. The script collects probes: the process name from each page's sop-header (12+ characters), the first 40 characters of up to 3 long sentences per page in `db/content`, and the first 30 characters of quiz questions, reasons, card text and word meanings in `db/learn`. It scans `.js, .html, .css, .json, .txt, .map` files in `dist/`, skipping `dist/flowcharts`. Any hit fails the build with "PUBLIC BUILD CHECK FAILED".

Not probed: `db/quiz`, `db/glossary.json`, culture sub pages and the hand-written `PAGES` in `src/content/handbook.js`.

---

## Appendix D. Database tables in detail

D1 is SQLite. There are no foreign keys and no row-level security; the API is the only wall. All timestamps written with `datetime('now')` are UTC text `YYYY-MM-DD HH:MM:SS`; Quiz page times are ISO strings. JSON is stored as text.

### D.1 `profiles` (db/schema.sql:8-15)

Purpose: one row per person who has signed in through Access.

| Column | Type | Notes |
|---|---|---|
| `email` | text, primary key | Lower case (from the JWT). |
| `full_name` | text | Working nickname. Set by the person or an admin. |
| `role` | text, default `reader` | `reader`, `admin` or `master`. |
| `approved` | integer, default 0 | 0 pending, 1 approved, -1 rejected (the schema comment only lists 0 and 1). |
| `created_at` | text, default now | First sign-in. |
| `last_seen` | text | Last app open, written at most every 5 minutes. |

Written by: `ensureProfile` on first API call (`[[path]].js:216-225`), `/api/me` (last_seen), `/api/me/name`, the approval routes. Read by: every request (role and approval), Access Management, Learn and Quiz scores (approved people only).

### D.2 `sops` (db/schema.sql:17-36)

Purpose: every catalog entry and page. A row with a non-empty `body` is a real page; the rest render as status stubs.

| Column | Type | Notes |
|---|---|---|
| `id` | text, primary key | Slug, for example `birthday-bonus`. |
| `section` | text, not null | Start Here, SOP Book, HR & People, Frameworks & Strategy, Libraries. Unknown sections are skipped by the nav. |
| `domain` | text | SOP Book domain. |
| `subbranch` | text | For flat sections: the parent page id of a sub page. |
| `title` | text, not null | |
| `category` | text | Written by POST/PUT; not used by the reader. |
| `body` | text | JSON array of blocks. |
| `version` | text, default V1.0 | |
| `owner` | text, default ATL | Shown when there is no `meta`. |
| `restricted` | integer, default 0 | 1 = master only (the schema comment says "admins only"; the API says master). |
| `status` | text, default live | `live`, `planned`, `external`; catalog also uses `pending`. |
| `keywords` | text | Space-separated search words. |
| `meta` | text | JSON array of header chips, for example version, owner, "Updated 13 May 2026", "Change: ...". |
| `sort` | integer | Nav order, null last. |
| `updated_by` | text | Email of the last in-app editor; NULL means repo-owned. This is the master-copy flag. |
| `updated_at`, `created_at` | text, default now | |

Index: `sops_section_idx (section, domain)`. Written by: the editor and restore (API), `npm run sync`, seed SQL. Read by: every reader, Learn (title, version, meta, restricted), export.

### D.3 `sop_versions` (db/schema.sql:38-46)

Purpose: History. One snapshot of title, body and version taken just before each save or restore.

Columns: `id` (integer primary key autoincrement), `sop_id`, `title`, `body`, `version`, `edited_by` (who made the save that replaced this state), `edited_at` (default now). No index on `sop_id`. Written by: PUT and restore. Read by: the History screen (latest 50). Sync never writes here. Deleting a page leaves its snapshots.

### D.4 `learn_modules` (db/learn.sql:13-23)

Purpose: one Learn module per SOP; `id` equals the SOP's id.

Columns: `id` (text primary key), `draft` (JSON), `draft_by`, `draft_at`, `live` (JSON, null until first publish), `sop_version` (SOP version the live content was approved for), `published_by`, `published_at`, `sort`. Content JSON: `{ minutes, words: [[term, meaning]], tour: [cards], quiz: { count, pass, seconds, pool: [{ id, q, o: [options], a: index, why }] } }`.

Written by: create, draft save and publish routes; `learn-seed.mjs` (`draft_by = 'seed'`); `learn-publish.mjs` (`published_by = 'claude-for-atl'`). Read by: Learn screens, scores.

### D.5 `learn_reads` (db/learn.sql:26-32)

Purpose: "I've read this guide" ticks. Columns: `email`, `module_id`, `sop_version`, `read_at`. Primary key `(email, module_id, sop_version)`. A new SOP version needs a new tick. Written by `POST /api/learn/<id>/read`.

### D.6 `learn_attempts` (db/learn.sql:38-54)

Purpose: Learn quiz attempts, marked on the server one question at a time.

Columns: `id` (text primary key, UUID), `email`, `module_id`, `sop_version`, `plan` (JSON `[{ qid, order }]`), `answers` (JSON `[{ qid, choice, correct, at }]`), `served_at` (ISO, when the current question was sent), `score`, `total`, `pct` and `passed` (set when finished), `started_at`, `finished_at`. Indexes: `(email, module_id)`, `(module_id, finished_at)`. Kept when a profile is deleted.

### D.7 `quiz_sets` (db/quiz.sql:9-20)

Purpose: stand-alone assessments on the Quiz page.

Columns: `id` (text primary key), `kind` (default `practice`; `essay` planned), `draft`, `draft_by`, `draft_at`, `live`, `published_by`, `published_at` (also the version stamp of live content), `closed` (1 = no new attempts), `sort`. Content JSON: `{ title, intro, minutes, maxAttempts, ref, sections, questions, shuffle, feedback, bands }`; each question `{ id, sec, q, o: [sentences], a: key sentence, pts, focus, explain: { prompt, pts, rubric } }`. Written by: `quiz-seed.mjs`, publish, close, settings. No in-app content editor.

### D.8 `quiz_attempts` (db/quiz.sql:26-44)

Purpose: every Quiz page attempt.

Columns: `id` (UUID primary key), `email`, `set_id`, `version` (`published_at` of the live set, or `draft` for a trial), `trial` (1 = admin draft run, never counted), `plan` (JSON), `answers` (JSON `{ qid: { c, x, ok, locked } }`), `started_at`, `deadline`, `submitted_at`, `auto_score`, `mark_score` (null while written parts wait for marks; 0 when there are none), `max_score`, `marks` (JSON `{ qid: points }`), `marked_by`. Indexes: `(email, set_id)`, `(set_id, submitted_at)`. Kept when a profile is deleted.

### D.9 `glossary` (db/glossary.sql:6-16)

Purpose: the work glossary.

Columns: `id` (text primary key, slug of the term), `cat` (not null), `term` (not null), `aka` (JSON array, default `[]`), `meaning` (not null), `context` (JSON `[[task, meaning]]`, default `[]`), `sort` (default 0), `updated_by` (`seed` or an admin email), `updated_at`. Written by: `glossary-seed.mjs`, the glossary POST and DELETE routes. Read by everyone approved.

### D.10 Schema files and migrations

| File | Tables | Notes |
|---|---|---|
| `db/schema.sql` | profiles, sops, sop_versions | Commented migrations for `last_seen`, `meta`, `sort` on older databases. |
| `db/learn.sql` | learn_modules, learn_reads, learn_attempts | Safe to re-run. |
| `db/quiz.sql` | quiz_sets, quiz_attempts | Safe to re-run. |
| `db/glossary.sql` | glossary | Safe to re-run. |
| `db/seed.sql` | Data only (generated) | `insert or replace` into `sops`. Do not apply to live. |

---

## Appendix E. Access, login and roles

### E.1 What is protected and what is public

From the code comments (App.jsx:7-15, check-public.mjs, login page) the design is:

| Path | Protected by Access? | Why |
|---|---|---|
| `/`, `/index.html`, `/assets/*` | No, public | The shell must load so it can send signed-out people to the login page. It holds no content; the build guard enforces this. |
| `/login/` | No, public | Own sign-in page with the brand and one button. |
| `/privacy/` | No, public | Privacy notice for the Google sign-in screen. |
| `/api/*` | Yes | All data. Access runs Google sign-in and adds a signed JWT. |
| `/flowcharts/*` | Yes | Chart pictures and SVGs are content. Excluded from the build guard for that reason. |

The actual Cloudflare Access application (which paths, the identity provider, the policy) is set in the Zero Trust dashboard, not in code. README step 6 still describes one application over the whole domain plus `*.c9myr-rtn-handbook.pages.dev` preview URLs; the later code assumes path-level protection. Current dashboard setup: Not confirmed from code.

Sign-in flow:

1. Signed-out visit to `/`: `GET /api/me` is redirected by Access. `fetch` uses `redirect: 'manual'`, sees an opaque redirect and treats it as 401 (`src/lib/api.js:17-25`). The shell goes to `/login/?next=<hash>`.
2. "Sign in with Google" opens `/api/login?next=...`. Access intercepts, runs Google sign-in, and lets the request through with the JWT.
3. `/api/login` answers 302 to `/<next>`.
4. The shell calls `/api/me` again, now with the cookie and JWT.

### E.2 JWT verification (`functions/api/[[path]].js:227-268`)

The API reads the `Cf-Access-Jwt-Assertion` header. If it is present:

1. Needs `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`, else "access not configured".
2. Splits header, payload, signature; header `alg` must be `RS256`.
3. Gets the public key by `kid` from `https://<team domain>/cdn-cgi/access/certs`. Keys are cached in memory for 1 hour; an unknown `kid` forces a refresh.
4. Verifies the RSASSA-PKCS1-v1_5 SHA-256 signature over `header.payload`.
5. Checks `aud` contains `ACCESS_AUD`, `iss` equals `https://<team domain>`, `exp` is in the future, and `email` exists.
6. Returns the email in lower case.

Any failure returns 401 `invalid access token`. A forged email header gets nothing, because only the signed token counts.

No token: production treats the caller as unauthenticated (401 on everything except `/api/me`, which returns `{ email: null }`). Locally, `DEV_EMAIL` from `.dev.vars` is used only when the host is `localhost` or `127.0.0.1` (`[[path]].js:32-36`).

### E.3 Approval states and auto-approve

- First API call creates the profile (`ensureProfile`, `[[path]].js:216-225`).
- Emails ending in the company domain `@orionesofttech.com` are approved on first sign-in (`approved = 1`, role reader). Every other email starts pending (`approved = 0`).
- Pending: the waiting screen; may set a nickname; every other route returns 403.
- Rejected (`-1`): "Access declined"; cannot set a nickname; every other route returns 403.
- Deleting a profile (master) makes the person start again on next sign-in; a company email is approved again automatically.
- The Access policy must let a personal email through to the app for it to reach the pending screen at all. Whether the current policy allows any Google account or only an allowlist: Not confirmed from code. README says personal emails are "added to the policy allowlist (or approved in-app)".

### E.4 Roles

Role checks are in the API on every request (`[[path]].js:73-74`). The browser only hides buttons.

| Capability | Reader | Admin | Master |
|---|---|---|---|
| Read non-restricted pages, search, Present, Print | Yes | Yes | Yes |
| Glossary read | Yes | Yes | Yes |
| Quiz page: take published sets | Yes | Yes | Yes |
| Learn: read published guides, read ticks, quizzes | When `LEARN_FOR_STAFF = "yes"` | Always (drafts too) | Always |
| Set own nickname | Yes | Yes | Yes |
| Edit, save, History, Restore non-restricted pages | No | Yes | Yes |
| Create or delete pages through the API (no UI) | No | Yes (non-restricted) | Yes |
| Learn: create, edit draft, publish, Team scores, attempt reports | No | Yes | Yes |
| Quiz: trial a draft, publish, close, feedback switch, scores, mark written parts | No | Yes | Yes |
| Glossary add, edit, delete | No | Yes | Yes |
| Access Management: list, approve or reject pending, approve rejected, edit nicknames | No | Yes, except master accounts | Yes |
| Change an approved person's approval | No | No | Yes |
| Change roles | No | No | Yes |
| Delete people | No | No | Yes |
| Restricted pages: see in nav, read, edit, restore, delete, create as restricted | No | No | Yes |
| Learn modules on restricted SOPs | No | No | Yes |
| Change own access | No | No | No (400) |

docs/DECISIONS.md (4 Oct 2026) records the same split. README "Access model" still says roles are reader and admin only and restricted entries are admin-only; the code says master.

### E.5 Restricted pages behaviour

- `GET /api/sops` leaves restricted rows out for non-masters, so admins and readers do not see them in the sidebar, search or Home.
- `GET /api/sops/<id>` returns 403 "restricted" for non-masters; all write and history routes do the same (`[[path]].js:88, 93-96`).
- POST and PUT only keep `restricted = 1` when the caller is master; otherwise they write 0. Admins cannot reach a restricted row in the first place, so this only matters for creating pages.
- A restricted catalog entry without a body renders as the stub "Only admins can see this page." even for the master. The catalog has 4 such entries today. The in-app editor only opens pages that already have blocks, so there is no in-app way to give a stub its first body. Intended route for that content: Not confirmed from code.
- In the repo catalog, `status: 'restricted'` becomes `restricted = 1, status = 'live'` (`src/lib/content.js:25`).

---

## Appendix F. Troubleshooting

Remote checks in this table are reads. Any remote write (SQL update, sync, seed, deploy) is for the app owner only.

| # | Symptom | Likely cause | How to check | Fix |
|---|---|---|---|---|
| 1 | User stuck on "Almost there" (pending) | Personal email, not yet approved; or approved but the page was not reloaded (no polling). | Access Management, "Waiting for approval". Or read-only: `select email, approved, role from profiles where email = '<email>'` with `wrangler d1 execute handbook --remote --command ...`. | An admin approves in Access Management, then the user reloads. If they were approved before and are stuck, check `approved` is exactly 1. |
| 2 | User sees "Access declined" | `approved = -1` (rejected). | Access Management, "Rejected" list. | Admin or master presses Approve on the rejected row. Master can also Delete so the next sign-in starts fresh. |
| 3 | App Launcher or Access "NoAuth / You do not have access" page after Google sign-in | Sign-in started on the team domain instead of the app (no app to return to); or the Access policy does not include that email; or the path is not covered by the Access application. | Ask which URL they opened. Check the Access application and policy in Zero Trust (not in code). Check Access logs for a policy deny. | Open the app root URL and use "Sign in with Google" (it goes through `/api/login`). Add the email or domain to the Access policy (owner only). |
| 4 | 401 from the API, or a loop back to `/login/` | (a) `invalid access token`: `ACCESS_AUD` or `ACCESS_TEAM_DOMAIN` does not match the Access app (for example the app was recreated and got a new AUD), the token expired, or the certs fetch failed. (b) `unauthenticated`: no JWT reached the Function because `/api/*` is not behind Access on that hostname (for example a preview URL). | Browser devtools, Network, the `/api/me` response body. Compare `wrangler.toml [vars]` with the Access app's Application Audience tag. | Correct `[vars]` and redeploy (owner). Cover `/api/*` on every hostname staff use with the Access application. Sign out and in again for an expired session. |
| 5 | Page shows a "bundled copy" banner | No such banner exists in the current code. The only similar notice is "Preview mode: sample content only" (dev builds only, App.jsx:51). `src/lib/imported.js` still mentions an "offline fallback", but production shows "Couldn't load the handbook" instead. So the banner means an old app shell is being served. | Check the live bundle hash (row 12) and the `Cache-Control` header on `/`. | Treat as a stale shell (row 6). The exact old banner wording and when it was removed: Not confirmed from code. |
| 6 | Stale app shell after a deploy (old screens, missing new features, blank page from missing old assets) | `index.html` cached by the browser or a proxy. `public/_headers` sets `Cache-Control: no-cache` on `/` and `/index.html`, and long immutable caching only on `/assets/*`. If `_headers` is missing from `dist/` the rule is lost. | `curl -sI https://c9myr-rtn-handbook.pages.dev/` and look for `cache-control: no-cache`. Check `dist/_headers` exists after build. | Keep `public/_headers` (Vite copies it to `dist/`). Redeploy. User does a hard reload. Never put long caching on `/` or `/index.html`. |
| 7 | `npm run build` fails with "PUBLIC BUILD CHECK FAILED" | Handbook text reached the public bundle: a static import of `src/content/handbook.js`, `src/lib/content.js`, `src/lib/imported.js` or `db/content`/`db/learn` JSON into app code; SOP or Learn sentences typed into a component; or content placed in `public/` outside `flowcharts/`. | The error lists up to 20 hits as `file: "probe"`. | Remove the import or text. Content must only arrive from `/api`. Preview content stays behind the `import.meta.env.DEV` dynamic import in App.jsx. |
| 8 | Sync reports "= <id> edited in the app, kept" (it seems to want to overwrite an app edit) | The row has `updated_by` set, so the app owns its text. Sync never overwrites it by default. | `npm run sync -- --dry` lists every kept row and the columns that differ. | Normal case: `npm run export` (try `-- --dry` first), review and commit the markdown; the next sync shows the row as unchanged. Only if the repo copy must win: `npm run sync -- --take-repo=<id>` (owner only). It does not snapshot into History, so export first if the app text may be needed. |
| 9 | Chart does not render, or shows "This chart is empty" | The ` ```chart ` fence is malformed (must be exactly ` ```chart ` on its own line and closed by ` ``` `), or no line starts with `start:`, `step:`, `check:`, `escalate:`, `stop:` or `end:` (other lines are ignored). An image chart fails when `/flowcharts/<id>.png` is missing or Access blocks it. | Open Edit on the page and look at the chart text, or open the Chart drawer and its preview. For images, open `/flowcharts/<file>` directly. Chart review (`#/charts`) compares the original and the drawn chart. | Fix the block in the editor or Chart drawer and save. Add the missing PNG to `public/flowcharts/` and deploy (owner). |
| 10 | Learn missing for staff (no Learn link, empty list) | `LEARN_FOR_STAFF` is not exactly `"yes"` in the deployed vars; or no module is published (drafts are admin-only); or the SOP is restricted. Admins always see Learn, so test with a reader account. | `wrangler.toml [vars]`; Pages project settings for overriding vars (Not confirmed from code whether any dashboard vars exist); Learn home as admin shows Draft chips. | Set `LEARN_FOR_STAFF = "yes"` and redeploy (owner). Publish the module (admin, Learn module page). |
| 11 | Learn quiz says "paused" or the guide shows "under review" | The SOP's version chip changed (any editor save with a new version), so `sop_now` no longer equals the module's pinned `sop_version`. New attempts are refused (409). | Learn module page: "Based on SOP Vx", "SOP now Vy". Admin panel shows the state. | Admin reviews the draft against the new SOP, saves it, and publishes for the new version. Read ticks restart for the new version. |
| 12 | Learn publish refused ("Not published. Fix these first") | Shape errors (fewer questions than `count`, duplicate ids, incomplete questions) or blockers (missing word meanings, empty cards, gate without both answers, ladder without rows or cap, any `[CONFIRM` text). | Admin panel and the Learn editor list each blocker. `node db/learn-publish.mjs` (dry run) lists blocked modules with reasons. | Fix in the Learn editor and save. Never remove a `[CONFIRM ...]` note without a real answer. |
| 13 | Quiz scores missing or lower than expected | Trial runs are excluded; only approved profiles are listed (deleted people's attempts are kept but hidden); attempts still open are shown as "(in progress)" until the deadline passes; written parts not yet marked (score shows choices only, band says "after marking"); Learn "Read" counts only the current SOP version. | Quiz scores "To mark" column; open the person's attempt report. Learn Team scores for the module. | Mark the written parts. Wait for the deadline or reload Scores (it closes expired attempts). Re-approve a deleted person if their history must show. |
| 14 | Restricted page empty or missing | Non-masters never receive restricted rows, so it is missing for them by design. For the master, a restricted catalog entry with no body shows the stub "Only admins can see this page." | Check the role in Access Management. Read-only: `select id, restricted, length(body) from sops where restricted = 1`. | Working as intended for non-masters. For content, see E.5 (no in-app path to a first body). |
| 15 | Deploy mismatch (live app does not match the build) | Deployed from an old `dist/`, deployed to a preview branch, or the deploy failed. `npm run deploy` always builds and deploys `--branch=main`. | Compare `curl -s https://c9myr-rtn-handbook.pages.dev/ \| grep -o "index-[A-Za-z0-9_-]*\.js"` with the file in `dist/assets`. PowerShell: `(Invoke-WebRequest https://c9myr-rtn-handbook.pages.dev/ -UseBasicParsing).Content -match 'index-[A-Za-z0-9_-]*\.js'; $Matches[0]`. | Rebuild and redeploy (owner). Confirm the Pages production branch is `main` in the dashboard (Not confirmed from code). |
| 16 | "Your answer was not saved. Try again." or "That answer was already recorded." | Compare-and-set protection: two saves raced (Quiz page) or a double click or replay (Learn). | Usually harmless. | Retry the action; reload to resume the attempt. |
| 17 | Editor Save button stays disabled | The row has not loaded (`GET /api/sops/<id>` failed or is slow), or nothing changed. | Network tab for `/api/sops/<id>`. | Wait or reload. A 403 means the user is not an admin, or the page is restricted and the user is not master. |

---

## Appendix G. Read next

| File | Why |
|---|---|
| `CLAUDE.md` | Owner and permissions after handover, commands, where things are, working rules. |
| `README.md` | Stack, original setup steps (Access, D1 binding), sync basics. Parts are older than the code (roles, Access scope, next steps). |
| `CONTENT.md` | Content authority order, intake of outside content, house style, content types, training and slide rules, Rule log. |
| `DESIGN.md` | Visual and behaviour rules: tokens, type, layout, components, charts, accessibility, print, pre-ship checklist. |
| `docs/DECISIONS.md` | Settled product, Learn, Quiz, access and SOP version decisions, plus open items that are not settled. |
| `docs/BACKLOG.md` | Work queue with Ready, Waiting and Review items. |
| `docs/sessions/README.md` | Session note format; notes before 28 Oct 2026 are not in the repo. |
| `db/culture/README.md` | Culture sub page sources and the SUCCESS intake change log. |
| `db/schema.sql`, `db/learn.sql`, `db/quiz.sql`, `db/glossary.sql` | Table definitions with comments and migrations. |
| `functions/api/[[path]].js` | Auth, roles, SOP and approval routes in one file. |
| `server/learn.js`, `server/quiz.js` | Learn and Quiz integrity rules, listed at the top of each file. |
| `db/sync.mjs`, `db/export.mjs` | The master-copy rule in code. |
| `src/lib/markdown.js` | The markdown and block format shared by import, editor and export. |
| `src/Chart.jsx` | Chart text grammar (top comment) and layout rules. |
| `scripts/check-public.mjs` | What the build guard checks and what it does not. |
| `wrangler.toml`, `public/_headers` | Bindings, Access vars, the Learn switch, cache rules. |
