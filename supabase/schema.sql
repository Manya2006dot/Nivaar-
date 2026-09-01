-- =============================================================================
-- NIVAAR — Supabase schema, RLS policies, storage buckets
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- PROFILES
-- One row per auth user (including anonymous Supabase Auth sessions — see
-- README "Auth model"). id matches auth.users.id.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_language text default 'en',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row the moment a new auth user (incl. anonymous) exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used inside RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- -----------------------------------------------------------------------------
-- REPORT NUMBER SEQUENCE (human-friendly IDs like NIV-28491)
-- -----------------------------------------------------------------------------
create sequence if not exists public.report_number_seq start 20000;

create or replace function public.next_report_number()
returns text
language sql
as $$
  select 'NIV-' || nextval('public.report_number_seq')::text;
$$;

-- -----------------------------------------------------------------------------
-- REPORTS
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  report_number text not null unique default public.next_report_number(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Evidence
  image_url text,
  video_url text,
  voice_url text,
  voice_transcript text,

  -- AI classification
  issue_type text not null,
  ai_confidence integer,               -- 0-100, null if manually entered
  severity text not null check (severity in ('Low','Medium','High')),
  ai_explanation text,
  description text not null,

  -- Location
  latitude double precision not null,
  longitude double precision not null,
  address text,
  landmark text,

  -- Routing
  department text,
  authority text,

  -- Status lifecycle
  status text not null default 'Submitted'
    check (status in ('Submitted','Acknowledged','Assigned','In Progress','Resolved')),

  -- Community / duplicate-join support
  affected_count integer not null default 1,
  duplicate_of uuid references public.reports(id) on delete set null,

  -- Demo/sample reports must never be mistaken for real citizen reports.
  is_demo boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reports_user_id_idx on public.reports(user_id);
create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_issue_type_idx on public.reports(issue_type);
create index if not exists reports_severity_idx on public.reports(severity);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists reports_lat_lng_idx on public.reports(latitude, longitude);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- STATUS HISTORY — every status change is append-only and permanent.
-- -----------------------------------------------------------------------------
create table if not exists public.status_history (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.reports(id) on delete cascade,
  status text not null check (status in ('Submitted','Acknowledged','Assigned','In Progress','Resolved')),
  note text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists status_history_report_id_idx on public.status_history(report_id);

-- Seed a "Submitted" row automatically whenever a report is created.
create or replace function public.seed_status_history()
returns trigger language plpgsql as $$
begin
  insert into public.status_history (report_id, status, note, changed_by)
  values (new.id, 'Submitted', 'Report created', new.user_id);
  return new;
end;
$$;

drop trigger if exists reports_seed_status_history on public.reports;
create trigger reports_seed_status_history
  after insert on public.reports
  for each row execute procedure public.seed_status_history();

-- Keep reports.status in sync + stamp resolved_at whenever a history row
-- is added directly (admin route uses this path).
create or replace function public.apply_status_history()
returns trigger language plpgsql as $$
begin
  update public.reports
  set status = new.status,
      resolved_at = case when new.status = 'Resolved' then now() else resolved_at end
  where id = new.report_id;
  return new;
end;
$$;

drop trigger if exists status_history_apply on public.status_history;
create trigger status_history_apply
  after insert on public.status_history
  for each row execute procedure public.apply_status_history();

-- -----------------------------------------------------------------------------
-- RESOLUTION IMAGES — "after" photos + AI before/after verification
-- -----------------------------------------------------------------------------
create table if not exists public.resolution_images (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.reports(id) on delete cascade,
  image_url text not null,
  ai_verification jsonb,   -- { looksResolved: boolean, confidence: number, note: string }
  created_at timestamptz not null default now()
);

create index if not exists resolution_images_report_id_idx on public.resolution_images(report_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.status_history enable row level security;
alter table public.resolution_images enable row level security;

-- profiles: a user can see/update only their own profile; admins see all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

-- reports: public read (civic reports are transparent by design — this
-- powers the "Nearby" community map). Insert only as yourself. Only admins
-- may update status/department directly via client (the normal path is the
-- server-side admin API route using the service role, which bypasses RLS).
drop policy if exists reports_select_public on public.reports;
create policy reports_select_public on public.reports
  for select using (true);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (user_id = auth.uid());

drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports
  for update using (public.is_admin());

-- Citizens may increase affected_count on someone else's report by joining
-- a duplicate — handled via a dedicated RPC (security definer) below rather
-- than a broad UPDATE policy, so they can't otherwise edit others' reports.
create or replace function public.join_report(p_report_id uuid)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.reports;
begin
  update public.reports
  set affected_count = affected_count + 1
  where id = p_report_id
  returning * into result;
  return result;
end;
$$;

-- status_history: readable by anyone (transparency); insert only by admins.
drop policy if exists status_history_select on public.status_history;
create policy status_history_select on public.status_history
  for select using (true);

drop policy if exists status_history_insert_admin on public.status_history;
create policy status_history_insert_admin on public.status_history
  for insert with check (public.is_admin());

-- resolution_images: readable by anyone; insertable by the report's owner
-- or an admin.
drop policy if exists resolution_images_select on public.resolution_images;
create policy resolution_images_select on public.resolution_images
  for select using (true);

drop policy if exists resolution_images_insert on public.resolution_images;
create policy resolution_images_insert on public.resolution_images
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- Create via Dashboard -> Storage -> New bucket, OR run this (requires the
-- storage schema to already exist, which it does by default on Supabase).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('resolution', 'resolution', true)
on conflict (id) do nothing;

-- Evidence bucket: anyone can read (public civic evidence). A user may only
-- upload into a folder prefixed with their own auth uid, e.g.
-- `evidence/{auth.uid()}/{filename}` — enforced by the app's upload path
-- builder in src/lib/supabase/client.ts.
drop policy if exists evidence_public_read on storage.objects;
create policy evidence_public_read on storage.objects
  for select using (bucket_id = 'evidence');

drop policy if exists evidence_owner_insert on storage.objects;
create policy evidence_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists resolution_public_read on storage.objects;
create policy resolution_public_read on storage.objects
  for select using (bucket_id = 'resolution');

drop policy if exists resolution_owner_insert on storage.objects;
create policy resolution_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'resolution'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Done. Next: enable Anonymous Sign-ins under
-- Authentication -> Providers -> Anonymous Sign-ins (see README "Auth model").
-- =============================================================================
