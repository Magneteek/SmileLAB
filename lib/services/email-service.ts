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
      from: `${senderName} <${fromEmail}>`,
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

  return `
<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${labName}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Zobotehniški laboratorij</p>
  </div>

  <!-- Main Content -->
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">

    <p style="font-size: 16px; margin-bottom: 20px;">Spoštovani ${dentistName},</p>

    <p style="font-size: 15px; color: #555; margin-bottom: 25px;">
      V prilogi najdete račun <strong>${invoiceNumber}</strong> za opravljeno zobotehnično delo za vašega pacienta.
    </p>

    <!-- Invoice Summary Box -->
    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Številka računa:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Datum računa:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${new Date(invoice.invoiceDate).toLocaleDateString('sl-SI', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Rok plačila:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${dueDate}</td>
        </tr>
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 12px 0 0 0; color: #667eea; font-weight: bold; font-size: 16px;">Skupni znesek:</td>
          <td style="padding: 12px 0 0 0; text-align: right; color: #667eea; font-weight: bold; font-size: 20px;">€${totalAmount}</td>
        </tr>
      </table>
    </div>

    <!-- Payment Instructions -->
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 5px;">
      <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">Podatki za plačilo</h3>
      <p style="margin: 5px 0; font-size: 14px; color: #78350f;">
        <strong>Banka:</strong> ${bankName}<br>
        <strong>IBAN:</strong> ${iban}<br>
        <strong>Sklic:</strong> ${invoiceNumber}
      </p>
    </div>

    <!-- Footer Message -->
    <p style="font-size: 14px; color: #555; margin-top: 25px;">
      Če imate kakršnakoli vprašanja glede tega računa, nas prosim kontaktirajte.
    </p>

    <p style="font-size: 14px; color: #555; margin-top: 20px;">
      Lep pozdrav,<br>
      <strong>${labName}</strong>
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">
      ${labName}<br>
      E-pošta: ${labEmail} | Telefon: ${labPhone}<br>
      Naslov: ${labAddress}
    </p>
    <p style="font-size: 11px; color: #d1d5db; margin: 10px 0 0 0;">
      To je avtomatsko sporočilo. Prosimo, ne odgovarjajte neposredno na to sporočilo.
    </p>
  </div>

</body>
</html>
  `;
}
