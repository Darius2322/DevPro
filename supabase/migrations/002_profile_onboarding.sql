-- Run this against an EXISTING DevPro Supabase project to pick up the new
-- signup fields (name/phone) and the skippable onboarding step, without
-- re-running the full schema.sql (which will error on "relation already
-- exists" for tables you already have).
--
-- Safe to run more than once.

alter table profiles add column if not exists phone text;
alter table profiles add column if not exists github_username text;
alter table profiles add column if not exists profession text;
alter table profiles add column if not exists onboarding_completed boolean not null default false;

-- Backfill: treat any existing user as already "onboarded" so current
-- users aren't suddenly interrupted by the new onboarding step.
update profiles set onboarding_completed = true where onboarding_completed is false;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(profiles.full_name, excluded.full_name),
    phone = coalesce(profiles.phone, excluded.phone);
  return new;
end;
$$ language plpgsql security definer;
