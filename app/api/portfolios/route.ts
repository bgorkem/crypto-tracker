import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';

/**
 * GET /api/portfolios
 * List all portfolios for the authenticated user
 * 
 * Query params:
 * - limit: Number of portfolios to return (default: 50)
 * - offset: Number of portfolios to skip (default: 0)
 * 
 * Returns 200 with portfolio list
 * Returns 401 if not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient(token);

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch portfolios for this user
    const { data: portfolios, error: fetchError, count } = await supabase
      .from('portfolios')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Error fetching portfolios:', fetchError);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch portfolios',
          },
        },
        { status: 500 }
      );
    }

    // Transform portfolios to match API contract
    const transformedPortfolios = (portfolios || []).map((portfolio) => ({
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      base_currency: portfolio.base_currency,
      total_value: null, // Will be calculated when we have transactions
      unrealized_pl: null, // Will be calculated when we have transactions
      created_at: portfolio.created_at,
      updated_at: portfolio.updated_at,
    }));

    return NextResponse.json(
      {
        data: {
          portfolios: transformedPortfolios,
          total: count || 0,
          limit,
          offset,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/portfolios:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Validate portfolio name
 */
function validatePortfolioName(name: unknown): { valid: boolean; error?: { code: string; message: string } } {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_NAME',
        message: 'Portfolio name is required',
      },
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: {
        code: 'INVALID_NAME',
        message: 'Portfolio name must be 100 characters or less',
      },
    };
  }

  return { valid: true };
}

/**
 * POST /api/portfolios
 * Create a new portfolio
 * 
 * Request body:
 * - name: Portfolio name (required, max 100 chars)
 * - description: Portfolio description (optional)
 * 
 * Returns 201 with created portfolio
 * Returns 400 for validation errors
 * Returns 401 if not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient(token);

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { name, description } = body;

    // Validate name
    const nameValidation = validatePortfolioName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Create portfolio
    const { data: portfolio, error: createError } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        name: (name as string).trim(),
        description: description || null,
        base_currency: 'USD', // Default currency
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating portfolio:', createError);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create portfolio',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: portfolio.id,
          name: portfolio.name,
          description: portfolio.description,
          base_currency: portfolio.base_currency,
          created_at: portfolio.created_at,
          updated_at: portfolio.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/portfolios:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
