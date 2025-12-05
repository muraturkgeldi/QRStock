
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret');

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - fonts (font files)
     * - favicon.ico (favicon file)
     * - icons (PWA icons)
     * - manifest.webmanifest (PWA manifest)
     * - robots.txt, sw.js, sitemap.xml, static (other static assets)
     * - login (the login page)
     * - register (register page)
     * - forgot-password (forgot password page)
     */
    '/((?!api|_next/static|_next/image|fonts|favicon.ico|icons|manifest.webmanifest|robots.txt|sw.js|sitemap.xml|static|login|register|forgot-password|$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const accept = request.headers.get('accept') || '';
  // Only apply middleware to HTML page navigation
  if (!accept.includes('text/html')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(request.nextUrl.pathname);

  // If there's no session cookie and the user is on a protected page, redirect to login.
  if (!sessionCookie && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If there's a session cookie, verify it.
  if (sessionCookie) {
    try {
      await jose.jwtVerify(sessionCookie, SECRET);
      // Token is valid.
      // If user is on an auth page, redirect to home/dashboard.
      if (isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      // If user is on the root page, redirect to dashboard.
      if (request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      // Otherwise, continue to the requested page.
      return NextResponse.next();
    } catch (error) {
      // Token verification failed.
      // Clear the invalid cookie and redirect to login.
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('session', '', { maxAge: -1, path: '/' });
      return response;
    }
  }

  // If no cookie and on an auth page, allow the request.
  if (!sessionCookie && isAuthPage) {
     return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}
