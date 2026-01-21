'use client';

/**
 * OCRScanner Component - GPT-4 Vision Edition
 *
 * Camera-based OCR scanner using OpenAI GPT-4 Vision API.
 * Captures photo of material label and extracts text information with high accuracy.
 *
 * Features:
 * - Direct camera capture
 * - GPT-4 Vision API for accurate OCR
 * - Manual verification UI for 100% accuracy
 * - No client-side OCR processing (faster, more reliable)
 */

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, CheckCircle2, AlertCircle, RotateCcw, X, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OCRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: OCRResult) => void;
  title?: string;
  description?: string;
  /** When true, hides LOT-related fields (LOT number, expiry, quantity) in verification UI */
  hideLotFields?: boolean;
}

export interface OCRResult {
  // LOT-related fields
  lotNumber?: string;
  expiryDate?: Date;
  quantity?: number;
  // Material-related fields (for material scanning)
  materialName?: string;
  manufacturer?: string;
  materialType?: string;
  unit?: string;
  // Metadata
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
  rawText: string;
}

interface VisionOCRData {
  lotNumber?: string;
  expiryDate?: string;
  quantity?: number;
  unit?: string;
  manufacturer?: string;
  materialName?: string;
  materialType?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  rawText?: string;
}

export function OCRScanner({
  isOpen,
  onClose,
  onScan,
  title,
  description,
  hideLotFields = false,
}: OCRScannerProps) {
  const t = useTranslations('scanner');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Image state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OCR results
  const [ocrData, setOcrData] = useState<VisionOCRData | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  // Editable fields for verification
  const [editedLotNumber, setEditedLotNumber] = useState('');
  const [editedExpiryDate, setEditedExpiryDate] = useState('');
  const [editedQuantity, setEditedQuantity] = useState('');

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraActive(true);
      console.log('🎥 Starting camera...');

      // Small delay to ensure video element is mounted
      await new Promise(resolve => setTimeout(resolve, 100));

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      console.log('✅ Camera started');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error('Play error:', e));
        };
      } else {
        setCameraActive(false);
        mediaStream.getTracks().forEach((track) => track.stop());
        setError('Camera initialization failed. Please try again.');
      }
    } catch (err) {
      console.error('❌ Camera error:', err);
      setCameraActive(false);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application.');
        } else {
          setError('Failed to access camera: ' + err.message);
        }
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraActive(false);
      console.log('🛑 Camera stopped');
    }
  }, [stream]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL (high quality JPEG)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);
    stopCamera();

    console.log('📸 Photo captured');
  }, [stopCamera]);

  // Process image with GPT-4 Vision
  const processImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🤖 Sending to GPT-4 Vision API...');

      const response = await fetch('/api/ocr/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: capturedImage }),
      });

      if (!response.ok) {
        throw new Error('Vision API failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process image');
      }

      console.log('✅ Vision OCR complete:', result.data);

      const data = result.data as VisionOCRData;
      setOcrData(data);

      // Pre-fill editable fields
      setEditedLotNumber(data.lotNumber || '');
      setEditedExpiryDate(data.expiryDate || '');
      setEditedQuantity(data.quantity?.toString() || '');

      // Show verification UI
      setShowVerification(true);

    } catch (err) {
      console.error('❌ Vision OCR error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage]);

  // Confirm and submit verified data
  const handleConfirm = () => {
    const result: OCRResult = {
      // LOT-related fields (from editable inputs)
      lotNumber: editedLotNumber || undefined,
      expiryDate: editedExpiryDate ? new Date(editedExpiryDate) : undefined,
      quantity: editedQuantity ? parseFloat(editedQuantity) : undefined,
      // Material-related fields (from OCR analysis)
      materialName: ocrData?.materialName || undefined,
      manufacturer: ocrData?.manufacturer || undefined,
      materialType: ocrData?.materialType || undefined,
      unit: ocrData?.unit || undefined,
      // Metadata
      confidence: ocrData?.confidence,
      reasoning: ocrData?.reasoning,
      rawText: ocrData?.rawText || '',
    };

    console.log('✅ Confirmed OCR data:', result);
    onScan(result);
    handleClose();
  };

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setOcrData(null);
    setShowVerification(false);
    setError(null);
    startCamera();
  }, [startCamera]);

  // Handle dialog close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setOcrData(null);
    setShowVerification(false);
    setError(null);
    setEditedLotNumber('');
    setEditedExpiryDate('');
    setEditedQuantity('');
    onClose();
  };

  // Auto-start camera when dialog opens
  React.useEffect(() => {
    if (isOpen && !cameraActive && !capturedImage) {
      startCamera();
    }
  }, [isOpen, cameraActive, capturedImage, startCamera]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get confidence text (translated)
  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return t('highConfidence');
      case 'medium':
        return t('mediumConfidence');
      case 'low':
        return t('lowConfidence');
      default:
        return confidence.toUpperCase();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            {title || t('ocrScannerTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {!description && (
            <p className="text-sm text-muted-foreground">{t('ocrScannerDescription')}</p>
          )}

          {/* Camera/Preview Area */}
          {!showVerification && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {/* Video stream */}
              {cameraActive && !capturedImage && (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              )}

              {/* Captured image preview */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured label"
                  className="w-full h-full object-contain"
                />
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                  <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                  <p className="text-white text-lg font-semibold">{t('analyzingWithAI')}</p>
                  <p className="text-white/70 text-sm mt-2">{t('gpt4Processing')}</p>
                </div>
              )}

              {/* Camera guide overlay */}
              {cameraActive && !capturedImage && !isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="relative w-3/4 h-2/3 border-4 border-blue-500 rounded-lg">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white" />
                  </div>

                  <p className="mt-4 text-white text-sm font-medium bg-black/50 px-4 py-2 rounded">
                    {t('cameraReady')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Verification UI */}
          {showVerification && ocrData && (
            <Card className="border-blue-200">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm sm:text-base">
                  <span className="flex items-center gap-2">
                    <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    {t('verifyExtractedData')}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${getConfidenceColor(ocrData.confidence)} border w-fit`}
                  >
                    {getConfidenceText(ocrData.confidence)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                {/* AI Reasoning */}
                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>{t('aiAnalysis')}</strong> {ocrData.reasoning}
                  </AlertDescription>
                </Alert>

                {/* Thumbnail of captured image */}
                {capturedImage && (
                  <div className="relative w-full h-24 sm:h-32 bg-black rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Captured label"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Editable LOT fields - hidden when scanning for materials only */}
                {!hideLotFields && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lotNumber">{t('verifyLotNumber')}</Label>
                      <Input
                        id="lotNumber"
                        value={editedLotNumber}
                        onChange={(e) => setEditedLotNumber(e.target.value.toUpperCase())}
                        placeholder={t('lotNumberPlaceholder')}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">{t('verifyExpiryDate')}</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={editedExpiryDate}
                        onChange={(e) => setEditedExpiryDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">{t('verifyQuantity')} ({ocrData.unit || 'units'})</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={editedQuantity}
                        onChange={(e) => setEditedQuantity(e.target.value)}
                        placeholder={t('enterQuantityPlaceholder')}
                      />
                    </div>
                  </div>
                )}

                {/* Additional info (read-only) */}
                {(ocrData.manufacturer || ocrData.materialName) && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {t('additionalInformation')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {ocrData.materialName && (
                        <div>
                          <span className="text-muted-foreground">{t('materialLabel')}</span>
                          <p className="font-semibold">{ocrData.materialName}</p>
                        </div>
                      )}
                      {ocrData.manufacturer && (
                        <div>
                          <span className="text-muted-foreground">{t('manufacturerLabel')}</span>
                          <p className="font-semibold">{ocrData.manufacturer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('retakePhoto')}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!hideLotFields && !editedLotNumber}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('confirmAndContinue')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          {!capturedImage && !isProcessing && !showVerification && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{t('instructionHoldSteady')}</p>
              <p>{t('instructionPositionLabel')}</p>
              <p>{t('instructionClearText')}</p>
              <p className="text-xs pt-2 text-blue-600">
                {t('poweredByGPT4')}
              </p>
            </div>
          )}

          {/* Actions */}
          {!showVerification && (
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-2" />
                {t('cancel')}
              </Button>

              {cameraActive && !capturedImage && (
                <Button type="button" onClick={capturePhoto} className="w-full sm:w-auto">
                  <Camera className="h-4 w-4 mr-2" />
                  {t('capturePhoto')}
                </Button>
              )}

              {capturedImage && !isProcessing && (
                <>
                  <Button type="button" variant="outline" onClick={retakePhoto} className="w-full sm:w-auto">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('recapture')}
                  </Button>
                  <Button type="button" onClick={processImage} className="w-full sm:w-auto">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('analyzeWithAI')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
