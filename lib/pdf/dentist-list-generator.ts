/**
 * Dentist List PDF Generator
 *
 * Generates a comprehensive list of all dentists/clinics with contact information
 * and activity summary for reference and marketing purposes.
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import { generatePDF, generatePDFHeader, generatePDFFooter } from './base';
import { imageToBase64 } from './utils/image-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function generateDentistListPDF(
  activeOnly: boolean = true,
  locale: string = 'en'
): Promise<Buffer> {
  console.log(`[Dentist List PDF] Starting generation... (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.dentistList || {};

  const labConfig = await getLabConfigurationOrThrow();

  const dentists = await prisma.dentist.findMany({
    where: {
      deletedAt: null,
      ...(activeOnly && { active: true }),
    },
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      clinicName: 'asc',
    },
  });

  console.log(`[Dentist List PDF] Found ${dentists.length} dentists`);

  // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: `DENTIST-LIST-${new Date().toISOString().split('T')[0]}`,
    documentTitle: t.title || 'Client Directory',
  });

  const footerHTML = generatePDFFooter({
    laboratoryName: labConfig.laboratoryName,
    city: labConfig.city,
    country: labConfig.country || 'Slovenia',
    showPageNumbers: true,
    showDate: true,
  });

  const reportDate = new Date().toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  let contentHTML = `
    <h1>${t.title || 'Client Directory'}</h1>
    <p class="text-center" style="color: #666; font-size: 10pt; margin-bottom: 20px;">
      ${t.totalClients || 'Total Clients:'} ${dentists.length} | ${t.reportDate || 'Report Date:'} ${reportDate}
    </p>

    <table class="data-table" style="font-size: 8pt;">
      <thead>
        <tr>
          <th style="width: 20%;">${t.clinicNameColumn || 'Clinic Name'}</th>
          <th style="width: 18%;">${t.dentistNameColumn || 'Dentist Name'}</th>
          <th style="width: 12%;">${t.licenseColumn || 'License #'}</th>
          <th style="width: 18%;">${t.emailColumn || 'Email'}</th>
          <th style="width: 12%;">${t.phoneColumn || 'Phone'}</th>
          <th style="width: 12%;">${t.cityColumn || 'City'}</th>
          <th style="width: 8%; text-align: center;">${t.ordersColumn || 'Orders'}</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const dentist of dentists) {
    const statusBadge = dentist.active
      ? `<span class="badge-success" style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${t.active || 'ACTIVE'}</span>`
      : `<span style="background: #e5e7eb; color: #6b7280; padding: 2px 6px; border-radius: 3px; font-size: 7pt;">${t.inactive || 'INACTIVE'}</span>`;

    contentHTML += `
        <tr>
          <td><strong>${dentist.clinicName}</strong> ${statusBadge}</td>
          <td>${dentist.dentistName}</td>
          <td style="font-size: 7pt;">${dentist.licenseNumber || 'N/A'}</td>
          <td style="font-size: 7pt;">${dentist.email}</td>
          <td style="font-size: 7pt;">${dentist.phone}</td>
          <td>${dentist.city || 'N/A'}</td>
          <td style="text-align: center;"><strong>${dentist._count.orders}</strong></td>
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

  console.log(`[Dentist List PDF] Generated: ${result.buffer.length} bytes`);
  return result.buffer;
}
