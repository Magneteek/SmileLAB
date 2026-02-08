/**
 * Vision API Debug Endpoint
 *
 * This endpoint can be called on production to test Vision API configuration
 *
 * Usage: GET https://your-domain.com/api/debug/vision-test
 *
 * Returns diagnostic information about Vision API setup
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(req: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  // 1. Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  diagnostics.checks.apiKeyExists = !!apiKey;

  if (!apiKey) {
    diagnostics.checks.apiKeyFormat = 'N/A - API key not found';
    diagnostics.error = 'OPENAI_API_KEY environment variable is not set';
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // 2. Check API key format
  diagnostics.checks.apiKeyPrefix = apiKey.substring(0, 10) + '...';
  diagnostics.checks.apiKeyLength = apiKey.length;
  diagnostics.checks.apiKeyFormat = apiKey.startsWith('sk-') ? 'Valid' : 'Invalid (should start with sk-)';

  // 3. Test OpenAI client initialization
  let openai: OpenAI | null = null;
  try {
    openai = new OpenAI({ apiKey });
    diagnostics.checks.clientInitialization = 'Success';
  } catch (error: any) {
    diagnostics.checks.clientInitialization = `Failed: ${error.message}`;
    diagnostics.error = 'Failed to initialize OpenAI client';
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // 4. Test Vision API with minimal request
  try {
    // Simple 1x1 red pixel image for testing
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with JSON.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What color is this pixel?'
            },
            {
              type: 'image_url',
              image_url: {
                url: testImage,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const duration = Date.now() - startTime;

    diagnostics.checks.visionApiTest = {
      status: 'Success',
      responseTime: `${duration}ms`,
      model: response.model,
      finishReason: response.choices[0].finish_reason,
      tokensUsed: response.usage?.total_tokens || 0,
      response: response.choices[0].message.content
    };

    diagnostics.status = 'All checks passed';
    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error: any) {
    diagnostics.checks.visionApiTest = {
      status: 'Failed',
      errorType: error.constructor.name,
      errorMessage: error.message,
      statusCode: error.status || error.statusCode,
    };

    // Provide specific error guidance
    if (error.status === 401 || error.statusCode === 401) {
      diagnostics.error = 'Authentication failed - API key is invalid or expired';
      diagnostics.recommendation = 'Check your OPENAI_API_KEY in environment variables';
    } else if (error.status === 429 || error.statusCode === 429) {
      diagnostics.error = 'Rate limit exceeded or insufficient credits';
      diagnostics.recommendation = 'Check your OpenAI account at https://platform.openai.com/usage';
    } else if (error.status === 500 || error.statusCode === 500) {
      diagnostics.error = 'OpenAI server error';
      diagnostics.recommendation = 'Try again later - this is an OpenAI infrastructure issue';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      diagnostics.error = 'Network connectivity issue';
      diagnostics.recommendation = 'Check if production server can reach api.openai.com (firewall/proxy issue)';
    } else {
      diagnostics.error = `Unexpected error: ${error.message}`;
      diagnostics.recommendation = 'Check server logs for more details';
    }

    // Include full error details for debugging
    if (error.response) {
      diagnostics.checks.visionApiTest.responseData = error.response.data;
    }

    return NextResponse.json(diagnostics, { status: 500 });
  }
}
