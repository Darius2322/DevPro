-- Developer Project Vault — core schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Covers: profiles, projects, project_members, files, secrets (metadata only —
-- values are encrypted server-side by the secrets-vault Edge Function), urls,
-- and activity_logs. Extend later with apis / github_repositories /
-- database_schemas / ai_tools / ai_usage / notes / shares as needed.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
-- Policies for `profiles` are created further down, after `project_members`
-- exists (the co-member policy needs to reference it).

-- ─────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'Planning' check (status in ('Planning','Active','Paused','Completed','Archived')),
  category text,
  tech_stack text,
  repository_url text,
  production_url text,
  development_url text,
  hosting_provider text,
  database_provider text,
  pinned boolean not null default false,
  favorite boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz
);

create index projects_owner_idx on projects (owner_id);

create table project_members (
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'Viewer' check (role in ('Owner','Admin','Editor','Viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Helper: does the current user have any access (owner or member) to a project?
create function public.has_project_access(pid uuid)
returns boolean as $$
  select exists (
    select 1 from projects where id = pid and owner_id = auth.uid()
    union
    select 1 from project_members where project_id = pid and user_id = auth.uid()
  );
$$ language sql stable security definer;

alter table projects enable row level security;
alter table project_members enable row level security;

-- Deferred from the PROFILES section above: needs project_members + has_project_access.
create policy "profiles: read own or co-member" on profiles
  for select using (
    id = auth.uid()
    or exists (select 1 from project_members pm where pm.user_id = profiles.id and public.has_project_access(pm.project_id))
    or exists (select 1 from projects p where p.owner_id = profiles.id and public.has_project_access(p.id))
  );

create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

-- Invite a collaborator by email. Runs with elevated privileges (security
-- definer) only to look up the target user's id in auth.users — it still
-- enforces that the CALLER is the project owner or an Admin member before
-- doing anything, and does nothing else privileged.
create function public.invite_member_by_email(p_project_id uuid, p_email text, p_role text)
returns void as $$
declare
  target_user_id uuid;
begin
  if p_role not in ('Admin','Editor','Viewer') then
    raise exception 'invalid_role';
  end if;

  if not (
    exists (select 1 from projects where id = p_project_id and owner_id = auth.uid())
    or exists (select 1 from project_members where project_id = p_project_id and user_id = auth.uid() and role = 'Admin')
  ) then
    raise exception 'forbidden';
  end if;

  select id into target_user_id from auth.users where lower(email) = lower(p_email);
  if target_user_id is null then
    raise exception 'no_such_user';
  end if;

  insert into project_members (project_id, user_id, role)
  values (p_project_id, target_user_id, p_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;
$$ language plpgsql security definer set search_path = public, auth;

grant execute on function public.invite_member_by_email(uuid, text, text) to authenticated;

create policy "projects: select if member or owner" on projects
  for select using (public.has_project_access(id));

create policy "projects: insert as self" on projects
  for insert with check (owner_id = auth.uid());

create policy "projects: update if owner or admin/editor" on projects
  for update using (
    owner_id = auth.uid()
    or exists (select 1 from project_members where project_id = id and user_id = auth.uid() and role in ('Admin','Editor'))
  );

create policy "projects: delete if owner" on projects
  for delete using (owner_id = auth.uid());

create policy "project_members: select if member of project" on project_members
  for select using (public.has_project_access(project_id));

create policy "project_members: manage if owner/admin" on project_members
  for all using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
    or exists (select 1 from project_members m2 where m2.project_id = project_id and m2.user_id = auth.uid() and m2.role = 'Admin')
  );

-- Keep updated_at fresh
create function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_touch before update on projects
  for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- FILES  (metadata only — bytes live in Supabase Storage bucket "project-files")
-- ─────────────────────────────────────────────────────────────
create table files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id),
  storage_path text not null,
  name text not null,
  size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index files_project_idx on files (project_id);

alter table files enable row level security;

create policy "files: select if project access" on files
  for select using (public.has_project_access(project_id));

create policy "files: insert if project access" on files
  for insert with check (public.has_project_access(project_id));

create policy "files: delete if project access" on files
  for delete using (public.has_project_access(project_id));

-- ─────────────────────────────────────────────────────────────
-- SECRETS  (metadata + ciphertext only — encryption/decryption happens
-- exclusively inside the secrets-vault Edge Function using the service-role
-- key + SECRETS_ENCRYPTION_KEY, neither of which ever reaches the browser)
-- ─────────────────────────────────────────────────────────────
create table secrets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  name text not null,
  type text not null,
  environment text not null default 'Production',
  description text,
  encrypted_value text not null,
  iv text not null,
  expires_at date,
  rotated_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index secrets_project_idx on secrets (project_id);

alter table secrets enable row level security;

-- Row-level access still requires project access, but note: the anon/user
-- JWT is never used to read encrypted_value/iv directly in normal app flow —
-- only the Edge Function (using the service-role key) decrypts. This RLS
-- still matters because it stops a user without project access from even
-- listing secret metadata (names/types) for a project they can't see.
create policy "secrets: select if project access" on secrets
  for select using (public.has_project_access(project_id));

create policy "secrets: delete if project access" on secrets
  for delete using (public.has_project_access(project_id));

-- No insert/update policy for the anon/user role: writes to encrypted_value
-- only happen via the Edge Function using the service-role key, which
-- bypasses RLS by design. This guarantees plaintext never gets written
-- to the database from the browser.

create trigger secrets_touch before update on secrets
  for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- URLS
-- ─────────────────────────────────────────────────────────────
create table urls (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  url text not null,
  type text not null default 'Website',
  environment text not null default 'Production',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index urls_project_idx on urls (project_id);

alter table urls enable row level security;

create policy "urls: select if project access" on urls
  for select using (public.has_project_access(project_id));

create policy "urls: insert if project access" on urls
  for insert with check (public.has_project_access(project_id));

create policy "urls: update if project access" on urls
  for update using (public.has_project_access(project_id));

create policy "urls: delete if project access" on urls
  for delete using (public.has_project_access(project_id));

create trigger urls_touch before update on urls
  for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ACTIVITY LOGS  (never write secret values or file contents into detail)
-- ─────────────────────────────────────────────────────────────
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index activity_logs_project_idx on activity_logs (project_id, created_at desc);

alter table activity_logs enable row level security;

create policy "activity_logs: select if project access or own" on activity_logs
  for select using (
    (project_id is null and user_id = auth.uid())
    or (project_id is not null and public.has_project_access(project_id))
  );

create policy "activity_logs: insert own" on activity_logs
  for insert with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- APIS
-- ─────────────────────────────────────────────────────────────
create table apis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  base_url text,
  endpoint text,
  method text not null default 'GET' check (method in ('GET','POST','PUT','PATCH','DELETE')),
  auth_type text,
  api_key_secret_id uuid references secrets (id) on delete set null,
  headers text,
  parameters text,
  description text,
  documentation_url text,
  environment text not null default 'Production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index apis_project_idx on apis (project_id);
alter table apis enable row level security;

create policy "apis: select if project access" on apis for select using (public.has_project_access(project_id));
create policy "apis: insert if project access" on apis for insert with check (public.has_project_access(project_id));
create policy "apis: update if project access" on apis for update using (public.has_project_access(project_id));
create policy "apis: delete if project access" on apis for delete using (public.has_project_access(project_id));
create trigger apis_touch before update on apis for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- GITHUB  (one record per project — the token itself lives in `secrets`)
-- ─────────────────────────────────────────────────────────────
create table github_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  repository_url text,
  default_branch text default 'main',
  github_account text,
  organization text,
  token_secret_id uuid references secrets (id) on delete set null,
  actions_notes text,
  deployment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table github_repositories enable row level security;

create policy "github_repositories: select if project access" on github_repositories for select using (public.has_project_access(project_id));
create policy "github_repositories: insert if project access" on github_repositories for insert with check (public.has_project_access(project_id));
create policy "github_repositories: update if project access" on github_repositories for update using (public.has_project_access(project_id));
create policy "github_repositories: delete if project access" on github_repositories for delete using (public.has_project_access(project_id));
create trigger github_repositories_touch before update on github_repositories for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- DATABASE / SCHEMA  (one record per project — SQL files themselves go
-- through the existing `files` table / Storage bucket)
-- ─────────────────────────────────────────────────────────────
create table databases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  provider text,
  database_url text,
  project_ref text,
  schema_notes text,
  rls_notes text,
  edge_functions_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table databases enable row level security;

create policy "databases: select if project access" on databases for select using (public.has_project_access(project_id));
create policy "databases: insert if project access" on databases for insert with check (public.has_project_access(project_id));
create policy "databases: update if project access" on databases for update using (public.has_project_access(project_id));
create policy "databases: delete if project access" on databases for delete using (public.has_project_access(project_id));
create trigger databases_touch before update on databases for each row execute procedure public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- AI USAGE  (tracking only — never store AI account passwords here)
-- ─────────────────────────────────────────────────────────────
create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  provider text not null,
  account_label text,
  purpose text,
  used_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index ai_usage_project_idx on ai_usage (project_id, used_at desc);
alter table ai_usage enable row level security;

create policy "ai_usage: select if project access" on ai_usage for select using (public.has_project_access(project_id));
create policy "ai_usage: insert if project access" on ai_usage for insert with check (public.has_project_access(project_id));
create policy "ai_usage: delete if project access" on ai_usage for delete using (public.has_project_access(project_id));

-- ─────────────────────────────────────────────────────────────
-- NOTES
-- ─────────────────────────────────────────────────────────────
create table notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_project_idx on notes (project_id);
alter table notes enable row level security;

create policy "notes: select if project access" on notes for select using (public.has_project_access(project_id));
create policy "notes: insert if project access" on notes for insert with check (public.has_project_access(project_id));
create policy "notes: update if project access" on notes for update using (public.has_project_access(project_id));
create policy "notes: delete if project access" on notes for delete using (public.has_project_access(project_id));
create trigger notes_touch before update on notes for each row execute procedure public.touch_updated_at();
-- ─────────────────────────────────────────────────────────────
-- SHARES  (public read-only links. Secrets and Notes are NEVER included —
-- there is deliberately no toggle for them. Password hashing and the actual
-- link-serving logic live in the share-manage Edge Function, never here.)
-- ─────────────────────────────────────────────────────────────
create table shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  token text not null unique,
  include_overview boolean not null default true,
  include_files boolean not null default false,
  include_urls boolean not null default false,
  include_apis boolean not null default false,
  password_hash text,
  password_salt text,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shares_project_idx on shares (project_id);
create index shares_token_idx on shares (token);

alter table shares enable row level security;

-- Only project owner/members ever query this table directly (to list/revoke
-- their own shares). Anonymous visitors to a share link never query this
-- table with their own credentials — they go through the share-manage Edge
-- Function, which uses the service-role key to validate the token/password.
create policy "shares: select if project access" on shares
  for select using (public.has_project_access(project_id));

create policy "shares: insert if project access" on shares
  for insert with check (public.has_project_access(project_id) and created_by = auth.uid());

create policy "shares: update (revoke) if project access" on shares
  for update using (public.has_project_access(project_id));

create policy "shares: delete if project access" on shares
  for delete using (public.has_project_access(project_id));

-- ─────────────────────────────────────────────────────────────
-- STORAGE: private bucket + policies for project files
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('project-files', 'project-files', false)
  on conflict (id) do nothing;

-- Files are stored at path "<project_id>/<uuid>-<filename>" so we can check
-- project access from the first path segment.
create policy "project-files: read if project access" on storage.objects
  for select using (
    bucket_id = 'project-files'
    and public.has_project_access((storage.foldername(name))[1]::uuid)
  );

create policy "project-files: insert if project access" on storage.objects
  for insert with check (
    bucket_id = 'project-files'
    and public.has_project_access((storage.foldername(name))[1]::uuid)
  );

create policy "project-files: delete if project access" on storage.objects
  for delete using (
    bucket_id = 'project-files'
    and public.has_project_access((storage.foldername(name))[1]::uuid)
  );
