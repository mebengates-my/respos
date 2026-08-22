# Bangladesh Restaurant POS

A browser-based point-of-sale demo for a Bangladesh-focused restaurant menu. It is built with React and Vite.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
npm run preview
```

## Current behaviour

- **Roles:** there are three roles —
  - **Admin:** full management panel (users, categories, menu items, tables, reports, open orders, expenses, profit & loss, settings). Only admins can add servers, managers, or other admins.
  - **Manager:** everything an admin can see and do *except* User Management and Settings — dashboard, open orders (live), categories, menu items, tables, reports, expenses, and profit & loss. Managers land in the Manager Panel after login.
  - **Server:** POS order taking only. Servers have no Reports tab and no Cash/Card/E-Wallet payment buttons — collecting money is reserved for Admin/Manager.
- **Admin landing page:** an admin or manager login opens the management panel, with **Dashboard** selected by default.
- **Bangladesh menu:** categories and menu items share stable category IDs. The app migrates older browser caches that contained legacy categories but no matching menu items to the current Bangladesh menu.
- **Refresh and login:** the signed-in user's session is stored in browser storage (user id only), so a browser refresh keeps the user logged in. The id is re-checked against the saved users list on load — a deleted or deactivated user is not restored. Logging out clears the session on every open tab of the device.
- **Report export:** report views (Admin Panel and Reports) export a real PDF built with jsPDF.
- **Expenses:** Admins and Managers get an Expenses menu with two sub-menus — *Expense Categories* (create/rename/delete cost categories) and *Expenses* (record expenses into a category with a description, amount, and a date & time picker that defaults to now; list can be filtered by category and period). Deleting a category also removes the expenses inside it (confirmed first).
- **Profit & Loss:** Admins and Managers get a P&L view with range presets (Today, Yesterday, Last 7 Days, Last 30 Days, custom) showing Total Sales, Total Expenses, Net Profit/Loss, and profit margin as KPIs, plus a daily Sales-vs-Expenses chart, an expenses-by-category breakdown, and best-day insights.
- **Menu items:** tapping anywhere on a menu item card adds it to the order; the + icon still works as before.
- **Local persistence:** menus, categories, table state, staff, held orders, order history, expense categories, and expenses are saved together in `localStorage`. Editing a category or menu item survives a refresh and does not leave menu items pointing at missing categories.
- **Backup & Restore:** because all data lives in the device's browser storage, Admin → Settings includes **Download backup** (one JSON file with everything, including store settings) and **Restore from backup** so data can be moved to a new device or recovered after browser data is cleared. Keep backup copies off the device (cloud drive / email / USB).
- **Tablets & phones:** the POS is responsive — on small screens the menu and order panels stack vertically — and the app is installable as a PWA (manifest + icon); after one online visit the service worker lets it reopen offline.
- **Offline use:** production builds register a small service worker. After the app has been visited online, its application shell can reopen offline; local POS data and normal order actions continue to work on that device. The header reflects the browser's real online/offline event state.
- **Same-device tabs:** browser storage events keep separate tabs open on the same browser profile aligned.

## Cloud / multi-store SaaS (in progress)

The app is being converted from a client-only localStorage demo into a
multi-store SaaS (Supabase backend, deployed to Vercel). The SaaS foundation
is scaffolded and the first online features are built:

- **Multi-tenant schema + RLS** (`supabase/schema.sql`) — stores, profiles,
  store_members, menu, tables, orders and expenses, all scoped by `store_id`,
  with `register_store()` for owner sign-up and realtime on orders/tables.
- **Cloud client** (`src/services/cloud.js`) — a `cloudAuth` facade over
  Supabase Auth + store membership. When `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are set it talks to your real Supabase project;
  without them it transparently falls back to an **in-browser mock**
  (`src/services/cloudMock.js`) so the flow is fully demoable offline.
- **Owner onboarding** — the Login screen now has a **Store login** button
  that opens owner sign-up/sign-in, store creation, and store selection. A
  cloud session persists across refresh (key `cafe-pos-session-cloud`) and
  re-validates against the backend on load. Signing in as an owner puts you
  in the Admin/Manager panel; a server membership lands in the POS.
- **Per-store login links (…/mycafe)** — creating a store generates a URL
  slug (`My Café` → `/my-cafe`). Staff open that link, tap their name and
  enter their 4-digit PIN — no emails, and never the owner's password.
  Behind the scenes: public anon RPCs `get_store_by_slug` / `store_roster`
  render the page, `verify_pin` checks the PIN server-side (with a
  5-attempt / 5-minute lockout) and hands back the staff member's generated
  email, which the client turns into a real Supabase session. `vercel.json`
  rewrites store links to the SPA, and logout returns the device to the same
  store's PIN screen.
- **Staff provisioning route** (`api/provision-staff.js`) — a Vercel
  serverless function that uses the **service-role key** (server-only env)
  to create a Supabase Auth user (generated email + 4-digit PIN as password)
  and the `store_members` row. The browser never sees the service key.

To go live: run `supabase/schema.sql` in your Supabase SQL Editor, set
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client) and, for the staff
route, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server) as Vercel env
vars. See `docs/SAAS.md` for the full guide.

## Important production requirement: shared users and cloud sync

This repository is currently a client-only application. `localStorage` is private to one browser profile, so it **does not provide shared real-time data for employees on separate phones, tablets, or computers**. It also has no remote destination to which offline changes can automatically sync.

Note that a local SQLite file would **not** solve this either — it would still live (and die) on the same machine. Protection against device loss requires data to exist somewhere off the device: either the manual Backup & Restore file above, or a shared backend.

Before using it with multiple staff in production, add a secure backend and database (for example a REST/GraphQL API with PostgreSQL) with:

1. authenticated users and hashed PINs/passwords;
2. a shared store/tenant ID on every record;
3. server-side order, payment, menu, and table APIs;
4. optimistic versioning or transactions for table/order conflicts;
5. an offline outbox (IndexedDB) that retries idempotent changes once the connection returns; and
6. server-side backups, audit logs, and role-based authorization.

The included service worker intentionally does not cache `/api/*` responses, so a future API can handle its own authentication, retry, and conflict strategy safely.
