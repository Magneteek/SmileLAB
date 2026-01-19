import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return new Response('Document not found', { status: 404 });
    }

    // Check if file exists
    if (!existsSync(document.filePath)) {
      return new Response('File not found on disk', { status: 404 });
    }

    // Read file from disk
    const fileBuffer = await readFile(document.filePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
