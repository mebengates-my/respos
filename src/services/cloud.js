import { createClient } from '@supabase/supabase-js';
import {
  mockGetSession,
  mockSignUp,
  mockSignIn,
  mockSignOut,
  mockListMyStores,
  mockListStoreMembers,
  mockUpdateStoreMember,
  mockRemoveStoreMember,
  mockCreateMember,
  mockGetStoreBySlug,
  mockGetStoreRoster,
  mockPinLogin,
  mockDeleteStore,
  mockPrepareStoreApplication,
  mockSubmitStoreApplication,
  mockGetMyStoreApplication,
  mockIsPlatformAdmin,
  mockListStoreApplications,
  mockReviewStoreApplication,
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
    // Store link slug (…/mycafe) — used to send the device back to the store's
    // PIN screen after logout.
    storeSlug: membership?.slug || membership?.storeSlug || null,
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
    if (!isCloudEnabled) {
      const result = await mockSignUp({ email, password, displayName });
      return result.error
        ? result
        : { data: { ...result.data, requiresEmailConfirmation: false }, error: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || '' } },
    });
    if (error || !data?.user) {
      return { data: null, error: error || { message: 'Sign-up failed' } };
    }
    return {
      data: {
        user: toAppUser(data.user),
        // When Supabase email confirmation is enabled, signUp returns a user
        // but no session. The owner verifies their inbox, then signs in and
        // submits a fresh CAPTCHA-protected application.
        requiresEmailConfirmation: !data.session,
      },
      error: null,
    };
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

  // ---- CAPTCHA + platform approval gate ----
  // The CAPTCHA is verified before Auth sign-up. The API returns a short-lived
  // signed proof bound to these exact form values; after sign-up the proof is
  // exchanged for a pending application. No store exists until a platform
  // super user approves it.
  async prepareStoreApplication({ email, storeName, displayName, captchaToken }) {
    if (!isCloudEnabled) {
      return mockPrepareStoreApplication({ email, storeName, displayName, captchaToken });
    }
    const result = await callApplicationsApi(
      { action: 'verifyCaptcha', email, storeName, displayName, captchaToken },
      false
    );
    return result.error
      ? result
      : { data: { captchaProof: result.data.proof }, error: null };
  },

  async submitStoreApplication({ email, storeName, displayName, captchaProof }) {
    if (!isCloudEnabled) {
      return mockSubmitStoreApplication({ email, storeName, displayName, captchaProof });
    }
    return callApplicationsApi({
      action: 'submit',
      email,
      storeName,
      displayName,
      captchaProof,
    });
  },

  async getMyStoreApplication() {
    if (!isCloudEnabled) return mockGetMyStoreApplication();
    return callApplicationsApi({ action: 'status' });
  },

  async isPlatformAdmin() {
    if (!isCloudEnabled) return mockIsPlatformAdmin();
    return callApplicationsApi({ action: 'access' });
  },

  async listStoreApplications() {
    if (!isCloudEnabled) return mockListStoreApplications();
    return callApplicationsApi({ action: 'list' });
  },

  async reviewStoreApplication({ applicationId, decision, reviewNote = '' }) {
    if (!isCloudEnabled) {
      return mockReviewStoreApplication({ applicationId, decision, reviewNote });
    }
    return callApplicationsApi({
      action: 'review',
      applicationId,
      decision,
      reviewNote,
    });
  },

  // Stores the signed-in user is an active member of, with membership role.
  //
  // NOTE: the `members_select` RLS policy lets a member read *every* row of the
  // stores they belong to, so this query MUST be scoped to the current user.
  // Without the profile_id filter a manager/server would receive the whole
  // roster and pick up somebody else's role (usually the owner's "admin").
  async listMyStores() {
    if (!isCloudEnabled) return mockListMyStores();
    const { data: authData } = await supabase.auth.getUser();
    const profileId = authData?.user?.id;
    if (!profileId) return { data: [], error: null };

    const { data, error } = await supabase
      .from('store_members')
      .select(
        'store_id, role, display_name, pin, active, stores(id, name, slug, currency, tax_rate)'
      )
      .eq('profile_id', profileId);
    if (error) return { data: [], error };

    const stores = (data || [])
      .filter((m) => m.active !== false && m.stores)
      .map((m) => ({
        id: m.store_id,
        name: m.stores.name,
        slug: m.stores.slug || '',
        currency: m.stores.currency,
        taxRate: m.stores.tax_rate,
        role: m.role,
        displayName: m.display_name || '',
      }));
    return { data: stores, error: null };
  },

  // ---- Public store-link login (the /mycafe flow) ----
  // These mirror the anon RPCs in supabase/schema.sql and fall back to the
  // in-browser mock so the flow can be demoed without Supabase.

  // Resolve a store link to { id, name, slug }. No authentication needed.
  async getStoreBySlug(slug) {
    if (!isCloudEnabled) return mockGetStoreBySlug(slug);
    const { data, error } = await supabase.rpc('get_store_by_slug', { p_slug: slug });
    if (error) return { data: null, error };
    return { data: data || null, error: null };
  },

  // Active staff of a store that have a PIN, as { id, name, role } records
  // for the store login screen's user picker.
  async getStoreRoster(slug) {
    if (!isCloudEnabled) return mockGetStoreRoster(slug);
    const { data, error } = await supabase.rpc('store_roster', { p_slug: slug });
    if (error) return { data: [], error };
    return {
      data: (data || []).map((m) => ({
        id: m.profile_id,
        name: m.display_name || '',
        role: m.role,
      })),
      error: null,
    };
  },

  // Staff PIN sign-in for a store link: verify the PIN server-side (with
  // brute-force lockout), then exchange the returned email + the PIN itself
  // for a real Supabase session and resolve the membership.
  // Returns { data: { user, membership }, error } on success; on failure
  // error.reason is 'invalid' | 'locked' | 'not_found'.
  async pinLogin({ slug, profileId, pin }) {
    if (!isCloudEnabled) return mockPinLogin({ slug, profileId, pin });

    const { data: check, error: verifyError } = await supabase.rpc('verify_pin', {
      p_slug: slug,
      p_profile_id: profileId,
      p_pin: pin,
    });
    if (verifyError) return { data: null, error: { message: verifyError.message, reason: 'invalid' } };
    if (!check?.ok) {
      return {
        data: null,
        error: { message: 'PIN check failed', reason: check?.reason || 'invalid' },
      };
    }

    // The staff member's auth password IS their PIN (see api/provision-staff.js).
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: check.email,
      password: pin,
    });
    if (signInError || !authData?.user) {
      return {
        data: null,
        error: { message: signInError?.message || 'Sign-in failed', reason: 'invalid' },
      };
    }

    const { data: stores, error: storesError } = await cloudAuth.listMyStores();
    if (storesError) return { data: null, error: { message: storesError.message, reason: 'invalid' } };
    const want = String(slug).toLowerCase();
    const membership =
      (stores || []).find((s) => String(s.slug || '').toLowerCase() === want) || null;
    if (!membership) {
      await supabase.auth.signOut().catch(() => {});
      return { data: null, error: { message: 'No membership in this store', reason: 'not_found' } };
    }

    return { data: { user: toAppUser(authData.user), membership }, error: null };
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

  // Delete the whole store (tenant). Runs the SQL delete_store() RPC, which
  // only the store's own admin (signed in) or the SaaS operator (service
  // role) may call. Cascades the store's menu/tables/orders/expenses and
  // deletes auth accounts whose only membership was this store.
  async deleteStore({ storeId, confirmName }) {
    if (!isCloudEnabled) return mockDeleteStore({ storeId, confirmName });
    const { data, error } = await supabase.rpc('delete_store', {
      p_store_id: storeId,
      p_confirm_name: confirmName ?? null,
    });
    if (error) return { data: null, error };
    return { data, error: null };
  },

  // Shared store configuration. Operational switches (such as whether a
  // server can see everybody's open orders) must live in Supabase rather than
  // only in one device's localStorage.
  async getStoreSettings(storeId) {
    if (!isCloudEnabled) return { data: null, error: null };
    const { data, error } = await supabase
      .from('stores')
      .select('settings, currency, tax_rate')
      .eq('id', storeId)
      .single();
    if (error) return { data: null, error };
    return {
      data: {
        ...data?.settings,
        currency: data?.settings?.currency || data?.currency || 'RM',
        taxRate: Number(data?.settings?.taxRate ?? data?.tax_rate ?? 0.06),
      },
      error: null,
    };
  },

  async updateStoreSettings(storeId, settings) {
    if (!isCloudEnabled) return { data: settings, error: null };
    const { data, error } = await supabase
      .from('stores')
      .update({
        settings,
        currency: settings?.currency || 'RM',
        tax_rate: Number(settings?.taxRate ?? 0.06),
      })
      .eq('id', storeId)
      .select('settings')
      .single();
    return error
      ? { data: null, error }
      : { data: data?.settings || settings, error: null };
  },

  // Narrow manager-safe RPC: changes only the server-order visibility key,
  // without granting managers write access to the rest of the store row.
  async updateServerOrderVisibility(storeId, enabled) {
    if (!isCloudEnabled) return { data: { serverCanViewAllOrders: enabled }, error: null };
    const { data, error } = await supabase.rpc('set_server_order_visibility', {
      p_store_id: storeId,
      p_enabled: enabled !== false,
    });
    return error ? { data: null, error } : { data, error: null };
  },

  // Companion to updateServerOrderVisibility for the price-override switch.
  async updateServerPriceAccess(storeId, enabled) {
    if (!isCloudEnabled) return { data: { serverCanEditPrice: enabled === true }, error: null };
    const { data, error } = await supabase.rpc('set_server_price_access', {
      p_store_id: storeId,
      p_enabled: enabled === true,
    });
    return error ? { data: null, error } : { data, error: null };
  },

  subscribeStoreSettings(storeId, onChange) {
    if (!isCloudEnabled || !storeId) return () => {};
    const channel = supabase
      .channel(`store-settings-${storeId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` },
        (payload) => onChange?.(payload.new?.settings || {})
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};

// Convert between the app's cents-based order shape and the Supabase row.
// Draft order ids are friendly strings; Supabase assigns the durable UUID on
// first placement and that UUID is then used for every edit/payment.
const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

// The orders.delivery_channel column arrives with an idempotent schema
// migration (see supabase/schema.sql). Projects that have not re-run it yet
// must keep working, so probe once per session whether the column exists; when
// it does not, the delivery label simply stays on the ordering device and the
// order is stored exactly as before.
let ordersDeliveryColumnSupported = null;
async function supportsDeliveryChannelColumn() {
  if (!isCloudEnabled) return false;
  if (ordersDeliveryColumnSupported !== null) return ordersDeliveryColumnSupported;
  const { error } = await supabase.from('orders').select('delivery_channel').limit(1);
  // PGRST204 = unknown column. Any other outcome (including a permission
  // error) means the table itself is fine — let the real write report issues.
  ordersDeliveryColumnSupported = !error || error.code !== 'PGRST204';
  return ordersDeliveryColumnSupported;
}

async function applyDeliveryChannel(row, order) {
  if (order?.deliveryChannel?.name && await supportsDeliveryChannelColumn()) {
    row.delivery_channel = order.deliveryChannel.name;
  }
  return row;
}

function fromOrderRow(row) {
  const asMillis = (value) => value ? new Date(value).getTime() : null;
  return {
    id: row.id,
    cloudId: row.id,
    status: row.status,
    tableId: row.table_ref || 'COUNTER',
    // Delivery channel stored by name (the label shown everywhere). Renaming a
    // service later does not rewrite history, which receipts prefer anyway.
    deliveryChannel: row.delivery_channel
      ? { id: row.delivery_channel, name: row.delivery_channel }
      : null,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal_cents || 0,
    tax: row.tax_cents || 0,
    discount: row.discount || null,
    discountAmount: row.discount_cents || 0,
    total: row.total_cents || 0,
    notes: row.notes || '',
    paymentMethod: row.payment_method || null,
    amountPaid: row.amount_paid_cents,
    change: row.change_cents,
    serverId: row.created_by || null,
    serverName: row.server_name || '',
    createdAt: asMillis(row.created_at),
    placedAt: asMillis(row.created_at),
    heldAt: asMillis(row.held_at),
    paidAt: asMillis(row.paid_at),
    voidedAt: asMillis(row.voided_at),
  };
}

function toOrderRow(order, storeId, userId, includeCreator = false) {
  return {
    store_id: storeId,
    status: order.status === 'held' ? 'held' : 'open',
    table_ref: order.tableId || 'COUNTER',
    items: order.items || [],
    subtotal_cents: order.subtotal || 0,
    tax_cents: order.tax || 0,
    discount: order.discount || null,
    discount_cents: order.discountAmount || 0,
    total_cents: order.total || 0,
    notes: order.notes || null,
    server_name: order.serverName || '',
    ...(includeCreator ? { created_by: userId } : {}),
  };
}

export const cloudOrders = {
  async listOpen(storeId) {
    if (!isCloudEnabled || !storeId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['open', 'held'])
      .order('created_at', { ascending: true });
    return error
      ? { data: [], error }
      : { data: (data || []).map(fromOrderRow), error: null };
  },

  // Completed (paid) and voided orders power the Reports, Dashboard "today's
  // sales", Profit & Loss and Top Items views. They are written to Supabase by
  // complete()/void() but were never read back, so every device only ever saw
  // the orders it had itself rung up. Loading them here makes the numbers
  // identical across desktop, tablet and phone.
  async listHistory(storeId) {
    if (!isCloudEnabled || !storeId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['paid', 'voided'])
      .order('created_at', { ascending: false });
    return error
      ? { data: [], error }
      : { data: (data || []).map(fromOrderRow), error: null };
  },

  async saveOpen({ storeId, userId, order }) {
    if (!isCloudEnabled) return { data: order, error: null };
    const durableId = order.cloudId || (isUuid(order.id) ? order.id : null);
    const row = await applyDeliveryChannel(toOrderRow(order, storeId, userId, durableId === null), order);
    let result;
    if (durableId) {
      result = await supabase
        .from('orders')
        .update(row)
        .eq('id', durableId)
        .eq('store_id', storeId)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('orders')
        .insert(row)
        .select('*')
        .single();
    }
    return result.error
      ? { data: null, error: result.error }
      : { data: fromOrderRow(result.data), error: null };
  },

  async void({ storeId, order }) {
    if (!isCloudEnabled) return { data: order, error: null };
    const id = order.cloudId || order.id;
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'voided', voided_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select('*')
      .single();
    return error ? { data: null, error } : { data: fromOrderRow(data), error: null };
  },

  async complete({ storeId, order, method, amountPaid, change }) {
    if (!isCloudEnabled) return { data: order, error: null };
    const id = order.cloudId || order.id;
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        items: order.items || [],
        subtotal_cents: order.subtotal || 0,
        tax_cents: order.tax || 0,
        discount: order.discount || null,
        discount_cents: order.discountAmount || 0,
        total_cents: order.total || 0,
        notes: order.notes || null,
        payment_method: method,
        amount_paid_cents: amountPaid,
        change_cents: change,
        paid_at: new Date().toISOString(),
        ...(order.deliveryChannel?.name && await supportsDeliveryChannelColumn()
          ? { delivery_channel: order.deliveryChannel.name }
          : {}),
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select('*')
      .single();
    return error ? { data: null, error } : { data: fromOrderRow(data), error: null };
  },

  // Persist an order that is ALREADY in a terminal state (paid/voided). Used
  // for two cases that the open/complete flow above does not cover:
  //   1. A walk-in order paid directly (Cash/Card/E-wallet) without being
  //      "placed" first — it has no cloud id yet, so it is inserted as paid.
  //   2. One-time migration of device-local history into the shared cloud, so
  //      a device's previously local-only sales appear everywhere.
  async saveTerminal({ storeId, userId, order }) {
    if (!isCloudEnabled) return { data: order, error: null };
    const durableId = order.cloudId || (isUuid(order.id) ? order.id : null);
    const status = order.status === 'voided' ? 'voided' : 'paid';
    const row = {
      store_id: storeId,
      status,
      table_ref: order.tableId || 'COUNTER',
      items: order.items || [],
      subtotal_cents: order.subtotal || 0,
      tax_cents: order.tax || 0,
      discount: order.discount || null,
      discount_cents: order.discountAmount || 0,
      total_cents: order.total || 0,
      notes: order.notes || null,
      server_name: order.serverName || '',
      payment_method: order.paymentMethod || null,
      amount_paid_cents: Number.isFinite(order.amountPaid) ? order.amountPaid : null,
      change_cents: Number.isFinite(order.change) ? order.change : null,
      paid_at: status === 'paid'
        ? (order.paidAt ? new Date(order.paidAt).toISOString() : new Date().toISOString())
        : null,
      voided_at: status === 'voided'
        ? (order.voidedAt ? new Date(order.voidedAt).toISOString() : new Date().toISOString())
        : null,
    };
    if (!durableId) row.created_by = userId || null;
    await applyDeliveryChannel(row, order);
    let result;
    if (durableId) {
      result = await supabase
        .from('orders')
        .update(row)
        .eq('id', durableId)
        .eq('store_id', storeId)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('orders')
        .insert(row)
        .select('*')
        .single();
    }
    return result.error
      ? { data: null, error: result.error }
      : { data: fromOrderRow(result.data), error: null };
  },

  subscribe(storeId, onChange) {
    if (!isCloudEnabled || !storeId) return () => {};
    const channel = supabase
      .channel(`open-orders-${storeId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => onChange?.()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};

// ---------------------------------------------------------------------------
// cloudExpenses — expenses and their categories, shared across every device.
// Previously expenses lived only in localStorage, so the Expenses tab and the
// Profit & Loss view showed whatever THIS browser had recorded (zero on a new
// phone). Category and expense ids are the Supabase UUIDs once synced.
// ---------------------------------------------------------------------------

function fromExpenseCategoryRow(row) {
  return { id: row.id, cloudId: row.id, name: row.name, cloud: true };
}

// `nameById` maps a creator's profile id to their display name so the
// "added by" line keeps working for cloud rows (expenses store only the
// creator's auth id, not their name).
function fromExpenseRow(row, nameById) {
  return {
    id: row.id,
    cloudId: row.id,
    categoryId: row.category_id,
    description: row.description || '',
    amount: row.amount_cents || 0,
    // The app keys expense date filtering off `date` (a millisecond timestamp).
    date: row.occurred_at
      ? new Date(row.occurred_at).getTime()
      : (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
    createdBy: (nameById && nameById.get(row.created_by)) || '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    cloud: true,
  };
}

export const cloudExpenses = {
  async listCategories(storeId) {
    if (!isCloudEnabled || !storeId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });
    return error
      ? { data: [], error }
      : { data: (data || []).map(fromExpenseCategoryRow), error: null };
  },

  // A brand-new cloud store has no categories yet. Seed the starter set so a
  // manager can record costs immediately, matching what a local install shows.
  async seedCategories(storeId, defaults) {
    if (!isCloudEnabled || !storeId) return { data: [], error: null };
    const rows = (defaults || [])
      .map((d) => ({ store_id: storeId, name: d.name }))
      .filter((r) => r.name);
    if (rows.length === 0) return { data: [], error: null };
    const { data, error } = await supabase
      .from('expense_categories')
      .insert(rows)
      .select('*');
    return error
      ? { data: [], error }
      : { data: (data || []).map(fromExpenseCategoryRow), error: null };
  },

  async upsertCategory({ storeId, category }) {
    if (!isCloudEnabled) return { data: category, error: null };
    const payload = { store_id: storeId, name: category.name };
    let result;
    // Only an existing cloud category (a real UUID) can be updated; anything
    // else (a local default id) is inserted as a new row.
    if (category.cloudId && isUuid(category.cloudId)) {
      result = await supabase
        .from('expense_categories')
        .update(payload)
        .eq('id', category.cloudId)
        .eq('store_id', storeId)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('expense_categories')
        .insert(payload)
        .select('*')
        .single();
    }
    return result.error
      ? { data: null, error: result.error }
      : { data: fromExpenseCategoryRow(result.data), error: null };
  },

  async removeCategory({ storeId, categoryId }) {
    if (!isCloudEnabled) return { data: { ok: true }, error: null };
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', categoryId)
      .eq('store_id', storeId);
    // The FK on expenses is ON DELETE CASCADE, so the rows vanish with it.
    return error ? { data: null, error } : { data: { ok: true }, error: null };
  },

  async list(storeId) {
    if (!isCloudEnabled || !storeId) return { data: [], error: null };
    // Pull expenses and the store's members together so each expense can show
    // who recorded it without a second round-trip per row.
    const [expRes, memRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('store_members')
        .select('profile_id, display_name')
        .eq('store_id', storeId),
    ]);
    if (expRes.error) return { data: [], error: expRes.error };
    const nameById = new Map(
      (memRes.data || []).map((m) => [m.profile_id, m.display_name])
    );
    return { data: (expRes.data || []).map((row) => fromExpenseRow(row, nameById)), error: null };
  },

  async upsert({ storeId, userId, expense }) {
    if (!isCloudEnabled) return { data: expense, error: null };
    const payload = {
      store_id: storeId,
      category_id: expense.categoryId,
      description: expense.description || '',
      amount_cents: expense.amount || 0,
      occurred_at: new Date(expense.date || Date.now()).toISOString(),
    };
    let result;
    if (expense.cloudId && isUuid(expense.cloudId)) {
      // Preserve the original creator on edits.
      result = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', expense.cloudId)
        .eq('store_id', storeId)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('expenses')
        .insert({ ...payload, created_by: userId || null })
        .select('*')
        .single();
    }
    if (result.error) return { data: null, error: result.error };
    return { data: fromExpenseRow(result.data), error: null };
  },

  async remove({ storeId, expenseId }) {
    if (!isCloudEnabled) return { data: { ok: true }, error: null };
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('store_id', storeId);
    return error ? { data: null, error } : { data: { ok: true }, error: null };
  },

  subscribe(storeId, onChange) {
    if (!isCloudEnabled || !storeId) return () => {};
    const channel = supabase
      .channel(`expenses-${storeId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `store_id=eq.${storeId}` },
        () => onChange?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_categories', filter: `store_id=eq.${storeId}` },
        () => onChange?.()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};

// Store applications all pass through a server route: CAPTCHA secrets and the
// Supabase service-role key never enter the browser bundle.
async function callApplicationsApi(body, authenticated = true) {
  const token = authenticated ? await cloudAuth.getAccessToken() : null;
  if (authenticated && !token) {
    return { data: null, error: { message: 'Please sign in again' } };
  }
  try {
    const res = await fetch('/api/store-applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        data: json.application ? { application: json.application } : null,
        error: { message: json.error || 'Request failed' },
      };
    }
    return { data: json, error: null };
  } catch (error) {
    return { data: null, error: { message: error?.message || 'Network error' } };
  }
}

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
