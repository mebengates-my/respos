# Café POS → multi-store SaaS (Supabase + Vercel)

This app becomes a SaaS by keeping the **frontend on Vercel** (deployed from
GitHub) and moving all data into **Supabase** (hosted PostgreSQL). Each
approved restaurant applicant gets its own **store**, and Postgres **Row Level
Security (RLS)** prevents one store from reading another's data.

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
   `supabase/schema.sql` → Run. This creates the tenant tables/RLS plus
   `store_applications`, `platform_admins`, and the server-only atomic review
   function. The old public `register_store()` path is explicitly revoked.
   The file is idempotent — **re-run the whole file after every app update
   that changes it**.
3. **Copy Supabase credentials:** Dashboard → Project Settings → API →
   *Project URL*, *anon public key*, and the server-only *service_role* key.
4. **Configure Cloudflare Turnstile:** create a widget for your production
   hostname (and localhost while developing). Put the public site key in
   `VITE_TURNSTILE_SITE_KEY` and the secret in `TURNSTILE_SECRET_KEY`.
   Cloud mode fails closed: a missing public key disables submission, and a
   missing server secret makes the API reject the challenge.
5. **Create the platform super user:** create/confirm a normal Supabase Auth
   user for yourself, then set server-only `SUPER_ADMIN_EMAILS` to that email
   (comma-separated if you want a backup operator). On first sign-in the API
   records the user id in `public.platform_admins`. You can alternatively
   seed it explicitly after the Auth user exists:

   ```sql
   insert into public.platform_admins (profile_id)
   select id from auth.users where lower(email) = lower('creator@example.com')
   on conflict do nothing;
   ```

   To revoke an operator, remove the email from `SUPER_ADMIN_EMAILS` **and**
   delete its row from `platform_admins`.

6. **Set all environment variables:** copy `.env.example` to `.env.local` for
   local development and add the same values in Vercel. Only
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `VITE_TURNSTILE_SITE_KEY` are browser-visible. Keep
   `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`,
   `CAPTCHA_PROOF_SECRET`, and `SUPER_ADMIN_EMAILS` server-only.
7. **Deploy/restart.** The store-application and staff-provisioning APIs are
   Vercel functions; Vite serves the same handlers in local development.

## Sign-up, approval & staff flow

1. The owner fills in name, store, email and password and completes Cloudflare
   Turnstile. `/api/store-applications` validates the CAPTCHA **before** Auth
   sign-up and returns a signed, 10-minute proof bound to those exact fields.
2. After Auth sign-up, that proof is exchanged for a `pending`
   `store_applications` row. At this point there is deliberately **no** store,
   owner membership, slug, or usable POS account. If Supabase email
   confirmation is enabled, the owner confirms/signs in and completes a fresh
   CAPTCHA before submitting.
3. The creator signs in with an email in `SUPER_ADMIN_EMAILS` (or an id already
   in `platform_admins`) and gets the **Platform approvals** console. Approve
   calls the server-only `review_store_application()` transaction, which
   creates `stores` + the owner's `admin` membership and marks the request
   approved together. Reject creates nothing and can include a note.
4. Once approved, the owner refreshes/signs in and enters the store. Only now
   does its public staff link (for example `respos-five.vercel.app/my-cafe`)
   resolve.
5. The store Admin creates managers/servers. Staff accounts are Supabase Auth
   users with a generated email and the 4-digit PIN as password, so RLS
   applies to them too. The service-role key remains server-side in
   `api/provision-staff.js`.
6. Staff open the approved store link, tap their name and enter their PIN.
   `verify_pin` applies a 5-attempt / 5-minute lockout before the client gets a
   real RLS-scoped Supabase session.
7. `vercel.json` rewrites non-file paths to the SPA, so direct store links work
   on Vercel. Logout returns a staff device to that store's PIN screen.

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

Store owners can also delete **their own** store without SQL: the
**Admin Panel → Settings → Danger Zone** card (cloud + admin only, at the
bottom of the Store Settings page) requires typing the store link (or exact
name) — the same guard the database function enforces. The same Danger Zone
is available on the POS Settings screen.

## Realtime (live open orders)

`orders`, `dining_tables` and `expenses` are added to the `supabase_realtime`
publication by the schema. Devices subscribe with
`supabase.channel(...).on('postgres_changes', ...)` — the Manager's Open
Orders board updates live from every tablet/phone in the store.

## Roadmap to full SaaS

- [x] Multi-tenant schema + RLS (`supabase/schema.sql`)
- [x] Cloud client scaffold (`src/services/cloud.js`, env-flagged)
- [x] CAPTCHA-protected owner applications + platform super-user approval
      (`api/store-applications.js`, `src/components/Onboarding.jsx`, and
      `src/components/SuperAdminPanel.jsx`). A store is created only inside the
      atomic approval transaction.
- [x] Owner sign-in / approved-store selection screens, with an in-browser mock
      swapped for Supabase automatically once env vars are present.
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
2. On the Login screen tap **Store login**, create an applicant account, tick
   the demo human check, and submit. The status stays **awaiting approval** and
   no store link exists.
3. Sign out. Create the mock operator account with
   `admin@respos.local` (or `VITE_MOCK_SUPER_ADMIN_EMAIL`), then sign in. The
   **Platform approvals** console appears; approve the request.
4. Sign back in as the applicant. They now enter the Admin Panel and get the
   approved store link.
5. For an automated dry run of the same lifecycle, run
   `npm run test:approval`.
6. To test staff sign-in, open **Admin Panel → User Management**, add a
   manager/server, then use the generated store link and PIN.

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
  every tenant table is scoped by `store_id`.
- `store_applications` and `platform_admins` have RLS enabled and no browser
  policies. Only the service-role API reads/writes them. The approval SQL
  function is granted only to `service_role` and independently requires the
  supplied reviewer to exist in `platform_admins`.
- Turnstile is verified server-side before Auth sign-up. Its short-lived proof
  is HMAC-signed, bound to email/name/store, single-use at the database layer,
  and never contains a password.
- The **service role key**, Turnstile secret and CAPTCHA proof secret bypass or
  protect server controls; keep them only in server-side Vercel variables.
- Protect the super-user email with a strong unique password, email
  confirmation and MFA in Supabase. Keep a second recoverable operator.
- PINs are short by nature; `verify_pin` adds a five-attempt/five-minute
  lockout in addition to Supabase's own rate limiting.
