'use client';

/**
 * Session Provider Wrapper
 *
 * Wraps the app with NextAuth SessionProvider
 */

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
