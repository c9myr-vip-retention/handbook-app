-- C9MYR Handbook: database schema + Row-Level Security (RLS).
-- Run this in the Supabase SQL editor once, after creating the project.
-- RLS is the whole security wall: the browser only ever gets what these
-- policies allow, regardless of what the UI shows.

-- ---------------------------------------------------------------------------
-- profiles: one row per signed-in user, holds role + approval
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'reader' check (role in ('reader', 'admin')),
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- On sign-up, create the profile. Company-domain emails are auto-approved;
-- everyone else lands unapproved (pending) until an admin approves them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    (new.email ilike '%@orionesofttech.com')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers used by policies.
create or replace function public.is_approved()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved);
$$;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved);
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Users cannot change their own role/approval. Only admins update profiles
-- (this is how approvals and admin promotion happen).
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- sops: the handbook content (SOPs, culture, policies, everything readable)
-- ---------------------------------------------------------------------------
create table if not exists public.sops (
  id         uuid primary key default gen_random_uuid(),
  section    text not null,                 -- Start Here | SOP Book | HR & People | Frameworks & Strategy | Libraries
  domain     text,                          -- SOP Book domain, e.g. Engagement Outreach
  subbranch  text,                          -- e.g. Player Targeting
  title      text not null,
  category   text,
  body       jsonb,                         -- structured content: sections, tables, steps
  version    text default 'V1.0',
  owner      text default 'ATL',
  restricted boolean not null default false,-- true = admins only (e.g. Panic Switch)
  status     text not null default 'live' check (status in ('live', 'planned', 'external')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists sops_section_idx on public.sops (section, domain);

alter table public.sops enable row level security;

-- Approved readers see non-restricted, live/external entries. Admins see all.
drop policy if exists "sops read" on public.sops;
create policy "sops read" on public.sops
  for select using (
    public.is_admin() or (public.is_approved() and restricted = false)
  );

-- Only admins can create, edit, or delete. Hiding buttons in the UI is not
-- security; this is what actually enforces it.
drop policy if exists "sops insert" on public.sops;
create policy "sops insert" on public.sops for insert with check (public.is_admin());
drop policy if exists "sops update" on public.sops;
create policy "sops update" on public.sops for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sops delete" on public.sops;
create policy "sops delete" on public.sops for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- sop_versions: edit history, so nothing is silently lost
-- ---------------------------------------------------------------------------
create table if not exists public.sop_versions (
  id        uuid primary key default gen_random_uuid(),
  sop_id    uuid references public.sops(id) on delete cascade,
  title     text,
  body      jsonb,
  version   text,
  edited_by uuid references auth.users(id),
  edited_at timestamptz not null default now()
);
alter table public.sop_versions enable row level security;
drop policy if exists "sop_versions admin" on public.sop_versions;
create policy "sop_versions admin" on public.sop_versions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- First admin: after you sign in once, run this with your email to become admin.
--   update public.profiles set role = 'admin', approved = true
--   where email = 'aldok.ma@orionesofttech.com';
-- ---------------------------------------------------------------------------
