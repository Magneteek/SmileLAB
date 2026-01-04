/**
 * Settings API Route
 *
 * GET: Fetch all system configuration settings
 * POST: Save system configuration settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Define setting keys for company information
const SETTING_KEYS = [
  'companyName',
  'taxVatNumber',
  'trrNumber',
  'registrationNumber',
  'address',
  'city',
  'postalCode',
  'country',
  'phone',
  'email',
  'website',
] as const;

/**
 * GET /api/settings
 * Fetch all company settings
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all settings from SystemConfig
    const settings = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [...SETTING_KEYS],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    // Convert array to object
    const settingsObject = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>
    );

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Save company settings
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can update settings
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Validate that we only accept known setting keys
    const settingsToUpdate = Object.entries(body).filter(([key]) =>
      SETTING_KEYS.includes(key as (typeof SETTING_KEYS)[number])
    );

    if (settingsToUpdate.length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided' },
        { status: 400 }
      );
    }

    // Update or create each setting using upsert
    const updatePromises = settingsToUpdate.map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        create: {
          key,
          value: String(value),
          description: `Company ${key}`,
          updatedBy: session.user.id,
        },
        update: {
          value: String(value),
          updatedBy: session.user.id,
        },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
