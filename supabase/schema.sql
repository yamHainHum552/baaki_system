create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'ledger_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.ledger_type as enum ('BAAKI', 'PAYMENT');
  end if;
end $$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  risk_threshold numeric(12, 2) not null default 1000,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.stores add column if not exists risk_threshold numeric(12, 2) not null default 1000;
alter table public.stores add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  active_store_id uuid references public.stores(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists active_store_id uuid references public.stores(id) on delete set null;
update public.profiles
set active_store_id = store_id
where active_store_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'store_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.store_role as enum ('OWNER', 'STAFF');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_plan'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.subscription_plan as enum ('FREE', 'PREMIUM');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'plan_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.plan_type as enum ('free', 'premium_monthly', 'premium_yearly');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'plan_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.plan_status as enum ('inactive', 'active', 'trialing', 'past_due', 'cancelled');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'billing_cycle'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.billing_cycle as enum ('none', 'monthly', 'yearly');
  end if;
end $$;

create table if not exists public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role public.store_role not null default 'STAFF',
  permissions jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, store_id)
);

alter table public.store_memberships add column if not exists permissions jsonb not null default '[]'::jsonb;

update public.store_memberships
set permissions = '["manage_customers","manage_ledger","send_sms_reminders","share_customer_ledger","export_customer_ledger"]'::jsonb
where role = 'STAFF'
  and (
    permissions is null
    or permissions = '[]'::jsonb
  );

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan public.subscription_plan not null default 'FREE',
  expires_at timestamptz,
  customer_limit integer not null default 50,
  plan_type public.plan_type not null default 'free',
  plan_status public.plan_status not null default 'active',
  premium_enabled boolean not null default false,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  grace_ends_at timestamptz,
  billing_cycle public.billing_cycle not null default 'none',
  max_customers integer not null default 50,
  max_staff integer not null default 1,
  max_sms_per_month integer not null default 0,
  max_exports_per_month integer not null default 3,
  max_share_links_per_month integer not null default 5,
  feature_flags jsonb not null default '{}'::jsonb,
  billing_provider text,
  provider_subscription_id text,
  provider_payment_id text,
  provider_reference_id text,
  plan_code text,
  amount numeric(12, 2),
  currency text not null default 'NPR',
  payment_initiated_at timestamptz,
  payment_verified_at timestamptz,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null,
  verified_by_system boolean not null default false,
  last_provider_event_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists plan_type public.plan_type not null default 'free';
alter table public.subscriptions add column if not exists plan_status public.plan_status not null default 'active';
alter table public.subscriptions add column if not exists premium_enabled boolean not null default false;
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists subscription_starts_at timestamptz;
alter table public.subscriptions add column if not exists subscription_ends_at timestamptz;
alter table public.subscriptions add column if not exists grace_ends_at timestamptz;
alter table public.subscriptions add column if not exists billing_cycle public.billing_cycle not null default 'none';
alter table public.subscriptions add column if not exists max_customers integer not null default 50;
alter table public.subscriptions add column if not exists max_staff integer not null default 1;
alter table public.subscriptions add column if not exists max_sms_per_month integer not null default 0;
alter table public.subscriptions add column if not exists max_exports_per_month integer not null default 3;
alter table public.subscriptions add column if not exists max_share_links_per_month integer not null default 5;
alter table public.subscriptions add column if not exists feature_flags jsonb not null default '{}'::jsonb;
alter table public.subscriptions add column if not exists billing_provider text;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists provider_payment_id text;
alter table public.subscriptions add column if not exists provider_reference_id text;
alter table public.subscriptions add column if not exists plan_code text;
alter table public.subscriptions add column if not exists amount numeric(12, 2);
alter table public.subscriptions add column if not exists currency text not null default 'NPR';
alter table public.subscriptions add column if not exists payment_initiated_at timestamptz;
alter table public.subscriptions add column if not exists payment_verified_at timestamptz;
alter table public.subscriptions add column if not exists raw_metadata jsonb not null default '{}'::jsonb;
alter table public.subscriptions add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;
alter table public.subscriptions add column if not exists verified_by_system boolean not null default false;
alter table public.subscriptions add column if not exists last_provider_event_at timestamptz;

update public.subscriptions
set
  plan_type = case when plan = 'PREMIUM' then 'premium_monthly'::public.plan_type else 'free'::public.plan_type end,
  plan_status = case
    when trial_ends_at is not null and trial_ends_at > now() then 'trialing'::public.plan_status
    when plan = 'PREMIUM' then 'active'::public.plan_status
    else 'active'::public.plan_status
  end,
  premium_enabled = case
    when plan = 'PREMIUM' then true
    when trial_ends_at is not null and trial_ends_at > now() then true
    else false
  end,
  billing_cycle = case when plan = 'PREMIUM' then 'monthly'::public.billing_cycle else 'none'::public.billing_cycle end,
  max_customers = coalesce(nullif(customer_limit, 0), 50),
  max_staff = case when plan = 'PREMIUM' then 10 else 1 end,
  max_sms_per_month = case when plan = 'PREMIUM' then 250 else 0 end,
  max_exports_per_month = case when plan = 'PREMIUM' then 500 else 3 end,
  max_share_links_per_month = case when plan = 'PREMIUM' then 500 else 5 end
where true;

create table if not exists public.subscription_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  contact_phone text,
  notes text,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type public.ledger_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_share_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_usage_counters (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  usage_month date not null,
  sms_sent_count integer not null default 0,
  export_count integer not null default 0,
  share_link_count integer not null default 0,
  customer_count_snapshot integer not null default 0,
  staff_count_snapshot integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, usage_month)
);

create table if not exists public.billing_provider_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  billing_payment_id uuid,
  provider text not null,
  event_type text not null,
  status text not null default 'received',
  provider_reference text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text
);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  initiated_by_user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  plan_type public.plan_type not null,
  billing_cycle public.billing_cycle not null,
  amount_minor integer not null,
  amount numeric(12, 2) not null,
  currency text not null default 'NPR',
  status text not null default 'pending',
  purchase_order_id text not null unique,
  provider_payment_id text,
  provider_reference_id text,
  provider_status text,
  raw_init_payload jsonb not null default '{}'::jsonb,
  raw_callback_payload jsonb not null default '{}'::jsonb,
  raw_verification_payload jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null default '{}'::jsonb,
  initiated_at timestamptz not null default now(),
  verified_at timestamptz,
  completed_at timestamptz,
  last_provider_event_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.billing_provider_events add column if not exists subscription_id uuid references public.subscriptions(id) on delete cascade;
alter table public.billing_provider_events add column if not exists billing_payment_id uuid references public.billing_payments(id) on delete cascade;
alter table public.billing_provider_events add column if not exists provider_reference text;
alter table public.billing_provider_events add column if not exists processing_result text;

create table if not exists public.user_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_name text,
  transports jsonb not null default '[]'::jsonb,
  credential_device_type text not null default 'singleDevice',
  credential_backed_up boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  flow text not null,
  challenge text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (flow, challenge)
);

insert into public.store_memberships (user_id, store_id, role, is_default)
select p.id, p.store_id, 'OWNER', true
from public.profiles p
where not exists (
  select 1
  from public.store_memberships sm
  where sm.user_id = p.id
    and sm.store_id = p.store_id
);

insert into public.subscriptions (store_id, plan, customer_limit)
select s.id, 'FREE', 50
from public.stores s
where not exists (
  select 1
  from public.subscriptions sub
  where sub.store_id = s.id
);

insert into public.subscription_upgrade_requests (store_id, requested_by, contact_phone, notes, status)
select s.id, s.created_by, s.phone, 'Auto-created placeholder', 'NONE'
from public.stores s
where false;

create index if not exists customers_store_id_idx on public.customers(store_id);
create index if not exists customers_name_idx on public.customers(store_id, name);
create index if not exists ledger_entries_store_id_idx on public.ledger_entries(store_id);
create index if not exists ledger_entries_customer_created_idx on public.ledger_entries(customer_id, created_at, id);
create index if not exists ledger_entries_store_customer_idx on public.ledger_entries(store_id, customer_id);
create index if not exists ledger_entries_created_at_idx on public.ledger_entries(created_at);
create index if not exists store_memberships_user_idx on public.store_memberships(user_id, store_id);
create index if not exists customer_share_tokens_customer_idx on public.customer_share_tokens(customer_id, expires_at);
create index if not exists audit_logs_store_created_idx on public.audit_logs(store_id, created_at desc);
create index if not exists subscription_upgrade_requests_store_idx on public.subscription_upgrade_requests(store_id, status);
create index if not exists subscriptions_store_plan_idx on public.subscriptions(store_id, plan_type, plan_status);
create index if not exists store_usage_counters_store_month_idx on public.store_usage_counters(store_id, usage_month desc);
create index if not exists billing_provider_events_store_idx on public.billing_provider_events(store_id, received_at desc);
create index if not exists billing_provider_events_payment_idx on public.billing_provider_events(billing_payment_id, received_at desc);
create index if not exists billing_payments_store_created_idx on public.billing_payments(store_id, created_at desc);
create index if not exists billing_payments_purchase_order_idx on public.billing_payments(provider, purchase_order_id);
create index if not exists billing_payments_provider_reference_idx on public.billing_payments(provider, provider_reference_id);
create index if not exists billing_payments_status_idx on public.billing_payments(status, created_at desc);
create index if not exists user_passkeys_user_idx on public.user_passkeys(user_id, created_at desc);
create index if not exists passkey_challenges_flow_idx on public.passkey_challenges(flow, expires_at desc);

create or replace function public.current_store_id()
returns uuid
language sql
stable
as $$
  select coalesce(active_store_id, store_id)
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_store_role()
returns public.store_role
language sql
stable
as $$
  select sm.role
  from public.store_memberships sm
  where sm.user_id = auth.uid()
    and sm.store_id = public.current_store_id()
  limit 1;
$$;

create or replace function public.current_usage_month()
returns date
language sql
stable
as $$
  select date_trunc('month', now())::date;
$$;

create or replace function public.has_store_role(p_role public.store_role)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.store_memberships sm
    where sm.user_id = auth.uid()
      and sm.store_id = public.current_store_id()
      and (
        sm.role = p_role
        or sm.role = 'OWNER'
      )
  );
end;
$$;

create or replace function public.log_subscription_event(
  p_store_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (store_id, actor_user_id, entity_type, action, details)
  values (
    p_store_id,
    auth.uid(),
    'subscription',
    p_action,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function public.create_store_for_current_user(
  p_name text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a store.';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.store_id is not null
  ) then
    raise exception 'This account has already been linked to a store workspace and cannot create a new store.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Store name is required.';
  end if;

  insert into public.stores (name, phone)
  values (btrim(p_name), nullif(btrim(p_phone), ''))
  returning id into v_store_id;

  update public.stores
  set created_by = auth.uid()
  where id = v_store_id;

  insert into public.profiles (id, store_id, active_store_id)
  values (auth.uid(), v_store_id, v_store_id)
  on conflict (id) do update
    set store_id = excluded.store_id,
        active_store_id = excluded.active_store_id;

  insert into public.store_memberships (user_id, store_id, role, is_default)
  values (auth.uid(), v_store_id, 'OWNER', true)
  on conflict (user_id, store_id) do update
    set role = excluded.role,
        is_default = excluded.is_default;

  insert into public.subscriptions (store_id, plan, customer_limit)
  values (v_store_id, 'FREE', 50)
  on conflict (store_id) do nothing;

  return v_store_id;
end;
$$;

grant execute on function public.create_store_for_current_user(text, text) to authenticated;

create or replace function public.set_active_store(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.store_memberships
    where user_id = auth.uid()
      and store_id = p_store_id
  ) then
    raise exception 'You do not have access to this store.';
  end if;

  update public.profiles
  set active_store_id = p_store_id
  where id = auth.uid();
end;
$$;

grant execute on function public.set_active_store(uuid) to authenticated;

create or replace function public.request_premium_for_current_store(
  p_contact_phone text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_request_id uuid;
begin
  v_store_id := public.current_store_id();

  if v_store_id is null then
    raise exception 'No active store selected.';
  end if;

  if not public.has_store_role('OWNER') then
    raise exception 'Only store owners can request Premium.';
  end if;

  insert into public.subscription_upgrade_requests (
    store_id,
    requested_by,
    contact_phone,
    notes,
    status,
    updated_at
  )
  values (
    v_store_id,
    auth.uid(),
    nullif(btrim(p_contact_phone), ''),
    nullif(btrim(p_notes), ''),
    'PENDING',
    now()
  )
  on conflict (store_id) do update
    set requested_by = excluded.requested_by,
        contact_phone = excluded.contact_phone,
        notes = excluded.notes,
        status = 'PENDING',
        updated_at = now()
  returning id into v_request_id;

  perform public.log_subscription_event(
    v_store_id,
    'PREMIUM_REQUESTED',
    jsonb_build_object(
      'request_id', v_request_id,
      'contact_phone', nullif(btrim(p_contact_phone), ''),
      'notes', nullif(btrim(p_notes), '')
    )
  );

  return v_request_id;
end;
$$;

grant execute on function public.request_premium_for_current_store(text, text) to authenticated;

create or replace function public.bump_store_usage(
  p_store_id uuid,
  p_metric text,
  p_amount integer default 1
)
returns public.store_usage_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := public.current_usage_month();
  v_row public.store_usage_counters%ROWTYPE;
begin
  if p_amount is null or p_amount < 1 then
    raise exception 'Usage amount must be greater than 0.';
  end if;

  if not exists (
    select 1
    from public.store_memberships
    where user_id = auth.uid()
      and store_id = p_store_id
  ) then
    raise exception 'You do not have access to this store.';
  end if;

  insert into public.store_usage_counters (
    store_id,
    usage_month,
    sms_sent_count,
    export_count,
    share_link_count,
    customer_count_snapshot,
    staff_count_snapshot
  )
  values (
    p_store_id,
    v_month,
    case when p_metric = 'sms' then p_amount else 0 end,
    case when p_metric = 'exports' then p_amount else 0 end,
    case when p_metric = 'share_links' then p_amount else 0 end,
    (select count(*) from public.customers where store_id = p_store_id),
    (select count(*) from public.store_memberships where store_id = p_store_id)
  )
  on conflict (store_id, usage_month) do update
    set sms_sent_count = public.store_usage_counters.sms_sent_count + case when p_metric = 'sms' then p_amount else 0 end,
        export_count = public.store_usage_counters.export_count + case when p_metric = 'exports' then p_amount else 0 end,
        share_link_count = public.store_usage_counters.share_link_count + case when p_metric = 'share_links' then p_amount else 0 end,
        customer_count_snapshot = (select count(*) from public.customers where store_id = p_store_id),
        staff_count_snapshot = (select count(*) from public.store_memberships where store_id = p_store_id),
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.bump_store_usage(uuid, text, integer) to authenticated;

create or replace function public.sync_store_usage_snapshots(
  p_store_id uuid default public.current_store_id()
)
returns public.store_usage_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := public.current_usage_month();
  v_row public.store_usage_counters%ROWTYPE;
begin
  if p_store_id is null then
    raise exception 'No store selected.';
  end if;

  if not exists (
    select 1
    from public.store_memberships
    where user_id = auth.uid()
      and store_id = p_store_id
  ) then
    raise exception 'You do not have access to this store.';
  end if;

  insert into public.store_usage_counters (
    store_id,
    usage_month,
    customer_count_snapshot,
    staff_count_snapshot
  )
  values (
    p_store_id,
    v_month,
    (select count(*) from public.customers where store_id = p_store_id),
    (select count(*) from public.store_memberships where store_id = p_store_id)
  )
  on conflict (store_id, usage_month) do update
    set customer_count_snapshot = (select count(*) from public.customers where store_id = p_store_id),
        staff_count_snapshot = (select count(*) from public.store_memberships where store_id = p_store_id),
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.sync_store_usage_snapshots(uuid) to authenticated;

create or replace function public.start_store_trial(
  p_duration_days integer default 7
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid := public.current_store_id();
begin
  if v_store_id is null then
    raise exception 'No active store selected.';
  end if;

  if not public.has_store_role('OWNER') then
    raise exception 'Only store owners can start a trial.';
  end if;

  if exists (
    select 1
    from public.subscriptions
    where store_id = v_store_id
      and trial_started_at is not null
  ) then
    raise exception 'Trial has already been used for this store.';
  end if;

  update public.subscriptions
  set plan_status = 'trialing',
      premium_enabled = true,
      trial_started_at = now(),
      trial_ends_at = now() + make_interval(days => greatest(coalesce(p_duration_days, 7), 1)),
      billing_cycle = 'none',
      grace_ends_at = null
  where store_id = v_store_id;

  perform public.log_subscription_event(
    v_store_id,
    'TRIAL_STARTED',
    jsonb_build_object('duration_days', greatest(coalesce(p_duration_days, 7), 1))
  );

  return (
    select s
    from public.subscriptions s
    where s.store_id = v_store_id
    limit 1
  );
end;
$$;

grant execute on function public.start_store_trial(integer) to authenticated;


create or replace view public.customer_balances
with (security_invoker = true) as
select
  c.store_id,
  c.id as customer_id,
  c.name as customer_name,
  c.phone,
  c.address,
  coalesce(sum(case when l.type = 'BAAKI' then l.amount else 0 end), 0)::numeric(12, 2) as baaki_total,
  coalesce(sum(case when l.type = 'PAYMENT' then l.amount else 0 end), 0)::numeric(12, 2) as payment_total,
  (
    coalesce(sum(case when l.type = 'BAAKI' then l.amount else 0 end), 0) -
    coalesce(sum(case when l.type = 'PAYMENT' then l.amount else 0 end), 0)
  )::numeric(12, 2) as balance,
  max(l.created_at) as last_entry_at
from public.customers c
left join public.ledger_entries l on l.customer_id = c.id
group by c.store_id, c.id, c.name, c.phone, c.address;

create or replace function public.get_customer_ledger(p_customer_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  description text,
  type public.ledger_type,
  amount numeric(12, 2),
  balance numeric(12, 2)
)
language sql
stable
as $$
  select
    l.id,
    l.created_at,
    l.description,
    l.type,
    l.amount,
    sum(
      case
        when l.type = 'BAAKI' then l.amount
        else -l.amount
      end
    ) over (order by l.created_at asc, l.id asc)::numeric(12, 2) as balance
  from public.ledger_entries l
  where l.customer_id = p_customer_id
  order by l.created_at asc, l.id asc;
$$;

create or replace function public.get_customer_ledger_page(
  p_customer_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  description text,
  type public.ledger_type,
  amount numeric(12, 2),
  balance numeric(12, 2)
)
language sql
stable
as $$
  with ranked as (
    select
      l.id,
      l.created_at,
      l.description,
      l.type,
      l.amount,
      sum(
        case
          when l.type = 'BAAKI' then l.amount
          else -l.amount
        end
      ) over (order by l.created_at asc, l.id asc)::numeric(12, 2) as balance
    from public.ledger_entries l
    where l.customer_id = p_customer_id
  )
  select *
  from ranked
  order by created_at desc, id desc
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_customer_insights(p_customer_id uuid)
returns table (
  customer_id uuid,
  last_payment_date timestamptz,
  days_since_last_payment integer,
  total_baaki numeric(12, 2),
  payment_frequency numeric(12, 2)
)
language sql
stable
as $$
  with payments as (
    select
      created_at,
      lag(created_at) over (order by created_at asc) as previous_payment_at
    from public.ledger_entries
    where customer_id = p_customer_id
      and type = 'PAYMENT'
  ),
  totals as (
    select
      customer_id,
      max(case when type = 'PAYMENT' then created_at end) as last_payment_date,
      (
        coalesce(sum(case when type = 'BAAKI' then amount else 0 end), 0) -
        coalesce(sum(case when type = 'PAYMENT' then amount else 0 end), 0)
      )::numeric(12, 2) as total_baaki
    from public.ledger_entries
    where customer_id = p_customer_id
    group by customer_id
  )
  select
    p_customer_id as customer_id,
    t.last_payment_date,
    case
      when t.last_payment_date is null then null
      else (current_date - date(t.last_payment_date))::integer
    end as days_since_last_payment,
    coalesce(t.total_baaki, 0)::numeric(12, 2) as total_baaki,
    avg(
      case
        when previous_payment_at is null then null
        else extract(epoch from (created_at - previous_payment_at)) / 86400
      end
    )::numeric(12, 2) as payment_frequency
  from totals t
  full outer join payments p on true
  group by t.last_payment_date, t.total_baaki;
$$;

create or replace function public.get_store_daily_report(
  p_period text default 'day',
  p_limit integer default 30
)
returns table (
  bucket date,
  total_baaki_added numeric(12, 2),
  total_payments_received numeric(12, 2),
  net_change numeric(12, 2)
)
language sql
stable
as $$
  select
    case
      when lower(coalesce(p_period, 'day')) = 'month'
        then date_trunc('month', created_at)::date
      else date(created_at)
    end as bucket,
    coalesce(sum(case when type = 'BAAKI' then amount else 0 end), 0)::numeric(12, 2) as total_baaki_added,
    coalesce(sum(case when type = 'PAYMENT' then amount else 0 end), 0)::numeric(12, 2) as total_payments_received,
    (
      coalesce(sum(case when type = 'BAAKI' then amount else 0 end), 0) -
      coalesce(sum(case when type = 'PAYMENT' then amount else 0 end), 0)
    )::numeric(12, 2) as net_change
  from public.ledger_entries
  where store_id = public.current_store_id()
  group by 1
  order by bucket desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

create or replace function public.get_top_debtors(p_limit integer default 10)
returns table (
  customer_id uuid,
  customer_name text,
  total_baaki numeric(12, 2),
  longest_unpaid_days integer
)
language sql
stable
as $$
  with per_customer as (
    select
      c.id as customer_id,
      c.name as customer_name,
      (
        coalesce(sum(case when l.type = 'BAAKI' then l.amount else 0 end), 0) -
        coalesce(sum(case when l.type = 'PAYMENT' then l.amount else 0 end), 0)
      )::numeric(12, 2) as total_baaki,
      max(case when l.type = 'PAYMENT' then l.created_at end) as last_payment_date
    from public.customers c
    left join public.ledger_entries l on l.customer_id = c.id
    where c.store_id = public.current_store_id()
    group by c.id, c.name
  )
  select
    customer_id,
    customer_name,
    total_baaki,
    case
      when last_payment_date is null then null
      else (current_date - date(last_payment_date))::integer
    end as longest_unpaid_days
  from per_customer
  order by total_baaki desc, customer_name asc
  limit greatest(coalesce(p_limit, 10), 1);
$$;

create or replace function public.get_cash_flow_forecast()
returns table (
  customer_id uuid,
  customer_name text,
  expected_payment_date date,
  expected_amount numeric(12, 2),
  next_7_days_expected numeric(12, 2)
)
language sql
stable
as $$
  with payment_rows as (
    select
      c.id as customer_id,
      c.name as customer_name,
      l.created_at,
      lag(l.created_at) over (partition by c.id order by l.created_at asc) as previous_payment_at
    from public.customers c
    left join public.ledger_entries l
      on l.customer_id = c.id
     and l.type = 'PAYMENT'
    where c.store_id = public.current_store_id()
  ),
  payment_gaps as (
    select
      c.id as customer_id,
      c.name as customer_name,
      max(pr.created_at) as last_payment_date,
      avg(
        case
          when pr.previous_payment_at is not null
          then extract(epoch from (pr.created_at - pr.previous_payment_at)) / 86400
          else null
        end
      ) as avg_interval_days,
      (
        coalesce(sum(case when l.type = 'BAAKI' then l.amount else 0 end), 0) -
        coalesce(sum(case when l.type = 'PAYMENT' then l.amount else 0 end), 0)
      )::numeric(12, 2) as outstanding_amount
    from public.customers c
    left join public.ledger_entries l on l.customer_id = c.id
    left join payment_rows pr on pr.customer_id = c.id and pr.created_at = l.created_at
    where c.store_id = public.current_store_id()
    group by c.id, c.name
  ),
  forecast as (
    select
      customer_id,
      customer_name,
      case
        when last_payment_date is null or avg_interval_days is null then null
        else (date(last_payment_date) + make_interval(days => ceil(avg_interval_days)::integer))::date
      end as expected_payment_date,
      outstanding_amount as expected_amount
    from payment_gaps
  )
  select
    customer_id,
    customer_name,
    expected_payment_date,
    expected_amount,
    case
      when expected_payment_date between current_date and current_date + 7 then expected_amount
      else 0::numeric(12, 2)
    end as next_7_days_expected
  from forecast
  order by expected_payment_date nulls last, customer_name asc;
$$;

create or replace function public.get_shared_customer_ledger(
  p_customer_id uuid,
  p_token text
)
returns table (
  customer_name text,
  created_at timestamptz,
  description text,
  type public.ledger_type,
  amount numeric(12, 2),
  balance numeric(12, 2)
)
language sql
security definer
set search_path = public
as $$
  with valid_token as (
    select 1
    from public.customer_share_tokens
    where customer_id = p_customer_id
      and token = p_token
      and expires_at > now()
    limit 1
  )
  select
    c.name as customer_name,
    l.created_at,
    l.description,
    l.type,
    l.amount,
    sum(
      case
        when l.type = 'BAAKI' then l.amount
        else -l.amount
      end
    ) over (order by l.created_at asc, l.id asc)::numeric(12, 2) as balance
  from public.customers c
  join public.ledger_entries l on l.customer_id = c.id
  where c.id = p_customer_id
    and exists (select 1 from valid_token)
  order by l.created_at asc, l.id asc;
$$;

grant execute on function public.get_shared_customer_ledger(uuid, text) to anon, authenticated;

create or replace function public.log_ledger_entry_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (store_id, actor_user_id, entity_type, entity_id, action, details)
  values (
    new.store_id,
    auth.uid(),
    'ledger_entry',
    new.id,
    'CREATED',
    jsonb_build_object(
      'customer_id', new.customer_id,
      'type', new.type,
      'amount', new.amount,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists ledger_entries_audit_insert on public.ledger_entries;

create trigger ledger_entries_audit_insert
after insert on public.ledger_entries
for each row
execute function public.log_ledger_entry_event();

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.store_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_upgrade_requests enable row level security;
alter table public.store_usage_counters enable row level security;
alter table public.billing_provider_events enable row level security;
alter table public.billing_payments enable row level security;
alter table public.user_passkeys enable row level security;
alter table public.passkey_challenges enable row level security;
alter table public.customer_share_tokens enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Store owners can view their store" on public.stores;
create policy "Store owners can view their store"
on public.stores
for select
using (
  exists (
    select 1
    from public.store_memberships sm
    where sm.user_id = auth.uid()
      and sm.store_id = stores.id
  )
);

drop policy if exists "Authenticated users can create a store" on public.stores;
create policy "Authenticated users can create a store"
on public.stores
for insert
to authenticated
with check (true);

drop policy if exists "Store owners can update their store" on public.stores;
create policy "Store owners can update their store"
on public.stores
for update
to authenticated
using (public.has_store_role('OWNER'))
with check (public.has_store_role('OWNER'));

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can view their memberships" on public.store_memberships;
create policy "Users can view their memberships"
on public.store_memberships
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Owners can manage memberships" on public.store_memberships;
create policy "Owners can manage memberships"
on public.store_memberships
for all
to authenticated
using (public.has_store_role('OWNER'))
with check (public.has_store_role('OWNER'));

drop policy if exists "Customers belong to current store" on public.customers;
create policy "Customers belong to current store"
on public.customers
for all
to authenticated
using (store_id = public.current_store_id())
with check (store_id = public.current_store_id());

drop policy if exists "Ledger entries belong to current store" on public.ledger_entries;
create policy "Ledger entries belong to current store"
on public.ledger_entries
for all
to authenticated
using (store_id = public.current_store_id())
with check (store_id = public.current_store_id());

drop policy if exists "Subscriptions belong to current store" on public.subscriptions;
create policy "Subscriptions belong to current store"
on public.subscriptions
for select
to authenticated
using (store_id = public.current_store_id());

drop policy if exists "Owners manage subscriptions" on public.subscriptions;
create policy "Owners manage subscriptions"
on public.subscriptions
for all
to authenticated
using (public.has_store_role('OWNER'))
with check (public.has_store_role('OWNER'));

drop policy if exists "Owners manage upgrade requests" on public.subscription_upgrade_requests;
create policy "Owners manage upgrade requests"
on public.subscription_upgrade_requests
for all
to authenticated
using (store_id = public.current_store_id() and public.has_store_role('OWNER'))
with check (store_id = public.current_store_id() and public.has_store_role('OWNER'));

drop policy if exists "Usage counters belong to current store" on public.store_usage_counters;
create policy "Usage counters belong to current store"
on public.store_usage_counters
for select
to authenticated
using (store_id = public.current_store_id());

drop policy if exists "Billing events belong to current store" on public.billing_provider_events;
create policy "Billing events belong to current store"
on public.billing_provider_events
for select
to authenticated
using (store_id = public.current_store_id() and public.has_store_role('OWNER'));

drop policy if exists "Billing payments belong to current store owners" on public.billing_payments;
create policy "Billing payments belong to current store owners"
on public.billing_payments
for select
to authenticated
using (store_id = public.current_store_id() and public.has_store_role('OWNER'));

drop policy if exists "Users can view own passkeys" on public.user_passkeys;
create policy "Users can view own passkeys"
on public.user_passkeys
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can delete own passkeys" on public.user_passkeys;
create policy "Users can delete own passkeys"
on public.user_passkeys
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Share tokens belong to current store" on public.customer_share_tokens;
create policy "Share tokens belong to current store"
on public.customer_share_tokens
for all
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.store_id = public.current_store_id()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.store_id = public.current_store_id()
  )
);

drop policy if exists "Audit logs belong to current store" on public.audit_logs;
create policy "Audit logs belong to current store"
on public.audit_logs
for select
to authenticated
using (store_id = public.current_store_id());

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'admin_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.admin_role as enum ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN', 'OPS_ADMIN');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'store_admin_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.store_admin_status as enum ('active', 'suspended');
  end if;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role public.admin_role,
  action text not null,
  target_type text not null,
  target_id uuid,
  store_id uuid references public.stores(id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_support_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null,
  category text not null default 'GENERAL',
  created_at timestamptz not null default now()
);

alter table public.stores add column if not exists admin_status public.store_admin_status not null default 'active';
alter table public.stores add column if not exists suspended_at timestamptz;
alter table public.stores add column if not exists suspension_reason text;

create index if not exists admin_users_role_idx on public.admin_users(role, is_active);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_store_idx on public.admin_audit_logs(store_id, created_at desc);
create index if not exists admin_support_notes_store_idx on public.admin_support_notes(store_id, created_at desc);
create index if not exists stores_admin_status_idx on public.stores(admin_status, created_at desc);

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
as $$
  select role
  from public.admin_users
  where user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.log_admin_action(
  p_actor_user_id uuid,
  p_actor_role public.admin_role,
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_store_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_logs (
    actor_user_id,
    actor_role,
    action,
    target_type,
    target_id,
    store_id,
    details
  )
  values (
    p_actor_user_id,
    p_actor_role,
    p_action,
    p_target_type,
    p_target_id,
    p_store_id,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.log_admin_action(uuid, public.admin_role, text, text, uuid, uuid, jsonb) to authenticated;

alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_support_notes enable row level security;

drop policy if exists "Users can view own admin role" on public.admin_users;
create policy "Users can view own admin role"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can view admin audit logs" on public.admin_audit_logs;
create policy "Admins can view admin audit logs"
on public.admin_audit_logs
for select
to authenticated
using (public.current_admin_role() is not null);

drop policy if exists "Admins can view support notes" on public.admin_support_notes;
create policy "Admins can view support notes"
on public.admin_support_notes
for select
to authenticated
using (public.current_admin_role() is not null);
