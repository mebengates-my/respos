// ============================================================
// Minimal path router for the per-store login pages (…/mycafe).
//
// The app stays a single-screen SPA; the only URL-routed state is the
// optional store slug prefix. History API + popstate keep the back
// button working. No dependency on react-router.
// ============================================================

// Paths that can never be a store slug (app/static/server routes).
const RESERVED_SLUGS = new Set([
  'api',
  'assets',
  'docs',
  'admin',
  'login',
  'settings',
  'pos',
  'tables',
  'reports',
  'index',
  'sw',
]);

const listeners = new Set();

function emit() {
  listeners.forEach((cb) => cb());
}

// useSyncExternalStore-compatible subscription: fires on navigate() and on
// browser back/forward.
export function subscribe(cb) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

export function getPath() {
  return window.location.pathname || '/';
}

export function navigate(path, { replace = false } = {}) {
  if (getPath() === path) return;
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  emit();
}

// The store slug in a path like /mycafe, or null for /, /a/b, file paths
// (contains a dot) and reserved words.
export function slugFromPath(path = getPath()) {
  const parts = String(path).split('?')[0].split('/').filter(Boolean);
  if (parts.length !== 1 || parts[0].includes('.')) return null;
  const slug = parts[0].toLowerCase();
  return RESERVED_SLUGS.has(slug) ? null : slug;
}

// Accept "mycafe", "respos-five.vercel.app/mycafe" or a full URL and return
// the slug, or null when nothing usable was typed.
export function parseStoreSlug(input) {
  const value = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '');
  const parts = value.split('/').filter(Boolean);
  const candidate = parts.length ? parts[parts.length - 1] : '';
  if (!candidate || RESERVED_SLUGS.has(candidate)) return null;
  return /^[a-z0-9][a-z0-9-]*$/.test(candidate) ? candidate : null;
}
