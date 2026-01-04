'use client';

/**
 * Order Detail Page
 *
 * View and edit a single order with full details
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Edit, Trash2, Loader2, FileText } from 'lucide-react';
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

// Priority labels
const priorityLabels = ['Normal', 'High', 'Urgent'];
const priorityColors = ['text-gray-600', 'text-orange-600', 'text-red-600'];

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
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        <span className="ml-2">Loading order...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Order Not Found</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Order not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Order {order.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              View and manage order details
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditMode && (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
            <CardTitle>Edit Order</CardTitle>
            <CardDescription>
              Update order details. Order number cannot be changed.
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
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order #</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[order.status]} mt-1`} variant="default">
                    {order.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p>{order.patientName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                  <p>{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p className={order.dueDate && new Date(order.dueDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                    {formatDate(order.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <p className={`font-medium ${priorityColors[order.priority]}`}>
                    {priorityLabels[order.priority]}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Impression Type</p>
                  <p className="font-medium">
                    {(order as any).impressionType === 'DIGITAL_SCAN' ? '📱 Digital Scan' : '📝 Physical Imprint'}
                  </p>
                </div>
              </div>

              {order.notes && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dentist Information */}
          <Card>
            <CardHeader>
              <CardTitle>Dentist Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clinic</p>
                  <p className="font-semibold">{order.dentist.clinicName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dentist</p>
                  <p>{order.dentist.dentistName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{order.dentist.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{order.dentist.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Worksheet Information */}
          <Card>
            <CardHeader>
              <CardTitle>Worksheet</CardTitle>
            </CardHeader>
            <CardContent>
              {(order as any).worksheets && (order as any).worksheets.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Worksheet Number
                      </p>
                      <p className="text-lg font-semibold">
                        {(order as any).worksheets[0].worksheetNumber}
                        {(order as any).worksheets[0].revision > 1 && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            (Rev {(order as any).worksheets[0].revision})
                          </span>
                        )}
                      </p>
                      <div className="text-sm text-muted-foreground mt-1">
                        Status: <Badge className="ml-1">{(order as any).worksheets[0].status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline">
                        <Link href={`/worksheets/${(order as any).worksheets[0].id}`}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Worksheet
                        </Link>
                      </Button>
                      {(order as any).worksheets[0].status === 'VOIDED' && (
                        <Button asChild>
                          <Link href={`/worksheets/new?orderId=${order.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Create Revision Worksheet
                          </Link>
                        </Button>
                      )}
                      {(order as any).worksheets[0].status === 'CANCELLED' && (
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (confirm('Delete this cancelled worksheet? This will allow you to create a new worksheet (next revision).')) {
                              try {
                                const response = await fetch(`/api/worksheets/${(order as any).worksheets[0].id}`, {
                                  method: 'DELETE',
                                });
                                if (response.ok) {
                                  window.location.reload();
                                } else {
                                  const result = await response.json();
                                  alert(result.error || 'Failed to delete worksheet');
                                }
                              } catch (err) {
                                alert('Failed to delete worksheet');
                              }
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Cancelled
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No worksheet created for this order yet.</p>
                  <Button className="mt-4" asChild>
                    <Link href={`/worksheets/new?orderId=${order.id}`}>
                      Create Worksheet
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Created At</p>
                  <p>{formatDateTime(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
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
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order {order.orderNumber}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
