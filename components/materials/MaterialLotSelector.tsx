'use client';

import { useState, useEffect } from 'react';
import { MaterialLotWithMaterial } from '@/types/material';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaterialLotSelectorProps {
  materialId: string;
  materialName: string;
  selectedLotId?: string;
  onSelectLot: (lotId: string) => void;
  onAddNewLot?: () => void;
}

export function MaterialLotSelector({
  materialId,
  materialName,
  selectedLotId,
  onSelectLot,
  onAddNewLot,
}: MaterialLotSelectorProps) {
  const [lots, setLots] = useState<MaterialLotWithMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableLots();
  }, [materialId]);

  const fetchAvailableLots = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/materials/${materialId}/lots?status=AVAILABLE`
      );
      if (!response.ok) throw new Error('Failed to fetch LOTs');
      const result = await response.json();
      setLots(result.data || []);
    } catch (error) {
      console.error('Error fetching LOTs:', error);
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  // Get days until expiry
  const getDaysUntilExpiry = (expiryDate: Date | null): number | null => {
    if (!expiryDate) return null;
    const now = new Date();
    const diff = new Date(expiryDate).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No available LOTs for {materialName}
        </p>
        {onAddNewLot && (
          <Button onClick={onAddNewLot} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Record New Stock Arrival
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Select LOT:</div>

      <RadioGroup value={selectedLotId} onValueChange={onSelectLot}>
        <div className="space-y-3">
          {lots.map((lot, index) => {
            const daysUntilExpiry = getDaysUntilExpiry(lot.expiryDate);
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry < 30;
            const isFirstFIFO = index === 0;

            return (
              <div key={lot.id} className="flex items-center space-x-3">
                <RadioGroupItem value={lot.id} id={lot.id} />
                <Label
                  htmlFor={lot.id}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <span className="font-mono">{lot.lotNumber}</span>

                  {isFirstFIFO && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      FIFO
                    </Badge>
                  )}

                  {isExpiringSoon && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                      ⚠️
                    </Badge>
                  )}
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>

      {onAddNewLot && (
        <Button onClick={onAddNewLot} variant="outline" size="sm" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Record New Stock Arrival
        </Button>
      )}
    </div>
  );
}
