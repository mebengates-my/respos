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

- **Admin landing page:** an admin login opens the Admin Panel, with **Dashboard** selected by default.
- **Bangladesh menu:** categories and menu items share stable category IDs. The app migrates older browser caches that contained legacy categories but no matching menu items to the current Bangladesh menu.
- **Refresh and login:** the authenticated user is held only in React memory and is never saved in browser storage. Refreshing the page therefore returns to the PIN login screen.
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
