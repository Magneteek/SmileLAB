'use client';

/**
 * New Order Page
 *
 * Create a new order
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { OrderForm } from '@/components/orders/OrderForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NewOrderPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-sm font-bold tracking-tight">{t('order.createNewOrder')}</h1>
          <p className="text-muted-foreground">
            {t('order.createNewOrderSubtitle')}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('order.orderDetails')}</CardTitle>
          <CardDescription>
            {t('order.orderDetailsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderForm
            onSuccess={(orderId) => router.push(`/orders/${orderId}`)}
            onCancel={() => router.push('/orders')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
