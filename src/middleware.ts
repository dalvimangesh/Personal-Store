import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get('session');
  const session = await verifySession(cookie?.value);

  // If trying to access login page while logged in, redirect to home
  if (request.nextUrl.pathname.startsWith('/login') && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If trying to access protected routes while not logged in
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    // If it's an API route, return 401 JSON
    if (request.nextUrl.pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Otherwise redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js, workbox-*, swe-worker-* (service workers)
     * - *.svg (public images)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sw.js|workbox-|swe-worker-|.*\\.svg).*)',
  ],
};
