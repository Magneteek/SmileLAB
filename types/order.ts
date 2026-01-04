/**
 * Order Type Definitions
 *
 * TypeScript interfaces for Order management system
 */

import { Order, OrderStatus, Dentist, User, WorkSheet } from '@prisma/client';

// Worksheet with patient name for order list
export interface WorksheetWithPatient {
  id: string;
  worksheetNumber: string;
  status: string;
  patientName?: string | null;
}

// Order with relations
export interface OrderWithRelations extends Order {
  dentist: Dentist;
  createdBy: User;
  worksheet?: WorksheetWithPatient | null;
}

// Create Order DTO
export interface CreateOrderDto {
  dentistId: string;
  patientName?: string | null;
  dueDate?: Date | string | null;
  priority?: number;
  notes?: string | null;
}

// Update Order DTO
export interface UpdateOrderDto {
  dentistId?: string;
  patientName?: string | null;
  dueDate?: Date | string | null;
  status?: OrderStatus;
  priority?: number;
  notes?: string | null;
}

// Order filters for list queries
export interface OrderFilters {
  status?: OrderStatus;
  dentistId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  priority?: number;
  search?: string; // Search by order number
  page?: number;
  limit?: number;
  sortBy?: 'orderDate' | 'dueDate' | 'orderNumber' | 'status';
  sortOrder?: 'asc' | 'desc';
  excludeStatus?: OrderStatus; // Exclude specific status (e.g., hide INVOICED from TECHNICIAN)
}

// Order list response
export interface OrderListResponse {
  orders: OrderWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Order detail response (with full relations)
export interface OrderDetailResponse extends OrderWithRelations {
  worksheet?: WorkSheet | null;
}

// Order statistics
export interface OrderStats {
  total: number;
  pending: number;
  inProduction: number;
  qcPending: number;
  qcApproved: number;
  invoiced: number;
  delivered: number;
  cancelled: number;
}

// API response types
export interface OrderResponse {
  success: boolean;
  data?: OrderWithRelations;
  error?: string;
}

export interface OrderListApiResponse {
  success: boolean;
  data?: OrderListResponse;
  error?: string;
}
