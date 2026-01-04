'use client';

/**
 * MaterialSelector - Material Selection with FIFO Indication
 *
 * Component for selecting dental materials with FIFO (First In, First Out) stock tracking.
 * Shows available materials with stock levels and oldest LOT indication for MDR traceability.
 *
 * Features:
 * - Search and filter materials
 * - FIFO indication (oldest LOT highlighted)
 * - Real-time stock availability
 * - Multi-select with quantity needed
 * - Material traceability info (LOT numbers, expiry dates)
 * - Replace all pattern support
 * - MDR compliance indicators (biocompatible, CE marked)
 * - Responsive design
 * - Read-only mode
 *
 * Note: Material consumption happens on worksheet state transition (DRAFT → IN_PRODUCTION)
 * This component only plans the materials needed - actual FIFO consumption is deferred.
 *
 * @example
 * ```tsx
 * const [selectedMaterials, setSelectedMaterials] = useState([]);
 *
 * <MaterialSelector
 *   selectedMaterials={selectedMaterials}
 *   onMaterialsChange={setSelectedMaterials}
 *   readOnly={false}
 * />
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Search,
  X,
  Loader2,
  Package,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { Material, MaterialType, MaterialLot } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Material with LOT information for FIFO display
 */
interface MaterialWithLots extends Material {
  lots?: MaterialLot[];
  availableStock?: number; // Total available quantity across all LOTs
  oldestLot?: MaterialLot; // Oldest LOT for FIFO indication
}

export interface MaterialSelection {
  materialId: string;
  quantityNeeded: number;
  materialLotId?: string; // Selected LOT (defaults to FIFO - oldest)
  // For display purposes
  code?: string;
  name?: string;
  unit?: string;
  availableStock?: number;
  lots?: MaterialLot[]; // Available LOTs for this material
}

interface MaterialSelectorProps {
  /**
   * Currently selected materials with quantities
   */
  selectedMaterials: MaterialSelection[];

  /**
   * Callback when material selection changes
   */
  onMaterialsChange: (materials: MaterialSelection[]) => void;

  /**
   * Read-only mode (no editing)
   */
  readOnly?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

// Material types for filtering
const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'CERAMIC', label: 'Ceramic' },
  { value: 'METAL', label: 'Metal' },
  { value: 'RESIN', label: 'Resin' },
  { value: 'COMPOSITE', label: 'Composite' },
  { value: 'PORCELAIN', label: 'Porcelain' },
  { value: 'ZIRCONIA', label: 'Zirconia' },
  { value: 'TITANIUM', label: 'Titanium' },
  { value: 'ALLOY', label: 'Alloy' },
  { value: 'ACRYLIC', label: 'Acrylic' },
  { value: 'WAX', label: 'Wax' },
  { value: 'OTHER', label: 'Other' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MaterialSelector({
  selectedMaterials,
  onMaterialsChange,
  readOnly = false,
  className,
}: MaterialSelectorProps) {
  // State
  const [materials, setMaterials] = useState<MaterialWithLots[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | 'ALL'>('ALL');

  // ============================================================================
  // FETCH MATERIALS
  // ============================================================================

  /**
   * Fetch available materials with stock information
   */
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        active: 'true',
        hasStock: 'false', // Show all materials, not just those with stock
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (typeFilter !== 'ALL') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/materials?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      const result = await response.json();
      const materialsData = result.data || [];

      // Enhance materials with LOT information
      const enhancedMaterials = materialsData.map((material: any) => {
        const lots = material.lots || [];
        const availableLots = lots.filter((lot: MaterialLot) => lot.status === 'AVAILABLE');

        // Calculate total available stock
        const availableStock = availableLots.reduce(
          (sum: number, lot: MaterialLot) => sum + Number(lot.quantityAvailable),
          0
        );

        // Find oldest LOT (for FIFO indication)
        const oldestLot = availableLots.sort((a: MaterialLot, b: MaterialLot) =>
          new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
        )[0];

        return {
          ...material,
          lots: availableLots,
          availableStock,
          oldestLot,
        };
      });

      setMaterials(enhancedMaterials);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter]);

  // Fetch materials on mount and when filters change
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // ============================================================================
  // MATERIAL SELECTION HANDLERS
  // ============================================================================

  /**
   * Check if material is selected
   */
  const isMaterialSelected = (materialId: string): boolean => {
    return selectedMaterials.some((m) => m.materialId === materialId);
  };

  /**
   * Get selected material data
   */
  const getSelectedMaterial = (materialId: string): MaterialSelection | undefined => {
    return selectedMaterials.find((m) => m.materialId === materialId);
  };

  /**
   * Toggle material selection
   */
  const toggleMaterial = (material: MaterialWithLots) => {
    if (readOnly) return;

    if (isMaterialSelected(material.id)) {
      // Deselect
      onMaterialsChange(selectedMaterials.filter((m) => m.materialId !== material.id));
    } else {
      // Select with default quantity and FIFO LOT (oldest)
      onMaterialsChange([
        ...selectedMaterials,
        {
          materialId: material.id,
          quantityNeeded: 1,
          materialLotId: material.oldestLot?.id, // Default to FIFO (oldest LOT)
          code: material.code,
          name: material.name,
          unit: material.unit,
          availableStock: material.availableStock,
          lots: material.lots, // Include available LOTs for dropdown
        },
      ]);
    }
  };

  /**
   * Update material quantity
   */
  const updateQuantity = (materialId: string, quantity: number) => {
    if (readOnly) return;

    if (quantity < 1) {
      // Remove if quantity is less than 1
      onMaterialsChange(selectedMaterials.filter((m) => m.materialId !== materialId));
      return;
    }

    onMaterialsChange(
      selectedMaterials.map((m) =>
        m.materialId === materialId ? { ...m, quantityNeeded: quantity } : m
      )
    );
  };

  /**
   * Update LOT assignment for a material
   */
  const updateLotAssignment = (materialId: string, lotId: string | undefined) => {
    if (readOnly) return;

    onMaterialsChange(
      selectedMaterials.map((m) =>
        m.materialId === materialId ? { ...m, materialLotId: lotId } : m
      )
    );
  };

  /**
   * Remove material
   */
  const removeMaterial = (materialId: string) => {
    if (readOnly) return;
    onMaterialsChange(selectedMaterials.filter((m) => m.materialId !== materialId));
  };

  /**
   * Clear all selections
   */
  const clearAll = () => {
    if (readOnly) return;
    onMaterialsChange([]);
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  /**
   * Check if quantity exceeds available stock
   */
  const isQuantityExceeded = (materialId: string, quantity: number, availableStock?: number): boolean => {
    if (!availableStock) return false;
    return quantity > availableStock;
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Render FIFO indication badge
   */
  const renderFifoIndicator = (material: MaterialWithLots) => {
    if (!material.oldestLot) return null;

    const daysOld = Math.floor(
      (Date.now() - new Date(material.oldestLot.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <Badge variant="outline" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Oldest LOT: {daysOld}d
      </Badge>
    );
  };

  /**
   * Render stock availability indicator
   */
  const renderStockIndicator = (availableStock?: number) => {
    if (!availableStock) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          No Stock
        </Badge>
      );
    }

    if (availableStock < 10) {
      return (
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Low Stock: {availableStock}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        In Stock: {availableStock}
      </Badge>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={className}>
      {/* 2-Column Layout: Selected Materials | Browse Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Selected Materials */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Selected Materials ({selectedMaterials.length})
              </CardTitle>
              {!readOnly && selectedMaterials.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <Package className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No materials selected</p>
                <p className="text-xs mt-1">Select materials from the list →</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedMaterials.map((material) => {
                const exceeded = isQuantityExceeded(
                  material.materialId,
                  material.quantityNeeded,
                  material.availableStock
                );

                return (
                  <div
                    key={material.materialId}
                    className={`flex flex-col gap-2 p-3 rounded-lg border ${
                      exceeded ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {material.code} - {material.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          Quantity: {material.quantityNeeded} {material.unit}
                          {material.availableStock !== undefined && (
                            <span className="ml-2">
                              (Available: {material.availableStock} {material.unit})
                            </span>
                          )}
                        </p>
                        {exceeded && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ Quantity exceeds available stock!
                          </p>
                        )}
                      </div>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterial(material.materialId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Quantity, LOT Selection, and Product Assignment */}
                    {!readOnly && (
                      <div className="space-y-2">
                        {/* Row 1: Quantity and LOT Selection */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-xs text-gray-600 whitespace-nowrap">
                              Quantity:
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              step="0.1"
                              value={material.quantityNeeded || 1}
                              onChange={(e) =>
                                updateQuantity(
                                  material.materialId,
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className="w-20 h-8 text-sm"
                            />
                          </div>

                          {/* LOT Selector */}
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-xs text-gray-600 whitespace-nowrap">
                              LOT:
                            </Label>
                            <Select
                              value={material.materialLotId || 'FIFO'}
                              onValueChange={(value) =>
                                updateLotAssignment(
                                  material.materialId,
                                  value === 'FIFO' ? undefined : value
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-sm flex-1">
                                <SelectValue placeholder="Select LOT..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FIFO">
                                  <span className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    FIFO (Auto)
                                  </span>
                                </SelectItem>
                                {material.lots && material.lots.length > 0 ? (
                                  material.lots.map((lot) => (
                                    <SelectItem key={lot.id} value={lot.id}>
                                      {lot.lotNumber} - {Number(lot.quantityAvailable)} {material.unit}
                                      {lot.expiryDate && (
                                        <span className="text-xs text-gray-500 ml-1">
                                          (Exp: {new Date(lot.expiryDate).toLocaleDateString()})
                                        </span>
                                      )}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="NO_LOTS" disabled>
                                    No LOTs available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}

            {/* Stock Warning */}
            {selectedMaterials.some((m) =>
              isQuantityExceeded(m.materialId, m.quantityNeeded, m.availableStock)
            ) && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some materials have insufficient stock. Material consumption will fail when
                  transitioning to IN_PRODUCTION.
                </AlertDescription>
              </Alert>
            )}

            {/* FIFO Note */}
            {selectedMaterials.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-600">
                  ℹ️ Materials will be consumed via FIFO (First In, First Out) when worksheet
                  transitions to IN_PRODUCTION status.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Material Browser */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Browse Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="material-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="material-search"
                  placeholder="Search by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <Label htmlFor="type-filter">Material Type</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as MaterialType | 'ALL')}
                disabled={readOnly}
              >
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Materials List */}
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading materials...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <Package className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No materials with available stock found</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {materials.map((material) => {
                  const selected = isMaterialSelected(material.id);
                  return (
                    <div
                      key={material.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        selected ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                      onClick={() => !readOnly && toggleMaterial(material)}
                    >
                      <div className="flex items-start gap-3">
                        {!readOnly && (
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleMaterial(material)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {material.code} - {material.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {material.manufacturer} • {material.type}
                              </p>
                              {material.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {material.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Indicators */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {renderStockIndicator(material.availableStock)}
                            {renderFifoIndicator(material)}
                            {material.biocompatible && (
                              <Badge variant="outline" className="text-xs">
                                Biocompatible
                              </Badge>
                            )}
                            {material.ceMarked && (
                              <Badge variant="outline" className="text-xs">
                                CE Marked
                              </Badge>
                            )}
                          </div>

                          {/* Unit */}
                          <p className="text-xs text-gray-500 mt-2">Unit: {material.unit}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
