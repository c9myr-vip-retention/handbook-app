# C9MYR Handbook

Staff handbook app for the C9MYR VIP Retention department. Readers browse SOPs, policies, and culture; admins edit and add content in the app. React + Vite front end, Supabase back end (auth, database, row-level security).

This is the skeleton: login, an approval gate, and the app frame. The content model and the full reader/admin UI (ported from the prototype) come next.

## Stack
- React 18 + Vite 5 (front end)
- Supabase: Google sign-in, Postgres, Row-Level Security

## Access model
- Google sign-in. No passwords to hand out, no accounts to create.
- Company emails (`@orionesofttech.com`) are auto-approved as readers.
- Personal emails land pending until an admin approves them.
- Roles: `reader` (read) and `admin` (edit, add, approve). Everyone starts as reader.
- All of this is enforced in the database by RLS, not by the UI. See `supabase/schema.sql`.

## Setup
1. Install dependencies:
   ```
   npm install
   ```
2. Create a Supabase project at https://supabase.com.
3. In the Supabase SQL editor, run the contents of `supabase/schema.sql`.
4. In Supabase, enable the Google auth provider (Authentication > Providers > Google) and add your Google OAuth client ID and secret. Add your app URL to the allowed redirect URLs.
5. Copy `.env.example` to `.env` and fill in your project URL and anon/publishable key (Project Settings > API).
6. Run the app:
   ```
   npm run dev
   ```
7. Sign in once, then make yourself admin (SQL editor):
   ```
   update public.profiles set role = 'admin', approved = true
   where email = 'aldok.ma@orionesofttech.com';
   ```

## Security notes
- The anon/publishable key is public by design and ships in the browser. It is not a secret.
- Never put the `service_role` key in this repo or the app.
- The security wall is RLS: readers only ever receive non-restricted content, and only admins can write. Restricted entries (for example Panic Switch) are admin-only.

## Next steps
- Content model: map each handbook sheet into `sops` rows (title, section, domain, body as structured JSON).
- Port the prototype UI into reader pages and the admin editor.
- Import the 20 ready SOPs; write the 11 planned; import or link the 5 Lark-only.
- Hosting: GitHub Pages (set `base` in `vite.config.js` to `/handbook-app/`) or Cloudflare Pages.
