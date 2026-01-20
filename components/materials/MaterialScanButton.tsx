'use client';

/**
 * Material Scan Button
 *
 * Simplified scanner that:
 * 1. Opens camera OCR
 * 2. Extracts material data via AI
 * 3. Returns data to parent (doesn't show forms)
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OCRScanner, OCRResult } from './OCRScanner';
import { Scan, Loader2, CheckCircle2 } from 'lucide-react';
import { MaterialType } from '@prisma/client';

export interface ScannedMaterialData {
  name?: string;
  manufacturer?: string;
  type?: MaterialType;
  unit?: string;
  lotNumber?: string;
  expiryDate?: Date;
  quantity?: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface MaterialScanButtonProps {
  onScanComplete: (data: ScannedMaterialData) => void;
  disabled?: boolean;
}

export function MaterialScanButton({ onScanComplete, disabled }: MaterialScanButtonProps) {
  const t = useTranslations();
  const tScanner = useTranslations('scanner');
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleStartScan = () => {
    setIsOpen(true);
    setShowOCRScanner(true);
  };

  const handleOCRScan = async (ocr: OCRResult) => {
    console.log('📸 OCR scan complete:', ocr);
    setShowOCRScanner(false);
    setIsAnalyzing(true);

    try {
      // Send to smart scan API
      console.log('🤖 Sending to smart scan API...');
      const response = await fetch('/api/materials/smart-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrText: ocr.rawText,
          locale: locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Smart scan failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      console.log('✅ Smart scan result:', result.data);

      // Extract and format data
      const extractedData = result.data.extractedData;
      const scannedData: ScannedMaterialData = {
        name: extractedData.materialName,
        manufacturer: extractedData.manufacturer,
        type: extractedData.materialType as MaterialType,
        unit: extractedData.unit,
        lotNumber: extractedData.lotNumber,
        expiryDate: extractedData.expiryDate ? new Date(extractedData.expiryDate) : undefined,
        quantity: extractedData.quantity,
        confidence: result.data.confidence,
        reasoning: result.data.reasoning,
      };

      // Return data to parent
      onScanComplete(scannedData);
      setIsOpen(false);

    } catch (error: any) {
      console.error('❌ Smart scan error:', error);
      alert(error.message || 'Could not analyze material. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleStartScan}
        disabled={disabled}
      >
        <Scan className="mr-2 h-4 w-4" />
        {tScanner('scanButton')}
      </Button>

      {/* OCRScanner has its own Dialog - don't wrap it */}
      <OCRScanner
        isOpen={showOCRScanner}
        onClose={() => {
          setShowOCRScanner(false);
          setIsOpen(false);
        }}
        onScan={handleOCRScan}
        title={tScanner('scanTitle')}
        description={tScanner('scanDescription')}
      />

      {/* Analyzing state overlay */}
      <Dialog open={isAnalyzing} onOpenChange={() => {}}>
        <DialogContent className="max-w-xl">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {tScanner('analyzing')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
