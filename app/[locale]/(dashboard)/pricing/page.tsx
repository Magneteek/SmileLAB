/**
 * Pricing List Page
 *
 * Comprehensive product/pricing management with search, sort, filter, and CRUD operations.
 * Displays all dental products with their codes, names, prices, and categories.
 *
 * Features:
 * - DataTable with search, sort, and filter
 * - Add/Edit/Delete products
 * - Bulk import functionality
 * - Price history tracking
 * - Category/group filtering
 *
 * Route: /pricing
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Upload,
  Download,
  AlertCircle,
} from 'lucide-react';
import ProductsTable from '@/components/pricing/ProductsTable';
import { ProductImportDialog } from '@/components/pricing/ProductImportDialog';

// ============================================================================
// TYPES
// ============================================================================

import { ProductCategory } from '@prisma/client';

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  currentPrice: number;
  unit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    priceHistory: number;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PricingListPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslations('pricing');

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  // Handle export
  const handleExport = async () => {
    try {
      window.location.href = '/api/products/export';
    } catch (err) {
      setError('Export failed');
    }
  };

  // Handle import complete
  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/products');

        if (!response.ok) {
          throw new Error('Failed to load products');
        }

        const result = await response.json();
        setProducts(result.data || []);
        setFilteredProducts(result.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [refreshTrigger]);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, products]);

  // Get unique categories
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Handle refresh after bulk operations
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('import')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
          <Link href="/pricing/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('addProduct')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('categoryFilter')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="all">{t('allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat || ''}>
                    {t(`category${cat}` as any)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            {t('results', { count: filteredProducts.length })} / {products.length}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-6">
          <ProductsTable
            products={filteredProducts}
            loading={isLoading}
            isAdmin={isAdmin}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ProductImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
