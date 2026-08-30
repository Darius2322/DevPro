-- Run this against your existing DevPro Supabase project (in addition to
-- 002_profile_onboarding.sql, if you haven't already). Safe to run more
-- than once — every statement is idempotent or uses IF NOT EXISTS.

-- ─────────────────────────────────────────────────────────────
-- PROJECT EXTENSIONS: structured tech stack + SDLC + progress
-- ─────────────────────────────────────────────────────────────
alter table projects add column if not exists languages text[] not null default '{}';
alter table projects add column if not exists databases_used text[] not null default '{}';
alter table projects add column if not exists frameworks text[] not null default '{}';
alter table projects add column if not exists sdlc_methodology text;
alter table projects add column if not exists progress_percent int not null default 0 check (progress_percent between 0 and 100);

create table if not exists project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table project_milestones enable row level security;

drop policy if exists "project_milestones: select if project access" on project_milestones;
create policy "project_milestones: select if project access" on project_milestones
  for select using (public.has_project_access(project_id));
drop policy if exists "project_milestones: insert if project access" on project_milestones;
create policy "project_milestones: insert if project access" on project_milestones
  for insert with check (public.has_project_access(project_id));
drop policy if exists "project_milestones: update if project access" on project_milestones;
create policy "project_milestones: update if project access" on project_milestones
  for update using (public.has_project_access(project_id));
drop policy if exists "project_milestones: delete if project access" on project_milestones;
create policy "project_milestones: delete if project access" on project_milestones
  for delete using (public.has_project_access(project_id));

-- ─────────────────────────────────────────────────────────────
-- HOSTING (one record per project)
-- ─────────────────────────────────────────────────────────────
create table if not exists hosting (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  provider text,
  hosting_url text,
  build_command text,
  deploy_command text,
  env_notes text,
  last_deploy_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hosting enable row level security;

drop policy if exists "hosting: select if project access" on hosting;
create policy "hosting: select if project access" on hosting for select using (public.has_project_access(project_id));
drop policy if exists "hosting: insert if project access" on hosting;
create policy "hosting: insert if project access" on hosting for insert with check (public.has_project_access(project_id));
drop policy if exists "hosting: update if project access" on hosting;
create policy "hosting: update if project access" on hosting for update using (public.has_project_access(project_id));
drop policy if exists "hosting: delete if project access" on hosting;
create policy "hosting: delete if project access" on hosting for delete using (public.has_project_access(project_id));

drop trigger if exists hosting_touch on hosting;
create trigger hosting_touch before update on hosting for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- AI ACCOUNTS (global, per-user — which AI subscriptions you have, not
-- per-project usage; that's still the existing `ai_usage` table)
-- ─────────────────────────────────────────────────────────────
create table if not exists ai_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  account_label text,
  plan text,
  resets_at timestamptz,
  reset_cadence text, -- e.g. 'daily', 'weekly', 'monthly' — for display when resets_at isn't a fixed date
  notes text,
  created_at timestamptz not null default now()
);

alter table ai_accounts enable row level security;

drop policy if exists "ai_accounts: all own" on ai_accounts;
create policy "ai_accounts: all own" on ai_accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- CONNECTIONS (global, per-user — manually recorded linked accounts.
-- Real OAuth would need a registered app + backend per provider; this is
-- a record-keeping list, not a live integration.)
-- ─────────────────────────────────────────────────────────────
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null, -- 'GitHub' | 'GitLab' | 'Vercel' | 'Supabase' | 'Other'
  account_label text,
  profile_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table connections enable row level security;

drop policy if exists "connections: all own" on connections;
create policy "connections: all own" on connections for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- MATERIALS (global, per-user file library — not tied to a project)
-- ─────────────────────────────────────────────────────────────
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  name text not null,
  size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table materials enable row level security;

drop policy if exists "materials: all own" on materials;
create policy "materials: all own" on materials for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('materials', 'materials', false)
  on conflict (id) do nothing;

drop policy if exists "materials: read own" on storage.objects;
create policy "materials: read own" on storage.objects
  for select using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "materials: insert own" on storage.objects;
create policy "materials: insert own" on storage.objects
  for insert with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "materials: delete own" on storage.objects;
create policy "materials: delete own" on storage.objects
  for delete using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- DEVICES (session tracking for the "view devices" screen — best-effort,
-- since Supabase's client SDK has no API to list all active sessions.
-- This records a device the FIRST time it signs in and updates last_seen
-- on later sign-ins; it is informational, not a live session registry.
-- Actually revoking access everywhere still uses the existing
-- "Sign out of all devices" button, which really does invalidate every
-- refresh token — this table can't do that per-row.)
-- ─────────────────────────────────────────────────────────────
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null, -- random id generated client-side, stored in localStorage
  label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

alter table devices enable row level security;

drop policy if exists "devices: all own" on devices;
create policy "devices: all own" on devices for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table project_milestones;
alter publication supabase_realtime add table hosting;
alter publication supabase_realtime add table ai_accounts;
alter publication supabase_realtime add table connections;
alter publication supabase_realtime add table materials;
alter publication supabase_realtime add table devices;
