import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { generateQCReportsPDF } from '@/lib/pdf/qc-reports-generator';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    // Parse optional date range parameters
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const locale = searchParams.get('locale') || 'en';

    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;

    const pdfBuffer = await generateQCReportsPDF(dateFrom, dateTo, locale);

    // Generate filename with date range if provided
    let filename = 'qc-reports';
    if (dateFrom && dateTo) {
      filename += `-${dateFrom.toISOString().split('T')[0]}-to-${dateTo.toISOString().split('T')[0]}`;
    } else if (dateFrom) {
      filename += `-from-${dateFrom.toISOString().split('T')[0]}`;
    } else if (dateTo) {
      filename += `-until-${dateTo.toISOString().split('T')[0]}`;
    } else {
      filename += `-${new Date().toISOString().split('T')[0]}`;
    }
    filename += '.pdf';

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
