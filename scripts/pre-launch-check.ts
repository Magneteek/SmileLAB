/**
 * Pre-Launch Verification Script
 * Run this before deploying to production
 */

import { prisma } from '@/lib/prisma';

async function preLaunchCheck() {
  console.log('🚀 Pre-Launch Verification Starting...\n');

  const checks = [];
  let allPassed = true;

  // 1. Environment Variables
  console.log('1️⃣ Checking Environment Variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingEnvVars.length === 0) {
    console.log('   ✅ All required environment variables present');
    checks.push({ name: 'Environment Variables', status: 'PASS' });
  } else {
    console.log('   ❌ Missing environment variables:', missingEnvVars.join(', '));
    checks.push({ name: 'Environment Variables', status: 'FAIL' });
    allPassed = false;
  }

  // 2. NextAuth Secret Security
  console.log('\n2️⃣ Checking NextAuth Secret...');
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret !== 'your-secret-key-here-change-in-production' && secret.length >= 32) {
    console.log('   ✅ NextAuth secret is production-safe');
    checks.push({ name: 'NextAuth Secret', status: 'PASS' });
  } else {
    console.log('   ❌ NextAuth secret is weak or default value!');
    console.log('   Generate with: openssl rand -base64 32');
    checks.push({ name: 'NextAuth Secret', status: 'FAIL' });
    allPassed = false;
  }

  // 3. Database Connection
  console.log('\n3️⃣ Testing Database Connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connection successful');
    checks.push({ name: 'Database Connection', status: 'PASS' });
  } catch (error) {
    console.log('   ❌ Database connection failed:', error);
    checks.push({ name: 'Database Connection', status: 'FAIL' });
    allPassed = false;
  }

  // 4. Check for Admin Users
  console.log('\n4️⃣ Checking for Admin Users...');
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', active: true },
    });

    if (adminCount > 0) {
      console.log(`   ✅ Found ${adminCount} active admin user(s)`);
      checks.push({ name: 'Admin Users', status: 'PASS' });
    } else {
      console.log('   ❌ No admin users found!');
      console.log('   Run: npx tsx scripts/create-admin-user.ts');
      checks.push({ name: 'Admin Users', status: 'FAIL' });
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Could not check admin users:', error);
    checks.push({ name: 'Admin Users', status: 'FAIL' });
    allPassed = false;
  }

  // 5. Check Database Tables
  console.log('\n5️⃣ Verifying Database Schema...');
  try {
    const tableChecks = [
      { table: 'users', model: prisma.user },
      { table: 'orders', model: prisma.order },
      { table: 'worksheets', model: prisma.workSheet },
      { table: 'materials', model: prisma.material },
      { table: 'material_lots', model: prisma.materialLot },
      { table: 'invoices', model: prisma.invoice },
    ];

    let allTablesExist = true;
    for (const { table, model } of tableChecks) {
      try {
        await model.findFirst();
        console.log(`   ✅ Table '${table}' exists`);
      } catch (error) {
        console.log(`   ❌ Table '${table}' missing or inaccessible`);
        allTablesExist = false;
      }
    }

    if (allTablesExist) {
      checks.push({ name: 'Database Schema', status: 'PASS' });
    } else {
      console.log('\n   Run migrations: npx prisma migrate deploy');
      checks.push({ name: 'Database Schema', status: 'FAIL' });
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Schema verification failed:', error);
    checks.push({ name: 'Database Schema', status: 'FAIL' });
    allPassed = false;
  }

  // 6. Node Environment
  console.log('\n6️⃣ Checking Node Environment...');
  if (process.env.NODE_ENV === 'production') {
    console.log('   ✅ NODE_ENV is set to production');
    checks.push({ name: 'Node Environment', status: 'PASS' });
  } else {
    console.log(`   ⚠️  NODE_ENV is '${process.env.NODE_ENV}' (should be 'production')`);
    checks.push({ name: 'Node Environment', status: 'WARN' });
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 PRE-LAUNCH CHECK SUMMARY');
  console.log('='.repeat(60));

  checks.forEach((check) => {
    const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️ ' : '❌';
    console.log(`${icon} ${check.name}: ${check.status}`);
  });

  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n🎉 ALL CHECKS PASSED - Ready for Production!');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED - Fix issues before deploying!');
    process.exit(1);
  }
}

// Run checks
preLaunchCheck()
  .catch((error) => {
    console.error('❌ Pre-launch check failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
