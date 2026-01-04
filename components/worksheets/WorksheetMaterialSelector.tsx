'use client';

/**
 * Worksheet Material Selector
 *
 * Example usage in worksheet creation form.
 * Shows how to integrate MaterialLotSelector for flexible LOT selection.
 */

import { useState } from 'react';
import { MaterialLotSelector } from '@/components/materials/MaterialLotSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaterialSelection {
  materialId: string;
  materialName: string;
  lotId: string;
  quantity: number;
}

export function WorksheetMaterialSelector() {
  const [materialId, setMaterialId] = useState<string>('');
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);

  // In real implementation, fetch from API
  const materials = [
    { id: '1', name: 'Ceramic (Type A)', unit: 'gram' },
    { id: '2', name: 'Zirconia', unit: 'gram' },
    { id: '3', name: 'Metal Alloy', unit: 'gram' },
  ];

  const handleAddMaterial = () => {
    if (!materialId || !selectedLotId || !quantity) {
      alert('Please select material, LOT, and quantity');
      return;
    }

    const selection: MaterialSelection = {
      materialId,
      materialName: materials.find(m => m.id === materialId)?.name || '',
      lotId: selectedLotId,
      quantity,
    };

    console.log('Material selected:', selection);
    // In real implementation: add to worksheet materials list
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Material to Worksheet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Material Selection */}
        <div className="space-y-2">
          <Label>Material</Label>
          <Select value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger>
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              {materials.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* LOT Selection - Only shows when material is selected */}
        {materialId && (
          <>
            <div className="space-y-2">
              <MaterialLotSelector
                materialId={materialId}
                materialName={materials.find(m => m.id === materialId)?.name || ''}
                selectedLotId={selectedLotId}
                onSelectLot={setSelectedLotId}
                onAddNewLot={() => {
                  console.log('Open stock arrival modal for material:', materialId);
                  // In real implementation: open StockArrivalForm in dialog
                }}
              />
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label>Quantity ({materials.find(m => m.id === materialId)?.unit})</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
