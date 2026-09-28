// Store-application gate for the multi-tenant SaaS.
//
// Public action:
//   verifyCaptcha  -> verifies Cloudflare Turnstile and returns a short-lived,
//                     form-bound proof (no Supabase account required yet).
//
// Authenticated actions (Authorization: Bearer <Supabase access token>):
//   submit         -> records a pending application; creates no store
//   status         -> returns the caller's latest application
//   access         -> says whether the caller is a platform super user
//   list           -> super user: pending/recent applications
//   review         -> super user: atomically approve or reject an application
//
// Required server-only env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY
// Optional bootstrap allowlist:
//   SUPER_ADMIN_EMAILS=creator@example.com,backup@example.com
//   CAPTCHA_PROOF_SECRET=<random 32+ character secret>

import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const PROOF_TTL_MS = 10 * 60 * 1000;
const VALID_DECISIONS = new Set(['approved', 'rejected']);

const clean = (value, max = 160) => String(value || '').trim().slice(0, max);
const normalizeEmail = (value) => clean(value, 320).toLowerCase();
const base64url = (value) => Buffer.from(value).toString('base64url');

function env() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY || '',
    proofSecret:
      process.env.CAPTCHA_PROOF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    superAdminEmails: new Set(
      String(process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map(normalizeEmail)
        .filter(Boolean)
    ),
  };
}

function applicationPayload(body = {}) {
  return {
    email: normalizeEmail(body.email),
    storeName: clean(body.storeName, 120),
    displayName: clean(body.displayName, 120),
  };
}

function signProof(fields, secret) {
  const payload = {
    ...fields,
    exp: Date.now() + PROOF_TTL_MS,
    nonce: randomBytes(18).toString('base64url'),
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyProof(proof, expected, secret) {
  try {
    const [encoded, signature, extra] = String(proof || '').split('.');
    if (!encoded || !signature || extra) return false;
    const wanted = createHmac('sha256', secret).update(encoded).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (wanted.length !== provided.length || !timingSafeEqual(wanted, provided)) return false;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return (
      Number(payload.exp) > Date.now() &&
      payload.email === expected.email &&
      payload.storeName === expected.storeName &&
      payload.displayName === expected.displayName
    );
  } catch {
    return false;
  }
}

function toApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicantId: row.applicant_id,
    ownerEmail: row.owner_email,
    ownerDisplayName: row.owner_display_name,
    storeName: row.store_name,
    status: row.status,
    reviewNote: row.review_note || '',
    reviewedAt: row.reviewed_at,
    approvedStoreId: row.approved_store_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function remoteAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

async function verifyTurnstile(token, secret, ip) {
  if (!secret) {
    return { ok: false, configurationError: true };
  }
  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', String(token || ''));
  if (ip) form.set('remoteip', ip);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const result = await response.json();
    return { ok: result.success === true, codes: result['error-codes'] || [] };
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return { ok: false, networkError: true };
  }
}

async function authenticatedUser(admin, req) {
  const token = bearerToken(req);
  if (!token) return { user: null, error: 'Missing authorization' };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: 'Invalid authorization' };
  return { user: data.user, error: null };
}

async function operatorAccess(admin, user, allowlist) {
  const { data, error } = await admin
    .from('platform_admins')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (error) throw error;

  const viaDatabase = Boolean(data);
  const viaEnvironment = allowlist.has(normalizeEmail(user.email));
  if (viaEnvironment && !viaDatabase) {
    // Bootstrap env entries into the durable DB allowlist. The atomic review
    // RPC independently checks this table, so the endpoint is not its only
    // line of defense.
    const { error: insertError } = await admin
      .from('platform_admins')
      .upsert({ profile_id: user.id }, { onConflict: 'profile_id' });
    if (insertError) throw insertError;
  }
  return viaDatabase || viaEnvironment;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const action = body.action;
  const config = env();

  // CAPTCHA is checked before this app initiates Auth sign-up. The resulting
  // proof is required for the pending store request, tied to these exact form
  // values, and expires after ten minutes.
  if (action === 'verifyCaptcha') {
    const fields = applicationPayload(body);
    if (!fields.email || !fields.storeName || !fields.displayName) {
      res.status(400).json({ error: 'Name, store name and email are required' });
      return;
    }
    if (!config.proofSecret) {
      res.status(500).json({ error: 'CAPTCHA proof signing is not configured' });
      return;
    }
    const check = await verifyTurnstile(body.captchaToken, config.turnstileSecret, remoteAddress(req));
    if (check.configurationError) {
      res.status(500).json({ error: 'CAPTCHA is not configured on the server' });
      return;
    }
    if (!check.ok) {
      res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
      return;
    }
    res.status(200).json({ proof: signProof(fields, config.proofSecret) });
    return;
  }

  if (!config.supabaseUrl || !config.serviceRoleKey) {
    res.status(500).json({ error: 'Server is not configured for store applications' });
    return;
  }

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { user, error: authError } = await authenticatedUser(admin, req);
  if (authError) {
    res.status(401).json({ error: authError });
    return;
  }

  try {
    if (action === 'access') {
      const isPlatformAdmin = await operatorAccess(admin, user, config.superAdminEmails);
      res.status(200).json({ isPlatformAdmin });
      return;
    }

    if (action === 'status') {
      const { data, error } = await admin
        .from('store_applications')
        .select('*')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      res.status(200).json({ application: toApplication(data) });
      return;
    }

    if (action === 'submit') {
      const fields = applicationPayload(body);
      if (!fields.email || !fields.storeName || !fields.displayName) {
        res.status(400).json({ error: 'Name, store name and email are required' });
        return;
      }
      if (normalizeEmail(user.email) !== fields.email) {
        res.status(403).json({ error: 'Application email must match the signed-in account' });
        return;
      }
      if (!verifyProof(body.captchaProof, fields, config.proofSecret)) {
        res.status(400).json({ error: 'CAPTCHA proof is invalid or expired. Please try again.' });
        return;
      }

      const { data: pending, error: pendingError } = await admin
        .from('store_applications')
        .select('*')
        .eq('applicant_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (pending) {
        res.status(409).json({
          error: 'You already have an application waiting for review',
          application: toApplication(pending),
        });
        return;
      }

      const proofHash = createHash('sha256').update(String(body.captchaProof)).digest('hex');
      const { error: profileError } = await admin.from('profiles').upsert(
        {
          id: user.id,
          display_name: fields.displayName,
          email: fields.email,
        },
        { onConflict: 'id' }
      );
      if (profileError) throw profileError;

      const { data, error } = await admin
        .from('store_applications')
        .insert({
          applicant_id: user.id,
          owner_email: fields.email,
          owner_display_name: fields.displayName,
          store_name: fields.storeName,
          captcha_proof_hash: proofHash,
        })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json({ application: toApplication(data) });
      return;
    }

    const isPlatformAdmin = await operatorAccess(admin, user, config.superAdminEmails);
    if (!isPlatformAdmin) {
      res.status(403).json({ error: 'Platform super user access required' });
      return;
    }

    if (action === 'list') {
      const { data, error } = await admin
        .from('store_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      res.status(200).json({ applications: (data || []).map(toApplication) });
      return;
    }

    if (action === 'review') {
      const decision = clean(body.decision, 20);
      const applicationId = clean(body.applicationId, 80);
      const reviewNote = clean(body.reviewNote, 1000);
      if (!applicationId || !VALID_DECISIONS.has(decision)) {
        res.status(400).json({ error: 'A valid application and decision are required' });
        return;
      }
      const { data, error } = await admin.rpc('review_store_application', {
        p_application_id: applicationId,
        p_decision: decision,
        p_reviewer_id: user.id,
        p_review_note: reviewNote || null,
      });
      if (error) throw error;

      const { data: refreshed, error: refreshError } = await admin
        .from('store_applications')
        .select('*')
        .eq('id', applicationId)
        .single();
      if (refreshError) throw refreshError;
      res.status(200).json({ result: data, application: toApplication(refreshed) });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error(`store-applications ${action || 'unknown'} failed:`, error);
    const message = String(error?.message || 'Request failed');
    const conflict = /already been reviewed|duplicate key|idx_one_pending/i.test(message);
    res.status(conflict ? 409 : 500).json({
      error: conflict ? 'This application has already been handled' : 'Store application request failed',
    });
  }
}
