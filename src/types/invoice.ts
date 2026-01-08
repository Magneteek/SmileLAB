/**
 * Invoice Management Types
 * EU MDR Invoice Generation with VAT Compliance
 * Supports flexible invoice creation with draft mode and line items
 */

import { Decimal } from '@prisma/client/runtime/library';
import type {
  Invoice,
  InvoiceLineItem,
  WorkSheet,
  Dentist,
  User,
  EmailLog
} from '@prisma/client';
import { PaymentStatus } from '@prisma/client';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Payment status tracking
 * Re-exported from Prisma client
 */
export { PaymentStatus };

/**
 * Line item types
 */
export enum LineItemType {
  PRODUCT = 'product',          // Worksheet product
  SHIPPING = 'shipping',         // Shipping/delivery fee
  DISCOUNT = 'discount',         // Discount (negative amount)
  ADJUSTMENT = 'adjustment',     // Price adjustment
  CUSTOM = 'custom'             // Custom line item
}

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

/**
 * DTO for creating a line item
 */
export interface CreateLineItemDto {
  id?: string | null;               // Optional - undefined for new items
  worksheetId?: string | null;      // Optional - for worksheet product lines
  description: string;
  quantity: number;
  unitPrice: number;
  lineType?: 'product' | 'shipping' | 'discount' | 'adjustment' | 'custom' | null;   // Defaults to PRODUCT
  productCode?: string | null;
  productName?: string | null;
  notes?: string | null;
  position?: number | null;
}

/**
 * DTO for creating a new invoice (draft or finalized)
 */
export interface CreateInvoiceDto {
  dentistId?: string;        // Required for multi-worksheet invoices
  worksheetIds?: string[];   // Optional - for importing worksheet products
  invoiceDate?: Date;        // Defaults to now
  dueDate?: Date;           // Optional, defaults to invoice date + payment terms
  serviceDate?: Date;       // Date when service was performed, defaults to invoice date
  issuedBy?: string;        // Person who issued the invoice, defaults to "Rommy Balzan Verbič"
  taxRate?: number;         // Optional, defaults to 22% (Slovenia VAT)
  discountRate?: number;    // Optional discount percentage
  notes?: string;
  lineItems: CreateLineItemDto[]; // Can be empty for new draft
  isDraft?: boolean;        // Defaults to true
}

/**
 * DTO for generating a new invoice from a worksheet (legacy)
 * @deprecated Use CreateInvoiceDto instead
 */
export interface GenerateInvoiceDto {
  worksheetId: string;
  dueDate?: Date;      // Optional, defaults to current date + payment terms
  serviceDate?: Date;  // Date when service was performed, defaults to invoice date
  issuedBy?: string;   // Person who issued the invoice, defaults to "Rommy Balzan Verbič"
  taxRate?: number;    // Optional, defaults to 22% (Slovenia VAT)
  discountRate?: number; // Optional discount percentage
  notes?: string;
}

/**
 * DTO for updating an invoice (draft mode)
 */
export interface UpdateInvoiceDto {
  invoiceDate?: Date;
  dueDate?: Date;
  serviceDate?: Date;
  issuedBy?: string;
  taxRate?: number;
  discountRate?: number;
  notes?: string;
  lineItems?: CreateLineItemDto[];
}

/**
 * DTO for updating invoice payment status
 */
export interface UpdateInvoicePaymentDto {
  paymentStatus: PaymentStatus;
  paidAt?: Date;
  paymentMethod?: string;
  notes?: string;
}

/**
 * DTO for finalizing an invoice (assigns invoice number)
 */
export interface FinalizeInvoiceDto {
  invoiceDate?: Date; // Can adjust date before finalizing
}

/**
 * DTO for invoice filters
 */
export interface InvoiceFilters {
  paymentStatus?: PaymentStatus | PaymentStatus[];
  dentistId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // Search by invoice number, dentist name, etc.
  overdue?: boolean;
}

// ============================================================================
// INVOICE WITH RELATIONS
// ============================================================================

/**
 * Invoice line item with relations
 * Note: worksheet can be full WorkSheet or partial with just required fields
 */
export interface InvoiceLineItemWithRelations extends InvoiceLineItem {
  worksheet: {
    id: string;
    worksheetNumber: string;
    patientName?: string | null;
    order?: {
      dentist: Dentist;
    };
  } | null;
}

/**
 * Invoice with all related entities (full data)
 */
export interface InvoiceWithRelations extends Invoice {
  dentist: Dentist | null;
  lineItems: InvoiceLineItemWithRelations[];
  createdBy: User;
  emailLogs: EmailLog[];
}

/**
 * Invoice summary for list views
 */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string | null;
  dentistName: string;
  clinicName: string;
  worksheetNumbers: string[]; // Multiple worksheets possible (for display)
  worksheets?: Array<{ id: string; number: string }>; // Worksheet data with IDs for linking
  patientName?: string | null; // Patient name from first worksheet (if any)
  invoiceDate: Date;
  dueDate: Date | null;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  isDraft: boolean;
  overdue: boolean;
  createdAt: Date;
}

/**
 * Invoice calculation result
 */
export interface InvoiceCalculation {
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

// ============================================================================
// PAGINATED RESULTS
// ============================================================================

/**
 * Paginated invoice results
 */
export interface PaginatedInvoices {
  data: InvoiceSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalDraft: number;
    totalSent: number;
    totalPaid: number;
    totalOverdue: number;
    totalUnpaid: number;
  };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Invoice generation validation result
 */
export interface InvoiceGenerationValidation {
  allowed: boolean;
  worksheetId: string;
  reason?: string;
  requiredStatus?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Invoice,
  WorkSheet,
  Dentist,
  User,
  EmailLog
};
