/**
 * Forgot Password API
 *
 * Generates password reset token and sends email with reset link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail } from '@/lib/services/email-service';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success (security: don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent',
      });
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Get base URL and locale from request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3210';
    const locale = request.headers.get('accept-language')?.split(',')[0].split('-')[0] || 'sl';
    const resetLink = `${baseUrl}/${locale}/reset-password/${token}`;

    // Send email
    const emailHtml = generatePasswordResetEmail(user.name, resetLink);

    await sendEmail({
      to: user.email,
      subject: 'Ponastavi geslo - Smilelab MDR',
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * Generate password reset email HTML
 */
function generatePasswordResetEmail(name: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="sl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ponastavi geslo</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
<div style="background-color: #007289; padding: 35px 20px; text-align: center; border-radius: 8px 8px 0 0;">
<h1 style="color: white; margin: 0 0 8px 0; font-size: 24px; font-weight: 600; line-height: 1.3;">DENTRO</h1>
<p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 14px; line-height: 1.5;">Zobozdravstvene storitve in svetovanje, d.o.o.</p>
</div>
<div style="background: white; padding: 35px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
<p style="font-size: 16px; margin-bottom: 20px; color: #333;">Spoštovani ${name},</p>
<p style="font-size: 15px; color: #555; margin-bottom: 30px; line-height: 1.6;">Prejeli smo zahtevo za ponastavitev vašega gesla. Kliknite na spodnjo povezavo za nastavitev novega gesla:</p>
<div style="text-align: center; margin: 30px 0;">
<a href="${resetLink}" style="display: inline-block; background-color: #007289; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Ponastavi Geslo</a>
</div>
<p style="font-size: 14px; color: #666; margin-top: 30px; line-height: 1.6;">Ta povezava bo veljavna 1 uro. Če niste zahtevali ponastavitve gesla, ignorirajte to sporočilo.</p>
<p style="font-size: 14px; color: #333; margin-top: 25px;">Lep pozdrav,<br><strong style="color: #007289;">Smilelab MDR</strong></p>
</div>
<div style="text-align: center; margin-top: 25px; padding: 20px;">
<p style="font-size: 11px; color: #999; margin: 15px 0 0 0;">To je avtomatsko sporočilo. Prosimo, ne odgovarjajte neposredno na to sporočilo.</p>
</div>
</body>
</html>`;
}
