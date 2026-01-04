// Material Inventory Management Types
// EU MDR Annex XIII Compliance - Material Traceability

import { MaterialType, MaterialLotStatus, Material, MaterialLot, WorksheetMaterial } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// CORE TYPES
// ============================================================================

export type { MaterialType, MaterialLotStatus };

// Material with all LOTs
export interface MaterialWithLots extends Material {
  lots: MaterialLot[];
}

// MaterialLot with related data
export interface MaterialLotWithMaterial extends MaterialLot {
  material: Material;
}

export interface MaterialLotWithUsage extends MaterialLot {
  material: Material;
  worksheetMaterials: (WorksheetMaterial & {
    worksheet: {
      id: string;
      worksheetNumber: string;
      dentist: {
        clinicName: string;
      };
      patient: {
        firstName: string;
        lastName: string;
      } | null;
    };
  })[];
}

// ============================================================================
// DTOs (DATA TRANSFER OBJECTS)
// ============================================================================

// Create Material
export interface CreateMaterialDto {
  code: string;
  name: string;
  type: MaterialType;
  manufacturer: string;
  description?: string;
  biocompatible?: boolean;
  iso10993Cert?: string;
  ceMarked?: boolean;
  ceNumber?: string;
  unit?: string;
  active?: boolean;
}

// Update Material
export interface UpdateMaterialDto {
  code?: string;
  name?: string;
  type?: MaterialType;
  manufacturer?: string;
  description?: string;
  biocompatible?: boolean;
  iso10993Cert?: string;
  ceMarked?: boolean;
  ceNumber?: string;
  unit?: string;
  active?: boolean;
}

// Create MaterialLot (Stock Arrival)
export interface CreateLotDto {
  materialId: string;
  lotNumber: string;
  arrivalDate?: Date;
  expiryDate?: Date;
  supplierName: string;
  quantityReceived: number | Decimal;
  notes?: string;
}

// Update MaterialLot
export interface UpdateLotDto {
  lotNumber?: string;
  expiryDate?: Date;
  supplierName?: string;
  quantityAvailable?: number | Decimal;
  status?: MaterialLotStatus;
  notes?: string;
}

// ============================================================================
// FILTERS & QUERIES
// ============================================================================

export interface MaterialFilters {
  type?: MaterialType;
  active?: boolean;
  search?: string; // Search by code, name, manufacturer
  hasStock?: boolean; // Only materials with available LOTs
  biocompatible?: boolean;
  ceMarked?: boolean;
}

export interface MaterialLotFilters {
  materialId?: string;
  status?: MaterialLotStatus;
  expiringWithinDays?: number;
  includeExpired?: boolean;
}

// ============================================================================
// FIFO SELECTION
// ============================================================================

export interface AvailableMaterial {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  manufacturer: string;
  unit: string;
  totalAvailableQuantity: Decimal;
  oldestLot: {
    id: string;
    lotNumber: string;
    arrivalDate: Date;
    expiryDate: Date | null;
    quantityAvailable: Decimal;
  } | null;
  lotCount: number;
}

export interface FIFOSelection {
  materialLotId: string;
  lotNumber: string;
  arrivalDate: Date;
  expiryDate: Date | null;
  quantityAvailable: Decimal;
  quantityToUse: Decimal;
}

// ============================================================================
// ALERTS & MONITORING
// ============================================================================

export interface ExpiryAlert {
  materialLotId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  lotNumber: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  quantityAvailable: Decimal;
  severity: 'critical' | 'warning' | 'info'; // <7 days = critical, 7-30 days = warning, >30 = info
}

export interface LowStockAlert {
  materialId: string;
  materialCode: string;
  materialName: string;
  type: MaterialType;
  unit: string;
  totalAvailableQuantity: Decimal;
  threshold: Decimal;
  percentageOfThreshold: number;
}

export interface DepletedLot {
  id: string;
  lotNumber: string;
  materialCode: string;
  materialName: string;
  arrivalDate: Date;
  depletedAt: Date;
}

// ============================================================================
// TRACEABILITY (EU MDR REQUIREMENT)
// ============================================================================

export interface TraceabilityData {
  lot: MaterialLotWithMaterial;
  forwardTrace: {
    worksheetId: string;
    worksheetNumber: string;
    manufactureDate: Date | null;
    quantityUsed: Decimal;
    dentist: {
      clinicName: string;
      dentistName: string;
    };
    patient: {
      firstName: string;
      lastName: string;
    } | null;
  }[];
  summary: {
    totalQuantityUsed: Decimal;
    worksheetsCount: number;
    patientsAffected: number;
    dateRange: {
      firstUse: Date | null;
      lastUse: Date | null;
    };
  };
}

export interface WorksheetMaterialsData {
  worksheetId: string;
  worksheetNumber: string;
  materials: {
    materialId: string;
    materialCode: string;
    materialName: string;
    materialType: MaterialType;
    manufacturer: string;
    lotNumber: string;
    lotArrivalDate: Date;
    lotExpiryDate: Date | null;
    quantityUsed: Decimal;
    biocompatible: boolean;
    ceMarked: boolean;
    ceNumber: string | null;
  }[];
}

// ============================================================================
// INVENTORY VIEWS
// ============================================================================

export interface InventoryOverview {
  materials: {
    id: string;
    code: string;
    name: string;
    type: MaterialType;
    manufacturer: string;
    unit: string;
    totalLots: number;
    availableLots: number;
    totalQuantity: Decimal;
    availableQuantity: Decimal;
    expiringLots: number;
    oldestExpiryDate: Date | null;
  }[];
  summary: {
    totalMaterials: number;
    activeMaterials: number;
    totalLots: number;
    availableLots: number;
    expiringWithin30Days: number;
    lowStockMaterials: number;
  };
}

export interface MaterialStatistics {
  materialId: string;
  materialCode: string;
  materialName: string;
  usage: {
    totalQuantityUsed: Decimal;
    worksheetsCount: number;
    averageQuantityPerWorksheet: Decimal;
    lastUsed: Date | null;
  };
  stock: {
    totalReceived: Decimal;
    totalAvailable: Decimal;
    utilizationRate: number; // Percentage
    lotsReceived: number;
    lotsActive: number;
    lotsDepleted: number;
  };
  timeline: {
    month: string;
    quantityUsed: Decimal;
    worksheetsCount: number;
  }[];
}

// ============================================================================
// CONSUMPTION TRACKING
// ============================================================================

export interface ConsumeMaterialDto {
  worksheetId: string;
  materialId: string;
  quantityNeeded: number | Decimal;
  notes?: string;
}

export interface ConsumptionResult {
  success: boolean;
  worksheetMaterialId?: string;
  lotUsed: {
    materialLotId: string;
    lotNumber: string;
    quantityUsed: Decimal;
    quantityRemaining: Decimal;
  };
  warnings?: string[];
  errors?: string[];
}

// ============================================================================
// VALIDATION & ERRORS
// ============================================================================

export interface MaterialValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class InsufficientStockError extends Error {
  constructor(
    public materialId: string,
    public materialName: string,
    public requested: Decimal,
    public available: Decimal
  ) {
    super(`Insufficient stock for ${materialName}. Requested: ${requested}, Available: ${available}`);
    this.name = 'InsufficientStockError';
  }
}

export class ExpiredMaterialError extends Error {
  constructor(
    public materialLotId: string,
    public lotNumber: string,
    public expiryDate: Date
  ) {
    super(`Material LOT ${lotNumber} expired on ${expiryDate.toISOString()}`);
    this.name = 'ExpiredMaterialError';
  }
}

export class DuplicateLotError extends Error {
  constructor(
    public materialId: string,
    public lotNumber: string
  ) {
    super(`LOT number ${lotNumber} already exists for this material`);
    this.name = 'DuplicateLotError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginatedMaterials {
  data: MaterialWithLots[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface PaginatedLots {
  data: MaterialLotWithMaterial[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Unit options
export const MATERIAL_UNITS = ['gram', 'ml', 'piece', 'disc'] as const;
export type MaterialUnit = typeof MATERIAL_UNITS[number];

// Material type labels
export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  CERAMIC: 'Ceramic',
  METAL: 'Metal',
  RESIN: 'Resin',
  COMPOSITE: 'Composite',
  PORCELAIN: 'Porcelain',
  ZIRCONIA: 'Zirconia',
  TITANIUM: 'Titanium',
  ALLOY: 'Alloy',
  ACRYLIC: 'Acrylic',
  WAX: 'Wax',
  OTHER: 'Other',
};

// Status labels
export const LOT_STATUS_LABELS: Record<MaterialLotStatus, string> = {
  AVAILABLE: 'Available',
  DEPLETED: 'Depleted',
  EXPIRED: 'Expired',
  RECALLED: 'Recalled',
};

// Status colors for UI
export const LOT_STATUS_COLORS: Record<MaterialLotStatus, string> = {
  AVAILABLE: 'green',
  DEPLETED: 'gray',
  EXPIRED: 'red',
  RECALLED: 'orange',
};
