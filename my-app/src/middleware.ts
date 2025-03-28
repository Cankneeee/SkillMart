// src/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => req.cookies.get(name)?.value } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/browse', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/login', '/signup'],
};
