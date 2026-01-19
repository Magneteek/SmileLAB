/**
 * SOP Service
 *
 * Business logic for Standard Operating Procedures management
 * Handles CRUD operations, versioning, and approval workflows
 */

import { prisma } from '@/lib/prisma';
import { SOPCategory, SOPStatus } from '@prisma/client';

export interface CreateSOPData {
  code?: string;
  title: string;
  category: SOPCategory;
  content: string;
  pdfPath?: string;
  createdById: string;
}

export interface UpdateSOPData {
  title?: string;
  category?: SOPCategory;
  content?: string;
  pdfPath?: string;
  status?: SOPStatus;
}

export interface SOPFilters {
  category?: SOPCategory;
  status?: SOPStatus;
  search?: string;
}

export class SOPService {
  /**
   * Generate next SOP code (SOP-001, SOP-002, etc.)
   */
  async generateSOPCode(): Promise<string> {
    const lastSOP = await prisma.sOP.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    if (!lastSOP) {
      return 'SOP-001';
    }

    // Extract number from code (e.g., "SOP-001" -> 1)
    const match = lastSOP.code.match(/SOP-(\d+)/);
    if (!match) {
      return 'SOP-001';
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `SOP-${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Create new SOP
   */
  async createSOP(data: CreateSOPData) {
    const code = data.code || await this.generateSOPCode();

    const sop = await prisma.sOP.create({
      data: {
        code,
        title: data.title,
        category: data.category,
        content: data.content,
        pdfPath: data.pdfPath,
        versionNumber: '1.0',
        status: SOPStatus.DRAFT,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sop;
  }

  /**
   * Get all SOPs with filters
   */
  async getSOPs(filters: SOPFilters = {}) {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sops = await prisma.sOP.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            acknowledgments: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // DRAFT, APPROVED, ARCHIVED
        { code: 'asc' },
      ],
    });

    return sops;
  }

  /**
   * Get single SOP by ID
   */
  async getSOPById(id: string) {
    const sop = await prisma.sOP.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acknowledgments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            acknowledgedAt: 'desc',
          },
        },
      },
    });

    return sop;
  }

  /**
   * Update SOP (creates new version if APPROVED)
   */
  async updateSOP(id: string, data: UpdateSOPData, userId: string) {
    const existingSOP = await prisma.sOP.findUnique({
      where: { id },
    });

    if (!existingSOP) {
      throw new Error('SOP not found');
    }

    // If SOP is APPROVED, create new version
    if (existingSOP.status === SOPStatus.APPROVED) {
      // Archive old version
      await prisma.sOP.update({
        where: { id },
        data: { status: SOPStatus.ARCHIVED },
      });

      // Increment version number
      const [major, minor] = existingSOP.versionNumber.split('.').map(Number);
      const newVersion = data.content !== existingSOP.content
        ? `${major + 1}.0` // Major change if content changed
        : `${major}.${minor + 1}`; // Minor change otherwise

      // Create new version
      const newSOP = await prisma.sOP.create({
        data: {
          code: existingSOP.code,
          title: data.title || existingSOP.title,
          category: data.category || existingSOP.category,
          content: data.content || existingSOP.content,
          pdfPath: data.pdfPath || existingSOP.pdfPath,
          versionNumber: newVersion,
          previousVersionId: existingSOP.id,
          status: SOPStatus.DRAFT,
          createdById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return newSOP;
    }

    // If DRAFT, just update
    const updatedSOP = await prisma.sOP.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        content: data.content,
        pdfPath: data.pdfPath,
        status: data.status,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedSOP;
  }

  /**
   * Approve SOP
   */
  async approveSOP(id: string, approvedById: string) {
    const sop = await prisma.sOP.update({
      where: { id },
      data: {
        status: SOPStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sop;
  }

  /**
   * Delete SOP (only if DRAFT)
   */
  async deleteSOP(id: string) {
    const sop = await prisma.sOP.findUnique({
      where: { id },
    });

    if (!sop) {
      throw new Error('SOP not found');
    }

    if (sop.status !== SOPStatus.DRAFT) {
      throw new Error('Can only delete DRAFT SOPs. Approved SOPs must be archived.');
    }

    await prisma.sOP.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Get version history for an SOP code
   */
  async getVersionHistory(code: string) {
    const versions = await prisma.sOP.findMany({
      where: { code },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return versions;
  }

  /**
   * Get approved SOPs only (for staff view)
   */
  async getApprovedSOPs(filters: { category?: SOPCategory; search?: string } = {}) {
    const where: any = {
      status: SOPStatus.APPROVED,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sops = await prisma.sOP.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        versionNumber: true,
        approvedAt: true,
        createdAt: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return sops;
  }

  /**
   * Check if user has acknowledged an SOP
   */
  async hasUserAcknowledged(sopId: string, userId: string): Promise<boolean> {
    const acknowledgment = await prisma.sOPAcknowledgment.findUnique({
      where: {
        sopId_userId: {
          sopId,
          userId,
        },
      },
    });

    return !!acknowledgment;
  }

  /**
   * Acknowledge SOP (staff action)
   */
  async acknowledgeSOP(sopId: string, userId: string, ipAddress?: string) {
    // Check if already acknowledged
    const existing = await prisma.sOPAcknowledgment.findUnique({
      where: {
        sopId_userId: {
          sopId,
          userId,
        },
      },
    });

    if (existing) {
      throw new Error('SOP already acknowledged');
    }

    const acknowledgment = await prisma.sOPAcknowledgment.create({
      data: {
        sopId,
        userId,
        ipAddress,
      },
      include: {
        sop: {
          select: {
            code: true,
            title: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return acknowledgment;
  }

  /**
   * Get user's acknowledgment history
   */
  async getUserAcknowledgments(userId: string) {
    const acknowledgments = await prisma.sOPAcknowledgment.findMany({
      where: { userId },
      include: {
        sop: {
          select: {
            id: true,
            code: true,
            title: true,
            category: true,
            versionNumber: true,
          },
        },
      },
      orderBy: {
        acknowledgedAt: 'desc',
      },
    });

    return acknowledgments;
  }
}

export const sopService = new SOPService();
