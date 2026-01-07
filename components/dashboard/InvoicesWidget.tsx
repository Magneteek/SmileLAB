'use client';

/**
 * Invoices Widget (ADMIN ONLY)
 *
 * Displays invoice statistics including monetary amounts
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InvoicesOverview } from '@/lib/services/dashboard-service';
import { Euro, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InvoicesWidgetProps {
  data: InvoicesOverview;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function InvoicesWidget({ data }: InvoicesWidgetProps) {
  const t = useTranslations('dashboardWidgets');
  const paidPercentage =
    data.total > 0 ? ((data.paid / data.total) * 100).toFixed(1) : '0.0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('invoicesTitle')}</CardTitle>
            <CardDescription>{t('invoicesDescription')}</CardDescription>
          </div>
          <Euro className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monetary Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('total')}</p>
            <p className="text-lg font-bold">{formatCurrency(data.totalAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-green-700">{t('paid')}</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(data.paidAmount)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-red-700">{t('overdue')}</p>
            <p className="text-lg font-bold text-red-700">
              {formatCurrency(data.overdueAmount)}
            </p>
          </div>
        </div>

        {/* Invoice Count Stats */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('totalInvoices')}</p>
            <p className="text-2xl font-bold">{data.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('paidRate')}</p>
            <p className="text-2xl font-bold text-green-600">{paidPercentage}%</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            {t('invoiceStatus')}
          </p>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{t('sent')}</span>
            </div>
            <Badge className="bg-blue-500">{data.sent}</Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{t('paid')}</span>
            </div>
            <Badge className="bg-green-500">{data.paid}</Badge>
          </div>

          {data.overdue > 0 && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">{t('overdue')}</span>
              </div>
              <Badge variant="destructive">{data.overdue}</Badge>
            </div>
          )}
        </div>

        {/* Coming Soon Notice */}
        {data.total === 0 && (
          <div className="border-t pt-4">
            <div className="p-4 bg-gray-50 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                {t('invoiceSystemComingSoon')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
