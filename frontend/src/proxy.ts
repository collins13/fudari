import { NextRequest, NextResponse } from 'next/server';

const PRIMARY_HOST = 'tufixit.com';
const WWW_HOST = 'www.tufixit.com';

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
