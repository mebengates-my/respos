-- ============================================================
-- Café POS — Supabase SaaS schema (multi-tenant)
--
-- Run once in: Supabase Dashboard → SQL Editor → New query → Run
-- Every row below is scoped to a store (tenant). Row Level
-- Security guarantees one store can never read/write another.
--
-- The whole file is IDEMPOTENT: safe to re-run any number of
-- times, including on a project that already has stores and
-- orders (policies are dropped and recreated, existing data is
-- never touched).
-- ============================================================

-- ---------- Stores (tenants) ----------
-- `slug` is the store's public link: respos-five.vercel.app/mycafe.
-- Staff open it and sign in with just their 4-digit PIN.
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  currency text not null default 'RM',
  tax_rate numeric not null default 0.06,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Safe to re-run on existing installs: old stores get the column (NULL until
-- the backfill below fills it). Multiple NULLs are allowed by the unique index.
alter table public.stores add column if not exists slug text;
create unique index if not exists idx_stores_slug on public.stores (slug);

-- Operational settings are shared by every device. Existing stores default to
-- allowing servers to see all open orders until an Admin/Manager turns it off.
alter table public.stores alter column settings
  set default '{"serverCanViewAllOrders": true}'::jsonb;
update public.stores
set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{serverCanViewAllOrders}', 'true'::jsonb)
where not (coalesce(settings, '{}'::jsonb) ? 'serverCanViewAllOrders');

-- ---------- Profiles (one per authenticated user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

-- ---------- Memberships: who belongs to which store, with what role ----------
-- Staff (manager/server) get real auth users with a generated email and the
-- 4-digit PIN as password, so RLS works for everyone. Provisioning is done by
-- the store admin through a server-side API (Vercel) holding the service key.
create table if not exists public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','manager','server')),
  display_name text not null default '',
  pin text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (store_id, profile_id)
);

-- PIN brute-force guard used by verify_pin(): after 5 wrong attempts the
-- member is locked out for 5 minutes.
alter table public.store_members add column if not exists failed_attempts int not null default 0;
alter table public.store_members add column if not exists locked_until timestamptz;

-- ---------- Menu ----------
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  icon text not null default 'Coffee',
  sort int not null default 0
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents int not null check (price_cents >= 0),
  modifiers jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  sort int not null default 0
);

-- ---------- Tables ----------
create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  number int not null,
  capacity int not null default 4,
  is_counter boolean not null default false,
  status text not null default 'available'
    check (status in ('available','occupied','reserved','cleaning')),
  current_order_id uuid
);

-- ---------- Orders (open, held, paid, voided) ----------
-- Items are stored as JSONB (same shape as the local app) for easy migration.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  status text not null default 'open' check (status in ('open','held','paid','voided')),
  table_ref text,                      -- 'COUNTER' or dining_tables.id
  items jsonb not null default '[]'::jsonb,
  subtotal_cents int not null default 0,
  tax_cents int not null default 0,
  discount jsonb,
  discount_cents int not null default 0,
  total_cents int not null default 0,
  notes text,
  server_name text not null default '',
  payment_method text check (payment_method in ('cash','card','ewallet')),
  amount_paid_cents int,
  change_cents int,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  held_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz
);

-- ---------- Expenses ----------
-- Safe migration for projects created before server attribution was stored.
alter table public.orders add column if not exists server_name text not null default '';

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id) on delete cascade,
  description text not null default '',
  amount_cents int not null check (amount_cents > 0),
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_members_profile on public.store_members (profile_id);
create index if not exists idx_menu_cat_store on public.menu_categories (store_id);
create index if not exists idx_menu_items_store on public.menu_items (store_id);
create index if not exists idx_menu_items_cat on public.menu_items (category_id);
create index if not exists idx_tables_store on public.dining_tables (store_id);
create index if not exists idx_orders_store_status on public.orders (store_id, status);
create index if not exists idx_orders_paid_at on public.orders (store_id, paid_at);
-- A dining table can have only one unpaid order; walk-ins can have many.
create unique index if not exists idx_one_open_order_per_table
  on public.orders (store_id, table_ref)
  where status in ('open', 'held') and table_ref is not null and table_ref <> 'COUNTER';
create index if not exists idx_exp_cat_store on public.expense_categories (store_id);
create index if not exists idx_expenses_store_date on public.expenses (store_id, occurred_at);

-- ============================================================
-- Helpers: which stores does the signed-in user belong to?
-- ============================================================
create or replace function public.my_store_ids()
returns setof uuid
language sql security definer stable set search_path = public as $$
  select store_id from public.store_members
  where profile_id = auth.uid() and active = true
$$;

create or replace function public.my_managing_store_ids()
returns setof uuid
language sql security definer stable set search_path = public as $$
  select store_id from public.store_members
  where profile_id = auth.uid() and active = true
    and role in ('admin','manager')
$$;

create or replace function public.is_store_admin(sid uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.store_members
    where store_id = sid and profile_id = auth.uid()
      and role = 'admin' and active = true
  )
$$;

-- Admins and Managers may change this one operational switch without giving a
-- Manager broad UPDATE access to the stores table.
create or replace function public.set_server_order_visibility(p_store_id uuid, p_enabled boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  updated_settings jsonb;
begin
  if not exists (
    select 1 from public.store_members
    where store_id = p_store_id
      and profile_id = auth.uid()
      and active = true
      and role in ('admin', 'manager')
  ) then
    raise exception 'Only an Admin or Manager can change server order access';
  end if;

  update public.stores
  set settings = jsonb_set(
    coalesce(settings, '{}'::jsonb),
    '{serverCanViewAllOrders}',
    to_jsonb(coalesce(p_enabled, true))
  )
  where id = p_store_id
  returning settings into updated_settings;

  return updated_settings;
end;
$$;

revoke execute on function public.set_server_order_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_server_order_visibility(uuid, boolean) to authenticated;

-- ============================================================
-- Store slugs: "My Café" → respos-five.vercel.app/my-cafe
-- ============================================================

-- Turn a store name into a URL-safe slug ("My Café!" → "my-caf"… see note:
-- accents are dropped; pure names like "mycafe" stay "mycafe").
create or replace function public.unique_store_slug(p_name text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 2;
begin
  base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
  if base = '' or base in (
    'api', 'assets', 'docs', 'admin', 'login', 'settings', 'pos',
    'tables', 'reports', 'index', 'sw', 'favicon-ico'
  ) then
    base := coalesce(nullif(base, ''), 'store') || '-store';
  end if;

  candidate := base;
  while exists (select 1 from public.stores where slug = candidate) loop
    candidate := base || '-' || n;
    n := n + 1;
  end loop;
  return candidate;
end;
$$;

-- Backfill: give every existing store a slug (idempotent — only NULL ones).
do $$
declare
  r record;
begin
  for r in select id, name from public.stores where slug is null loop
    update public.stores
    set slug = public.unique_store_slug(r.name)
    where id = r.id and slug is null;
  end loop;
end $$;

-- ============================================================
-- Sign-up flow: creates profile + store + admin membership.
-- Called by the app right after Supabase Auth sign-up.
-- Returns { id, slug } so the app can immediately show the owner
-- their staff sign-in link (…/<slug>).
-- ============================================================
drop function if exists public.register_store(text, text);

create or replace function public.register_store(p_store_name text, p_display_name text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  new_store_id uuid;
  new_slug text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, display_name, email)
  values (auth.uid(), coalesce(p_display_name, ''),
          (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set display_name = excluded.display_name;

  new_slug := public.unique_store_slug(p_store_name);

  insert into public.stores (name, slug, created_by)
  values (p_store_name, new_slug, auth.uid())
  returning id into new_store_id;

  insert into public.store_members (store_id, profile_id, role, display_name)
  values (new_store_id, auth.uid(), 'admin', coalesce(p_display_name, ''));

  return jsonb_build_object('id', new_store_id, 'slug', new_slug);
end;
$$;

grant execute on function public.register_store(text, text) to authenticated;

-- ============================================================
-- Public (anon) store + PIN login RPCs.
--
-- The /<slug> page must render before anyone is authenticated, so these
-- functions are SECURITY DEFINER, expose only safe fields, and are granted
-- to `anon`. They are the only public surface: everything else stays
-- behind RLS.
-- ============================================================

-- Resolve a store link to its id/name/slug (null when unknown).
create or replace function public.get_store_by_slug(p_slug text)
returns jsonb
language sql security definer stable set search_path = public as $$
  select jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
  from public.stores s
  where lower(s.slug) = lower(trim(p_slug))
  limit 1
$$;

-- Active staff of a store (only members that actually have a PIN — the
-- registering owner, who signs in with email/password, is excluded).
create or replace function public.store_roster(p_slug text)
returns table(profile_id uuid, display_name text, role text)
language sql security definer stable set search_path = public as $$
  select m.profile_id, m.display_name, m.role
  from public.store_members m
  join public.stores s on s.id = m.store_id
  where lower(s.slug) = lower(trim(p_slug))
    and m.active = true
    and m.pin is not null
    and m.pin <> ''
  order by
    case m.role when 'admin' then 1 when 'manager' then 2 else 3 end,
    m.display_name
$$;

-- Verify a staff PIN against a store link. On success returns the member's
-- auth email so the client can call supabase.auth.signInWithPassword
-- (password = the same PIN) and get a real, RLS-scoped session.
-- Locks the member for 5 minutes after 5 failed attempts.
create or replace function public.verify_pin(p_slug text, p_profile_id uuid, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
  member record;
  attempts int;
begin
  select id into sid from public.stores where lower(slug) = lower(trim(p_slug));
  if sid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select m.pin, m.failed_attempts, m.locked_until, pr.email
    into member
  from public.store_members m
  join public.profiles pr on pr.id = m.profile_id
  where m.store_id = sid
    and m.profile_id = p_profile_id
    and m.active = true;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if member.locked_until is not null and member.locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  if member.pin is not null and member.pin = p_pin then
    update public.store_members
    set failed_attempts = 0, locked_until = null
    where store_id = sid and profile_id = p_profile_id;

    return jsonb_build_object('ok', true, 'email', member.email);
  end if;

  attempts := coalesce(member.failed_attempts, 0) + 1;
  update public.store_members
  set failed_attempts = attempts,
      locked_until = case when attempts >= 5 then now() + interval '5 minutes' else locked_until end
  where store_id = sid and profile_id = p_profile_id;

  if attempts >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  return jsonb_build_object('ok', false, 'reason', 'invalid');
end;
$$;

grant execute on function public.get_store_by_slug(text) to anon, authenticated;
grant execute on function public.store_roster(text) to anon, authenticated;
grant execute on function public.verify_pin(text, uuid, text) to anon, authenticated;

-- ============================================================
-- Store deletion: remove a tenant and everything it owns.
--
-- WHO can call it:
--   • the store's own admin (signed-in, via RPC) — for a future
--     "danger zone" in the app's settings screen;
--   • the SaaS operator: the SQL editor (postgres role) or a
--     service-role API call. NOT callable by anon or anyone
--     outside the store.
--
-- WHAT it deletes:
--   • the store row → cascades: memberships, menu categories and
--     items, dining tables, orders, expense categories, expenses;
--   • every member's AUTH account whose ONLY membership was this
--     store (so they can no longer sign in anywhere — their
--     profile, identities and sessions cascade away too). People
--     who also belong to another store keep their account and
--     merely lose this membership.
--
-- SAFETY: pass the exact store name OR its link slug (…/mycafe) as
-- p_confirm_name — a mismatch aborts. Cheap insurance against pasting
-- the wrong store id.
-- ============================================================
create or replace function public.delete_store(p_store_id uuid, p_confirm_name text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  store_name text;
  store_slug text;
  orphan_profiles uuid[];
begin
  select name, slug into store_name, store_slug from public.stores where id = p_store_id;
  if store_name is null then
    return jsonb_build_object('deleted', false, 'reason', 'not_found');
  end if;

  -- Authorization: signed-in callers must be the store's admin; anonymous
  -- callers are only allowed when running as the operator (SQL editor /
  -- service role). Everything else is rejected.
  if auth.uid() is not null then
    if not public.is_store_admin(p_store_id) then
      raise exception 'Only the store admin can delete this store';
    end if;
  elsif current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'Not allowed';
  end if;

  -- Optional confirmation: must match the store name OR its link slug.
  if p_confirm_name is not null
     and p_confirm_name <> store_name
     and p_confirm_name <> coalesce(store_slug, '') then
    raise exception 'Confirmation does not match the store name or link';
  end if;

  -- Members that belong ONLY to this store — their accounts go with it.
  select coalesce(array_agg(m.profile_id), '{}') into orphan_profiles
  from public.store_members m
  where m.store_id = p_store_id
    and not exists (
      select 1 from public.store_members other
      where other.profile_id = m.profile_id
        and other.store_id <> p_store_id
    );

  -- Delete the tenant. ON DELETE CASCADE removes memberships, menu,
  -- dining tables, orders and expenses.
  delete from public.stores where id = p_store_id;

  -- Delete the now-orphaned auth accounts (profiles cascade along).
  delete from auth.users where id = any(orphan_profiles);

  return jsonb_build_object(
    'deleted', true,
    'store', store_name,
    'removed_accounts', coalesce(array_length(orphan_profiles, 1), 0)
  );
end;
$$;

revoke execute on function public.delete_store(uuid, text) from public, anon;
grant execute on function public.delete_store(uuid, text) to authenticated, service_role;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.store_members enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.dining_tables enable row level security;
alter table public.orders enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

-- Stores: members read; Admins update the full store row. Managers change only
-- the server-order visibility key through set_server_order_visibility().
drop policy if exists "stores_select" on public.stores;
create policy "stores_select" on public.stores for select
  using (id in (select public.my_store_ids()));
drop policy if exists "stores_update" on public.stores;
create policy "stores_update" on public.stores for update
  using (public.is_store_admin(id))
  with check (public.is_store_admin(id));
drop policy if exists "stores_delete" on public.stores;
create policy "stores_delete" on public.stores for delete
  using (public.is_store_admin(id));

-- Profiles: any signed-in user can read basic names; update own
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  to authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());

-- Memberships: members read; admins manage
drop policy if exists "members_select" on public.store_members;
create policy "members_select" on public.store_members for select
  using (store_id in (select public.my_store_ids()));
drop policy if exists "members_insert" on public.store_members;
create policy "members_insert" on public.store_members for insert
  with check (public.is_store_admin(store_id));
drop policy if exists "members_update" on public.store_members;
create policy "members_update" on public.store_members for update
  using (public.is_store_admin(store_id));
drop policy if exists "members_delete" on public.store_members;
create policy "members_delete" on public.store_members for delete
  using (public.is_store_admin(store_id));

-- Menu: members read; managers+ write
drop policy if exists "menu_cat_select" on public.menu_categories;
create policy "menu_cat_select" on public.menu_categories for select
  using (store_id in (select public.my_store_ids()));
drop policy if exists "menu_cat_write" on public.menu_categories;
create policy "menu_cat_write" on public.menu_categories for all
  using (store_id in (select public.my_managing_store_ids()))
  with check (store_id in (select public.my_managing_store_ids()));

drop policy if exists "menu_items_select" on public.menu_items;
create policy "menu_items_select" on public.menu_items for select
  using (store_id in (select public.my_store_ids()));
drop policy if exists "menu_items_write" on public.menu_items;
create policy "menu_items_write" on public.menu_items for all
  using (store_id in (select public.my_managing_store_ids()))
  with check (store_id in (select public.my_managing_store_ids()));

-- Tables: members read & update status; managers+ add/remove
drop policy if exists "tables_select" on public.dining_tables;
create policy "tables_select" on public.dining_tables for select
  using (store_id in (select public.my_store_ids()));
drop policy if exists "tables_update" on public.dining_tables;
create policy "tables_update" on public.dining_tables for update
  using (store_id in (select public.my_store_ids()));
drop policy if exists "tables_insert" on public.dining_tables;
create policy "tables_insert" on public.dining_tables for insert
  with check (store_id in (select public.my_managing_store_ids()));
drop policy if exists "tables_delete" on public.dining_tables;
create policy "tables_delete" on public.dining_tables for delete
  using (store_id in (select public.my_managing_store_ids()));

-- Orders:
-- * Admins/Managers can read and update every order in their store.
-- * Servers can always create orders and maintain their own open orders.
-- * When stores.settings.serverCanViewAllOrders is true (the default), servers
--   can also read/maintain other servers' open table and walk-in orders.
-- * Servers can never mark an order paid; payment remains manager-only.
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select
  using (
    store_id in (select public.my_managing_store_ids())
    or (
      store_id in (select public.my_store_ids())
      and (
        created_by = auth.uid()
        or coalesce(
          (select (s.settings ->> 'serverCanViewAllOrders')::boolean
           from public.stores s where s.id = public.orders.store_id),
          true
        )
      )
    )
  );

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert
  with check (
    store_id in (select public.my_managing_store_ids())
    or (store_id in (select public.my_store_ids()) and created_by = auth.uid())
  );

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders for update
  using (
    store_id in (select public.my_managing_store_ids())
    or (
      status in ('open', 'held')
      and store_id in (select public.my_store_ids())
      and (
        created_by = auth.uid()
        or coalesce(
          (select (s.settings ->> 'serverCanViewAllOrders')::boolean
           from public.stores s where s.id = public.orders.store_id),
          true
        )
      )
    )
  )
  with check (
    store_id in (select public.my_managing_store_ids())
    or (
      status in ('open', 'held', 'voided')
      and store_id in (select public.my_store_ids())
      and (
        created_by = auth.uid()
        or coalesce(
          (select (s.settings ->> 'serverCanViewAllOrders')::boolean
           from public.stores s where s.id = public.orders.store_id),
          true
        )
      )
    )
  );

drop policy if exists "orders_delete" on public.orders;
create policy "orders_delete" on public.orders for delete
  using (store_id in (select public.my_managing_store_ids()));

-- Expenses: members read; managers+ write
drop policy if exists "exp_cat_select" on public.expense_categories;
create policy "exp_cat_select" on public.expense_categories for select
  using (store_id in (select public.my_store_ids()));
drop policy if exists "exp_cat_write" on public.expense_categories;
create policy "exp_cat_write" on public.expense_categories for all
  using (store_id in (select public.my_managing_store_ids()))
  with check (store_id in (select public.my_managing_store_ids()));

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select
  using (store_id in (select public.my_store_ids()));
drop policy if exists "expenses_write" on public.expenses;
create policy "expenses_write" on public.expenses for all
  using (store_id in (select public.my_managing_store_ids()))
  with check (store_id in (select public.my_managing_store_ids()));

-- ============================================================
-- Realtime: live open orders, table status, expenses across devices
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.stores;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.dining_tables;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.expenses;
  exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- Demo data is intentionally NOT included: each SaaS customer
-- creates their own store via register_store() and builds their
-- own menu, tables and staff.
-- ============================================================
