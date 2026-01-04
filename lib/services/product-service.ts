/**
 * Product Service - Business Logic for Product Management
 *
 * Handles all product-related database operations including:
 * - Product CRUD operations
 * - Price history tracking
 * - Product catalog management
 * - Category management
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

import { ProductCategory } from '@prisma/client';

export interface CreateProductDto {
  code: string;
  name: string;
  description?: string | null;
  category: ProductCategory;
  currentPrice: number;
  unit: string;
  active?: boolean;
}

export interface UpdateProductDto {
  code?: string;
  name?: string;
  description?: string | null;
  category?: ProductCategory;
  currentPrice?: number;
  unit?: string;
  active?: boolean;
}

export interface ProductListFilters {
  search?: string;
  category?: ProductCategory;
  active?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// PRODUCT SERVICE
// ============================================================================

export class ProductService {
  /**
   * Get all products with optional filters
   */
  async list(filters: ProductListFilters = {}) {
    const {
      search,
      category,
      active,
      limit = 100,
      offset = 0,
    } = filters;

    const where: Prisma.ProductWhereInput = {};

    // Search filter (code, name, description)
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Active status filter
    if (typeof active === 'boolean') {
      where.active = active;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [
          { active: 'desc' }, // Active products first
          { code: 'asc' },
        ],
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              priceHistory: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get single product by ID
   */
  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        priceHistory: {
          orderBy: { effectiveFrom: 'desc' },
          take: 10, // Last 10 price changes
        },
        _count: {
          select: {
            priceHistory: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Get single product by code
   */
  async getByCode(code: string) {
    const product = await prisma.product.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            priceHistory: true,
          },
        },
      },
    });

    return product;
  }

  /**
   * Create new product
   */
  async create(data: CreateProductDto, userId: string) {
    // Check if product code already exists
    const existing = await this.getByCode(data.code);
    if (existing) {
      throw new Error(`Product with code '${data.code}' already exists`);
    }

    // Create product and initial price history in transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          category: data.category,
          currentPrice: data.currentPrice,
          unit: data.unit,
          active: data.active ?? true,
        },
      });

      // Create initial price history record
      await tx.productPriceHistory.create({
        data: {
          productId: newProduct.id,
          price: data.currentPrice,
          effectiveFrom: new Date(),
          reason: 'Initial price',
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'Product',
          entityId: newProduct.id,
          oldValues: null,
          newValues: JSON.stringify({
            code: newProduct.code,
            name: newProduct.name,
            currentPrice: newProduct.currentPrice,
          }),
        },
      });

      return newProduct;
    });

    return product;
  }

  /**
   * Update existing product
   */
  async update(id: string, data: UpdateProductDto, userId: string) {
    const existing = await this.getById(id);

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existing.code) {
      const duplicate = await this.getByCode(data.code);
      if (duplicate) {
        throw new Error(`Product with code '${data.code}' already exists`);
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          category: data.category,
          currentPrice: data.currentPrice,
          unit: data.unit,
          active: data.active,
        },
      });

      // If price changed, create price history record
      if (data.currentPrice && data.currentPrice.toString() !== existing.currentPrice.toString()) {
        await tx.productPriceHistory.create({
          data: {
            productId: updated.id,
            price: data.currentPrice,
            effectiveFrom: new Date(),
            reason: 'Price updated',
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entityType: 'Product',
          entityId: updated.id,
          oldValues: JSON.stringify({
            code: existing.code,
            name: existing.name,
            currentPrice: existing.currentPrice.toString(),
          }),
          newValues: JSON.stringify({
            code: updated.code,
            name: updated.name,
            currentPrice: updated.currentPrice.toString(),
          }),
        },
      });

      return updated;
    });

    return product;
  }

  /**
   * Delete product (soft delete by setting active = false)
   */
  async delete(id: string, userId: string) {
    const existing = await this.getById(id);

    const product = await prisma.$transaction(async (tx) => {
      const deleted = await tx.product.update({
        where: { id },
        data: {
          active: false,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          entityType: 'Product',
          entityId: deleted.id,
          oldValues: JSON.stringify({
            active: existing.active,
          }),
          newValues: JSON.stringify({
            active: false,
          }),
        },
      });

      return deleted;
    });

    return product;
  }

  /**
   * Get all unique categories
   */
  async getCategories() {
    const products = await prisma.product.findMany({
      where: {
        category: { not: null },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    return products
      .map((p) => p.category)
      .filter((c): c is string => c !== null);
  }

  /**
   * Search products for autocomplete
   */
  async search(query: string, limit = 10) {
    const products = await prisma.product.findMany({
      where: {
        AND: [
          { active: true },
          {
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: {
        code: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        currentPrice: true,
        unit: true,
      },
    });

    return products;
  }
}

// Export singleton instance
export const productService = new ProductService();
