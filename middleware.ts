/**
 * Next.js Middleware - Internationalization & Route Protection
 *
 * Handles:
 * 1. Locale detection and routing (next-intl)
 * 2. Authentication and route protection (NextAuth)
 */

import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { locales, defaultLocale } from './i18n';

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: 'always', // Always show locale in URL (/en/... or /sl/...)
  localeDetection: true, // Auto-detect locale from browser
});

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip authentication check for API routes and NextAuth routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Skip authentication check for public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt')
  ) {
    return NextResponse.next();
  }

  // Apply locale middleware first
  const response = intlMiddleware(req);

  // Check if path includes login or register (public pages)
  if (pathname.includes('/login') || pathname.includes('/register')) {
    return response;
  }

  // For all other routes, check authentication
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Extract locale from pathname
    const localeMatch = pathname.match(/^\/(en|sl)\//);
    const locale = localeMatch ? localeMatch[1] : defaultLocale;

    // Redirect to login page with callback URL
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api (API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
};
