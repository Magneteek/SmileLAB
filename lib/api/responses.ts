/**
 * API Response Helpers
 * Consistent response formatting
 */

import { NextResponse } from 'next/server';
import { AuthError } from './auth-middleware';
import { ValidationError } from './validation';

/**
 * Success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Return successful API response
 */
export function successResponse<T>(data: T, message?: string, status = 200): NextResponse {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };

  return NextResponse.json(response, { status });
}

/**
 * Return error API response
 */
export function errorResponse(
  error: string | Error,
  status = 500,
  code?: string,
  details?: unknown
): NextResponse {
  const message = typeof error === 'string' ? error : error.message;

  const response: ErrorResponse = {
    success: false,
    error: message,
    ...(code && { code }),
    ...(details && typeof details === 'object' ? { details } : {}),
  };

  return NextResponse.json(response, { status });
}

/**
 * Handle API errors with proper status codes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Authentication errors
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode, 'AUTH_ERROR');
  }

  // Validation errors
  if (error instanceof ValidationError) {
    return errorResponse(
      error.message,
      400,
      'VALIDATION_ERROR',
      (error as any).errors
    );
  }

  // Prisma errors (database)
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message: string };

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return errorResponse('Resource already exists', 409, 'DUPLICATE_ERROR');
    }

    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return errorResponse('Referenced resource not found', 404, 'NOT_FOUND');
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return errorResponse('Resource not found', 404, 'NOT_FOUND');
    }

    return errorResponse('Database error', 500, 'DATABASE_ERROR');
  }

  // Generic Error object
  if (error instanceof Error) {
    return errorResponse(error.message, 500, 'INTERNAL_ERROR');
  }

  // Unknown error
  return errorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Return 404 Not Found response
 */
export function notFoundResponse(resource = 'Resource'): NextResponse {
  return errorResponse(`${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Return 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Return 403 Forbidden response
 */
export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Return 400 Bad Request response
 */
export function badRequestResponse(message = 'Invalid request'): NextResponse {
  return errorResponse(message, 400, 'BAD_REQUEST');
}
