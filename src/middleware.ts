import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/callback'];
const PUBLIC_API_PATHS = ['/api/auth', '/api/webhooks/circle'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: this call refreshes the auth token if needed and must run
  // before any redirect decision — removing it silently breaks sessions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isPublicApiRoute = PUBLIC_API_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && isApiRoute && !isPublicApiRoute) {
    // A redirect would hand back an HTML login page to a fetch() call and
    // break JSON.parse() on the client — respond with 401 instead.
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!user && !isPublicPath && !isApiRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match every route except static assets and Next internals — API
     * routes ARE included on purpose, so unauthenticated requests to e.g.
     * /api/transfers get redirected/blocked too, not just page loads.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
