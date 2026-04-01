import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasAccessToken = request.cookies.has('access_token');
  const hasRefreshToken = request.cookies.has('refresh_token');

  // Authenticated user visiting login → redirect to dashboard
  if (isPublic && hasAccessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Public route → allow through
  if (isPublic) {
    return NextResponse.next();
  }

  // Protected route without any auth cookie → redirect to login
  if (!hasAccessToken && !hasRefreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Has at least one cookie — let the request through.
  // Backend JwtAuthGuard + api-client interceptor handle real validation & refresh.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
