import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Session-aware server client. Use this in API routes / Server Components
 * whenever you need to know *who's logged in* and what they're allowed to
 * see under RLS — as opposed to src/lib/supabase/server.ts's admin client,
 * which bypasses RLS entirely and should only be used after you've already
 * confirmed the user is authorized to do what they're asking for (see
 * src/lib/auth/require-role.ts).
 */
export async function getSupabaseRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies —
            // safe to ignore as long as middleware.ts is refreshing the
            // session on every request (it is — see middleware.ts).
          }
        },
      },
    },
  );
}
