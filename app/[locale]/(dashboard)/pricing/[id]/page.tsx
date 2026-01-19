/**
 * Product Detail/Edit Page
 *
 * View product details, edit product, view price history, and update prices.
 * ADMIN-only can edit/delete. All users can view.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Product, ProductPriceHistory } from '@prisma/client';
import { ProductDetailResponse, formatCurrency, PRODUCT_CATEGORY_LABELS } from '@/types/product';
import ProductForm from '@/components/pricing/ProductForm';
import PriceHistoryTimeline from '@/components/pricing/PriceHistoryTimeline';
import UpdatePriceDialog from '@/components/pricing/UpdatePriceDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, DollarSign, History } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface ProductDetailPageProps {
  params: { id: string };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${params.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }

      const data: ProductDetailResponse = await response.json();
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete product');
        return;
      }

      router.push('/pricing');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleUpdateSuccess = () => {
    setEditMode(false);
    fetchProduct();
  };

  const handlePriceUpdateSuccess = () => {
    setPriceDialogOpen(false);
    fetchProduct();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Product not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-5xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/pricing')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pricing List
      </Button>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-tight">{product.name}</h1>
            <Badge variant={product.active ? 'default' : 'secondary'}>
              {product.active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">{PRODUCT_CATEGORY_LABELS[product.category]}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">Code: {product.code}</p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {editMode ? 'Cancel Edit' : 'Edit'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this product? This action cannot be undone.
                    If the product is used in worksheets, it will be set to inactive instead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Tabs defaultValue="details" className="space-y-2">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="price-history">
            <History className="mr-2 h-4 w-4" />
            Price History ({product.priceHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-2">
          {editMode && isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Product</CardTitle>
                <CardDescription>
                  Update product information. Changing the price will create a new price history entry.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductForm
                  product={product}
                  onSuccess={handleUpdateSuccess}
                  onCancel={() => setEditMode(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Current Price Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Current Price</span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        onClick={() => setPriceDialogOpen(true)}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Update Price
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {formatCurrency(parseFloat(product.currentPrice.toString()))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">per {product.unit}</p>
                </CardContent>
              </Card>

              {/* Product Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product Code</p>
                      <p className="text-lg font-mono">{product.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p className="text-lg">{PRODUCT_CATEGORY_LABELS[product.category]}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unit</p>
                      <p className="text-lg capitalize">{product.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {product.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                        <p className="text-sm">{product.description}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{new Date(product.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p>{new Date(product.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Price History Tab */}
        <TabsContent value="price-history">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>
                Complete history of all price changes for this product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceHistoryTimeline
                priceHistory={product.priceHistory}
                currentPrice={parseFloat(product.currentPrice.toString())}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Price Dialog */}
      {isAdmin && (
        <UpdatePriceDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          productId={product.id}
          productName={product.name}
          currentPrice={parseFloat(product.currentPrice.toString())}
          onSuccess={handlePriceUpdateSuccess}
        />
      )}
    </div>
  );
}
