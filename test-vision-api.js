/**
 * OpenAI Vision API Test Script
 * Tests the same Vision API endpoint used by the OCR scanner
 *
 * Run: node test-vision-api.js
 */

require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test image: Simple text label (base64 encoded small test image)
// This is a 1x1 transparent PNG - replace with actual dental label image for real testing
const TEST_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function testVisionAPI() {
  console.log('🔍 Testing OpenAI Vision API...\n');

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables');
    console.error('   Please ensure .env.local contains OPENAI_API_KEY');
    process.exit(1);
  }

  console.log('✅ API Key found:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
  console.log('📡 Testing connection to OpenAI Vision API (gpt-4o model)...\n');

  try {
    // Make the exact same API call as the OCR scanner
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in reading dental material labels and extracting information.
Your task is to extract ALL visible text and data from the material label image.

Common dental material manufacturers: Ivoclar Vivadent, 3M ESPE, Vita, Dentsply Sirona, GC, Kulzer, Shofu, Kuraray Noritake, Straumann, Nobel Biocare.

Material types: CERAMIC, METAL, RESIN, COMPOSITE, PORCELAIN, ZIRCONIA, TITANIUM, ALLOY, ACRYLIC, WAX, OTHER.

Return a JSON object with these fields:
{
  "lotNumber": "LOT/Batch number (usually 5-10 alphanumeric characters)",
  "expiryDate": "YYYY-MM-DD format",
  "quantity": "Number with unit (e.g., '10g', '5ml', '1 unit')",
  "manufacturer": "Company name",
  "materialName": "Product name",
  "materialType": "One of the material types listed above",
  "confidence": "high | medium | low",
  "reasoning": "Brief explanation of any corrections or assumptions made"
}

IMPORTANT OCR ERROR CORRECTIONS:
- LOT/Batch numbers: Common OCR mistakes are s/S → 5, l/I → 1, O → 0
- Dates: Normalize all dates to YYYY-MM-DD format
- Manufacturer names: Use correct capitalization (e.g., "Ivoclar Vivadent" not "IVOCLAR VIVADENT")

If any field cannot be determined, use null.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all information from this dental material label.'
            },
            {
              type: 'image_url',
              image_url: {
                url: TEST_IMAGE_BASE64,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    console.log('✅ SUCCESS! Vision API responded correctly.\n');
    console.log('📊 Response details:');
    console.log('   Model:', response.model);
    console.log('   Finish reason:', response.choices[0].finish_reason);
    console.log('   Token usage:', {
      prompt: response.usage.prompt_tokens,
      completion: response.usage.completion_tokens,
      total: response.usage.total_tokens
    });

    console.log('\n📝 Extracted data:');
    const extractedData = JSON.parse(response.choices[0].message.content);
    console.log(JSON.stringify(extractedData, null, 2));

    console.log('\n✅ Vision API is working correctly!');
    console.log('✅ Your local setup is properly configured.');
    console.log('\n💡 Note: This test used a simple 1x1 test image.');
    console.log('   For real testing, replace TEST_IMAGE_BASE64 with an actual dental label image.');

  } catch (error) {
    console.error('\n❌ ERROR: Vision API test failed\n');

    if (error.status === 401) {
      console.error('🔐 Authentication Error (401)');
      console.error('   Your API key is invalid or expired.');
      console.error('   Please check your OPENAI_API_KEY in .env.local');
    } else if (error.status === 429) {
      console.error('🚫 Rate Limit Error (429)');
      console.error('   You have exceeded your API quota or rate limit.');
      console.error('   Please check your OpenAI account usage and billing.');
    } else if (error.status === 500) {
      console.error('💥 OpenAI Server Error (500)');
      console.error('   OpenAI servers are experiencing issues.');
      console.error('   Please try again later.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('🌐 Network Error');
      console.error('   Cannot connect to OpenAI servers.');
      console.error('   Please check your internet connection.');
    } else {
      console.error('⚠️  Unexpected Error');
      console.error('   Error details:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
    }

    console.error('\n📋 Full error object:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testVisionAPI();
