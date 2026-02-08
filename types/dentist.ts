/**
 * Dentist Type Definitions
 *
 * Types for dentist/clinic management including CRUD operations,
 * filtering, statistics, and business validation.
 */

import { Dentist } from '@prisma/client';

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateDentistDto {
  clinicName: string;
  dentistName: string;
  licenseNumber?: string;
  email?: string; // Optional contact info
  phone?: string; // Optional contact info
  address?: string; // Optional contact info
  city: string;
  postalCode: string;
  country?: string;
  taxNumber?: string;
  businessRegistration?: string;
  paymentTerms?: number;
  requiresInvoicing?: boolean;
  notes?: string;
  active?: boolean;
}

export interface UpdateDentistDto {
  clinicName?: string;
  dentistName?: string;
  licenseNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  businessRegistration?: string;
  paymentTerms?: number;
  requiresInvoicing?: boolean;
  notes?: string;
  active?: boolean;
}

// ============================================================================
// Filters and Queries
// ============================================================================

export interface DentistFilters {
  active?: boolean;
  city?: string;
  search?: string; // Search clinic name, dentist name, or email
  page?: number;
  limit?: number;
  sortBy?: 'clinicName' | 'dentistName' | 'city' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Responses
// ============================================================================

export interface DentistListResponse {
  dentists: Dentist[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DentistDetailResponse extends Dentist {
  _count?: {
    orders: number;
    worksheets: number;
    invoices: number;
  };
  orders?: any[]; // Detailed order data when included
  worksheets?: any[]; // Detailed worksheet data when included
}

export interface DentistStats {
  id: string;
  clinicName: string;
  dentistName: string;

  // Order statistics
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;

  // Worksheet statistics
  totalWorksheets: number;
  activeWorksheets: number;
  completedWorksheets: number;

  // Revenue statistics (if invoices available)
  totalRevenue?: number;
  averageOrderValue?: number;

  // Time-based statistics
  ordersThisMonth: number;
  ordersThisYear: number;

  // Last activity
  lastOrderDate?: Date;
  lastWorksheetDate?: Date;
}

// ============================================================================
// Simple Lists (for dropdowns)
// ============================================================================

export interface SimpleDentistDto {
  id: string;
  clinicName: string;
  dentistName: string;
  email: string | null; // Nullable since email is optional
  paymentTerms: number;
}

// ============================================================================
// Validation Results
// ============================================================================

export interface DentistValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Common Slovenian Cities
// ============================================================================

export const SLOVENIAN_CITIES = [
  'Ljubljana',
  'Maribor',
  'Celje',
  'Kranj',
  'Velenje',
  'Koper',
  'Novo Mesto',
  'Ptuj',
  'Trbovlje',
  'Kamnik',
  'Jesenice',
  'Nova Gorica',
  'Domžale',
  'Škofja Loka',
  'Slovenj Gradec',
  'Murska Sobota',
  'Izola',
  'Piran',
  'Postojna',
  'Idrija',
  'Ajdovščina',
  'Bled',
  'Brežice',
  'Grosuplje',
  'Hrastnik',
  'Kočevje',
  'Krško',
  'Laško',
  'Lendava',
  'Litija',
  'Ljubljana-Šiška',
  'Ljutomer',
  'Logatec',
  'Metlika',
  'Mozirje',
  'Ormož',
  'Radovljica',
  'Ravne na Koroškem',
  'Ribnica',
  'Sevnica',
  'Sežana',
  'Slovenska Bistrica',
  'Tolmin',
  'Trebnje',
  'Tržič',
  'Vrhnika',
  'Zagorje ob Savi',
  'Žalec',
].sort();

// ============================================================================
// Payment Terms Options
// ============================================================================

export const PAYMENT_TERMS_OPTIONS = [
  { value: 15, label: '15 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
];

// ============================================================================
// Country Options
// ============================================================================

export const COUNTRY_OPTIONS = [
  { value: 'Slovenia', label: 'Slovenia' },
  { value: 'Croatia', label: 'Croatia' },
  { value: 'Austria', label: 'Austria' },
  { value: 'Italy', label: 'Italy' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Switzerland', label: 'Switzerland' },
  { value: 'Other', label: 'Other' },
];
