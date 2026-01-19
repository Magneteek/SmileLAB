/**
 * Invoice Creation Page
 *
 * Flexible invoice creation with support for:
 * - Multiple worksheets from same dentist
 * - Custom line items (shipping, discount, adjustment, custom)
 * - Draft mode (default) or immediate finalization
 * - Invoice date selection (backdating support)
 *
 * Route: /invoices/new
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceCreationForm } from '@/src/components/invoices/InvoiceCreationForm';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function InvoiceCreationPage() {
  const t = await getTranslations();

  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Check permissions (ADMIN or INVOICING only)
  if (!['ADMIN', 'INVOICING'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-bold tracking-tight">{t('invoices.createInvoiceTitle')}</h1>
            <p className="text-sm text-gray-500">
              {t('invoices.createInvoiceSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoices.invoiceDetailsTitle')}</CardTitle>
          <CardDescription>
            {t('invoices.invoiceDetailsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>{t('invoices.loading')}</div>}>
            <InvoiceCreationForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
