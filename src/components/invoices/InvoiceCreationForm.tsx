'use client';

/**
 * Invoice Creation Form Component
 *
 * Flexible invoice creation with:
 * - Worksheet selection (multi-select from same dentist)
 * - Custom line items (add/edit/remove)
 * - Draft mode or immediate finalization
 * - Date selection with backdating support
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductSelectorDialog } from './ProductSelectorDialog';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert patient name to initials for privacy
 * Example: "John Doe" -> "J.D."
 */
function getPatientInitials(patientName: string | null): string {
  if (!patientName) return '';

  const names = patientName.trim().split(/\s+/);
  if (names.length === 0) return '';

  if (names.length === 1) {
    // Single name: return first letter
    return names[0][0]?.toUpperCase() + '.' || '';
  }

  // Multiple names: first and last initials
  const firstInitial = names[0][0]?.toUpperCase() || '';
  const lastInitial = names[names.length - 1][0]?.toUpperCase() || '';
  return `${firstInitial}.${lastInitial}.`;
}

// ============================================================================
// TYPES
// ============================================================================

interface LineItem {
  id: string;
  worksheetId?: string;
  worksheetNumber?: string; // For grouping by worksheet
  patientInitials?: string; // Patient initials for privacy
  description: string;
  quantity: number;
  unitPrice: number;
  lineType: 'product' | 'shipping' | 'discount' | 'adjustment' | 'custom';
  productCode?: string;
  productName?: string;
  notes?: string;
  position: number;
}

interface AvailableWorksheet {
  id: string;
  worksheetNumber: string;
  dentistId: string;
  dentistName: string;
  clinicName: string;
  patientName: string | null;
  products: Array<{
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
}

interface Dentist {
  id: string;
  dentistName: string;
  clinicName: string;
  paymentTerms?: number; // Days until payment due
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceCreationForm() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [availableWorksheets, setAvailableWorksheets] = useState<AvailableWorksheet[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState<string>('');
  const [selectedWorksheetIds, setSelectedWorksheetIds] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [serviceDate, setServiceDate] = useState<Date>(new Date()); // Default to invoice date
  const [issuedBy, setIssuedBy] = useState<string>('Rommy Balzan Verbič'); // Default issuer
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false); // Medical workers default: no tax
  const [taxRate, setTaxRate] = useState<number>(22); // Only used if tax is enabled
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false); // Discount disabled by default
  const [discountRate, setDiscountRate] = useState<number>(10); // Only used if discount is enabled
  const [notes, setNotes] = useState<string>('');

  // Load dentists on mount
  useEffect(() => {
    loadDentists();
  }, []);

  // Load available worksheets when dentist changes
  useEffect(() => {
    if (selectedDentistId) {
      loadAvailableWorksheets(selectedDentistId);

      // Calculate default due date based on dentist's payment terms
      const dentist = dentists.find((d) => d.id === selectedDentistId);
      if (dentist?.paymentTerms) {
        const newDueDate = new Date(invoiceDate);
        newDueDate.setDate(newDueDate.getDate() + dentist.paymentTerms);
        setDueDate(newDueDate);
      } else {
        // Default to 30 days if no payment terms specified
        const newDueDate = new Date(invoiceDate);
        newDueDate.setDate(newDueDate.getDate() + 30);
        setDueDate(newDueDate);
      }
    } else {
      setAvailableWorksheets([]);
      setSelectedWorksheetIds([]);
      setDueDate(undefined);
    }
  }, [selectedDentistId, dentists, invoiceDate]);

  // Auto-import worksheet products when worksheets are selected
  useEffect(() => {
    importWorksheetProducts();
  }, [selectedWorksheetIds]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadDentists = async () => {
    try {
      const response = await fetch('/api/dentists?limit=1000&active=true');
      if (!response.ok) throw new Error('Failed to load dentists');
      const result = await response.json();
      // API returns { dentists: [...], total, page, limit } format
      setDentists(result.dentists || []);
    } catch (error) {
      toast({
        title: t('invoices.errorTitle'),
        description: t('invoices.failedLoadDentists'),
        variant: 'destructive',
      });
    }
  };

  const loadAvailableWorksheets = async (dentistId: string) => {
    try {
      const response = await fetch(`/api/worksheets/available-for-invoice?dentistId=${dentistId}`);
      if (!response.ok) throw new Error('Failed to load worksheets');
      const result = await response.json();
      // API returns { success: true, data: { data: [...], count: N } }
      setAvailableWorksheets(result.data?.data || []);
    } catch (error) {
      toast({
        title: t('invoices.errorTitle'),
        description: t('invoices.failedLoadWorksheets'),
        variant: 'destructive',
      });
    }
  };

  // ============================================================================
  // WORKSHEET SELECTION
  // ============================================================================

  const importWorksheetProducts = () => {
    // Clear existing worksheet-based line items
    const customLineItems = lineItems.filter((item) => !item.worksheetId);

    // Import products from selected worksheets
    const worksheetLineItems: LineItem[] = [];
    let position = customLineItems.length;

    selectedWorksheetIds.forEach((worksheetId) => {
      const worksheet = availableWorksheets.find((w) => w.id === worksheetId);
      if (!worksheet) return;

      const patientInitials = getPatientInitials(worksheet.patientName);

      worksheet.products.forEach((product) => {
        worksheetLineItems.push({
          id: `ws-${worksheetId}-${product.productCode}-${Math.random()}`,
          worksheetId,
          worksheetNumber: worksheet.worksheetNumber,
          patientInitials,
          description: `${product.productCode} - ${product.productName}`,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          lineType: 'product',
          productCode: product.productCode,
          productName: product.productName,
          position: position++,
        });
      });
    });

    setLineItems([...customLineItems, ...worksheetLineItems]);
  };

  const toggleWorksheet = (worksheetId: string) => {
    if (selectedWorksheetIds.includes(worksheetId)) {
      setSelectedWorksheetIds(selectedWorksheetIds.filter((id) => id !== worksheetId));
    } else {
      setSelectedWorksheetIds([...selectedWorksheetIds, worksheetId]);
    }
  };

  // ============================================================================
  // LINE ITEMS MANAGEMENT
  // ============================================================================

  const addCustomLineItem = () => {
    const newItem: LineItem = {
      id: `custom-${Date.now()}`,
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
      id: `product-${Date.now()}`,
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
    setLineItems(lineItems.filter((item) => item.id !== id));
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

  const handleSubmit = async (isDraft: boolean) => {
    // Validation
    if (!selectedDentistId && selectedWorksheetIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a dentist or at least one worksheet',
        variant: 'destructive',
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one line item',
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
        dentistId: selectedDentistId || undefined,
        worksheetIds: selectedWorksheetIds.length > 0 ? selectedWorksheetIds : undefined,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate?.toISOString(),
        serviceDate: serviceDate.toISOString(),
        issuedBy: issuedBy.trim() || undefined,
        taxRate: taxEnabled ? taxRate : 0,
        discountRate: discountEnabled ? discountRate : 0,
        notes: notes.trim() || undefined,
        lineItems: lineItems
          .filter((item) => !item.patientInitials) // Only send custom items (not worksheet imports)
          .map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineType: item.lineType,
            productCode: item.productCode,
            productName: item.productName,
            worksheetId: item.worksheetId, // Include worksheet reference if assigned
            worksheetNumber: item.worksheetNumber, // For display
            notes: item.notes,
            position: item.position,
          })),
        isDraft,
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      const result = await response.json();

      toast({
        title: t('invoices.successTitle'),
        description: result.message || t('invoices.invoiceCreatedSuccess'),
      });

      // Redirect to invoice detail page
      // API wraps response in { success: true, data: {...} }
      const invoiceId = result.data?.id || result.id;
      router.push(`/invoices/${invoiceId}`);
    } catch (error) {
      toast({
        title: t('invoices.errorTitle'),
        description: error instanceof Error ? error.message : t('invoices.failedCreateInvoice'),
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
      {/* Dentist Selection */}
      <div className="space-y-2">
        <Label htmlFor="dentist">{t('invoices.dentistClinicLabel')}</Label>
        <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
          <SelectTrigger id="dentist">
            <SelectValue placeholder={t('invoices.selectDentistPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {dentists.map((dentist) => (
              <SelectItem key={dentist.id} value={dentist.id}>
                {dentist.dentistName} - {dentist.clinicName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Worksheet Selection */}
      {selectedDentistId && availableWorksheets.length > 0 && (
        <div className="space-y-2">
          <Label>{t('invoices.availableWorksheetsLabel')}</Label>
          <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
            {availableWorksheets.map((worksheet) => (
              <div
                key={worksheet.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
              >
                <Checkbox
                  checked={selectedWorksheetIds.includes(worksheet.id)}
                  onCheckedChange={() => toggleWorksheet(worksheet.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">
                    {worksheet.worksheetNumber} - {worksheet.patientName || t('invoices.noPatient')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('invoices.productsCount', { count: worksheet.products.length })} - €
                    {worksheet.totalAmount.toFixed(2)}
                  </div>
                </div>
                <Badge variant="outline">{t('invoices.itemsCount', { count: worksheet.products.length })}</Badge>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {t('invoices.selectedWorksheets', { count: selectedWorksheetIds.length })}
          </p>
        </div>
      )}

      {selectedDentistId && availableWorksheets.length === 0 && (
        <div className="border rounded-lg p-4 text-center text-gray-500">
          {t('invoices.noWorksheetsAvailable')}
        </div>
      )}

      <Separator />

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{t('invoices.lineItemsLabel')}</Label>
          <div className="flex gap-2">
            <ProductSelectorDialog onSelect={addProductFromPricingList} />
            <Button type="button" variant="outline" size="sm" onClick={addCustomLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              {t('invoices.addCustomItemButton')}
            </Button>
          </div>
        </div>

        {lineItems.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            {t('invoices.noLineItems')}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoices.descriptionHeader')}</TableHead>
                  <TableHead className="w-24">{t('invoices.typeHeader')}</TableHead>
                  <TableHead className="w-24">{t('invoices.qtyHeader')}</TableHead>
                  <TableHead className="w-32">{t('invoices.unitPriceHeader')}</TableHead>
                  <TableHead className="w-32">{t('invoices.totalHeader')}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Group line items by worksheet
                  const worksheetGroups = new Map<string, LineItem[]>();
                  const customItems: LineItem[] = [];

                  lineItems.forEach((item) => {
                    if (item.worksheetId && item.worksheetNumber) {
                      if (!worksheetGroups.has(item.worksheetNumber)) {
                        worksheetGroups.set(item.worksheetNumber, []);
                      }
                      worksheetGroups.get(item.worksheetNumber)!.push(item);
                    } else {
                      customItems.push(item);
                    }
                  });

                  return (
                    <>
                      {/* Render worksheet groups */}
                      {Array.from(worksheetGroups.entries()).map(([worksheetNumber, items]) => {
                        const firstItem = items[0];
                        return (
                          <React.Fragment key={worksheetNumber}>
                            {/* Worksheet Header Row */}
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={6} className="font-semibold">
                                {t('invoices.worksheetGroup', { number: worksheetNumber })}
                                {firstItem.patientInitials && (
                                  <span className="ml-2 text-gray-600 font-normal">
                                    ({t('invoices.patientLabel', { initials: firstItem.patientInitials })})
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                            {/* Worksheet Items */}
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.description}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{item.lineType}</Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{item.quantity}</span>
                                </TableCell>
                                <TableCell>€{item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="font-medium">
                                  €{(item.quantity * item.unitPrice).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {/* Worksheet items cannot be edited/deleted */}
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Render custom items */}
                      {customItems.length > 0 && (
                        <>
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={6} className="font-semibold">
                              {t('invoices.additionalItems')}
                            </TableCell>
                          </TableRow>
                          {customItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="space-y-2">
                                  <Input
                                    value={item.description}
                                    onChange={(e) =>
                                      updateLineItem(item.id, { description: e.target.value })
                                    }
                                    placeholder={t('invoices.itemDescriptionPlaceholder')}
                                  />
                                  {selectedWorksheetIds.length > 0 && (
                                    <Select
                                      value={item.worksheetId || 'invoice'}
                                      onValueChange={(value) =>
                                        updateLineItem(item.id, {
                                          worksheetId: value === 'invoice' ? undefined : value,
                                          worksheetNumber:
                                            value === 'invoice'
                                              ? undefined
                                              : availableWorksheets.find((w) => w.id === value)
                                                  ?.worksheetNumber,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-full text-xs">
                                        <SelectValue placeholder={t('invoices.invoiceLevel')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="invoice">
                                          <span className="text-xs">{t('invoices.invoiceLevelNoWorksheet')}</span>
                                        </SelectItem>
                                        {availableWorksheets
                                          .filter((w) => selectedWorksheetIds.includes(w.id))
                                          .map((worksheet) => (
                                            <SelectItem key={worksheet.id} value={worksheet.id}>
                                              <span className="text-xs">
                                                {t('invoices.forWorksheet', { number: worksheet.worksheetNumber, patient: worksheet.patientName })}
                                              </span>
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.lineType}
                                  onValueChange={(value: any) =>
                                    updateLineItem(item.id, { lineType: value })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="custom">{t('invoices.lineTypeCustom')}</SelectItem>
                                    <SelectItem value="shipping">{t('invoices.lineTypeShipping')}</SelectItem>
                                    <SelectItem value="discount">{t('invoices.lineTypeDiscount')}</SelectItem>
                                    <SelectItem value="adjustment">{t('invoices.lineTypeAdjustment')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateLineItem(item.id, {
                                      quantity: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
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
                                  className="w-28"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                €{(item.quantity * item.unitPrice).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLineItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('invoices.subtotalLabel')}</span>
          <span>€{calculateSubtotal().toFixed(2)}</span>
        </div>
        {discountEnabled ? (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t('invoices.discountLabel', { rate: discountRate })}</span>
            <span>-€{calculateDiscount().toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t('invoices.discountLabel', { rate: 0 })}</span>
            <span>{t('invoices.notApplied')}</span>
          </div>
        )}
        {taxEnabled ? (
          <div className="flex justify-between text-sm">
            <span>{t('invoices.taxLabel', { rate: taxRate })}</span>
            <span>€{calculateTax().toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t('invoices.taxLabel', { rate: 0 })}</span>
            <span>{t('invoices.taxExempt')}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>{t('invoices.totalLabel')}</span>
          <span>€{calculateTotal().toFixed(2)}</span>
        </div>
      </div>

      {/* Invoice Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('invoices.invoiceDateLabel')}</Label>
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(invoiceDate, 'PPP')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={invoiceDate} onSelect={(date) => date && setInvoiceDate(date)} />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500">
            {t('invoices.invoiceNumberHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label>{t('invoices.dueDateLabel')}</Label>
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : t('invoices.selectDueDatePlaceholder')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Service Date and Issued By */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('invoices.serviceDateLabel')}</Label>
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(serviceDate, 'PPP')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={serviceDate} onSelect={(date) => date && setServiceDate(date)} />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500">
            {t('invoices.serviceDateHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuedBy">{t('invoices.issuedByLabel')}</Label>
          <Input
            id="issuedBy"
            type="text"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            placeholder={t('invoices.issuedByPlaceholder')}
          />
          <p className="text-xs text-gray-500">
            {t('invoices.issuedByHint')}
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
            {t('invoices.applyTaxLabel')}
          </Label>
        </div>

        {taxEnabled && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="taxRate">{t('invoices.taxRateLabel')}</Label>
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
            {t('invoices.applyDiscountLabel')}
          </Label>
        </div>

        {discountEnabled && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="discountRate">{t('invoices.discountRateLabel')}</Label>
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
        <Label htmlFor="notes">{t('invoices.notesLabel')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('invoices.notesPlaceholder')}
          rows={3}
        />
      </div>

      <Separator />

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('invoices.subtotalLabel')}</span>
          <span>€{calculateSubtotal().toFixed(2)}</span>
        </div>
        {discountEnabled ? (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t('invoices.discountLabel', { rate: discountRate })}</span>
            <span>-€{calculateDiscount().toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t('invoices.discountLabel', { rate: 0 })}</span>
            <span>{t('invoices.notApplied')}</span>
          </div>
        )}
        {taxEnabled ? (
          <div className="flex justify-between text-sm">
            <span>{t('invoices.taxLabel', { rate: taxRate })}</span>
            <span>€{calculateTax().toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t('invoices.taxLabel', { rate: 0 })}</span>
            <span>{t('invoices.taxExempt')}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>{t('invoices.totalLabel')}</span>
          <span>€{calculateTotal().toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {t('invoices.saveAsDraftButton')}
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {t('invoices.createFinalizeButton')}
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        {t('invoices.draftInfo')}
      </p>
    </div>
  );
}
