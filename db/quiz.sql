-- Quiz page (#/quizzes): stand-alone assessments, not tied to an SOP.
-- Apply once (safe to re-run):
--   npx wrangler d1 execute handbook --remote --file=db/quiz.sql
--
-- kind: practice = multiple choice, marked on the server; essay = written
-- answers (planned). Answer keys are stored as the option sentence, never as a
-- letter, so the options can be shuffled per person.
-- content = JSON: { title, intro, minutes, maxAttempts, ref, sections, questions }.
create table if not exists quiz_sets (
  id            text primary key,
  kind          text not null default 'practice',
  draft         text,                 -- JSON, editable
  draft_by      text,
  draft_at      text,
  live          text,                 -- JSON, null until first publish
  published_by  text,
  published_at  text,                 -- also the version stamp of the live content
  closed        integer not null default 0,  -- 1 = no new attempts
  sort          integer
);

-- One row per attempt. plan = JSON [{ qid, order: [option indexes as shown] }].
-- answers = JSON { qid: { c: chosen sentence or null, x: written reason, ok: 1/0 after submit } }.
-- marks = JSON { qid: points } given by an admin for written reasons.
-- trial = 1 for an admin's run of a draft; never counted in scores.
create table if not exists quiz_attempts (
  id            text primary key,
  email         text not null,
  set_id        text not null,
  version       text,
  trial         integer not null default 0,
  plan          text not null,
  answers       text not null default '{}',
  started_at    text not null,         -- ISO
  deadline      text not null,         -- ISO
  submitted_at  text,                  -- ISO; set on submit or when the clock ran out
  auto_score    integer,
  mark_score    integer,
  max_score     integer,
  marks         text not null default '{}',
  marked_by     text
);
create index if not exists quiz_attempts_by_person on quiz_attempts (email, set_id);
create index if not exists quiz_attempts_by_set on quiz_attempts (set_id, submitted_at);
