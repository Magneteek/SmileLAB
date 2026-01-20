import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

/**
 * Safely extract JSON from AI response
 * Handles markdown code blocks: ```json { ... } ```
 */
function extractJSON(text: string): any {
  try {
    // First try direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to find JSON object boundaries
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    }

    throw new Error('No valid JSON found in response');
  }
}

interface SmartScanResult {
  // Material identification
  materialExists: boolean;
  matchedMaterial?: {
    id: string;
    name: string;
    code: string;
    type: string;
    manufacturer: string;
    unit: string;
  };

  // Extracted data from label
  extractedData: {
    materialName?: string;
    manufacturer?: string;
    materialType?: string;
    lotNumber?: string;
    expiryDate?: string;
    quantity?: number;
    unit?: string;
  };

  // AI reasoning
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  matchScore?: number; // 0-100 similarity score
}

/**
 * Smart Material Scanner API
 *
 * POST /api/materials/smart-scan
 *
 * Analyzes OCR text from material label and determines:
 * 1. What material this is (name, type, manufacturer)
 * 2. Whether it exists in database
 * 3. LOT information to add
 *
 * Returns decision path: "add-lot" or "create-material"
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ocrText, locale = 'en' } = await request.json();

    if (!ocrText || typeof ocrText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: ocrText is required' },
        { status: 400 }
      );
    }

    // Map locale to language name for AI instructions
    const languageMap: Record<string, string> = {
      'en': 'English',
      'sl': 'Slovenian',
      'es': 'Spanish',
      'de': 'German',
      'fr': 'French',
    };
    const responseLanguage = languageMap[locale] || 'English';

    if (!anthropic) {
      return NextResponse.json(
        { error: 'AI parsing not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    console.log('🔍 Smart scanning material label...');
    console.log('📄 OCR Text:', ocrText);
    console.log('🌐 Response Language:', responseLanguage);

    // Step 1: Use AI to extract structured data from OCR text
    console.log('🤖 Step 1: Extracting structured data with AI...');

    const extractionMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are analyzing text extracted from a dental material label using OCR. The OCR may have errors.

Extract and correct the following information:
1. Material name (e.g., "IPS e.max CAD", "Vita Enamic", "Zirconia HT")
2. Manufacturer (e.g., "Ivoclar Vivadent", "Vita Zahnfabrik", "3M")
3. Material type (classify as one of: CERAMIC, METAL, RESIN, COMPOSITE, PORCELAIN, ZIRCONIA, TITANIUM, ALLOY, ACRYLIC, WAX, OTHER)
4. LOT/Batch number
5. Expiry date
6. Quantity with unit (g, ml, kg, units)

OCR Text:
"""
${ocrText}
"""

IMPORTANT: Write the "reasoning" field in ${responseLanguage}.

Respond with ONLY a JSON object (no markdown):
{
  "materialName": "string or null",
  "manufacturer": "string or null",
  "materialType": "CERAMIC|METAL|RESIN|etc or null",
  "lotNumber": "string or null",
  "expiryDate": "YYYY-MM-DD or null",
  "quantity": number or null,
  "unit": "g|ml|kg|units or null",
  "confidence": "high|medium|low",
  "reasoning": "what you found and corrections made (write this in ${responseLanguage})"
}`,
        },
      ],
    });

    const extractedText = extractionMessage.content[0].type === 'text'
      ? extractionMessage.content[0].text
      : '';

    console.log('📝 Raw AI response (extraction):', extractedText.substring(0, 200));

    const extractedData = extractJSON(extractedText);
    console.log('✅ Extracted data:', extractedData);

    // Step 2: Search for matching materials in database
    console.log('🔎 Step 2: Searching for matching materials in database...');

    const materials = await prisma.material.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        manufacturer: true,
        unit: true,
      },
    });

    console.log(`📊 Found ${materials.length} active materials in database`);

    // Step 3: Use AI to find best match
    console.log('🤖 Step 3: Using AI to find best match...');

    const matchingMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are matching a scanned dental material against an existing database.

SCANNED MATERIAL:
- Name: ${extractedData.materialName || 'unknown'}
- Manufacturer: ${extractedData.manufacturer || 'unknown'}
- Type: ${extractedData.materialType || 'unknown'}

DATABASE MATERIALS:
${materials.map(m => `- ID: ${m.id}, Code: ${m.code}, Name: ${m.name}, Type: ${m.type}, Manufacturer: ${m.manufacturer}`).join('\n')}

Task: Determine if the scanned material matches any database material.

Consider:
- Exact name matches (highest confidence)
- Similar names (e.g., "IPS emax" vs "IPS e.max CAD")
- Same manufacturer + similar type
- Common abbreviations and variations

IMPORTANT: Write the "reasoning" field in ${responseLanguage}.

Respond with ONLY a JSON object (no markdown):
{
  "materialExists": boolean,
  "matchedMaterialId": "string or null",
  "matchScore": number (0-100, where 100 is perfect match),
  "confidence": "high|medium|low",
  "reasoning": "why this is or isn't a match (write this in ${responseLanguage})"
}

If no good match (score < 60), set materialExists to false.`,
        },
      ],
    });

    const matchText = matchingMessage.content[0].type === 'text'
      ? matchingMessage.content[0].text
      : '';

    console.log('📝 Raw AI response (matching):', matchText.substring(0, 200));

    const matchResult = extractJSON(matchText);
    console.log('✅ Match result:', matchResult);

    // Step 4: Build response
    const result: SmartScanResult = {
      materialExists: matchResult.materialExists,
      extractedData: {
        materialName: extractedData.materialName,
        manufacturer: extractedData.manufacturer,
        materialType: extractedData.materialType,
        lotNumber: extractedData.lotNumber,
        expiryDate: extractedData.expiryDate,
        quantity: extractedData.quantity,
        unit: extractedData.unit,
      },
      confidence: matchResult.confidence,
      reasoning: matchResult.reasoning,
      matchScore: matchResult.matchScore,
    };

    // If material exists, add full material details
    if (matchResult.materialExists && matchResult.matchedMaterialId) {
      const matchedMaterial = materials.find(m => m.id === matchResult.matchedMaterialId);
      if (matchedMaterial) {
        result.matchedMaterial = matchedMaterial;
      }
    }

    console.log('🎯 Final result:', result);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('❌ Smart scan error:', error);

    // Log detailed error info for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? {
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
        } : undefined,
      },
      { status: 500 }
    );
  }
}
