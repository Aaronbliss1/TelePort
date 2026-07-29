import { createClient } from '@supabase/supabase-js';

/**
 * Server-only client using the service role key. Every write TelePort's API
 * routes make (recording transfers, registering wallets) goes through this
 * client, which bypasses row-level security by design — the RLS policies
 * in supabase/schema.sql exist to keep the *anon/browser* client out, not
 * to gate this one. Never import this file from a Client Component.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.',
    );
  }

  // Keep this client untyped until `supabase gen types` is run against the
  // deployed project. A hand-maintained type file can lag migrations and turn
  // valid queries into `never`, which blocks builds without adding safety.
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
