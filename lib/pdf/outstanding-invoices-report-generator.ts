/**
 * Outstanding Invoices Report PDF Generator
 *
 * Generates a comprehensive report of all unpaid invoices with aging analysis
 * for accounting and accounts receivable management.
 *
 * Uses unified PDF infrastructure for consistent branding.
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import {
  generatePDF,
  generatePDFHeader,
  generatePDFFooter,
} from './base';
import { imageToBase64 } from './utils/image-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  dentistName: string;
  clinicName: string;
  totalAmount: number;
  paymentStatus: string;
  daysOverdue: number;
  agingBucket: string; // 'CURRENT' | '1-30' | '31-60' | '61-90' | '90+'
}

interface AgingSummary {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate Outstanding Invoices Report PDF
 *
 * Creates a detailed report of all unpaid invoices with aging analysis
 * for accounts receivable management.
 *
 * @param locale - Locale for translations (default: 'en')
 * @returns PDF buffer
 */
export async function generateOutstandingInvoicesReportPDF(locale: string = 'en'): Promise<Buffer> {
  console.log(`[Outstanding Invoices Report] Starting generation... (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.outstandingInvoices || {};
  console.log(`[Outstanding Invoices Report] Translations loaded for locale: ${locale}`);

  // Fetch lab configuration
  const labConfig = await getLabConfigurationOrThrow();

  // Fetch outstanding invoices
  const invoices = await fetchOutstandingInvoices();
  console.log(`[Outstanding Invoices Report] Found ${invoices.length} outstanding invoices`);

  // Calculate aging summary
  const agingSummary = calculateAgingSummary(invoices);

    // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

// Generate header
  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: `AR-REPORT-${new Date().toISOString().split('T')[0]}`,
    documentTitle: 'Outstanding Invoices Report',
  });

  // Generate footer
  const footerHTML = generatePDFFooter({
    laboratoryName: labConfig.laboratoryName,
    city: labConfig.city,
    country: labConfig.country || 'Slovenia',
    showPageNumbers: true,
    showDate: true,
  });

  // Generate content HTML
  const contentHTML = generateReportHTML(invoices, agingSummary, labConfig, t, locale);

  // Generate PDF
  const result = await generatePDF({
    htmlContent: contentHTML,
    headerHTML,
    footerHTML,
    format: 'A4',
    margins: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm',
    },
  });

  console.log(`[Outstanding Invoices Report] Generated successfully: ${result.buffer.length} bytes`);
  return result.buffer;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch outstanding (unpaid) invoices from database
 */
async function fetchOutstandingInvoices(): Promise<OutstandingInvoice[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      isDraft: false,
      paymentStatus: {
        in: ['FINALIZED', 'SENT', 'VIEWED'], // Not PAID or CANCELLED
      },
      NOT: {
        dueDate: null,
      },
    },
    include: {
      dentist: {
        select: {
          dentistName: true,
          clinicName: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc', // Oldest due first
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return invoices.map((invoice) => {
    const dueDate = new Date(invoice.dueDate!);
    dueDate.setHours(0, 0, 0, 0);

    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const agingBucket = getAgingBucket(daysOverdue);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || 'DRAFT',
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate!,
      dentistName: invoice.dentist!.dentistName,
      clinicName: invoice.dentist!.clinicName,
      totalAmount: invoice.totalAmount.toNumber(),
      paymentStatus: invoice.paymentStatus,
      daysOverdue,
      agingBucket,
    };
  });
}

/**
 * Determine aging bucket for invoice
 */
function getAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'CURRENT';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

/**
 * Calculate aging summary totals
 */
function calculateAgingSummary(invoices: OutstandingInvoice[]): AgingSummary {
  const summary: AgingSummary = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
    total: 0,
  };

  for (const invoice of invoices) {
    const amount = invoice.totalAmount;
    summary.total += amount;

    switch (invoice.agingBucket) {
      case 'CURRENT':
        summary.current += amount;
        break;
      case '1-30':
        summary.days1to30 += amount;
        break;
      case '31-60':
        summary.days31to60 += amount;
        break;
      case '61-90':
        summary.days61to90 += amount;
        break;
      case '90+':
        summary.days90plus += amount;
        break;
    }
  }

  return summary;
}

/**
 * Generate report HTML content
 */
function generateReportHTML(
  invoices: OutstandingInvoice[],
  agingSummary: AgingSummary,
  labConfig: any,
  t: any,
  locale: string
): string {
  const reportDate = new Date().toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  let html = `
    <div style="margin-bottom: 20px;">
      <h1>${t.title || 'Outstanding Invoices Report'}</h1>
      <p class="text-center" style="color: #666; font-size: 10pt;">
        ${t.reportDate || 'Report Date:'} ${reportDate} | ${t.totalOutstanding || 'Total Outstanding:'} €${agingSummary.total.toFixed(2)}
      </p>
    </div>

    <!-- Aging Summary -->
    <div class="compliance-box" style="margin-bottom: 25px; padding: 15px; background: #e0f2f7; border-left: 4px solid #007289;">
      <h3 style="margin-top: 0; color: #007289;">${t.agingSummaryTitle || 'Aging Summary'}</h3>
      <table class="info-table" style="width: 100%; background: white;">
        <tbody>
          <tr>
            <td style="width: 40%;"><strong>${t.currentNotDue || 'Current (Not Yet Due)'}</strong></td>
            <td style="text-align: right; width: 60%;">€${agingSummary.current.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>${t.days1to30 || '1-30 Days Overdue'}</strong></td>
            <td style="text-align: right;">€${agingSummary.days1to30.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>${t.days31to60 || '31-60 Days Overdue'}</strong></td>
            <td style="text-align: right; color: #D97706;">€${agingSummary.days31to60.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>${t.days61to90 || '61-90 Days Overdue'}</strong></td>
            <td style="text-align: right; color: #DC2626;">€${agingSummary.days61to90.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>${t.days90plus || '90+ Days Overdue'}</strong></td>
            <td style="text-align: right; color: #991B1B; font-weight: bold;">€${agingSummary.days90plus.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #007289;">
            <td><strong style="font-size: 11pt;">${t.totalOutstandingLabel || 'TOTAL OUTSTANDING'}</strong></td>
            <td style="text-align: right;"><strong style="font-size: 11pt;">€${agingSummary.total.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Invoice Details -->
    <h2 class="brand-blue" style="margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
      ${t.invoiceDetailsTitle || 'Invoice Details'} (${invoices.length} ${t.outstandingCount || 'Outstanding'})
    </h2>
  `;

  if (invoices.length === 0) {
    html += `
      <div style="padding: 20px; text-align: center; background: #d1fae5; border-radius: 5px;">
        <p style="margin: 0; color: #065f46; font-weight: bold;">${t.noOutstandingInvoices || '✓ No outstanding invoices!'}</p>
        <p style="margin: 5px 0 0 0; color: #065f46; font-size: 9pt;">${t.allPaidOrCancelled || 'All invoices are paid or cancelled.'}</p>
      </div>
    `;
  } else {
    html += `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 12%;">${t.invoiceColumn || 'Invoice #'}</th>
            <th style="width: 28%;">${t.clientColumn || 'Client'}</th>
            <th style="width: 12%; text-align: center;">${t.invoiceDateColumn || 'Invoice Date'}</th>
            <th style="width: 12%; text-align: center;">${t.dueDateColumn || 'Due Date'}</th>
            <th style="width: 12%; text-align: center;">${t.daysOverdueColumn || 'Days Overdue'}</th>
            <th style="width: 12%; text-align: center;">${t.statusColumn || 'Status'}</th>
            <th style="width: 12%; text-align: right;">${t.amountColumn || 'Amount'}</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const invoice of invoices) {
      const overdueClass = invoice.daysOverdue > 60 ? 'color: #DC2626; font-weight: bold;' :
                          invoice.daysOverdue > 30 ? 'color: #D97706;' : '';

      const statusBadge = invoice.paymentStatus === 'SENT' ?
        '<span class="badge-warning" style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 3px; font-size: 8pt;">SENT</span>' :
        invoice.paymentStatus === 'VIEWED' ?
        '<span class="badge-info" style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 3px; font-size: 8pt;">VIEWED</span>' :
        '<span class="badge-info" style="background: #e5e7eb; color: #374151; padding: 3px 8px; border-radius: 3px; font-size: 8pt;">FINALIZED</span>';

      html += `
          <tr>
            <td><strong>${invoice.invoiceNumber}</strong></td>
            <td>
              <strong>${invoice.dentistName}</strong><br>
              <span style="font-size: 8pt; color: #666;">${invoice.clinicName}</span>
            </td>
            <td style="text-align: center;">${formatDate(invoice.invoiceDate)}</td>
            <td style="text-align: center;">${formatDate(invoice.dueDate)}</td>
            <td style="text-align: center; ${overdueClass}">
              ${invoice.daysOverdue > 0 ? `+${invoice.daysOverdue}` : invoice.daysOverdue}
            </td>
            <td style="text-align: center;">${statusBadge}</td>
            <td style="text-align: right;"><strong>€${invoice.totalAmount.toFixed(2)}</strong></td>
          </tr>
      `;
    }

    html += `
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td colspan="6" style="text-align: right; padding-right: 10px;">${t.totalLabel || 'TOTAL:'}</td>
            <td style="text-align: right;">€${agingSummary.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  // Add recommendations
  html += `
    <div class="declaration" style="margin-top: 25px; padding: 15px; background: #fef3c7; border-left: 4px solid #D2804D;">
      <h4 style="margin-top: 0; color: #92400e;">${t.recommendedActionsTitle || 'Recommended Actions'}</h4>
      <ul style="margin: 5px 0; padding-left: 20px; font-size: 9pt; color: #92400e;">
        <li>${t.action1to30 || '<strong>1-30 Days:</strong> Send payment reminder email'}</li>
        <li>${t.action31to60 || '<strong>31-60 Days:</strong> Phone call follow-up required'}</li>
        <li>${t.action61to90 || '<strong>61-90 Days:</strong> Formal collection notice'}</li>
        <li>${t.action90plus || '<strong>90+ Days:</strong> Consider legal action or debt collection agency'}</li>
      </ul>
    </div>
  `;

  return html;
}

/**
 * Format date for display (DD/MM/YYYY)
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { OutstandingInvoice, AgingSummary };
