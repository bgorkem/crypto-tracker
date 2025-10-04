import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';

async function validatePortfolioAccess(
  token: string | undefined,
  portfolioId: string
): Promise<{ error?: NextResponse }> {
  if (!token) {
    return {
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      ),
    };
  }

  const supabase = createAuthenticatedClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        { status: 401 }
      ),
    };
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('user_id')
    .eq('id', portfolioId)
    .single();

  if (portfolioError || !portfolio) {
    return {
      error: NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Portfolio not found' } },
        { status: 404 }
      ),
    };
  }

  if (portfolio.user_id !== user.id) {
    return {
      error: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to this portfolio' } },
        { status: 403 }
      ),
    };
  }

  return {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: portfolioId } = await params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  const { error } = await validatePortfolioAccess(token, portfolioId);
  if (error) return error;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100);
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type');

  // Build query
  const supabase = createAuthenticatedClient(token!);
  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: false });

  if (symbol) query = query.eq('symbol', symbol);
  if (type === 'BUY' || type === 'SELL') query = query.eq('type', type);

  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data: transactions, error: txError, count } = await query;

  if (txError) {
    return NextResponse.json(
      { error: { code: 'QUERY_FAILED', message: 'Failed to fetch transactions' } },
      { status: 500 }
    );
  }

  const total = count || 0;
  const has_next = offset + limit < total;

  return NextResponse.json({
    data: transactions || [],
    pagination: {
      page,
      limit,
      total,
      has_next,
    },
  });
}
