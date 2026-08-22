import { createClient } from '@supabase/supabase-js';
import {
  mockGetSession,
  mockSignUp,
  mockSignIn,
  mockSignOut,
  mockRegisterStore,
  mockListMyStores,
  mockListStoreMembers,
  mockUpdateStoreMember,
  mockRemoveStoreMember,
  mockCreateMember,
} from './cloudMock';

// Cloud mode is enabled only when Supabase credentials are provided via env.
// Without them the app keeps running in local (localStorage) mode, so this
// repo still works as a standalone demo.
//
// Vercel: set these under Project → Settings → Environment Variables
// Local:  copy .env.example to .env.local and fill them in
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloudEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isCloudEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Turn a Supabase auth user + profile into the small shape the app uses.
function toAppUser(supabaseUser) {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    displayName:
      supabaseUser.user_metadata?.display_name || supabaseUser.email || '',
  };
}

// Map a raw auth user + a store_membership row into the `currentUser` record
// the rest of the app expects (same shape as the local staff users, so all
// role gating in Header/AdminPanel/PaymentModal keeps working unchanged).
export function buildAppUser(authUser, membership) {
  return {
    id: authUser.id,
    name: membership?.displayName || authUser.displayName || 'Staff',
    role: membership?.role || 'server',
    pin: membership?.pin || '',
    active: true,
    cloud: true,
    // Memberships are returned with their store id under `id` (listMyStores) or
    // `storeId` (raw store_members rows). Accept both.
    storeId: membership?.storeId || membership?.id || null,
  };
}

// ---------------------------------------------------------------------------
// cloudAuth — a thin facade over Supabase Auth + store membership queries.
// Each method returns `{ data, error }` (Supabase convention). When no env
// vars are set it transparently falls back to the in-browser mock so the
// onboarding UI works in local/demo mode too.
// ---------------------------------------------------------------------------
export const cloudAuth = {
  isEnabled: isCloudEnabled,

  async getSession() {
    if (!isCloudEnabled) return mockGetSession();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user) {
      return { data: { user: null }, error };
    }
    return { data: { user: toAppUser(data.session.user) }, error: null };
  },

  async signUp({ email, password, displayName }) {
    if (!isCloudEnabled) return mockSignUp({ email, password, displayName });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || '' } },
    });
    if (error || !data?.user) {
      return { data: null, error: error || { message: 'Sign-up failed' } };
    }
    return { data: { user: toAppUser(data.user) }, error: null };
  },

  async signIn({ email, password }) {
    if (!isCloudEnabled) return mockSignIn({ email, password });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data?.user) {
      return { data: null, error: error || { message: 'Sign-in failed' } };
    }
    return { data: { user: toAppUser(data.user) }, error: null };
  },

  async signOut() {
    if (!isCloudEnabled) return mockSignOut();
    const { error } = await supabase.auth.signOut();
    return { data: null, error };
  },

  // Owner sign-up step 2: call the SQL `register_store()` RPC, then return the
  // new store. The mock does the equivalent in localStorage.
  async registerStore({ storeName, displayName }) {
    if (!isCloudEnabled) {
      return mockRegisterStore({ storeName, displayName });
    }
    const { data, error } = await supabase.rpc('register_store', {
      p_store_name: storeName,
      p_display_name: displayName || '',
    });
    if (error) return { data: null, error };
    return { data: { store: { id: data, name: storeName } }, error: null };
  },

  // Stores the signed-in user is an active member of, with membership role.
  async listMyStores() {
    if (!isCloudEnabled) return mockListMyStores();
    const { data, error } = await supabase
      .from('store_members')
      .select(
        'store_id, role, display_name, pin, active, stores(id, name, currency, tax_rate)'
      );
    if (error) return { data: [], error };

    const stores = (data || [])
      .filter((m) => m.active !== false && m.stores)
      .map((m) => ({
        id: m.store_id,
        name: m.stores.name,
        currency: m.stores.currency,
        taxRate: m.stores.tax_rate,
        role: m.role,
        displayName: m.display_name || '',
      }));
    return { data: stores, error: null };
  },

  // Current Supabase session access token, or null when signed out / in mock mode.
  // Sent as `Authorization: Bearer <token>` so the serverless provisioning route
  // can verify the caller is really a store admin before using the service key.
  async getAccessToken() {
    if (!isCloudEnabled) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  },

  // All staff of a store, as app-shaped user records (same shape the User
  // Management view already renders for local users). RLS lets any member read
  // the roster; only admins get the manage buttons.
  async listStoreMembers(storeId) {
    if (!isCloudEnabled) return mockListStoreMembers(storeId);
    const { data, error } = await supabase
      .from('store_members')
      .select('store_id, profile_id, role, display_name, pin, active, profiles(email)')
      .eq('store_id', storeId);
    if (error) return { data: null, error };
    return {
      data: (data || []).map((m) => ({
        id: m.profile_id,
        name: m.display_name || '',
        role: m.role,
        pin: m.pin || '',
        active: m.active !== false,
        cloud: true,
        storeId: m.store_id,
        email: m.profiles?.email || '',
      })),
      error: null,
    };
  },

  // Create a staff account (auth user + membership) through the Vercel
  // serverless route, which holds the service-role key.
  async provisionStaff({ storeId, name, role, pin }) {
    if (!isCloudEnabled) {
      const slug = String(name || 'staff').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) || 'staff';
      const { data, error } = await mockCreateMember({ storeId, displayName: name, role, email: `${slug}@staff.internal`, password: pin });
      if (error || !data?.user) return { data: null, error: error || { message: 'Failed to add staff member' } };
      return {
        data: { storeId, profileId: data.user.id, role, displayName: name, email: data.user.email },
        error: null,
      };
    }
    return callProvisionApi({ action: 'provision', storeId, name, role, pin });
  },

  // Update a member's name/role and optionally reset their PIN (password).
  async updateStoreMember({ storeId, profileId, displayName, role, pin }) {
    if (!isCloudEnabled) {
      return mockUpdateStoreMember({ storeId, profileId, displayName, role, pin });
    }
    return callProvisionApi({ action: 'update', storeId, profileId, name: displayName, role, pin });
  },

  // Remove a member (drops the membership and the auth user, so their PIN no
  // longer signs them in anywhere).
  async removeStoreMember({ storeId, profileId }) {
    if (!isCloudEnabled) {
      return mockRemoveStoreMember({ storeId, profileId });
    }
    return callProvisionApi({ action: 'remove', storeId, profileId });
  },
};

// POST to the serverless staff-provisioning route. On Vercel `/api/*` is
// handled natively; in local dev the Vite dev server serves the same route
// via a middleware (see vite.config.js).
async function callProvisionApi(body) {
  const token = await cloudAuth.getAccessToken();
  try {
    const res = await fetch('/api/provision-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: { message: json.error || 'Request failed' } };
    }
    return { data: json.member || { ok: true }, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || 'Network error' } };
  }
}
