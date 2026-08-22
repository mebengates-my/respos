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

import { saveToStorage, loadFromStorage } from '../utils/helpers';

export const MOCK_STORAGE_KEY = 'cafe-pos-cloud-mock';
export const MOCK_SESSION_KEY = 'cafe-pos-cloud-mock-session';

// Simulate network latency so loading states behave like production.
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = () =>
  `mock-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const DEFAULT_CURRENCY = 'RM';
const DEFAULT_TAX_RATE = 0.06;

function emptyDb() {
  return { users: [], profiles: [], stores: [], memberships: [] };
}

function loadDb() {
  // Guard against a corrupt/null stored value (e.g. after mockReset writes
  // null, which round-trips as the string "null" and parses back to null).
  const db = loadFromStorage(MOCK_STORAGE_KEY, emptyDb());
  return db && typeof db === 'object' ? db : emptyDb();
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

// ---------- Stores & memberships ----------

// Create a store and make the signed-in user its admin (the in-browser
// equivalent of the SQL `register_store()` function).
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
  return { data: { store: { id: store.id, name: store.name } }, error: null };
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
export async function mockRemoveStoreMember({ storeId, profileId }) {
  await delay();
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
