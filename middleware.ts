import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = request.nextUrl.pathname;

  // /supplier/* → always public (supplier portal via shared link)
  if (pathname.startsWith('/supplier')) {
    return response;
  }

  // /login, /signup → if already authenticated, redirect to /dashboard
  if (pathname === '/login' || pathname === '/signup') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // /auth/callback → always allow (OAuth callback)
  if (pathname.startsWith('/auth')) {
    return response;
  }

  // /dashboard/* → require session, redirect to /login if not authenticated
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access: check user metadata for role
    const role = session.user?.user_metadata?.role || 'buyer';

    // Only admin and buyer can access dashboard routes
    if (role !== 'admin' && role !== 'buyer') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  }

  // Root path — if authenticated go to dashboard, else login
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
