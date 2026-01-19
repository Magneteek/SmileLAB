#!/usr/bin/env node

/**
 * Find Missing Translations Script
 *
 * This script helps identify:
 * 1. Translation keys used in code but missing from translation files
 * 2. Translation keys that exist in EN but not in SL
 * 3. Translation keys that exist in SL but not in EN
 * 4. Hardcoded strings in TSX files that should be translated
 *
 * Usage: node scripts/find-missing-translations.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const messagesDir = path.join(__dirname, '..', 'messages');
const enPath = path.join(messagesDir, 'en.json');
const slPath = path.join(messagesDir, 'sl.json');

// Load translation files
const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const slTranslations = JSON.parse(fs.readFileSync(slPath, 'utf-8'));

/**
 * Flatten nested object into dot notation keys
 * { a: { b: { c: 'value' } } } => { 'a.b.c': 'value' }
 */
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

// Flatten translations
const enFlat = flattenObject(enTranslations);
const slFlat = flattenObject(slTranslations);

const enKeys = new Set(Object.keys(enFlat));
const slKeys = new Set(Object.keys(slFlat));

// Find missing keys
const missingInSl = [...enKeys].filter(key => !slKeys.has(key));
const missingInEn = [...slKeys].filter(key => !enKeys.has(key));

console.log('\n=== TRANSLATION ANALYSIS ===\n');

console.log(`Total EN keys: ${enKeys.size}`);
console.log(`Total SL keys: ${slKeys.size}`);

if (missingInSl.length > 0) {
  console.log('\n❌ Missing in Slovenian (exists in EN):');
  console.log('-------------------------------------------');
  missingInSl.forEach(key => {
    console.log(`  ${key}: "${enFlat[key]}"`);
  });
}

if (missingInEn.length > 0) {
  console.log('\n❌ Missing in English (exists in SL):');
  console.log('-------------------------------------------');
  missingInEn.forEach(key => {
    console.log(`  ${key}: "${slFlat[key]}"`);
  });
}

if (missingInSl.length === 0 && missingInEn.length === 0) {
  console.log('\n✅ All translation keys are in sync!\n');
}

// Extract translation keys actually used in codebase
console.log('\n=== KEYS USED IN CODE ===\n');
console.log('Scanning codebase for t(\') calls...\n');

try {
  // Find all .tsx and .ts files
  const findCommand = `find app components lib -type f \\( -name "*.tsx" -o -name "*.ts" \\) 2>/dev/null`;
  const files = execSync(findCommand, { encoding: 'utf8', cwd: path.join(__dirname, '..') })
    .split('\n')
    .filter(f => f.trim());

  const usedKeys = new Set();
  const keyPattern = /\bt\(['"`]([^'"`]+)['"`]\)/g;

  files.forEach(file => {
    if (!file) return;

    try {
      const fullPath = path.join(__dirname, '..', file);
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;

      while ((match = keyPattern.exec(content)) !== null) {
        const key = match[1];
        // Skip keys with template literals/variables
        if (!key.includes('${') && !key.includes('{') && key.length > 0) {
          usedKeys.add(key);
        }
      }
    } catch (err) {
      // Skip files that can't be read
    }
  });

  console.log(`Found ${usedKeys.size} unique translation keys used in code\n`);

  // Find keys used but not defined
  const usedButMissingInEn = [...usedKeys].filter(key => !enKeys.has(key));
  const usedButMissingInSl = [...usedKeys].filter(key => !slKeys.has(key));

  if (usedButMissingInEn.length > 0) {
    console.log('❌ Used in code but MISSING in English translation:');
    console.log('---------------------------------------------------');
    usedButMissingInEn.forEach(key => {
      console.log(`  ${key}`);
    });
    console.log('');
  }

  if (usedButMissingInSl.length > 0) {
    console.log('❌ Used in code but MISSING in Slovenian translation:');
    console.log('-----------------------------------------------------');
    usedButMissingInSl.forEach(key => {
      console.log(`  ${key}`);
    });
    console.log('');
  }

  if (usedButMissingInEn.length === 0 && usedButMissingInSl.length === 0) {
    console.log('✅ All keys used in code have translations!\n');
  }
} catch (err) {
  console.log('⚠️  Could not scan codebase:', err.message);
  console.log('');
}

// Find potential hardcoded strings (optional - can be slow)
console.log('\n=== POTENTIAL HARDCODED STRINGS ===\n');
console.log('Scanning TSX files for potential hardcoded strings...\n');

const hardcodedPatterns = [
  /className="[^"]*"[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)</g, // Capitalized text after classNames
  /<h1[^>]*>([^<{]+)</g, // h1 tags
  /<h2[^>]*>([^<{]+)</g, // h2 tags
  /<h3[^>]*>([^<{]+)</g, // h3 tags
  /<Label[^>]*>([^<{]+)</g, // Label components
  /<Button[^>]*>([^<{]+)</g, // Button components
];

// Scan a few key files as examples
const filesToScan = [
  'app/[locale]/(dashboard)/dashboard/page.tsx',
  'app/[locale]/(dashboard)/orders/page.tsx',
  'app/[locale]/(dashboard)/materials/page.tsx',
];

filesToScan.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf-8');

  console.log(`📄 ${filePath}:`);

  hardcodedPatterns.forEach(pattern => {
    let match;
    const matches = new Set();

    while ((match = pattern.exec(content)) !== null) {
      const text = match[1]?.trim();
      if (text && text.length > 2 && !text.match(/^[a-z]/)) {
        matches.add(text);
      }
    }

    if (matches.size > 0) {
      matches.forEach(text => console.log(`  ⚠️  "${text}"`));
    }
  });

  console.log('');
});

console.log('\nNote: This is a basic scan. Manual review is recommended.\n');
