/**
 * QR Code Utilities
 *
 * Generates EPC QR codes for SEPA payments (European standard)
 * Compatible with all EU banking apps
 */

import QRCode from 'qrcode';

/**
 * EPC QR Code Data Interface
 */
export interface EPCQRCodeData {
  beneficiaryName: string;    // Laboratory name
  iban: string;                // Bank account IBAN
  amount: number;              // Payment amount
  reference: string;           // Payment reference (invoice number)
  bic?: string;                // Bank BIC/SWIFT code (optional)
  purpose?: string;            // Payment purpose text (optional)
}

/**
 * Generate EPC QR Code data string
 * Format: European Payments Council standard
 *
 * @param data - Payment information
 * @returns EPC formatted string
 */
export function generateEPCString(data: EPCQRCodeData): string {
  // EPC QR Code format (version 002)
  const lines = [
    'BCD',                                    // Service Tag
    '002',                                    // Version
    '1',                                      // Character set (1 = UTF-8)
    'SCT',                                    // Identification (SEPA Credit Transfer)
    data.bic || '',                          // BIC (optional, can be empty)
    data.beneficiaryName.substring(0, 70),   // Beneficiary name (max 70 chars)
    data.iban.replace(/\s/g, ''),            // IBAN (remove spaces)
    `EUR${data.amount.toFixed(2)}`,          // Amount with currency
    data.purpose || '',                       // Purpose (optional)
    data.reference.substring(0, 35),         // Structured reference (max 35 chars)
    '',                                       // Beneficiary to originator information (empty)
    '',                                       // Remittance information (empty)
  ];

  return lines.join('\n');
}

/**
 * Generate EPC QR Code as base64 image
 *
 * @param data - Payment information
 * @param options - QR code generation options
 * @returns Base64 encoded PNG image
 */
export async function generateEPCQRCode(
  data: EPCQRCodeData,
  options: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  } = {}
): Promise<string> {
  const epcString = generateEPCString(data);

  try {
    const qrCode = await QRCode.toDataURL(epcString, {
      width: options.width || 200,
      margin: options.margin || 1,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCode; // Returns base64 data URL
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('QR code generation failed');
  }
}

/**
 * Validate IBAN format (basic check)
 *
 * @param iban - IBAN string
 * @returns true if format is valid
 */
export function validateIBAN(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

  // Check length (15-34 characters)
  if (cleanIBAN.length < 15 || cleanIBAN.length > 34) {
    return false;
  }

  // Check format: 2 letters + 2 digits + alphanumeric
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
  return ibanRegex.test(cleanIBAN);
}

/**
 * Format IBAN for display (with spaces every 4 characters)
 *
 * @param iban - IBAN string
 * @returns Formatted IBAN (e.g., "SI56 0110 0603 9081 111")
 */
export function formatIBAN(iban: string): string {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  return cleanIBAN.match(/.{1,4}/g)?.join(' ') || cleanIBAN;
}
