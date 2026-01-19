/**
 * Invoice Detail Page
 *
 * Displays invoice details with:
 * - Invoice header (number, dates, status)
 * - Dentist/clinic information
 * - Patient information
 * - Line items (products breakdown)
 * - Amount calculations (subtotal, tax, total)
 * - Payment status update form
 * - Actions (mark paid, download PDF, send email)
 *
 * Route: /invoices/:id
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Download,
  Mail,
  CheckCircle,
  Save,
  FileText,
  Building,
  User,
  Calendar,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { PaymentStatus, type InvoiceWithRelations } from '@/src/types/invoice';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { FinalizeDraftButton } from '@/src/components/invoices/FinalizeDraftButton';
import { DeleteCanceledInvoiceButton } from '@/src/components/invoices/DeleteCanceledInvoiceButton';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Form state for payment update
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.DRAFT);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Await params
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setInvoiceId(p.id));
  }, [params]);

  // Fetch invoice
  useEffect(() => {
    if (!invoiceId) return;

    async function fetchInvoice() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/invoices/${invoiceId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch invoice');
        }

        const result = await response.json();
        // API wraps response in { success: true, data: {...} }
        const invoiceData = result.data || result;

        // Extract worksheet info from line items for backward compatibility
        const worksheetsFromItems = invoiceData.lineItems
          ?.filter((item: any) => item.worksheet)
          .map((item: any) => item.worksheet) || [];

        // Add a computed worksheet property (using first worksheet if available)
        const enhancedInvoice = {
          ...invoiceData,
          worksheet: worksheetsFromItems[0] || null,
          worksheets: worksheetsFromItems, // All unique worksheets
        };

        setInvoice(enhancedInvoice);
        setPaymentStatus(invoiceData.paymentStatus);
        setPaymentMethod(invoiceData.paymentMethod || '');
        setPaymentNotes(invoiceData.notes || '');
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch invoice');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [invoiceId]);

  // Handle payment status update
  const handleUpdatePayment = async () => {
    if (!invoice) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus,
          paymentMethod: paymentMethod || undefined,
          notes: paymentNotes || undefined,
          paidAt: paymentStatus === PaymentStatus.PAID ? new Date().toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      toast({
        title: t('invoices.successTitle'),
        description: t('invoices.paymentStatusUpdatedSuccess'),
      });

      // Refresh invoice data
      const updatedResponse = await fetch(`/api/invoices/${invoice.id}`);
      const updatedResult = await updatedResponse.json();
      setInvoice(updatedResult.data || updatedResult);
    } catch (err) {
      console.error('Error updating payment:', err);
      toast({
        title: t('invoices.errorTitle'),
        description: err instanceof Error ? err.message : t('invoices.failedUpdatePaymentStatus'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle draft invoice deletion
  const handleDeleteDraft = async () => {
    if (!invoice) return;

    // Confirm deletion
    const confirmed = window.confirm(
      t('invoices.confirmDeleteDraft', { number: invoice.invoiceNumber || 'Draft' })
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('invoices.failedCreateInvoice'));
      }

      const result = await response.json();

      toast({
        title: t('invoices.successTitle'),
        description: result.message || t('invoices.draftInvoiceDeletedSuccess'),
      });

      // Redirect to invoices list
      router.push('/invoices');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast({
        title: t('invoices.errorTitle'),
        description: err instanceof Error ? err.message : t('invoices.failedCreateInvoice'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle send invoice via email
  const handleSendEmail = async () => {
    if (!invoice) return;

    // Check if dentist has email
    if (!invoice.dentist?.email) {
      toast({
        title: t('invoices.errorTitle'),
        description: t('invoices.dentistEmailNotAvailable'),
        variant: 'destructive',
      });
      return;
    }

    // Confirm sending
    const confirmed = window.confirm(
      t('invoices.confirmSendEmail', { number: invoice.invoiceNumber || 'Draft', email: invoice.dentist.email })
    );

    if (!confirmed) return;

    try {
      setSendingEmail(true);

      const response = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: invoice.dentist.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('invoices.failedLoadProducts'));
      }

      const result = await response.json();

      toast({
        title: t('invoices.successTitle'),
        description: t('invoices.invoiceSentSuccess', { email: result.sentTo }),
      });

      // Refresh invoice data to update payment status
      const updatedResponse = await fetch(`/api/invoices/${invoice.id}`);
      const updatedResult = await updatedResponse.json();
      setInvoice(updatedResult.data || updatedResult);
    } catch (err) {
      console.error('Error sending email:', err);
      toast({
        title: t('invoices.errorTitle'),
        description: err instanceof Error ? err.message : t('invoices.failedLoadProducts'),
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Helper function to translate payment status enum to localized label
  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.FINALIZED:
        return t('invoices.statusFinalized');
      case PaymentStatus.SENT:
        return t('invoices.statusSent');
      case PaymentStatus.VIEWED:
        return t('invoices.statusViewed');
      case PaymentStatus.PAID:
        return t('invoices.statusPaid');
      case PaymentStatus.CANCELLED:
        return t('invoices.statusCancelled');
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">{t('invoices.loadingInvoice')}</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('invoices.back')}
        </Button>
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-destructive">
              {error || t('invoices.invoiceNotFound')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('invoices.back')}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold tracking-tight">
                {t('invoices.invoice')} {invoice.invoiceNumber}
              </h1>
              {invoice.isDraft && (
                <Badge variant="secondary" className="text-sm">
                  {t('invoices.draftBadgeText')}
                </Badge>
              )}
              {invoice.paymentStatus === PaymentStatus.CANCELLED && (
                <Badge variant="destructive" className="text-sm">
                  {t('invoices.cancelledBadgeText')}
                </Badge>
              )}
            </div>
            {invoice.lineItems?.[0]?.worksheet && (
              <p className="text-muted-foreground">
                {t('invoices.worksheetText')} {invoice.lineItems[0].worksheet.worksheetNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Draft invoice actions */}
          {invoice.isDraft && (
            <>
              <Button
                variant="outline"
                onClick={handleDeleteDraft}
                disabled={saving}
                className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span className="truncate">{t('invoices.deleteDraftButton')}</span>
              </Button>
              <FinalizeDraftButton
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber || 'Draft'}
              />
            </>
          )}

          {/* Canceled invoice actions */}
          {invoice.paymentStatus === PaymentStatus.CANCELLED && (
            <DeleteCanceledInvoiceButton
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber || t('invoices.invoice')}
            />
          )}

          {/* Finalized invoice actions */}
          {!invoice.isDraft && invoice.paymentStatus !== PaymentStatus.CANCELLED && (
            <>
              <Button
                variant="outline"
                disabled={!invoice.pdfPath}
                onClick={() => {
                  if (invoice.pdfPath) {
                    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
                  }
                }}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="truncate">{t('invoices.downloadPdfButton')}</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={sendingEmail || !invoice.pdfPath || !invoice.dentist?.email}
                className="w-full sm:w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                <span className="truncate">{sendingEmail ? t('invoices.sendingEmail') : t('invoices.sendEmailButton')}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {/* Left Column: Invoice Details */}
        <div className="md:col-span-2 space-y-2">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('invoices.invoiceInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('invoices.invoiceNumberLabel')}</Label>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('invoices.paymentReferenceLabel')}</Label>
                  <p className="font-medium font-mono">{invoice.paymentReference || invoice.invoiceNumber}</p>
                </div>
                {invoice.lineItems?.[0]?.worksheet && (
                  <div>
                    <Label className="text-muted-foreground">{t('invoices.worksheetText')}</Label>
                    <p className="font-medium">
                      <Link
                        href={`/worksheets/${invoice.lineItems[0].worksheet.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.lineItems[0].worksheet.worksheetNumber}
                      </Link>
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">{t('invoices.invoiceDateHeader')}</Label>
                  <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('invoices.dueDateHeader')}</Label>
                  <p
                    className={`font-medium ${
                      invoice.dueDate && new Date(invoice.dueDate) < new Date() &&
                      invoice.paymentStatus !== PaymentStatus.PAID
                        ? 'text-destructive'
                        : ''
                    }`}
                  >
                    {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dentist/Clinic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                {t('invoices.dentistClinicTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-muted-foreground">{t('invoices.clinicNameLabel')}</Label>
                <p className="font-medium">
                  {invoice.dentist?.clinicName || t('invoices.notAvailable')}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('invoices.dentistNameLabel')}</Label>
                <p className="font-medium">
                  {invoice.dentist?.dentistName || t('invoices.notAvailable')}
                </p>
              </div>
              {invoice.dentist?.taxNumber && (
                <div>
                  <Label className="text-muted-foreground">{t('invoices.taxNumberLabel')}</Label>
                  <p className="font-medium font-mono">{invoice.dentist.taxNumber}</p>
                </div>
              )}
              {invoice.dentist?.businessRegistration && (
                <div>
                  <Label className="text-muted-foreground">{t('invoices.businessRegistrationLabel')}</Label>
                  <p className="font-medium font-mono">{invoice.dentist.businessRegistration}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t('invoices.emailLabel')}</Label>
                <p className="font-medium">{invoice.dentist?.email || t('invoices.notAvailable')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('invoices.phoneLabel')}</Label>
                <p className="font-medium">{invoice.dentist?.phone || t('invoices.notAvailable')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('invoices.addressLabel')}</Label>
                <p className="font-medium">
                  {invoice.dentist?.address || t('invoices.notAvailable')}
                  {invoice.dentist?.postalCode && (
                    <>
                      <br />
                      {invoice.dentist.postalCode} {invoice.dentist.city}
                      <br />
                      {invoice.dentist.country}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Patient Info */}
          {invoice.lineItems?.[0]?.worksheet?.patientName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('invoices.patientInformationTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-muted-foreground">{t('invoices.patientNameLabel')}</Label>
                  <p className="font-medium">
                    {invoice.lineItems[0].worksheet.patientName}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>{t('invoices.invoiceItemsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoices.productCodeHeader')}</TableHead>
                    <TableHead>{t('invoices.productNameHeader')}</TableHead>
                    <TableHead className="text-center">{t('invoices.qtyHeaderShort')}</TableHead>
                    <TableHead className="text-right">{t('invoices.unitPriceHeaderText')}</TableHead>
                    <TableHead className="text-right">{t('invoices.totalHeaderText')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.productCode || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{item.description}</div>
                          {item.notes && (
                            <div className="text-sm text-muted-foreground">
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        €{Number(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        €{Number(item.totalPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">
                      {t('invoices.subtotalText')}
                    </TableCell>
                    <TableCell className="text-right">
                      €{Number(invoice.subtotal).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">
                      {t('invoices.vatLabel', { rate: Number(invoice.taxRate) })}
                    </TableCell>
                    <TableCell className="text-right">
                      €{Number(invoice.taxAmount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-right text-lg font-bold"
                    >
                      {t('invoices.totalAmountText')}
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold">
                      €{Number(invoice.totalAmount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Payment Status Update */}
        <div className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t('invoices.paymentStatusTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('invoices.currentStatusLabel')}</Label>
                <Badge
                  variant={
                    invoice.paymentStatus === PaymentStatus.PAID
                      ? 'success'
                      : invoice.paymentStatus === PaymentStatus.CANCELLED
                      ? 'destructive'
                      : 'default'
                  }
                  className="mt-2"
                >
                  {getStatusLabel(invoice.paymentStatus)}
                </Badge>
              </div>

              {/* Draft invoice message */}
              {invoice.isDraft && (
                <>
                  <Separator />
                  <div className="rounded-md bg-muted p-4 text-sm">
                    <p className="font-medium mb-1">{t('invoices.draftInvoiceTitle')}</p>
                    <p className="text-muted-foreground">
                      {t('invoices.draftInvoiceMessage')}
                    </p>
                  </div>
                </>
              )}

              {/* Canceled invoice message */}
              {invoice.paymentStatus === PaymentStatus.CANCELLED && (
                <>
                  <Separator />
                  <div className="rounded-md bg-destructive/10 p-4 text-sm">
                    <p className="font-medium mb-1 text-destructive">{t('invoices.canceledInvoiceTitle')}</p>
                    <p className="text-muted-foreground">
                      {t('invoices.canceledInvoiceMessage')}
                    </p>
                    <p className="text-muted-foreground mt-2">
                      {t('invoices.canceledInvoiceDeleteHint')}
                    </p>
                  </div>
                </>
              )}

              {/* Payment status update form (only for finalized, non-canceled invoices) */}
              {!invoice.isDraft && invoice.paymentStatus !== PaymentStatus.CANCELLED && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="paymentStatus">{t('invoices.updateStatusLabel')}</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
                      >
                        <SelectTrigger id="paymentStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentStatus.FINALIZED}>{t('invoices.statusFinalized')}</SelectItem>
                          <SelectItem value={PaymentStatus.SENT}>{t('invoices.statusSent')}</SelectItem>
                          <SelectItem value={PaymentStatus.VIEWED}>{t('invoices.statusViewed')}</SelectItem>
                          <SelectItem value={PaymentStatus.PAID}>{t('invoices.statusPaid')}</SelectItem>
                          <SelectItem value={PaymentStatus.CANCELLED}>
                            {t('invoices.statusCancelled')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentStatus === PaymentStatus.PAID && (
                      <div>
                        <Label htmlFor="paymentMethod">{t('invoices.paymentMethodLabel')}</Label>
                        <Input
                          id="paymentMethod"
                          type="text"
                          placeholder={t('invoices.paymentMethodPlaceholder')}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="paymentNotes">{t('invoices.notesHeaderLabel')}</Label>
                      <Textarea
                        id="paymentNotes"
                        placeholder={t('invoices.paymentNotesPlaceholder')}
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleUpdatePayment}
                      disabled={saving}
                    >
                      {saving ? (
                        t('invoices.savingText')
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('invoices.updatePaymentStatusButton')}
                        </>
                      )}
                    </Button>
                  </div>

                  {invoice.paidAt && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">{t('invoices.paidAtLabel')}</Label>
                        <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                      </div>
                      {invoice.paymentMethod && (
                        <div>
                          <Label className="text-muted-foreground">{t('invoices.paymentMethodLabel')}</Label>
                          <p className="font-medium">{invoice.paymentMethod}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('invoices.notesHeaderLabel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
