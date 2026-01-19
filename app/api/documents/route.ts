import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const worksheetId = searchParams.get('worksheetId');

    const where: any = {};

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (worksheetId) {
      where.worksheetId = worksheetId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        worksheet: {
          select: {
            worksheetNumber: true,
            dentist: {
              select: {
                clinicName: true,
              },
            },
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    return Response.json(documents);
  } catch (error) {
    return handleApiError(error);
  }
}
