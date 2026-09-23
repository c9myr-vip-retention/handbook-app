-- C9MYR Handbook: Cloudflare D1 (SQLite) schema.
-- Apply once:  wrangler d1 execute handbook --remote --file=db/schema.sql
--
-- Access control is NOT in the database (D1 has no row-level security). The
-- Pages Function (functions/api) enforces reader/admin/restricted on every
-- request. This schema just stores the data.

create table if not exists profiles (
  email      text primary key,
  full_name  text,
  role       text not null default 'reader',   -- reader | admin
  approved   integer not null default 0,        -- 0 pending, 1 approved
  created_at text not null default (datetime('now'))
);

create table if not exists sops (
  id         text primary key,
  section    text not null,        -- Start Here | SOP Book | HR & People | Frameworks & Strategy | Libraries
  domain     text,                 -- SOP Book domain
  subbranch  text,
  title      text not null,
  category   text,
  body       text,                 -- JSON string: array of content blocks
  version    text not null default 'V1.0',
  owner      text not null default 'ATL',
  restricted integer not null default 0,   -- 1 = admins only
  status     text not null default 'live',  -- live | planned | external
  keywords   text,                 -- space-separated search synonyms
  updated_by text,
  updated_at text not null default (datetime('now')),
  created_at text not null default (datetime('now'))
);
create index if not exists sops_section_idx on sops (section, domain);

create table if not exists sop_versions (
  id        integer primary key autoincrement,
  sop_id    text,
  title     text,
  body      text,
  version   text,
  edited_by text,
  edited_at text not null default (datetime('now'))
);

-- After you sign in once through Access, make yourself admin:
--   update profiles set role = 'admin', approved = 1 where email = 'aldok.ma@orionesofttech.com';
