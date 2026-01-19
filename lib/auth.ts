/**
 * NextAuth.js Configuration
 *
 * JWT-based authentication with role-based access control (RBAC)
 * 4 roles: ADMIN, TECHNICIAN, QC_INSPECTOR, INVOICING
 */

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import { verifyPassword } from './auth-utils';
import { Role } from '@prisma/client';

// Extend NextAuth types to include our custom user properties
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: Role;
  }
}

export const authOptions: NextAuthOptions = {
  // Type assertion needed due to monorepo type conflicts
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            active: true,
            deletedAt: true,
          },
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        // Check if user is active
        if (!user.active || user.deletedAt) {
          throw new Error('This account has been deactivated');
        }

        // Verify password
        const isValidPassword = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Return user without password
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      // Get user session to check role
      // This callback runs after successful sign in
      // Extract locale from URL if present
      const urlObj = new URL(url.startsWith('/') ? `${baseUrl}${url}` : url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const locale = ['en', 'sl'].includes(pathParts[0]) ? pathParts[0] : 'sl';

      // If redirecting after signIn, check the URL
      // STAFF users go to /staff/dashboard
      // Production users go to /dashboard
      if (url.includes('callbackUrl')) {
        return url;
      }

      // Default redirects based on role will be handled by middleware
      return `${baseUrl}/${locale}/dashboard`;
    },

    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      // Add user data to session
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }

      return session;
    },
  },

  events: {
    async signIn({ user }) {
      // Create audit log for sign in
      if (user?.id) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            entityType: 'User',
            entityId: user.id,
            newValues: JSON.stringify({ email: user.email }),
          },
        });
      }
    },

    async signOut({ token }) {
      // Create audit log for sign out
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: 'LOGOUT',
            entityType: 'User',
            entityId: token.id as string,
          },
        });
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};
