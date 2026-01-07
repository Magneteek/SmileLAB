/**
 * Quality Control API Route
 *
 * POST /api/quality-control/:worksheetId - Create or update QC record
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';
import { QCResult } from '@prisma/client';
import { generateAnnexXIII } from '@/lib/pdf/annex-xiii-generator';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for QC inspection submission
 */
const qcSubmissionSchema = z.object({
  // QC Checklist (5 Boolean fields)
  aesthetics: z.boolean({
    message: 'Aesthetics check is required',
  }),
  fit: z.boolean({
    message: 'Fit check is required',
  }),
  occlusion: z.boolean({
    message: 'Occlusion check is required',
  }),
  shade: z.boolean({
    message: 'Shade check is required',
  }),
  margins: z.boolean({
    message: 'Margins check is required',
  }),

  // QC Result
  result: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL'] as const, {
    message: 'QC result is required',
  }),

  // Documentation
  notes: z.string().optional(),
  actionRequired: z.string().optional(),

  // EU MDR Annex XIII Compliance Fields
  emdnCode: z.string().min(1, 'EMDN code is required'),
  riskClass: z.string().min(1, 'Risk class is required'),
  annexIDeviations: z.string().optional(),
  documentVersion: z.string().min(1, 'Document version is required'),
});

type QCSubmissionData = z.infer<typeof qcSubmissionSchema>;

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate QC submission based on business rules
 */
function validateQCSubmission(data: QCSubmissionData): {
  valid: boolean;
  error?: string;
} {
  const { aesthetics, fit, occlusion, shade, margins, result, notes, actionRequired } = data;

  const passedChecks = [aesthetics, fit, occlusion, shade, margins].filter(Boolean).length;

  // APPROVED: All 5 checkboxes must be checked
  if (result === 'APPROVED') {
    if (passedChecks !== 5) {
      return {
        valid: false,
        error: 'APPROVED status requires all 5 quality checks to pass',
      };
    }
  }

  // CONDITIONAL: At least 4 checkboxes checked, notes required
  if (result === 'CONDITIONAL') {
    if (passedChecks < 4) {
      return {
        valid: false,
        error: 'CONDITIONAL status requires at least 4 quality checks to pass',
      };
    }
    if (!notes || notes.trim().length === 0) {
      return {
        valid: false,
        error: 'CONDITIONAL status requires notes explaining the minor issues',
      };
    }
  }

  // REJECTED: At least 1 checkbox unchecked, actionRequired text required
  if (result === 'REJECTED') {
    if (passedChecks === 5) {
      return {
        valid: false,
        error: 'REJECTED status requires at least one quality check to fail',
      };
    }
    if (!actionRequired || actionRequired.trim().length === 0) {
      return {
        valid: false,
        error: 'REJECTED status requires actionRequired text explaining what needs fixing',
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// POST /api/quality-control/:worksheetId
// ============================================================================

/**
 * POST /api/quality-control/:worksheetId
 * Create or update QC record for a worksheet
 *
 * Enforces:
 * - Role check: Only QC_INSPECTOR or ADMIN can submit
 * - Status check: Worksheet must be in QC_PENDING status
 * - Validation rules for APPROVED/REJECTED/CONDITIONAL
 *
 * Side effects:
 * - Transitions worksheet to QC_APPROVED or QC_REJECTED
 * - Updates order status to match
 * - Creates audit log entry
 * - Updates inspection date
 *
 * Request body:
 * {
 *   aesthetics: boolean,
 *   fit: boolean,
 *   occlusion: boolean,
 *   shade: boolean,
 *   margins: boolean,
 *   result: "APPROVED" | "REJECTED" | "CONDITIONAL",
 *   notes?: string,
 *   actionRequired?: string  // Required if result=REJECTED
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  try {
    // Check authentication
    const session = await requireAuth();

    // Only ADMIN or TECHNICIAN can perform QC
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return forbiddenResponse(
        'Only Admin or Technician users can perform quality control inspections'
      );
    }

    const { worksheetId } = await params;

    // Validate request body
    const data = await validateRequestBody(request, qcSubmissionSchema);

    // Validate QC submission based on business rules
    const validation = validateQCSubmission(data);
    if (!validation.valid) {
      return badRequestResponse(validation.error || 'Invalid QC submission');
    }

    // Get worksheet to check current status
    const worksheet = await prisma.workSheet.findUnique({
      where: { id: worksheetId },
      select: {
        id: true,
        orderId: true,
        worksheetNumber: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!worksheet || worksheet.deletedAt) {
      return handleApiError(new Error('Worksheet not found'));
    }

    // Check worksheet is in QC_PENDING status
    if (worksheet.status !== 'QC_PENDING') {
      return badRequestResponse(
        `Quality control can only be performed on worksheets in QC_PENDING status. Current status: ${worksheet.status}`
      );
    }

    // Determine target worksheet status based on QC result
    const targetWorksheetStatus =
      data.result === 'APPROVED' || data.result === 'CONDITIONAL'
        ? 'QC_APPROVED'
        : 'QC_REJECTED';

    // Determine target order status (Order enum doesn't have QC_REJECTED)
    // When QC is rejected, order returns to IN_PRODUCTION for rework
    const targetOrderStatus =
      data.result === 'APPROVED' || data.result === 'CONDITIONAL'
        ? 'QC_APPROVED'
        : 'IN_PRODUCTION';

    // Create or update QC record and transition worksheet status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update QualityControl record
      const qcRecord = await tx.qualityControl.upsert({
        where: { worksheetId },
        create: {
          worksheetId,
          inspectorId: session.user.id,
          result: data.result as QCResult,
          inspectionDate: new Date(),
          aesthetics: data.aesthetics,
          fit: data.fit,
          occlusion: data.occlusion,
          shade: data.shade,
          margins: data.margins,
          notes: data.notes,
          actionRequired: data.actionRequired,
          // EU MDR Annex XIII Compliance Fields
          emdnCode: data.emdnCode,
          riskClass: data.riskClass,
          annexIDeviations: data.annexIDeviations,
          documentVersion: data.documentVersion,
        },
        update: {
          inspectorId: session.user.id,
          result: data.result as QCResult,
          inspectionDate: new Date(),
          aesthetics: data.aesthetics,
          fit: data.fit,
          occlusion: data.occlusion,
          shade: data.shade,
          margins: data.margins,
          notes: data.notes,
          actionRequired: data.actionRequired,
          // EU MDR Annex XIII Compliance Fields
          emdnCode: data.emdnCode,
          riskClass: data.riskClass,
          annexIDeviations: data.annexIDeviations,
          documentVersion: data.documentVersion,
        },
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          worksheet: {
            select: {
              id: true,
              worksheetNumber: true,
              status: true,
            },
          },
        },
      });

      // Transition worksheet status
      const updatedWorksheet = await tx.workSheet.update({
        where: { id: worksheetId },
        data: { status: targetWorksheetStatus },
        select: {
          id: true,
          worksheetNumber: true,
          status: true,
          orderId: true,
        },
      });

      // Update order status (use mapped status for Order enum compatibility)
      await tx.order.update({
        where: { id: worksheet.orderId },
        data: { status: targetOrderStatus },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: data.result === 'REJECTED' ? 'QC_REJECT' : 'QC_APPROVE',
          entityType: 'WorkSheet',
          entityId: worksheetId,
          reason: JSON.stringify({
            worksheetNumber: worksheet.worksheetNumber,
            qcResult: data.result,
            passedChecks: [
              data.aesthetics,
              data.fit,
              data.occlusion,
              data.shade,
              data.margins,
            ].filter(Boolean).length,
            notes: data.notes,
            actionRequired: data.actionRequired,
            inspector: session.user.name,
          }),
        },
      });

      return { qcRecord, updatedWorksheet };
    });

    // ========================================================================
    // AUTO-DELIVER FOR INTERNAL DENTISTS (No Invoice Required)
    // ========================================================================
    if (data.result === 'APPROVED' || data.result === 'CONDITIONAL') {
      // Check if dentist requires invoicing
      const worksheetWithDentist = await prisma.workSheet.findUnique({
        where: { id: worksheetId },
        select: {
          dentist: {
            select: {
              requiresInvoicing: true,
              clinicName: true,
            },
          },
        },
      });

      // If dentist doesn't require invoicing, auto-deliver
      if (worksheetWithDentist?.dentist && !worksheetWithDentist.dentist.requiresInvoicing) {
        console.log(
          `[QC] Internal dentist detected (${worksheetWithDentist.dentist.clinicName}), auto-delivering worksheet...`
        );

        await prisma.$transaction(async (tx) => {
          // Mark worksheet as DELIVERED
          await tx.workSheet.update({
            where: { id: worksheetId },
            data: { status: 'DELIVERED' },
          });

          // Mark order as DELIVERED
          await tx.order.update({
            where: { id: worksheet.orderId },
            data: { status: 'DELIVERED' },
          });

          // Create audit log entry
          await tx.auditLog.create({
            data: {
              userId: session.user.id,
              action: 'UPDATE',
              entityType: 'WorkSheet',
              entityId: worksheetId,
              reason: JSON.stringify({
                action: 'auto_deliver_internal',
                worksheetNumber: worksheet.worksheetNumber,
                dentistClinic: worksheetWithDentist.dentist.clinicName,
                note: 'Auto-delivered after QC approval (internal dentist, no invoice required)',
              }),
            },
          });
        });

        console.log(
          `[QC] ✅ Worksheet and order auto-delivered for internal dentist`
        );
      }
    }

    // ========================================================================
    // ANNEX XIII AUTO-GENERATION (QC Approved/Conditional Only)
    // ========================================================================
    let annexDocument = null;
    let annexGenerationError = null;

    // Only generate Annex XIII for APPROVED or CONDITIONAL results
    if (data.result === 'APPROVED' || data.result === 'CONDITIONAL') {
      try {
        console.log(
          `[QC] Checking if Annex XIII exists for worksheet ${worksheet.worksheetNumber}...`
        );

        // Check if Annex XIII already exists
        const existingAnnex = await prisma.document.findFirst({
          where: {
            worksheetId,
            type: 'ANNEX_XIII',
          },
          select: { id: true, generatedAt: true },
        });

        if (existingAnnex) {
          console.log(
            `[QC] Annex XIII already exists (ID: ${existingAnnex.id}), skipping generation`
          );
          annexDocument = existingAnnex;
        } else {
          console.log(
            `[QC] Generating Annex XIII for worksheet ${worksheet.worksheetNumber} in SL (Slovenian)...`
          );

          // Generate Annex XIII document in Slovenian (default language)
          annexDocument = await generateAnnexXIII(worksheetId, session.user.id, 'sl');

          console.log(
            `[QC] ✅ Annex XIII generated successfully: ${annexDocument.id}`
          );
        }
      } catch (error) {
        // Log error but don't fail the QC approval
        console.error('[QC] ⚠️ Failed to generate Annex XIII:', error);
        annexGenerationError = error instanceof Error ? error.message : 'Unknown error';

        // Note: We don't throw here - QC approval succeeds even if document generation fails
        // The document can be generated manually later via the API
      }
    }

    // Check if this was auto-delivered (internal dentist)
    const finalWorksheet = await prisma.workSheet.findUnique({
      where: { id: worksheetId },
      select: {
        status: true,
        dentist: {
          select: {
            requiresInvoicing: true,
          },
        },
      },
    });

    const wasAutoDelivered = finalWorksheet?.status === 'DELIVERED';

    // Build response message
    let message = `Quality control completed: ${data.result}`;
    if (data.result === 'APPROVED') {
      if (wasAutoDelivered) {
        message += '. Worksheet auto-delivered (internal dentist, no invoice required).';
      } else {
        message += '. Worksheet approved and ready for invoicing.';
      }
      if (annexDocument && !annexGenerationError) {
        message += ' Annex XIII document generated.';
      } else if (annexGenerationError) {
        message += ' (Note: Annex XIII generation failed - can be generated manually)';
      }
    } else if (data.result === 'CONDITIONAL') {
      if (wasAutoDelivered) {
        message += '. Worksheet auto-delivered (internal dentist, no invoice required).';
      } else {
        message += '. Worksheet conditionally approved with notes.';
      }
      if (annexDocument && !annexGenerationError) {
        message += ' Annex XIII document generated.';
      } else if (annexGenerationError) {
        message += ' (Note: Annex XIII generation failed - can be generated manually)';
      }
    } else if (data.result === 'REJECTED') {
      message += '. Worksheet rejected and returned to production for rework.';
    }

    return successResponse(
      {
        qualityControl: result.qcRecord,
        worksheet: result.updatedWorksheet,
        annexXIII: annexDocument
          ? {
              id: annexDocument.id,
              generated: !annexGenerationError,
              error: annexGenerationError || undefined,
            }
          : undefined,
      },
      message
    );
  } catch (error) {
    return handleApiError(error);
  }
}
