import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
// SDK automatically handles x-api-key, anthropic-version, and content-type headers
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

/**
 * Retry wrapper for Anthropic API calls
 * Handles 529 (overloaded) and 429 (rate limit) with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a retryable error (429 or 529)
      const status = error?.status || error?.statusCode;
      const isRetryable = status === 429 || status === 529;

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ API overloaded (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

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
 * Receives ALREADY EXTRACTED data from GPT-4 Vision OCR Scanner
 * and uses Claude AI for SMART MATCHING against database.
 *
 * This is a single-purpose AI call: intelligent fuzzy matching
 * - Handles name variations (e.g., "IPS emax" vs "IPS e.max CAD")
 * - Considers manufacturer + type combinations
 * - Understands dental material naming conventions
 *
 * GPT-4 Vision handles extraction, Claude handles matching logic.
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

    const body = await request.json();
    const { locale = 'en' } = body;

    // Accept pre-extracted data from GPT-4 Vision OR raw OCR text for backwards compatibility
    const extractedData = {
      materialName: body.materialName || body.name,
      manufacturer: body.manufacturer,
      materialType: body.materialType || body.type,
      lotNumber: body.lotNumber,
      expiryDate: body.expiryDate,
      quantity: body.quantity,
      unit: body.unit,
    };

    // Need at least name or manufacturer to do matching
    if (!extractedData.materialName && !extractedData.manufacturer) {
      return NextResponse.json(
        { error: 'Invalid request: materialName or manufacturer is required' },
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

    console.log('🔍 Smart matching material against database...');
    console.log('📦 Extracted data from GPT-4 Vision:', extractedData);
    console.log('🌐 Response Language:', responseLanguage);

    // Step 1: Get all active materials from database
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

    // If no materials in database, no need for AI matching
    if (materials.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          materialExists: false,
          extractedData,
          confidence: 'high',
          reasoning: 'No materials in database to match against',
        } as SmartScanResult,
      });
    }

    if (!anthropic) {
      return NextResponse.json(
        { error: 'AI matching not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    // Step 2: Use Claude AI for intelligent fuzzy matching (SINGLE API CALL)
    console.log('🤖 Using Claude AI for smart matching...');

    const matchingMessage = await withRetry(() => anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert dental materials specialist matching a scanned material against an existing inventory database.

SCANNED MATERIAL (from label):
- Name: ${extractedData.materialName || 'not detected'}
- Manufacturer: ${extractedData.manufacturer || 'not detected'}
- Type: ${extractedData.materialType || 'not detected'}

EXISTING MATERIALS IN DATABASE:
${materials.map(m => `- ID: ${m.id}, Code: ${m.code}, Name: "${m.name}", Type: ${m.type}, Manufacturer: "${m.manufacturer}"`).join('\n')}

YOUR TASK: Determine if the scanned material is the SAME as any material in the database.

MATCHING CRITERIA (in order of importance):
1. **Exact name match** → 100% confidence
2. **Same material, different naming** (e.g., "IPS emax" = "IPS e.max CAD", "Zirconia" = "Zirconia HT") → high confidence
3. **Same manufacturer + similar product line** → medium confidence
4. **Similar name but different manufacturer** → likely different material, low confidence

IMPORTANT DENTAL KNOWLEDGE:
- Product names often have variations: "IPS e.max CAD" vs "IPS emax" vs "e.max"
- Manufacturers matter: "Vita Enamic" (Vita) ≠ "Enamic" (other brand)
- Type helps disambiguate: same name + same type = likely same material

Write your "reasoning" in ${responseLanguage}.

Respond with ONLY JSON (no markdown):
{
  "materialExists": boolean,
  "matchedMaterialId": "exact ID from database or null",
  "matchScore": number (0-100),
  "confidence": "high" | "medium" | "low",
  "reasoning": "explain your matching logic in ${responseLanguage}"
}

Set materialExists=false if matchScore < 60 or no confident match found.`,
        },
      ],
    }));

    const matchText = matchingMessage.content[0].type === 'text'
      ? matchingMessage.content[0].text
      : '';

    console.log('📝 AI matching response:', matchText.substring(0, 300));

    const matchResult = extractJSON(matchText);
    console.log('✅ Match result:', matchResult);

    // Step 3: Build response
    const result: SmartScanResult = {
      materialExists: matchResult.materialExists,
      extractedData,
      confidence: matchResult.confidence,
      reasoning: matchResult.reasoning,
      matchScore: matchResult.matchScore,
    };

    // If material exists, add full material details
    if (matchResult.materialExists && matchResult.matchedMaterialId) {
      const matchedMaterial = materials.find(m => m.id === matchResult.matchedMaterialId);
      if (matchedMaterial) {
        result.matchedMaterial = matchedMaterial;
      } else {
        // AI returned an ID that doesn't exist - treat as no match
        console.warn('⚠️ AI returned non-existent material ID:', matchResult.matchedMaterialId);
        result.materialExists = false;
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
