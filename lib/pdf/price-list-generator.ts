/**
 * Price List PDF Generator
 *
 * Generates a professional price catalog PDF for dental laboratory products
 * with current pricing grouped by category.
 *
 * Uses unified PDF infrastructure for consistent branding.
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import {
  generatePDF,
  generatePDFHeader,
  generatePDFFooter,
} from './base';
import { imageToBase64 } from './utils/image-utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProductCategory } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface PriceListProduct {
  code: string;
  name: string;
  description: string | null;
  currentPrice: number;
  unit: string;
  category: ProductCategory;
}

interface GroupedProducts {
  [key: string]: PriceListProduct[];
}

// ============================================================================
// CATEGORY DISPLAY NAMES
// ============================================================================

const CATEGORY_NAMES: Record<ProductCategory, string> = {
  FIKSNA_PROTETIKA: 'Fixed Prosthetics',
  SNEMNA_PROTETIKA: 'Removable Prosthetics',
  IMPLANTOLOGIJA: 'Implantology',
  ESTETIKA: 'Aesthetics',
  OSTALO: 'Other',
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate Price List PDF
 *
 * Creates a comprehensive product catalog with current pricing
 * organized by category for easy reference.
 *
 * @param options - Generation options
 * @param options.activeOnly - Only include active products (default: true)
 * @param options.categories - Filter by specific categories (optional)
 * @param options.locale - Locale for translations (default: 'en')
 * @returns PDF buffer
 */
export async function generatePriceListPDF(options: {
  activeOnly?: boolean;
  categories?: ProductCategory[];
  locale?: string;
} = {}): Promise<Buffer> {
  const { activeOnly = true, categories, locale = 'en' } = options;

  console.log(`[Price List PDF] Starting generation... (locale: ${locale})`);

  // Load translations
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = await fs.readFile(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);
  const t = messages.pdf?.priceList || {};

  // Fetch lab configuration
  const labConfig = await getLabConfigurationOrThrow();

  // Fetch products
  const products = await fetchProducts(activeOnly, categories);
  console.log(`[Price List PDF] Found ${products.length} products`);

  if (products.length === 0) {
    throw new Error('No products found for price list generation');
  }

  // Group products by category
  const groupedProducts = groupProductsByCategory(products);

  // Convert logo to base64 if it exists
  const logoBase64 = labConfig.logoPath ? await imageToBase64(labConfig.logoPath) : null;

  // Generate header
  const headerHTML = generatePDFHeader({
    logoPath: logoBase64,
    laboratoryName: labConfig.laboratoryName,
    documentCode: `PRICE-LIST-${new Date().getFullYear()}`,
    documentTitle: 'Product Price List',
  });

  // Generate footer
  const footerHTML = generatePDFFooter({
    laboratoryName: labConfig.laboratoryName,
    city: labConfig.city,
    country: labConfig.country || 'Slovenia',
    showPageNumbers: true,
    showDate: true,
  });

  // Generate content HTML
  const contentHTML = generatePriceListHTML(groupedProducts, labConfig, t, locale);

  // Generate PDF
  const result = await generatePDF({
    htmlContent: contentHTML,
    headerHTML,
    footerHTML,
    format: 'A4',
    margins: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm',
    },
  });

  console.log(`[Price List PDF] Generated successfully: ${result.buffer.length} bytes`);
  return result.buffer;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch products from database
 */
async function fetchProducts(
  activeOnly: boolean,
  categories?: ProductCategory[]
): Promise<PriceListProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(activeOnly && { active: true }),
      ...(categories && categories.length > 0 && { category: { in: categories } }),
    },
    select: {
      code: true,
      name: true,
      description: true,
      currentPrice: true,
      unit: true,
      category: true,
    },
    orderBy: [
      { category: 'asc' },
      { code: 'asc' },
    ],
  });

  return products.map((product) => ({
    ...product,
    currentPrice: product.currentPrice.toNumber(),
  }));
}

/**
 * Group products by category
 */
function groupProductsByCategory(products: PriceListProduct[]): GroupedProducts {
  const grouped: GroupedProducts = {};

  for (const product of products) {
    const categoryKey = product.category;
    if (!grouped[categoryKey]) {
      grouped[categoryKey] = [];
    }
    grouped[categoryKey].push(product);
  }

  return grouped;
}

/**
 * Generate price list HTML content (COMPACT VERSION)
 */
function generatePriceListHTML(
  groupedProducts: GroupedProducts,
  labConfig: any,
  t: any,
  locale: string
): string {
  const currentDate = new Date().toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  let html = `
    <div style="margin-bottom: 15px;">
      <h1>${t.title || 'Product Price List'} ${new Date().getFullYear()}</h1>
      <p class="text-center" style="color: #666; font-size: 9pt; margin-bottom: 10px;">
        ${t.validAsOf || 'Valid as of'} ${currentDate} | ${t.allPricesInEur || 'All prices in EUR (€) excluding VAT'}
      </p>
    </div>

    <!-- COMPACT SINGLE TABLE WITH ALL PRODUCTS -->
    <table class="data-table" style="font-size: 8pt;">
      <thead>
        <tr style="font-size: 7pt;">
          <th style="width: 18%;">${t.categoryColumn || 'Category'}</th>
          <th style="width: 12%;">${t.codeColumn || 'Code'}</th>
          <th style="width: 45%;">${t.productNameColumn || 'Product Name'}</th>
          <th style="width: 10%; text-align: center;">${t.unitColumn || 'Unit'}</th>
          <th style="width: 15%; text-align: right;">${t.priceColumn || 'Price (€)'}</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Generate all products in a single table, sorted by category
  const categoryKeys = Object.keys(groupedProducts).sort();

  for (const categoryKey of categoryKeys) {
    const products = groupedProducts[categoryKey];
    const categoryName = t.categories?.[categoryKey] || categoryKey;

    // Add category header row
    html += `
        <tr style="background: #e0f2f7; font-weight: bold;">
          <td colspan="5" style="padding: 6px; color: #007289; font-size: 9pt;">
            ${categoryName}
          </td>
        </tr>
    `;

    // Add products for this category
    for (const product of products) {
      html += `
        <tr>
          <td style="font-size: 7pt; color: #666;"></td>
          <td><strong>${product.code}</strong></td>
          <td>${product.name}</td>
          <td style="text-align: center;">${product.unit}</td>
          <td style="text-align: right;"><strong>€${product.currentPrice.toFixed(2)}</strong></td>
        </tr>
      `;
    }
  }

  html += `
      </tbody>
    </table>

    <!-- COMPACT FOOTER NOTES -->
    <div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-left: 3px solid #007289; font-size: 8pt;">
      <p style="margin: 0 0 5px 0;"><strong>${t.termsTitle || 'Terms & Conditions:'}</strong></p>
      <p style="margin: 0; line-height: 1.4;">
        ${t.termsText || '• Prices subject to change without notice  •  Special discounts for bulk orders  •  CE marked products comply with EU MDR 2017/745'}
      </p>
    </div>

    <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-left: 3px solid #D2804D; font-size: 8pt;">
      <p style="margin: 0;"><strong>${t.contactLabel || 'Contact:'}</strong> ${labConfig.email} | ${labConfig.phone}${labConfig.website ? ` | ${labConfig.website}` : ''}</p>
    </div>
  `;

  return html;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { PriceListProduct, GroupedProducts };
