import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/sanitize';

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

function validateTransactionFields(body: {
  symbol?: string;
  side?: string;
  quantity?: number;
  price?: number;
  executed_at?: string;
}): NextResponse | null {
  if (!body.symbol || !body.side || !body.quantity || !body.price || !body.executed_at) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELDS', message: 'Missing required fields' } },
      { status: 400 }
    );
  }

  if (body.side !== 'BUY' && body.side !== 'SELL') {
    return NextResponse.json(
      { error: { code: 'INVALID_SIDE', message: 'Side must be BUY or SELL' } },
      { status: 400 }
    );
  }

  if (body.quantity <= 0 || body.price <= 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_QUANTITY', message: 'Quantity and price must be positive' } },
      { status: 400 }
    );
  }

  if (new Date(body.executed_at) > new Date()) {
    return NextResponse.json(
      { error: { code: 'FUTURE_DATE', message: 'Transaction date cannot be in the future' } },
      { status: 400 }
    );
  }

  return null;
}

async function checkSufficientHoldings(
  token: string,
  portfolioId: string,
  symbol: string,
  quantity: number
): Promise<NextResponse | null> {
  const supabase = createAuthenticatedClient(token);
  const { data: existingTxns } = await supabase
    .from('transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('symbol', symbol);

  let totalHoldings = 0;
  existingTxns?.forEach((txn: { type: string; quantity: number }) => {
    if (txn.type === 'BUY') {
      totalHoldings += txn.quantity;
    } else if (txn.type === 'SELL') {
      totalHoldings -= txn.quantity;
    }
  });

  if (totalHoldings < quantity) {
    return NextResponse.json(
      { error: { code: 'INSUFFICIENT_HOLDINGS', message: `Insufficient ${symbol} holdings. Available: ${totalHoldings}` } },
      { status: 400 }
    );
  }

  return null;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: portfolioId } = await params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  const { error } = await validatePortfolioAccess(token, portfolioId);
  if (error) return error;

  // Parse and validate request body
  const body = await request.json();
  const validationError = validateTransactionFields(body);
  if (validationError) return validationError;

  const { symbol, side, quantity, price, executed_at, notes } = body;

  // For SELL, check if user has sufficient holdings
  if (side === 'SELL') {
    const holdingsError = await checkSufficientHoldings(token!, portfolioId, symbol, quantity);
    if (holdingsError) return holdingsError;
  }

  // Create transaction
  const supabase = createAuthenticatedClient(token!);
  const { data: transaction, error: createError } = await supabase
    .from('transactions')
    .insert({
      portfolio_id: portfolioId,
      symbol,
      type: side,
      quantity,
      price_per_unit: price,
      transaction_date: executed_at,
      notes: notes ? sanitizeInput(notes) : null,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json(
      { error: { code: 'CREATE_FAILED', message: 'Failed to create transaction' } },
      { status: 500 }
    );
  }

  // Map response back to use 'side' instead of 'type'
  const responseData = {
    ...transaction,
    side: transaction.type,
    price: transaction.price_per_unit,
    executed_at: transaction.transaction_date,
  };

  return NextResponse.json({ data: responseData }, { status: 201 });
}

/**
 * DELETE /api/portfolios/[id]/transactions?symbol=XXX
 * Bulk delete all transactions for a specific symbol
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { id: portfolioId } = params;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  const validationResult = await validatePortfolioAccess(token, portfolioId);
  if (validationResult.error) {
    return validationResult.error;
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Symbol parameter is required' } },
      { status: 400 }
    );
  }

  const supabase = createAuthenticatedClient(token!);

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('portfolio_id', portfolioId)
    .eq('symbol', symbol);

  if (error) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to delete transactions' } },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
