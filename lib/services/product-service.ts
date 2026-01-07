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
    console.log('[ProductService] update called:', { id, data, userId });

    const existing = await this.getById(id);
    console.log('[ProductService] Existing product:', {
      id: existing.id,
      code: existing.code,
      name: existing.name,
    });

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existing.code) {
      console.log('[ProductService] Code changed, checking for duplicates');
      const duplicate = await this.getByCode(data.code);
      if (duplicate) {
        console.error('[ProductService] Duplicate code found:', duplicate.code);
        throw new Error(`Product with code '${data.code}' already exists`);
      }
    } else {
      console.log('[ProductService] Code unchanged or not provided');
    }

    const product = await prisma.$transaction(async (tx) => {
      console.log('[ProductService] Updating product in transaction');
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

    console.log('[ProductService] Update successful:', product.id);
    return product;
  }

  /**
   * Delete product (hard delete)
   */
  async delete(id: string, userId: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            worksheetProducts: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Product not found');
    }

    // Check if product is in use
    if (existing._count.worksheetProducts > 0) {
      throw new Error(
        `Cannot delete product "${existing.code}" - it is referenced in ${existing._count.worksheetProducts} worksheet(s). ` +
        `Please remove it from all worksheets first.`
      );
    }

    await prisma.$transaction(async (tx) => {
      // Audit log before deletion
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          entityType: 'Product',
          entityId: id,
          oldValues: JSON.stringify({
            code: existing.code,
            name: existing.name,
            category: existing.category,
            currentPrice: existing.currentPrice.toString(),
          }),
          newValues: null,
        },
      });

      // Delete related price history first
      await tx.productPriceHistory.deleteMany({
        where: { productId: id },
      });

      // Delete the product
      await tx.product.delete({
        where: { id },
      });
    });

    return existing;
  }

  /**
   * Bulk delete products
   */
  async bulkDelete(ids: string[], userId: string) {
    console.log('[ProductService] bulkDelete called:', { ids, userId });

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: {
            worksheetProducts: true,
          },
        },
      },
    });

    console.log('[ProductService] Found products:', products.length);

    // Check if any products are in use
    const productsInUse = products.filter((p) => p._count.worksheetProducts > 0);
    if (productsInUse.length > 0) {
      const productCodes = productsInUse.map((p) => p.code).join(', ');
      throw new Error(
        `Cannot delete products that are in use in worksheets: ${productCodes}. ` +
        `These products are referenced in ${productsInUse.reduce((sum, p) => sum + p._count.worksheetProducts, 0)} worksheet(s).`
      );
    }

    await prisma.$transaction(async (tx) => {
      // Create audit logs for each deletion
      for (const product of products) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'DELETE',
            entityType: 'Product',
            entityId: product.id,
            reason: `Bulk delete: ${product.code} - ${product.name}`,
            oldValues: JSON.stringify({
              code: product.code,
              name: product.name,
              category: product.category,
              currentPrice: product.currentPrice.toString(),
            }),
            newValues: null,
          },
        });
      }

      // Delete price histories
      await tx.productPriceHistory.deleteMany({
        where: { productId: { in: ids } },
      });

      // Delete products
      await tx.product.deleteMany({
        where: { id: { in: ids } },
      });
    });

    console.log('[ProductService] Bulk delete completed successfully');
    return { count: products.length };
  }

  /**
   * Bulk update products
   */
  async bulkUpdate(
    ids: string[],
    data: { active?: boolean; category?: ProductCategory },
    userId: string
  ) {
    console.log('[ProductService] bulkUpdate called:', { ids, data, userId });

    if (ids.length === 0) {
      throw new Error('No product IDs provided');
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
    });

    console.log('[ProductService] Found products:', products.length);

    if (products.length === 0) {
      throw new Error('No products found with provided IDs');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update all products
      const result = await tx.product.updateMany({
        where: { id: { in: ids } },
        data,
      });

      console.log('[ProductService] Updated products:', result.count);

      // Create audit logs
      for (const product of products) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'UPDATE',
            entityType: 'Product',
            entityId: product.id,
            reason: `Bulk update: ${product.code}`,
            oldValues: JSON.stringify({
              active: product.active,
              category: product.category,
            }),
            newValues: JSON.stringify(data),
          },
        });
      }

      return result;
    });

    console.log('[ProductService] bulkUpdate completed successfully');
    return { count: updated.count };
  }

  /**
   * Get all unique categories
   */
  async getCategories() {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null, // Only active products
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    return products.map((p) => p.category);
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
