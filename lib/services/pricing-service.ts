/**
 * Pricing Service
 *
 * Business logic for Product catalog management with price versioning history.
 * Includes CRUD operations, filtering, price change tracking, and audit logging.
 */

import { prisma } from '@/lib/prisma';
import {
  Product,
  ProductCategory,
  ProductPriceHistory,
  Prisma,
  AuditAction,
} from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductPriceDto,
  ProductFilters,
  ProductListResponse,
  ProductDetailResponse,
  PriceHistoryEntry,
} from '@/types/product';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// CODE AUTO-GENERATION
// ============================================================================

/**
 * Product category to 3-letter prefix mapping
 */
const PRODUCT_CATEGORY_PREFIXES: Record<string, string> = {
  CROWN: 'CRO',
  BRIDGE: 'BRI',
  FILLING: 'FIL',
  IMPLANT: 'IMP',
  DENTURE: 'DEN',
  INLAY: 'INL',
  ONLAY: 'ONL',
  VENEER: 'VEN',
  SPLINT: 'SPL',
  PROVISIONAL: 'PRV',
  TEMPLATE: 'TMP',
  ABUTMENT: 'ABT',
  SERVICE: 'SVC',
  REPAIR: 'REP',
  MODEL: 'MOD',
};

/**
 * Generate next sequential code for a product category
 * Format: XXX## (e.g., CRO01, BRI02, IMP03)
 */
export async function generateProductCode(category: string): Promise<string> {
  const prefix = PRODUCT_CATEGORY_PREFIXES[category] || 'PRD';

  // Find highest existing code with this prefix
  const existingProducts = await prisma.product.findMany({
    where: {
      code: { startsWith: prefix },
    },
    select: { code: true },
    orderBy: { code: 'desc' },
  });

  let nextNumber = 1;

  if (existingProducts.length > 0) {
    // Extract numbers from existing codes and find max
    for (const prod of existingProducts) {
      const numPart = prod.code.replace(prefix, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num >= nextNumber) {
        nextNumber = num + 1;
      }
    }
  }

  // Format with leading zero (01-99)
  const formattedNum = nextNumber.toString().padStart(2, '0');
  return `${prefix}${formattedNum}`;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Create audit log entry
 */
async function createAuditLog(
  userId: string,
  action: AuditAction,
  entityId: string,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
  reason?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType: 'Product',
      entityId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      reason,
    },
  });
}

/**
 * Get products with filtering, pagination, and sorting
 */
export async function getProducts(
  filters: ProductFilters = {}
): Promise<ProductListResponse> {
  const {
    category,
    active,
    search,
    page = 1,
    limit = 20,
    sortBy = 'code',
    sortOrder = 'asc',
  } = filters;

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    deletedAt: null, // Exclude soft-deleted products
  };

  if (category) {
    where.category = category;
  }

  if (active !== undefined) {
    where.active = active;
  }

  if (search) {
    where.OR = [
      {
        code: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  // Build orderBy clause
  const orderBy: Prisma.ProductOrderByWithRelationInput = {};
  orderBy[sortBy] = sortOrder;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    products,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get single product by ID with price history
 */
export async function getProductById(
  id: string
): Promise<ProductDetailResponse | null> {
  const product = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      priceHistory: {
        orderBy: {
          effectiveFrom: 'desc',
        },
      },
    },
  });

  return product as ProductDetailResponse | null;
}

/**
 * Create new product with initial price history entry
 */
export async function createProduct(
  data: CreateProductDto,
  userId: string
): Promise<Product> {
  // Validate code format and uniqueness
  const formattedCode = data.code.toUpperCase().trim();

  const existingProduct = await prisma.product.findFirst({
    where: {
      code: formattedCode,
      deletedAt: null,
    },
  });

  if (existingProduct) {
    throw new Error(`Product code ${formattedCode} already exists`);
  }

  const product = await prisma.$transaction(async (tx) => {
    // Create product
    const newProduct = await tx.product.create({
      data: {
        code: formattedCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        currentPrice: new Decimal(data.currentPrice),
        unit: data.unit || 'piece',
        active: data.active !== undefined ? data.active : true,
      },
    });

    // Create initial price history entry
    await tx.productPriceHistory.create({
      data: {
        productId: newProduct.id,
        price: new Decimal(data.currentPrice),
        effectiveFrom: new Date(),
        effectiveTo: null,
        reason: 'Initial price',
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE,
        entityType: 'Product',
        entityId: newProduct.id,
        newValues: JSON.stringify({
          code: newProduct.code,
          name: newProduct.name,
          category: newProduct.category,
          currentPrice: newProduct.currentPrice.toString(),
          unit: newProduct.unit,
          active: newProduct.active,
        }),
      },
    });

    return newProduct;
  });

  return product;
}

/**
 * Update product (general fields)
 * If price changes, creates new price history entry
 */
export async function updateProduct(
  id: string,
  data: UpdateProductDto,
  userId: string
): Promise<Product> {
  // Get existing product
  const existingProduct = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Validate code uniqueness if changing
  if (data.code) {
    const formattedCode = data.code.toUpperCase().trim();
    const codeExists = await prisma.product.findFirst({
      where: {
        code: formattedCode,
        deletedAt: null,
        NOT: { id },
      },
    });

    if (codeExists) {
      throw new Error(`Product code ${formattedCode} already exists`);
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    // Prepare update data
    const updateData: Prisma.ProductUpdateInput = {};

    if (data.code !== undefined) {
      updateData.code = data.code.toUpperCase().trim();
    }

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.unit !== undefined) {
      updateData.unit = data.unit;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    // Handle price change if provided
    if (data.currentPrice !== undefined) {
      const newPrice = new Decimal(data.currentPrice);
      const oldPrice = existingProduct.currentPrice;

      // Only create history entry if price actually changed
      if (!newPrice.equals(oldPrice)) {
        // Close current price history entry
        await tx.productPriceHistory.updateMany({
          where: {
            productId: id,
            effectiveTo: null,
          },
          data: {
            effectiveTo: new Date(),
          },
        });

        // Create new price history entry
        await tx.productPriceHistory.create({
          data: {
            productId: id,
            price: newPrice,
            effectiveFrom: new Date(),
            effectiveTo: null,
            reason: 'Price updated via product edit',
          },
        });

        updateData.currentPrice = newPrice;
      }
    }

    // Update product
    const updatedProduct = await tx.product.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Product',
        entityId: updatedProduct.id,
        oldValues: JSON.stringify({
          code: existingProduct.code,
          name: existingProduct.name,
          category: existingProduct.category,
          currentPrice: existingProduct.currentPrice.toString(),
          unit: existingProduct.unit,
          active: existingProduct.active,
        }),
        newValues: JSON.stringify({
          code: updatedProduct.code,
          name: updatedProduct.name,
          category: updatedProduct.category,
          currentPrice: updatedProduct.currentPrice.toString(),
          unit: updatedProduct.unit,
          active: updatedProduct.active,
        }),
      },
    });

    return updatedProduct;
  });

  return product;
}

/**
 * Update product price with reason (dedicated price change)
 */
export async function updateProductPrice(
  id: string,
  data: UpdateProductPriceDto,
  userId: string
): Promise<Product> {
  // Get existing product
  const existingProduct = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingProduct) {
    throw new Error('Product not found');
  }

  const newPrice = new Decimal(data.newPrice);
  const oldPrice = existingProduct.currentPrice;

  // Validate price is different
  if (newPrice.equals(oldPrice)) {
    throw new Error('New price must be different from current price');
  }

  // Validate reason is provided
  if (!data.reason || data.reason.trim().length === 0) {
    throw new Error('Reason for price change is required');
  }

  const product = await prisma.$transaction(async (tx) => {
    // Close current price history entry
    await tx.productPriceHistory.updateMany({
      where: {
        productId: id,
        effectiveTo: null,
      },
      data: {
        effectiveTo: new Date(),
      },
    });

    // Create new price history entry
    await tx.productPriceHistory.create({
      data: {
        productId: id,
        price: newPrice,
        effectiveFrom: new Date(),
        effectiveTo: null,
        reason: data.reason.trim(),
      },
    });

    // Update product current price
    const updatedProduct = await tx.product.update({
      where: { id },
      data: {
        currentPrice: newPrice,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Product',
        entityId: updatedProduct.id,
        oldValues: JSON.stringify({
          currentPrice: oldPrice.toString(),
        }),
        newValues: JSON.stringify({
          currentPrice: newPrice.toString(),
        }),
        reason: `Price change: ${data.reason}`,
      },
    });

    return updatedProduct;
  });

  return product;
}

/**
 * Soft delete product
 */
export async function deleteProduct(
  id: string,
  userId: string
): Promise<void> {
  // Get existing product
  const existingProduct = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Check if product is used in any worksheets
  const worksheetProductCount = await prisma.worksheetProduct.count({
    where: { productId: id },
  });

  if (worksheetProductCount > 0) {
    throw new Error(
      `Cannot delete product used in ${worksheetProductCount} worksheet(s). Set to inactive instead.`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete
    await tx.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE,
        entityType: 'Product',
        entityId: id,
        oldValues: JSON.stringify({
          code: existingProduct.code,
          name: existingProduct.name,
          category: existingProduct.category,
        }),
        reason: 'Soft deleted',
      },
    });
  });
}

/**
 * Get complete price history for a product
 */
export async function getPriceHistory(
  productId: string
): Promise<PriceHistoryEntry[]> {
  const history = await prisma.productPriceHistory.findMany({
    where: { productId },
    orderBy: {
      effectiveFrom: 'desc',
    },
  });

  return history.map((entry) => ({
    id: entry.id,
    price: parseFloat(entry.price.toString()),
    effectiveFrom: entry.effectiveFrom,
    effectiveTo: entry.effectiveTo,
    reason: entry.reason,
    createdAt: entry.createdAt,
  }));
}

/**
 * Get product statistics
 */
export async function getProductStats() {
  const [total, active, inactive, byCategory] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({
      where: { deletedAt: null, active: true },
    }),
    prisma.product.count({
      where: { deletedAt: null, active: false },
    }),
    prisma.product.groupBy({
      by: ['category'],
      where: { deletedAt: null, active: true },
      _count: true,
    }),
  ]);

  const categoryBreakdown = byCategory.reduce((acc, item) => {
    acc[item.category] = item._count;
    return acc;
  }, {} as Record<ProductCategory, number>);

  return {
    total,
    active,
    inactive,
    byCategory: categoryBreakdown,
  };
}
