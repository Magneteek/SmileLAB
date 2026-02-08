/**
 * Product and Pricing TypeScript Definitions
 *
 * Types for product catalog management with price versioning history.
 */

import { Product, ProductCategory, ProductPriceHistory, Prisma } from '@prisma/client';

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export type ProductWithPriceHistory = Product & {
  priceHistory: ProductPriceHistory[];
};

// ============================================================================
// DTO (Data Transfer Objects)
// ============================================================================

export interface CreateProductDto {
  code: string;
  name: string;
  description?: string;
  category: ProductCategory;
  currentPrice: number; // Will be converted to Decimal
  unit?: string;
  active?: boolean;
}

export interface UpdateProductDto {
  code?: string;
  name?: string;
  description?: string;
  category?: ProductCategory;
  currentPrice?: number; // If changed, creates price history
  unit?: string;
  active?: boolean;
}

export interface UpdateProductPriceDto {
  newPrice: number;
  reason: string; // Required for audit
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================

export interface ProductFilters {
  category?: ProductCategory;
  active?: boolean;
  search?: string; // Search by code or name
  page?: number;
  limit?: number;
  sortBy?: 'code' | 'name' | 'category' | 'currentPrice' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductDetailResponse extends Product {
  priceHistory: ProductPriceHistory[];
}

export interface PriceHistoryEntry {
  id: string;
  price: number; // Formatted from Decimal
  effectiveFrom: Date;
  effectiveTo: Date | null;
  reason: string | null;
  createdAt: Date;
}

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  FIKSNA_PROTETIKA: 'Fixed Prosthetics',
  SNEMNA_PROTETIKA: 'Removable Prosthetics',
  IMPLANTOLOGIJA: 'Implantology',
  ESTETIKA: 'Aesthetics',
  OSTALO: 'Other',
};

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  FIKSNA_PROTETIKA: 'bg-blue-100 text-blue-800',
  SNEMNA_PROTETIKA: 'bg-yellow-100 text-yellow-800',
  IMPLANTOLOGIJA: 'bg-red-100 text-red-800',
  ESTETIKA: 'bg-teal-100 text-teal-800',
  OSTALO: 'bg-stone-100 text-stone-800',
};

// ============================================================================
// UNIT OPTIONS
// ============================================================================

export const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'hour', label: 'Hour' },
  { value: 'gram', label: 'Gram' },
  { value: 'ml', label: 'Milliliter' },
] as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidProductCode(code: string): boolean {
  // Format: CR-001, BR-002, etc. (2-3 letters, dash, 3 digits)
  return /^[A-Z]{2,3}-\d{3}$/.test(code);
}

export function formatProductCode(code: string): string {
  return code.toUpperCase().trim();
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

export function formatCurrency(amount: number | string, currency: string = '€'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency}${num.toFixed(2)}`;
}

export function formatPriceChange(oldPrice: number, newPrice: number): string {
  const change = newPrice - oldPrice;
  const percentage = ((change / oldPrice) * 100).toFixed(1);
  const sign = change > 0 ? '+' : '';
  return `${sign}${formatCurrency(change)} (${sign}${percentage}%)`;
}
