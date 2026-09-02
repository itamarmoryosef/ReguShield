-- =============================================================================
-- ReguShield — Multi-Tenant Compliance Schema (production RLS + jobs)
-- Run this in the Supabase SQL Editor (or via CLI).
-- Safe to re-run: policies, triggers, and functions are replaced.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.document_status as enum ('valid', 'expiring_soon', 'expired', 'missing');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_role as enum ('business', 'partner');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reminder_channel as enum ('whatsapp');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reminder_job_status as enum (
    'pending', 'processing', 'sent', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 1. partners
-- -----------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. businesses
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  partner_id uuid references public.partners (id) on delete set null,
  name text not null,
  hp_number text,
  address text,
  -- Static identity details reused to auto-fill official renewal forms.
  owner_name text,
  phone text,
  email text,
  -- Licensing decree ("צו רישוי עסקים") details required by the fire safety
  -- declaration; kept as text because the serial number is not purely numeric.
  serial_number text,
  business_description text,
  total_area text,
  built_area text,
  -- Municipal licensing file number, printed in the accessibility affidavit.
  file_number text,
  -- Answers that decide which police requirements apply (item 4.2a / 4.2b / 4.8),
  -- and are printed in the "נתונים כלליים" appendix of the police forms.
  licensing_item text check (licensing_item in ('4.2a', '4.2b', '4.8', 'other')),
  max_capacity integer,
  employee_count integer,
  sells_alcohol boolean not null default false,
  -- Extra contact details and role holders that the official forms ask for.
  mobile text,
  fax text,
  manager_name text,
  manager_phone text,
  shift_manager_phone text,
  security_phone text,
  general_description text,
  -- State of each security measure in the police appendix, keyed by measure,
  -- with the free remarks of the same table.
  security_measures jsonb,
  security_notes jsonb,
  -- Who signs the fire safety declaration.
  declarer_role text check (declarer_role in ('owner', 'corporate_signatory')),
  -- Part C of the accessibility affidavit (optional accessibility consultant).
  accessibility_consultant_name text,
  accessibility_consultant_id text,
  accessibility_consultant_registry text,
  accessibility_consultant_registry_number text,
  -- Clause 7 of the fire safety declaration: up to four approvals issued by
  -- licensed professionals (gas, hoods, electricity...).
  professional_approvals text[] not null default '{}',
  profile_completed_at timestamptz,
  templates_configured_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.businesses add column if not exists templates_configured_at timestamptz;
alter table public.businesses add column if not exists owner_name text;
alter table public.businesses add column if not exists phone text;
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists serial_number text;
alter table public.businesses add column if not exists business_description text;
alter table public.businesses add column if not exists total_area text;
alter table public.businesses add column if not exists built_area text;
alter table public.businesses add column if not exists file_number text;
alter table public.businesses add column if not exists licensing_item text;
alter table public.businesses add column if not exists max_capacity integer;
alter table public.businesses add column if not exists employee_count integer;
alter table public.businesses add column if not exists sells_alcohol boolean not null default false;
alter table public.businesses add column if not exists mobile text;
alter table public.businesses add column if not exists fax text;
alter table public.businesses add column if not exists manager_name text;
alter table public.businesses add column if not exists manager_phone text;
alter table public.businesses add column if not exists shift_manager_phone text;
alter table public.businesses add column if not exists security_phone text;
alter table public.businesses add column if not exists general_description text;
alter table public.businesses add column if not exists security_measures jsonb;
alter table public.businesses add column if not exists security_notes jsonb;
alter table public.businesses add column if not exists declarer_role text;
alter table public.businesses add column if not exists accessibility_consultant_name text;
alter table public.businesses add column if not exists accessibility_consultant_id text;
alter table public.businesses add column if not exists accessibility_consultant_registry text;
alter table public.businesses add column if not exists accessibility_consultant_registry_number text;
alter table public.businesses add column if not exists professional_approvals text[] not null default '{}';
alter table public.businesses add column if not exists profile_completed_at timestamptz;

create index if not exists businesses_partner_id_idx on public.businesses (partner_id);
create index if not exists businesses_user_id_idx on public.businesses (user_id);

-- -----------------------------------------------------------------------------
-- business_billing — what a client pays and what the referring partner earns
--
-- Deliberately NOT columns on public.businesses. Owners can both read and
-- update their own row there, so a price living on that table would be visible
-- to the client and editable down to zero by them; the partner update policy
-- would likewise let a partner raise their own commission rate. Money stays in
-- a table only admins can write.
-- -----------------------------------------------------------------------------
create table if not exists public.business_billing (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  -- What this specific client actually pays per month, in shekels.
  subscription_price numeric(10, 2) not null default 0
    check (subscription_price >= 0),
  -- Commission for this specific client, so a partner can be given better terms
  -- on one account without changing the rest.
  partner_commission_rate numeric(5, 2) not null default 15
    check (partner_commission_rate >= 0 and partner_commission_rate <= 100),
  -- Computed here so the admin payout screen and the partner earnings screen
  -- can never disagree about what is owed.
  monthly_commission numeric(12, 2)
    generated always as (round(subscription_price * partner_commission_rate / 100, 2)) stored,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Every business carries billing terms, so the reporting queries can join
-- instead of guessing defaults for rows that were never touched.
create or replace function public.ensure_business_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_billing (business_id)
  values (new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_businesses_ensure_billing on public.businesses;
create trigger trg_businesses_ensure_billing
after insert on public.businesses
for each row
execute function public.ensure_business_billing();

insert into public.business_billing (business_id)
select id from public.businesses
on conflict (business_id) do nothing;

create index if not exists business_billing_updated_at_idx
  on public.business_billing (updated_at desc);

-- -----------------------------------------------------------------------------
-- 3. document_templates
-- -----------------------------------------------------------------------------
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Fire', 'Health', 'Municipality')),
  default_validity_months integer not null default 12 check (default_validity_months > 0),
  -- Universally required permits default to ON; conditional ones start OFF so a
  -- takeaway is not alerted about permits it will never need.
  is_default_active boolean not null default true,
  applies_to_hint text,
  -- Templates whose form can be pre-filled from the business profile instead of
  -- being obtained from an external inspector.
  generator_key text
);

alter table public.document_templates
  add column if not exists is_default_active boolean not null default true;
alter table public.document_templates
  add column if not exists applies_to_hint text;
alter table public.document_templates
  add column if not exists generator_key text;

-- -----------------------------------------------------------------------------
-- business_active_templates — per-business dynamic checklist
-- -----------------------------------------------------------------------------
create table if not exists public.business_active_templates (
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_id uuid not null references public.document_templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, template_id)
);

create index if not exists business_active_templates_business_idx
  on public.business_active_templates (business_id);

-- -----------------------------------------------------------------------------
-- 4. client_documents — store private storage PATH only, never a public URL
-- -----------------------------------------------------------------------------
create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_id uuid not null references public.document_templates (id) on delete restrict,
  status public.document_status not null default 'missing',
  file_path text,
  file_url text,
  issue_date date,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, template_id)
);

alter table public.client_documents add column if not exists file_path text;
alter table public.client_documents add column if not exists updated_at timestamptz not null default now();

create index if not exists client_documents_business_id_idx on public.client_documents (business_id);
create index if not exists client_documents_template_id_idx on public.client_documents (template_id);
create index if not exists client_documents_status_idx on public.client_documents (status);
create index if not exists client_documents_expiry_date_idx on public.client_documents (expiry_date);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  partner_id uuid references public.partners (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  constraint profiles_partner_role_chk check (
    (role = 'partner' and partner_id is not null)
    or (role = 'business' and partner_id is null)
  )
);

-- Super admin flag. Never writable by the account holder — see
-- guard_profile_privileges below.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Partner white-labeling: branding shown to the businesses in their portfolio.
alter table public.profiles add column if not exists brand_logo_url text;
alter table public.profiles add column if not exists brand_name text;
alter table public.profiles add column if not exists custom_reminder_text text;

create index if not exists profiles_partner_id_idx on public.profiles (partner_id);
create index if not exists profiles_is_admin_idx on public.profiles (id) where is_admin;

-- -----------------------------------------------------------------------------
-- reminder_jobs — queue rows for WhatsApp / retry workers (not processed in-request)
-- -----------------------------------------------------------------------------
create table if not exists public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_id uuid references public.document_templates (id) on delete set null,
  document_id uuid references public.client_documents (id) on delete set null,
  channel public.reminder_channel not null default 'whatsapp',
  status public.reminder_job_status not null default 'pending',
  scheduled_for timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminder_jobs_status_scheduled_idx
  on public.reminder_jobs (status, scheduled_for);
create index if not exists reminder_jobs_business_id_idx
  on public.reminder_jobs (business_id);

-- -----------------------------------------------------------------------------
-- job_webhook_receipts — idempotency for QStash / Trigger.dev
-- Service-role only (RLS on, no authenticated policies).
-- -----------------------------------------------------------------------------
create table if not exists public.job_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.compute_document_status(p_expiry date)
returns public.document_status
language plpgsql
stable
as $$
begin
  if p_expiry is null then
    return 'missing';
  elsif p_expiry < current_date then
    return 'expired';
  elsif p_expiry < (current_date + 60) then
    return 'expiring_soon';
  else
    return 'valid';
  end if;
end;
$$;

create or replace function public.set_client_document_status()
returns trigger
language plpgsql
as $$
begin
  new.status := public.compute_document_status(new.expiry_date);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_client_document_status on public.client_documents;
create trigger trg_set_client_document_status
before insert or update of issue_date, expiry_date, file_path
on public.client_documents
for each row
execute function public.set_client_document_status();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_reminder_jobs_updated_at on public.reminder_jobs;
create trigger trg_reminder_jobs_updated_at
before update on public.reminder_jobs
for each row
execute function public.touch_updated_at();

create or replace function public.prevent_business_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_business_identity_change on public.businesses;
create trigger trg_prevent_business_identity_change
before update on public.businesses
for each row
execute function public.prevent_business_identity_change();

create or replace function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.businesses where user_id = auth.uid();
$$;

create or replace function public.can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_business_id is not null
    and exists (
      select 1
      from public.businesses b
      where b.id = p_business_id
        and (
          b.user_id = auth.uid()
          or (b.partner_id is not null and b.partner_id = public.current_partner_id())
        )
    );
$$;

create or replace function public.can_write_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_business(p_business_id);
$$;

-- security definer is load-bearing here: an RLS policy on profiles that read
-- profiles through a normal query would recurse into itself.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- "Users can update own profile" would otherwise let anyone grant themselves
-- is_admin, or move themselves into another partner's portfolio, with a single
-- REST call. Only an existing admin or the service role may touch these.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if (new.is_admin is distinct from old.is_admin
      or new.role is distinct from old.role
      or new.partner_id is distinct from old.partner_id)
     and not public.is_admin() then
    raise exception 'privileged profile fields cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileges on public.profiles;
create trigger trg_profiles_guard_privileges
before update on public.profiles
for each row
execute function public.guard_profile_privileges();

-- Attribution decides who gets paid, so it is the admin's call alone.
-- "Business owner can update own business" does not constrain partner_id, so
-- without this a client could attach itself to any consulting office with one
-- REST call and invent a commission the platform never agreed to.
create or replace function public.guard_business_attribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.partner_id is distinct from old.partner_id and not public.is_admin() then
    raise exception 'business attribution can only be changed by an administrator';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_businesses_guard_attribution on public.businesses;
create trigger trg_businesses_guard_attribution
before update on public.businesses
for each row
execute function public.guard_business_attribution();

create or replace function public.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_value::uuid;
exception
  when others then
    return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Active checklist resolution: explicit selection when configured,
-- otherwise the default-active templates.
-- -----------------------------------------------------------------------------
create or replace view public.business_active_checklist
with (security_invoker = true)
as
select
  b.id as business_id,
  t.id as template_id
from public.businesses b
join public.document_templates t
  on case
       when b.templates_configured_at is null then t.is_default_active
       else exists (
         select 1
         from public.business_active_templates bat
         where bat.business_id = b.id
           and bat.template_id = t.id
       )
     end;

-- -----------------------------------------------------------------------------
-- Partner portfolio view — counts ONLY templates active for each business
-- -----------------------------------------------------------------------------
create or replace view public.business_compliance_summary
with (security_invoker = true)
as
select
  b.id as business_id,
  b.partner_id,
  b.name,
  b.hp_number,
  b.address,
  b.created_at,
  count(a.template_id) as required_count,
  count(a.template_id) filter (where cd.id is null) as missing_count,
  count(a.template_id) filter (where cd.status = 'expired') as expired_count,
  count(a.template_id) filter (where cd.status = 'expiring_soon') as expiring_soon_count,
  count(a.template_id) filter (where cd.status = 'valid') as valid_count
from public.businesses b
left join public.business_active_checklist a
  on a.business_id = b.id
left join public.client_documents cd
  on cd.business_id = b.id
 and cd.template_id = a.template_id
group by b.id, b.partner_id, b.name, b.hp_number, b.address, b.created_at;

-- -----------------------------------------------------------------------------
-- Partner earnings view — one row per referred business
--
-- security_invoker keeps the caller's RLS in force, so a partner sees only the
-- clients they referred and a business owner sees nothing at all.
-- -----------------------------------------------------------------------------
create or replace view public.partner_referral_earnings
with (security_invoker = true)
as
select
  b.id as business_id,
  b.partner_id,
  b.name,
  b.hp_number,
  b.created_at,
  bb.subscription_price,
  bb.partner_commission_rate,
  bb.monthly_commission
from public.businesses b
join public.business_billing bb on bb.business_id = b.id;

-- -----------------------------------------------------------------------------
-- Transactions: signup + document replace
-- -----------------------------------------------------------------------------
create or replace function public.register_business_account(
  p_full_name text,
  p_business_name text,
  p_hp_number text,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile already exists';
  end if;

  insert into public.businesses (user_id, name, hp_number, address)
  values (
    v_uid,
    coalesce(nullif(trim(p_business_name), ''), 'בית עסק חדש'),
    nullif(trim(p_hp_number), ''),
    nullif(trim(p_address), '')
  )
  returning id into v_business_id;

  insert into public.profiles (id, role, full_name)
  values (v_uid, 'business', nullif(trim(p_full_name), ''));

  return v_business_id;
end;
$$;

create or replace function public.register_partner_account(
  p_full_name text,
  p_organization text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile already exists';
  end if;

  insert into public.partners (name)
  values (coalesce(nullif(trim(p_organization), ''), nullif(trim(p_full_name), ''), 'משרד ייעוץ'))
  returning id into v_partner_id;

  insert into public.profiles (id, role, partner_id, full_name)
  values (v_uid, 'partner', v_partner_id, nullif(trim(p_full_name), ''));

  return v_partner_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Provisioning after email verification.
--
-- Sign-up cannot create the tenant rows anymore: with email confirmation on
-- there is no session at that point. The details are parked in the auth user's
-- metadata and turned into a profile the first time a verified session appears.
-- Idempotent, so both the auth callback and a later sign-in can call it.
--
-- Reading email_confirmed_at here means an unverified user cannot get a tenant
-- even if they reach this function some other way.
--
-- signup_role comes from user metadata, which the account holder can edit. That
-- is acceptable because a self-declared partner starts with an empty portfolio
-- and gains no access to anyone else's data; is_admin is deliberately not read
-- from metadata.
-- -----------------------------------------------------------------------------
create or replace function public.ensure_account_provisioned()
returns public.user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_confirmed timestamptz;
  v_existing public.user_role;
  v_role public.user_role;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select role into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    return v_existing;
  end if;

  select u.raw_user_meta_data, u.email_confirmed_at
    into v_meta, v_confirmed
  from auth.users u
  where u.id = v_uid;

  if v_confirmed is null then
    raise exception 'email not verified';
  end if;

  v_meta := coalesce(v_meta, '{}'::jsonb);
  v_role := case when v_meta ->> 'signup_role' = 'partner' then 'partner' else 'business' end;

  if v_role = 'partner' then
    perform public.register_partner_account(
      coalesce(v_meta ->> 'full_name', ''),
      coalesce(v_meta ->> 'organization', '')
    );
  else
    perform public.register_business_account(
      coalesce(v_meta ->> 'full_name', ''),
      coalesce(v_meta ->> 'organization', ''),
      coalesce(v_meta ->> 'hp_number', ''),
      coalesce(v_meta ->> 'address', '')
    );
  end if;

  return v_role;
end;
$$;

-- Replaces a document row atomically and returns the previous storage path
-- so the caller can delete the old private object after commit.
create or replace function public.replace_client_document(
  p_business_id uuid,
  p_template_id uuid,
  p_file_path text,
  p_issue_date date,
  p_expiry_date date
)
returns table (
  document_id uuid,
  previous_file_path text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous text;
  v_id uuid;
begin
  if not public.can_write_business(p_business_id) then
    raise exception 'not authorized';
  end if;

  if p_file_path is null or length(trim(p_file_path)) = 0 then
    raise exception 'file_path is required';
  end if;

  select cd.file_path, cd.id
    into v_previous, v_id
  from public.client_documents cd
  where cd.business_id = p_business_id
    and cd.template_id = p_template_id
  for update;

  insert into public.client_documents (
    business_id, template_id, file_path, file_url, issue_date, expiry_date
  )
  values (
    p_business_id, p_template_id, p_file_path, null, p_issue_date, p_expiry_date
  )
  on conflict (business_id, template_id)
  do update set
    file_path = excluded.file_path,
    file_url = null,
    issue_date = excluded.issue_date,
    expiry_date = excluded.expiry_date
  returning id into v_id;

  document_id := v_id;
  previous_file_path := v_previous;
  return next;
end;
$$;

-- Replaces the whole checklist for a business in one transaction.
create or replace function public.set_business_active_templates(
  p_business_id uuid,
  p_template_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ids uuid[] := coalesce(p_template_ids, '{}'::uuid[]);
  v_valid uuid[];
  v_count integer;
begin
  if not public.can_write_business(p_business_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
    into v_valid
  from public.document_templates t
  where t.id = any (v_ids);

  delete from public.business_active_templates bat
  where bat.business_id = p_business_id
    and not (bat.template_id = any (v_valid));

  insert into public.business_active_templates (business_id, template_id)
  select p_business_id, unnest(v_valid)
  on conflict (business_id, template_id) do nothing;

  update public.businesses
     set templates_configured_at = now()
   where id = p_business_id;

  select count(*) into v_count
  from public.business_active_templates
  where business_id = p_business_id;

  return v_count;
end;
$$;

grant execute on function public.set_business_active_templates(uuid, uuid[]) to authenticated;
grant execute on function public.register_business_account(text, text, text, text) to authenticated;
grant execute on function public.register_partner_account(text, text) to authenticated;
grant execute on function public.replace_client_document(uuid, uuid, text, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security — every table, forced even for table owners
-- -----------------------------------------------------------------------------
alter table public.partners enable row level security;
alter table public.partners force row level security;
alter table public.businesses enable row level security;
alter table public.businesses force row level security;
alter table public.business_billing enable row level security;
alter table public.business_billing force row level security;
alter table public.document_templates enable row level security;
alter table public.document_templates force row level security;
alter table public.business_active_templates enable row level security;
alter table public.business_active_templates force row level security;
alter table public.client_documents enable row level security;
alter table public.client_documents force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.reminder_jobs enable row level security;
alter table public.reminder_jobs force row level security;
alter table public.job_webhook_receipts enable row level security;
alter table public.job_webhook_receipts force row level security;

-- profiles: own row only
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- partners
drop policy if exists "Partners can read own agency" on public.partners;
create policy "Partners can read own agency"
  on public.partners for select
  using (id = public.current_partner_id());

drop policy if exists "Businesses can read their assigned partner" on public.partners;
create policy "Businesses can read their assigned partner"
  on public.partners for select
  using (
    id in (select partner_id from public.businesses where user_id = auth.uid())
  );

drop policy if exists "Authenticated users can create a partner" on public.partners;
drop policy if exists "Partners can insert own agency" on public.partners;
-- Inserts go through register_partner_account (security definer).

drop policy if exists "Partners can update own agency" on public.partners;
create policy "Partners can update own agency"
  on public.partners for update
  using (id = public.current_partner_id())
  with check (id = public.current_partner_id());

-- businesses
drop policy if exists "Business owner can read own business" on public.businesses;
create policy "Business owner can read own business"
  on public.businesses for select
  using (user_id = auth.uid());

drop policy if exists "Partner can read portfolio businesses" on public.businesses;
create policy "Partner can read portfolio businesses"
  on public.businesses for select
  using (partner_id = public.current_partner_id());

drop policy if exists "Business owner can insert own business" on public.businesses;
create policy "Business owner can insert own business"
  on public.businesses for insert
  with check (user_id = auth.uid());

drop policy if exists "Business owner can update own business" on public.businesses;
create policy "Business owner can update own business"
  on public.businesses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Partner can update portfolio businesses" on public.businesses;
create policy "Partner can update portfolio businesses"
  on public.businesses for update
  using (partner_id = public.current_partner_id())
  with check (partner_id = public.current_partner_id());

-- business_billing: partners read what they earn, only admins set the terms.
-- No policy grants the business owner access, so a client cannot see the cut
-- their consultant takes.
drop policy if exists "Partner can read portfolio billing" on public.business_billing;
create policy "Partner can read portfolio billing"
  on public.business_billing for select
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = business_billing.business_id
        and b.partner_id = public.current_partner_id()
    )
  );

drop policy if exists "Admins can read every billing row" on public.business_billing;
create policy "Admins can read every billing row"
  on public.business_billing for select
  using (public.is_admin());

drop policy if exists "Admins can insert billing rows" on public.business_billing;
create policy "Admins can insert billing rows"
  on public.business_billing for insert
  with check (public.is_admin());

drop policy if exists "Admins can update billing rows" on public.business_billing;
create policy "Admins can update billing rows"
  on public.business_billing for update
  using (public.is_admin())
  with check (public.is_admin());

-- document_templates: authenticated read-only catalog
drop policy if exists "Authenticated users can read templates" on public.document_templates;
create policy "Authenticated users can read templates"
  on public.document_templates for select
  to authenticated
  using (true);

-- business_active_templates: business owner + owning partner only
drop policy if exists "Authorized users can read active templates" on public.business_active_templates;
create policy "Authorized users can read active templates"
  on public.business_active_templates for select
  using (public.can_access_business(business_id));

drop policy if exists "Authorized users can insert active templates" on public.business_active_templates;
create policy "Authorized users can insert active templates"
  on public.business_active_templates for insert
  with check (public.can_write_business(business_id));

drop policy if exists "Authorized users can delete active templates" on public.business_active_templates;
create policy "Authorized users can delete active templates"
  on public.business_active_templates for delete
  using (public.can_write_business(business_id));

-- client_documents
drop policy if exists "Business can read own documents" on public.client_documents;
create policy "Business can read own documents"
  on public.client_documents for select
  using (public.can_access_business(business_id));

drop policy if exists "Partner can read portfolio documents" on public.client_documents;

drop policy if exists "Business can insert own documents" on public.client_documents;
drop policy if exists "Authorized users can insert documents" on public.client_documents;
create policy "Authorized users can insert documents"
  on public.client_documents for insert
  with check (public.can_write_business(business_id));

drop policy if exists "Business can update own documents" on public.client_documents;
drop policy if exists "Authorized users can update documents" on public.client_documents;
create policy "Authorized users can update documents"
  on public.client_documents for update
  using (public.can_write_business(business_id))
  with check (public.can_write_business(business_id));

drop policy if exists "Business can delete own documents" on public.client_documents;
drop policy if exists "Authorized users can delete documents" on public.client_documents;
create policy "Authorized users can delete documents"
  on public.client_documents for delete
  using (public.can_write_business(business_id));

-- reminder_jobs: tenants may read; workers (service role) write
drop policy if exists "Users can read accessible reminder jobs" on public.reminder_jobs;
create policy "Users can read accessible reminder jobs"
  on public.reminder_jobs for select
  using (public.can_access_business(business_id));

-- job_webhook_receipts: no authenticated policies (service role only)

-- -----------------------------------------------------------------------------
-- Super admin override. Postgres ORs permissive policies together, so these are
-- purely additive: they widen what an admin can reach without loosening
-- anything for a regular tenant.
-- -----------------------------------------------------------------------------
drop policy if exists "Admins can read every profile" on public.profiles;
create policy "Admins can read every profile"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins can update every profile" on public.profiles;
create policy "Admins can update every profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete every profile" on public.profiles;
create policy "Admins can delete every profile"
  on public.profiles for delete
  using (public.is_admin());

drop policy if exists "Admins can read every business" on public.businesses;
create policy "Admins can read every business"
  on public.businesses for select
  using (public.is_admin());

drop policy if exists "Admins can update every business" on public.businesses;
create policy "Admins can update every business"
  on public.businesses for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete every business" on public.businesses;
create policy "Admins can delete every business"
  on public.businesses for delete
  using (public.is_admin());

drop policy if exists "Admins can read every document" on public.client_documents;
create policy "Admins can read every document"
  on public.client_documents for select
  using (public.is_admin());

drop policy if exists "Admins can update every document" on public.client_documents;
create policy "Admins can update every document"
  on public.client_documents for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete every document" on public.client_documents;
create policy "Admins can delete every document"
  on public.client_documents for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage — PRIVATE bucket, no public URLs, no object SELECT for clients.
-- Files are read only through short-lived signed URLs created on the server.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business can upload own files" on storage.objects;
drop policy if exists "Business can read own files" on storage.objects;
drop policy if exists "Partner can read portfolio files" on storage.objects;
drop policy if exists "Business can update own files" on storage.objects;
drop policy if exists "Authorized users can upload documents" on storage.objects;
drop policy if exists "Authorized users can update documents" on storage.objects;
drop policy if exists "Authorized users can delete documents" on storage.objects;

create policy "Authorized users can upload documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-documents'
    and public.can_write_business(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "Authorized users can update documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-documents'
    and public.can_write_business(public.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'client-documents'
    and public.can_write_business(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "Authorized users can delete documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-documents'
    and public.can_write_business(public.try_uuid((storage.foldername(name))[1]))
  );

-- -----------------------------------------------------------------------------
-- Storage — PUBLIC bucket for partner branding. Logos are rendered in client
-- portals and reminder emails, so they have to be readable without a signature.
--
-- Writes are scoped to <partner_id>/<file> rather than opened to every
-- authenticated user: a public bucket that anyone can write to is an open file
-- host, and one partner could overwrite another's logo.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read partner logos" on storage.objects;
create policy "Anyone can read partner logos"
  on storage.objects for select
  using (bucket_id = 'partner-logos');

drop policy if exists "Partners can upload own logo" on storage.objects;
create policy "Partners can upload own logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'partner-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_partner_id()
  );

drop policy if exists "Partners can update own logo" on storage.objects;
create policy "Partners can update own logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'partner-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_partner_id()
  )
  with check (
    bucket_id = 'partner-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_partner_id()
  );

drop policy if exists "Partners can delete own logo" on storage.objects;
create policy "Partners can delete own logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'partner-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_partner_id()
  );

-- -----------------------------------------------------------------------------
-- Seed: Israeli restaurant regulatory catalog.
-- is_default_active = false for conditional permits (hood, alcohol, seating...)
-- so new businesses are not alerted about requirements they do not have.
-- -----------------------------------------------------------------------------
insert into public.document_templates
  (id, name, category, default_validity_months, is_default_active, applies_to_hint, generator_key)
values
  ('11111111-1111-1111-1111-111111111001', 'רישיון עסק',                    'Municipality', 12, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111002', 'אישור כיבוי אש',                 'Fire',         12, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111003', 'בדיקת מטפי כיבוי אש',            'Fire',         12, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111004', 'בדיקת מערכת כיבוי במנדף',        'Fire',          6, false, 'רק אם קיים מנדף / מטבח מבשל', null),
  ('11111111-1111-1111-1111-111111111005', 'אישור משרד הבריאות',             'Health',       12, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111006', 'יומן הדברה',                     'Health',        3, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111007', 'בדיקות מעבדה למים ומזון',        'Health',        6, false, 'רק אם נדרשות דגימות מזון או מים', null),
  ('11111111-1111-1111-1111-111111111008', 'אישור תברואן',                   'Health',       12, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111009', 'בדיקת מתקני גז',                 'Municipality', 12, false, 'רק אם יש מתקן גז בעסק', null),
  ('11111111-1111-1111-1111-111111111010', 'אישור משטרה',                    'Municipality', 12, false, 'נדרש לפי פריט הרישוי, התפוסה ומכירת אלכוהול', 'police_form'),
  ('11111111-1111-1111-1111-111111111011', 'ביטוח צד ג׳ וחבות מעבידים',      'Municipality', 12, true,  'חובה לכל עסק מזון', null),
  ('11111111-1111-1111-1111-111111111012', 'אישור נגישות',                   'Municipality', 36, false, 'רק אם יש שירות בישיבה לציבור', null),
  ('11111111-1111-1111-1111-111111111013', 'הדרכת בטיחות בעבודה',            'Health',       12, true,  'חובה כאשר מועסקים עובדים', null),
  ('11111111-1111-1111-1111-111111111014', 'תעודת כשרות',                    'Health',       12, false, 'רק אם העסק מצהיר על כשרות', null),
  ('11111111-1111-1111-1111-111111111015', 'היתר הוצאת שולחנות וכיסאות',     'Municipality', 12, false, 'רק אם יש ישיבה בחוץ', 'outdoor_seating_request'),
  ('11111111-1111-1111-1111-111111111016', 'רישיון למכירת אלכוהול',          'Municipality', 12, false, 'רק אם נמכר אלכוהול', null),
  ('11111111-1111-1111-1111-111111111017', 'היתר שילוט',                     'Municipality', 12, false, 'רק אם קיים שילוט חוץ', null),
  ('11111111-1111-1111-1111-111111111018', 'אישור מערכת מצלמות ואבטחה',      'Municipality', 12, false, 'רק אם נדרש הסדר אבטחה', null),
  ('11111111-1111-1111-1111-111111111019', 'תצהיר בטיחות אש – מסלול מקוצר',  'Fire',         12, true,  'תצהיר בעל העסק במסלול רישוי מקוצר', 'fire_safety_declaration'),
  ('11111111-1111-1111-1111-111111111020', 'תצהיר נגישות בעסק',              'Municipality', 12, true,  'תצהיר בעל העסק על התקיימות הוראות הנגישות', 'accessibility_affidavit')
on conflict (id) do update
  set name = excluded.name,
      category = excluded.category,
      default_validity_months = excluded.default_validity_months,
      is_default_active = excluded.is_default_active,
      applies_to_hint = excluded.applies_to_hint,
      generator_key = excluded.generator_key;
