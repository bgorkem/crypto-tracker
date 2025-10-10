# Portfolio Snapshot Optimization Analysis

**Date**: 2025-10-10  
**Status**: Analysis Complete (REVISED - Redis Cache-Only)  
**Context**: Evaluating architectural approaches for portfolio historical value tracking  
**Current Issue**: Backfill script takes ~30 minutes for all portfolios  
**Decision**: **Redis Cache-Only** (user feedback incorporated)

---

## 🎯 Executive Summary

This analysis compares the **current approach** (persistent `portfolio_snapshots` table with batch backfill) versus **Redis cache-only with on-demand calculation** for portfolio historical value tracking.

**User Insight**: Hybrid persistence adds unnecessary complexity because inactive user snapshots become stale anyway (new daily prices arrive), requiring recalculation regardless.

**Recommendation**: **Redis Cache-Only** - Simple, fast, reliable, and self-healing.

---

## 📋 Business Requirements Context

### Key Requirements from Spec (FR-016 series)

1. **FR-016**: Display portfolio value over time with 5 intervals (24h, 7d, 30d, 90d, All Time)
2. **FR-016a**: Store daily historical cryptocurrency prices (date dimension)
3. **FR-016b**: Calculate historical portfolio values using **date-specific prices** (not current prices)
4. **FR-016c**: Support backfilling for portfolios created before historical tracking
5. **FR-016d**: Generate daily snapshots at midnight UTC for accurate performance tracking

### Critical Business Behaviors

✅ **Users can add back-dated transactions at any time**
- When a back-dated transaction is added, ALL snapshots from that date forward are invalidated
- Example: Adding a BTC purchase dated "2024-01-15" invalidates all snapshots >= 2024-01-15

✅ **Inactive users shouldn't consume resources**
- Users who don't log in for weeks/months shouldn't trigger daily snapshot generation
- Resources allocated only when value is consumed (dashboard viewed)

✅ **Active users expect instant dashboard load**
- NFR-001: Dashboard interactive load ≤ 2s
- NFR-009: Chart renders in ≤ 500ms after data retrieval

---

## 🏗️ Current Approach Analysis

### Architecture: Persistent `portfolio_snapshots` Table

```sql
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  total_value NUMERIC(20, 2) NOT NULL,
  total_cost NUMERIC(20, 2) NOT NULL,
  total_pl NUMERIC(20, 2) NOT NULL,
  total_pl_pct NUMERIC(10, 2) NOT NULL,
  holdings_count INTEGER NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_portfolio_date 
  ON portfolio_snapshots(portfolio_id, snapshot_date DESC);
```

### Current Backfill Script Flow

**For each portfolio** (sequential):
```
1. Fetch existing snapshots (1 query)
2. Determine date range (earliest transaction → today)
3. FOR EACH DAY in range:
   a. Check if snapshot exists (in-memory Set)
   b. Fetch transactions up to date (1 query per day)
   c. Fetch prices for date (1 query per day)
   d. Calculate holdings + portfolio value (in-memory)
   e. Build snapshot object (in-memory)
4. Bulk insert all snapshots (1 query)
```

### Performance Problems

**N+1 Query Explosion**:
- 10 portfolios × 365 days = 3,650 days to process
- 2 queries per day × 3,650 days = **7,300 queries**
- At 50-150ms per query = **6-18 minutes minimum**
- Your actual: **30 minutes** (suggests network latency, RLS overhead, or more portfolios)

**Resource Waste**:
- Calculates snapshots for ALL users (active + inactive)
- Recalculates entire history on backfill (even unchanged periods)
- No incremental update mechanism

**Invalidation Complexity**:
- Back-dated transaction invalidates all snapshots >= transaction_date
- Current script has no "partial update" logic
- Must delete + regenerate all affected snapshots

### Advantages

✅ **Fast reads**: Chart query is a simple indexed SELECT  
✅ **Consistent data**: All users see same snapshot values  
✅ **Audit trail**: Historical snapshots are immutable records  
✅ **Predictable performance**: Read latency is constant  

### Disadvantages

❌ **Slow writes**: 30-minute backfill for all portfolios  
❌ **Storage overhead**: 365 days × N portfolios × 8 columns  
❌ **Wasted computation**: Inactive users consume resources  
❌ **Invalidation complexity**: Back-dated transactions require mass deletion  
❌ **Staleness risk**: Snapshots can be out-of-sync with transactions  

---

## 🚀 Proposed Approach: Lazy-Load with Intelligent Caching

### Architecture: On-Demand Calculation + Cache Layer

**Option A: Materialized View** (PostgreSQL)
```sql
CREATE MATERIALIZED VIEW portfolio_value_history AS
WITH date_series AS (
  SELECT 
    p.id AS portfolio_id,
    generate_series(
      (SELECT MIN(transaction_date)::date FROM transactions WHERE portfolio_id = p.id),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS snapshot_date
  FROM portfolios p
),
cumulative_holdings AS (
  SELECT 
    ds.portfolio_id,
    ds.snapshot_date,
    t.symbol,
    SUM(
      CASE 
        WHEN t.type = 'BUY' THEN t.quantity 
        ELSE -t.quantity 
      END
    ) OVER (
      PARTITION BY ds.portfolio_id, t.symbol 
      ORDER BY ds.snapshot_date
    ) AS quantity,
    SUM(
      CASE 
        WHEN t.type = 'BUY' THEN t.quantity * t.price_per_unit
        ELSE -t.quantity * t.price_per_unit
      END
    ) OVER (
      PARTITION BY ds.portfolio_id, t.symbol 
      ORDER BY ds.snapshot_date
    ) AS total_cost
  FROM date_series ds
  LEFT JOIN transactions t 
    ON t.portfolio_id = ds.portfolio_id 
    AND t.transaction_date::date <= ds.snapshot_date
)
SELECT 
  ch.portfolio_id,
  ch.snapshot_date,
  SUM(ch.quantity * pc.price_usd) AS total_value,
  SUM(ch.total_cost) AS total_cost,
  SUM(ch.quantity * pc.price_usd - ch.total_cost) AS total_pl,
  CASE 
    WHEN SUM(ch.total_cost) > 0 
    THEN ((SUM(ch.quantity * pc.price_usd) - SUM(ch.total_cost)) / SUM(ch.total_cost)) * 100
    ELSE 0 
  END AS total_pl_pct
FROM cumulative_holdings ch
JOIN price_cache pc ON pc.symbol = ch.symbol AND pc.price_date = ch.snapshot_date
WHERE ch.quantity > 0
GROUP BY ch.portfolio_id, ch.snapshot_date;

-- Refresh strategy: CONCURRENTLY for zero downtime
CREATE INDEX idx_mv_portfolio_date ON portfolio_value_history(portfolio_id, snapshot_date DESC);
```

**Refresh Triggers**:
```sql
-- Refresh on transaction changes
CREATE OR REPLACE FUNCTION refresh_portfolio_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_value_history;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_portfolio_snapshots();
```

**Option B: Application-Level Cache** (Redis/PostgreSQL)
```typescript
interface CacheEntry {
  portfolio_id: string;
  calculated_at: Date;
  valid_until: Date; // Latest transaction date + 1 day
  snapshots: SnapshotData[];
}

async function getPortfolioChart(portfolioId: string, interval: Interval) {
  // 1. Check cache validity
  const cache = await redis.get(`chart:${portfolioId}`);
  const latestTx = await getLatestTransactionDate(portfolioId);
  
  if (cache && cache.valid_until >= latestTx) {
    return filterByInterval(cache.snapshots, interval);
  }
  
  // 2. Calculate on-demand using database-side SQL
  const snapshots = await calculateSnapshotsInDB(portfolioId);
  
  // 3. Cache with expiry based on transaction activity
  await redis.set(
    `chart:${portfolioId}`, 
    { ...snapshots, valid_until: latestTx },
    { ex: 86400 } // 24 hours
  );
  
  return filterByInterval(snapshots, interval);
}
```

### Database-Side Calculation Function (Best Performance)

```sql
CREATE OR REPLACE FUNCTION calculate_portfolio_snapshots(
  p_portfolio_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  snapshot_date DATE,
  total_value NUMERIC,
  total_cost NUMERIC,
  total_pl NUMERIC,
  total_pl_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      COALESCE(
        p_start_date, 
        (SELECT MIN(transaction_date)::date FROM transactions WHERE portfolio_id = p_portfolio_id)
      ),
      p_end_date,
      '1 day'::interval
    )::date AS snapshot_date
  ),
  cumulative_holdings AS (
    SELECT 
      ds.snapshot_date,
      t.symbol,
      SUM(
        CASE WHEN t.type = 'BUY' THEN t.quantity ELSE -t.quantity END
      ) OVER (PARTITION BY t.symbol ORDER BY ds.snapshot_date) AS quantity,
      SUM(
        CASE 
          WHEN t.type = 'BUY' THEN t.quantity * t.price_per_unit
          ELSE -t.quantity * t.price_per_unit
        END
      ) OVER (PARTITION BY t.symbol ORDER BY ds.snapshot_date) AS cost
    FROM date_series ds
    LEFT JOIN transactions t 
      ON t.portfolio_id = p_portfolio_id 
      AND t.transaction_date::date <= ds.snapshot_date
  )
  SELECT 
    ch.snapshot_date,
    COALESCE(SUM(ch.quantity * pc.price_usd), 0) AS total_value,
    COALESCE(SUM(ch.cost), 0) AS total_cost,
    COALESCE(SUM(ch.quantity * pc.price_usd - ch.cost), 0) AS total_pl,
    CASE 
      WHEN SUM(ch.cost) > 0 
      THEN ((SUM(ch.quantity * pc.price_usd) - SUM(ch.cost)) / SUM(ch.cost)) * 100
      ELSE 0 
    END AS total_pl_pct
  FROM cumulative_holdings ch
  LEFT JOIN price_cache pc 
    ON pc.symbol = ch.symbol 
    AND pc.price_date = ch.snapshot_date
  WHERE ch.quantity > 0
  GROUP BY ch.snapshot_date
  ORDER BY ch.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

**API Endpoint Usage**:
```typescript
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: portfolioId } = await context.params;
  const { interval } = validateInterval(request);
  
  // Calculate date range
  const { startDate, endDate } = getDateRange(interval);
  
  // Single database call - calculated in PostgreSQL
  const { data: snapshots } = await supabase.rpc(
    'calculate_portfolio_snapshots',
    {
      p_portfolio_id: portfolioId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    }
  );
  
  return NextResponse.json({ data: { interval, snapshots } });
}
```

### Advantages of Lazy-Load Approach

✅ **No wasted computation**: Only calculate when user requests  
✅ **Automatic invalidation**: Stale on transaction change, recalc on next request  
✅ **Back-dated transactions**: Handled transparently (cache miss triggers recalc)  
✅ **Inactive users**: Zero resources consumed  
✅ **Simple logic**: No complex invalidation rules  
✅ **Database-side speed**: Single SQL query using window functions + indexes  
✅ **Horizontal scaling**: Stateless calculation, cache layer scales independently  

### Disadvantages of Lazy-Load Approach

❌ **First-load latency**: Initial chart load requires calculation (mitigated by DB function)  
❌ **Cache complexity**: Need Redis/PostgreSQL cache + invalidation logic  
❌ **Thundering herd**: Many users hitting uncached portfolios simultaneously  
❌ **No audit trail**: No permanent historical snapshot records  

---

## 🔄 Hybrid Approach (Recommended)

### Strategy: On-Demand + Smart Persistence

**Core Principles**:
1. **Calculate on first request** using database-side function (fast)
2. **Cache results** in Redis with transaction-aware expiry
3. **Persist snapshots** for portfolios viewed in last 7 days (scheduled job)
4. **Invalidate cache** on transaction insert/update/delete
5. **Lazy purge** snapshots for portfolios not viewed in 30 days

### Implementation Flow

```typescript
async function getPortfolioChart(portfolioId: string, interval: Interval) {
  const cacheKey = `chart:${portfolioId}:${interval}`;
  
  // 1. Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    await trackPortfolioAccess(portfolioId); // For persistence scheduling
    return JSON.parse(cached);
  }
  
  // 2. Check if persisted snapshots exist
  const { data: snapshots } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date, total_value')
    .eq('portfolio_id', portfolioId)
    .gte('snapshot_date', getStartDate(interval))
    .order('snapshot_date', { ascending: true });
  
  if (snapshots && snapshots.length > 0) {
    // Use persisted data
    await redis.set(cacheKey, JSON.stringify(snapshots), { ex: 3600 });
    await trackPortfolioAccess(portfolioId);
    return snapshots;
  }
  
  // 3. Calculate on-demand using DB function
  const calculated = await supabase.rpc('calculate_portfolio_snapshots', {
    p_portfolio_id: portfolioId,
    p_start_date: getStartDate(interval),
    p_end_date: new Date()
  });
  
  // 4. Cache result
  await redis.set(cacheKey, JSON.stringify(calculated.data), { ex: 3600 });
  
  // 5. Schedule persistence for active portfolios
  await scheduleSnapshotPersistence(portfolioId);
  
  return calculated.data;
}
```

### Scheduled Snapshot Persistence

```sql
-- Persist snapshots for portfolios accessed in last 7 days
CREATE OR REPLACE FUNCTION persist_active_portfolio_snapshots()
RETURNS void AS $$
DECLARE
  active_portfolio RECORD;
BEGIN
  FOR active_portfolio IN 
    SELECT DISTINCT portfolio_id 
    FROM portfolio_access_log 
    WHERE accessed_at >= NOW() - INTERVAL '7 days'
  LOOP
    -- Calculate and upsert snapshots
    INSERT INTO portfolio_snapshots (
      portfolio_id, snapshot_date, total_value, total_cost, total_pl, total_pl_pct, holdings_count
    )
    SELECT * FROM calculate_portfolio_snapshots(active_portfolio.portfolio_id)
    ON CONFLICT (portfolio_id, snapshot_date) 
    DO UPDATE SET
      total_value = EXCLUDED.total_value,
      total_cost = EXCLUDED.total_cost,
      total_pl = EXCLUDED.total_pl,
      total_pl_pct = EXCLUDED.total_pl_pct,
      holdings_count = EXCLUDED.holdings_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run daily at 1 AM UTC
-- Use pg_cron or external scheduler
```

### Cache Invalidation on Transaction Changes

```typescript
// Supabase Edge Function or Database Trigger
async function onTransactionChange(payload: TransactionPayload) {
  const { portfolio_id, transaction_date } = payload.record;
  
  // Invalidate all interval caches for this portfolio
  const intervals = ['24h', '7d', '30d', '90d', 'all'];
  await Promise.all(
    intervals.map(interval => 
      redis.del(`chart:${portfolio_id}:${interval}`)
    )
  );
  
  // Delete persisted snapshots >= transaction_date
  await supabase
    .from('portfolio_snapshots')
    .delete()
    .eq('portfolio_id', portfolio_id)
    .gte('snapshot_date', transaction_date);
}
```

---

## 📊 Comparison Matrix (REVISED)

| Criterion | Current (Persistent Table) | Redis Cache-Only (RECOMMENDED) | Hybrid (Rejected) |
|-----------|---------------------------|-------------------------------|-------------------|
| **First Load (Cold Cache)** | Fast (indexed SELECT) | Medium (DB function ~200ms) | Medium (DB function ~200ms) |
| **Subsequent Loads** | Fast (indexed SELECT) | **Very Fast (Redis ~15ms)** | Fast (Redis cache) |
| **Back-dated Transaction** | Slow (mass delete + recalc) | **Instant (cache clear)** | Fast (cache + delete) |
| **Inactive Users** | ❌ Wasted (daily snapshots) | ✅ Efficient (~25KB cache) | ⚠️ Wasted (stale snapshots) |
| **Active Users** | Efficient (pre-calculated) | **Very Efficient (cached)** | Complex (sync issues) |
| **Storage Cost** | ❌ High (all portfolios × 365 days) | ✅ **Very Low (25MB for 1000 portfolios)** | ⚠️ Medium + sync overhead |
| **Audit Trail** | Yes (immutable snapshots) | No (recalculable from transactions) | Yes (but stale) |
| **Complexity** | ⚠️ Medium (backfill script) | ✅ **Low (cache layer only)** | ❌ High (cache + DB + sync) |
| **Stale Data Risk** | ⚠️ Medium (backfill lag) | ✅ **None (invalidate on mutation)** | ❌ High (2+ days = stale) |
| **Failure Mode** | ⚠️ Backfill failure = no new data | ✅ **Graceful (falls back to DB)** | ❌ Cache/DB desync possible |
| **Scalability** | ❌ Poor (batch job bottleneck) | ✅ **Excellent (stateless)** | ⚠️ Complex (two systems) |
| **Dashboard Load (NFR-001)** | ✅ <2s | ✅ <2s | ✅ <2s |
| **Chart Render (NFR-009)** | ✅ <500ms | ✅ <500ms | ✅ <500ms |
| **Maintenance Burden** | ⚠️ Medium (backfill monitoring) | ✅ **Low (self-healing)** | ❌ High (two systems to monitor) |

### Winner: **Redis Cache-Only** ✅

**Why Hybrid Loses**:
1. ❌ Stale snapshots after 2 days of inactivity
2. ❌ Requires tracking "active" vs "inactive" portfolios
3. ❌ Two sources of truth = synchronization complexity
4. ❌ Background jobs = more infrastructure
5. ❌ No real benefit over cache-only approach

---

## 🎯 Recommendation: Redis Cache-Only (REVISED)

### User Feedback Analysis ✅

**Critical Insight**: The hybrid approach adds unnecessary complexity without real benefit.

**Problem with Hybrid**:
- ❌ If user inactive for 2+ days, persisted snapshots are stale anyway
- ❌ Still need to recalculate from scratch on next login
- ❌ Persistent snapshots become outdated immediately after new price data arrives
- ❌ Complexity of tracking "active" vs "inactive" portfolios not justified
- ❌ Two sources of truth (Redis + PostgreSQL) = synchronization headaches

**Why Redis-Only is Superior**:
- ✅ **Single source of truth**: Redis cache is always fresh or empty
- ✅ **Simple invalidation**: Clear cache on portfolio/transaction changes
- ✅ **Redis persistence**: Data survives restarts if configured properly
- ✅ **Stateless calculation**: Database function regenerates on cache miss
- ✅ **No synchronization**: No need to keep cache + DB snapshots aligned
- ✅ **Simpler code**: No tracking, no scheduling, no background jobs

### Revised Architecture: Pure Redis Cache + DB Function

**Cache Strategy**:
```typescript
// Single cache key per portfolio + interval
const cacheKey = `portfolio:${portfolioId}:chart:${interval}`;

// Cache invalidation triggers:
// 1. Transaction insert/update/delete for this portfolio
// 2. Portfolio update/delete
// 3. Manual cache clear (admin operation)

// TTL: None (infinite) - only invalidated by mutations
```

**Implementation Path** (Simplified):
1. **Phase 1** (Day 1): Implement database function for on-demand calculation
2. **Phase 2** (Day 2): Add Redis cache layer with mutation-based invalidation
3. **Phase 3** (Day 3): Update chart API to use cache-first pattern
4. **Phase 4** (Day 4): Remove backfill script, add monitoring

### Redis Configuration for Reliability

**Persistence Options** (Choose based on data criticality):

**Option 1: RDB Snapshots** (Good enough for chart data)
```redis
# Save to disk every 60 seconds if at least 1 key changed
save 60 1

# Background save on shutdown
stop-writes-on-bgsave-error yes
rdbcompression yes
```

**Option 2: AOF (Append-Only File)** (Better durability)
```redis
# Log every write operation
appendonly yes
appendfsync everysec  # Fsync every second (good balance)
```

**Option 3: Managed Redis** (Recommended for production)
- **Upstash** (serverless, auto-persistence)
- **Redis Cloud** (enterprise features)
- **AWS ElastiCache** (integrated with AWS)

**Why Chart Data is Cache-Friendly**:
- ✅ Recalculating from transactions is **deterministic** (same inputs = same outputs)
- ✅ Source of truth is still `transactions` + `price_cache` tables
- ✅ Worst case: Redis dies, next request triggers recalculation (~200ms)
- ✅ Chart data is not "critical" like user auth or transaction records

### Complete Implementation

```typescript
// app/api/portfolios/[id]/chart/route.ts

import { createClient } from 'redis';
import { createAuthenticatedClient } from '@/lib/supabase';

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redis.on('error', (err) => console.error('Redis error:', err));
await redis.connect();

type Interval = '24h' | '7d' | '30d' | '90d' | 'all';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: portfolioId } = await context.params;
  const { searchParams } = new URL(request.url);
  const interval = (searchParams.get('interval') || '30d') as Interval;
  
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { supabase, user } = await createAuthenticatedClient(token);
  
  // Verify portfolio ownership
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', portfolioId)
    .eq('user_id', user.id)
    .single();
    
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }
  
  // Try cache first
  const cacheKey = `portfolio:${portfolioId}:chart:${interval}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return NextResponse.json({ 
      data: JSON.parse(cached),
      cached: true 
    });
  }
  
  console.log(`[CACHE MISS] ${cacheKey} - Calculating...`);
  
  // Calculate using database function
  const { startDate, endDate } = getDateRange(interval);
  
  const { data: snapshots, error } = await supabase.rpc(
    'calculate_portfolio_snapshots',
    {
      p_portfolio_id: portfolioId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    }
  );
  
  if (error) {
    console.error('DB calculation error:', error);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
  
  // Fetch current value
  const currentValue = await fetchCurrentValue(supabase, portfolioId);
  
  // Build response
  const result = {
    interval,
    snapshots: snapshots.map(s => ({
      captured_at: s.snapshot_date,
      total_value: s.total_value
    })),
    current_value: currentValue,
    start_value: snapshots[0]?.total_value || 0,
    change_abs: currentValue - (snapshots[0]?.total_value || 0),
    change_pct: snapshots[0]?.total_value 
      ? ((currentValue - snapshots[0].total_value) / snapshots[0].total_value) * 100 
      : 0
  };
  
  // Cache result (no expiry - invalidate on mutations only)
  await redis.set(cacheKey, JSON.stringify(result));
  
  console.log(`[CACHED] ${cacheKey}`);
  
  return NextResponse.json({ data: result, cached: false });
}

function getDateRange(interval: Interval): { startDate: Date; endDate: Date } {
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
      startDate.setFullYear(2020, 0, 1); // Or earliest transaction
      break;
  }
  
  return { startDate, endDate };
}
```

### Cache Invalidation Strategy

**Trigger: Transaction Change** (Insert/Update/Delete)
```typescript
// app/api/portfolios/[portfolioId]/transactions/route.ts

export async function POST(request: NextRequest, context: { params: Promise<{ portfolioId: string }> }) {
  const { portfolioId } = await context.params;
  
  // ... create transaction ...
  
  // Invalidate all chart cache for this portfolio
  await invalidatePortfolioCache(portfolioId);
  
  return NextResponse.json({ data: transaction });
}

async function invalidatePortfolioCache(portfolioId: string) {
  const intervals: Interval[] = ['24h', '7d', '30d', '90d', 'all'];
  
  await Promise.all(
    intervals.map(interval => 
      redis.del(`portfolio:${portfolioId}:chart:${interval}`)
    )
  );
  
  console.log(`[CACHE INVALIDATED] portfolio:${portfolioId}:chart:*`);
}
```

**Trigger: Portfolio Delete**
```typescript
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: portfolioId } = await context.params;
  
  // ... delete portfolio ...
  
  // Clear all cache keys for this portfolio
  const pattern = `portfolio:${portfolioId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`[CACHE CLEARED] ${keys.length} keys for portfolio ${portfolioId}`);
  }
  
  return NextResponse.json({ success: true });
}
```

### Estimated Performance

**Cold Cache (First Load)**:
- Database function calculation: ~150-300ms
- Redis write: ~5ms
- **Total: ~200-350ms** ✅ Meets NFR-009 (<500ms)

**Warm Cache (Subsequent Loads)**:
- Redis read: ~5-10ms
- JSON parsing: ~5ms
- **Total: ~15ms** ✅ Far exceeds NFR-009

**Back-dated Transaction**:
- Cache invalidation (5 keys): ~25ms
- Next chart request recalculates: ~200ms
- **Total user impact: ~225ms** ✅ Acceptable

**Redis Failure (Worst Case)**:
- Falls back to database calculation
- Every request = ~200ms (still meets NFR-009)
- Degraded but functional

**Inactive Portfolio (90 days dormant)**:
- CPU: 0
- Memory: Redis holds ~5KB per interval × 5 = 25KB total
- Storage: ~25KB (negligible)
- **Total Cost: ~$0.0001/month** ✅ Acceptable overhead

### Why This Works Better

**Simplicity**:
- ❌ No scheduled jobs
- ❌ No "active portfolio" tracking
- ❌ No synchronization logic
- ❌ No background persistence
- ✅ Just: Cache → Miss → Calculate → Cache → Done

**Reliability**:
- Source of truth: `transactions` + `price_cache` tables
- Redis cache: Performance optimization only
- Failure mode: Graceful degradation (slower, but works)

**Data Freshness**:
- Cache invalidated on every mutation
- No stale data problem (unlike hybrid approach)
- New prices? Daily snapshots recalculated on next request

**Cost**:
- Redis memory: 5KB × 5 intervals × 1000 portfolios = 25MB
- Upstash free tier: 256MB (10x headroom)
- **Cost: $0** for MVP

---

## 🚧 Migration Path

### Step 1: Database Function (Non-Breaking Change)

```sql
-- Add the calculate_portfolio_snapshots function
-- No schema changes required
-- Existing snapshots table remains untouched
```

### Step 2: Update Chart API (Feature Flag)

```typescript
const USE_LAZY_LOAD = process.env.FEATURE_LAZY_SNAPSHOTS === 'true';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (USE_LAZY_LOAD) {
    return getPortfolioChartLazyLoad(request, context);
  } else {
    return getPortfolioChartPersistent(request, context); // Existing code
  }
}
```

### Step 3: Gradual Rollout

1. Enable for 10% of users (feature flag)
2. Monitor performance metrics (p50, p95, p99 latency)
3. Compare cache hit rates
4. Increase to 50% after 48 hours
5. Full rollout after 7 days

### Step 4: Deprecate Backfill Script

```bash
# Keep script for emergency backfill only
# Add warning banner
echo "⚠️  This script is deprecated. Use on-demand calculation instead."
echo "Only run if Redis cache is completely cleared."
```

---

## ✅ Acceptance Criteria for Redis Cache-Only Approach

### Performance
- [ ] Cold cache chart load ≤ 500ms (p95)
- [ ] Warm cache chart load ≤ 50ms (p95)
- [ ] Cache invalidation ≤ 50ms
- [ ] Dashboard interactive load ≤ 2s (NFR-001)

### Functionality
- [ ] All 5 intervals (24h, 7d, 30d, 90d, all) work correctly
- [ ] Back-dated transactions trigger cache invalidation
- [ ] Transaction update/delete triggers cache invalidation
- [ ] Portfolio delete clears all associated cache keys
- [ ] Cache miss triggers database calculation transparently

### Quality
- [ ] Redis cache hit rate ≥ 80% after warm-up
- [ ] Database function execution time ≤ 300ms (p95)
- [ ] No regression in existing chart functionality
- [ ] Graceful degradation if Redis is unavailable

### Operations
- [ ] Redis persistence enabled (RDB or AOF)
- [ ] Cache invalidation logs include portfolio ID
- [ ] Monitoring shows cache hit/miss rates
- [ ] No background jobs required
- [ ] No scheduled tasks required

---

## 📝 Open Questions for Specification Phase

1. **Redis Deployment**: ~~Self-hosted vs managed~~ **ANSWERED: Must use managed (Vercel = serverless)**
   - **Vercel KV** (recommended) - Zero config, built-in, serverless pricing
   - **Upstash Redis** (alternative) - Platform-agnostic, serverless-first
   - ❌ Self-hosted not possible on Vercel (serverless platform)
2. **Redis Persistence**: ~~RDB vs AOF~~ **ANSWERED: Managed services handle this**
   - Vercel KV: Auto-persisted by Upstash backend
   - Upstash: Automatic durability with replication
3. **Fallback Strategy**: If Redis is down, calculate on-demand or return cached error?
4. **Cache Key TTL**: Infinite (invalidate on mutation) or safety TTL (e.g., 7 days)?
5. **Monitoring**: Redis metrics (hit rate, latency) via Vercel Analytics or Upstash dashboard?
6. **Cache Warming**: Pre-warm cache for popular portfolios on deploy? Or lazy-load only?
7. **Multi-region**: Single Redis instance or replicated per region?

### Vercel Deployment Constraints ⚠️

**Critical Infrastructure Reality**:
- ❌ **Cannot run Redis on Vercel** - It's a serverless platform (functions, not long-running services)
- ✅ **Must use external managed Redis**:
  - **Vercel KV** (powered by Upstash) - Easiest, zero-config, serverless billing
  - **Upstash Redis** - Direct access, platform-agnostic
  - **Redis Cloud** - Requires connection pooling (complex for serverless)

**Recommended: Vercel KV**
```typescript
import { kv } from '@vercel/kv';

// Auto-configured via Vercel dashboard
const cached = await kv.get(`portfolio:${portfolioId}:chart:${interval}`);
await kv.set(`portfolio:${portfolioId}:chart:${interval}`, data);
```

**Free Tier**: 256MB storage + 10K requests/day = 10,000+ portfolios

---

## 🔧 Migration Path (Simplified)

### Step 1: Add Database Function (Non-Breaking)

```sql
-- Add calculate_portfolio_snapshots() function
-- No schema changes to existing tables
-- Existing portfolio_snapshots table remains (for now)
```

### Step 2: Add Redis Integration

```bash
# Option 1: Vercel KV (Recommended for Vercel deployment)
npm install @vercel/kv

# Then in Vercel dashboard:
# 1. Go to Storage tab
# 2. Click "Create Database" → "KV (Redis)"
# 3. Link to your project
# 4. Environment variables auto-injected

# Option 2: Upstash (Platform-agnostic alternative)
npm install @upstash/redis

# Environment variables (add in Vercel dashboard or .env.local)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

**Important**: Vercel is serverless, so **no self-hosted Redis possible**. Must use managed service.

### Step 3: Update Chart API with Feature Flag

```typescript
const USE_REDIS_CACHE = process.env.FEATURE_REDIS_CACHE === 'true';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (USE_REDIS_CACHE) {
    return getPortfolioChartCached(request, context);  // New Redis path
  } else {
    return getPortfolioChartPersistent(request, context);  // Old DB path
  }
}
```

### Step 4: Gradual Rollout

1. ✅ Enable for 10% of users (feature flag)
2. ✅ Monitor Redis hit rate, latency, errors
3. ✅ Compare with old approach metrics
4. ✅ Increase to 50% after 48 hours
5. ✅ Full rollout after 7 days
6. ✅ Deprecate `portfolio_snapshots` table (keep for 30 days as backup)
7. ✅ Remove backfill script

### Step 5: Cleanup (After 30 Days)

```sql
-- Drop old table once Redis approach is stable
DROP TABLE IF EXISTS portfolio_snapshots;

-- Remove old backfill script
rm scripts/backfill-historical-snapshots.ts
```

---

## 📚 References

- Current backfill script: `scripts/backfill-historical-snapshots.ts`
- Chart API endpoint: `app/api/portfolios/[id]/chart/route.ts`
- Database schema: `supabase/migrations/20240101000000_initial_schema.sql`
- Historical prices: `supabase/migrations/20251008000000_add_price_date.sql`
- Spec requirements: `specs/001-MVP-features/spec.md` (FR-016a-d)

---

## 🎉 Final Recommendation Summary

### ✅ Redis Cache-Only Approach

**Why This Wins**:
1. ✅ **Simplest possible architecture** - No background jobs, no tracking, no sync
2. ✅ **Always fresh or recalculated** - No stale data concerns
3. ✅ **Self-healing** - Cache miss = automatic recalculation
4. ✅ **Minimal infrastructure** - Just Redis + existing DB
5. ✅ **Low cost** - 25MB for 1000 portfolios (fits in free tier)
6. ✅ **Fast performance** - 15ms (cached) or 200ms (calculated)
7. ✅ **Zero maintenance** - No scheduled jobs to monitor
8. ✅ **Transparent to users** - Same API, better performance

**What Gets Removed**:
- ❌ `portfolio_snapshots` table (after migration)
- ❌ `backfill-historical-snapshots.ts` script
- ❌ Snapshot persistence logic
- ❌ Background jobs
- ❌ Active/inactive portfolio tracking

**What Gets Added**:
- ✅ PostgreSQL function `calculate_portfolio_snapshots()`
- ✅ Managed Redis cache layer (**Vercel KV** or **Upstash**)
- ✅ Cache invalidation on mutations
- ✅ Graceful fallback on Redis failure

**Infrastructure Note for Vercel**:
- ⚠️ Vercel is **serverless** - cannot run Redis as a service
- ✅ Must use external managed Redis: **Vercel KV** (easiest) or **Upstash**
- ✅ Free tier covers 10K+ portfolios (256MB storage)
- ✅ Serverless billing = pay only for requests (no idle costs)

**Key Insight from User**:
> "If a user is inactive for 2+ days, their persisted snapshots are stale anyway (new daily prices). We'd need to recalculate from scratch regardless. So why persist at all?"

**Answer**: We don't! Redis cache is reliable enough for chart data, and recalculation is fast enough (<500ms).

---

**Analysis Completed**: 2025-10-10  
**Analyst**: GitHub Copilot (with critical user feedback)  
**Status**: ✅ Ready for `/speckit.specify` when user decides to proceed  
**Approach**: **Redis Cache-Only** (Hybrid rejected due to unnecessary complexity)

