/**
 * Email Service
 *
 * Handles email sending via Gmail OAuth 2.0 for invoice delivery,
 * order confirmations, and notifications. All sent emails are logged
 * to the EmailLog table for tracking and compliance.
 *
 * Configuration:
 * - GOOGLE_CLIENT_ID: OAuth 2.0 client ID from Google Cloud Console
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 client secret
 * - GOOGLE_REFRESH_TOKEN: Refresh token from OAuth Playground
 * - SMTP_FROM_EMAIL: Sender email address (info@dentro.si)
 * - SMTP_FROM_NAME: Sender display name
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

/**
 * Email attachment interface
 */
interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * Email sending options
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  cc?: string;
  bcc?: string;
}

/**
 * Email service result
 */
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Create Gmail OAuth 2.0 transporter
 *
 * Uses Google Workspace OAuth credentials for secure email sending.
 * Tokens are refreshed automatically by nodemailer.
 */
function createTransporter(): Transporter {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const fromEmail = process.env.SMTP_FROM_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
    throw new Error(
      'Missing required Gmail OAuth environment variables. Please check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and SMTP_FROM_EMAIL in .env file.'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: fromEmail,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
    },
  });
}

/**
 * Send email with OAuth 2.0 authentication
 *
 * Sends email via Gmail and logs the result to EmailLog table.
 * Automatically attaches PDF invoices or other documents.
 *
 * @param options - Email sending options
 * @param relatedId - Optional related entity ID (e.g., invoice ID)
 * @param relatedType - Optional related entity type (e.g., 'INVOICE')
 * @returns Email sending result with success status and message ID
 *
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   to: 'dentist@clinic.com',
 *   subject: 'Invoice DN-INV-25001',
 *   html: emailHtml,
 *   attachments: [{ filename: 'invoice.pdf', content: pdfBuffer }]
 * }, invoiceId, 'INVOICE');
 * ```
 */
export async function sendEmail(
  options: SendEmailOptions,
  relatedId?: string,
  relatedType?: string,
  sentById?: string,
  fromName?: string
): Promise<EmailResult> {
  console.log('[Email Service] Creating transporter...');

  try {
    const transporter = createTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL!;
    const senderName = fromName || process.env.SMTP_FROM_NAME || 'Dental Laboratory';

    console.log('[Email Service] Transporter created successfully');
    console.log('[Email Service] From:', `${senderName} <${fromEmail}>`);
    console.log('[Email Service] To:', options.to);
    console.log('[Email Service] Subject:', options.subject);

    // Send email
    console.log('[Email Service] Sending email via Gmail OAuth...');
    const info = await transporter.sendMail({
      from: `"${senderName}" <${fromEmail}>`,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
      attachments: options.attachments,
    });

    // Log successful email to database (only if sentById provided)
    if (sentById) {
      await prisma.emailLog.create({
        data: {
          recipient: options.to,
          subject: options.subject,
          body: options.html,
          status: 'SENT',
          sentAt: new Date(),
          sentById,
          ...(relatedId && { invoiceId: relatedId }),
        },
      });
    }

    console.log('Email sent successfully:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Failed to send email:', error);

    // Log failed email to database (only if sentById provided)
    if (sentById) {
      try {
        await prisma.emailLog.create({
          data: {
            recipient: options.to,
            subject: options.subject,
            body: options.html,
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: error.message || 'Unknown error',
            sentById,
            ...(relatedId && { invoiceId: relatedId }),
          },
        });
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Options for unified email sending (invoice + MDR documents)
 */
export interface SendUnifiedEmailOptions {
  recipientEmail: string;
  dentistId?: string;
  invoiceId?: string;
  documentIds?: string[];
  customNote?: string;
  sentById: string;
}

/**
 * Send a unified email with optional invoice and/or MDR documents attached.
 *
 * Handles all combinations:
 * - Invoice only
 * - MDR document(s) only
 * - Invoice + MDR documents together
 *
 * Creates a single EmailLog entry with EmailLogDocument join records.
 */
export async function sendUnifiedEmail(options: SendUnifiedEmailOptions): Promise<EmailResult> {
  const { recipientEmail, dentistId, invoiceId, documentIds = [], customNote, sentById } = options;

  console.log('[Email Service] sendUnifiedEmail:', { recipientEmail, invoiceId, documentIds });

  const labConfig = await prisma.labConfiguration.findFirst({ include: { bankAccounts: true } });
  if (!labConfig) {
    return { success: false, error: 'Laboratory configuration not found' };
  }

  const attachments: EmailAttachment[] = [];
  let invoice: any = null;
  const documents: any[] = [];

  // --- Fetch invoice ---
  if (invoiceId) {
    invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { dentist: true, lineItems: true },
    });
    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (!invoice.pdfPath) return { success: false, error: 'Invoice PDF not generated yet' };
    try {
      const buf = await fs.readFile(invoice.pdfPath);
      attachments.push({ filename: `${invoice.invoiceNumber}.pdf`, content: buf, contentType: 'application/pdf' });
    } catch (e: any) {
      return { success: false, error: `Cannot read invoice PDF: ${e.message}` };
    }
  }

  // --- Fetch MDR documents ---
  for (const docId of documentIds) {
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc) continue;
    try {
      const buf = await fs.readFile(doc.filePath);
      attachments.push({ filename: `${doc.documentNumber}.pdf`, content: buf, contentType: 'application/pdf' });
      documents.push(doc);
    } catch (e: any) {
      console.error(`Cannot read doc ${doc.documentNumber}:`, e.message);
    }
  }

  if (attachments.length === 0) {
    return { success: false, error: 'No attachments could be loaded' };
  }

  const subject = buildSubject(invoice, documents);
  const html = generateUnifiedEmailHtml(invoice, documents, labConfig, customNote);

  // --- Send ---
  const transporter = createTransporter();
  const fromEmail = process.env.SMTP_FROM_EMAIL!;
  const senderName = labConfig.laboratoryName || process.env.SMTP_FROM_NAME || 'Dental Laboratory';
  let status: 'SENT' | 'FAILED' = 'SENT';
  let errorMessage: string | undefined;
  let messageId: string | undefined;

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html,
      attachments,
    });
    messageId = info.messageId;
    console.log('[Email Service] Sent:', messageId);
  } catch (e: any) {
    status = 'FAILED';
    errorMessage = e.message;
    console.error('[Email Service] Failed:', e.message);
  }

  // --- Log to DB ---
  try {
    const logEntry = await prisma.emailLog.create({
      data: {
        recipient: recipientEmail,
        subject,
        body: html,
        customNote: customNote || null,
        status,
        sentAt: status === 'SENT' ? new Date() : null,
        failedAt: status === 'FAILED' ? new Date() : null,
        errorMessage: errorMessage || null,
        sentById,
        invoiceId: invoiceId || null,
        dentistId: dentistId || (invoice?.dentistId) || null,
        attachments: JSON.stringify(attachments.map(a => a.filename)),
      },
    });

    if (documents.length > 0) {
      await prisma.emailLogDocument.createMany({
        data: documents.map(d => ({ emailLogId: logEntry.id, documentId: d.id })),
        skipDuplicates: true,
      });
    }

    // Update invoice status to SENT
    if (invoiceId && invoice && invoice.paymentStatus === 'FINALIZED') {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { paymentStatus: 'SENT' } });
    }
  } catch (logErr: any) {
    console.error('[Email Service] Failed to log email:', logErr.message);
  }

  if (status === 'FAILED') {
    return { success: false, error: errorMessage };
  }
  return { success: true, messageId };
}

function buildSubject(invoice: any | null, documents: any[]): string {
  if (invoice && documents.length > 0) {
    return `Račun ${invoice.invoiceNumber} + MDR dokumenti`;
  }
  if (invoice) {
    return `Račun ${invoice.invoiceNumber} - €${Number(invoice.totalAmount).toFixed(2)}`;
  }
  if (documents.length === 1) {
    return `MDR dokument ${documents[0].documentNumber}`;
  }
  return `MDR dokumenti (${documents.length})`;
}

function generateUnifiedEmailHtml(invoice: any | null, documents: any[], labConfig: any, customNote?: string): string {
  const labName = labConfig.laboratoryName;
  const labEmail = labConfig.email;
  const labPhone = labConfig.phone;
  const labAddress = `${labConfig.street}, ${labConfig.postalCode} ${labConfig.city}, ${labConfig.country}`;
  const primaryBank = labConfig.bankAccounts?.[0];

  const noteHtml = customNote
    ? `<div style="background:#f0f7f9;padding:16px 20px;margin:24px 0;border-radius:6px;border-left:4px solid #007289;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${customNote.replace(/\n/g, '<br>')}</p>
       </div>`
    : '';

  let bodyContent = '';

  if (invoice && documents.length > 0) {
    bodyContent = `<p style="font-size:15px;color:#555;margin-bottom:20px;line-height:1.6;">
      V prilogi najdete <strong style="color:#007289;">račun ${invoice.invoiceNumber}</strong>
      ter naslednje MDR dokumente:</p>
      <ul style="margin:0 0 20px 0;padding-left:20px;color:#555;font-size:14px;line-height:2;">
        ${documents.map(d => `<li><strong>${d.documentNumber}</strong></li>`).join('')}
      </ul>`;
  } else if (invoice) {
    bodyContent = `<p style="font-size:15px;color:#555;margin-bottom:20px;line-height:1.6;">
      V prilogi najdete <strong style="color:#007289;">račun ${invoice.invoiceNumber}</strong> za opravljeno zobotehnično delo.</p>`;
  } else {
    bodyContent = `<p style="font-size:15px;color:#555;margin-bottom:20px;line-height:1.6;">
      V prilogi najdete naslednje MDR dokumente:</p>
      <ul style="margin:0 0 20px 0;padding-left:20px;color:#555;font-size:14px;line-height:2;">
        ${documents.map(d => `<li><strong>${d.documentNumber}</strong></li>`).join('')}
      </ul>`;
  }

  let invoiceBox = '';
  if (invoice) {
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('sl-SI', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : 'Ob prejemu';
    const bankName = primaryBank?.bankName || '';
    const iban = primaryBank?.iban || '';
    invoiceBox = `
      <div style="background:#f0f7f9;padding:25px;margin:24px 0;border-radius:6px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#666;font-size:14px;">Številka računa:</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#007289;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:14px;">Datum računa:</td>
              <td style="padding:8px 0;text-align:right;font-size:14px;">${new Date(invoice.invoiceDate).toLocaleDateString('sl-SI', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:14px;">Rok plačila:</td>
              <td style="padding:8px 0;text-align:right;font-size:14px;">${dueDate}</td></tr>
          <tr style="border-top:2px solid #007289;">
            <td style="padding:14px 0 0;color:#007289;font-weight:700;font-size:16px;">Skupni znesek:</td>
            <td style="padding:14px 0 0;text-align:right;color:#007289;font-weight:700;font-size:22px;">€${Number(invoice.totalAmount).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      ${primaryBank ? `<div style="background:#fff8f0;padding:18px 20px;margin:20px 0;border-radius:6px;border-top:3px solid #D2804D;">
        <h3 style="margin:0 0 10px;color:#D2804D;font-size:15px;">Podatki za plačilo</h3>
        <p style="margin:0;font-size:14px;color:#555;line-height:1.8;"><strong>Banka:</strong> ${bankName}<br><strong>IBAN:</strong> ${iban}<br><strong>Sklic:</strong> ${invoice.invoiceNumber}</p>
      </div>` : ''}`;
  }

  return `<!DOCTYPE html>
<html lang="sl">
<head><meta charset="UTF-8"><title>${buildSubject(invoice, documents)}</title></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
<div style="background:#007289;padding:35px 20px;text-align:center;border-radius:8px 8px 0 0;">
  <h1 style="color:white;margin:0 0 8px;font-size:24px;font-weight:600;">DENTRO</h1>
  <p style="color:rgba(255,255,255,0.95);margin:0;font-size:14px;">Zobozdravstvene storitve in svetovanje, d.o.o.</p>
</div>
<div style="background:white;padding:35px 30px;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <p style="font-size:16px;margin-bottom:16px;">Spoštovani,</p>
  ${bodyContent}
  ${noteHtml}
  ${invoiceBox}
  <p style="font-size:14px;color:#666;margin-top:24px;line-height:1.6;">Če imate kakršnakoli vprašanja, nas prosim kontaktirajte.</p>
  <p style="font-size:14px;color:#333;margin-top:20px;">Lep pozdrav,<br><strong style="color:#007289;">${labName}</strong></p>
</div>
<div style="text-align:center;margin-top:20px;padding:16px;background:white;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
  <p style="font-size:12px;color:#666;margin:4px 0;line-height:1.8;">
    <strong style="color:#007289;">${labName}</strong><br>
    E-pošta: <a href="mailto:${labEmail}" style="color:#007289;text-decoration:none;">${labEmail}</a> | Telefon: ${labPhone}<br>
    Naslov: ${labAddress}
  </p>
  <p style="font-size:11px;color:#999;margin:12px 0 0;">To je avtomatsko sporočilo. Prosimo, ne odgovarjajte neposredno na to sporočilo.</p>
</div>
</body></html>`;
}

/**
 * Send invoice email with PDF attachment
 *
 * Sends professional invoice email with attached PDF.
 * Uses Handlebars template for email body.
 *
 * @param invoiceId - Invoice ID to send
 * @param recipientEmail - Recipient email address
 * @returns Email sending result
 *
 * @example
 * ```typescript
 * const result = await sendInvoiceEmail('invoice-uuid', 'dentist@clinic.com');
 * if (result.success) {
 *   console.log('Invoice sent!');
 * }
 * ```
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  recipientEmail: string
): Promise<EmailResult> {
  console.log('[Email Service] Sending invoice email:', { invoiceId, recipientEmail });

  // Fetch invoice with all relations (simplified - only what we need for email)
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      dentist: true,
      lineItems: true,
    },
  });

  console.log('[Email Service] Invoice found:', invoice ? 'Yes' : 'No');

  if (!invoice) {
    return {
      success: false,
      error: 'Invoice not found',
    };
  }

  // Fetch laboratory configuration for email branding
  const labConfig = await prisma.labConfiguration.findFirst({
    include: {
      bankAccounts: true,
    },
  });

  if (!labConfig) {
    return {
      success: false,
      error: 'Laboratory configuration not found. Please configure your lab settings first.',
    };
  }

  // Logo disabled - using text-only header for email size optimization
  const logoBase64 = null;

  // Get PDF from file system (stored at pdfPath)
  console.log('[Email Service] PDF path available:', invoice.pdfPath ? 'Yes' : 'No');
  console.log('[Email Service] PDF path:', invoice.pdfPath);

  if (!invoice.pdfPath) {
    console.log('[Email Service] ERROR: No PDF path available');
    return {
      success: false,
      error: 'Invoice PDF not generated',
    };
  }

  // Read PDF file from file system
  let pdfBuffer: Buffer;
  try {
    // pdfPath is already an absolute path, use it directly
    const pdfFilePath = invoice.pdfPath;
    console.log('[Email Service] Reading PDF from:', pdfFilePath);
    pdfBuffer = await fs.readFile(pdfFilePath);
    console.log('[Email Service] PDF buffer created:', pdfBuffer.length, 'bytes');
  } catch (error: any) {
    console.log('[Email Service] ERROR reading PDF file:', error.message);
    return {
      success: false,
      error: `Failed to read PDF file: ${error.message}`,
    };
  }

  console.log('[Email Service] Generating email HTML...');
  // Generate email HTML with lab configuration
  const emailHtml = generateInvoiceEmailHtml(invoice, labConfig);

  console.log('[Email Service] Sending email with PDF attachment...');
  // Send email with PDF attachment
  return await sendEmail(
    {
      to: recipientEmail,
      subject: `Račun ${invoice.invoiceNumber} - €${invoice.totalAmount.toFixed(2)}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    },
    invoiceId,
    'INVOICE',
    invoice.createdById, // Pass the user who created the invoice
    labConfig.laboratoryName // Pass the lab name for email "From" field
  );
}

/**
 * Generate invoice email HTML
 *
 * Creates professional email body for invoice delivery.
 * Includes invoice summary and payment instructions.
 *
 * @param invoice - Invoice data with relations
 * @param labConfig - Laboratory configuration with bank accounts
 * @returns HTML email body
 */
function generateInvoiceEmailHtml(invoice: any, labConfig: any): string {
  // Get dentist name from invoice.dentist
  const dentistName = invoice.dentist?.name || 'Spoštovani';
  const invoiceNumber = invoice.invoiceNumber;
  const totalAmount = invoice.totalAmount.toFixed(2);
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('sl-SI', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : 'Ob prejemu';

  // Get lab information
  const labName = labConfig.laboratoryName;
  const labEmail = labConfig.email;
  const labPhone = labConfig.phone;
  const labAddress = `${labConfig.street}, ${labConfig.postalCode} ${labConfig.city}, ${labConfig.country}`;

  // Get primary bank account (first one if multiple exist)
  const primaryBankAccount = labConfig.bankAccounts?.[0];
  const bankName = primaryBankAccount?.bankName || '[Bank Name]';
  const iban = primaryBankAccount?.iban || 'SI56 XXXX XXXX XXXX XXX';

  return `<!DOCTYPE html>
<html lang="sl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Račun ${invoiceNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
<div style="background-color: #007289; padding: 35px 20px; text-align: center; border-radius: 8px 8px 0 0;">
<h1 style="color: white; margin: 0 0 8px 0; font-size: 24px; font-weight: 600; line-height: 1.3;">DENTRO</h1>
<p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 14px; line-height: 1.5;">Zobozdravstvene storitve in svetovanje, d.o.o.</p>
</div>
<div style="background: white; padding: 35px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
<p style="font-size: 16px; margin-bottom: 20px; color: #333;">Spoštovani ${dentistName},</p>
<p style="font-size: 15px; color: #555; margin-bottom: 30px; line-height: 1.6;">V prilogi najdete račun <strong style="color: #007289;">${invoiceNumber}</strong> za opravljeno zobotehnično delo za vašega pacienta.</p>
<div style="background: #f0f7f9; padding: 25px; margin: 30px 0; border-radius: 6px;">
<table style="width: 100%; border-collapse: collapse;">
<tr>
<td style="padding: 10px 0; color: #666; font-size: 14px;">Številka računa:</td>
<td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 14px; color: #007289;">${invoiceNumber}</td>
</tr>
<tr>
<td style="padding: 10px 0; color: #666; font-size: 14px;">Datum računa:</td>
<td style="padding: 10px 0; text-align: right; font-size: 14px;">${new Date(invoice.invoiceDate).toLocaleDateString('sl-SI', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
</tr>
<tr>
<td style="padding: 10px 0; color: #666; font-size: 14px;">Rok plačila:</td>
<td style="padding: 10px 0; text-align: right; font-size: 14px;">${dueDate}</td>
</tr>
<tr style="border-top: 2px solid #007289;">
<td style="padding: 15px 0 0 0; color: #007289; font-weight: 700; font-size: 16px;">Skupni znesek:</td>
<td style="padding: 15px 0 0 0; text-align: right; color: #007289; font-weight: 700; font-size: 22px;">€${totalAmount}</td>
</tr>
</table>
</div>
<div style="background: #fff8f0; padding: 20px; margin: 30px 0; border-radius: 6px; border-top: 3px solid #D2804D;">
<h3 style="margin: 0 0 12px 0; color: #D2804D; font-size: 16px; font-weight: 600;">Podatki za plačilo</h3>
<p style="margin: 0; font-size: 14px; color: #555; line-height: 1.8;"><strong>Banka:</strong> ${bankName}<br><strong>IBAN:</strong> ${iban}<br><strong>Sklic:</strong> ${invoiceNumber}</p>
</div>
<p style="font-size: 14px; color: #666; margin-top: 30px; line-height: 1.6;">Če imate kakršnakoli vprašanja glede tega računa, nas prosim kontaktirajte.</p>
<p style="font-size: 14px; color: #333; margin-top: 25px;">Lep pozdrav,<br><strong style="color: #007289;">${labName}</strong></p>
</div>
<div style="text-align: center; margin-top: 25px; padding: 20px; background: white; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
<p style="font-size: 12px; color: #666; margin: 5px 0; line-height: 1.8;"><strong style="color: #007289;">${labName}</strong><br>E-pošta: <a href="mailto:${labEmail}" style="color: #007289; text-decoration: none;">${labEmail}</a> | Telefon: ${labPhone}<br>Naslov: ${labAddress}</p>
<p style="font-size: 11px; color: #999; margin: 15px 0 0 0;">To je avtomatsko sporočilo. Prosimo, ne odgovarjajte neposredno na to sporočilo.</p>
</div>
</body>
</html>`;
}
