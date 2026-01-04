/**
 * Laboratory Configuration Service
 * Manages laboratory/manufacturer information for Annex XIII and Invoices
 *
 * SINGLETON PATTERN: Only one LabConfiguration record should exist
 */

import { prisma } from '@/lib/prisma';
import type {
  LabConfigurationWithBankAccounts,
  CreateLabConfigurationDto,
  UpdateLabConfigurationDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CompleteLabConfigurationDto,
} from '@/types/lab-configuration';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert empty strings to null for optional fields
 * Prisma requires null/undefined, not empty strings
 */
function cleanOptionalFields<T extends Record<string, any>>(data: T): T {
  const cleaned: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Convert empty strings to null
    if (value === '') {
      cleaned[key] = null;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

// ============================================================================
// LAB CONFIGURATION CRUD
// ============================================================================

/**
 * Get the lab configuration (singleton)
 * Returns null if not configured yet
 */
export async function getLabConfiguration(): Promise<LabConfigurationWithBankAccounts | null> {
  const config = await prisma.labConfiguration.findFirst({
    include: {
      bankAccounts: {
        where: {
          isActive: true,
        },
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  return config;
}

/**
 * Get or throw if not configured
 * Use this in PDF generation to ensure configuration exists
 */
export async function getLabConfigurationOrThrow(): Promise<LabConfigurationWithBankAccounts> {
  const config = await getLabConfiguration();

  if (!config) {
    throw new Error('Laboratory configuration not found. Please configure system settings first.');
  }

  return config;
}

/**
 * Create initial lab configuration (only if none exists)
 * @param data - Lab configuration data
 * @param userId - User creating the configuration
 * @returns Created configuration
 */
export async function createLabConfiguration(
  data: CreateLabConfigurationDto,
  userId: string
): Promise<LabConfigurationWithBankAccounts> {
  // Check if configuration already exists
  const existing = await prisma.labConfiguration.findFirst();

  if (existing) {
    throw new Error('Laboratory configuration already exists. Use update instead.');
  }

  // Clean empty strings to null
  const cleanedData = cleanOptionalFields(data);

  const config = await prisma.labConfiguration.create({
    data: {
      ...cleanedData,
      defaultTaxRate: cleanedData.defaultTaxRate !== undefined && cleanedData.defaultTaxRate !== null
        ? new Decimal(cleanedData.defaultTaxRate)
        : new Decimal(22.00),
      defaultPaymentTerms: cleanedData.defaultPaymentTerms || 30,
      updatedBy: userId,
    },
    include: {
      bankAccounts: true,
    },
  });

  return config;
}

/**
 * Update lab configuration
 * @param data - Updated lab configuration data
 * @param userId - User updating the configuration
 * @returns Updated configuration
 */
export async function updateLabConfiguration(
  data: UpdateLabConfigurationDto,
  userId: string
): Promise<LabConfigurationWithBankAccounts> {
  // Get existing configuration
  const existing = await prisma.labConfiguration.findFirst();

  if (!existing) {
    throw new Error('Laboratory configuration not found. Create it first.');
  }

  console.log('[Lab Config Update] Received data:', JSON.stringify(data, null, 2));

  // Clean empty strings to null
  const cleanedData = cleanOptionalFields(data);

  console.log('[Lab Config Update] Cleaned data:', JSON.stringify(cleanedData, null, 2));

  const updatePayload = {
    ...cleanedData,
    defaultTaxRate: cleanedData.defaultTaxRate !== undefined && cleanedData.defaultTaxRate !== null
      ? new Decimal(cleanedData.defaultTaxRate)
      : undefined,
    defaultPaymentTerms: cleanedData.defaultPaymentTerms !== undefined && cleanedData.defaultPaymentTerms !== null
      ? cleanedData.defaultPaymentTerms
      : undefined,
    updatedBy: userId,
  };

  console.log('[Lab Config Update] Update payload:', JSON.stringify(updatePayload, null, 2));

  const config = await prisma.labConfiguration.update({
    where: { id: existing.id },
    data: updatePayload,
    include: {
      bankAccounts: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  console.log('[Lab Config Update] Updated config:', JSON.stringify(config, null, 2));

  return config;
}

/**
 * Create complete lab configuration with bank accounts (initial setup)
 * @param data - Complete configuration data including bank accounts
 * @param userId - User creating the configuration
 * @returns Created configuration with bank accounts
 */
export async function createCompleteLabConfiguration(
  data: CompleteLabConfigurationDto,
  userId: string
): Promise<LabConfigurationWithBankAccounts> {
  const { bankAccounts, ...labData } = data;

  // Create in transaction
  return await prisma.$transaction(async (tx) => {
    // Create lab configuration
    const config = await tx.labConfiguration.create({
      data: {
        ...labData,
        defaultTaxRate: labData.defaultTaxRate ? new Decimal(labData.defaultTaxRate) : new Decimal(22.00),
        defaultPaymentTerms: labData.defaultPaymentTerms || 30,
        updatedBy: userId,
      },
    });

    // Create bank accounts if provided
    if (bankAccounts && bankAccounts.length > 0) {
      await tx.bankAccount.createMany({
        data: bankAccounts.map((account, index) => ({
          labConfigurationId: config.id,
          ...account,
          displayOrder: account.displayOrder ?? index,
          isPrimary: account.isPrimary ?? (index === 0), // First account is primary by default
        })),
      });
    }

    // Return complete configuration
    return await tx.labConfiguration.findUnique({
      where: { id: config.id },
      include: {
        bankAccounts: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    }) as LabConfigurationWithBankAccounts;
  });
}

// ============================================================================
// BANK ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Add a bank account to lab configuration
 * @param data - Bank account data
 * @param userId - User adding the account
 * @returns Created bank account
 */
export async function addBankAccount(
  data: CreateBankAccountDto,
  userId: string
): Promise<any> {
  const config = await getLabConfigurationOrThrow();

  // Get next display order
  const maxOrder = await prisma.bankAccount.findFirst({
    where: { labConfigurationId: config.id },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  const displayOrder = data.displayOrder ?? ((maxOrder?.displayOrder ?? -1) + 1);

  // If this is set as primary, unset others
  if (data.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: { labConfigurationId: config.id },
      data: { isPrimary: false },
    });
  }

  const account = await prisma.bankAccount.create({
    data: {
      labConfigurationId: config.id,
      ...data,
      displayOrder,
    },
  });

  return account;
}

/**
 * Update a bank account
 * @param accountId - Bank account ID
 * @param data - Updated bank account data
 * @returns Updated bank account
 */
export async function updateBankAccount(
  accountId: string,
  data: UpdateBankAccountDto
): Promise<any> {
  // If setting as primary, unset others
  if (data.isPrimary) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      select: { labConfigurationId: true },
    });

    if (account) {
      await prisma.bankAccount.updateMany({
        where: {
          labConfigurationId: account.labConfigurationId,
          id: { not: accountId },
        },
        data: { isPrimary: false },
      });
    }
  }

  return await prisma.bankAccount.update({
    where: { id: accountId },
    data,
  });
}

/**
 * Delete a bank account
 * @param accountId - Bank account ID
 */
export async function deleteBankAccount(accountId: string): Promise<void> {
  await prisma.bankAccount.delete({
    where: { id: accountId },
  });
}

/**
 * Reorder bank accounts
 * @param accountIds - Array of account IDs in desired order
 */
export async function reorderBankAccounts(accountIds: string[]): Promise<void> {
  await prisma.$transaction(
    accountIds.map((id, index) =>
      prisma.bankAccount.update({
        where: { id },
        data: { displayOrder: index },
      })
    )
  );
}

/**
 * Get primary bank account
 * @returns Primary bank account or first account if none is primary
 */
export async function getPrimaryBankAccount(): Promise<any | null> {
  const config = await getLabConfiguration();

  if (!config) {
    return null;
  }

  // Try to get primary account
  let account = await prisma.bankAccount.findFirst({
    where: {
      labConfigurationId: config.id,
      isPrimary: true,
      isActive: true,
    },
  });

  // If no primary, get first active account
  if (!account) {
    account = await prisma.bankAccount.findFirst({
      where: {
        labConfigurationId: config.id,
        isActive: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  return account;
}
