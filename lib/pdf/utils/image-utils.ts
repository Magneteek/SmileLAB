/**
 * PDF Image Utilities
 *
 * Helper functions for converting images to base64 data URIs for PDF embedding
 */

import { readFile } from 'fs/promises';
import { join, extname } from 'path';

/**
 * Convert image file path to base64 data URI for PDF embedding
 *
 * Puppeteer requires either HTTP URLs or data URIs for images in PDFs.
 * This function converts file system paths to base64 data URIs.
 *
 * @param filePath - Path to image file (can be absolute or relative to public/)
 * @returns Base64 data URI or null if conversion fails
 */
export async function imageToBase64(filePath: string): Promise<string | null> {
  try {
    console.log(`[PDF Utils] Converting image to base64: ${filePath}`);

    // Convert public URL path to filesystem path
    // If path starts with /, it's a public URL (e.g., /uploads/lab-config/logo.jpg)
    // Convert it to public/uploads/lab-config/logo.jpg
    let absolutePath: string;
    if (filePath.startsWith('/')) {
      // Remove leading slash and prepend 'public/'
      absolutePath = join(process.cwd(), 'public', filePath.slice(1));
    } else {
      // If no leading slash, treat as relative from project root
      absolutePath = join(process.cwd(), filePath);
    }

    console.log(`[PDF Utils] Reading image from: ${absolutePath}`);
    const imageBuffer = await readFile(absolutePath);
    const base64 = imageBuffer.toString('base64');

    // Determine MIME type from file extension
    const ext = extname(filePath).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.svg' ? 'image/svg+xml' :
      'image/png';

    const dataUri = `data:${mimeType};base64,${base64}`;
    console.log(`[PDF Utils] Image converted: ${imageBuffer.length} bytes -> ${dataUri.length} chars`);

    return dataUri;
  } catch (error) {
    console.error(`[PDF Utils] Failed to convert image to base64:`, error);
    console.error(`[PDF Utils] File path: ${filePath}`);
    return null;
  }
}
