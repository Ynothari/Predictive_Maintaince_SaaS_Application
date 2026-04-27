import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // This should be the anon key for normal operations, or service_role key for admin bypass

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables.');
}

// We create a service_role client for secure backend operations (bypassing RLS when necessary)
// like managing users safely.
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// For passing through the user's token so RLS is automatically applied:
export const getSupabaseUserClient = (authHeader: string): SupabaseClient => {
  const token = authHeader.replace('Bearer ', '');
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
