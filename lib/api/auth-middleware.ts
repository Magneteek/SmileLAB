/**
 * API Authentication Middleware
 * Reusable auth helpers for API routes
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Role } from '@prisma/client';

/**
 * Session with user information
 */
export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

/**
 * Require authentication for API route
 * Returns session or throws error
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new AuthError('Authentication required', 401);
  }

  return session as AuthSession;
}

/**
 * Require specific role(s) for API route
 * Returns session or throws error
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthSession> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthError(
      `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
      403
    );
  }

  return session;
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(session: AuthSession, roles: Role[]): boolean {
  return roles.includes(session.user.role);
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
