/**
 * API Request Validation Utilities
 * Zod-based validation helpers
 */

import { z, ZodSchema } from 'zod';
import { NextRequest } from 'next/server';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate request body against Zod schema
 * Throws ValidationError if validation fails
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(message, error);
    }
    throw new ValidationError('Invalid request body');
  }
}

/**
 * Validate query parameters against Zod schema
 * Throws ValidationError if validation fails
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  try {
    // Convert URLSearchParams to object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(message, error);
    }
    throw new ValidationError('Invalid query parameters');
  }
}

/**
 * Parse pagination parameters from query string
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  return {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc' | undefined) || 'desc',
  };
}
