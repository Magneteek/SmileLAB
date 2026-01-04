'use client';

/**
 * Dentist Detail Page
 *
 * View and edit dentist details with tabs for:
 * - Details (view/edit)
 * - Orders
 * - Worksheets
 * - Statistics
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Dentist } from '@prisma/client';
import { DentistForm } from '@/components/dentists/DentistForm';
import { DentistStats } from '@/components/dentists/DentistStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText,
  ClipboardList,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { DentistDetailResponse, DentistStats as DentistStatsType } from '@/types/dentist';

export default function DentistDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const dentistId = params.id as string;
  const editMode = searchParams.get('edit') === 'true';

  const [dentist, setDentist] = useState<DentistDetailResponse | null>(null);
  const [stats, setStats] = useState<DentistStatsType | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(editMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Fetch dentist details
  const fetchDentist = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/dentists/${dentistId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dentist');
      }

      const data: DentistDetailResponse = await response.json();
      setDentist(data);
    } catch (error) {
      console.error('Error fetching dentist:', error);
      toast({
        title: t('dentist.toastErrorTitle'),
        description: t('dentist.toastErrorLoadDetails'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/dentists/${dentistId}?stats=true`);

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data: DentistStatsType = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/dentists/${dentistId}/orders`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Fetch worksheets
  const fetchWorksheets = async () => {
    try {
      const response = await fetch(`/api/dentists/${dentistId}/worksheets`);

      if (!response.ok) {
        throw new Error('Failed to fetch worksheets');
      }

      const data = await response.json();
      setWorksheets(data.worksheets || []);
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    }
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      const response = await fetch(
        `/api/dentists/${dentistId}/invoices?status=${statusFilter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
      setInvoiceSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  useEffect(() => {
    fetchDentist();
  }, [dentistId]);

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStats();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'worksheets') {
      fetchWorksheets();
    } else if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeTab]);

  // Re-fetch invoices when status filter changes
  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [statusFilter]);

  // Download invoice PDF
  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: t('dentist.toastInvoiceDownloadFailedTitle'),
          description: error.error || t('dentist.toastInvoiceDownloadFailedDesc'),
          variant: 'destructive',
        });
        return;
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('dentist.toastSuccessTitle'),
        description: t('dentist.toastInvoiceDownloadSuccess'),
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: t('dentist.toastErrorTitle'),
        description: t('dentist.toastInvoiceDownloadError'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: any) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/dentists/${dentistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('dentist.toastErrorUpdate'));
      }

      const updatedDentist = await response.json();
      setDentist(updatedDentist);
      setIsEditing(false);

      toast({
        title: t('dentist.toastSuccessTitle'),
        description: t('dentist.toastSuccessUpdate'),
      });
    } catch (error: any) {
      toast({
        title: t('dentist.toastErrorTitle'),
        description: error.message || t('dentist.toastErrorUpdate'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        t('dentist.deleteConfirmation')
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/dentists/${dentistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('dentist.toastErrorDelete'));
      }

      toast({
        title: t('dentist.toastSuccessTitle'),
        description: t('dentist.toastSuccessDelete'),
      });

      router.push('/dentists');
    } catch (error: any) {
      toast({
        title: t('dentist.toastErrorTitle'),
        description: error.message || t('dentist.toastErrorDelete'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !dentist) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12 text-gray-500">{t('dentist.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dentists">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('dentist.backToDentists')}
            </Button>
          </Link>
        </div>

        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('dentist.editButton')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('dentist.deleteButton')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Title & Status */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{dentist.clinicName}</h1>
          {dentist.active ? (
            <Badge variant="default" className="bg-green-600">
              {t('dentist.statusActive')}
            </Badge>
          ) : (
            <Badge variant="secondary">{t('dentist.statusInactive')}</Badge>
          )}
        </div>
        <p className="text-gray-500 mt-1">{t('dentist.doctorPrefix')} {dentist.dentistName}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            {t('dentist.tabDetails')}
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ClipboardList className="h-4 w-4 mr-2" />
            {t('dentist.tabOrdersCount', { count: dentist._count?.orders || 0 })}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            {t('dentist.tabInvoicesCount', { count: dentist._count?.invoices || 0 })}
          </TabsTrigger>
          <TabsTrigger value="worksheets">
            <FileText className="h-4 w-4 mr-2" />
            {t('dentist.tabWorksheetsCount', { count: dentist._count?.worksheets || 0 })}
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('dentist.tabStatistics')}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {isEditing ? (
            <DentistForm
              dentist={dentist}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isSubmitting}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('dentist.detailsBasicInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('dentist.detailsClinicName')}</p>
                    <p className="font-medium">{dentist.clinicName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('dentist.detailsDentistName')}</p>
                    <p className="font-medium">{t('dentist.doctorPrefix')} {dentist.dentistName}</p>
                  </div>
                  {dentist.licenseNumber && (
                    <div>
                      <p className="text-sm text-gray-500">{t('dentist.detailsLicenseNumber')}</p>
                      <p className="font-medium">{dentist.licenseNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('dentist.detailsContactInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${dentist.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {dentist.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${dentist.phone}`}>{dentist.phone}</a>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p>{dentist.address}</p>
                      <p>
                        {dentist.postalCode} {dentist.city}
                      </p>
                      <p>{dentist.country}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('dentist.detailsBusinessSettings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('dentist.detailsPaymentTerms')}</p>
                    <p className="font-medium">{dentist.paymentTerms} {t('dentist.detailsDays')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('dentist.detailsStatus')}</p>
                    <p className="font-medium">
                      {dentist.active ? t('dentist.statusActive') : t('dentist.statusInactive')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {dentist.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dentist.detailsNotes')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{dentist.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>{t('dentist.ordersTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t('dentist.ordersEmpty')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('dentist.ordersTableHeaderOrderNumber')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('dentist.ordersTableHeaderDate')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('dentist.ordersTableHeaderDNNumber')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('dentist.ordersTableHeaderStatus')}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">{t('dentist.ordersTableHeaderValue')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('dentist.ordersTableHeaderInvoice')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.orderDate).toLocaleDateString('sl-SI')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {order.worksheet ? (
                              <Link
                                href={`/worksheets/${order.worksheet.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {order.worksheet.worksheetNumber}
                              </Link>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>
                              {t(`status.${order.status.toLowerCase()}`)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            €{order.totalValue?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3">
                            {order.hasInvoice ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-blue-600">
                                  {order.invoiceNumber}
                                </div>
                                <Badge
                                  variant={
                                    order.invoiceStatus === 'PAID' ? 'default' :
                                    order.invoiceStatus === 'PENDING' ? 'secondary' :
                                    'destructive'
                                  }
                                  className={
                                    order.invoiceStatus === 'PAID' ? 'bg-green-500' :
                                    order.invoiceStatus === 'OVERDUE' ? 'bg-red-500' : ''
                                  }
                                >
                                  {order.invoiceStatus}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">{t('dentist.ordersNotInvoiced')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('dentist.invoicesTitle')}</CardTitle>
              {invoiceSummary && (
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">{t('dentist.invoicesOutstanding')}: </span>
                    <span className="font-semibold text-red-600">
                      €{invoiceSummary.totalOutstanding.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('dentist.invoicesPaidThisMonth')}: </span>
                    <span className="font-semibold text-green-600">
                      €{invoiceSummary.paidThisMonth.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Filter Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('ALL')}
                >
                  {t('dentist.invoicesFilterAll')}
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'PAID' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('PAID')}
                >
                  {t('dentist.invoicesFilterPaid')}
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('PENDING')}
                >
                  {t('dentist.invoicesFilterPending')}
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'OVERDUE' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('OVERDUE')}
                >
                  {t('dentist.invoicesFilterOverdue')}
                </Button>
              </div>

              {invoices.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t('dentist.invoicesEmpty')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          {t('dentist.invoicesTableHeaderInvoiceNumber')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          {t('dentist.invoicesTableHeaderDate')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          {t('dentist.invoicesTableHeaderDNNumbers')}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          {t('dentist.invoicesTableHeaderAmount')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          {t('dentist.invoicesTableHeaderStatus')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          {t('dentist.invoicesTableHeaderActions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((invoice: any) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(invoice.invoiceDate).toLocaleDateString('sl-SI')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {invoice.lineItems?.map((item: any) => (
                                <span
                                  key={item.id}
                                  className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                                >
                                  {item.worksheet?.worksheetNumber || 'N/A'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            €{invoice.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                invoice.paymentStatus === 'PAID'
                                  ? 'default'
                                  : invoice.paymentStatus === 'PENDING'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={
                                invoice.paymentStatus === 'PAID'
                                  ? 'bg-green-500'
                                  : invoice.paymentStatus === 'OVERDUE'
                                  ? 'bg-red-500'
                                  : ''
                              }
                            >
                              {t(`status.${invoice.paymentStatus.toLowerCase()}`)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDownloadInvoice(invoice.id, invoice.invoiceNumber)
                                }
                              >
                                {t('dentist.invoicesDownloadButton')}
                              </Button>
                              {invoice.paymentStatus === 'OVERDUE' && (
                                <Button size="sm" variant="outline">
                                  {t('dentist.invoicesSendReminderButton')}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worksheets Tab */}
        <TabsContent value="worksheets">
          <Card>
            <CardHeader>
              <CardTitle>{t('dentist.worksheetsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {worksheets.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t('dentist.worksheetsEmpty')}
                </p>
              ) : (
                <div className="space-y-2">
                  {worksheets.map((worksheet: any) => (
                    <div key={worksheet.id} className="border rounded p-3 hover:bg-gray-50">
                      {/* Row 1: Main Info */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <Link
                            href={`/worksheets/${worksheet.id}`}
                            className="font-semibold text-blue-600 hover:underline min-w-[120px]"
                          >
                            {worksheet.worksheetNumber}
                          </Link>
                          <span className="text-sm text-gray-500">
                            {new Date(worksheet.order.orderDate).toLocaleDateString('sl-SI')}
                          </span>
                          <Badge variant={
                            worksheet.status === 'DELIVERED' ? 'default' :
                            worksheet.status === 'QC_APPROVED' || worksheet.status === 'INVOICED' ? 'secondary' :
                            'outline'
                          } className="text-xs">
                            {t(`status.${worksheet.status.toLowerCase()}`)}
                          </Badge>
                          <div className="flex flex-wrap gap-1.5 flex-1">
                            {worksheet.products && worksheet.products.length > 0 ? (
                              worksheet.products.map((wp: any) => (
                                <span
                                  key={wp.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                                >
                                  {wp.product.name} ×{wp.quantity}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">{t('dentist.worksheetsNoProducts')}</span>
                            )}
                          </div>
                        </div>
                        {/* Document Indicator */}
                        {worksheet.documents && worksheet.documents.length > 0 && (
                          <div
                            className="flex items-center gap-1 cursor-pointer text-green-600 hover:text-green-700"
                            title={`Annex XIII Document\nRetention until: ${new Date(worksheet.documents[0].retentionUntil).toLocaleDateString('sl-SI')}`}
                          >
                            <FileText className="h-5 w-5" />
                            <span className="text-xs font-medium">MDR</span>
                          </div>
                        )}
                      </div>

                      {/* Row 2: LOT Numbers */}
                      {worksheet.materials && worksheet.materials.length > 0 && (
                        <div className="mt-2 pt-2 border-t flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs font-medium text-gray-600 mr-1">{t('dentist.worksheetsLOTs')}:</span>
                          {worksheet.materials.map((wm: any) => (
                            <span
                              key={wm.id}
                              className="inline-flex items-center gap-1 text-xs font-mono bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200"
                              title={`${wm.material.name} - ${wm.material.code}`}
                            >
                              {wm.materialLot ? wm.materialLot.lotNumber : t('dentist.worksheetsNoLOT')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          {stats ? (
            <DentistStats stats={stats} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">{t('dentist.statisticsLoading')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
