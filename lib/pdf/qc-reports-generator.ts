/**
 * QC Reports PDF Generator
 *
 * Generates quality control reports with inspection details and compliance status
 * for regulatory documentation and internal quality management.
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import { generatePDF, generatePDFHeader, generatePDFFooter } from './base';
import { imageToBase64 } from './utils/image-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function generateQCReportsPDF(
  dateFrom?: Date,
  dateTo?: Date,
  locale: string = 'en'
): Promise<Buffer> {
  console.log(`[QC Reports PDF] Starting generation... (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.qcReports || {};

  const labConfig = await getLabConfigurationOrThrow();

  const where: any = {};
  if (dateFrom || dateTo) {
    where.inspectionDate = {};
    if (dateFrom) where.inspectionDate.gte = dateFrom;
    if (dateTo) where.inspectionDate.lte = dateTo;
  }

  const qcRecords = await prisma.qualityControl.findMany({
    where,
    include: {
      worksheet: {
        include: {
          dentist: true,
        },
      },
      inspector: true,
    },
    orderBy: {
      inspectionDate: 'desc',
    },
  });

  console.log(`[QC Reports PDF] Found ${qcRecords.length} QC records`);

  // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: `QC-REPORT-${new Date().toISOString().split('T')[0]}`,
    documentTitle: t.title || 'Quality Control Report',
  });

  const footerHTML = generatePDFFooter({
    laboratoryName: labConfig.laboratoryName,
    city: labConfig.city,
    country: labConfig.country || 'Slovenia',
    showPageNumbers: true,
    showDate: true,
  });

  const approvedCount = qcRecords.filter(r => r.result === 'APPROVED').length;
  const rejectedCount = qcRecords.filter(r => r.result === 'REJECTED').length;

  let contentHTML = `
    <h1>${t.title || 'Quality Control Report'}</h1>
    <p class="text-center" style="color: #666; font-size: 10pt; margin-bottom: 20px;">
      ${t.totalInspections || 'Total Inspections:'} ${qcRecords.length} | ${t.approved || 'Approved:'} ${approvedCount} | ${t.rejected || 'Rejected:'} ${rejectedCount}
    </p>

    <div class="compliance-box" style="margin-bottom: 20px; padding: 15px; background: #e0f2f7;">
      <h3 style="margin-top: 0; color: #007289;">${t.summaryTitle || 'QC Summary'}</h3>
      <table class="info-table" style="background: white;">
        <tbody>
          <tr>
            <td style="width: 50%;"><strong>${t.totalInspectionsLabel || 'Total Inspections'}</strong></td>
            <td style="text-align: right;">${qcRecords.length}</td>
          </tr>
          <tr>
            <td><strong>${t.approvedLabel || 'Approved (PASS)'}</strong></td>
            <td style="text-align: right; color: #065f46;"><strong>${approvedCount}</strong></td>
          </tr>
          <tr>
            <td><strong>${t.rejectedLabel || 'Rejected (FAIL)'}</strong></td>
            <td style="text-align: right; color: #DC2626;"><strong>${rejectedCount}</strong></td>
          </tr>
          <tr>
            <td><strong>${t.passRateLabel || 'Pass Rate'}</strong></td>
            <td style="text-align: right;">
              ${qcRecords.length > 0 ? ((approvedCount / qcRecords.length) * 100).toFixed(1) : 0}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <table class="data-table" style="font-size: 8pt;">
      <thead>
        <tr>
          <th style="width: 12%;">${t.worksheetColumn || 'Worksheet'}</th>
          <th style="width: 15%;">${t.clientColumn || 'Client'}</th>
          <th style="width: 12%;">${t.inspectionDateColumn || 'Inspection Date'}</th>
          <th style="width: 15%;">${t.inspectorColumn || 'Inspector'}</th>
          <th style="width: 10%; text-align: center;">${t.resultColumn || 'Result'}</th>
          <th style="width: 36%;">${t.notesColumn || 'Notes'}</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const qc of qcRecords) {
    const resultBadge = qc.result === 'APPROVED'
      ? `<span class="badge-success" style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${t.approved || 'APPROVED'}</span>`
      : qc.result === 'REJECTED'
      ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; font-size: 7pt; font-weight: bold;">${t.rejected || 'REJECTED'}</span>`
      : `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${qc.result}</span>`;

    contentHTML += `
        <tr>
          <td><strong>${qc.worksheet.worksheetNumber}</strong></td>
          <td style="font-size: 7pt;">${qc.worksheet.dentist.clinicName}</td>
          <td>${qc.inspectionDate ? new Date(qc.inspectionDate).toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB') : 'N/A'}</td>
          <td style="font-size: 7pt;">${qc.inspector?.name || 'N/A'}</td>
          <td style="text-align: center;">${resultBadge}</td>
          <td style="font-size: 7pt;">${qc.notes || '-'}</td>
        </tr>
    `;
  }

  contentHTML += `
      </tbody>
    </table>
  `;

  const result = await generatePDF({
    htmlContent: contentHTML,
    headerHTML,
    footerHTML,
    format: 'A4',
    margins: { top: '20mm', right: '12mm', bottom: '20mm', left: '12mm' },
  });

  console.log(`[QC Reports PDF] Generated: ${result.buffer.length} bytes`);
  return result.buffer;
}
