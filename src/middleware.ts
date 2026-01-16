import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { device } = userAgent(request);
  const path = request.nextUrl.pathname;

  // Mobile Redirection: If mobile/tablet and at root, redirect to mobileview
  if ((device.type === 'mobile' || device.type === 'tablet') && path === '/') {
    return NextResponse.redirect(new URL('/mobileview', request.url));
  }

  const cookie = request.cookies.get('session');
  const session = await verifySession(cookie?.value);

  // Public Routes that don't require auth
  const isPublicRoute = 
    path.startsWith('/api/auth') || 
    path.startsWith('/secret/') ||
    (path.startsWith('/api/secrets/') && request.method === 'GET') ||
    path.startsWith('/api/public/') ||
    path.startsWith('/public/') ||
    path === '/api/link-share/share';

  // If trying to access login page while logged in, redirect to home
  if (path.startsWith('/login') && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If trying to access protected routes while not logged in
  if (!session && !path.startsWith('/login') && !isPublicRoute) {
    // If it's an API route, return 401 JSON
    if (path.startsWith('/api/')) {
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js, workbox-*, swe-worker-* (service workers)
     * - *.svg (public images)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-|swe-worker-|.*\\.svg).*)',
  ],
};
