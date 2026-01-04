/**
 * Laboratory Configuration Types
 * For managing laboratory/manufacturer information (Annex XIII & Invoices)
 */

import { LabConfiguration, BankAccount } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// LAB CONFIGURATION TYPES
// ============================================================================

export type LabConfigurationWithBankAccounts = LabConfiguration & {
  bankAccounts: BankAccount[];
};

export interface CreateLabConfigurationDto {
  // Laboratory Information
  laboratoryName: string;
  laboratoryId?: string;
  laboratoryLicense?: string;
  registrationNumber?: string;
  taxId?: string;
  technicianIdNumber?: string;

  // Address
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  region?: string;

  // Contact
  phone: string;
  email: string;
  website?: string;

  // Responsible Person
  responsiblePersonName: string;
  responsiblePersonTitle: string;
  responsiblePersonLicense?: string;
  responsiblePersonEmail?: string;
  responsiblePersonPhone?: string;

  // Files
  signaturePath?: string;
  logoPath?: string;

  // Settings
  defaultPaymentTerms?: number;
  defaultTaxRate?: number | Decimal;
}

export interface UpdateLabConfigurationDto extends Partial<CreateLabConfigurationDto> {
  updatedBy?: string;
}

// ============================================================================
// BANK ACCOUNT TYPES
// ============================================================================

export interface CreateBankAccountDto {
  bankName: string;
  iban: string;
  swiftBic?: string;
  accountType?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
  notes?: string;
}

export interface UpdateBankAccountDto extends Partial<CreateBankAccountDto> {}

// ============================================================================
// COMPLETE LAB CONFIGURATION DTO (FOR INITIAL SETUP)
// ============================================================================

export interface CompleteLabConfigurationDto extends CreateLabConfigurationDto {
  bankAccounts?: CreateBankAccountDto[];
}
