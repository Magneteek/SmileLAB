/**
 * Products Table Component
 *
 * Displays product catalog in a table with sorting and actions.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Product } from '@prisma/client';
import { formatCurrency, PRODUCT_CATEGORY_COLORS } from '@/types/product';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
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

export default function ProductsTable({
  products,
  loading,
  isAdmin,
  onRefresh,
}: ProductsTableProps) {
  const t = useTranslations('pricing');
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleRowClick = (productId: string) => {
    router.push(`/pricing/${productId}`);
  };

  const handleEdit = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    router.push(`/pricing/${productId}`);
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell className="font-mono font-medium">{product.code}</TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProductTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteProductMessage', { name: productToDelete?.name || '', code: productToDelete?.code || '' })}
              <br />
              <br />
              {t('deleteWarning')}
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
    </>
  );
}
