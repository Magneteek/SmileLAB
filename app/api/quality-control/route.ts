/**
 * Quality Control List API Route
 *
 * GET /api/quality-control - Get list of QC records with filters
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';
import { QCResult } from '@prisma/client';

// ============================================================================
// GET /api/quality-control
// ============================================================================

/**
 * GET /api/quality-control
 * Get list of QC records with optional filters
 *
 * Query parameters:
 * - status: Filter by QC result (PENDING, APPROVED, REJECTED, CONDITIONAL)
 * - inspectorId: Filter by inspector user ID
 * - startDate: Start date for inspection date range (ISO format)
 * - endDate: End date for inspection date range (ISO format)
 * - worksheetStatus: Filter by worksheet status (QC_PENDING, QC_APPROVED, QC_REJECTED)
 *
 * Returns array of QualityControl records with related data:
 * - Inspector info
 * - Worksheet details (number, status, dentist, patient)
 * - Order info
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as QCResult | null;
    const inspectorId = searchParams.get('inspectorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const worksheetStatus = searchParams.get('worksheetStatus');

    // Build where clause
    const where: any = {};

    if (status) {
      where.result = status;
    }

    if (inspectorId) {
      where.inspectorId = inspectorId;
    }

    if (startDate || endDate) {
      where.inspectionDate = {};
      if (startDate) {
        where.inspectionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.inspectionDate.lte = new Date(endDate);
      }
    }

    if (worksheetStatus) {
      where.worksheet = {
        status: worksheetStatus,
      };
    }

    // Fetch QC records with related data
    const qcRecords = await prisma.qualityControl.findMany({
      where,
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        worksheet: {
          select: {
            id: true,
            worksheetNumber: true,
            status: true,
            patientName: true,
            deviceDescription: true,
            manufactureDate: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                dentist: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    clinicName: true,
                  },
                },
              },
            },
            products: {
              select: {
                id: true,
                quantity: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        inspectionDate: 'desc',
      },
    });

    // Calculate statistics
    const stats = {
      total: qcRecords.length,
      pending: qcRecords.filter((r) => r.result === 'PENDING').length,
      approved: qcRecords.filter((r) => r.result === 'APPROVED').length,
      conditional: qcRecords.filter((r) => r.result === 'CONDITIONAL').length,
      rejected: qcRecords.filter((r) => r.result === 'REJECTED').length,
    };

    return successResponse({
      records: qcRecords,
      stats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
