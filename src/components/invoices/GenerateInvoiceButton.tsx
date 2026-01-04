/**
 * Generate Invoice Button Component
 *
 * Client component for generating invoices from QC-approved worksheets.
 * Shows a button that triggers invoice generation and redirects to the invoice page.
 *
 * Features:
 * - Only enabled for QC_APPROVED worksheets
 * - Handles invoice generation API call
 * - Shows loading state during generation
 * - Redirects to invoice page on success
 * - Displays toast notifications
 * - Error handling
 *
 * Usage:
 * <GenerateInvoiceButton worksheetId="..." worksheetStatus="QC_APPROVED" />
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import type { WorksheetStatus } from '@/src/types/worksheet';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateInvoiceButtonProps {
  worksheetId: string;
  worksheetStatus: WorksheetStatus;
  invoiceId?: string | null; // If invoice already exists
  invoiceStatus?: string | null; // Payment status of the invoice
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GenerateInvoiceButton({
  worksheetId,
  worksheetStatus,
  invoiceId,
  invoiceStatus,
}: GenerateInvoiceButtonProps) {
  const router = useRouter();

  // Check if invoice exists and is not cancelled
  const hasActiveInvoice = !!invoiceId && invoiceStatus !== 'CANCELLED';

  // Can generate if QC_APPROVED status (includes reverted from cancelled invoices)
  const canGenerate = worksheetStatus === 'QC_APPROVED';

  const handleGenerateInvoice = async () => {
    // BUG-002 FIX: Redirect to invoice creation page instead of programmatic creation
    // This provides better UX and allows selecting multiple worksheets
    router.push('/invoices/new');
  };

  // If active invoice exists (not cancelled), show "View Invoice" button
  if (hasActiveInvoice) {
    return (
      <Button
        variant="outline"
        onClick={() => router.push(`/invoices/${invoiceId}`)}
      >
        <FileText className="mr-2 h-4 w-4" />
        View Invoice
      </Button>
    );
  }

  // If can generate invoice
  if (canGenerate) {
    return (
      <Button
        onClick={handleGenerateInvoice}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Generate Invoice
      </Button>
    );
  }

  // Show disabled button with tooltip for other statuses
  return (
    <Button variant="outline" disabled title="Worksheet must be QC approved first">
      <FileText className="mr-2 h-4 w-4" />
      Generate Invoice
    </Button>
  );
}
