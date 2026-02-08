'use client';

/**
 * ProductSelector - Multi-Select Product Selection Component
 *
 * Interactive component for selecting dental products from the pricing list.
 * Supports search, filtering by category, multi-select, and quantity input.
 * Captures price at selection time for historical accuracy (price versioning).
 *
 * Features:
 * - Search products by code or name
 * - Filter by product category
 * - Multi-select with quantity input
 * - Price versioning (priceAtSelection)
 * - Real-time cost calculation
 * - Replace all pattern support
 * - Responsive design
 * - Read-only mode for viewing existing selections
 *
 * @example
 * ```tsx
 * const [selectedProducts, setSelectedProducts] = useState([]);
 *
 * <ProductSelector
 *   selectedProducts={selectedProducts}
 *   onProductsChange={setSelectedProducts}
 *   readOnly={false}
 * />
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Loader2, PackagePlus, AlertCircle, Package } from 'lucide-react';
import type { Product, ProductCategory } from '@prisma/client';
import { ProductMaterialInstance } from '@/src/types/worksheet';
import { ProductMaterialEditor } from './ProductMaterialEditor';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductSelection {
  productId: string;
  quantity: number;
  priceAtSelection: number;
  notes?: string;
  worksheetProductId?: string; // WorksheetProduct ID (for existing products when editing)
  materials?: ProductMaterialInstance[]; // Updated to support multiple instances with LOT/tooth/notes
  // For display purposes
  code?: string;
  name?: string;
  unit?: string;
}

interface ProductSelectorProps {
  /**
   * Currently selected products with quantities
   */
  selectedProducts: ProductSelection[];

  /**
   * Callback when product selection changes
   */
  onProductsChange: (products: ProductSelection[]) => void;

  /**
   * Available materials for assignment to products (with LOT data)
   */
  availableMaterials?: Array<{
    materialId: string;
    code: string;
    name: string;
    unit: string;
    availableStock: number;
    lots: Array<{
      id: string;
      lotNumber: string;
      quantityAvailable: number;
      expiryDate: string | null;
      arrivalDate: string;
      status: string;
    }>;
  }>;

  /**
   * Available teeth from worksheet (for tooth association)
   */
  availableTeeth?: string[];

  /**
   * Read-only mode (no editing)
   */
  readOnly?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

// Product categories for filtering
const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'FIKSNA_PROTETIKA', label: 'Fixed Prosthetics' },
  { value: 'SNEMNA_PROTETIKA', label: 'Removable Prosthetics' },
  { value: 'IMPLANTOLOGIJA', label: 'Implantology' },
  { value: 'ESTETIKA', label: 'Aesthetics' },
  { value: 'OSTALO', label: 'Other' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductSelector({
  selectedProducts,
  onProductsChange,
  availableMaterials = [],
  availableTeeth = [],
  readOnly = false,
  className,
}: ProductSelectorProps) {
  const t = useTranslations();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'ALL'>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // ============================================================================
  // FETCH PRODUCTS
  // ============================================================================

  /**
   * Fetch products from API with filters
   */
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        active: 'true', // Only active products
        sortBy: 'code',
        sortOrder: 'asc',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (categoryFilter !== 'ALL') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/products?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const result = await response.json();
      setProducts(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, categoryFilter]);

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ============================================================================
  // PRODUCT SELECTION HANDLERS
  // ============================================================================

  /**
   * Check if product is selected
   */
  const isProductSelected = (productId: string): boolean => {
    return selectedProducts.some((p) => p.productId === productId);
  };

  /**
   * Get selected product data
   */
  const getSelectedProduct = (productId: string): ProductSelection | undefined => {
    return selectedProducts.find((p) => p.productId === productId);
  };

  /**
   * Toggle product selection
   */
  const toggleProduct = (product: Product) => {
    if (readOnly) return;

    if (isProductSelected(product.id)) {
      // Deselect
      onProductsChange(selectedProducts.filter((p) => p.productId !== product.id));
    } else {
      // Select with default quantity and current price
      onProductsChange([
        ...selectedProducts,
        {
          productId: product.id,
          quantity: 1,
          priceAtSelection: Number(product.currentPrice),
          code: product.code,
          name: product.name,
          unit: product.unit,
          materials: [],  // Initialize empty materials array
        },
      ]);
    }
  };

  /**
   * Update product quantity
   */
  const updateQuantity = (productId: string, quantity: number) => {
    if (readOnly) return;

    if (quantity < 1) {
      // Remove if quantity is less than 1
      onProductsChange(selectedProducts.filter((p) => p.productId !== productId));
      return;
    }

    onProductsChange(
      selectedProducts.map((p) =>
        p.productId === productId ? { ...p, quantity } : p
      )
    );
  };

  /**
   * Deprecated: Material management now handled by ProductMaterialEditor component
   * Keeping function signature for backwards compatibility during transition
   */
  // const updateMaterials = (productId: string, materialId: string, action: 'add' | 'remove', quantity: number = 1) => { ... };

  /**
   * Remove product
   */
  const removeProduct = (productId: string) => {
    if (readOnly) return;
    onProductsChange(selectedProducts.filter((p) => p.productId !== productId));
  };

  /**
   * Clear all selections
   */
  const clearAll = () => {
    if (readOnly) return;
    onProductsChange([]);
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  /**
   * Calculate total cost
   */
  const totalCost = useMemo(() => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.quantity * p.priceAtSelection,
      0
    );
  }, [selectedProducts]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={className}>
      {/* 70/30 Grid Layout: Selected Products (70%) | Browse Products (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* Left Column: Selected Products (70%) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {t('productSelector.selectedProductsTitle', { count: selectedProducts.length })}
              </CardTitle>
              {!readOnly && selectedProducts.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                >
                  {t('productSelector.clearAll')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <PackagePlus className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">{t('productSelector.noProductsSelected')}</p>
                <p className="text-xs mt-1">{t('productSelector.selectInstruction')}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {selectedProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {/* Product Header - Compact single row */}
                    <div className="flex items-center gap-2 mb-2">
                      {/* Product Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {product.code} - {product.name}
                        </p>
                      </div>

                      {/* Materials Counter */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Package className="h-3.5 w-3.5" />
                        <span className="font-medium">{product.materials?.length || 0}</span>
                      </div>

                      {!readOnly && (
                        <>
                          {/* Quantity Input */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">{t('productSelector.qtyLabel')}</span>
                            <Input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) =>
                                updateQuantity(
                                  product.productId,
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="w-14 h-7 text-xs"
                            />
                          </div>

                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(product.productId)}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Materials Section - New ProductMaterialEditor Component */}
                    {availableMaterials && availableMaterials.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <ProductMaterialEditor
                          productId={product.productId}
                          productName={product.name || ''}
                          materials={product.materials || []}
                          availableMaterials={availableMaterials}
                          availableTeeth={availableTeeth || []}
                          onChange={(materials) => {
                            onProductsChange(
                              selectedProducts.map((p) =>
                                p.productId === product.productId
                                  ? { ...p, materials }
                                  : p
                              )
                            );
                          }}
                          readOnly={readOnly}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Product Browser (30%) */}
        <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-4 w-4" />
            {t('productSelector.browseProducts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="product-search" className="text-xs">{t('productSelector.searchLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="product-search"
                  placeholder={t('productSelector.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // Reset to first page
                  }}
                  className="pl-10 h-8 text-xs"
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label htmlFor="category-filter" className="text-xs">{t('productSelector.categoryLabel')}</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value as ProductCategory | 'ALL');
                  setPage(1); // Reset to first page
                }}
                disabled={readOnly}
              >
                <SelectTrigger id="category-filter" className="h-8 text-xs">
                  <SelectValue placeholder={t('productSelector.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">{t('productSelector.allCategories')}</SelectItem>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products List */}
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-xs text-gray-600">{t('productSelector.loadingProducts')}</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <PackagePlus className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-xs">{t('productSelector.noProductsFound')}</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {products.map((product) => {
                  const selected = isProductSelected(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        selected ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                      onClick={() => !readOnly && toggleProduct(product)}
                    >
                      <div className="flex items-start gap-2">
                        {!readOnly && (
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleProduct(product)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 h-3.5 w-3.5"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">
                            {product.code} - {product.name}
                          </p>
                          {product.description && (
                            <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && products.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || readOnly}
                className="h-7 text-xs"
              >
                {t('productSelector.paginationPrevious')}
              </Button>
              <span className="text-xs text-gray-600">
                {t('productSelector.paginationLabel', { page, totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || readOnly}
                className="h-7 text-xs"
              >
                {t('productSelector.paginationNext')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
