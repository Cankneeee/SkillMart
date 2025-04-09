import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Import types if needed
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          // If the cookie is set, update the response
          // This part is usually for refreshing sessions, less critical for just checking auth
          req.cookies.set({ name, value, ...options });
          // Note: NextResponse in middleware cannot directly set cookies in App Router stable.
          // Session refresh often relies on the client making requests or Supabase client handling it.
          // For simple auth checks, `get` is the most important part here.
        },
        remove: (name: string, options: CookieOptions) => {
          // If the cookie is removed, update the response
          req.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // 1. Redirect authenticated users away from login/signup
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    console.log(`Middleware: User authenticated, redirecting from ${pathname} to /browse`);
    return NextResponse.redirect(new URL('/browse', req.url));
  }

  // --- ADDED: Protection for authenticated routes ---
  // 2. Define routes that require authentication
  const protectedRoutes = [
    '/profile',
    '/my-listings',
    '/saved-listings',
    '/create-listing',
    // Add any other specific routes that absolutely need auth
  ];
  const protectedPatterns = [
     /^\/my-listings\/category\/.+/, // Matches /my-listings/category/*
     /^\/saved-listings\/category\/.+/ // Matches /saved-listings/category/*
     // Add more patterns if needed, e.g. /^\/api\/protected-route\/.+/
  ];

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.includes(pathname) ||
                           protectedPatterns.some(pattern => pattern.test(pathname));

  // 3. If user is NOT authenticated and tries to access a protected route, redirect to login
  if (!user && isProtectedRoute) {
    console.log(`Middleware: User not authenticated, redirecting from protected route ${pathname} to /login`);
    // You might want to add the intended destination as a query param for redirecting back after login
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname); // Optional: add where they were going
    return NextResponse.redirect(redirectUrl);
  }
  // --- END ADDED PROTECTION ---

  // If none of the above conditions match, continue to the requested page
  return res;
}

// Update the matcher to include all paths you want the middleware to run on.
// This should cover public pages (like /browse, /listing/*), auth pages, and protected pages.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons/* (PWA icons)
     * Feel free to modify this pattern to include more exceptions.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)',
    // Explicitly include specific paths if the pattern above is too broad or complex
    // Or adjust the negative lookahead pattern as needed.
    // Example: '/login', '/signup', '/profile', '/my-listings/:path*', '/saved-listings/:path*', '/create-listing', '/listing/:path*'
  ],
};