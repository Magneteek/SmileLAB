'use client';

/**
 * WorksheetForm - Multi-Tab Worksheet Creation/Edit Form
 *
 * Comprehensive form for creating and editing dental worksheets with EU MDR compliance.
 * Implements multi-step workflow with tabs for basic info, teeth selection, and products.
 *
 * Features:
 * - Multi-tab navigation (Basic Info, Teeth, Products)
 * - FDI teeth selector integration
 * - Product selection with integrated material assignment (LOT, tooth, notes)
 * - DRAFT-only editing after creation
 * - Replace all pattern for assignments
 * - React Hook Form + Zod validation
 * - Real-time validation feedback
 * - Responsive design
 *
 * Material Assignment:
 * - Materials are assigned at PRODUCT level (not worksheet level)
 * - ProductMaterialEditor provides: LOT selection, tooth association, notes, position
 * - Direct material assignment tab hidden by default (see ENABLE_DIRECT_MATERIALS_TAB)
 * - All materials traceable to specific products for EU MDR compliance
 *
 * @example
 * ```tsx
 * // Create mode
 * <WorksheetForm
 *   mode="create"
 *   orderId="order_123"
 *   onSuccess={(worksheet) => router.push(`/dashboard/worksheets/${worksheet.id}`)}
 *   onCancel={() => router.back()}
 * />
 *
 * // Edit mode
 * <WorksheetForm
 *   mode="edit"
 *   worksheet={existingWorksheet}
 *   onSuccess={() => router.refresh()}
 *   onCancel={() => router.back()}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TeethSelector, type ToothSelection, toTeethSelectionData } from './TeethSelector';
import { ProductSelector, type ProductSelection } from './ProductSelector';
import { MaterialSelector, type MaterialSelection } from './MaterialSelector';
import type {
  WorksheetWithRelations,
  CreateWorksheetDto,
  WorksheetStatus,
} from '@/src/types/worksheet';
import { AlertCircle, Loader2 } from 'lucide-react';

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * ENABLE_DIRECT_MATERIALS_TAB
 *
 * Controls visibility of the standalone Materials tab for direct worksheet material assignment.
 *
 * Context:
 * - For EU MDR compliance, all materials must be traceable to specific products/devices
 * - Product-level material assignment (ProductMaterialEditor) provides comprehensive tracking:
 *   - LOT selection, tooth association, notes, position
 * - Direct material assignment (MaterialSelector) was originally for general materials
 *
 * Current Decision (2024-12-28):
 * - Hidden by default (set to false)
 * - All materials are now assigned at product level for full traceability
 * - Kept in codebase for flexibility if workflow requirements change
 *
 * To Re-enable:
 * - Change ENABLE_DIRECT_MATERIALS_TAB to true
 * - Materials tab will appear in the form
 * - Direct material assignment will be available alongside product materials
 */
const ENABLE_DIRECT_MATERIALS_TAB = false;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for basic worksheet information
 */
const basicInfoSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  patientName: z.string().optional(),
  deviceDescription: z.string().optional(),
  intendedUse: z.string().optional(),
  technicalNotes: z.string().optional(),
  manufactureDate: z.string().optional(), // ISO date string
});

/**
 * Combined form schema (for full validation)
 */
const worksheetFormSchema = basicInfoSchema.extend({
  teeth: z.array(
    z.object({
      toothNumber: z.string(),
      workType: z.string(),
      shade: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
  products: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      priceAtSelection: z.number().positive(),
      notes: z.string().optional(),
      materials: z.array(
        z.object({
          materialId: z.string(),
          materialLotId: z.string().optional(),
          quantityUsed: z.number().positive(),
          toothNumber: z.string().optional(),
          notes: z.string().optional(),
          position: z.number().int().optional(),
        })
      ).optional(),
    })
  ),
  materials: z.array(
    z.object({
      materialId: z.string(),
      quantityNeeded: z.number().positive(),
      materialLotId: z.string().optional(),
      worksheetProductId: z.string().optional(),
    })
  ),
});

type WorksheetFormValues = z.infer<typeof worksheetFormSchema>;

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface WorksheetFormProps {
  /**
   * Form mode: create new worksheet or edit existing
   */
  mode: 'create' | 'edit';

  /**
   * Order ID for creating new worksheet (required in create mode)
   */
  orderId?: string;

  /**
   * Existing worksheet data (required in edit mode)
   */
  worksheet?: WorksheetWithRelations;

  /**
   * Success callback with created/updated worksheet
   */
  onSuccess?: (worksheet: any) => void;

  /**
   * Cancel callback
   */
  onCancel?: () => void;

  /**
   * Optional CSS class name
   */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorksheetForm({
  mode,
  orderId,
  worksheet,
  onSuccess,
  onCancel,
  className,
}: WorksheetFormProps) {
  const t = useTranslations();

  // State
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>('');
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [worksheetId, setWorksheetId] = useState<string | null>(
    worksheet?.id || null
  );
  const [selectedTeeth, setSelectedTeeth] = useState<ToothSelection[]>(
    worksheet?.teeth.map((t) => ({
      toothNumber: t.toothNumber,
      workType: t.workType.toLowerCase() as any,
      shade: t.shade || undefined,
      notes: t.notes || undefined,
    })) || []
  );
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>(
    worksheet?.products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      priceAtSelection: Number(p.priceAtSelection),
      notes: p.notes || undefined,
      worksheetProductId: p.id, // WorksheetProduct ID for material assignment
      code: p.product.code,
      name: p.product.name,
      unit: p.product.unit,
      materials: (p as any).productMaterials?.map((pm: any) => ({
        materialId: pm.materialId,
        materialLotId: pm.materialLotId || undefined,
        quantityUsed: Number(pm.quantityUsed),
        toothNumber: pm.toothNumber || undefined,
        notes: pm.notes || undefined,
        position: pm.position || undefined,
      })) || [],
    })) || []
  );
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialSelection[]>(
    worksheet?.materials.map((m) => ({
      materialId: m.materialId,
      quantityNeeded: Number(m.quantityPlanned) || 1,
      materialLotId: m.materialLotId || undefined,
      code: m.material.code,
      name: m.material.name,
      unit: m.material.unit,
      availableStock: (m.material as any).lots?.reduce((sum: number, lot: any) => sum + Number(lot.quantityAvailable), 0) || 0,
      lots: (m.material as any).lots || [],
    })) || []
  );

  // General shade and tooth shape for all teeth
  const [generalShade, setGeneralShade] = useState<string>('');
  const [generalToothShape, setGeneralToothShape] = useState<string>('');

  // Available materials with LOT data (for ProductSelector)
  const [availableMaterialsWithLots, setAvailableMaterialsWithLots] = useState<any[]>([]);

  // Fetch available materials with LOT data for ProductSelector
  useEffect(() => {
    const fetchMaterialsWithLots = async () => {
      try {
        const response = await fetch('/api/materials?active=true&hasStock=false');
        if (!response.ok) {
          throw new Error('Failed to fetch materials');
        }

        const result = await response.json();
        const materialsData = result.data || [];

        // Enhance materials with LOT information (same as MaterialSelector)
        const enhancedMaterials = materialsData.map((material: any) => {
          const lots = material.lots || [];
          const availableLots = lots.filter((lot: any) => lot.status === 'AVAILABLE');

          // Calculate total available stock
          const availableStock = availableLots.reduce(
            (sum: number, lot: any) => sum + Number(lot.quantityAvailable),
            0
          );

          return {
            materialId: material.id,
            code: material.code,
            name: material.name,
            unit: material.unit,
            availableStock,
            lots: availableLots.map((lot: any) => ({
              id: lot.id,
              lotNumber: lot.lotNumber,
              quantityAvailable: Number(lot.quantityAvailable),
              expiryDate: lot.expiryDate || null,
              arrivalDate: lot.arrivalDate,
              status: lot.status,
            })),
          };
        });

        setAvailableMaterialsWithLots(enhancedMaterials);
      } catch (err) {
        console.error('Failed to fetch materials with LOTs:', err);
      }
    };

    fetchMaterialsWithLots();
  }, []);

  // Fetch order number and date when in create mode
  useEffect(() => {
    const fetchOrderNumber = async () => {
      if (mode === 'create' && orderId) {
        setIsLoadingOrder(true);
        try {
          const response = await fetch(`/api/orders/${orderId}`);
          if (response.ok) {
            const result = await response.json();
            setOrderNumber(result.data.orderNumber);
            setOrderDate(new Date(result.data.createdAt).toLocaleDateString());
          }
        } catch (err) {
          console.error('Failed to fetch order data:', err);
        } finally {
          setIsLoadingOrder(false);
        }
      } else if (mode === 'edit' && worksheet?.order) {
        setOrderNumber(worksheet.order.orderNumber);
        setOrderDate(new Date(worksheet.order.createdAt).toLocaleDateString());
      }
    };

    fetchOrderNumber();
  }, [mode, orderId, worksheet]);

  // Check if worksheet is editable (DRAFT status only)
  const isEditable = mode === 'create' || worksheet?.status === 'DRAFT';
  const isReadOnly = !isEditable;

  // Form initialization
  const form = useForm<WorksheetFormValues>({
    resolver: zodResolver(worksheetFormSchema),
    defaultValues: {
      orderId: orderId || worksheet?.orderId || '',
      patientName: worksheet?.patientName || '',
      deviceDescription: worksheet?.deviceDescription || '',
      intendedUse: worksheet?.intendedUse || '',
      technicalNotes: worksheet?.technicalNotes || '',
      manufactureDate: worksheet?.manufactureDate
        ? new Date(worksheet.manufactureDate).toISOString().split('T')[0]
        : '',
      teeth: selectedTeeth,
      products: worksheet?.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        priceAtSelection: Number(p.priceAtSelection),
        notes: p.notes || undefined,
      })) || [],
      materials: worksheet?.materials.map((m) => ({
        materialId: m.materialId,
        quantityNeeded: Number(m.quantityPlanned) || 1,
        materialLotId: m.materialLotId || undefined,
      })) || [],
    },
  });

  // Update form when selections change
  useEffect(() => {
    form.setValue('teeth', selectedTeeth);
  }, [selectedTeeth, form]);

  useEffect(() => {
    form.setValue('products', selectedProducts);
  }, [selectedProducts, form]);

  useEffect(() => {
    form.setValue('materials', selectedMaterials);
  }, [selectedMaterials, form]);

  // ============================================================================
  // FORM SUBMISSION HANDLERS
  // ============================================================================

  /**
   * Create worksheet (Basic Info tab)
   */
  const createWorksheet = async (data: CreateWorksheetDto) => {
    try {
      const response = await fetch('/api/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create worksheet');
      }

      const result = await response.json();
      setWorksheetId(result.data.id);
      return result.data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create worksheet');
    }
  };

  /**
   * Update worksheet basic info
   */
  const updateWorksheet = async (id: string, data: Partial<CreateWorksheetDto>) => {
    try {
      const response = await fetch(`/api/worksheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update worksheet');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update worksheet');
    }
  };

  /**
   * Assign teeth to worksheet (replace all pattern)
   */
  const assignTeeth = async (id: string, teeth: ToothSelection[]) => {
    try {
      const data = toTeethSelectionData(teeth);

      const response = await fetch(`/api/worksheets/${id}/teeth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign teeth');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign teeth');
    }
  };

  /**
   * Assign products to worksheet (replace all pattern)
   */
  const assignProducts = async (id: string, products: any[]) => {
    try {
      console.log('🔍 Sending products data:', JSON.stringify({ products }, null, 2));
      const response = await fetch(`/api/worksheets/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign products');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign products');
    }
  };

  /**
   * Assign materials to worksheet (replace all pattern)
   */
  const assignMaterials = async (id: string, materials: any[]) => {
    try {
      console.log('🔍 Sending materials data:', JSON.stringify({ materials }, null, 2));
      const response = await fetch(`/api/worksheets/${id}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign materials');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign materials');
    }
  };

  /**
   * Main form submit handler
   */
  const onSubmit = async (data: WorksheetFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      let currentWorksheetId = worksheetId;

      // Step 1: Create or update basic worksheet info
      if (mode === 'create' && !currentWorksheetId) {
        const worksheet = await createWorksheet({
          orderId: data.orderId,
          patientName: data.patientName,
          deviceDescription: data.deviceDescription,
          intendedUse: data.intendedUse,
          technicalNotes: data.technicalNotes,
        });
        currentWorksheetId = worksheet.id;
      } else if (mode === 'edit' && currentWorksheetId) {
        await updateWorksheet(currentWorksheetId, {
          patientName: data.patientName,
          deviceDescription: data.deviceDescription,
          intendedUse: data.intendedUse,
          technicalNotes: data.technicalNotes,
        });
      }

      if (!currentWorksheetId) {
        throw new Error('Worksheet ID is required');
      }

      // Step 2: Assign teeth (always call to ensure "replace all" behavior)
      // If teeth array is empty, this will delete all existing teeth
      await assignTeeth(currentWorksheetId, data.teeth as any);

      // Step 3: Assign products (always call to ensure "replace all" behavior)
      // If products array is empty, this will delete all existing products
      await assignProducts(currentWorksheetId, data.products);

      // Step 4: Assign materials (always call to ensure "replace all" behavior)
      // Include worksheetProductId if provided (creates junction table entry)
      await assignMaterials(currentWorksheetId, data.materials);

      // Success
      onSuccess?.({ id: currentWorksheetId });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Save current tab (partial save for multi-step workflow)
   */
  const saveCurrentTab = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = form.getValues();
      console.log('💾 saveCurrentTab called, activeTab:', activeTab);

      // Save based on active tab
      if (activeTab === 'basic') {
        if (worksheetId) {
          await updateWorksheet(worksheetId, {
            deviceDescription: data.deviceDescription,
            intendedUse: data.intendedUse,
            technicalNotes: data.technicalNotes,
          });
        }
      } else if (activeTab === 'teeth' && worksheetId) {
        // Always call to ensure "replace all" - empty array will delete all teeth
        await assignTeeth(worksheetId, data.teeth as any);
      } else if (activeTab === 'products' && worksheetId) {
        // Always call to ensure "replace all" - empty array will delete all products
        await assignProducts(worksheetId, data.products);

        // CRITICAL: After saving products, reload worksheet to get fresh WorksheetProduct IDs
        // The "replace all" pattern deletes old WorksheetProduct records and creates new ones
        // Wait a bit to ensure database transaction is committed
        console.log('🔄 Waiting for database commit...');
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('🔄 Reloading worksheet to get fresh WorksheetProduct IDs...');
        const reloadResponse = await fetch(`/api/worksheets/${worksheetId}`, {
          headers: { 'Cache-Control': 'no-cache' }, // Ensure we don't get cached data
        });
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json();
          const freshWorksheet = reloadData.data;

          console.log('📦 Fresh worksheet products from reload:', freshWorksheet.products?.map((p: any) => ({
            id: p.id,
            productId: p.productId,
            code: p.product?.code,
          })));

          // Update selectedProducts with new WorksheetProduct IDs and materials
          const updatedProducts = freshWorksheet.products?.map((p: any) => ({
            productId: p.productId,
            quantity: p.quantity,
            priceAtSelection: Number(p.priceAtSelection),
            notes: p.notes || undefined,
            worksheetProductId: p.id, // Fresh WorksheetProduct ID
            code: p.product.code,
            name: p.product.name,
            unit: p.product.unit,
            materials: p.productMaterials?.map((pm: any) => ({
              materialId: pm.materialId,
              quantityUsed: Number(pm.quantityUsed),
            })) || [],
          })) || [];

          console.log('🔧 Updated selectedProducts with IDs:', updatedProducts.map((p: any) => ({
            worksheetProductId: p.worksheetProductId,
            code: p.code,
          })));

          setSelectedProducts(updatedProducts);
          console.log('✅ Worksheet reloaded with fresh IDs');
        }
      } else if (activeTab === 'materials' && worksheetId) {
        // Save materials (simple list, no product associations)
        // Product-material associations will be managed from the Products tab

        console.log('💾 Saving materials:', data.materials.length);
        await assignMaterials(worksheetId, data.materials);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === 'create' ? t('worksheet.formCreateTitle') : t('worksheet.formEditTitle')}
            </CardTitle>
            <CardDescription>
              {mode === 'create'
                ? t('worksheet.formCreateDescription')
                : isReadOnly
                ? t('worksheet.formEditDescriptionReadOnly', { status: worksheet?.status || 'DRAFT' })
                : t('worksheet.formEditDescription')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Read-Only Warning */}
            {isReadOnly && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('worksheet.formReadOnlyWarning')}
                </AlertDescription>
              </Alert>
            )}

            {/* Multi-Tab Form */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${ENABLE_DIRECT_MATERIALS_TAB ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="basic">{t('worksheet.tabBasicInfo')}</TabsTrigger>
                <TabsTrigger value="teeth" disabled={!worksheetId && mode === 'create'}>
                  {t('worksheet.tabTeethSelection')}
                </TabsTrigger>
                {ENABLE_DIRECT_MATERIALS_TAB && (
                  <TabsTrigger value="materials" disabled={!worksheetId && mode === 'create'}>
                    {t('worksheet.tabMaterials')}
                  </TabsTrigger>
                )}
                <TabsTrigger value="products" disabled={!worksheetId && mode === 'create'}>
                  {t('worksheet.tabProducts')}
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-4">
                {/* Hidden Order ID field (UUID for backend) */}
                <FormField
                  control={form.control}
                  name="orderId"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('worksheet.deviceDescriptionLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('worksheet.deviceDescriptionPlaceholder')}
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('worksheet.deviceDescriptionDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intendedUse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('worksheet.intendedUseLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('worksheet.intendedUsePlaceholder')}
                          rows={2}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('worksheet.intendedUseDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('worksheet.technicalNotesLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('worksheet.technicalNotesPlaceholder')}
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('worksheet.technicalNotesDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === 'create' && !worksheetId && (
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onCancel}>
                      {t('worksheet.buttonCancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        const data = form.getValues();
                        try {
                          setIsSubmitting(true);
                          const worksheet = await createWorksheet({
                            orderId: data.orderId,
                            deviceDescription: data.deviceDescription,
                            intendedUse: data.intendedUse,
                            technicalNotes: data.technicalNotes,
                          });
                          setWorksheetId(worksheet.id);
                          setActiveTab('teeth'); // Move to next tab
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting || !form.getValues('orderId')}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('worksheet.buttonSaveContinue')}
                    </Button>
                  </div>
                )}

                {/* Save & Continue for Edit Mode */}
                {mode === 'edit' && worksheetId && !isReadOnly && (
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      onClick={async () => {
                        const data = form.getValues();
                        try {
                          setIsSubmitting(true);
                          await updateWorksheet(worksheetId, {
                            deviceDescription: data.deviceDescription,
                            intendedUse: data.intendedUse,
                            technicalNotes: data.technicalNotes,
                          });
                          setActiveTab('teeth'); // Move to next tab
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('worksheet.buttonSaveContinue')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Teeth Selection */}
              <TabsContent value="teeth" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('worksheet.teethSelectionTitle')}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('worksheet.teethSelectionDescription')}
                  </p>

                  <TeethSelector
                    selectedTeeth={selectedTeeth}
                    onTeethChange={setSelectedTeeth}
                    mode="permanent"
                    readOnly={isReadOnly}
                    showLegend={true}
                    showLabels={true}
                    layout="sidebar"
                  />

                  {!isReadOnly && (
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('basic')}>
                        {t('worksheet.buttonBack')}
                      </Button>
                      <Button
                        type="button"
                        onClick={async () => {
                          if (worksheetId && selectedTeeth.length > 0) {
                            await saveCurrentTab();
                          }
                          setActiveTab(ENABLE_DIRECT_MATERIALS_TAB ? 'materials' : 'products');
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('worksheet.buttonSaveContinue')}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Products */}
              <TabsContent value="products" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('worksheet.productSelectionTitle')}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('worksheet.productSelectionDescription')}
                  </p>

                  <ProductSelector
                    selectedProducts={selectedProducts}
                    onProductsChange={setSelectedProducts}
                    availableMaterials={availableMaterialsWithLots}
                    availableTeeth={selectedTeeth.map(t => t.toothNumber)}
                    readOnly={isReadOnly}
                  />

                  {!isReadOnly && (
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('materials')}>
                        {t('worksheet.buttonBack')}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'create' ? t('worksheet.buttonCreateWorksheet') : t('worksheet.buttonSaveChanges')}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 3: Materials - Hidden by default (see ENABLE_DIRECT_MATERIALS_TAB) */}
              {ENABLE_DIRECT_MATERIALS_TAB && (
                <TabsContent value="materials" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('worksheet.materialSelectionTitle')}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('worksheet.materialSelectionDescription')}
                    </p>

                    <MaterialSelector
                      selectedMaterials={selectedMaterials}
                      onMaterialsChange={setSelectedMaterials}
                      readOnly={isReadOnly}
                    />

                    {!isReadOnly && (
                      <div className="mt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('teeth')}>
                          {t('worksheet.buttonBack')}
                        </Button>
                        <Button type="button" variant="default" onClick={() => {
                          saveCurrentTab();
                          setActiveTab('products');
                        }} disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('worksheet.buttonSaveNext')}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
