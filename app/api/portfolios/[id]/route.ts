import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';

interface Transaction {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  portfolio_id: string;
  executed_at: string;
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
