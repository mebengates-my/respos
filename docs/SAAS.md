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
   Environment Variables → Deploy.

## Sign-up & staff flow (how tenancy works)

1. Owner signs up with email/password (Supabase Auth) → app calls
   `register_store('My Café', 'Owner Name')` → creates `stores` +
   `store_members` (role `admin`) rows.
2. Admin creates managers/servers. Staff accounts are Supabase Auth users
   with a generated email (e.g. `mycafe-server-ab12@staff.internal`) and the
   4-digit PIN as password, so RLS applies to them too. Creating auth users
   requires the **service role key**, which must only ever live in a
   **server-side Vercel API route** (never in the browser).
3. Staff "PIN login" on any device = `supabase.auth.signInWithPassword`
   with their generated email + PIN; the app then loads their store.

## Realtime (live open orders)

`orders`, `dining_tables` and `expenses` are added to the `supabase_realtime`
publication by the schema. Devices subscribe with
`supabase.channel(...).on('postgres_changes', ...)` — the Manager's Open
Orders board updates live from every tablet/phone in the store.

## Roadmap to full SaaS

- [x] Multi-tenant schema + RLS (`supabase/schema.sql`)
- [x] Cloud client scaffold (`src/services/cloud.js`, env-flagged)
- [ ] Supabase Auth sign-in/sign-up screens (owner onboarding)
- [ ] Vercel API route for staff provisioning (service key, creates auth users + PINs)
- [ ] Sync layer: menu, tables, users, expenses, settings ⇄ Supabase
- [ ] Orders over Supabase + realtime Open Orders & table status
- [ ] Offline outbox: queue changes locally when the connection drops
- [ ] Billing (e.g. Stripe) + plan limits per store

## Security notes

- The **anon key is public by design** — safety comes from RLS, which is why
  every table is scoped by `store_id`.
- The **service role key** bypasses RLS; keep it only in server-side Vercel
  functions.
- PINs are short by nature; Supabase rate-limits sign-in attempts, which is
  the main protection for staff PIN accounts.
