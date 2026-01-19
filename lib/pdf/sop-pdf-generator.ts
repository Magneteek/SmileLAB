/**
 * SOP PDF Generator
 *
 * Generates professional PDF documents for SOPs
 * EU MDR compliant document formatting
 *
 * NOW USES UNIFIED PDF INFRASTRUCTURE:
 * - Shared CSS from pdf-styles.ts
 * - Reusable header from pdf-header.ts
 * - Reusable footer from pdf-footer.ts
 * - Base generator from pdf-generator.ts
 */

import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { generatePDF } from './base/pdf-generator';
import { generatePDFHeader } from './base/pdf-header';
import { generatePDFFooter } from './base/pdf-footer';

interface SOPData {
  code: string;
  title: string;
  category: string;
  versionNumber: string;
  status: string;
  content: string;
  createdAt: string;
  createdBy: {
    name: string;
  };
  approvedAt?: string;
  approvedBy?: {
    name: string;
  };
}

interface LabConfig {
  laboratoryName: string;
  logoPath: string | null;
  city: string;
  country: string;
}

/**
 * Generate SOP PDF document
 *
 * Uses unified PDF infrastructure for consistent styling
 */
export async function generateSOPPDF(sop: SOPData): Promise<Buffer> {
  // Fetch lab configuration
  const labConfig = await fetchLabConfig();

  // Generate header using reusable component
  const headerHTML = generatePDFHeader({
    logoPath: labConfig.logoPath,
    laboratoryName: labConfig.laboratoryName,
    documentCode: sop.code,
    documentVersion: `v${sop.versionNumber}`,
    documentTitle: 'Standard Operating Procedure',
  });

  // Generate footer using reusable component
  const footerHTML = generatePDFFooter({
    laboratoryName: labConfig.laboratoryName,
    city: labConfig.city,
    country: labConfig.country,
    documentCode: `${sop.code} v${sop.versionNumber}`,
    showPageNumbers: true,
    showDate: true,
  });

  // Generate main content HTML (no CSS, no header/footer)
  const htmlContent = generateSOPContentHTML(sop, labConfig);

  // Use unified PDF generator
  const result = await generatePDF({
    htmlContent,
    headerHTML,
    footerHTML,
    format: 'A4',
    printBackground: true,
  });

  return result.buffer;
}

/**
 * Fetch laboratory configuration
 */
async function fetchLabConfig(): Promise<LabConfig> {
  const config = await prisma.labConfiguration.findFirst({
    select: {
      laboratoryName: true,
      logoPath: true,
      city: true,
      country: true,
    },
  });

  return (
    config || {
      laboratoryName: 'Smilelab d.o.o.',
      logoPath: null,
      city: 'Ljubljana',
      country: 'Slovenia',
    }
  );
}

/**
 * Generate HTML content for SOP (content only, no CSS)
 *
 * CSS is now handled by global pdf-styles.ts
 * Header and footer handled by reusable components
 */
function generateSOPContentHTML(sop: SOPData, labConfig: LabConfig): string {
  const categoryLabels: Record<string, string> = {
    PRODUCTION: 'Production',
    EQUIPMENT: 'Equipment',
    MATERIAL: 'Material',
    QUALITY: 'Quality',
    DOCUMENTATION: 'Documentation',
    PERSONNEL: 'Personnel',
    RISK_MANAGEMENT: 'Risk Management',
    OTHER: 'Other',
  };

  return `
  <!-- Document Header -->
  <div class="document-header">
    <h1>${sop.code}</h1>
    <div class="subtitle">${sop.title}</div>
  </div>

  <!-- Metadata -->
  <table class="metadata-table">
    <tr>
      <td class="label">Version:</td>
      <td class="value">${sop.versionNumber}</td>
      <td class="label">Category:</td>
      <td class="value">${categoryLabels[sop.category] || sop.category}</td>
    </tr>
    <tr>
      <td class="label">Status:</td>
      <td class="value">${sop.status}</td>
      <td class="label">Created:</td>
      <td class="value">${format(new Date(sop.createdAt), 'MMM dd, yyyy')}</td>
    </tr>
    <tr>
      <td class="label">Created By:</td>
      <td class="value">${sop.createdBy.name}</td>
      ${
        sop.approvedBy && sop.approvedAt
          ? `
      <td class="label">Approved By:</td>
      <td class="value">${sop.approvedBy.name} on ${format(new Date(sop.approvedAt), 'MMM dd, yyyy')}</td>
      `
          : '<td></td><td></td>'
      }
    </tr>
  </table>

  <!-- SOP Content -->
  <div class="content">
    ${sop.content}
  </div>

  <!-- Approval Section -->
  ${
    sop.status === 'APPROVED' && sop.approvedBy && sop.approvedAt
      ? `
  <div class="approval-section">
    <table>
      <tr>
        <td class="label">Approved By:</td>
        <td>${sop.approvedBy.name}</td>
      </tr>
      <tr>
        <td class="label">Approval Date:</td>
        <td>${format(new Date(sop.approvedAt), 'MMMM dd, yyyy')}</td>
      </tr>
      <tr>
        <td class="label">Document ID:</td>
        <td>${sop.code} v${sop.versionNumber}</td>
      </tr>
    </table>
  </div>
  `
      : ''
  }
  `;
}


/**
 * Generate SOP file name
 */
export function generateSOPFileName(sop: { code: string; versionNumber: string }): string {
  return `${sop.code}_v${sop.versionNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
}
