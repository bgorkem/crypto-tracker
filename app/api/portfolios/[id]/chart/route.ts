import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';
import { CacheService, type ChartData } from '@/lib/redis';
import { chartMetrics } from '@/lib/metrics';
import type { SupabaseClient } from '@supabase/supabase-js';

type Interval = '24h' | '7d' | '30d' | '90d' | 'all';

interface Transaction {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
}

interface PriceData {
  symbol: string;
  price_usd: number;
}

interface HoldingData {
  total_quantity: number;
  total_cost: number;
  buys: Array<{ quantity: number; price: number }>;
}

/**
 * Calculate start date based on interval with 1-year maximum cap
 * T019: Implements getStartDate helper function
 */
async function getStartDate(
  interval: Interval,
  earliestTransactionDate: Date | null,
  supabase: SupabaseClient
): Promise<Date> {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  switch (interval) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all': {
      // Cap 'all' interval at 1 year to prevent expensive calculations
      // Use Math.max to get the more recent date (less data to compute)
      if (earliestTransactionDate) {
        return new Date(
          Math.max(earliestTransactionDate.getTime(), oneYearAgo.getTime())
        );
      }
      return oneYearAgo;
    }
  }
}

/**
 * Calculate holdings using FIFO cost basis
 */
function calculateHoldings(transactions: Transaction[]): Map<string, HoldingData> {
  const holdingsMap = new Map<string, HoldingData>();

  transactions.forEach((tx: Transaction) => {
    const current = holdingsMap.get(tx.symbol) || {
      total_quantity: 0,
      total_cost: 0,
      buys: [],
    };

    if (tx.type === 'BUY') {
      current.total_quantity += tx.quantity;
      current.total_cost += tx.quantity * tx.price_per_unit;
      current.buys.push({ quantity: tx.quantity, price: tx.price_per_unit });
    } else if (tx.type === 'SELL') {
      let remainingToSell = tx.quantity;
      current.total_quantity -= tx.quantity;

      while (remainingToSell > 0 && current.buys.length > 0) {
        const oldestBuy = current.buys[0];
        if (oldestBuy.quantity <= remainingToSell) {
          current.total_cost -= oldestBuy.quantity * oldestBuy.price;
          remainingToSell -= oldestBuy.quantity;
          current.buys.shift();
        } else {
          current.total_cost -= remainingToSell * oldestBuy.price;
          oldestBuy.quantity -= remainingToSell;
          remainingToSell = 0;
        }
      }
    }

    holdingsMap.set(tx.symbol, current);
  });

  return holdingsMap;
}

/**
 * Calculate current portfolio value from holdings and prices
 */
function calculateCurrentValue(
  holdingsMap: Map<string, HoldingData>,
  prices: PriceData[]
): number {
  const priceMap = new Map(prices.map((p: PriceData) => [p.symbol, p.price_usd]));
  let currentValue = 0;

  holdingsMap.forEach((data: HoldingData, symbol: string) => {
    if (data.total_quantity > 0) {
      const currentPrice = priceMap.get(symbol) || 0;
      currentValue += data.total_quantity * currentPrice;
    }
  });

  return currentValue;
}

/**
 * Fetch current portfolio value
 * T020: Implements fetchCurrentValue helper function
 */
async function fetchCurrentValue(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<string> {
  // Fetch all transactions for holdings calculation
  const { data: transactions } = await supabase
    .from('transactions')
    .select('symbol, type, quantity, price_per_unit, transaction_date')
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: true });

  const holdingsMap = calculateHoldings((transactions as Transaction[]) || []);

  // Get symbols with positive holdings
  const symbols = Array.from(holdingsMap.keys()).filter((symbol: string) => {
    const data = holdingsMap.get(symbol)!;
    return data.total_quantity > 0;
  });

  if (symbols.length === 0) {
    return '0';
  }

  // Fetch current prices for all held symbols
  const { data: prices } = await supabase
    .from('price_cache')
    .select('symbol, price_usd')
    .in('symbol', symbols);

  const currentValue = calculateCurrentValue(holdingsMap, (prices as PriceData[]) || []);
  
  // Return as string for consistency with database NUMERIC type
  return currentValue.toFixed(2);
}

/**
 * Authenticate user and verify portfolio ownership
 */
async function authenticateAndVerify(
  token: string | undefined,
  portfolioId: string
): Promise<
  | { success: true; supabase: SupabaseClient; portfolio: { id: string; name: string; created_at: string; user_id: string } }
  | { success: false; response: NextResponse }
> {
  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      ),
    };
  }

  const supabase = createAuthenticatedClient(token);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        { status: 401 }
      ),
    };
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('id, name, created_at, user_id')
    .eq('id', portfolioId)
    .single();

  if (portfolioError || !portfolio) {
    return {
      success: false,
      response: NextResponse.json(
        { error: { code: 'PORTFOLIO_NOT_FOUND', message: 'Portfolio not found' } },
        { status: 404 }
      ),
    };
  }

  // Check ownership
  if (portfolio.user_id !== user.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have access to this portfolio' } },
        { status: 403 }
      ),
    };
  }

  return { success: true, supabase, portfolio };
}

/**
 * Validate interval parameter
 */
function validateInterval(interval: string | null): { valid: true; interval: Interval } | { valid: false; response: NextResponse } {
  const validIntervals: Interval[] = ['24h', '7d', '30d', '90d', 'all'];
  
  if (!interval || !validIntervals.includes(interval as Interval)) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: {
            code: 'INVALID_INTERVAL',
            message: 'Interval must be one of: 24h, 7d, 30d, 90d, all',
          },
        },
        { status: 400 }
      ),
    };
  }

  return { valid: true, interval: interval as Interval };
}

/**
 * GET /api/portfolios/:id/chart
 * Fetch portfolio value snapshots for charting with Redis caching
 * T021: Complete API route with Redis caching integration
 * 
 * Path params:
 * - id: Portfolio ID
 * 
 * Query params:
 * - interval: Time interval (24h, 7d, 30d, 90d, all)
 */
// eslint-disable-next-line complexity
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { id: portfolioId } = params;

  // Authenticate and verify ownership
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const authResult = await authenticateAndVerify(token, portfolioId);

  if (!authResult.success) {
    return authResult.response;
  }

  const { supabase } = authResult;

  // Validate interval
  const { searchParams } = new URL(request.url);
  const intervalParam = searchParams.get('interval');
  const intervalResult = validateInterval(intervalParam);

  if (!intervalResult.valid) {
    return intervalResult.response;
  }

  const interval = intervalResult.interval;

  try {
    // 1. Check cache first
    const cachedData = await CacheService.getChartData(portfolioId, interval);
    
    if (cachedData) {
      chartMetrics.cacheHit(portfolioId, interval, cachedData.cached_at);
      
      return NextResponse.json({
        data: cachedData,
      });
    }

    chartMetrics.cacheMiss(portfolioId, interval, 'not_found');

    // 2. Fetch earliest transaction date for 'all' interval cap
    let earliestTransactionDate: Date | null = null;
    
    if (interval === 'all') {
      const { data: earliestTx } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: true })
        .limit(1)
        .single();

      if (earliestTx) {
        earliestTransactionDate = new Date(earliestTx.transaction_date);
      }
    }

    // 3. Calculate start date with 1-year cap for 'all'
    const startDate = await getStartDate(interval, earliestTransactionDate, supabase);
    const endDate = new Date(); // Now

    // 4. Call PostgreSQL calculate_portfolio_snapshots function
    const startTime = Date.now();
    
    const { data: snapshots, error: snapshotsError } = await supabase.rpc(
      'calculate_portfolio_snapshots',
      {
        p_portfolio_id: portfolioId,
        p_start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        p_end_date: endDate.toISOString().split('T')[0], // YYYY-MM-DD
      }
    );

    const latency = Date.now() - startTime;
    
    if (snapshotsError) {
      console.error('Error calling calculate_portfolio_snapshots:', snapshotsError);
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch chart data' } },
        { status: 500 }
      );
    }

    const snapshotData = snapshots as Array<{
      snapshot_date: string;
      total_value: string;
      total_cost: string;
      total_pl: string;
      total_pl_pct: string;
      holdings_count: number;
    }>;

    chartMetrics.dbFunctionLatency(
      portfolioId,
      interval,
      latency,
      snapshotData?.length || 0
    );

    // 5. Fetch current value
    const currentValue = await fetchCurrentValue(supabase, portfolioId);

    // 6. Build ChartData response
    const startValue = snapshotData && snapshotData.length > 0 
      ? snapshotData[0].total_value 
      : '0';

    const changeAbs = (parseFloat(currentValue) - parseFloat(startValue)).toFixed(2);
    const changePct = parseFloat(startValue) > 0 
      ? ((parseFloat(changeAbs) / parseFloat(startValue)) * 100).toFixed(2)
      : '0.00';

    const chartData: Omit<ChartData, 'cached_at'> = {
      interval,
      snapshots: snapshotData || [],
      current_value: currentValue,
      start_value: startValue,
      change_abs: changeAbs,
      change_pct: changePct,
    };

    // 7. Cache the result (async, don't await)
    CacheService.setChartData(portfolioId, interval, chartData).catch((err) => {
      console.error('Failed to cache chart data:', err);
    });

    return NextResponse.json({
      data: chartData,
    });
  } catch (error) {
    console.error('Error generating portfolio chart data:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch chart data' } },
      { status: 500 }
    );
  }
}
