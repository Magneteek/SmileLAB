/**
 * Products Table Component
 *
 * Displays product catalog in a table with sorting, multi-select, and bulk actions.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ProductCategory } from '@prisma/client';
import { formatCurrency, PRODUCT_CATEGORY_COLORS } from '@/types/product';

// Serialized Product type (JSON from API - dates as strings)
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
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Eye, Edit, Trash2, CheckSquare, XSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}

// Capitalize only the first letter of the first word
const capitalizeFirstWord = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default function ProductsTable({
  products,
  loading,
  isAdmin,
  onRefresh,
}: ProductsTableProps) {
  const t = useTranslations('pricing');
  const router = useRouter();

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk actions dialog state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<boolean>(true);
  const [bulkCategory, setBulkCategory] = useState<ProductCategory>('CROWN');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Multi-select handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
      setSelectAll(true);
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === products.length);
  };

  const handleRowClick = (productId: string) => {
    router.push(`/pricing/${productId}/edit`);
  };

  const handleEdit = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    router.push(`/pricing/${productId}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete product');
        return;
      }

      onRefresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    setBulkProcessing(true);
    try {
      const response = await fetch('/api/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete products');
        return;
      }

      setSelectedIds(new Set());
      setSelectAll(false);
      onRefresh();
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      alert('Failed to delete products');
    } finally {
      setBulkProcessing(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleBulkStatusChange = async () => {
    setBulkProcessing(true);
    try {
      const response = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          data: { active: bulkStatus },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update products');
        return;
      }

      setSelectedIds(new Set());
      setSelectAll(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating products:', error);
      alert('Failed to update products');
    } finally {
      setBulkProcessing(false);
      setBulkStatusDialogOpen(false);
    }
  };

  const handleBulkCategoryChange = async () => {
    setBulkProcessing(true);
    try {
      const response = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          data: { category: bulkCategory },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update products');
        return;
      }

      setSelectedIds(new Set());
      setSelectAll(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating products:', error);
      alert('Failed to update products');
    } finally {
      setBulkProcessing(false);
      setBulkCategoryDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('loadingProducts')}</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground mb-2">{t('noProductsFound')}</p>
        <p className="text-sm text-muted-foreground">
          {t('tryAdjustingFilters')}
        </p>
      </div>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && isAdmin && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedCount} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkStatusDialogOpen(true)}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Change Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkCategoryDialogOpen(true)}
            >
              Change Category
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            {isAdmin && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>{t('tableHeaderCode')}</TableHead>
            <TableHead>{t('tableHeaderName')}</TableHead>
            <TableHead>{t('tableHeaderCategory')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderPrice')}</TableHead>
            <TableHead>{t('tableHeaderUnit')}</TableHead>
            <TableHead>{t('tableHeaderStatus')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(product.id)}
            >
              {isAdmin && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => handleSelectRow(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-mono font-medium">{product.code}</TableCell>
              <TableCell className="font-medium">{capitalizeFirstWord(product.name)}</TableCell>
              <TableCell>
                <Badge className={PRODUCT_CATEGORY_COLORS[product.category]}>
                  {t(`category${product.category}` as any)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(parseFloat(product.currentPrice.toString()))}
              </TableCell>
              <TableCell className="capitalize">{product.unit}</TableCell>
              <TableCell>
                <Badge variant={product.active ? 'default' : 'secondary'}>
                  {product.active ? t('active') : t('inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">{t('openMenu')}</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('actionsMenu')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => handleEdit(e, product.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('viewDetails')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={(e) => handleEdit(e, product.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(e, product)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProductTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich('deleteProductMessage', {
                name: productToDelete?.name || '',
                code: productToDelete?.code || '',
                strong: (chunks) => <strong>{chunks}</strong>
              })}
              <br />
              <br />
              <strong className="text-destructive">{t('deleteWarning')}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Products?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedCount} selected products?
              <br />
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkProcessing}>
              {bulkProcessing ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <AlertDialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status for {selectedCount} Products</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 mt-4 px-6">
            <div>
              <label className="text-sm font-medium mb-2 block">New Status:</label>
              <Select
                value={bulkStatus.toString()}
                onValueChange={(v) => setBulkStatus(v === 'true')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusChange} disabled={bulkProcessing}>
              {bulkProcessing ? 'Updating...' : 'Update Status'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Category Change Dialog */}
      <AlertDialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Category for {selectedCount} Products</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 mt-4 px-6">
            <div>
              <label className="text-sm font-medium mb-2 block">New Category:</label>
              <Select
                value={bulkCategory}
                onValueChange={(v) => setBulkCategory(v as ProductCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CROWN">{t('categoryCROWN')}</SelectItem>
                  <SelectItem value="BRIDGE">{t('categoryBRIDGE')}</SelectItem>
                  <SelectItem value="FILLING">{t('categoryFILLING')}</SelectItem>
                  <SelectItem value="IMPLANT">{t('categoryIMPLANT')}</SelectItem>
                  <SelectItem value="DENTURE">{t('categoryDENTURE')}</SelectItem>
                  <SelectItem value="INLAY">{t('categoryINLAY')}</SelectItem>
                  <SelectItem value="ONLAY">{t('categoryONLAY')}</SelectItem>
                  <SelectItem value="VENEER">{t('categoryVENEER')}</SelectItem>
                  <SelectItem value="SPLINT">{t('categorySPLINT')}</SelectItem>
                  <SelectItem value="PROVISIONAL">{t('categoryPROVISIONAL')}</SelectItem>
                  <SelectItem value="TEMPLATE">{t('categoryTEMPLATE')}</SelectItem>
                  <SelectItem value="ABUTMENT">{t('categoryABUTMENT')}</SelectItem>
                  <SelectItem value="SERVICE">{t('categorySERVICE')}</SelectItem>
                  <SelectItem value="REPAIR">{t('categoryREPAIR')}</SelectItem>
                  <SelectItem value="MODEL">{t('categoryMODEL')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkCategoryChange} disabled={bulkProcessing}>
              {bulkProcessing ? 'Updating...' : 'Update Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
