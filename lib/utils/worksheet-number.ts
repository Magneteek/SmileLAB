/**
 * Worksheet Number Generation Utility
 *
 * Handles worksheet number generation with revision suffix support
 * Format: DN-{orderNumber} or DN-{orderNumber}-R{revisionNumber}
 */

import { prisma } from '@/lib/prisma';

/**
 * Generate worksheet number for an order
 *
 * Logic:
 * - First worksheet: DN-{orderNumber} (e.g., DN-25003)
 * - Subsequent worksheets (after void): DN-{orderNumber}-R{N} (e.g., DN-25003-R1)
 *
 * @param orderId - Order ID
 * @returns Worksheet number string
 */
export async function generateWorksheetNumber(orderId: string): Promise<string> {
  // Get order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Check for existing worksheets for this order
  const existingWorksheets = await prisma.workSheet.findMany({
    where: { orderId },
    select: { worksheetNumber: true },
    orderBy: { createdAt: 'desc' },
  });

  if (existingWorksheets.length === 0) {
    // First worksheet for this order
    return `DN-${order.orderNumber}`;
  }

  // There are existing worksheets - need to determine revision number
  // Extract revision numbers from existing worksheet numbers
  const revisionNumbers = existingWorksheets.map((ws) => {
    // Match pattern: DN-{orderNumber}-R{revisionNumber}
    const match = ws.worksheetNumber.match(/-R(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });

  // Get highest revision number
  const maxRevision = Math.max(...revisionNumbers, 0);
  const nextRevision = maxRevision + 1;

  return `DN-${order.orderNumber}-R${nextRevision}`;
}

/**
 * Parse worksheet number to extract order number and revision
 *
 * @param worksheetNumber - Worksheet number (e.g., "DN-25003" or "DN-25003-R1")
 * @returns Object with orderNumber and revision
 */
export function parseWorksheetNumber(worksheetNumber: string): {
  orderNumber: string;
  revision: number | null;
} {
  // Match pattern: DN-{orderNumber} or DN-{orderNumber}-R{revision}
  const match = worksheetNumber.match(/^DN-(\d+)(?:-R(\d+))?$/);

  if (!match) {
    throw new Error(`Invalid worksheet number format: ${worksheetNumber}`);
  }

  return {
    orderNumber: match[1],
    revision: match[2] ? parseInt(match[2], 10) : null,
  };
}

/**
 * Check if worksheet number has a revision suffix
 *
 * @param worksheetNumber - Worksheet number
 * @returns true if has revision suffix
 */
export function hasRevisionSuffix(worksheetNumber: string): boolean {
  return /-R\d+$/.test(worksheetNumber);
}

/**
 * Get base worksheet number (without revision suffix)
 *
 * @param worksheetNumber - Worksheet number (e.g., "DN-25003-R1")
 * @returns Base number (e.g., "DN-25003")
 */
export function getBaseWorksheetNumber(worksheetNumber: string): string {
  const parsed = parseWorksheetNumber(worksheetNumber);
  return `DN-${parsed.orderNumber}`;
}
