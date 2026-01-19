/**
 * SOP PDF Generation API
 *
 * GET /api/sops/[id]/pdf - Generate and download SOP as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sopService } from '@/lib/services/sop-service';
import { generateSOPPDF, generateSOPFileName } from '@/lib/pdf/sop-pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get SOP
    const sop = await sopService.getSOPById(id);

    if (!sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 });
    }

    // Generate PDF (convert dates to ISO strings)
    const sopData = {
      ...sop,
      createdAt: sop.createdAt.toISOString(),
      approvedAt: sop.approvedAt?.toISOString(),
    };
    const pdfBuffer = await generateSOPPDF(sopData as any);
    const fileName = generateSOPFileName(sop);

    // Return PDF as download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Generate SOP PDF error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
