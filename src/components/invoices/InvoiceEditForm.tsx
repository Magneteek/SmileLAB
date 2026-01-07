'use client';

/**
 * Invoice Edit Form Component
 *
 * Edit draft invoices with full flexibility:
 * - Update line items (add/edit/remove)
 * - Change dates (invoice date, due date)
 * - Modify tax rate and notes
 * - Finalize invoice (assign number and lock)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductSelectorDialog } from './ProductSelectorDialog';
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

// ============================================================================
// TYPES
// ============================================================================

interface LineItem {
  id: string;
  worksheetId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineType: 'product' | 'shipping' | 'discount' | 'adjustment' | 'custom';
  productCode?: string | null;
  productName?: string | null;
  notes?: string | null;
  position: number;
}

interface InvoiceEditFormProps {
  invoice: any; // Full invoice object from Prisma
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceEditForm({ invoice }: InvoiceEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date(invoice.invoiceDate));
  const [dueDate, setDueDate] = useState<Date | undefined>(
    invoice.dueDate ? new Date(invoice.dueDate) : undefined
  );
  const [serviceDate, setServiceDate] = useState<Date>(
    invoice.serviceDate ? new Date(invoice.serviceDate) : new Date(invoice.invoiceDate)
  );
  const [issuedBy, setIssuedBy] = useState<string>(invoice.issuedBy || 'Rommy Balzan Verbič');
  const initialTaxRate = typeof invoice.taxRate === 'number' ? invoice.taxRate : (invoice.taxRate?.toNumber?.() || 0);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(initialTaxRate > 0);
  const [taxRate, setTaxRate] = useState<number>(initialTaxRate > 0 ? initialTaxRate : 22);
  const initialDiscountRate = typeof invoice.discountRate === 'number' ? invoice.discountRate : (invoice.discountRate?.toNumber?.() || 0);
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(initialDiscountRate > 0);
  const [discountRate, setDiscountRate] = useState<number>(initialDiscountRate > 0 ? initialDiscountRate : 10);
  const [notes, setNotes] = useState<string>(invoice.notes || '');

  // Initialize line items from invoice
  useEffect(() => {
    const items: LineItem[] = invoice.lineItems.map((item: any) => ({
      id: item.id,
      worksheetId: item.worksheetId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : item.unitPrice.toNumber(),
      lineType: item.lineType as any,
      productCode: item.productCode,
      productName: item.productName,
      notes: item.notes,
      position: item.position,
    }));
    setLineItems(items);
  }, [invoice]);

  // ============================================================================
  // LINE ITEMS MANAGEMENT
  // ============================================================================

  const addCustomLineItem = () => {
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      lineType: 'custom',
      position: lineItems.length,
    };
    setLineItems([...lineItems, newItem]);
  };

  const addProductFromPricingList = (product: any, quantity: number) => {
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      description: `${product.code} - ${product.name}`,
      quantity,
      unitPrice: product.currentPrice,
      lineType: 'product',
      productCode: product.code,
      productName: product.name,
      position: lineItems.length,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeLineItem = (id: string) => {
    // Can only remove custom line items (not worksheet-based)
    const item = lineItems.find((i) => i.id === id);
    if (item && !item.worksheetId) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateDiscount = () => {
    if (!discountEnabled) return 0;
    return (calculateSubtotal() * discountRate) / 100;
  };

  const calculateSubtotalAfterDiscount = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const calculateTax = () => {
    if (!taxEnabled) return 0;
    return (calculateSubtotalAfterDiscount() * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotalAfterDiscount() + calculateTax();
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSaveChanges = async () => {
    // Validation
    if (lineItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please have at least one line item',
        variant: 'destructive',
      });
      return;
    }

    // Check that custom line items have descriptions
    const invalidItems = lineItems.filter(
      (item) => !item.worksheetId && !item.description.trim()
    );
    if (invalidItems.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'All custom line items must have a description',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate?.toISOString(),
        serviceDate: serviceDate.toISOString(),
        issuedBy: issuedBy.trim() || undefined,
        taxRate: taxEnabled ? taxRate : 0,
        discountRate: discountEnabled ? discountRate : 0,
        notes: notes.trim() || undefined,
        lineItems: lineItems.map((item) => ({
          id: item.id.startsWith('new-') ? undefined : item.id, // New items don't have DB ID
          worksheetId: item.worksheetId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineType: item.lineType,
          productCode: item.productCode,
          productName: item.productName,
          notes: item.notes,
          position: item.position,
        })),
      };

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update invoice');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Draft invoice updated successfully',
      });

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);

    try {
      const payload = {
        invoiceDate: invoiceDate.toISOString(),
      };

      const response = await fetch(`/api/invoices/${invoice.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize invoice');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `Invoice ${result.invoiceNumber} finalized successfully`,
      });

      // Redirect to invoice detail page (finalized invoices can't be edited)
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to finalize invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Dentist Info (Read-only) */}
      {invoice.dentist && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700">Dentist / Clinic</div>
          <div className="text-base font-semibold">
            {invoice.dentist.dentistName} - {invoice.dentist.clinicName}
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <div className="flex gap-2">
            <ProductSelectorDialog onSelect={addProductFromPricingList} />
            <Button type="button" variant="outline" size="sm" onClick={addCustomLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Item
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-32">Unit Price</TableHead>
                <TableHead className="w-32">Total</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.worksheetId ? (
                      <div>
                        <div className="font-medium">{item.description}</div>
                        <div className="text-xs text-gray-500">From worksheet (locked)</div>
                      </div>
                    ) : (
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, { description: e.target.value })
                        }
                        placeholder="Item description"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.worksheetId ? (
                      <Badge variant="outline">{item.lineType}</Badge>
                    ) : (
                      <Select
                        value={item.lineType}
                        onValueChange={(value: any) =>
                          updateLineItem(item.id, { lineType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom</SelectItem>
                          <SelectItem value="shipping">Shipping</SelectItem>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.worksheetId ? (
                      <span>{item.quantity}</span>
                    ) : (
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.worksheetId ? (
                      <span>€{item.unitPrice.toFixed(2)}</span>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    €{(item.quantity * item.unitPrice).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {!item.worksheetId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* Invoice Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Invoice Date</Label>
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(invoiceDate, 'PPP')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={invoiceDate}
                onSelect={(date) => date && setInvoiceDate(date as Date)}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500">
            Invoice number will be based on this date when finalized
          </p>
        </div>

        <div className="space-y-2">
          <Label>Due Date (Optional)</Label>
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dueDate} onSelect={(date) => setDueDate(date as Date | undefined)} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Service Date and Issued By */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Date (Datum opravljene storitve)</Label>
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(serviceDate, 'PPP')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={serviceDate}
                onSelect={(date) => date && setServiceDate(date as Date)}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500">
            Date when the service was performed
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuedBy">Issued By (Račun izdal)</Label>
          <Input
            id="issuedBy"
            type="text"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            placeholder="Enter name of person issuing invoice"
          />
          <p className="text-xs text-gray-500">
            Person responsible for issuing this invoice
          </p>
        </div>
      </div>

      {/* Tax Toggle */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="taxEnabled"
            checked={taxEnabled}
            onCheckedChange={(checked) => setTaxEnabled(checked as boolean)}
          />
          <Label htmlFor="taxEnabled" className="cursor-pointer">
            Apply tax (medical services are typically tax-exempt)
          </Label>
        </div>

        {taxEnabled && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-32"
            />
          </div>
        )}
      </div>

      {/* Discount Toggle */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="discountEnabled"
            checked={discountEnabled}
            onCheckedChange={(checked) => setDiscountEnabled(checked as boolean)}
          />
          <Label htmlFor="discountEnabled" className="cursor-pointer">
            Apply discount
          </Label>
        </div>

        {discountEnabled && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="discountRate">Discount Rate (%)</Label>
            <Input
              id="discountRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountRate}
              onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
              className="w-32"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes for this invoice"
          rows={3}
        />
      </div>

      <Separator />

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>€{calculateSubtotal().toFixed(2)}</span>
        </div>
        {discountEnabled ? (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount ({discountRate}%):</span>
            <span>-€{calculateDiscount().toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Discount:</span>
            <span>Not applied</span>
          </div>
        )}
        {taxEnabled ? (
          <div className="flex justify-between text-sm">
            <span>Tax ({taxRate}%):</span>
            <span>€{calculateTax().toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tax:</span>
            <span>Not applicable (tax-exempt)</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>€{calculateTotal().toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveChanges}
          disabled={loading}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={loading} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalize Invoice
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will assign an invoice number (RAC-{invoiceDate.getFullYear()}-XXX) and lock
                the invoice for editing. This action cannot be undone.
                <br />
                <br />
                Make sure all details are correct before finalizing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalize}>Finalize</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Save changes to update the draft. Finalize to assign invoice number and complete the
        invoice.
      </p>
    </div>
  );
}
