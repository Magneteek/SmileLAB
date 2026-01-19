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
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between py-0.5">
          <div>
            <CardTitle className="text-xs font-semibold">{t('invoicesTitle')}</CardTitle>
            <CardDescription className="text-[10px]">{t('invoicesDescription')}</CardDescription>
          </div>
          <Euro className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-0">
        {/* Monetary Summary */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <div className="space-y-0">
            <p className="text-xs text-muted-foreground">{t('total')}</p>
            <p className="text-xs font-semibold font-bold">{formatCurrency(data.totalAmount)}</p>
          </div>
          <div className="space-y-0">
            <p className="text-xs text-green-700">{t('paid')}</p>
            <p className="text-xs font-semibold font-bold text-green-700">
              {formatCurrency(data.paidAmount)}
            </p>
          </div>
          <div className="space-y-0">
            <p className="text-xs text-red-700">{t('overdue')}</p>
            <p className="text-xs font-semibold font-bold text-red-700">
              {formatCurrency(data.overdueAmount)}
            </p>
          </div>
        </div>

        {/* Invoice Count Stats */}
        <div className="grid grid-cols-2 gap-1 border-t pt-1">
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('totalInvoices')}</p>
            <p className="text-sm font-bold">{data.total}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('paidRate')}</p>
            <p className="text-sm font-bold text-green-600">{paidPercentage}%</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-0.5 border-t pt-1">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            {t('invoiceStatus')}
          </p>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <Send className="h-3 w-3 text-blue-600" />
              <span className="text-[10px] font-medium">{t('sent')}</span>
            </div>
            <Badge className="bg-blue-500">{data.sent}</Badge>
          </div>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-[10px] font-medium">{t('paid')}</span>
            </div>
            <Badge className="bg-green-500">{data.paid}</Badge>
          </div>

          {data.overdue > 0 && (
            <div className="flex items-center justify-between p-1 border rounded-lg bg-red-50">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-600" />
                <span className="text-[10px] font-medium text-red-900">{t('overdue')}</span>
              </div>
              <Badge variant="destructive">{data.overdue}</Badge>
            </div>
          )}
        </div>

        {/* Coming Soon Notice */}
        {data.total === 0 && (
          <div className="border-t pt-1">
            <div className="p-2 bg-gray-50 border rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground">
                {t('invoiceSystemComingSoon')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
