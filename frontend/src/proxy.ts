import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_NAME = 'crm_access_token';
const REFRESH_TOKEN_NAME = 'crm_refresh_token';
const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api';

function isProtectedPath(pathname: string) {
  return pathname.startsWith('/portal') || pathname.startsWith('/admin');
}

function isPublicPath(pathname: string) {
  const publicPaths = ['/login', '/_next', '/favicon.ico'];
  return publicPaths.some((path) => pathname.startsWith(path));
}

function isAccessTokenExpired(token?: string) {
  if (!token) {
    return true;
  }

  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return true;
  }

  const expiresAt = decoded.exp * 1000;
  return expiresAt <= Date.now() + 30_000;
}

function appendSetCookieHeaders(source: Response, target: NextResponse) {
  const sourceHeaders = source.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof sourceHeaders.getSetCookie === 'function') {
    const cookies = sourceHeaders.getSetCookie();
    for (const cookie of cookies) {
      target.headers.append('set-cookie', cookie);
    }
    return;
  }

  const combinedHeader = source.headers.get('set-cookie');
  if (!combinedHeader) {
    return;
  }

  const cookies = combinedHeader.split(/,(?=[^;,=\s]+=[^;,]+)/g);
  for (const cookie of cookies) {
    target.headers.append('set-cookie', cookie.trim());
  }
}

async function tryRefresh(refreshToken: string) {
  try {
    const refreshResponse = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${REFRESH_TOKEN_NAME}=${refreshToken}`,
      },
      cache: 'no-store',
    });

    if (!refreshResponse.ok) {
      return null;
    }

    const response = NextResponse.next();
    appendSetCookieHeaders(refreshResponse, response);
    return response;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get(ACCESS_TOKEN_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_NAME)?.value;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (refreshToken && isAccessTokenExpired(accessToken)) {
    const refreshedResponse = await tryRefresh(refreshToken);
    if (refreshedResponse) {
      return refreshedResponse;
    }
  }

  if (isProtectedPath(pathname) && !accessToken && !refreshToken) {
    const returnTo = pathname + request.nextUrl.search;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedPath(pathname) && isAccessTokenExpired(accessToken) && !refreshToken) {
    const returnTo = pathname + request.nextUrl.search;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
