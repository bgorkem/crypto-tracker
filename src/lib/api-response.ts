import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard API response helpers
 * 
 * Provides consistent response formatting across all API endpoints.
 * Follows the contract spec error codes and response structures.
 */

export interface ApiSuccessResponse<T = unknown> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
}

export interface ApiPaginatedResponse<T = unknown> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Create a success response (200 OK)
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data } as ApiSuccessResponse<T>, { status });
}

/**
 * Create a created response (201 Created)
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json({ data } as ApiSuccessResponse<T>, { status: 201 });
}

/**
 * Create a no content response (204 No Content)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create a paginated response (200 OK)
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): NextResponse {
  return NextResponse.json(
    { data, pagination } as ApiPaginatedResponse<T>,
    { status: 200 }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a bad request response (400)
 */
export function badRequestResponse(
  code: string = 'BAD_REQUEST',
  message: string = 'Invalid request',
  details?: Record<string, unknown>
): NextResponse {
  return errorResponse(code, message, 400, details);
}

/**
 * Create an unauthorized response (401)
 */
export function unauthorizedResponse(
  code: string = 'UNAUTHORIZED',
  message: string = 'Authentication required'
): NextResponse {
  return errorResponse(code, message, 401);
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(
  code: string = 'FORBIDDEN',
  message: string = 'Access denied'
): NextResponse {
  return errorResponse(code, message, 403);
}

/**
 * Create a not found response (404)
 */
export function notFoundResponse(
  code: string = 'NOT_FOUND',
  message: string = 'Resource not found'
): NextResponse {
  return errorResponse(code, message, 404);
}

/**
 * Create a conflict response (409)
 */
export function conflictResponse(
  code: string = 'CONFLICT',
  message: string = 'Resource conflict'
): NextResponse {
  return errorResponse(code, message, 409);
}

/**
 * Create an internal server error response (500)
 */
export function internalErrorResponse(
  message: string = 'Internal server error'
): NextResponse {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

/**
 * Handle Zod validation errors and convert to API error response
 */
export function handleValidationError(error: ZodError): NextResponse {
  const details: Record<string, string[]> = {};

  for (const issue of error.errors) {
    const path = issue.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return badRequestResponse('VALIDATION_ERROR', 'Invalid request data', {
    fields: details,
  });
}

/**
 * Generic error handler for try-catch blocks
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  if (error instanceof Error) {
    return internalErrorResponse(error.message);
  }

  return internalErrorResponse();
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;

  return {
    page,
    limit,
    total,
    has_next: hasNext,
  };
}

/**
 * Parse and validate pagination query parameters
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '100', 10))
  );

  return { page, limit };
}

/**
 * Add cache-control headers for price data (30s TTL)
 */
export function withCacheHeaders(
  response: NextResponse,
  maxAge: number = 30
): NextResponse {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  return response;
}
