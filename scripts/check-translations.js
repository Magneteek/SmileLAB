#!/usr/bin/env node

/**
 * Translation Coverage Checker
 * Compares English and Slovenian translation files to find missing keys
 */

const fs = require('fs');
const path = require('path');

// Load translation files
const enPath = path.join(__dirname, '../messages/en.json');
const slPath = path.join(__dirname, '../messages/sl.json');

const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const slMessages = JSON.parse(fs.readFileSync(slPath, 'utf8'));

// Flatten nested objects to dot notation
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

const enFlat = flattenObject(enMessages);
const slFlat = flattenObject(slMessages);

const enKeys = new Set(Object.keys(enFlat));
const slKeys = new Set(Object.keys(slFlat));

// Find missing translations
const missingInSlovenian = [...enKeys].filter(key => !slKeys.has(key));
const missingInEnglish = [...slKeys].filter(key => !enKeys.has(key));

// Report results
console.log('\n=== Translation Coverage Report ===\n');

console.log(`Total English keys: ${enKeys.size}`);
console.log(`Total Slovenian keys: ${slKeys.size}`);

if (missingInEnglish.length > 0) {
  console.log(`\n⚠️  Missing in English (${missingInEnglish.length}):`);
  missingInEnglish.forEach(key => {
    console.log(`  - ${key}`);
  });
}

if (missingInSlovenian.length > 0) {
  console.log(`\n⚠️  Missing in Slovenian (${missingInSlovenian.length}):`);
  missingInSlovenian.forEach(key => {
    console.log(`  - ${key}`);
  });
}

if (missingInEnglish.length === 0 && missingInSlovenian.length === 0) {
  console.log('\n✅ All translations are in sync! No missing keys.\n');
} else {
  console.log(`\n📝 Summary:`);
  console.log(`   - Missing in English: ${missingInEnglish.length}`);
  console.log(`   - Missing in Slovenian: ${missingInSlovenian.length}`);
  console.log(`   - Total missing: ${missingInEnglish.length + missingInSlovenian.length}\n`);
}
