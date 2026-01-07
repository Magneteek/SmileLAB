/**
 * Worksheet Management Types
 * EU MDR Annex XIII Compliance - Custom-Made Dental Devices
 */

import { Decimal } from '@prisma/client/runtime/library';
import type {
  WorkSheet,
  WorksheetTooth,
  WorksheetProduct,
  WorksheetMaterial,
  Order,
  Dentist,
  Patient,
  User,
  Product,
  Material,
  QualityControl,
  Document,
  Invoice
} from '@prisma/client';
import { WorksheetStatus } from '@prisma/client';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Worksheet status following state machine workflow
 * Re-exported from Prisma client for type consistency
 * DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → DELIVERED (auto-set when invoice created)
 *
 * Special statuses:
 * - CANCELLED: Worksheet cancelled before completion (can be deleted)
 * - VOIDED: Completed worksheet voided due to error (preserved for audit, needs revision)
 */
export { WorksheetStatus };

/**
 * Work types for dental procedures
 */
export enum WorkType {
  CROWN = 'CROWN',
  BRIDGE = 'BRIDGE',
  VENEER = 'VENEER',
  DENTURE = 'DENTURE',
  IMPLANT = 'IMPLANT',
  INLAY_ONLAY = 'INLAY_ONLAY',
  FILLING = 'FILLING',
  ORTHODONTICS = 'ORTHODONTICS',
  OTHER = 'OTHER'
}

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

/**
 * DTO for creating a new worksheet from an order
 */
export interface CreateWorksheetDto {
  orderId: string;
  patientName?: string;
  deviceDescription?: string;
  intendedUse?: string;
  technicalNotes?: string;
}

/**
 * DTO for updating worksheet basic details
 */
export interface UpdateWorksheetDto {
  deviceDescription?: string;
  intendedUse?: string;
  technicalNotes?: string;
  qcNotes?: string;
  manufactureDate?: Date;
}

/**
 * DTO for teeth selection with FDI notation
 */
export interface TeethSelectionData {
  teeth: Array<{
    toothNumber: string; // FDI notation: "11", "26", "55", etc.
    workType: WorkType | string;
    shade?: string;
    notes?: string;
  }>;
}

/**
 * Product-Material Instance
 * Represents a single material assignment to a product
 * Allows multiple instances of same material with different LOTs/teeth
 */
export interface ProductMaterialInstance {
  materialId: string;
  materialLotId?: string;      // Optional LOT (can assign later)
  quantityUsed: number;
  toothNumber?: string;        // Optional FDI notation (11-48, 51-85)
  notes?: string;              // Optional clarification (e.g., "Left implant")
  position?: number;           // Sequence number (1, 2, 3...)
}

/**
 * DTO for product selection from pricing list
 * Now supports multiple instances of same material with different LOTs
 */
export interface ProductSelectionData {
  products: Array<{
    productId: string;
    quantity: number;
    priceAtSelection: number | Decimal;
    notes?: string;
    materials?: ProductMaterialInstance[];  // Updated to use new type
  }>;
}

/**
 * DTO for material selection (triggers FIFO LOT assignment)
 *
 * Note: Product-material associations are NOT managed here.
 * They should be managed from the Products tab via WorksheetProductMaterial junction table.
 */
export interface MaterialSelectionData {
  materials: Array<{
    materialId: string;
    quantityNeeded: number;
    materialLotId?: string; // Optional specific LOT (defaults to FIFO if not provided)
  }>;
}

/**
 * DTO for state machine transition
 */
export interface WorksheetTransitionDto {
  newStatus: WorksheetStatus;
  notes?: string;
}

// ============================================================================
// FILTERS & QUERY TYPES
// ============================================================================

/**
 * Filters for worksheet list queries
 */
export interface WorksheetFilters {
  status?: WorksheetStatus | WorksheetStatus[];
  dentistId?: string;
  patientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // Search by worksheet number, patient name, etc.
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// WORKSHEET WITH RELATIONS
// ============================================================================

/**
 * Worksheet with all related entities (full data)
 */
export interface WorksheetWithRelations extends WorkSheet {
  order: Order & {
    dentist: Dentist;
  };
  dentist: Dentist;
  patient: Patient | null;
  createdBy: User;
  teeth: WorksheetTooth[];
  products: (WorksheetProduct & {
    product: Product;
  })[];
  materials: (WorksheetMaterial & {
    material: Material;
    materialLot: {
      lotNumber: string;
      expiryDate: Date | null;
    };
  })[];
  qualityControls: (QualityControl & {
    inspector: User;
  })[];
  documents: Document[];
  invoiceLineItems?: Array<{
    invoice: {
      id: string;
      invoiceNumber: string | null;
      isDraft: boolean;
      paymentStatus: string;
    };
  }>;
}

/**
 * Worksheet summary for list views
 */
export interface WorksheetSummary {
  id: string;
  worksheetNumber: string;
  status: WorksheetStatus;
  orderNumber: string;
  dentistName: string;
  clinicName: string;
  patientName: string | null;
  manufactureDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  productNames: string; // Abbreviated comma-separated list of product names
  materialsWithLots: Array<{
    materialName: string;
    lotNumber: string | null;
  }>;
}

// ============================================================================
// PAGINATED RESULTS
// ============================================================================

/**
 * Paginated worksheet results
 */
export interface PaginatedWorksheets {
  data: WorksheetSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// MATERIAL TRACEABILITY
// ============================================================================

/**
 * Material traceability data (reverse traceability)
 * Given a worksheet, find all materials and LOTs used
 */
export interface MaterialTraceability {
  worksheetNumber: string;
  worksheetId: string;
  patientName: string | null;
  manufactureDate: Date | null;
  materials: Array<{
    materialId: string;
    materialCode: string;
    materialName: string;
    manufacturer: string;
    lotNumber: string;
    quantityUsed: number;
    expiryDate: Date | null;
    ceMarked: boolean;
    ceNumber: string | null;
    biocompatible: boolean;
    iso10993Cert: string | null;
  }>;
}

/**
 * LOT traceability data (forward traceability)
 * Given a LOT number, find all worksheets that used it
 */
export interface LotTraceability {
  lotNumber: string;
  materialCode: string;
  materialName: string;
  manufacturer: string;
  expiryDate: Date | null;
  worksheets: Array<{
    worksheetId: string;
    worksheetNumber: string;
    patientName: string | null;
    dentistName: string;
    clinicName: string;
    manufactureDate: Date | null;
    quantityUsed: number;
  }>;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * FDI validation result
 */
export interface FdiValidationResult {
  valid: boolean;
  toothNumber: string;
  quadrant?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  position?: number;
  isPermanent?: boolean;
  error?: string;
}

/**
 * State machine validation result
 */
export interface StateTransitionValidation {
  allowed: boolean;
  currentStatus: WorksheetStatus;
  requestedStatus: WorksheetStatus;
  reason?: string;
  requiredRoles?: string[];
}

// ============================================================================
// SERVICE RESPONSE TYPES
// ============================================================================

/**
 * Success response from service operations
 */
export interface ServiceSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error response from service operations
 */
export interface ServiceError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Generic service result
 */
export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  WorkSheet,
  WorksheetTooth,
  WorksheetProduct,
  WorksheetMaterial,
  Order,
  Dentist,
  Patient,
  User,
  Product,
  Material,
  QualityControl,
  Document,
  Invoice
};
