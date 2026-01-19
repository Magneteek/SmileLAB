/**
 * New Worksheet Page
 *
 * Create a new worksheet from an order. Can either:
 * 1. Select from dropdown of orders without worksheets
 * 2. Use orderId from query param (backwards compatible)
 *
 * Route: /worksheets/new?orderId=xxx (optional)
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorksheetForm } from '@/src/components/worksheets/WorksheetForm';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface AvailableOrder {
  id: string;
  orderNumber: string;
  patientName: string;
  dentist: {
    clinicName: string;
    dentistName: string;
  };
  orderDate: Date;
  dueDate: Date | null;
  priority: number;
  displayLabel: string;
}

export default function NewWorksheetPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderIdFromUrl);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available orders on mount
  useEffect(() => {
    async function fetchAvailableOrders() {
      setIsLoadingOrders(true);
      setError(null);

      try {
        const response = await fetch('/api/orders/available-for-worksheet');
        if (!response.ok) {
          throw new Error('Failed to fetch available orders');
        }

        const result = await response.json();
        if (result.success) {
          setAvailableOrders(result.data);

          // If orderId from URL, verify it's in the available list
          if (orderIdFromUrl) {
            const orderExists = result.data.some((o: AvailableOrder) => o.id === orderIdFromUrl);
            if (!orderExists) {
              setError('Selected order is not available for worksheet creation');
              setSelectedOrderId(null);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching available orders:', err);
        setError('Failed to load available orders');
      } finally {
        setIsLoadingOrders(false);
      }
    }

    fetchAvailableOrders();
  }, [orderIdFromUrl]);

  const handleSuccess = (worksheet: any) => {
    // Redirect to worksheet detail page
    router.push(`/worksheets/${worksheet.id}`);
  };

  const handleCancel = () => {
    // Go back to orders or worksheets list
    if (selectedOrderId) {
      router.push(`/orders/${selectedOrderId}`);
    } else {
      router.push('/worksheets');
    }
  };

  // Get selected order details for display
  const selectedOrder = availableOrders.find((o) => o.id === selectedOrderId);

  return (
    <div className="container mx-auto py-6 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-sm font-bold tracking-tight">{t('worksheet.createWorksheetTitle')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('worksheet.createWorksheetSubtitle')}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  {t('worksheet.goToOrders')}
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoadingOrders && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">{t('worksheet.loadingOrders')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Selection */}
      {!isLoadingOrders && !selectedOrderId && (
        <Card>
          <CardHeader>
            <CardTitle>{t('worksheet.selectOrder')}</CardTitle>
            <CardDescription>
              {t('worksheet.selectOrderDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableOrders.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('worksheet.noOrdersAvailable')}
                  <div className="mt-2">
                    <Link href="/orders">
                      <Button variant="outline" size="sm">
                        {t('worksheet.createNewOrder')}
                      </Button>
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Select
                  value={selectedOrderId || ''}
                  onValueChange={setSelectedOrderId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('worksheet.selectOrderPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.orderNumber}</span>
                          <span className="text-sm text-muted-foreground">
                            {order.dentist.clinicName} - {t('worksheet.doctorPrefix')} {order.dentist.dentistName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t('worksheet.patientPrefix')} {order.patientName}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t(
                    availableOrders.length === 1
                      ? 'worksheet.ordersAvailable'
                      : 'worksheet.ordersAvailable_plural',
                    { count: availableOrders.length }
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Order Details */}
      {selectedOrder && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-baseline gap-4 text-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">{t('worksheet.orderNumberLabel')}</span>
                <span className="font-semibold">{selectedOrder.orderNumber}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">{t('worksheet.clinicLabel')}</span>
                <span>{selectedOrder.dentist.clinicName}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">{t('worksheet.dentistLabel')}</span>
                <span>{t('worksheet.doctorPrefix')} {selectedOrder.dentist.dentistName}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">{t('worksheet.patientLabel')}</span>
                <span>{selectedOrder.patientName}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worksheet Form */}
      {selectedOrderId && !error && (
        <WorksheetForm
          mode="create"
          orderId={selectedOrderId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
