// ============================================================
// Vercel serverless function: provision a staff member.
//
// Creating staff (manager/server) accounts requires creating a
// real Supabase Auth user (generated email + 4-digit PIN as the
// password) and a `store_members` row. That needs the **service
// role key**, which MUST only ever live server-side — never in the
// browser bundle. This route is the only place the key is used.
//
// Env vars (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL               (same Project URL as VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY  (Project Settings → API → service_role)
//
// Client call example (from the app's User Management):
//   POST /api/provision-staff
//   { "storeId": "<uuid>", "name": "Maria Santos", "role": "server", "pin": "1111" }
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_ROLES = new Set(['admin', 'manager', 'server']);

// Generate a stable-enough, human-identifiable email like
//   my-cafe-server-8f3k@staff.internal
function generateStaffEmail(storeName, role) {
  const slug =
    String(storeName || 'cafe')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'cafe';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${role}-${suffix}@staff.internal`;
}

export default async function handler(req, res) {
  // Only POST.
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Server not configured (missing service-role env vars)' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { storeId, name, role, pin } = body || {};

  if (!storeId) {
    res.status(400).json({ error: 'storeId is required' });
    return;
  }
  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!VALID_ROLES.has(role)) {
    res.status(400).json({ error: `role must be one of: ${[...VALID_ROLES].join(', ')}` });
    return;
  }
  if (!/^\d{4}$/.test(String(pin || ''))) {
    res.status(400).json({ error: 'pin must be exactly 4 digits' });
    return;
  }

  // Service-role client bypasses RLS — keep it out of the browser.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Confirm the store exists and grab a name for the generated email.
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .single();

  if (storeError || !store) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }

  const email = generateStaffEmail(store.name, role);

  // Create the Auth user. PIN is the password; email is pre-confirmed so the
  // staff member can sign in on any device without clicking a link.
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: String(pin),
    email_confirm: true,
    user_metadata: { role, display_name: String(name).trim() },
  });

  if (authError || !authUser?.user) {
    console.error('createUser failed:', authError);
    res.status(500).json({ error: 'Failed to create user' });
    return;
  }

  const profileId = authUser.user.id;

  // Ensure a profile row exists (idempotent with register_store's profile insert).
  await admin.from('profiles').upsert(
    { id: profileId, display_name: String(name).trim(), email },
    { onConflict: 'id' }
  );

  // Grant membership in the store with the chosen role.
  const { error: memberError } = await admin.from('store_members').insert({
    store_id: storeId,
    profile_id: profileId,
    role,
    display_name: String(name).trim(),
    pin: String(pin),
    active: true,
  });

  if (memberError) {
    console.error('insert store_members failed:', memberError);
    // Clean up the orphaned auth user so retries don't collide.
    await admin.auth.admin.deleteUser(profileId).catch(() => {});
    res.status(500).json({ error: 'Failed to add staff member' });
    return;
  }

  res.status(201).json({
    ok: true,
    member: {
      storeId,
      profileId,
      role,
      displayName: String(name).trim(),
      // Returned once so the client can display it; staff sign in with the PIN.
      email,
    },
  });
}
