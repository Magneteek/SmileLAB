'use client';

/**
 * Product Selector Dialog Component
 *
 * Allows selecting products from the pricing list to add to invoices
 * Features:
 * - Search by product name/code
 * - Filter by category
 * - Quantity input
 * - Current price display
 */

import { useState, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  currentPrice: number;
  unit: string;
  active: boolean;
}

interface ProductSelectorDialogProps {
  onSelect: (product: Product, quantity: number) => void;
  trigger?: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductSelectorDialog({
  onSelect,
  trigger,
}: ProductSelectorDialogProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Load products when dialog opens
  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  // Filter products when search or category changes
  useEffect(() => {
    filterProducts();
  }, [searchQuery, categoryFilter, products]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products?active=true&limit=1000');
      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const result = await response.json();
      const productsData = result.data || result;

      // Convert Decimal prices to numbers
      const formattedProducts = productsData.map((p: any) => {
        let price = p.currentPrice;

        // Handle Prisma Decimal objects
        if (price && typeof price === 'object') {
          if (typeof price.toNumber === 'function') {
            price = price.toNumber();
          } else {
            price = Number(price);
          }
        }

        return {
          ...p,
          currentPrice: Number(price),
        };
      });

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast({
        title: t('invoices.errorTitle'),
        description: t('invoices.failedLoadProducts'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1); // Reset quantity to 1
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast({
        title: t('invoices.noProductSelectedTitle'),
        description: t('invoices.noProductSelectedDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (quantity < 1) {
      toast({
        title: t('invoices.invalidQuantityTitle'),
        description: t('invoices.invalidQuantityDescription'),
        variant: 'destructive',
      });
      return;
    }

    onSelect(selectedProduct, quantity);

    // Reset and close
    setSelectedProduct(null);
    setQuantity(1);
    setSearchQuery('');
    setCategoryFilter('all');
    setOpen(false);

    toast({
      title: t('invoices.productAddedTitle'),
      description: t('invoices.productAddedDescription', { name: selectedProduct.name }),
    });
  };

  /**
   * Handle double-click on product - add with quantity 1 directly
   */
  const handleDoubleClickProduct = (product: Product) => {
    onSelect(product, 1);

    // Reset and close
    setSelectedProduct(null);
    setQuantity(1);
    setSearchQuery('');
    setCategoryFilter('all');
    setOpen(false);

    toast({
      title: t('invoices.productAddedTitle'),
      description: t('invoices.productAddedDescription', { name: product.name }),
    });
  };

  const getUniqueCategories = () => {
    const categories = new Set(products.map((p) => p.category));
    return Array.from(categories).sort();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Package className="h-4 w-4 mr-2" />
            {t('invoices.addFromPricingListButton')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[54rem] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('invoices.addProductTitle')}</DialogTitle>
          <DialogDescription>
            {t('invoices.addProductDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
            <div>
              <Label htmlFor="search" className="text-sm">{t('invoices.searchProductsLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={t('invoices.searchProductsPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category" className="text-sm">{t('invoices.categoryLabel')}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('invoices.allCategories')}</SelectItem>
                  {getUniqueCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products List */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[300px] sm:h-[350px] md:h-[400px]">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {t('invoices.loadingProducts')}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {t('invoices.noProductsFound')}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`px-3 py-2 cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedProduct?.id === product.id
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : ''
                      }`}
                      onClick={() => handleSelectProduct(product)}
                      onDoubleClick={() => handleDoubleClickProduct(product)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0 self-start">
                            {product.category}
                          </Badge>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-sm font-bold text-blue-600">
                            €{Number(product.currentPrice || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Product and Quantity */}
          {selectedProduct && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 break-words">
                    {t('invoices.selectedProduct', { code: selectedProduct.code, name: selectedProduct.name })}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t('invoices.pricePerUnit', { price: Number(selectedProduct.currentPrice || 0).toFixed(2), unit: selectedProduct.unit })}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quantity" className="text-xs whitespace-nowrap">
                      {t('invoices.quantityLabel')}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <p className="text-xs text-blue-700">{t('invoices.totalLabel')}:</p>
                    <p className="text-base font-bold text-blue-900">
                      €{(Number(selectedProduct.currentPrice || 0) * quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelectedProduct(null);
                setQuantity(1);
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="w-full sm:w-auto"
            >
              {t('invoices.cancelButton')}
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={!selectedProduct}
              className="w-full sm:w-auto"
            >
              {t('invoices.addProductButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
