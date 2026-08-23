# Café POS → multi-store SaaS (Supabase + Vercel)

This app becomes a SaaS by keeping the **frontend on Vercel** (deployed from
GitHub) and moving all data into **Supabase** (hosted PostgreSQL). Each
restaurant that signs up gets its own **store**, and Postgres **Row Level
Security (RLS)** makes it impossible for one store to read another's data.

```
Vercel (React app, from GitHub)          Supabase
┌───────────────────────────┐           ┌──────────────────────────────┐
│ tablet / phone / PC       │──HTTPS──► │ stores, store_members, menus │
│ sign-in per staff member  │           │ tables, orders, expenses     │
│ realtime subscriptions    │◄──WS───── │ RLS scoped by store_id       │
└───────────────────────────┘           └──────────────────────────────┘
```

## Roles (same as the local app)

| Role    | Can do                                                        |
|---------|---------------------------------------------------------------|
| Admin   | everything incl. adding admins/managers/servers, settings      |
| Manager | reports, expenses, P&L, menu, tables — no users, no settings   |
| Server  | take orders only — no payments, no reports                     |

## Setup steps

1. **Create a Supabase project** (free tier) at https://supabase.com.
2. **Run the schema:** Dashboard → SQL Editor → paste the whole content of
   `supabase/schema.sql` → Run. This creates all tables, RLS policies,
   realtime publication and the `register_store()` sign-up function.
3. **Copy credentials:** Dashboard → Project Settings → API → *Project URL*
   and *anon public key*.
4. **Local dev:** `cp .env.example .env.local`, paste the two values, restart
   `npm run dev`.
5. **Deploy:** push to GitHub → import the repo in https://vercel.com →
   add the same two `VITE_*` env vars under Project → Settings →
   Environment Variables → Deploy. Also add `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` (server-only) for the staff-provisioning
   route (`api/provision-staff.js`).

## Sign-up & staff flow (how tenancy works)

1. Owner signs up with email/password (Supabase Auth) → app calls
   `register_store('My Café', 'Owner Name')` → creates `stores` (with a URL
   **slug**) + `store_members` (role `admin`) rows. The app then shows the
   owner their staff sign-in link, e.g. `respos-five.vercel.app/my-cafe`.
2. Admin creates managers/servers. Staff accounts are Supabase Auth users
   with a generated email (e.g. `mycafe-server-ab12@staff.internal`) and the
   4-digit PIN as password, so RLS applies to them too. Creating auth users
   requires the **service role key**, which must only ever live in a
   **server-side Vercel API route** (never in the browser).
3. Staff never touch an email. They open the store link
   (`respos-five.vercel.app/mycafe`), tap their name on the roster and enter
   their 4-digit PIN:
   - `get_store_by_slug(slug)` / `store_roster(slug)` — public anon RPCs that
     render the store's PIN screen (roster shows only members that have a PIN;
     the owner is not listed).
   - `verify_pin(slug, profile_id, pin)` — verifies the PIN server-side with a
     brute-force lockout (5 wrong tries → 5-minute lock) and returns the
     member's generated email. The client then calls
     `supabase.auth.signInWithPassword(email, pin)` to get a real,
     RLS-scoped session. The owner's email/password is never shared with staff.
4. `vercel.json` rewrites every non-file path (e.g. `/mycafe`) to the SPA, so
   store links work directly on Vercel. After logout the device returns to
   the same store's PIN screen, ready for the next staff member.

Slug rules: lowercased store name with non-alphanumerics collapsed to `-`
("My Café" → `my-cafe`, "mycafe" → `mycafe`); collisions get a `-2`, `-3`…
suffix; reserved words (`api`, `admin`, …) are rejected. Existing stores are
backfilled with a slug when the schema is re-run.

## Removing a store (end of life)

`delete_store(store_id, confirm_name)` removes a tenant completely. It is
callable by the store's own admin, or by the SaaS operator from the SQL
editor / with the service-role key — never by anonymous users or members of
other stores.

1. Find the store: `select id, name, slug from stores;`
2. Delete it, confirming the exact name so the wrong id can't be nuked:

```sql
select public.delete_store(
  '00000000-0000-0000-0000-000000000000'::uuid,   -- the store id
  'My Café'                                        -- must match the name exactly
);
```

Or the same call over the API with the service-role key:

```bash
curl -X POST 'https://<ref>.supabase.co/rest/v1/rpc/delete_store' \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"p_store_id":"<uuid>","p_confirm_name":"My Café"}'
```

What gets removed:

| Removed with the store row (cascade)            | Also deleted                          |
|--------------------------------------------------|---------------------------------------|
| `store_members` rows (this store's memberships)  | Auth accounts of members whose **only** store this was |
| menu categories + items, dining tables           | Their `profiles`, identities, sessions (cascade) |
| orders, expense categories, expenses             | Members of other stores keep their accounts — they just lose this membership |

Anyone signed in on a device at deletion time simply gets a signed-out
session on their next request (their auth user no longer exists). The store
link (`/slug`) immediately stops resolving to a login page.

Store admins can also delete **their own** store without SQL: the app's
Settings screen has a **Danger Zone** (cloud + admin only) that requires
typing the store link (or exact name) — the same guard the database
function enforces.

## Realtime (live open orders)

`orders`, `dining_tables` and `expenses` are added to the `supabase_realtime`
publication by the schema. Devices subscribe with
`supabase.channel(...).on('postgres_changes', ...)` — the Manager's Open
Orders board updates live from every tablet/phone in the store.

## Roadmap to full SaaS

- [x] Multi-tenant schema + RLS (`supabase/schema.sql`)
- [x] Cloud client scaffold (`src/services/cloud.js`, env-flagged)
- [x] Owner sign-up / sign-in / store-selection screens
      (`src/components/Onboarding.jsx` — built against an in-browser mock
      `src/services/cloudMock.js`, swapped for real Supabase automatically
      once the env vars are present)
- [x] Vercel API route for staff provisioning (`api/provision-staff.js` —
      service key, creates auth users + PINs + `store_members` rows; also
      supports `update` and `remove`, and requires the caller's Supabase
      access token so only the store admin can manage staff)
- [x] Admin → User Management wired to Supabase in cloud mode: lists real
      `store_members` (no more demo users), provisions/updates/removes staff
      through the route. The local demo staff picker on the Login screen is
      hidden when the app runs in cloud mode.
- [ ] Sync layer: menu, tables, expenses, settings ⇄ Supabase
- [ ] Orders over Supabase + realtime Open Orders & table status
- [ ] Offline outbox: queue changes locally when the connection drops
- [ ] Billing (e.g. Stripe) + plan limits per store

## Try it now (demo mode — no keys required)

Until the owner's Supabase project is provided, everything above the data
layer runs against an **in-browser mock** (`src/services/cloudMock.js`):

1. `npm run dev`
2. On the Login screen tap **Store login**.
3. Create a store (name + your name + email + password). You become the
   store's **admin** and land in the Admin Panel.
4. A cloud session (`cafe-pos-session-cloud`) persists across refresh and is
   re-validated on load, exactly like the real backend.
5. To test staff sign-in, open **Admin Panel → User Management** and add a
   manager/server (this provisions a real mock user with the 4-digit PIN),
   then sign in with that generated email + PIN via **Store login**.

Nothing about the UI changes when the real backend arrives — set
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local` and the mock is
replaced by Supabase transparently.

## Staff provisioning (Vercel route)

`api/provision-staff.js` creates a staff auth user (generated email like
`my-cafe-server-8f3k@staff.internal` with the 4-digit PIN as the password)
plus the `store_members` row. It needs the **service role key**, so it runs
server-side only:

- Env vars on Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  (Project Settings → API → `service_role` — never expose this to the client).
- Call it with `POST /api/provision-staff` and
  `Authorization: Bearer <caller's Supabase access token>` — the route
  verifies the caller is an **active admin** of `storeId` (401/403 otherwise),
  so a leaked URL can't be used to add staff to a store you don't admin.
- Body by action:
  - `{ action: 'provision', storeId, name, role, pin }` — default; creates the
    auth user (generated email, 4-digit PIN as password, pre-confirmed) +
    `store_members` row. `role` is `admin | manager | server`, `pin` is
    exactly 4 digits.
  - `{ action: 'update', storeId, profileId, name, role }` — rename / re-role.
    PIN resets are intentionally not supported: Supabase's admin user-update
    API enforces the password minimum (default 6), so a 4-digit PIN can't be
    assigned to an existing auth user without lowering the project's Auth
    password policy. PINs are set at creation only.
  - `{ action: 'remove', storeId, profileId }` — deletes the membership and
    the auth user, revoking the PIN everywhere.

Local dev: `npm run dev` serves the same route via a Vite middleware
(`vite.config.js`) so provisioning works without Vercel. It reads
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (server-side
only).

## Security notes

- The **anon key is public by design** — safety comes from RLS, which is why
  every table is scoped by `store_id`.
- The **service role key** bypasses RLS; keep it only in server-side Vercel
  functions.
- PINs are short by nature; Supabase rate-limits sign-in attempts, which is
  the main protection for staff PIN accounts.
