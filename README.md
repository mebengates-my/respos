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
  - **Admin:** full management panel (users, categories, menu items, tables, delivery services, reports, open orders, expenses, profit & loss, settings). Only admins can add servers, managers, or other admins.
  - **Manager:** everything an admin can see and do *except* User Management — dashboard, open orders (live), categories, menu items, tables, delivery services, reports, expenses, profit & loss, and operational settings. Managers land in the Manager Panel after login.
  - **Server:** table/walk-in/delivery order taking only. Servers have no Reports tab, no discount controls, and no Cash/Card/E-Wallet payment buttons — discounts and collecting money are reserved for Admin/Manager.
- **Managers and admins can also take orders:** the POS **Place Order / Update Order** button is available to every role, so a manager or admin works the floor alongside servers (they additionally get the payment buttons). They can reopen, edit, or cancel any open order from **Open Orders**.
- **Order destination picker:** the cart's "Order for" row is a set of tappable icons — walk-in, every dining table (numbered tiles with live status dots; tapping an occupied table reopens its open order), and one tile per configured food-delivery service. Several delivery orders can be open at the same time; delivery orders are labelled everywhere (open-order boards, current orders, held orders, receipts, PDF reports).
- **Food-delivery services (Admin → Delivery Services):** managers and owners maintain the courier list — name, emoji, brand colour, and an on/off switch — exactly like table management. GrabFood, foodpanda, and Shopee Food are seeded by default; whatever is configured shows up as an icon in the POS. (Cloud orders persist the service name in `orders.delivery_channel` — run the idempotent `supabase/schema.sql` to add the column; until then the label stays on the ordering device.)
- **Item customization management:** Admin/Manager → Menu Items lets any item be marked **Customizable** and given any number of option groups (e.g. *Spice Level*, *Size*) each with priced options — or left plain so it adds straight to the cart. The starter menu's built-in options still work; editing an item converts it to the store's own configured groups.
- **Admin landing page:** an admin or manager login opens the management panel, with **Dashboard** selected by default.
- **Server open-order workflow:** placing an order clears the server's draft for the next customer and publishes it to Admin/Manager → Open Orders. Servers have a **Current Orders** view where they can reopen an allowed table or walk-in order and add, change, or remove items. Admin/Manager → Settings controls whether servers see all open orders (default) or only their own.
- **Bangladesh menu:** categories and menu items share stable category IDs. The app migrates older browser caches that contained legacy categories but no matching menu items to the current Bangladesh menu.
- **Category side menu:** the POS menu panel shows categories as a vertical tabbed side menu — one tab per category along the left edge (icon, name, available-item count), with the selected category's items filling the panel on the right.
- **Default categories:** Admin/Manager → Category Management can star any number of categories as *default*. The POS opens with the first default category selected and shows its items right away, so the most-sold section is on screen without any tapping. Default categories carry a small star on their POS tab; staff can still tap any other tab.
- **Refresh and login:** the signed-in user's session is stored in browser storage (user id only), so a browser refresh keeps the user logged in. The id is re-checked against the saved users list on load — a deleted or deactivated user is not restored. Logging out clears the session on every open tab of the device.
- **Report export:** report views (Admin Panel and Reports) export a real PDF built with jsPDF.
- **Expenses:** Admins and Managers get an Expenses menu with two sub-menus — *Expense Categories* (create/rename/delete cost categories) and *Expenses* (record expenses into a category with a description, amount, and a date & time picker that defaults to now; list can be filtered by category and period). Deleting a category also removes the expenses inside it (confirmed first).
- **Profit & Loss:** Admins and Managers get a P&L view with range presets (Today, Yesterday, Last 7 Days, Last 30 Days, custom) showing Total Sales, Total Expenses, Net Profit/Loss, and profit margin as KPIs, plus a daily Sales-vs-Expenses chart, an expenses-by-category breakdown, and best-day insights.
- **Menu items:** tapping anywhere on a menu item card adds it to the order; the + icon still works as before. The menu panel's bottom shortcut opens the floor view (table selection + management) — a single **Tables & Floor** button.
- **Cash entry:** in the cash payment step the typed digits build the amount in ringgit with a decimal — pressing `2 5 0 0` shows **25.00**, not 2,500. Quick-cash chips and Exact Amount work as before.
- **Local persistence:** menus, categories, table state, staff, held orders, order history, expense categories, and expenses are saved together in `localStorage`. Editing a category or menu item survives a refresh and does not leave menu items pointing at missing categories.
- **Tax on/off:** Admin → Settings → *Tax & Currency* has an **Apply Tax** switch next to the tax rate. Turning it off charges every new order subtotal − discount with no tax, hides the tax line from the cart summary, and leaves tax off the printed and on-screen receipts. Turning it back on restores the configured rate. Existing paid orders keep the tax they were rung up with.
- **Delete a store (cloud):** the store owner (admin) finds a **Danger Zone** at the bottom of Admin → Settings with *Delete store…*. Typing the store link (or exact store name) permanently deletes the store, its data, and the staff accounts that belong only to it.
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
  Submitted server orders sync through Supabase to management devices; order
  visibility and edit permissions follow the shared store setting.
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

This repository is still client-first. With Supabase enabled, authentication, submitted open orders, and the server-order access setting are shared in real time. Menu configuration, reports, expenses, and some table state still use `localStorage`, which is private to one browser profile and does **not** fully synchronize separate phones, tablets, or computers. Offline cloud changes also do not yet have an automatic outbox.

Note that a local SQLite file would **not** solve this either — it would still live (and die) on the same machine. Protection against device loss requires data to exist somewhere off the device: either the manual Backup & Restore file above, or a shared backend.

Before using it with multiple staff in production, add a secure backend and database (for example a REST/GraphQL API with PostgreSQL) with:

1. authenticated users and hashed PINs/passwords;
2. a shared store/tenant ID on every record;
3. server-side order, payment, menu, and table APIs;
4. optimistic versioning or transactions for table/order conflicts;
5. an offline outbox (IndexedDB) that retries idempotent changes once the connection returns; and
6. server-side backups, audit logs, and role-based authorization.

The included service worker intentionally does not cache `/api/*` responses, so a future API can handle its own authentication, retry, and conflict strategy safely.
