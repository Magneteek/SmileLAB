'use client';

/**
 * OCRScanner Component
 *
 * Camera-based OCR scanner using Tesseract.js library.
 * Captures photo of material label and extracts text information.
 *
 * Extracts:
 * - LOT number (looks for "LOT" prefix)
 * - Expiry date (recognizes various date formats)
 * - Quantity information
 */

import React, { useState, useRef, useCallback } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Loader2, CheckCircle2, AlertCircle, RotateCcw, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OCRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: OCRResult) => void;
  title?: string;
  description?: string;
}

export interface OCRResult {
  lotNumber?: string;
  expiryDate?: Date;
  quantity?: number;
  rawText: string;
}

export function OCRScanner({
  isOpen,
  onClose,
  onScan,
  title,
  description,
}: OCRScannerProps) {
  const t = useTranslations('material');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraActive(true); // Set this FIRST so video element renders
      console.log('🎥 Starting camera...');
      console.log('📱 Checking navigator.mediaDevices:', !!navigator.mediaDevices);

      // Small delay to ensure video element is mounted
      await new Promise(resolve => setTimeout(resolve, 100));

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      console.log('✅ getUserMedia succeeded');
      console.log('📹 Stream details:', {
        active: mediaStream.active,
        tracks: mediaStream.getVideoTracks().length,
        trackState: mediaStream.getVideoTracks()[0]?.readyState,
      });

      console.log('🎬 Checking videoRef.current:', !!videoRef.current);

      if (videoRef.current) {
        console.log('📺 Setting srcObject...');
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        console.log('✅ Camera started successfully');

        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded');
          videoRef.current?.play().catch(e => console.error('Play error:', e));
        };
      } else {
        console.error('❌ videoRef.current is null');
        setError('Video element not ready. Please try again.');
        setCameraActive(false);
        // Stop the stream since we can't use it
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.error('❌ Camera error:', err);
      setCameraActive(false);
      if (err instanceof Error) {
        console.error('❌ Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });

        if (err.name === 'NotAllowedError') {
          setError(t('scannerPermissionDenied'));
        } else if (err.name === 'NotFoundError') {
          setError(t('scannerNoCameraError'));
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera does not meet requirements. Trying fallback...');
          // Retry with simpler constraints
          setTimeout(() => startCameraFallback(), 500);
        } else {
          setError('Failed to access camera: ' + err.message);
        }
      }
    }
  }, [t]);

  // Fallback camera with simpler constraints
  const startCameraFallback = useCallback(async () => {
    try {
      setCameraActive(true); // Set this FIRST so video element renders
      console.log('🔄 Trying fallback camera...');

      // Small delay to ensure video element is mounted
      await new Promise(resolve => setTimeout(resolve, 100));

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true, // Simple constraint
      });

      console.log('✅ Fallback getUserMedia succeeded');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setError(null);
        console.log('✅ Fallback camera started');
      } else {
        console.error('❌ Fallback: videoRef.current is null');
        setCameraActive(false);
        mediaStream.getTracks().forEach((track) => track.stop());
        setError('Unable to access camera. Please try again.');
      }
    } catch (err) {
      console.error('❌ Fallback camera error:', err);
      setCameraActive(false);
      setError('Unable to access camera. Please check permissions and try again.');
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

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);
    stopCamera();

    console.log('📸 Photo captured');
  }, [stopCamera]);

  // Normalize common OCR errors in text
  const normalizeOCRErrors = (text: string): string => {
    let normalized = text;

    // Common OCR character mistakes
    // s/S at end of alphanumeric strings often should be 5
    normalized = normalized.replace(/([A-Z0-9]{2,})[sS](?=\s|$)/g, '$15');

    // l (lowercase L) to 1
    normalized = normalized.replace(/([0-9])[lI]([0-9])/g, '$11$2');

    // O (letter O) to 0 (zero) when surrounded by numbers
    normalized = normalized.replace(/([0-9])[O]([0-9])/g, '$10$2');

    // Common word corrections
    normalized = normalized.replace(/[lI]ot/gi, 'LOT');
    normalized = normalized.replace(/Exp[il1]ry/gi, 'Expiry');

    console.log('🔄 Normalized text:', normalized);
    return normalized;
  };

  // Parse extracted text to find LOT info
  const parseExtractedText = (text: string): OCRResult => {
    const result: OCRResult = {
      rawText: text,
    };

    // First normalize common OCR errors
    const normalizedText = normalizeOCRErrors(text);

    // Extract LOT number - multiple patterns
    const lotPatterns = [
      // Standard format with "LOT" prefix
      /LOT[:\s]*([A-Z0-9]+)/i,
      /Lot[:\s]*([A-Z0-9]+)/i,
      /lot[:\s]*([A-Z0-9]+)/i,
      // Without prefix - look for likely LOT patterns
      // Uppercase letter(s) followed by numbers (e.g., Z093W5, AB12345)
      /\b([A-Z]{1,3}[0-9]{3,}[A-Z0-9]{0,3})\b/,
      // Any uppercase alphanumeric 5-10 chars (common LOT format)
      /\b([A-Z0-9]{5,10})\b/,
    ];

    for (const pattern of lotPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        // Clean up the matched LOT number
        let lotNumber = match[1].trim().toUpperCase();

        // Additional normalization for the extracted LOT
        lotNumber = lotNumber
          .replace(/[sS]$/, '5')  // Trailing s/S to 5
          .replace(/[lI]/g, '1')  // l/I to 1
          .replace(/[O]/g, '0');  // O to 0 (when all uppercase)

        result.lotNumber = lotNumber;
        console.log('✅ Found LOT:', result.lotNumber, '(original:', match[1], ')');
        break;
      }
    }

    // Extract expiry date (various formats)
    // Look for dates near "Exp", "Expiry", "Expires", "Use by", "Best before"
    const datePatterns = [
      // With prefix: Exp. YYYY-MM-DD or Expiry: YYYY-MM-DD
      /(?:Exp(?:iry)?[.:]?\s*)(\d{4})-(\d{2})-(\d{2})/i,
      // With prefix: Exp. DD.MM.YYYY or DD/MM/YYYY
      /(?:Exp(?:iry)?[.:]?\s*)(\d{2})[./](\d{2})[./](\d{4})/i,
      // Standalone: YYYY-MM-DD
      /(\d{4})-(\d{2})-(\d{2})/,
      // Standalone: DD.MM.YYYY or DD/MM/YYYY
      /(\d{2})[./](\d{2})[./](\d{4})/,
      // MM/DD/YYYY
      /(\d{2})\/(\d{2})\/(\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        try {
          let date: Date;

          // Check which pattern matched
          if (match[0].includes('-')) {
            // YYYY-MM-DD format
            if (match[1].length === 4) {
              // Already in YYYY-MM-DD
              date = new Date(match[0].replace(/.*?(\d{4}-\d{2}-\d{2}).*/, '$1'));
            } else {
              // DD-MM-YYYY
              const [_, day, month, year] = match;
              date = new Date(`${year}-${month}-${day}`);
            }
          } else if (match[0].includes('.') || match[0].includes('/')) {
            // DD.MM.YYYY or DD/MM/YYYY format
            const parts = match[0].match(/\d+/g);
            if (parts && parts.length === 3) {
              // Assume DD MM YYYY if first number <= 31
              if (parseInt(parts[0]) <= 31) {
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                // MM DD YYYY
                date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
              }
            } else {
              continue;
            }
          } else {
            continue;
          }

          // Validate date is in the future and reasonable (within 50 years)
          const now = new Date();
          const fiftyYears = new Date();
          fiftyYears.setFullYear(fiftyYears.getFullYear() + 50);

          if (!isNaN(date.getTime()) && date > now && date < fiftyYears) {
            result.expiryDate = date;
            console.log('✅ Found expiry date:', date.toISOString().split('T')[0]);
            break;
          }
        } catch (e) {
          console.log('⚠️ Date parse error:', e);
        }
      }
    }

    // Extract quantity (look for numbers followed by g, ml, units)
    const quantityPattern = /(\d+(?:\.\d+)?)\s*(g|ml|kg|units?)/i;
    const quantityMatch = text.match(quantityPattern);
    if (quantityMatch) {
      const value = parseFloat(quantityMatch[1]);
      const unit = quantityMatch[2].toLowerCase();

      // Convert to base units if needed
      if (unit === 'kg') {
        result.quantity = value * 1000; // Convert kg to g
      } else {
        result.quantity = value;
      }
      console.log('✅ Found quantity:', result.quantity);
    }

    return result;
  };

  // Preprocess image for better OCR accuracy
  const preprocessImage = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

          // Increase contrast (make darks darker, lights lighter)
          const contrast = 1.5;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          let adjusted = factor * (avg - 128) + 128;

          // Apply threshold for better text clarity
          adjusted = adjusted > 128 ? 255 : 0;

          data[i] = adjusted;     // R
          data[i + 1] = adjusted; // G
          data[i + 2] = adjusted; // B
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 1.0));
      };
      img.src = imageDataUrl;
    });
  };

  // Parse with LLM (intelligent parsing)
  const parseWithLLM = async (text: string): Promise<OCRResult | null> => {
    try {
      console.log('🤖 Trying LLM-based parsing...');

      const response = await fetch('/api/ocr/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ LLM parsing successful:', result.data);

        const parsed: OCRResult = {
          rawText: text,
          lotNumber: result.data.lotNumber || undefined,
          expiryDate: result.data.expiryDate
            ? new Date(result.data.expiryDate)
            : undefined,
          quantity: result.data.quantity || undefined,
        };

        if (result.data.reasoning) {
          console.log('💡 LLM reasoning:', result.data.reasoning);
        }

        return parsed;
      } else {
        console.log('⚠️ LLM parsing failed or not configured, using fallback');
        return null;
      }
    } catch (error) {
      console.error('❌ LLM parsing error:', error);
      return null;
    }
  };

  // Process image with OCR
  const processImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError(null);
    setExtractedText('');

    try {
      console.log('🔍 Starting OCR processing...');

      // Preprocess image for better accuracy
      console.log('🖼️ Preprocessing image...');
      const processedImage = await preprocessImage(capturedImage);

      const worker = await createWorker('eng', 1, {
        logger: (m) => console.log('Tesseract:', m),
      });

      // Configure Tesseract for better accuracy
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-:. ',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Assume uniform block of text
      });

      const {
        data: { text },
      } = await worker.recognize(processedImage);
      await worker.terminate();

      console.log('✅ OCR complete');
      console.log('📄 Extracted text:', text);

      setExtractedText(text);

      // Try LLM-based parsing first (more intelligent)
      let parsed = await parseWithLLM(text);

      // Fall back to regex parsing if LLM fails
      if (!parsed || !parsed.lotNumber) {
        console.log('🔄 Falling back to regex parsing...');
        parsed = parseExtractedText(text);
      }

      if (parsed.lotNumber) {
        onScan(parsed);
        onClose();
      } else {
        setError('Could not find LOT number. Please verify the extracted text below and enter manually if needed.');
      }
    } catch (err) {
      console.error('❌ OCR error:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, onScan, onClose]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setExtractedText('');
    setError(null);
    startCamera();
  }, [startCamera]);

  // Handle dialog close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setExtractedText('');
    setError(null);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title || 'Scan Material Label'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {/* Camera/Preview Area */}
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
                <p className="text-white text-lg font-semibold">Processing image...</p>
                <p className="text-white/70 text-sm mt-2">Extracting text from label</p>
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
                  Position label within frame
                </p>
              </div>
            )}
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Extracted text preview */}
          {extractedText && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs font-semibold mb-1">Extracted Text:</p>
              <p className="text-xs font-mono whitespace-pre-wrap">{extractedText}</p>
            </div>
          )}

          {/* Instructions */}
          {!capturedImage && !isProcessing && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Hold camera steady and ensure good lighting</p>
              <p>• Position the label within the frame</p>
              <p>• Make sure text is clear and readable</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            {cameraActive && !capturedImage && (
              <Button type="button" onClick={capturePhoto} className="w-full sm:w-auto">
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
            )}

            {capturedImage && !isProcessing && (
              <>
                <Button type="button" variant="outline" onClick={retakePhoto} className="w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button type="button" onClick={processImage} className="w-full sm:w-auto">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Process Image
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
