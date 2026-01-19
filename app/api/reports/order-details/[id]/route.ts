import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { generateOrderDetailsPDF } from '@/lib/pdf/order-details-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';
    const pdfBuffer = await generateOrderDetailsPDF(orderId, locale);
    const filename = `order-details-${orderId}-${new Date().toISOString().split('T')[0]}.pdf`;

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
