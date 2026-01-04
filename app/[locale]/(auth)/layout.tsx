/**
 * Authentication Layout
 *
 * Minimal layout for login and register pages
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Smilelab MDR',
  description: 'Sign in to Smilelab MDR Management System',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
