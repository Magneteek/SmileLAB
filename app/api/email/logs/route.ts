/**
 * Email Logs API
 *
 * GET /api/email/logs?invoiceId=xxx
 * GET /api/email/logs?worksheetId=xxx   (finds logs via documents + invoice)
 *
 * Returns email history for a given invoice or worksheet/order.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const worksheetId = searchParams.get('worksheetId');

    if (!invoiceId && !worksheetId) {
      return NextResponse.json({ error: 'invoiceId or worksheetId required' }, { status: 400 });
    }

    // Build OR conditions: logs for invoice directly, or logs containing docs for this worksheet
    const orConditions: any[] = [];

    if (invoiceId) {
      orConditions.push({ invoiceId });
    }

    if (worksheetId) {
      // Find document IDs for this worksheet
      const docs = await prisma.document.findMany({
        where: { worksheetId, type: 'ANNEX_XIII' },
        select: { id: true },
      });
      const docIds = docs.map(d => d.id);

      if (docIds.length > 0) {
        orConditions.push({
          documents: { some: { documentId: { in: docIds } } },
        });
      }

      // Also find invoices that contain this worksheet via line items
      const lineItems = await prisma.invoiceLineItem.findMany({
        where: { worksheetId },
        select: { invoiceId: true },
      });
      const invoiceIds = [...new Set(lineItems.map(li => li.invoiceId))];
      if (invoiceIds.length > 0) {
        orConditions.push({ invoiceId: { in: invoiceIds } });
      }
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ logs: [] });
    }

    const logs = await prisma.emailLog.findMany({
      where: { OR: orConditions },
      include: {
        sentBy: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
        documents: {
          include: {
            document: { select: { documentNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('[GET /api/email/logs]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
