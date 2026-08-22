import { createClient } from '@supabase/supabase-js';

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
