/**
 * Invoices List Page
 *
 * Displays all invoices with filtering, search, and pagination.
 * Shows payment status, dentist info, amounts, and due dates.
 *
 * Features:
 * - Data table with sortable columns
 * - Payment status filtering
 * - Overdue highlighting
 * - Search by invoice number, dentist, worksheet
 * - Pagination
 * - Quick actions (view, mark paid, download PDF)
 * - Payment status badges
 * - Summary statistics
 *
 * Route: /invoices
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Plus,
  Edit,
  Lock,
} from 'lucide-react';
import { PaymentStatus, type InvoiceSummary } from '@/src/types/invoice';
import { formatDate } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface PaginatedInvoices {
  data: InvoiceSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalDraft: number;
    totalSent: number;
    totalPaid: number;
    totalOverdue: number;
    totalUnpaid: number;
  };
}

// ============================================================================
// PAYMENT STATUS BADGE COMPONENT
// ============================================================================

function PaymentStatusBadge({ status, overdue }: { status: PaymentStatus; overdue: boolean }) {
  const t = useTranslations();

  if (overdue && status !== PaymentStatus.PAID && status !== PaymentStatus.CANCELLED) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {t('invoice.statusOverdue')}
      </Badge>
    );
  }

  const variants: Record<PaymentStatus, { variant: any; labelKey: string; icon?: any }> = {
    [PaymentStatus.DRAFT]: {
      variant: 'secondary',
      labelKey: 'invoice.statusDraft',
      icon: FileText,
    },
    [PaymentStatus.FINALIZED]: {
      variant: 'default',
      labelKey: 'invoice.statusFinalized',
      icon: Lock,
    },
    [PaymentStatus.SENT]: {
      variant: 'default',
      labelKey: 'invoice.statusSent',
      icon: Clock,
    },
    [PaymentStatus.VIEWED]: {
      variant: 'default',
      labelKey: 'invoice.statusViewed',
      icon: Eye,
    },
    [PaymentStatus.PAID]: {
      variant: 'success',
      labelKey: 'invoice.statusPaid',
      icon: CheckCircle,
    },
    [PaymentStatus.OVERDUE]: {
      variant: 'destructive',
      labelKey: 'invoice.statusOverdue',
      icon: AlertCircle,
    },
    [PaymentStatus.CANCELLED]: {
      variant: 'outline',
      labelKey: 'invoice.statusCancelled',
    },
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {t(config.labelKey)}
    </Badge>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function InvoicesPage() {
  const t = useTranslations();
  const [invoices, setInvoices] = useState<PaginatedInvoices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Fetch invoices
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });

        if (paymentStatus !== 'all') {
          params.append('paymentStatus', paymentStatus);
        }

        if (search) {
          params.append('search', search);
        }

        if (showOverdueOnly) {
          params.append('overdue', 'true');
        }

        const response = await fetch(`/api/invoices?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch invoices');
        }

        const result = await response.json();
        // API wraps response in { success: true, data: {...} }
        setInvoices(result.data || result);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [page, paymentStatus, search, showOverdueOnly]);

  // Handle search with debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('invoice.title')}</h1>
          <p className="text-muted-foreground">
            {t('invoice.subtitle')}
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            {t('invoice.createInvoice')}
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      {invoices && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('invoice.summaryDraft')}</CardDescription>
              <CardTitle className="text-2xl">{invoices.summary.totalDraft}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('invoice.summarySent')}</CardDescription>
              <CardTitle className="text-2xl">{invoices.summary.totalSent}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('invoice.summaryPaid')}</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {invoices.summary.totalPaid}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('invoice.summaryOverdue')}</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {invoices.summary.totalOverdue}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('invoice.summaryUnpaid')}</CardDescription>
              <CardTitle className="text-2xl">{invoices.summary.totalUnpaid}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters - Compact Single Row */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <Input
              type="text"
              placeholder={t('invoice.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-48"
            />

            {/* Payment Status Filter */}
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('invoice.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('invoice.allStatuses')}</SelectItem>
                <SelectItem value="DRAFT">{t('invoice.statusDraft')}</SelectItem>
                <SelectItem value="FINALIZED">{t('invoice.statusFinalized')}</SelectItem>
                <SelectItem value="SENT">{t('invoice.statusSent')}</SelectItem>
                <SelectItem value="VIEWED">{t('invoice.statusViewed')}</SelectItem>
                <SelectItem value="PAID">{t('invoice.statusPaid')}</SelectItem>
                <SelectItem value="OVERDUE">{t('invoice.statusOverdue')}</SelectItem>
                <SelectItem value="CANCELLED">{t('invoice.statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Overdue Toggle */}
            <Button
              variant={showOverdueOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowOverdueOnly(!showOverdueOnly);
                setPage(1);
              }}
              className="gap-2 whitespace-nowrap"
            >
              <AlertCircle className="h-4 w-4" />
              {showOverdueOnly ? t('invoice.overdueOnly') : t('invoice.showOverdue')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('invoice.allInvoices')}
            {invoices && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {t('invoice.totalCount', { total: invoices.pagination.total })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-center py-8 text-muted-foreground">{t('invoice.loading')}</p>}
          {error && (
            <p className="text-center py-8 text-destructive">{t('invoice.error', { error })}</p>
          )}

          {!loading && !error && invoices && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('invoice.table.invoiceNumber')}</TableHead>
                      <TableHead>{t('invoice.table.worksheet')}</TableHead>
                      <TableHead>{t('invoice.table.dentist')}</TableHead>
                      <TableHead>{t('invoice.table.patient')}</TableHead>
                      <TableHead>{t('invoice.table.invoiceDate')}</TableHead>
                      <TableHead>{t('invoice.table.dueDate')}</TableHead>
                      <TableHead className="text-right">{t('invoice.table.amount')}</TableHead>
                      <TableHead>{t('invoice.table.status')}</TableHead>
                      <TableHead className="text-right">{t('invoice.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          {t('invoice.noInvoicesFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.data.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.isDraft ? (
                              <Badge variant="outline">{t('invoice.draftBadge')}</Badge>
                            ) : (
                              invoice.invoiceNumber
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.worksheetNumbers && invoice.worksheetNumbers.length > 0 ? (
                              invoice.worksheetNumbers.length === 1 ? (
                                <Link
                                  href={`/worksheets/${invoice.worksheetNumbers[0]}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {invoice.worksheetNumbers[0]}
                                </Link>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {invoice.worksheetNumbers.map((wsNum, idx) => (
                                    <Link
                                      key={idx}
                                      href={`/worksheets/${wsNum}`}
                                      className="text-blue-600 hover:underline text-sm"
                                    >
                                      {wsNum}
                                    </Link>
                                  ))}
                                </div>
                              )
                            ) : (
                              <span className="text-gray-400 italic">{t('invoice.noWorksheets')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.dentistName}</div>
                              <div className="text-sm text-muted-foreground">
                                {invoice.clinicName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.patientName || '-'}</TableCell>
                          <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                          <TableCell>
                            <div
                              className={
                                invoice.overdue
                                  ? 'font-medium text-destructive'
                                  : ''
                              }
                            >
                              {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            €{invoice.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge
                              status={invoice.paymentStatus}
                              overdue={invoice.overdue}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {invoice.isDraft && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  title={t('invoice.editDraftTitle')}
                                >
                                  <Link href={`/invoices/${invoice.id}/edit`}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title={t('invoice.viewInvoiceTitle')}
                              >
                                <Link href={`/invoices/${invoice.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {!invoice.isDraft && (
                                <Button variant="ghost" size="sm" title={t('invoice.downloadPDFTitle')}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {invoices.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('invoice.pageInfo', { page: invoices.pagination.page, totalPages: invoices.pagination.totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      {t('invoice.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === invoices.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      {t('invoice.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
