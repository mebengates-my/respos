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

  // Read inside the request so Vite's local middleware can inject .env.local
  // values without ever exposing them to the browser bundle.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
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

  const { action = 'provision', storeId, profileId: targetProfileId, name, role, pin } = body || {};

  if (!storeId) {
    res.status(400).json({ error: 'storeId is required' });
    return;
  }

  // Service-role client bypasses RLS — keep it out of the browser.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ------------------------------------------------------------------
  // Authorization: this route holds the service key, so it MUST verify
  // that the caller is an authenticated, active admin of the store.
  // The client sends its Supabase access token in the Authorization
  // header; we validate it and check the store_members row.
  // ------------------------------------------------------------------
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller?.user) {
    res.status(401).json({ error: 'Invalid authorization' });
    return;
  }

  const { data: membership, error: membershipError } = await admin
    .from('store_members')
    .select('role, active')
    .eq('store_id', storeId)
    .eq('profile_id', caller.user.id)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    membership.role !== 'admin' ||
    membership.active !== true
  ) {
    res.status(403).json({ error: 'Only the store admin can manage staff' });
    return;
  }

  // ---- remove: drop the membership and the auth user -------------------
  if (action === 'remove') {
    if (!targetProfileId) {
      res.status(400).json({ error: 'profileId is required' });
      return;
    }
    await admin
      .from('store_members')
      .delete()
      .eq('store_id', storeId)
      .eq('profile_id', targetProfileId);
    // Deleting the auth user revokes the PIN everywhere. Best-effort: even if
    // the auth user is gone already, the membership delete above succeeded.
    await admin.auth.admin.deleteUser(targetProfileId).catch(() => {});
    res.status(200).json({ ok: true });
    return;
  }

  // ---- update: rename / re-role an existing member ---------------------
  // Note: PIN resets are intentionally not supported here. Supabase's admin
  // user-update API enforces the password minimum length (default 6), so a
  // 4-digit PIN cannot be set on an existing auth user without lowering the
  // project's Auth password policy. PINs are assigned at creation time only.
  if (action === 'update') {
    if (!targetProfileId) {
      res.status(400).json({ error: 'profileId is required' });
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
    const { data: updated, error: updateError } = await admin
      .from('store_members')
      .update({ role, display_name: String(name).trim() })
      .eq('store_id', storeId)
      .eq('profile_id', targetProfileId)
      .select('role, display_name')
      .single();

    if (updateError || !updated) {
      res.status(500).json({ error: 'Failed to update staff member' });
      return;
    }
    res.status(200).json({
      ok: true,
      member: {
        storeId,
        profileId: targetProfileId,
        role: updated.role,
        displayName: updated.display_name,
      },
    });
    return;
  }

  // ---- provision (default): create the auth user + membership ----------
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

  // Ensure a profile row exists (idempotent with the approval flow's insert).
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
