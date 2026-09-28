// ============================================================
// In-browser mock of the Supabase backend, used ONLY when the
// app runs without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
//
// It mirrors the handful of Supabase Auth + store operations the
// SaaS onboarding needs, so the UI and flow can be built and
// demoed before the owner's Supabase project is available.
// Data is persisted to localStorage under `cafe-pos-cloud-mock`.
//
// The real backend (`src/services/cloud.js`) exposes the exact
// same `cloudAuth` interface; switching to production requires no
// UI changes — just the two env vars.
// ============================================================

import { saveToStorage, loadFromStorage } from '../utils/helpers.js';

export const MOCK_STORAGE_KEY = 'cafe-pos-cloud-mock';
export const MOCK_SESSION_KEY = 'cafe-pos-cloud-mock-session';

// Simulate network latency so loading states behave like production.
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = () =>
  `mock-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const DEFAULT_CURRENCY = 'RM';
const DEFAULT_TAX_RATE = 0.06;

// Same slug rules as the SQL unique_store_slug(): lowercase, a-z0-9 and '-'.
export function mockSlugify(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'store';
}

function uniqueStoreSlug(db, name) {
  let base = mockSlugify(name);
  if (['api', 'assets', 'docs', 'admin', 'login', 'settings', 'pos', 'tables', 'reports', 'index', 'sw'].includes(base)) {
    base = `${base}-store`;
  }
  let candidate = base;
  let n = 2;
  const taken = (slug) => db.stores.some((s) => (s.slug || mockSlugify(s.name)) === slug);
  while (taken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}


function emptyDb() {
  return { users: [], profiles: [], stores: [], memberships: [], applications: [] };
}

function loadDb() {
  // Guard against a corrupt/null stored value (e.g. after mockReset writes
  // null, which round-trips as the string "null" and parses back to null).
  const stored = loadFromStorage(MOCK_STORAGE_KEY, emptyDb());
  const db = stored && typeof stored === 'object' ? stored : emptyDb();
  // Migrate older mock data without asking users to clear localStorage.
  db.users = Array.isArray(db.users) ? db.users : [];
  db.profiles = Array.isArray(db.profiles) ? db.profiles : [];
  db.stores = Array.isArray(db.stores) ? db.stores : [];
  db.memberships = Array.isArray(db.memberships) ? db.memberships : [];
  db.applications = Array.isArray(db.applications) ? db.applications : [];
  return db;
}

function saveDb(db) {
  saveToStorage(MOCK_STORAGE_KEY, db);
}

function currentSessionId() {
  const session = loadFromStorage(MOCK_SESSION_KEY, null);
  return session?.userId || null;
}

function findUser(db, id) {
  return db.users.find((u) => u.id === id) || null;
}

function toAppUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.displayName || '' };
}

// ---------- Auth ----------

export async function mockGetSession() {
  await delay();
  const db = loadDb();
  const user = findUser(db, currentSessionId());
  return { data: { user: toAppUser(user) }, error: null };
}

export async function mockSignUp({ email, password, displayName }) {
  await delay();
  const db = loadDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { data: null, error: { message: 'Email is required' } };
  }
  if (db.users.some((u) => u.email === normalizedEmail)) {
    return { data: null, error: { message: 'Email already registered' } };
  }
  if (!password || password.length < 6) {
    return { data: null, error: { message: 'Password must be at least 6 characters' } };
  }

  const user = {
    id: uid(),
    email: normalizedEmail,
    password,
    displayName: displayName || '',
    createdAt: Date.now(),
  };
  db.users.push(user);
  db.profiles.push({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    createdAt: Date.now(),
  });
  saveDb(db);
  saveToStorage(MOCK_SESSION_KEY, { userId: user.id, signedInAt: Date.now() });
  return { data: { user: toAppUser(user) }, error: null };
}

export async function mockSignIn({ email, password }) {
  await delay();
  const db = loadDb();
  const user = db.users.find(
    (u) => u.email === String(email || '').trim().toLowerCase()
  );
  if (!user || user.password !== password) {
    return { data: null, error: { message: 'Invalid email or password' } };
  }
  saveToStorage(MOCK_SESSION_KEY, { userId: user.id, signedInAt: Date.now() });
  return { data: { user: toAppUser(user) }, error: null };
}

export async function mockSignOut() {
  await delay(150);
  saveToStorage(MOCK_SESSION_KEY, null);
  return { data: null, error: null };
}

// ---------- CAPTCHA + approval gate ----------

const MOCK_SUPER_ADMIN_EMAIL = String(
  import.meta.env?.VITE_MOCK_SUPER_ADMIN_EMAIL || 'admin@respos.local'
).trim().toLowerCase();

export async function mockPrepareStoreApplication({
  email,
  storeName,
  displayName,
  captchaToken,
}) {
  await delay(200);
  if (!captchaToken) {
    return { data: null, error: { message: 'Please complete the human check' } };
  }
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    storeName: String(storeName || '').trim(),
    displayName: String(displayName || '').trim(),
  };
  return {
    data: {
      captchaProof: `mock-proof:${Date.now()}:${encodeURIComponent(JSON.stringify(payload))}`,
    },
    error: null,
  };
}

export async function mockSubmitStoreApplication({
  email,
  storeName,
  displayName,
  captchaProof,
}) {
  await delay();
  const db = loadDb();
  const user = findUser(db, currentSessionId());
  if (!user) return { data: null, error: { message: 'Not authenticated' } };
  const fields = {
    email: String(email || '').trim().toLowerCase(),
    storeName: String(storeName || '').trim(),
    displayName: String(displayName || '').trim(),
  };
  if (user.email !== fields.email) {
    return { data: null, error: { message: 'Application email must match the signed-in account' } };
  }
  let proofValid = false;
  try {
    const [, issuedAt, encoded, extra] = String(captchaProof || '').split(':');
    const proofFields = JSON.parse(decodeURIComponent(encoded));
    proofValid = !extra &&
      Date.now() - Number(issuedAt) < 10 * 60 * 1000 &&
      Number(issuedAt) <= Date.now() &&
      JSON.stringify(proofFields) === JSON.stringify(fields);
  } catch {
    proofValid = false;
  }
  if (!proofValid) {
    return { data: null, error: { message: 'Human check expired. Please try again.' } };
  }
  const pending = db.applications.find(
    (application) => application.applicantId === user.id && application.status === 'pending'
  );
  if (pending) {
    return { data: { application: pending }, error: { message: 'You already have an application waiting for review' } };
  }

  const now = new Date().toISOString();
  const application = {
    id: uid(),
    applicantId: user.id,
    ownerEmail: user.email,
    ownerDisplayName: String(displayName || '').trim(),
    storeName: String(storeName || '').trim(),
    status: 'pending',
    reviewNote: '',
    reviewedAt: null,
    approvedStoreId: null,
    createdAt: now,
    updatedAt: now,
  };
  db.applications.push(application);
  const profile = db.profiles.find((entry) => entry.id === user.id);
  if (profile) profile.displayName = application.ownerDisplayName;
  user.displayName = application.ownerDisplayName;
  saveDb(db);
  return { data: { application }, error: null };
}

export async function mockGetMyStoreApplication() {
  await delay(200);
  const db = loadDb();
  const userId = currentSessionId();
  const applications = db.applications
    .filter((application) => application.applicantId === userId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { data: { application: applications[0] || null }, error: null };
}

export async function mockIsPlatformAdmin() {
  await delay(100);
  const db = loadDb();
  const user = findUser(db, currentSessionId());
  return {
    data: { isPlatformAdmin: user?.email === MOCK_SUPER_ADMIN_EMAIL },
    error: null,
  };
}

export async function mockListStoreApplications() {
  await delay();
  const access = await mockIsPlatformAdmin();
  if (!access.data?.isPlatformAdmin) {
    return { data: null, error: { message: 'Platform super user access required' } };
  }
  const applications = loadDb().applications
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { data: { applications }, error: null };
}

export async function mockReviewStoreApplication({ applicationId, decision, reviewNote }) {
  await delay();
  const access = await mockIsPlatformAdmin();
  if (!access.data?.isPlatformAdmin) {
    return { data: null, error: { message: 'Platform super user access required' } };
  }

  const db = loadDb();
  const application = db.applications.find((entry) => entry.id === applicationId);
  if (!application || application.status !== 'pending') {
    return { data: null, error: { message: 'This application has already been handled' } };
  }
  if (!['approved', 'rejected'].includes(decision)) {
    return { data: null, error: { message: 'Invalid review decision' } };
  }

  application.status = decision;
  application.reviewNote = String(reviewNote || '').trim();
  application.reviewedAt = new Date().toISOString();
  application.updatedAt = application.reviewedAt;

  let result = { id: application.id, status: decision, reviewNote: application.reviewNote };
  if (decision === 'approved') {
    const applicant = findUser(db, application.applicantId);
    if (!applicant) return { data: null, error: { message: 'Applicant account not found' } };
    const store = {
      id: uid(),
      name: application.storeName,
      slug: uniqueStoreSlug(db, application.storeName),
      currency: DEFAULT_CURRENCY,
      taxRate: DEFAULT_TAX_RATE,
      settings: {},
      createdAt: Date.now(),
      createdBy: applicant.id,
    };
    db.stores.push(store);
    db.memberships.push({
      storeId: store.id,
      profileId: applicant.id,
      role: 'admin',
      displayName: application.ownerDisplayName || applicant.displayName || 'Owner',
      pin: null,
      active: true,
      createdAt: Date.now(),
    });
    application.approvedStoreId = store.id;
    result = { ...result, storeId: store.id, slug: store.slug };
  }
  saveDb(db);
  return { data: { result, application: { ...application } }, error: null };
}

// ---------- Stores & memberships ----------

// Legacy mock helper used by the store/PIN regression script. Production UI
// creation is approval-gated above; this direct helper is not exposed there.
export async function mockRegisterStore({ storeName, displayName }) {
  await delay();
  const db = loadDb();
  const userId = currentSessionId();
  const user = findUser(db, userId);
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const store = {
    id: uid(),
    name: String(storeName || '').trim() || 'My Café',
    slug: uniqueStoreSlug(db, storeName),
    currency: DEFAULT_CURRENCY,
    taxRate: DEFAULT_TAX_RATE,
    settings: {},
    createdAt: Date.now(),
    createdBy: user.id,
  };
  db.stores.push(store);
  db.memberships.push({
    storeId: store.id,
    profileId: user.id,
    role: 'admin',
    displayName: displayName || user.displayName || 'Owner',
    pin: null,
    active: true,
    createdAt: Date.now(),
  });
  saveDb(db);
  return { data: { store: { id: store.id, name: store.name, slug: store.slug } }, error: null };
}

// List the stores the signed-in user is an active member of, including the
// role + display name of their membership (enough to pick a store and enter).
export async function mockListMyStores() {
  await delay();
  const db = loadDb();
  const userId = currentSessionId();
  if (!userId) return { data: [], error: null };

  const stores = db.memberships
    .filter((m) => m.profileId === userId && m.active !== false)
    .map((m) => {
      const store = db.stores.find((s) => s.id === m.storeId);
      return store
        ? {
            id: store.id,
            name: store.name,
            slug: store.slug || mockSlugify(store.name),
            currency: store.currency,
            taxRate: store.taxRate,
            role: m.role,
            displayName: m.displayName || '',
          }
        : null;
    })
    .filter(Boolean);

  return { data: stores, error: null };
}

// ---------- Public store-link + PIN login (mock of the anon RPCs) ----------

function findStoreBySlug(db, slug) {
  const want = String(slug || '').trim().toLowerCase();
  return (
    db.stores.find((s) => (s.slug || '').toLowerCase() === want) ||
    db.stores.find((s) => mockSlugify(s.name) === want) ||
    null
  );
}

// Resolve a store link to its public info (id/name/slug).
export async function mockGetStoreBySlug(slug) {
  await delay();
  const db = loadDb();
  const store = findStoreBySlug(db, slug);
  if (!store) return { data: null, error: null };
  return {
    data: { id: store.id, name: store.name, slug: store.slug || mockSlugify(store.name) },
    error: null,
  };
}

// Active staff of a store that actually have a PIN (the owner, who signs in
// with email/password, has no PIN and is not listed).
export async function mockGetStoreRoster(slug) {
  await delay();
  const db = loadDb();
  const store = findStoreBySlug(db, slug);
  if (!store) return { data: [], error: null };
  const roleOrder = { admin: 1, manager: 2, server: 3 };
  const roster = db.memberships
    .filter((m) => m.storeId === store.id && m.active !== false && m.pin)
    .map((m) => ({ id: m.profileId, name: m.displayName || '', role: m.role }))
    .sort((a, b) => (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9) || a.name.localeCompare(b.name));
  return { data: roster, error: null };
}

// Verify a staff PIN and, on success, sign the mock auth user in and return
// { user, membership } — the same shape the real pinLogin() produces.
// Mirrors the SQL lockout: 5 wrong attempts → 5 minute lock.
export async function mockPinLogin({ slug, profileId, pin }) {
  await delay();
  const db = loadDb();
  const store = findStoreBySlug(db, slug);
  if (!store) {
    return { data: null, error: { message: 'Store not found', reason: 'not_found' } };
  }
  const membership = db.memberships.find(
    (m) => m.storeId === store.id && m.profileId === profileId && m.active !== false
  );
  if (!membership) {
    return { data: null, error: { message: 'Member not found', reason: 'not_found' } };
  }
  if (membership.lockedUntil && membership.lockedUntil > Date.now()) {
    return { data: null, error: { message: 'Account locked', reason: 'locked' } };
  }

  if (membership.pin === pin) {
    membership.failedAttempts = 0;
    membership.lockedUntil = null;
    saveDb(db);
    const user = findUser(db, profileId);
    if (!user || user.password !== pin) {
      return { data: null, error: { message: 'Invalid PIN', reason: 'invalid' } };
    }
    saveToStorage(MOCK_SESSION_KEY, { userId: user.id, signedInAt: Date.now() });
    return {
      data: {
        user: toAppUser(user),
        membership: {
          id: store.id,
          name: store.name,
          slug: store.slug || mockSlugify(store.name),
          role: membership.role,
          displayName: membership.displayName || '',
        },
      },
      error: null,
    };
  }

  membership.failedAttempts = (membership.failedAttempts || 0) + 1;
  let locked = false;
  if (membership.failedAttempts >= 5) {
    membership.lockedUntil = Date.now() + 5 * 60 * 1000;
    membership.failedAttempts = 0;
    locked = true;
  }
  saveDb(db);
  return {
    data: null,
    error: { message: locked ? 'Account locked' : 'Invalid PIN', reason: locked ? 'locked' : 'invalid' },
  };
}

// Provision a staff member (mock of the Vercel service-role route). In real
// deployments this is done server-side because it needs the service key.
export async function mockCreateMember({ storeId, email, password, displayName, role }) {
  await delay();
  const db = loadDb();
  const store = db.stores.find((s) => s.id === storeId);
  if (!store) return { data: null, error: { message: 'Store not found' } };

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (db.users.some((u) => u.email === normalizedEmail)) {
    return { data: null, error: { message: 'Email already registered' } };
  }

  const user = {
    id: uid(),
    email: normalizedEmail,
    password,
    displayName: displayName || '',
    createdAt: Date.now(),
  };
  db.users.push(user);
  db.profiles.push({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    createdAt: Date.now(),
  });
  db.memberships.push({
    storeId,
    profileId: user.id,
    role: role || 'server',
    displayName: displayName || '',
    pin: password || null,
    active: true,
    createdAt: Date.now(),
  });
  saveDb(db);
  return { data: { user: toAppUser(user) }, error: null };
}

// Remove the mock backend's stored state (useful for demos / reset).
export function mockReset() {
  saveToStorage(MOCK_STORAGE_KEY, null);
  saveToStorage(MOCK_SESSION_KEY, null);
}

// List every staff member of a store as an app-shaped user record (the same
// shape the User Management view renders). The mock equivalent of a
// `store_members` + `profiles` join.
export async function mockListStoreMembers(storeId) {
  await delay();
  const db = loadDb();
  const members = db.memberships
    .filter((m) => m.storeId === storeId && m.active !== false)
    .map((m) => {
      const profile = db.profiles.find((p) => p.id === m.profileId);
      return {
        id: m.profileId,
        name: m.displayName || profile?.displayName || '',
        role: m.role,
        pin: m.pin || '',
        active: m.active !== false,
        cloud: true,
        storeId: m.storeId,
        email: profile?.email || '',
      };
    });
  return { data: members, error: null };
}

// Update a member's name/role (and PIN when provided). Mock of the service-role
// route's `update` action — here it is done directly on the in-memory DB.
export async function mockUpdateStoreMember({ storeId, profileId, displayName, role, pin }) {
  await delay();
  const db = loadDb();
  const membership = db.memberships.find(
    (m) => m.storeId === storeId && m.profileId === profileId
  );
  if (!membership) {
    return { data: null, error: { message: 'Member not found' } };
  }
  if (displayName) membership.displayName = displayName;
  if (role) membership.role = role;
  if (pin) membership.pin = pin;

  const user = db.users.find((u) => u.id === profileId);
  if (user) {
    if (displayName) {
      user.displayName = displayName;
      const profile = db.profiles.find((p) => p.id === profileId);
      if (profile) profile.displayName = displayName;
    }
    if (pin) user.password = pin;
  }
  saveDb(db);
  return {
    data: { storeId, profileId, role: membership.role, displayName: membership.displayName },
    error: null,
  };
}

// Remove a member: drop the membership and the underlying (mock) auth user.
export async function mockRemoveStoreMember({ storeId, profileId }) {  await delay();
  const db = loadDb();
  const index = db.memberships.findIndex(
    (m) => m.storeId === storeId && m.profileId === profileId
  );
  if (index === -1) {
    return { data: null, error: { message: 'Member not found' } };
  }
  db.memberships.splice(index, 1);
  db.users = db.users.filter((u) => u.id !== profileId);
  db.profiles = db.profiles.filter((p) => p.id !== profileId);
  saveDb(db);
  return { data: { ok: true }, error: null };
}

// Delete a store (tenant) and everything it owns — the in-browser equivalent
// of the SQL `delete_store()`. Members whose ONLY membership was this store
// lose their auth account; shared members keep theirs. The confirmation must
// match the store name or its link slug.
export async function mockDeleteStore({ storeId, confirmName }) {
  await delay();
  const db = loadDb();
  const store = db.stores.find((s) => s.id === storeId);
  if (!store) {
    return { data: { deleted: false, reason: 'not_found' }, error: null };
  }
  const slug = store.slug || mockSlugify(store.name);
  if (confirmName != null && confirmName !== store.name && confirmName !== slug) {
    return {
      data: null,
      error: { message: 'Confirmation does not match the store name or link' },
    };
  }

  const storeMembers = db.memberships.filter((m) => m.storeId === storeId);
  const orphanIds = storeMembers
    .filter((m) => !db.memberships.some((o) => o.profileId === m.profileId && o.storeId !== storeId))
    .map((m) => m.profileId);

  db.stores = db.stores.filter((s) => s.id !== storeId);
  db.memberships = db.memberships.filter((m) => m.storeId !== storeId);
  db.users = db.users.filter((u) => !orphanIds.includes(u.id));
  db.profiles = db.profiles.filter((p) => !orphanIds.includes(p.id));
  saveDb(db);

  // If the operator just deleted the store they were signed in to, sign out.
  const sessionId = currentSessionId();
  if (sessionId && orphanIds.includes(sessionId)) {
    saveToStorage(MOCK_SESSION_KEY, null);
  }

  return {
    data: { deleted: true, store: store.name, removedAccounts: orphanIds.length },
    error: null,
  };
}
