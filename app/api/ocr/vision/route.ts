import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

interface VisionOCRResult {
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

/**
 * Vision OCR API - Uses OpenAI GPT-4 Vision for dental material label scanning
 *
 * POST /api/ocr/vision
 *
 * Analyzes a camera image of a dental material label and extracts:
 * - LOT number (batch/lot identifier)
 * - Expiry date
 * - Quantity and unit
 * - Manufacturer name
 * - Material name and type
 *
 * Returns structured data with confidence scoring.
 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: imageBase64 is required' },
        { status: 400 }
      );
    }

    // Check if OpenAI is configured
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API not configured. Please set OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    console.log('🖼️ Processing image with GPT-4 Vision...');
    console.log('📏 Image size:', Math.round(imageBase64.length / 1024), 'KB');

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Omni - best for vision + structured output
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a dental material label. Extract the following information with high accuracy:

**Critical Fields:**
1. LOT/Batch Number - Look for "LOT", "Lot", "Batch", "REF", or alphanumeric codes (5-10 chars)
2. Expiry Date - Look for "Exp", "Expiry", "Use by", "Best before" (convert to YYYY-MM-DD)
3. Quantity - Number with unit (g, ml, kg, units)
4. Manufacturer - Company name (e.g., Ivoclar Vivadent, 3M, Vita)
5. Material Name - Product name (e.g., IPS e.max CAD, Zirconia HT)
6. Material Type - Classify as: CERAMIC, METAL, RESIN, COMPOSITE, PORCELAIN, ZIRCONIA, TITANIUM, ALLOY, ACRYLIC, WAX, OTHER

**OCR Error Correction:**
- Correct common mistakes: s/S → 5, l/I → 1, O → 0 (in alphanumeric codes)
- Normalize dates to YYYY-MM-DD format
- Clean up manufacturer/material names

**Confidence Levels:**
- HIGH: All critical fields found clearly
- MEDIUM: Some fields found, some uncertain
- LOW: Major fields missing or very unclear

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "lotNumber": "string or null",
  "expiryDate": "YYYY-MM-DD or null",
  "quantity": number or null,
  "unit": "g|ml|kg|units or null",
  "manufacturer": "string or null",
  "materialName": "string or null",
  "materialType": "CERAMIC|METAL|etc or null",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation of what you found and any corrections",
  "rawText": "all visible text from the label"
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'high', // High detail for better OCR accuracy
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for consistent, factual extraction
      response_format: { type: 'json_object' }, // Enforce JSON response
    });

    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      throw new Error('No response from GPT-4 Vision');
    }

    console.log('📄 GPT-4 Vision response:', messageContent);

    // Parse the JSON response
    const parsed: VisionOCRResult = JSON.parse(messageContent);

    console.log('✅ Parsed OCR data:', {
      lotNumber: parsed.lotNumber,
      expiryDate: parsed.expiryDate,
      confidence: parsed.confidence,
    });

    // Log token usage for monitoring
    console.log('💰 Token usage:', {
      prompt: response.usage?.prompt_tokens,
      completion: response.usage?.completion_tokens,
      total: response.usage?.total_tokens,
    });

    return NextResponse.json({
      success: true,
      data: parsed,
      usage: response.usage, // Return for monitoring/cost tracking
    });
  } catch (error) {
    console.error('❌ Vision OCR error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
