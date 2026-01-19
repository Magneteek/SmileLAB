import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

interface ParsedOCRData {
  lotNumber?: string;
  expiryDate?: string;
  quantity?: number;
  manufacturer?: string;
  materialType?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text is required' },
        { status: 400 }
      );
    }

    // If no API key, return fallback response
    if (!anthropic) {
      console.log('⚠️ No Anthropic API key configured, using fallback parsing');
      return NextResponse.json({
        success: false,
        error: 'LLM parsing not configured',
        fallback: true,
      });
    }

    console.log('🤖 Sending OCR text to Claude for intelligent parsing...');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are analyzing text extracted from a dental material label using OCR. The OCR may have errors (e.g., 's' instead of '5', 'l' instead of '1', 'O' instead of '0').

Your task is to extract and correct the following information:
1. LOT number (batch number) - usually alphanumeric, 5-10 characters
2. Expiry date - in any format (YYYY-MM-DD, DD.MM.YYYY, etc.)
3. Quantity (if present) - with unit
4. Manufacturer name (if present)
5. Material type (if present)

OCR Text:
"""
${text}
"""

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "lotNumber": "corrected LOT number or null",
  "expiryDate": "YYYY-MM-DD format or null",
  "quantity": number or null,
  "manufacturer": "name or null",
  "materialType": "type or null",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation of what you found and any corrections made"
}

Important:
- Correct common OCR errors (s→5, l→1, O→0)
- Convert dates to YYYY-MM-DD format
- If uncertain, set confidence to "low"
- Return null for fields you cannot find`,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    console.log('📄 Claude response:', responseText);

    // Parse the JSON response
    const parsed: ParsedOCRData = JSON.parse(responseText);

    console.log('✅ Parsed data:', parsed);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('❌ OCR parsing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
      },
      { status: 500 }
    );
  }
}
