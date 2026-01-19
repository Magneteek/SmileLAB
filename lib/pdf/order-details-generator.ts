/**
 * Order Details PDF Generator
 *
 * Generates a detailed summary of a specific order with worksheet information
 * and timeline tracking.
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import { generatePDF, generatePDFHeader, generatePDFFooter } from './base';
import { imageToBase64 } from './utils/image-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function generateOrderDetailsPDF(
  orderId: string,
  locale: string = 'en'
): Promise<Buffer> {
  console.log(`[Order Details PDF] Generating for order: ${orderId} (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.orderDetails || {};

  const labConfig = await getLabConfigurationOrThrow();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      dentist: true,
      worksheets: {
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: order.orderNumber,
    documentTitle: t.title || 'Order Details',
  });

  const footerHTML = generatePDFFooter({
    laboratoryName: labConfig.laboratoryName,
    city: labConfig.city,
    country: labConfig.country || 'Slovenia',
    showPageNumbers: true,
    showDate: true,
  });

  let contentHTML = `
    <h1>${t.orderTitle || 'Order'} ${order.orderNumber}</h1>

    <div class="grid-50-50" style="margin-bottom: 20px;">
      <table class="info-table">
        <tbody>
          <tr><td><strong>${t.orderDateLabel || 'Order Date'}</strong></td><td>${new Date(order.createdAt).toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB')}</td></tr>
          <tr><td><strong>${t.dueDateLabel || 'Due Date'}</strong></td><td>${new Date(order.dueDate).toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB')}</td></tr>
          <tr><td><strong>${t.statusLabel || 'Status'}</strong></td><td>${order.status}</td></tr>
        </tbody>
      </table>
      <table class="info-table">
        <tbody>
          <tr><td><strong>${t.clientLabel || 'Client'}</strong></td><td>${order.dentist.dentistName}</td></tr>
          <tr><td><strong>${t.clinicLabel || 'Clinic'}</strong></td><td>${order.dentist.clinicName}</td></tr>
          <tr><td><strong>${t.emailLabel || 'Email'}</strong></td><td>${order.dentist.email}</td></tr>
        </tbody>
      </table>
    </div>

    <h2 class="brand-blue">${t.worksheetsTitle || 'Worksheets'} (${order.worksheets.length})</h2>
  `;

  for (const worksheet of order.worksheets) {
    const statusBadge = `<span style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 3px; font-size: 8pt;">${worksheet.status}</span>`;

    contentHTML += `
      <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #007289; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong style="font-size: 11pt;">${worksheet.worksheetNumber} (${t.revisionLabel || 'Rev.'} ${worksheet.revision})</strong>
          ${statusBadge}
        </div>
        <p style="margin: 5px 0; font-size: 9pt;"><strong>${t.patientLabel || 'Patient'}:</strong> ${worksheet.patientName || 'N/A'}</p>
        <p style="margin: 5px 0; font-size: 9pt;"><strong>${t.productsLabel || 'Products'}:</strong></p>
        <ul style="margin: 5px 0 5px 20px; font-size: 8pt;">
          ${worksheet.products.map(p => `<li>${p.product.code} - ${p.product.name} (${p.quantity} ${p.product.unit})</li>`).join('')}
        </ul>
      </div>
    `;
  }

  const result = await generatePDF({
    htmlContent: contentHTML,
    headerHTML,
    footerHTML,
    format: 'A4',
    margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });

  console.log(`[Order Details PDF] Generated: ${result.buffer.length} bytes`);
  return result.buffer;
}
