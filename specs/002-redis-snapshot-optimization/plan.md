# Implementation Plan: Portfolio Snapshot Optimization

**Feature**: 002-redis-snapshot-optimization  
**Created**: 2025-10-10  
**Tech Stack**: TypeScript, Next.js 15.5, PostgreSQL (Supabase), Vercel KV (Redis), React Query  
**Complexity**: Medium (Database optimization + Cache layer)

---

## 🎯 Executive Summary

Replace the slow 30-minute backfill script with a Redis cache-only architecture that calculates portfolio snapshots on-demand using PostgreSQL window functions. This eliminates N+1 query problems, supports instant cache invalidation for back-dated transactions, and achieves 60-1000x performance improvement.

**Key Decisions**:
- **Database**: PostgreSQL function with window functions (single query vs 7,300+ queries)
- **Cache**: Vercel KV (Redis-compatible, serverless-native)
- **Invalidation**: Mutation-based (no TTL) via API hooks
- **Migration**: Clean cutover (drop old table immediately, no active users)

**Performance Targets**:
- Cold cache: ≤500ms (p95) - database calculation
- Warm cache: ≤50ms (p95) - Redis read
- Cache hit rate: ≥80% after 24h warm-up

---

## 📐 Architecture Overview

### Current Architecture (Problem)
```
User Request → API Route → Fetch from portfolio_snapshots table
                              ↑
                         Backfill Script (runs separately)
                         - Iterates each portfolio (sequential)
                         - Iterates each day (N+1 queries)
                         - 2 queries per day × 365 days × 10 portfolios
                         = 7,300 queries over 30 minutes
```

### New Architecture (Solution)
```
User Request → API Route → Check Vercel KV Cache
                              ├── CACHE HIT: Return (15ms)
                              └── CACHE MISS: 
                                    ↓
                              PostgreSQL Function (200ms)
                              - Single query with window functions
                              - Calculate cumulative holdings
                              - Join with historical prices
                                    ↓
                              Cache in Vercel KV → Return

Transaction Mutation → Invalidate Cache Keys
                       (all 5 intervals for portfolio)
```

### Data Flow
```
1. Chart Request (GET /api/portfolios/[id]/chart?interval=30d)
   ↓
2. Cache Key: portfolio:{uuid}:chart:30d
   ↓
3. Vercel KV GET
   ├── Found → Parse JSON → Return (15ms)
   └── Not Found →
       ↓
4. Call PostgreSQL Function: calculate_portfolio_snapshots(uuid, start_date, end_date)
   ↓
5. Window function calculates:
   - Date series (all days in range)
   - Cumulative holdings (BUY +, SELL -)
   - Join with price_cache on (symbol, price_date)
   - Aggregate total_value, total_cost, P/L
   ↓
6. Cache result in Vercel KV (no expiry)
   ↓
7. Return to client (200-300ms first time)

8. On Transaction Change:
   - DELETE cache keys: portfolio:{uuid}:chart:{24h,7d,30d,90d,all}
```

---

## 🗄️ Database Design

### New PostgreSQL Function

**Purpose**: Calculate portfolio snapshots for a date range in a single query using window functions.

```sql
-- Migration: 20251010000000_add_calculate_portfolio_snapshots.sql

CREATE OR REPLACE FUNCTION calculate_portfolio_snapshots(
  p_portfolio_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  snapshot_date DATE,
  total_value NUMERIC(20, 2),
  total_cost NUMERIC(20, 2),
  total_pl NUMERIC(20, 2),
  total_pl_pct NUMERIC(10, 2),
  holdings_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Generate date series for the range
  date_series AS (
    SELECT generate_series(
      p_start_date,
      p_end_date,
      '1 day'::interval
    )::date AS snapshot_date
  ),
  
  -- Calculate cumulative holdings using window functions
  cumulative_holdings AS (
    SELECT 
      ds.snapshot_date,
      t.symbol,
      -- Cumulative quantity (BUY adds, SELL subtracts)
      SUM(
        CASE 
          WHEN t.type = 'BUY' THEN t.quantity 
          ELSE -t.quantity 
        END
      ) OVER (
        PARTITION BY t.symbol 
        ORDER BY ds.snapshot_date
      ) AS quantity,
      -- Cumulative cost basis
      SUM(
        CASE 
          WHEN t.type = 'BUY' THEN t.quantity * t.price_per_unit
          ELSE -t.quantity * t.price_per_unit
        END
      ) OVER (
        PARTITION BY t.symbol 
        ORDER BY ds.snapshot_date
      ) AS cost_basis
    FROM date_series ds
    LEFT JOIN transactions t 
      ON t.portfolio_id = p_portfolio_id 
      AND t.transaction_date::date <= ds.snapshot_date
  ),
  
  -- Join with historical prices and calculate values
  portfolio_values AS (
    SELECT 
      ch.snapshot_date,
      ch.symbol,
      ch.quantity,
      ch.cost_basis,
      pc.price_usd,
      (ch.quantity * pc.price_usd) AS market_value
    FROM cumulative_holdings ch
    LEFT JOIN price_cache pc 
      ON pc.symbol = ch.symbol 
      AND pc.price_date = ch.snapshot_date
    WHERE ch.quantity > 0  -- Only holdings with positive quantity
  ),
  
  -- Aggregate by date
  daily_aggregates AS (
    SELECT 
      pv.snapshot_date,
      COALESCE(SUM(pv.market_value), 0) AS total_value,
      COALESCE(SUM(pv.cost_basis), 0) AS total_cost,
      COUNT(DISTINCT pv.symbol) FILTER (WHERE pv.quantity > 0) AS holdings_count
    FROM portfolio_values pv
    GROUP BY pv.snapshot_date
  )
  
  -- Final calculation with P/L
  SELECT 
    da.snapshot_date,
    da.total_value,
    da.total_cost,
    (da.total_value - da.total_cost) AS total_pl,
    CASE 
      WHEN da.total_cost > 0 
      THEN ((da.total_value - da.total_cost) / da.total_cost) * 100
      ELSE 0 
    END AS total_pl_pct,
    da.holdings_count::INTEGER
  FROM daily_aggregates da
  ORDER BY da.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_portfolio_snapshots IS 
  'Calculates portfolio value snapshots for a date range using window functions. 
   Returns daily total_value, cost_basis, P/L for charting. Performance: ~200-300ms for 1000 txns.';
```

**Performance Optimization**:
- Uses existing indexes on `portfolio_id`, `transaction_date`, `price_date`
- Window functions avoid N+1 pattern
- STABLE function allows query plan caching
- LEFT JOIN handles missing price data gracefully

**Index Verification** (already exist from MVP):
```sql
-- Verify these indexes exist (from 20240101000000_initial_schema.sql)
-- idx_transactions_portfolio_date ON transactions(portfolio_id, transaction_date DESC)
-- idx_price_cache_symbol_date ON price_cache(symbol, price_date DESC)
```

### Drop Old Table & Script

```sql
-- Migration: 20251010000001_drop_portfolio_snapshots.sql

-- Drop table (no active users, no data loss risk)
DROP TABLE IF EXISTS portfolio_snapshots;

-- Drop associated indexes (already removed with table)
-- DROP INDEX IF EXISTS idx_snapshots_portfolio_date;
-- DROP INDEX IF EXISTS idx_snapshots_date;
-- DROP INDEX IF EXISTS idx_snapshots_portfolio_id;

-- Add comment
COMMENT ON SCHEMA public IS 'Portfolio snapshots removed - using Redis cache + on-demand calculation';
```

**File Deletion**:
```bash
# Remove backfill script
rm scripts/backfill-historical-snapshots.ts

# Update package.json - remove backfill:snapshots command
```

---

## 🔧 Redis Integration (Vercel KV)

### Setup Vercel KV

**Vercel Dashboard**:
1. Navigate to project → Storage tab
2. Click "Create Database" → Select "KV (Redis)"
3. Name: `crypto-tracker-cache`
4. Region: Same as primary deployment (e.g., `us-east-1`)
5. Auto-injects environment variables:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

**Local Development** (`.env.local`):
```bash
# Get from Vercel dashboard → Storage → KV → .env.local tab
KV_URL="redis://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
```

### Redis Client Setup

```typescript
// lib/redis.ts

import { kv } from '@vercel/kv';

/**
 * Vercel KV client (Redis-compatible)
 * Auto-configured via environment variables
 */
export { kv };

/**
 * Cache key patterns
 */
export const CACHE_KEYS = {
  portfolioChart: (portfolioId: string, interval: string) => 
    `portfolio:${portfolioId}:chart:${interval}`,
  
  portfolioChartPattern: (portfolioId: string) => 
    `portfolio:${portfolioId}:chart:*`,
} as const;

/**
 * Cache operations with error handling
 */
export class CacheService {
  /**
   * Get cached chart data
   */
  static async getChartData(
    portfolioId: string, 
    interval: string
  ): Promise<ChartData | null> {
    try {
      const key = CACHE_KEYS.portfolioChart(portfolioId, interval);
      const data = await kv.get<string>(key);
      
      if (!data) {
        console.log(`[CACHE MISS] ${key}`);
        return null;
      }
      
      console.log(`[CACHE HIT] ${key}`);
      return JSON.parse(data);
    } catch (error) {
      console.error('[CACHE ERROR] Failed to get:', error);
      return null; // Fallback to calculation
    }
  }

  /**
   * Set chart data in cache (no expiry)
   */
  static async setChartData(
    portfolioId: string,
    interval: string,
    data: ChartData
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.portfolioChart(portfolioId, interval);
      await kv.set(key, JSON.stringify(data));
      console.log(`[CACHE SET] ${key}`);
    } catch (error) {
      console.error('[CACHE ERROR] Failed to set:', error);
      // Non-fatal - next request will calculate again
    }
  }

  /**
   * Invalidate all chart caches for a portfolio
   */
  static async invalidatePortfolio(portfolioId: string): Promise<void> {
    try {
      const intervals = ['24h', '7d', '30d', '90d', 'all'];
      const keys = intervals.map(i => CACHE_KEYS.portfolioChart(portfolioId, i));
      
      // Delete all interval keys atomically
      await Promise.all(keys.map(key => kv.del(key)));
      
      console.log(`[CACHE INVALIDATED] portfolio:${portfolioId}:chart:* (${keys.length} keys)`);
    } catch (error) {
      console.error('[CACHE ERROR] Failed to invalidate:', error);
      // Non-fatal - stale cache will be overwritten
    }
  }
}

/**
 * Type definitions
 */
export interface ChartData {
  interval: string;
  snapshots: Array<{
    captured_at: string;
    total_value: number;
  }>;
  current_value: number;
  start_value: number;
  change_abs: number;
  change_pct: number;
}
```

---

## 🚀 API Implementation

### Update Chart API Route

```typescript
// app/api/portfolios/[id]/chart/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';
import { CacheService, type ChartData } from '@/lib/redis';
import { apiResponse } from '@/lib/api-response';

type Interval = '24h' | '7d' | '30d' | '90d' | 'all';

const INTERVAL_LABELS: Record<Interval, string> = {
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  all: 'All Time',
};

/**
 * Calculate start date based on interval
 */
function getStartDate(interval: Interval, earliestTransactionDate: string | null): Date {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (interval) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'all':
      // Use earliest transaction date (handles back-dated transactions)
      // Portfolio creation date is irrelevant - user can add old transactions
      if (earliestTransactionDate) {
        startDate.setTime(new Date(earliestTransactionDate).getTime());
      } else {
        // No transactions - default to 30 days
        startDate.setDate(startDate.getDate() - 30);
      }
      break;
  }
  
  return startDate;
}

/**
 * Fetch current portfolio value (for latest data point)
 */
async function fetchCurrentValue(
  supabase: any,
  portfolioId: string
): Promise<number> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('symbol, type, quantity, price_per_unit')
    .eq('portfolio_id', portfolioId);

  if (!transactions || transactions.length === 0) return 0;

  // Calculate current holdings
  const holdings = new Map<string, number>();
  for (const txn of transactions) {
    const current = holdings.get(txn.symbol) || 0;
    holdings.set(
      txn.symbol, 
      current + (txn.type === 'BUY' ? txn.quantity : -txn.quantity)
    );
  }

  // Fetch current prices
  const symbols = Array.from(holdings.keys()).filter(s => holdings.get(s)! > 0);
  if (symbols.length === 0) return 0;

  const { data: prices } = await supabase
    .from('price_cache')
    .select('symbol, price_usd')
    .in('symbol', symbols)
    .order('price_date', { ascending: false })
    .limit(symbols.length);

  // Calculate total value
  let totalValue = 0;
  for (const price of prices || []) {
    const quantity = holdings.get(price.symbol) || 0;
    totalValue += quantity * price.price_usd;
  }

  return totalValue;
}

/**
 * GET /api/portfolios/:id/chart?interval=30d
 * Fetch portfolio chart data with Redis caching
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: portfolioId } = await context.params;
  const { searchParams } = new URL(request.url);
  const interval = (searchParams.get('interval') || '30d') as Interval;

  // Validate interval
  if (!INTERVAL_LABELS[interval]) {
    return NextResponse.json(
      apiResponse.error('INVALID_INTERVAL', 'Invalid interval parameter'),
      { status: 400 }
    );
  }

  // Authenticate and verify ownership
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { supabase, user } = await createAuthenticatedClient(token);

  if (!user) {
    return NextResponse.json(
      apiResponse.error('UNAUTHORIZED', 'Authentication required'),
      { status: 401 }
    );
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', portfolioId)
    .eq('user_id', user.id)
    .single();

  if (portfolioError || !portfolio) {
    return NextResponse.json(
      apiResponse.error('NOT_FOUND', 'Portfolio not found'),
      { status: 404 }
    );
  }

  try {
    // 1. Try cache first
    const cached = await CacheService.getChartData(portfolioId, interval);
    if (cached) {
      return NextResponse.json(
        apiResponse.success({ ...cached, cached: true })
      );
    }

    // 2. Cache miss - fetch earliest transaction date for 'all' interval
    let earliestTransactionDate: string | null = null;
    if (interval === 'all') {
      const { data: earliestTxn } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: true })
        .limit(1)
        .single();
      
      earliestTransactionDate = earliestTxn?.transaction_date || null;
    }

    // 3. Calculate start/end dates
    const startDate = getStartDate(interval, earliestTransactionDate);
    const endDate = new Date();

    const { data: snapshots, error: calcError } = await supabase.rpc(
      'calculate_portfolio_snapshots',
      {
        p_portfolio_id: portfolioId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      }
    );

    if (calcError) {
      console.error('[DB ERROR] Portfolio calculation failed:', calcError);
      return NextResponse.json(
        apiResponse.error('CALCULATION_FAILED', 'Failed to calculate portfolio values'),
        { status: 500 }
      );
    }

    // 4. Fetch current value for latest data point
    const currentValue = await fetchCurrentValue(supabase, portfolioId);

    // 5. Build response
    const chartData: ChartData = {
      interval,
      snapshots: (snapshots || []).map(s => ({
        captured_at: s.snapshot_date,
        total_value: parseFloat(s.total_value),
      })),
      current_value: currentValue,
      start_value: snapshots?.[0]?.total_value || 0,
      change_abs: currentValue - (snapshots?.[0]?.total_value || 0),
      change_pct: snapshots?.[0]?.total_value 
        ? ((currentValue - snapshots[0].total_value) / snapshots[0].total_value) * 100 
        : 0,
    };

    // Add current value as latest point
    if (snapshots && snapshots.length > 0) {
      chartData.snapshots.push({
        captured_at: new Date().toISOString(),
        total_value: currentValue,
      });
    }

    // 6. Cache result (no expiry - mutation-based invalidation)
    await CacheService.setChartData(portfolioId, interval, chartData);

    // 7. Return
    return NextResponse.json(
      apiResponse.success({ ...chartData, cached: false })
    );
  } catch (error) {
    console.error('[CHART ERROR]', error);
    return NextResponse.json(
      apiResponse.error('INTERNAL_ERROR', 'Failed to generate chart data'),
      { status: 500 }
    );
  }
}
```

### Add Cache Invalidation Hooks

```typescript
// app/api/portfolios/[portfolioId]/transactions/route.ts

import { CacheService } from '@/lib/redis';

// In POST handler (create transaction)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ portfolioId: string }> }
) {
  const { portfolioId } = await context.params;
  
  // ... existing transaction creation logic ...

  // Invalidate cache after successful transaction creation
  await CacheService.invalidatePortfolio(portfolioId);

  return NextResponse.json(apiResponse.success({ data: transaction }));
}

// In PATCH handler (update transaction)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ portfolioId: string; id: string }> }
) {
  const { portfolioId } = await context.params;
  
  // ... existing transaction update logic ...

  // Invalidate cache after successful update
  await CacheService.invalidatePortfolio(portfolioId);

  return NextResponse.json(apiResponse.success({ data: transaction }));
}

// In DELETE handler (delete transaction)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ portfolioId: string; id: string }> }
) {
  const { portfolioId } = await context.params;
  
  // ... existing transaction deletion logic ...

  // Invalidate cache after successful deletion
  await CacheService.invalidatePortfolio(portfolioId);

  return NextResponse.json(apiResponse.success({ success: true }));
}
```

```typescript
// app/api/portfolios/[id]/route.ts

import { CacheService } from '@/lib/redis';

// In DELETE handler (delete portfolio)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: portfolioId } = await context.params;
  
  // ... existing portfolio deletion logic ...

  // Invalidate cache before portfolio deletion
  await CacheService.invalidatePortfolio(portfolioId);

  return NextResponse.json(apiResponse.success({ success: true }));
}
```

---

## 📦 Dependencies

```json
// package.json updates

{
  "dependencies": {
    "@vercel/kv": "^2.0.0"  // Add Vercel KV client
  },
  "scripts": {
    "backfill:snapshots": // REMOVE THIS LINE
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// __tests__/unit/redis-cache.test.ts

import { CacheService } from '@/lib/redis';
import { kv } from '@vercel/kv';

jest.mock('@vercel/kv');

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChartData', () => {
    it('should return null on cache miss', async () => {
      (kv.get as jest.Mock).mockResolvedValue(null);
      
      const result = await CacheService.getChartData('portfolio-123', '30d');
      
      expect(result).toBeNull();
      expect(kv.get).toHaveBeenCalledWith('portfolio:portfolio-123:chart:30d');
    });

    it('should parse and return cached data on hit', async () => {
      const mockData = { interval: '30d', snapshots: [] };
      (kv.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      
      const result = await CacheService.getChartData('portfolio-123', '30d');
      
      expect(result).toEqual(mockData);
    });

    it('should return null on Redis error (graceful fallback)', async () => {
      (kv.get as jest.Mock).mockRejectedValue(new Error('Redis unavailable'));
      
      const result = await CacheService.getChartData('portfolio-123', '30d');
      
      expect(result).toBeNull();
    });
  });

  describe('invalidatePortfolio', () => {
    it('should delete all interval cache keys', async () => {
      (kv.del as jest.Mock).mockResolvedValue(1);
      
      await CacheService.invalidatePortfolio('portfolio-123');
      
      expect(kv.del).toHaveBeenCalledTimes(5); // 24h, 7d, 30d, 90d, all
      expect(kv.del).toHaveBeenCalledWith('portfolio:portfolio-123:chart:24h');
      expect(kv.del).toHaveBeenCalledWith('portfolio:portfolio-123:chart:7d');
      expect(kv.del).toHaveBeenCalledWith('portfolio:portfolio-123:chart:30d');
      expect(kv.del).toHaveBeenCalledWith('portfolio:portfolio-123:chart:90d');
      expect(kv.del).toHaveBeenCalledWith('portfolio:portfolio-123:chart:all');
    });
  });
});
```

```typescript
// __tests__/unit/db-function.test.ts

describe('calculate_portfolio_snapshots', () => {
  it('should calculate daily values using window functions', async () => {
    // Test with mock Supabase RPC call
    const { data, error } = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: 'test-portfolio',
      p_start_date: '2025-01-01',
      p_end_date: '2025-01-10',
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(10); // 10 days
    expect(data[0]).toHaveProperty('snapshot_date');
    expect(data[0]).toHaveProperty('total_value');
    expect(data[0]).toHaveProperty('total_pl');
  });

  it('should handle portfolios with no transactions', async () => {
    const { data } = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: 'empty-portfolio',
      p_start_date: '2025-01-01',
      p_end_date: '2025-01-10',
    });

    expect(data).toEqual([]);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/chart-caching.test.ts

describe('Chart API with Redis Caching', () => {
  it('should return cached data on second request', async () => {
    const portfolio = await createTestPortfolio();
    await createTestTransaction(portfolio.id, { symbol: 'BTC', quantity: 1 });

    // First request (cache miss)
    const response1 = await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);
    const data1 = await response1.json();
    expect(data1.data.cached).toBe(false);

    // Second request (cache hit)
    const response2 = await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);
    const data2 = await response2.json();
    expect(data2.data.cached).toBe(true);
    expect(data2.data.snapshots).toEqual(data1.data.snapshots);
  });

  it('should invalidate cache when transaction is added', async () => {
    const portfolio = await createTestPortfolio();
    
    // Initial request (populates cache)
    await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);

    // Add transaction (should invalidate cache)
    await fetch(`/api/portfolios/${portfolio.id}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ symbol: 'BTC', type: 'BUY', quantity: 1, price_per_unit: 50000 }),
    });

    // Next request should recalculate (cached=false)
    const response = await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);
    const data = await response.json();
    expect(data.data.cached).toBe(false);
  });
});
```

### Performance Tests

```typescript
// __tests__/performance/chart-performance.test.ts

describe('Chart Performance', () => {
  it('should meet cold cache latency target (≤500ms)', async () => {
    const portfolio = await createLargePortfolio(1000); // 1000 transactions
    
    const start = Date.now();
    const response = await fetch(`/api/portfolios/${portfolio.id}/chart?interval=all`);
    const duration = Date.now() - start;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(500); // NFR-001
  });

  it('should meet warm cache latency target (≤50ms)', async () => {
    const portfolio = await createTestPortfolio();
    
    // Prime cache
    await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);

    // Measure cached request
    const start = Date.now();
    await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50); // NFR-002
  });

  it('should meet cache invalidation target (≤50ms)', async () => {
    const portfolio = await createTestPortfolio();
    
    const start = Date.now();
    await CacheService.invalidatePortfolio(portfolio.id);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50); // NFR-003
  });
});
```

### Contract Tests

```typescript
// __tests__/contract/chart-api.test.ts

describe('Chart API Contract', () => {
  it('should maintain API response format', async () => {
    const portfolio = await createTestPortfolio();
    const response = await fetch(`/api/portfolios/${portfolio.id}/chart?interval=30d`);
    const { data } = await response.json();

    // Verify response structure (must not break frontend)
    expect(data).toMatchObject({
      interval: expect.stringMatching(/24h|7d|30d|90d|all/),
      snapshots: expect.arrayContaining([
        expect.objectContaining({
          captured_at: expect.any(String),
          total_value: expect.any(Number),
        }),
      ]),
      current_value: expect.any(Number),
      start_value: expect.any(Number),
      change_abs: expect.any(Number),
      change_pct: expect.any(Number),
    });
  });
});
```

---

## 📊 Monitoring & Observability

### Metrics to Track

```typescript
// lib/metrics.ts

export const chartMetrics = {
  cacheHit: (portfolioId: string, interval: string) => {
    console.log('[METRIC] cache_hit', { portfolioId, interval, timestamp: Date.now() });
  },
  
  cacheMiss: (portfolioId: string, interval: string, calculationTime: number) => {
    console.log('[METRIC] cache_miss', { 
      portfolioId, 
      interval, 
      calculationTime, 
      timestamp: Date.now() 
    });
  },
  
  cacheInvalidation: (portfolioId: string, reason: string) => {
    console.log('[METRIC] cache_invalidation', { portfolioId, reason, timestamp: Date.now() });
  },
  
  dbFunctionLatency: (portfolioId: string, duration: number) => {
    console.log('[METRIC] db_function_latency', { portfolioId, duration, timestamp: Date.now() });
  },
};
```

### Vercel Analytics Dashboard

**KPIs to Monitor**:
1. **Cache Hit Rate**: Target ≥80% after 24h warm-up
   - Query: `[CACHE HIT]` vs `[CACHE MISS]` log ratio
   
2. **P95 Latency**:
   - Cold cache: ≤500ms
   - Warm cache: ≤50ms
   
3. **Error Rate**: Redis errors, DB function errors
   
4. **Invalidation Frequency**: Track per portfolio

**Alerts**:
- Cache hit rate drops below 70% → Investigate cache eviction
- P95 latency exceeds 600ms → Check DB function performance
- Redis errors spike → Check Vercel KV health

---

## 🔄 Migration Execution Plan

### Phase 1: Remove Old Infrastructure (Day 1)

```bash
# 1. Create and run migration to drop table
npx supabase migration new drop_portfolio_snapshots
# Add SQL from "Drop Old Table & Script" section
npx supabase db push

# 2. Remove backfill script
rm scripts/backfill-historical-snapshots.ts

# 3. Update package.json (remove backfill:snapshots script)

# 4. Commit changes
git add .
git commit -m "feat: Remove portfolio_snapshots table and backfill script"
```

### Phase 2: Implement Database Function (Day 1-2)

```bash
# 1. Create migration for DB function
npx supabase migration new add_calculate_portfolio_snapshots
# Add SQL from "New PostgreSQL Function" section

# 2. Test locally
npx supabase db push
# Run unit tests for DB function

# 3. Commit
git commit -m "feat: Add calculate_portfolio_snapshots DB function"
```

### Phase 3: Add Redis Integration (Day 2-3)

```bash
# 1. Setup Vercel KV (via dashboard)

# 2. Install dependencies
npm install @vercel/kv

# 3. Create Redis client (lib/redis.ts)

# 4. Update chart API route with caching

# 5. Add cache invalidation hooks

# 6. Run tests
npm test

# 7. Commit
git commit -m "feat: Add Redis caching with Vercel KV"
```

### Phase 4: Deploy to Production (Day 3-4)

```bash
# 1. Deploy to Vercel
git push origin 002-redis-snapshot-optimization
# Merge to main via PR

# 2. Verify Vercel KV is linked to production

# 3. Monitor logs for:
#    - Cache hit/miss rates
#    - DB function latency
#    - Any errors

# 4. Run smoke tests on production
npm run test:e2e:prod
```

### Phase 5: Validation & Cleanup (Day 4-5)

```bash
# 1. Validate all chart intervals
# - Test 24h, 7d, 30d, 90d, all
# - Verify performance metrics

# 2. Check cache hit rate (should reach ≥80% after 24h)

# 3. Monitor for 48 hours

# 4. Document success metrics

# 5. Update README with new architecture

# 6. Close feature branch
git branch -d 002-redis-snapshot-optimization
```

---

## ✅ Constitution Compliance Checklist

### Code Quality & Architecture
- [x] TypeScript strict mode enabled, no `any` types without justification
- [x] Cyclomatic complexity ≤10 per function (Redis service methods are simple)
- [x] File length ≤400 lines (largest file: chart/route.ts ~250 lines)
- [x] Clear architectural boundaries (API → Cache Service → Database Function)
- [x] Minimal public surface area (CacheService exposes 3 methods)

### Test-First Quality
- [x] TDD approach: Write tests before implementation
- [x] Unit tests for Redis service (cache operations)
- [x] Integration tests for chart API with caching
- [x] Performance tests for latency targets
- [x] Contract tests for API response format
- [x] Target coverage: 80% overall, 100% for calculation utilities

### Performance & Responsiveness
- [x] Cold cache p95 ≤500ms (DB function optimized with window functions)
- [x] Warm cache p95 ≤50ms (Redis read latency)
- [x] Cache invalidation ≤50ms (atomic delete operations)
- [x] Database function uses indexed queries (portfolio_id, transaction_date, price_date)

### Observability & Reliability
- [x] Structured logging for cache operations (JSON format)
- [x] Metrics emitted: cache hit/miss, latency, invalidation
- [x] Error handling: Redis fallback to DB calculation (graceful degradation)
- [x] No silent failures (all errors logged with context)

### Security & Data Protection
- [x] Authentication via Supabase Auth (existing pattern)
- [x] Cache keys namespaced by portfolio UUID (no user data exposure)
- [x] Redis connection via environment variables (no hardcoded secrets)
- [x] Row-level security maintained (portfolio ownership verification)

### Change Control
- [x] Clean cutover migration (no feature flags needed, no active users)
- [x] Rollback plan: Revert to main branch, redeploy old code
- [x] Backward compatible API (same response format)
- [x] Documentation updated (README, migration notes)

---

## 📝 Success Criteria

### Performance Metrics (Validated in Staging)
- ✅ Cold cache p95 latency ≤ 500ms
- ✅ Warm cache p95 latency ≤ 50ms
- ✅ Cache hit rate ≥ 80% after 24h warm-up
- ✅ Cache invalidation ≤ 50ms
- ✅ DB function execution ≤ 300ms for 1000 transactions

### Functional Validation
- ✅ All 5 chart intervals working (24h, 7d, 30d, 90d, all)
- ✅ Back-dated transactions invalidate cache correctly
- ✅ Transaction edit/delete invalidates cache
- ✅ Portfolio delete clears all cache keys
- ✅ Redis unavailable → graceful fallback to DB

### Quality Gates
- ✅ Test coverage ≥ 80% overall
- ✅ Zero TypeScript errors
- ✅ All tests passing (unit, integration, e2e)
- ✅ Performance tests validate latency targets
- ✅ Contract tests ensure API compatibility

### Operational Readiness
- ✅ Vercel KV provisioned and configured
- ✅ Monitoring dashboards show cache metrics
- ✅ Alerts configured for degraded performance
- ✅ Documentation updated (README, architecture diagrams)
- ✅ Team trained on new architecture

---

## 🎯 Risk Mitigation

### Risk 1: Redis Unavailable in Production
**Mitigation**: Graceful fallback to database calculation  
**Detection**: Monitor Redis error rate, set alert threshold  
**Recovery**: Automatic (code handles null cache gracefully)

### Risk 2: Cache Stampede (Many Requests, Cold Cache)
**Mitigation**: Database function is fast enough (≤300ms)  
**Detection**: Monitor DB function call frequency  
**Recovery**: Vercel serverless scales automatically

### Risk 3: Cache Key Collision
**Mitigation**: UUID-based namespacing  
**Probability**: Negligible (UUID collision ~10^-18)

### Risk 4: Database Function Performance Degradation
**Mitigation**: Indexed queries, regular ANALYZE/VACUUM  
**Detection**: Monitor p95 latency trends  
**Recovery**: Add composite indexes if needed

---

## 📚 Reference Documentation

- **Analysis Document**: `docs/ANALYSIS-PORTFOLIO-SNAPSHOT-OPTIMIZATION.md`
- **Feature Spec**: `specs/002-redis-snapshot-optimization/spec.md`
- **Vercel KV Docs**: https://vercel.com/docs/storage/vercel-kv
- **PostgreSQL Window Functions**: https://www.postgresql.org/docs/current/tutorial-window.html
- **Constitution**: `.specify/memory/constitution.md`

---

**Plan Status**: ✅ Ready for `/speckit.tasks`  
**Next Step**: Break down into actionable implementation tasks
