-- Learn section: training guides and quizzes built on top of the SOP Book.
-- Apply once (safe to re-run):
--   npx wrangler d1 execute handbook --remote --file=db/learn.sql
--
-- The SOP Book stays the official rule. A module is tied to the SOP version it
-- was written for (sop_version). When the SOP's version moves on, the API treats
-- the module as "under review" and refuses new quiz attempts until an admin
-- publishes content for the new version.

-- One row per module; id = the SOP's id (for example birthday-bonus).
-- content = JSON: { minutes, words, tour, quiz: { count, pass, seconds, pool } }.
-- draft is what admins (and later the AI update job) edit; live is what staff see.
create table if not exists learn_modules (
  id            text primary key,
  draft         text,                 -- JSON, editable
  draft_by      text,
  draft_at      text,
  live          text,                 -- JSON, null until first publish
  sop_version   text,                 -- SOP version the live content was approved for
  published_by  text,
  published_at  text,
  sort          integer
);

-- "I've read this guide" ticks, per person, module and SOP version.
create table if not exists learn_reads (
  email       text not null,
  module_id   text not null,
  sop_version text not null,
  read_at     text not null default (datetime('now')),
  primary key (email, module_id, sop_version)
);

-- Quiz attempts. Questions are picked and marked on the server; the browser
-- never receives the answers before someone answers.
-- plan = JSON: [{ qid, order: [option indexes as shown] }]
-- answers = JSON: [{ qid, choice (original option index or null), correct, at }]
create table if not exists learn_attempts (
  id          text primary key,
  email       text not null,
  module_id   text not null,
  sop_version text not null,
  plan        text not null,
  answers     text not null default '[]',
  served_at   text not null,          -- when the current question was sent (ISO)
  score       integer not null default 0,
  total       integer not null,
  pct         integer,                -- set when finished
  passed      integer,                -- 1 / 0 when finished
  started_at  text not null default (datetime('now')),
  finished_at text
);
create index if not exists learn_attempts_by_person on learn_attempts (email, module_id);
create index if not exists learn_attempts_by_module on learn_attempts (module_id, finished_at);
