/**
 * Update Price Dialog Component
 *
 * Modal dialog for updating product price with mandatory reason.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@/types/product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const updatePriceSchema = z.object({
  newPrice: z
    .number()
    .positive('Price must be positive')
    .min(0.01, 'Price must be at least 0.01'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
});

type UpdatePriceFormValues = z.infer<typeof updatePriceSchema>;

interface UpdatePriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  currentPrice: number;
  onSuccess: () => void;
}

export default function UpdatePriceDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentPrice,
  onSuccess,
}: UpdatePriceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdatePriceFormValues>({
    resolver: zodResolver(updatePriceSchema),
    defaultValues: {
      newPrice: currentPrice,
      reason: '',
    },
  });

  const onSubmit = async (data: UpdatePriceFormValues) => {
    setError(null);

    // Validate price is different
    if (data.newPrice === currentPrice) {
      setError('New price must be different from current price');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPrice: data.newPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update price');
        return;
      }

      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update price');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!submitting) {
      form.reset();
      setError(null);
      onOpenChange(newOpen);
    }
  };

  const watchedNewPrice = form.watch('newPrice');
  const priceChange = watchedNewPrice - currentPrice;
  const priceChangePercent =
    currentPrice > 0 ? ((priceChange / currentPrice) * 100).toFixed(1) : '0.0';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Price</DialogTitle>
          <DialogDescription>
            Update the price for <strong>{productName}</strong>. This will create a new
            entry in the price history.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Price Display */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Current Price</p>
              <p className="text-2xl font-bold">{formatCurrency(currentPrice)}</p>
            </div>

            {/* New Price Input */}
            <FormField
              control={form.control}
              name="newPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Price (€) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormDescription>
                    {priceChange !== 0 && (
                      <span
                        className={
                          priceChange > 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {priceChange > 0 ? '+' : ''}
                        {formatCurrency(priceChange)} ({priceChange > 0 ? '+' : ''}
                        {priceChangePercent}%)
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason Input */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g., Material cost increase, market adjustment, seasonal pricing..."
                      rows={3}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a clear reason for this price change (for audit purposes)
                    <br />
                    {field.value?.length || 0} / 500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Price'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
