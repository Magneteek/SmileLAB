/**
 * Comprehensive Vision API Diagnostic Tool
 *
 * This script checks all aspects of the Vision API configuration
 * Run this on both local and production to compare results
 *
 * Usage:
 *   node diagnose-vision-api.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const https = require('https');

console.log('🔍 VISION API DIAGNOSTIC TOOL\n');
console.log('='.repeat(60));

// 1. Check Environment Variables
console.log('\n1️⃣  ENVIRONMENT VARIABLES CHECK');
console.log('-'.repeat(60));

const apiKey = process.env.OPENAI_API_KEY;
const nodeEnv = process.env.NODE_ENV || 'development';

console.log('Environment:', nodeEnv);
console.log('OPENAI_API_KEY exists:', apiKey ? '✅ YES' : '❌ NO');

if (apiKey) {
  console.log('API Key prefix:', apiKey.substring(0, 10) + '...');
  console.log('API Key length:', apiKey.length, apiKey.length >= 50 ? '✅' : '⚠️  (seems short)');
  console.log('API Key format:', apiKey.startsWith('sk-') ? '✅ Valid format' : '❌ Invalid format');
} else {
  console.error('❌ CRITICAL: OPENAI_API_KEY not found!');
  console.error('   Make sure .env.local or .env contains OPENAI_API_KEY');
  process.exit(1);
}

// 2. Check Network Connectivity
console.log('\n2️⃣  NETWORK CONNECTIVITY CHECK');
console.log('-'.repeat(60));

function checkNetworkConnectivity() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    };

    console.log('Testing connection to api.openai.com...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Network connection successful (status 200)');
          resolve(true);
        } else if (res.statusCode === 401) {
          console.log('🔐 Network OK, but API key is INVALID (status 401)');
          console.log('   Response:', data);
          reject(new Error('Invalid API key'));
        } else {
          console.log(`⚠️  Unexpected status code: ${res.statusCode}`);
          console.log('   Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Network connection FAILED');
      console.error('   Error:', error.message);
      if (error.code === 'ENOTFOUND') {
        console.error('   → DNS resolution failed (cannot find api.openai.com)');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   → Connection timeout (firewall or network issue)');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   → Connection refused (firewall blocking)');
      }
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Connection TIMEOUT (10s)');
      console.error('   → Firewall or network latency issue');
      req.destroy();
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
}

// 3. Test Vision API
async function testVisionAPI() {
  console.log('\n3️⃣  VISION API TEST');
  console.log('-'.repeat(60));

  // Load OpenAI SDK
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey });

  // Simple test image (1x1 red pixel)
  const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

  console.log('Calling gpt-4o Vision API...');
  console.log('Model: gpt-4o');
  console.log('Max tokens: 1000');
  console.log('Temperature: 0.1\n');

  try {
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Extract information from the image and return JSON.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see in this image?' },
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
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const duration = Date.now() - startTime;

    console.log('✅ Vision API SUCCESS!\n');
    console.log('Response time:', duration + 'ms');
    console.log('Model used:', response.model);
    console.log('Finish reason:', response.choices[0].finish_reason);
    console.log('Token usage:', JSON.stringify(response.usage, null, 2));
    console.log('\nResponse content:');
    console.log(response.choices[0].message.content);

    return true;

  } catch (error) {
    console.error('❌ Vision API FAILED\n');

    if (error.status) {
      console.error('HTTP Status:', error.status);

      if (error.status === 401) {
        console.error('→ Authentication failed: Invalid API key');
      } else if (error.status === 429) {
        console.error('→ Rate limit exceeded or insufficient credits');
        console.error('  Check your OpenAI account: https://platform.openai.com/usage');
      } else if (error.status === 500) {
        console.error('→ OpenAI server error');
      }
    }

    console.error('\nError message:', error.message);

    if (error.response) {
      console.error('Response data:', error.response.data);
    }

    return false;
  }
}

// 4. Check API Credits (if possible)
console.log('\n4️⃣  API CREDITS CHECK');
console.log('-'.repeat(60));
console.log('⚠️  Cannot check credits programmatically.');
console.log('Please manually check: https://platform.openai.com/usage');
console.log('');

// Run diagnostics
(async () => {
  try {
    // Network check
    await checkNetworkConnectivity();

    // Vision API test
    const visionOk = await testVisionAPI();

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log('Environment:', nodeEnv);
    console.log('API Key configured:', apiKey ? '✅' : '❌');
    console.log('Network connectivity:', '✅ (OpenAI reachable)');
    console.log('Vision API status:', visionOk ? '✅ WORKING' : '❌ FAILED');
    console.log('='.repeat(60));

    if (visionOk) {
      console.log('\n✅ ALL CHECKS PASSED!');
      console.log('Your Vision API setup is working correctly.\n');
    } else {
      console.log('\n❌ VISION API CHECKS FAILED');
      console.log('See errors above for troubleshooting.\n');
      process.exit(1);
    }

  } catch (error) {
    console.log('\n❌ DIAGNOSTIC FAILED');
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();
