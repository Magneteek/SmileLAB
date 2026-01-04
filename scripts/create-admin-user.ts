/**
 * Create Admin User Script
 * Creates an admin user for initial setup
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if any users exist
    const existingCount = await prisma.user.count();

    if (existingCount > 0) {
      console.log(`✅ Users already exist (${existingCount} user(s))`);
      console.log('ℹ️  Skipping admin user creation');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@smilelab.si',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
      },
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('   Email: admin@smilelab.si');
    console.log('   Password: admin123');
    console.log('   Role: ADMIN\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
