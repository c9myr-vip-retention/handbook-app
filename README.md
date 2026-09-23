# C9MYR Handbook

Staff handbook app for the C9MYR VIP Retention department. Readers browse SOPs, policies and culture; admins edit and add content in the app. Same platform as the VVIP Tracker: React + Vite front end, Cloudflare Pages + D1 + Access back end.

## Stack
- React 18 + Vite 5 (front end)
- Cloudflare Pages (hosting) + Pages Functions (`functions/api`, the API)
- Cloudflare D1 (SQLite database)
- Cloudflare Access / Zero Trust (Google login + who is allowed in)

## Access model
- Google sign-in via Cloudflare Access. No auth code, no passwords to hand out.
- Access policy auto-allows `@orionesofttech.com`; personal emails are added to the policy allowlist (or approved in-app).
- Roles: `reader` (read) and `admin` (edit, add, approve). Everyone starts as reader.
- D1 has no row-level security, so the API in `functions/api` enforces reader/admin/restricted on every request.

## Setup
1. Install and log in:
   ```
   npm install
   npx wrangler login
   ```
2. Create the database and paste its id into `wrangler.toml`:
   ```
   npx wrangler d1 create handbook
   ```
3. Apply the schema:
   ```
   npx wrangler d1 execute handbook --remote --file=db/schema.sql
   ```
4. Deploy (builds and uploads the app plus the API):
   ```
   npm run deploy
   ```
5. In the Cloudflare dashboard, bind the D1 database to the Pages project: Pages > handbook-app > Settings > Functions > D1 bindings, add `DB` -> `handbook`.
6. Zero Trust > Access > Applications: add an application for the Pages URL. Identity provider Google. Policy: allow emails ending `@orionesofttech.com`, plus include the specific personal emails you approve.
7. Sign in once, then make yourself admin (D1 console or `wrangler d1 execute`):
   ```
   update profiles set role = 'admin', approved = 1 where email = 'aldok.ma@orionesofttech.com';
   ```

## Local development
- `npm run dev` runs the front end only. With no Access in front, `/api/me` returns no email and the app shows the reader UI in preview mode.
- `npm run pages:dev` runs Pages + Functions + D1 locally to exercise the API.

## Security notes
- Access is the login wall; the API is the data wall. Even if someone reaches the API, they only get what their role allows, and only admins can write. Restricted entries (for example Panic Switch) are admin-only.
- No secrets live in this repo. Access and D1 bindings are configured in Cloudflare, not in code.

## Next steps
- Import the 20 ready SOPs into D1 (content is modelled as blocks in `src/content/handbook.js`, same shape as `sops.body`).
- Wire the reader pages and search to `/api/sops`, then build the admin editor.
- Write the 11 planned SOPs; import or link the 5 Lark-only ones.
