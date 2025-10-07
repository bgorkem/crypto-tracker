import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';

/**
 * Authentication middleware for API routes
 * 
 * Extracts and validates the JWT token from the Authorization header.
 * Returns 401 UNAUTHORIZED if token is missing or invalid.
 */

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  userEmail: string;
}

export interface AuthMiddlewareResult {
  success: boolean;
  userId?: string;
  userEmail?: string;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

/**
 * Validate authentication token and extract user information
 * @param request - Next.js request object
 * @returns Authentication result with user info or error
 */
export async function validateAuth(
  request: NextRequest
): Promise<AuthMiddlewareResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing Authorization header',
        status: 401,
      },
    };
  }

  // Extract Bearer token
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token || token === authHeader) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
        status: 401,
      },
    };
  }

  try {
    // Create authenticated client with token
    const supabase = createAuthenticatedClient(token);

    // Verify token by fetching user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error?.message || 'Invalid or expired token',
          status: 401,
        },
      };
    }

    return {
      success: true,
      userId: user.id,
      userEmail: user.email || '',
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token validation failed',
        status: 401,
      },
    };
  }
}

/**
 * Higher-order function that wraps API route handlers with authentication
 * @param handler - API route handler function
 * @returns Wrapped handler with authentication check
 */
export function withAuth<T = unknown>(
  handler: (
    request: NextRequest,
    context: { params: T; userId: string; userEmail: string }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: T }
  ): Promise<NextResponse> => {
    const authResult = await validateAuth(request);

    if (!authResult.success || !authResult.userId || !authResult.userEmail) {
      return NextResponse.json(
        {
          error: {
            code: authResult.error?.code || 'UNAUTHORIZED',
            message: authResult.error?.message || 'Authentication required',
          },
        },
        { status: authResult.error?.status || 401 }
      );
    }

    // Call the actual handler with authenticated user info
    return handler(request, {
      ...context,
      userId: authResult.userId,
      userEmail: authResult.userEmail,
    });
  };
}

/**
 * Create a standardized error response for authentication failures
 */
export function createAuthErrorResponse(
  code: string = 'UNAUTHORIZED',
  message: string = 'Authentication required',
  status: number = 401
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
