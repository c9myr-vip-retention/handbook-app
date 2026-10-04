-- Work glossary: niche terms with plain meanings, shown on #/glossary.
-- Seeded from db/glossary.json by db/glossary-seed.mjs; after that admins edit
-- in the app (the app is the master copy).
--   aka     = JSON array of other names and short forms (used for search and "Used in")
--   context = JSON array of [task, meaning] pairs when the meaning differs by task
create table if not exists glossary (
  id          text primary key,
  cat         text not null,
  term        text not null,
  aka         text not null default '[]',
  meaning     text not null,
  context     text not null default '[]',
  sort        integer not null default 0,
  updated_by  text,
  updated_at  text not null default (datetime('now'))
);
