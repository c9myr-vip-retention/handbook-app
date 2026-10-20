# CLAUDE.md: C9MYR VIP Retention Handbook App

Staff handbook for the C9MYR VIP Retention department: SOP Book, Culture & Conduct, Learn (guides and quizzes), Quiz page (assessments), Glossary. Live at https://c9myr-rtn-handbook.pages.dev behind Cloudflare Access. Real staff use it daily.

## Owner and permissions
- Owner (1st PIC): the Team B ATL. There is no 2nd PIC at the moment.
- Only the ATL approves app code deploys and changes roles, Access or Google sign-in settings.
- The Consultant agent (`handbook-consultant`) prepares Learn publishes and answered SOP fixes, and runs them on the live database only after the ATL says "deploy". Its limits are in its agent file and docs/DECISIONS.md.
- The Executor (`handbook-dev`) and any unattended scheduled run work on a branch, test locally, and report. They never deploy, never run `--remote` writes, never publish, never merge to `master`.

## Read before any change
@DESIGN.md
@CONTENT.md
@docs/DECISIONS.md
@../personal-assistant/knowledge/15-company-culture.md

Open work: `docs/BACKLOG.md`. Recent history: the newest notes in `../personal-assistant/projects/session-notes/` that mention the Handbook.

## Stack
- React 18 + Vite 5 front end (`src/`), Cloudflare Pages Functions API (`functions/api/[[path]].js`, `server/*.js`), Cloudflare D1 database `handbook`.
- Identity: Cloudflare Access JWT, verified in the API. Roles in D1: reader < admin < master.
- The app shell is public and must hold no handbook content. `npm run build` runs `scripts/check-public.mjs`, which fails on any SOP text in `dist/` (`/flowcharts/` is excluded because it sits behind Access).

## Commands (PowerShell 5.1: chain with `;`, never `&&`)
- Build: `npm run build`
- Local full stack (local D1, `DEV_EMAIL` admin from `.dev.vars`): build, then `node node_modules/wrangler/bin/wrangler.js pages dev dist --port 8789`. In the desktop app use launch config "handbook-fullstack-alt".
- Deploy (ATL only): `npm run deploy`. Verify by the live bundle hash: `curl -s https://c9myr-rtn-handbook.pages.dev/ | grep -o "index-[A-Za-z0-9_-]*\.js"` must match `dist/assets`.
- Learn content: `node db/learn-seed.mjs` loads `db/learn/*.json` as DRAFTS. `node db/learn-publish.mjs` is a dry run; never add `--go` unless the ATL asks.
- Quiz content: `node db/quiz-seed.mjs [--replace-draft=<id>]` loads `db/quiz/*.json` as drafts.
- SOP sync from the repo: `npm run sync` (`-- --dry` to preview). The app is the master copy: sync never overwrites a page edited in the app.
- Every script takes `--local` for the local database. Test with `--local` first.

## Where things are
- Pages and navigation: `src/Handbook.jsx` (routes, sidebar, Page, Present mode, sub pages), `src/lib/rows.js` (nav from D1 rows; `sops.subbranch` = parent page id for sub pages).
- Learn: `src/Learn.jsx`, `src/LearnEditor.jsx`, `server/learn.js`, `db/learn/`.
- Quiz page: `src/Quizzes.jsx`, `server/quiz.js`, `db/quiz/`.
- Glossary: `src/Glossary.jsx`, `server/glossary.js`.
- Culture page sources (record only, the app is master): `db/culture/`.
- Styles and tokens: `src/styles.css` (tokens at the top; follow DESIGN.md).

## Working rules
- Small, reviewable changes. One feature per branch: `agent/<short-name>`.
- Test in the local full stack before reporting done; check light and dark mode and a 375 px phone width.
- No em dashes anywhere. Sentence case. Role titles only in content (ATL, Supervisor, Senior), never staff names. No player data, credentials or financial data in the repo.
- Never mark OPEN, UNCONFIRMED or CONFLICT content as fact. Use `[CONFIRM ...]`; it blocks publishing.
- Answers to the ATL are short: what was done, what is blocking, one question.
- At the end of a session, write a short note in `../personal-assistant/projects/session-notes/YYYY-MM-DD-<topic>.md` and update `docs/BACKLOG.md`.
