/**
 * Invoice Edit Page
 *
 * Edit draft invoices before finalization
 * - Only draft invoices can be edited
 * - Finalized invoices redirect to view page
 * - Full edit capability: line items, dates, dentist, etc.
 *
 * Route: /invoices/[id]/edit
 */

import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InvoiceEditForm } from '@/src/components/invoices/InvoiceEditForm';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function InvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Check permissions (ADMIN or INVOICING only)
  if (!['ADMIN', 'INVOICING'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  // Await params (Next.js 15+ requirement)
  const { id } = await params;

  // Fetch invoice
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      dentist: {
        select: {
          id: true,
          dentistName: true,
          clinicName: true,
        },
      },
      lineItems: {
        include: {
          worksheet: {
            select: {
              id: true,
              worksheetNumber: true,
              patientName: true,
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  // Redirect if invoice is already finalized
  if (!invoice.isDraft) {
    redirect(`/invoices/${invoice.id}`);
  }

  // Serialize Decimal fields to numbers for Client Component
  const serializedInvoice = {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    discountRate: invoice.discountRate ? Number(invoice.discountRate) : null,
    discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : null,
    lineItems: invoice.lineItems.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/invoices/${invoice.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Edit Draft Invoice</h1>
              <Badge variant="outline">DRAFT</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Edit invoice details before finalization
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Update line items, dates, and other invoice details. This invoice has not been
            finalized yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <InvoiceEditForm invoice={serializedInvoice} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
