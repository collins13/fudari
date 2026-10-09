import { NextRequest, NextResponse } from 'next/server';

const PRIMARY_HOST = 'fudari.co';
const WWW_HOST = 'www.fudari.co';
const NOINDEX_PREFIXES = ['/dashboard', '/chat', '/complete-profile', '/track'];
const NOINDEX_PATHS = new Set(['/login', '/register', '/forgot-password']);

function isPrivateOrUtilityPath(pathname: string) {
  return NOINDEX_PATHS.has(pathname) || NOINDEX_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (host === WWW_HOST) {
    const url = request.nextUrl.clone();
    url.host = PRIMARY_HOST;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  if (forwardedProto && forwardedProto !== 'https' && host === PRIMARY_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();
  if (isPrivateOrUtilityPath(request.nextUrl.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
