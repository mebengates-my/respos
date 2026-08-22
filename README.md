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
- **Local persistence:** menus, categories, table state, staff, held orders, and order history are saved together in `localStorage`. Editing a category or menu item survives a refresh and does not leave menu items pointing at missing categories.
- **Offline use:** production builds register a small service worker. After the app has been visited online, its application shell can reopen offline; local POS data and normal order actions continue to work on that device. The header reflects the browser's real online/offline event state.
- **Same-device tabs:** browser storage events keep separate tabs open on the same browser profile aligned.

## Important production requirement: shared users and cloud sync

This repository is currently a client-only application. `localStorage` is private to one browser profile, so it **does not provide shared real-time data for employees on separate phones, tablets, or computers**. It also has no remote destination to which offline changes can automatically sync.

Before using it with multiple staff in production, add a secure backend and database (for example a REST/GraphQL API with PostgreSQL) with:

1. authenticated users and hashed PINs/passwords;
2. a shared store/tenant ID on every record;
3. server-side order, payment, menu, and table APIs;
4. optimistic versioning or transactions for table/order conflicts;
5. an offline outbox (IndexedDB) that retries idempotent changes once the connection returns; and
6. server-side backups, audit logs, and role-based authorization.

The included service worker intentionally does not cache `/api/*` responses, so a future API can handle its own authentication, retry, and conflict strategy safely.
