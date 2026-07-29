import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client — anon key only, safe to ship to the client. Used for
 * read-only dashboard queries where you want live updates without an API
 * round trip (e.g. Supabase Realtime on the `transfers` table). Anything
 * that writes still goes through an API route using the server client.
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
