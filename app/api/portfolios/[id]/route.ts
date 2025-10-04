import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/sanitize';

interface Transaction {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  portfolio_id: string;
  executed_at: string;
}

async function authenticateAndCheckOwnership(
  token: string | undefined,
  portfolioId: string
): Promise<{ user: { id: string } | null; error?: NextResponse }> {
  if (!token) {
    return {
      user: null,
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
      user: null,
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
      user: null,
      error: NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Portfolio not found' } },
        { status: 404 }
      ),
    };
  }

  if (portfolio.user_id !== user.id) {
    return {
      user: null,
      error: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to this portfolio' } },
        { status: 403 }
      ),
    };
  }

  return { user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const supabase = createAuthenticatedClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
      { status: 401 }
    );
  }

  // Get portfolio with ownership check
  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', id)
    .single();

  if (portfolioError || !portfolio) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Portfolio not found' } },
      { status: 404 }
    );
  }

  if (portfolio.user_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Access denied to this portfolio' } },
      { status: 403 }
    );
  }

  // Get transactions for this portfolio
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('portfolio_id', id)
    .order('executed_at', { ascending: true });

  // Calculate holdings from transactions
  const holdingsMap = new Map<string, {
    total_quantity: number;
    total_cost: number;
  }>();

  (transactions as Transaction[] | null)?.forEach(tx => {
    const current = holdingsMap.get(tx.symbol) || { total_quantity: 0, total_cost: 0 };
    
    if (tx.type === 'BUY') {
      current.total_quantity += tx.quantity;
      current.total_cost += tx.quantity * tx.price_per_unit;
    } else if (tx.type === 'SELL') {
      current.total_quantity -= tx.quantity;
      current.total_cost -= tx.quantity * tx.price_per_unit;
    }
    
    holdingsMap.set(tx.symbol, current);
  });

  // Filter out zero holdings and get market prices (mock for now)
  const holdings = Array.from(holdingsMap.entries())
    .filter(([_, data]) => data.total_quantity > 0)
    .map(([symbol, data]) => {
      const current_price = 50000; // Mock price - will integrate with Moralis API later
      const average_cost = data.total_cost / data.total_quantity;
      const market_value = data.total_quantity * current_price;
      const unrealized_pl = market_value - data.total_cost;

      return {
        symbol,
        total_quantity: data.total_quantity,
        average_cost,
        market_value,
        unrealized_pl,
        current_price,
        price_change_24h_pct: null, // Mock - will integrate with Moralis API later
      };
    });

  // Calculate summary
  const total_value = holdings.reduce((sum, h) => sum + h.market_value, 0);
  const total_cost = holdings.reduce((sum, h) => sum + (h.average_cost * h.total_quantity), 0);
  const unrealized_pl = total_value - total_cost;
  const total_pl_pct = total_cost > 0 ? (unrealized_pl / total_cost) * 100 : 0;

  return NextResponse.json({
    data: {
      portfolio,
      holdings,
      summary: {
        total_value,
        total_cost,
        unrealized_pl,
        total_pl_pct,
      },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  const { error } = await authenticateAndCheckOwnership(token, id);
  if (error) return error;

  // Get and validate request body
  const body = await request.json();
  const updateData: { name?: string; description?: string | null } = {};

  if (body.name !== undefined) {
    const sanitizedName = sanitizeInput(body.name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_NAME', message: 'Portfolio name cannot be empty' } },
        { status: 400 }
      );
    }
    if (sanitizedName.length > 100) {
      return NextResponse.json(
        { error: { code: 'NAME_TOO_LONG', message: 'Portfolio name must be 100 characters or less' } },
        { status: 400 }
      );
    }
    updateData.name = sanitizedName;
  }

  if (body.description !== undefined) {
    updateData.description = body.description ? sanitizeInput(body.description) : null;
  }

  // Update portfolio
  const supabase = createAuthenticatedClient(token!);
  const { data: updated, error: updateError } = await supabase
    .from('portfolios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: 'Failed to update portfolio' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  const { error } = await authenticateAndCheckOwnership(token, id);
  if (error) return error;

  // Delete portfolio (transactions cascade automatically)
  const supabase = createAuthenticatedClient(token!);
  const { error: deleteError } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Failed to delete portfolio' } },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
