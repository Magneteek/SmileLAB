/**
 * Dentist Information Sheet PDF Generator
 *
 * Generates a comprehensive information sheet for a specific dentist/clinic
 * including contact details, statistics, and recent activity.
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

interface DentistStats {
  totalOrders: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  averageOrderValue: number;
  lastOrderDate: Date | null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate Dentist Information Sheet PDF
 *
 * Creates a detailed information sheet for a dentist/clinic including
 * contact information, business details, and activity statistics.
 *
 * @param dentistId - Dentist ID
 * @param locale - Locale for translations (default: 'en')
 * @returns PDF buffer
 */
export async function generateDentistInformationSheetPDF(
  dentistId: string,
  locale: string = 'en'
): Promise<Buffer> {
  console.log(`[Dentist Info Sheet] Generating for dentist: ${dentistId} (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.dentistSheet || {};
  console.log(`[Dentist Info Sheet] Translations loaded for locale: ${locale}`);

  // Fetch lab configuration
  const labConfig = await getLabConfigurationOrThrow();

  // Fetch dentist information
  const dentist = await prisma.dentist.findUnique({
    where: { id: dentistId },
    include: {
      orders: {
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!dentist) {
    throw new Error(`Dentist with ID ${dentistId} not found`);
  }

  // Fetch statistics
  const stats = await fetchDentistStats(dentistId);

    // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

// Generate header
  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: `DENTIST-INFO-${dentist.licenseNumber || 'N/A'}`,
    documentTitle: 'Client Information Sheet',
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
  const contentHTML = generateInfoSheetHTML(dentist, stats, labConfig, t, locale);

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

  console.log(`[Dentist Info Sheet] Generated successfully: ${result.buffer.length} bytes`);
  return result.buffer;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch dentist statistics
 */
async function fetchDentistStats(dentistId: string): Promise<DentistStats> {
  // Count total orders
  const totalOrders = await prisma.order.count({
    where: { dentistId },
  });

  // Get invoice statistics
  const invoices = await prisma.invoice.findMany({
    where: {
      dentistId,
      isDraft: false,
    },
    select: {
      totalAmount: true,
      paymentStatus: true,
    },
  });

  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + inv.totalAmount.toNumber(),
    0
  );

  const totalPaid = invoices
    .filter((inv) => inv.paymentStatus === 'PAID')
    .reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);

  const totalOutstanding = invoices
    .filter((inv) => ['FINALIZED', 'SENT', 'VIEWED'].includes(inv.paymentStatus))
    .reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);

  const averageOrderValue = invoices.length > 0 ? totalInvoiced / invoices.length : 0;

  // Get last order date
  const lastOrder = await prisma.order.findFirst({
    where: { dentistId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return {
    totalOrders,
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    averageOrderValue,
    lastOrderDate: lastOrder?.createdAt || null,
  };
}

/**
 * Generate information sheet HTML content
 */
function generateInfoSheetHTML(dentist: any, stats: DentistStats, labConfig: any, t: any, locale: string): string {
  const reportDate = new Date().toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const statusBadge = dentist.active
    ? '<span class="badge-success" style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 4px; font-size: 9pt; font-weight: bold;">ACTIVE</span>'
    : '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 4px; font-size: 9pt; font-weight: bold;">INACTIVE</span>';

  let html = `
    <div style="margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h1 style="margin: 0;">${dentist.clinicName}</h1>
        <div>${statusBadge}</div>
      </div>
      <p style="color: #666; font-size: 10pt; margin: 5px 0;">
        ${t.reportGenerated || 'Report Generated:'} ${reportDate}
      </p>
    </div>

    <!-- Contact Information -->
    <div class="grid-50-50" style="margin-bottom: 25px;">
      <div>
        <h2 class="brand-blue" style="margin-top: 0; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
          ${t.contactInformationTitle || 'Contact Information'}
        </h2>
        <table class="info-table">
          <tbody>
            <tr>
              <td style="width: 40%;"><strong>${t.dentistNameLabel || 'Dentist Name'}</strong></td>
              <td>${dentist.dentistName}</td>
            </tr>
            <tr>
              <td><strong>${t.clinicNameLabel || 'Clinic Name'}</strong></td>
              <td>${dentist.clinicName}</td>
            </tr>
            <tr>
              <td><strong>${t.licenseNumberLabel || 'License Number'}</strong></td>
              <td>${dentist.licenseNumber || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>${t.emailLabel || 'Email'}</strong></td>
              <td>${dentist.email}</td>
            </tr>
            <tr>
              <td><strong>${t.phoneLabel || 'Phone'}</strong></td>
              <td>${dentist.phone}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 class="brand-blue" style="margin-top: 0; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
          ${t.addressTitle || 'Address'}
        </h2>
        <table class="info-table">
          <tbody>
            <tr>
              <td style="width: 40%;"><strong>${t.streetLabel || 'Street'}</strong></td>
              <td>${dentist.address || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>${t.cityLabel || 'City'}</strong></td>
              <td>${dentist.city || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>${t.postalCodeLabel || 'Postal Code'}</strong></td>
              <td>${dentist.postalCode || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>${t.countryLabel || 'Country'}</strong></td>
              <td>${dentist.country || 'Slovenia'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Business Information -->
    <h2 class="brand-blue" style="margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
      ${t.businessInformationTitle || 'Business Information'}
    </h2>
    <table class="info-table" style="margin-bottom: 25px;">
      <tbody>
        <tr>
          <td style="width: 30%;"><strong>${t.taxNumberLabel || 'Tax Number (VAT ID)'}</strong></td>
          <td>${dentist.taxNumber || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>${t.businessRegistrationLabel || 'Business Registration'}</strong></td>
          <td>${dentist.businessRegistration || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>${t.paymentTermsLabel || 'Payment Terms'}</strong></td>
          <td>${dentist.paymentTerms || 30} ${t.daysLabel || 'days'}</td>
        </tr>
        <tr>
          <td><strong>${t.requiresInvoicingLabel || 'Requires Invoicing'}</strong></td>
          <td>${dentist.requiresInvoicing ? (t.yesLabel || 'Yes') : (t.noLabel || 'No')}</td>
        </tr>
        <tr>
          <td><strong>${t.accountStatusLabel || 'Account Status'}</strong></td>
          <td>${dentist.active ? (t.activeLabel || 'Active') : (t.inactiveLabel || 'Inactive')}</td>
        </tr>
      </tbody>
    </table>

    <!-- Activity Statistics -->
    <h2 class="brand-blue" style="margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
      ${t.activityStatisticsTitle || 'Activity Statistics'}
    </h2>
    <div class="grid-50-50" style="margin-bottom: 25px;">
      <div>
        <table class="info-table">
          <tbody>
            <tr>
              <td style="width: 60%;"><strong>${t.totalOrdersLabel || 'Total Orders'}</strong></td>
              <td style="text-align: right;"><strong>${stats.totalOrders}</strong></td>
            </tr>
            <tr>
              <td><strong>${t.totalInvoicedLabel || 'Total Invoiced'}</strong></td>
              <td style="text-align: right;">€${stats.totalInvoiced.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>${t.totalPaidLabel || 'Total Paid'}</strong></td>
              <td style="text-align: right; color: #065f46;">€${stats.totalPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>${t.outstandingBalanceLabel || 'Outstanding Balance'}</strong></td>
              <td style="text-align: right; ${stats.totalOutstanding > 0 ? 'color: #DC2626; font-weight: bold;' : ''}">
                €${stats.totalOutstanding.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <table class="info-table">
          <tbody>
            <tr>
              <td style="width: 60%;"><strong>${t.averageOrderValueLabel || 'Average Order Value'}</strong></td>
              <td style="text-align: right;">€${stats.averageOrderValue.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>${t.lastOrderDateLabel || 'Last Order Date'}</strong></td>
              <td style="text-align: right;">
                ${stats.lastOrderDate ? formatDate(stats.lastOrderDate) : (t.noOrdersYet || 'No orders yet')}
              </td>
            </tr>
            <tr>
              <td><strong>${t.clientSinceLabel || 'Client Since'}</strong></td>
              <td style="text-align: right;">${formatDate(dentist.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Add notes if available
  if (dentist.notes) {
    html += `
      <h2 class="brand-blue" style="margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
        ${t.notesTitle || 'Notes'}
      </h2>
      <div style="padding: 15px; background: #fef3e7; border-left: 4px solid #D2804D; margin-bottom: 25px;">
        <p style="margin: 0; white-space: pre-wrap;">${dentist.notes}</p>
      </div>
    `;
  }

  // Add footer with confidentiality notice
  html += `
    <div class="compliance-box" style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #007289;">
      <h4 style="margin-top: 0; color: #007289;">${t.confidentialityTitle || 'Confidentiality Notice'}</h4>
      <p style="margin: 5px 0; font-size: 9pt; color: #1e40af;">
        ${t.confidentialityText || `This document contains confidential client information and is intended solely for internal use by ${labConfig.laboratoryName}. Distribution or disclosure to unauthorized parties is strictly prohibited.`}
      </p>
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

export type { DentistStats };
