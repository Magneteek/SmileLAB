'use client';

/**
 * Material Scan Button
 *
 * Simplified scanner that:
 * 1. Opens camera OCR
 * 2. Extracts material data via GPT-4 Vision
 * 3. Returns data to parent (doesn't show forms)
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { OCRScanner, OCRResult } from './OCRScanner';
import { Scan } from 'lucide-react';
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
  rawText?: string; // Raw OCR text for smart-scan API
}

interface MaterialScanButtonProps {
  onScanComplete: (data: ScannedMaterialData) => void;
  disabled?: boolean;
}

export function MaterialScanButton({ onScanComplete, disabled }: MaterialScanButtonProps) {
  const tScanner = useTranslations('scanner');
  const [showOCRScanner, setShowOCRScanner] = useState(false);

  const handleStartScan = () => {
    setShowOCRScanner(true);
  };

  const handleOCRScan = (ocr: OCRResult) => {
    console.log('📸 OCR scan complete:', ocr);
    setShowOCRScanner(false);

    // OCRResult now contains all extracted data directly from the scanner
    // Data is already processed by GPT-4 Vision in OCRScanner
    const scannedData: ScannedMaterialData = {
      name: ocr.materialName,
      manufacturer: ocr.manufacturer,
      type: ocr.materialType as MaterialType,
      unit: ocr.unit,
      lotNumber: ocr.lotNumber,
      expiryDate: ocr.expiryDate,
      quantity: ocr.quantity,
      confidence: ocr.confidence || 'medium',
      reasoning: ocr.reasoning || 'Data extracted from label scan',
      rawText: ocr.rawText, // Pass raw OCR text for smart-scan
    };

    console.log('✅ Scanned material data:', scannedData);

    // Return data to parent
    onScanComplete(scannedData);
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

      <OCRScanner
        isOpen={showOCRScanner}
        onClose={() => setShowOCRScanner(false)}
        onScan={handleOCRScan}
        title={tScanner('scanTitle')}
        description={tScanner('scanDescription')}
        hideLotFields={true}
      />
    </>
  );
}
