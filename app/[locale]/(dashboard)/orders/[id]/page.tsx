'use client';

/**
 * Order Detail Page
 *
 * View and edit a single order with full details
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { OrderForm } from '@/components/orders/OrderForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Loader2, FileText, Eye, Download, Receipt } from 'lucide-react';
import { OrderDetailResponse } from '@/types/order';
import { OrderStatus } from '@prisma/client';

// Status badge colors
const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-gray-500',
  IN_PRODUCTION: 'bg-blue-500',
  QC_PENDING: 'bg-yellow-500',
  QC_APPROVED: 'bg-green-500',
  INVOICED: 'bg-purple-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

// Priority colors
const priorityColors = ['text-gray-600', 'text-orange-600', 'text-red-600'];

// Source label from impressionType + scanSource
const SOURCE_LABELS: Record<string, string> = {
  MEDIT: 'MeditLink',
  SHINING3D: 'Shining 3D',
  GOOGLE_DRIVE: 'Google Drive',
  THREESHAPE: '3Shape',
};

function getSourceLabel(impressionType: string, scanSource?: string | null): string {
  if (scanSource && SOURCE_LABELS[scanSource]) return SOURCE_LABELS[scanSource];
  if (impressionType === 'PHYSICAL_IMPRINT') return 'Fizično / Kurir';
  return 'E-pošta / FilePort';
}

// Format date
function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const t = useTranslations('orderDetail');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Priority labels (using translations)
  const priorityLabels = [t('priorityNormal'), t('priorityHigh'), t('priorityUrgent')];

  // Unwrap params
  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  // Fetch order details
  useEffect(() => {
    if (!orderId) return;

    async function fetchOrder() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Order not found');
          }
          throw new Error('Failed to fetch order');
        }

        const result = await response.json();
        if (result.success) {
          setOrder(result.data);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load order'
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  // Handle delete
  async function handleDelete() {
    if (!orderId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete order');
      }

      router.push('/orders');
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete order'
      );
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('loadingOrder')}</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-bold tracking-tight">{t('orderNotFound')}</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || t('orderNotFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-bold tracking-tight">
              {t('orderTitle')} {order.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              {t('viewManageDetails')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditMode && (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {t('editButton')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteButton')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Order details */}
      {isEditMode ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('editOrderTitle')}</CardTitle>
            <CardDescription>
              {t('editOrderDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrderForm
              orderId={order.id}
              initialData={{
                dentistId: order.dentistId,
                patientName: order.patientName || undefined,
                dueDate: order.dueDate
                  ? new Date(order.dueDate).toISOString().split('T')[0]
                  : undefined,
                priority: order.priority,
                impressionType: (order as any).impressionType || 'PHYSICAL_IMPRINT',
                scanSource: (order as any).worksheets?.[0]?.scanSource ?? null,
                scanReference: (order as any).worksheets?.[0]?.scanReference ?? null,
                worksheetId: (order as any).worksheets?.[0]?.id ?? null,
                status: order.status,
                notes: order.notes || undefined,
              }}
              onSuccess={() => {
                setIsEditMode(false);
                // Refresh order data
                window.location.reload();
              }}
              onCancel={() => setIsEditMode(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('orderInformationTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('orderNumberLabel')}</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('statusLabel')}</p>
                  <Badge className={`${statusColors[order.status]} mt-1`} variant="default">
                    {t(`statuses.${order.status}`)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('patientLabel')}</p>
                  <p>{order.patientName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('orderDateLabel')}</p>
                  <p>{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('dueDateLabel')}</p>
                  <p className={order.dueDate && new Date(order.dueDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                    {formatDate(order.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('priorityLabel')}</p>
                  <p className={`font-medium ${priorityColors[order.priority]}`}>
                    {priorityLabels[order.priority]}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vir naročila</p>
                  <p className="font-medium">
                    {getSourceLabel(
                      (order as any).impressionType,
                      (order as any).worksheets?.[0]?.scanSource
                    )}
                  </p>
                </div>
              </div>

              {order.notes && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t('notesLabel')}</p>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dentist Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dentistInformationTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('clinicLabel')}</p>
                  <p className="font-semibold">{order.dentist.clinicName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('dentistLabel')}</p>
                  <p>{order.dentist.dentistName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('emailLabel')}</p>
                  <p className="text-sm">{order.dentist.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('phoneLabel')}</p>
                  <p>{order.dentist.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Worksheet + Documents grid */}
          <Card>
            <CardHeader>
              <CardTitle>Delovni nalog & Dokumenti</CardTitle>
            </CardHeader>
            <CardContent>
              {(order as any).worksheets && (order as any).worksheets.length > 0 ? (() => {
                const ws = (order as any).worksheets[0];
                const annexDoc = ws.documents?.[0];
                const invoiceItems = ws.invoiceLineItems ?? [];
                const finalizedInvoice = invoiceItems.find((item: any) => item.invoice && !item.invoice.isDraft)?.invoice;
                const draftInvoice = !finalizedInvoice ? invoiceItems.find((item: any) => item.invoice?.isDraft)?.invoice : null;
                const invoice = finalizedInvoice ?? draftInvoice;
                return (
                  <div className="grid grid-cols-3 gap-4">
                    {/* Column 1: Worksheet */}
                    <div className="border rounded-lg p-4 bg-gray-50 border-gray-200 flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('worksheetNumberLabel')}
                      </p>
                      <p className="text-lg font-semibold">
                        {ws.worksheetNumber}
                        {ws.revision > 1 && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            (Rev {ws.revision})
                          </span>
                        )}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        {t('statusLabel')}: <Badge className="ml-1">{ws.status}</Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-auto pt-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/worksheets/${ws.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            {t('viewWorksheetButton')}
                          </Link>
                        </Button>
                        {ws.status === 'VOIDED' && (
                          <Button asChild size="sm">
                            <Link href={`/worksheets/new?orderId=${order.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              {t('createRevisionButton')}
                            </Link>
                          </Button>
                        )}
                        {ws.status === 'CANCELLED' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (confirm(t('deleteWorksheetConfirm'))) {
                                try {
                                  const response = await fetch(`/api/worksheets/${ws.id}`, { method: 'DELETE' });
                                  if (response.ok) {
                                    window.location.reload();
                                  } else {
                                    const result = await response.json();
                                    alert(result.error || 'Failed to delete worksheet');
                                  }
                                } catch {
                                  alert('Failed to delete worksheet');
                                }
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('deleteWorksheetButton')}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Column 2: MDR Document */}
                    <div className={`border rounded-lg p-4 flex flex-col gap-2 ${annexDoc ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MDR Annex XIII</p>
                      {annexDoc ? (
                        <>
                          <p className="text-lg font-semibold font-mono text-green-800">{annexDoc.documentNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(annexDoc.generatedAt).toLocaleDateString('sl-SI')}
                          </p>
                          <div className="flex flex-col gap-1 mt-auto pt-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/api/documents/annex-xiii/${ws.id}?view=true`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" />
                                Poglej
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/api/documents/annex-xiii/${ws.id}`} target="_blank">
                                <Download className="mr-2 h-4 w-4" />
                                Prenesi
                              </Link>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">Ni generiranega MDR</p>
                      )}
                    </div>

                    {/* Column 3: Invoice */}
                    <div className={`border rounded-lg p-4 flex flex-col gap-2 ${finalizedInvoice ? 'bg-purple-50 border-purple-200' : invoice ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Račun</p>
                      {invoice ? (
                        <>
                          <p className="text-lg font-semibold font-mono">
                            {invoice.invoiceNumber ?? (finalizedInvoice ? '' : 'Osnutek')}
                          </p>
                          {invoice.invoiceDate && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(invoice.invoiceDate).toLocaleDateString('sl-SI')}
                            </p>
                          )}
                          {invoice.totalAmount != null && (
                            <p className="text-sm font-semibold">{Number(invoice.totalAmount).toFixed(2)} €</p>
                          )}
                          <div className="flex flex-col gap-1 mt-auto pt-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href="/invoices">
                                <Eye className="mr-2 h-4 w-4" />
                                Odpri
                              </Link>
                            </Button>
                            {finalizedInvoice && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Prenesi PDF
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">Ni generiranega računa</p>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>{t('noWorksheetMessage')}</p>
                  <Button className="mt-4" asChild>
                    <Link href={`/worksheets/new?orderId=${order.id}`}>
                      {t('createWorksheetButton')}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>{t('metadataTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">{t('createdAtLabel')}</p>
                  <p>{formatDateTime(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('lastUpdatedLabel')}</p>
                  <p>{formatDateTime(order.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialogDescription', { orderNumber: order.orderNumber })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('cancelButton')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
