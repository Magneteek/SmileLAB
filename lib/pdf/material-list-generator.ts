/**
 * Material List PDF Generator
 *
 * Generates a comprehensive material inventory report with LOT numbers,
 * expiry dates, and stock levels for traceability and inventory management.
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

interface MaterialLotInfo {
  materialId: string;
  materialName: string;
  manufacturer: string | null;
  catalogNumber: string | null;
  lotNumber: string;
  arrivalDate: Date;
  expiryDate: Date | null;
  quantity: number;
  unit: string;
  status: string;
  location: string | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean; // Within 90 days
  isExpired: boolean;
}

interface InventorySummary {
  totalMaterials: number;
  totalLots: number;
  activeLots: number;
  expiringSoonCount: number; // Within 90 days
  expiredCount: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate Material List PDF
 *
 * Creates a detailed inventory report with LOT tracking and expiry information
 * for regulatory compliance and stock management.
 *
 * @param options - Generation options
 * @param options.activeOnly - Only include available LOTs (default: true)
 * @param options.showExpired - Include expired LOTs (default: false)
 * @returns PDF buffer
 */
export async function generateMaterialListPDF(options: {
  activeOnly?: boolean;
  showExpired?: boolean;
  locale?: string;
} = {}): Promise<Buffer> {
  const { activeOnly = true, showExpired = false, locale = 'en' } = options;

  console.log(`[Material List PDF] Starting generation... (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.materialList || {};

  // Fetch lab configuration
  const labConfig = await getLabConfigurationOrThrow();

  // Fetch material lots
  const materialLots = await fetchMaterialLots(activeOnly, showExpired);
  console.log(`[Material List PDF] Found ${materialLots.length} material LOTs`);

  if (materialLots.length === 0) {
    throw new Error('No materials found for inventory report generation');
  }

  // Calculate summary
  const summary = calculateInventorySummary(materialLots);

  // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

  // Generate header
  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: `INVENTORY-${new Date().toISOString().split('T')[0]}`,
    documentTitle: t.title || 'Material Inventory Report',
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
  const contentHTML = generateInventoryHTML(materialLots, summary, labConfig, t, locale);

  // Generate PDF
  const result = await generatePDF({
    htmlContent: contentHTML,
    headerHTML,
    footerHTML,
    format: 'A4',
    margins: {
      top: '20mm',
      right: '12mm',
      bottom: '20mm',
      left: '12mm',
    },
  });

  console.log(`[Material List PDF] Generated successfully: ${result.buffer.length} bytes`);
  return result.buffer;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch material lots from database
 */
async function fetchMaterialLots(
  activeOnly: boolean,
  showExpired: boolean
): Promise<MaterialLotInfo[]> {
  const where: any = {};

  if (activeOnly) {
    where.status = 'AVAILABLE';
  }

  if (!showExpired) {
    where.expiryDate = {
      gte: new Date(), // Only future expiry dates
    };
  }

  const lots = await prisma.materialLot.findMany({
    where,
    include: {
      material: {
        select: {
          name: true,
          manufacturer: true,
          catalogNumber: true,
          unit: true,
        },
      },
    },
    orderBy: [
      { expiryDate: 'asc' }, // Closest expiry first
      { lotNumber: 'asc' },
    ],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return lots.map((lot) => {
    let daysUntilExpiry: number | null = null;
    let isExpiringSoon = false;
    let isExpired = false;

    if (lot.expiryDate) {
      const expiry = new Date(lot.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      isExpired = daysUntilExpiry < 0;
      isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
    }

    return {
      materialId: lot.materialId,
      materialName: lot.material.name,
      manufacturer: lot.material.manufacturer,
      catalogNumber: lot.material.catalogNumber,
      lotNumber: lot.lotNumber,
      arrivalDate: lot.arrivalDate,
      expiryDate: lot.expiryDate,
      quantity: lot.quantity,
      unit: lot.material.unit,
      status: lot.status,
      location: lot.location,
      daysUntilExpiry,
      isExpiringSoon,
      isExpired,
    };
  });
}

/**
 * Calculate inventory summary
 */
function calculateInventorySummary(lots: MaterialLotInfo[]): InventorySummary {
  const uniqueMaterials = new Set(lots.map((lot) => lot.materialId));

  return {
    totalMaterials: uniqueMaterials.size,
    totalLots: lots.length,
    activeLots: lots.filter((lot) => lot.status === 'AVAILABLE').length,
    expiringSoonCount: lots.filter((lot) => lot.isExpiringSoon).length,
    expiredCount: lots.filter((lot) => lot.isExpired).length,
  };
}

/**
 * Generate inventory HTML content
 */
function generateInventoryHTML(
  lots: MaterialLotInfo[],
  summary: InventorySummary,
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
      <h1>${t.title || 'Material Inventory Report'}</h1>
      <p class="text-center" style="color: #666; font-size: 10pt;">
        ${t.reportDate || 'Report Date:'} ${reportDate} | ${t.totalLots || 'Total LOTs:'} ${summary.totalLots}
      </p>
    </div>

    <!-- Inventory Summary -->
    <div class="compliance-box" style="margin-bottom: 25px; padding: 15px; background: #e0f2f7; border-left: 4px solid #007289;">
      <h3 style="margin-top: 0; color: #007289;">${t.summaryTitle || 'Inventory Summary'}</h3>
      <div class="grid-50-50">
        <table class="info-table" style="background: white;">
          <tbody>
            <tr>
              <td style="width: 60%;"><strong>${t.totalMaterialsLabel || 'Total Materials'}</strong></td>
              <td style="text-align: right;">${summary.totalMaterials}</td>
            </tr>
            <tr>
              <td><strong>${t.totalLotsLabel || 'Total LOT Numbers'}</strong></td>
              <td style="text-align: right;">${summary.totalLots}</td>
            </tr>
            <tr>
              <td><strong>${t.activeLotsLabel || 'Active LOTs'}</strong></td>
              <td style="text-align: right; color: #065f46;">${summary.activeLots}</td>
            </tr>
          </tbody>
        </table>
        <table class="info-table" style="background: white;">
          <tbody>
            <tr>
              <td style="width: 60%;"><strong>${t.expiringSoonLabel || 'Expiring Soon (≤90 days)'}</strong></td>
              <td style="text-align: right; ${summary.expiringSoonCount > 0 ? 'color: #D97706; font-weight: bold;' : ''}">
                ${summary.expiringSoonCount}
              </td>
            </tr>
            <tr>
              <td><strong>${t.expiredLotsLabel || 'Expired LOTs'}</strong></td>
              <td style="text-align: right; ${summary.expiredCount > 0 ? 'color: #DC2626; font-weight: bold;' : ''}">
                ${summary.expiredCount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Alert for expiring materials
  if (summary.expiringSoonCount > 0 || summary.expiredCount > 0) {
    html += `
      <div class="declaration" style="margin-bottom: 20px; padding: 12px; background: #fef3c7; border-left: 4px solid #D2804D;">
        <p style="margin: 0; color: #92400e; font-weight: bold;">
          ⚠ ${t.attentionRequired || 'Attention Required:'}
          ${summary.expiredCount > 0 ? `${summary.expiredCount} ${t.lotsExpired || 'LOT(s) expired'}, ` : ''}
          ${summary.expiringSoonCount > 0 ? `${summary.expiringSoonCount} ${t.lotsExpiringSoon || 'LOT(s) expiring within 90 days'}` : ''}
        </p>
      </div>
    `;
  }

  // Material Details Table
  html += `
    <h2 class="brand-blue" style="margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #007289; padding-bottom: 5px;">
      ${t.detailsTitle || 'Material Details'} (${lots.length} ${t.lots || 'LOTs'})
    </h2>

    <table class="data-table" style="font-size: 8pt;">
      <thead>
        <tr>
          <th style="width: 18%;">${t.materialNameColumn || 'Material Name'}</th>
          <th style="width: 12%;">${t.manufacturerColumn || 'Manufacturer'}</th>
          <th style="width: 10%;">${t.catalogColumn || 'Catalog #'}</th>
          <th style="width: 12%;">${t.lotNumberColumn || 'LOT Number'}</th>
          <th style="width: 9%; text-align: center;">${t.arrivalColumn || 'Arrival'}</th>
          <th style="width: 9%; text-align: center;">${t.expiryColumn || 'Expiry'}</th>
          <th style="width: 8%; text-align: right;">${t.qtyColumn || 'Qty'}</th>
          <th style="width: 10%; text-align: center;">${t.statusColumn || 'Status'}</th>
          <th style="width: 12%;">${t.locationColumn || 'Location'}</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const lot of lots) {
    const expiryStyle = lot.isExpired
      ? 'color: #DC2626; font-weight: bold;'
      : lot.isExpiringSoon
      ? 'color: #D97706;'
      : '';

    const statusBadge =
      lot.status === 'AVAILABLE'
        ? `<span class="badge-success" style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${t.available || 'AVAILABLE'}</span>`
        : lot.status === 'DEPLETED'
        ? `<span style="background: #e5e7eb; color: #6b7280; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${t.depleted || 'DEPLETED'}</span>`
        : `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${lot.status}</span>`;

    html += `
        <tr>
          <td><strong>${lot.materialName}</strong></td>
          <td>${lot.manufacturer || 'N/A'}</td>
          <td>${lot.catalogNumber || 'N/A'}</td>
          <td style="font-family: monospace;"><strong>${lot.lotNumber}</strong></td>
          <td style="text-align: center;">${formatDate(lot.arrivalDate)}</td>
          <td style="text-align: center; ${expiryStyle}">
            ${lot.expiryDate ? formatDate(lot.expiryDate) : 'N/A'}
            ${lot.daysUntilExpiry !== null && lot.daysUntilExpiry >= 0 ? `<br><span style="font-size: 7pt;">(${lot.daysUntilExpiry}d)</span>` : ''}
          </td>
          <td style="text-align: right;">${lot.quantity} ${lot.unit}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="font-size: 7pt;">${lot.location || 'N/A'}</td>
        </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  // Add compliance notice
  html += `
    <div class="retention-notice" style="margin-top: 25px; padding: 15px; background: #fee2e2; border-left: 4px solid #DC2626;">
      <h4 style="margin-top: 0; color: #991b1b;">${t.complianceTitle || 'EU MDR Traceability Requirement'}</h4>
      <p style="margin: 5px 0; font-size: 9pt; color: #991b1b;">
        ${t.complianceText || 'All materials used in custom-made medical devices must maintain full traceability per EU MDR 2017/745 Annex XIII. This inventory report must be retained for 10 years from the date of last use in a device.'}
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

export type { MaterialLotInfo, InventorySummary };
