import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type Interval = '24h' | '7d' | '30d' | '90d' | 'all';

interface Snapshot {
  snapshot_date: string;
  total_value: number;
}

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
 * Calculate start date based on interval
 */
function getStartDate(interval: Interval, portfolioCreatedAt?: string): Date {
  const now = new Date();
  
  switch (interval) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return portfolioCreatedAt
        ? new Date(portfolioCreatedAt)
        : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
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
 */
async function fetchCurrentValue(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<number> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('symbol, type, quantity, price_per_unit, transaction_date')
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: true });

  const holdingsMap = calculateHoldings((transactions as Transaction[]) || []);

  const symbols = Array.from(holdingsMap.keys()).filter((symbol: string) => {
    const data = holdingsMap.get(symbol)!;
    return data.total_quantity > 0;
  });

  const { data: prices } = await supabase
    .from('price_cache')
    .select('symbol, price_usd')
    .in('symbol', symbols.length > 0 ? symbols : ['']);

  return calculateCurrentValue(holdingsMap, (prices as PriceData[]) || []);
}

/**
 * Check if snapshots exist for portfolio, log warning if missing
 */
function validateSnapshots(
  snapshots: Snapshot[] | null,
  portfolioId: string
): { valid: boolean; message?: string } {
  if (!snapshots || snapshots.length === 0) {
    console.warn(
      `[Chart API] No snapshots found for portfolio ${portfolioId}. ` +
      'Historical price tracking may not be set up. Run backfill script: npm run backfill:snapshots'
    );
    return { 
      valid: false, 
      message: 'No historical data available. Run backfill script to generate snapshots.' 
    };
  }

  if (snapshots.length === 1) {
    console.warn(
      `[Chart API] Only one snapshot found for portfolio ${portfolioId}. ` +
      'Daily snapshot function may not be running.'
    );
  }

  return { valid: true };
}

/**
 * Authenticate user and verify portfolio ownership
 */
async function authenticateAndVerify(
  token: string | undefined,
  portfolioId: string
): Promise<
  | { success: true; supabase: SupabaseClient; portfolio: { id: string; name: string; created_at: string } }
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
    .select('id, name, created_at')
    .eq('id', portfolioId)
    .eq('user_id', user.id)
    .single();

  if (portfolioError || !portfolio) {
    return {
      success: false,
      response: NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Portfolio not found' } },
        { status: 404 }
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
 * Fetch portfolio value snapshots for charting
 * 
 * Path params:
 * - id: Portfolio ID
 * 
 * Query params:
 * - interval: Time interval (24h, 7d, 30d, 90d, all)
 */
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

  const { supabase, portfolio } = authResult;

  // Validate interval
  const { searchParams } = new URL(request.url);
  const intervalParam = searchParams.get('interval');
  const intervalResult = validateInterval(intervalParam);

  if (!intervalResult.valid) {
    return intervalResult.response;
  }

  const interval = intervalResult.interval;

  try {
    const startDate = getStartDate(interval, portfolio.created_at);

    const { data: snapshots, error: snapshotsError } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, total_value')
      .eq('portfolio_id', portfolioId)
      .gte('snapshot_date', startDate.toISOString())
      .order('snapshot_date', { ascending: true });

    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch chart data' } },
        { status: 500 }
      );
    }

    // Validate snapshots exist
    const validation = validateSnapshots(snapshots, portfolioId);
    if (!validation.valid) {
      // Return empty chart data with warning
      return NextResponse.json({
        data: {
          interval,
          snapshots: [],
          current_value: 0,
          start_value: 0,
          change_abs: 0,
          change_pct: 0,
          warning: validation.message,
        },
      });
    }

    // Use real snapshot data
    const snapshotsData = snapshots.map((s: Snapshot) => ({
      captured_at: s.snapshot_date,
      total_value: s.total_value,
    }));

    const startValue = snapshots[0].total_value;
    const currentValue = await fetchCurrentValue(supabase, portfolioId);

    // Add current value as the latest data point
    const now = new Date().toISOString();
    snapshotsData.push({
      captured_at: now,
      total_value: currentValue,
    });

    const changeAbs = currentValue - startValue;
    const changePct = startValue > 0 ? (changeAbs / startValue) * 100 : 0;

    return NextResponse.json({
      data: {
        interval,
        snapshots: snapshotsData,
        current_value: currentValue,
        start_value: startValue,
        change_abs: changeAbs,
        change_pct: changePct,
      },
    });
  } catch (error) {
    console.error('Error generating portfolio chart data:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch chart data' } },
      { status: 500 }
    );
  }
}
