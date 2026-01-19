/**
 * Reset Password API
 *
 * Resets user password using valid reset token
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

// Validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Find valid reset token
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!passwordReset) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (passwordReset.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reset link has expired' },
        { status: 400 }
      );
    }

    // Check if token already used
    if (passwordReset.used) {
      return NextResponse.json(
        { error: 'Reset link has already been used' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: passwordReset.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: passwordReset.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
