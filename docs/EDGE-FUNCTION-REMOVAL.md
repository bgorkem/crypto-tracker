# Supabase Edge Function Removal

**Date**: 2025-01-11  
**Context**: Feature 002 Migration (Redis Snapshot Optimization)

---

## Summary

The Supabase Edge Function (`supabase/functions/daily-snapshot/`) has been **removed** as it is no longer needed after migrating to Redis-based caching in Feature 002.

---

## What Was Removed

### 1. Edge Function Code
- **Deleted**: `supabase/functions/daily-snapshot/index.ts`
- **Deleted**: `supabase/functions/_shared/coingecko.ts`
- **Purpose**: Generated daily portfolio snapshots at midnight UTC
- **Why Obsolete**: Portfolio snapshots now calculated on-demand with Redis caching

### 2. Related Database Infrastructure
- **Dropped Table**: `portfolio_snapshots` (via migration `20251010000001_drop_portfolio_snapshots.sql`)
- **Replaced With**: Database function `calculate_portfolio_snapshots()` + Redis cache

---

## Architecture Evolution

### Old Architecture (Feature 001)
```
┌─────────────────┐
│  Edge Function  │ (daily cron at midnight UTC)
│  daily-snapshot │
└────────┬────────┘
         │ writes
         ↓
┌─────────────────────┐
│ portfolio_snapshots │ (pre-calculated daily values)
│      (table)        │
└────────┬────────────┘
         │ reads
         ↓
┌─────────────────┐
│   Chart API     │
│  /api/.../chart │
└─────────────────┘
```

**Issues**:
- Required daily cron job maintenance
- Stored redundant data (snapshot table)
- Delayed data (only updated once per day)
- High storage overhead

### New Architecture (Feature 002)
```
┌─────────────────┐
│   Chart API     │
│  /api/.../chart │
└────────┬────────┘
         │
         ↓
┌─────────────────┐         ┌──────────────────┐
│  Redis Cache    │←────────│ Database Function│
│  (5-min TTL)    │         │ calculate_       │
└────────┬────────┘         │ portfolio_       │
         │                  │ snapshots()      │
         │                  └──────────────────┘
         ↓
┌─────────────────┐
│  API Response   │
│ (with cached_at)│
└─────────────────┘
```

**Benefits**:
- ✅ No cron job needed (serverless)
- ✅ On-demand calculation (always current)
- ✅ <50ms cached response time
- ✅ ~80% reduction in database load
- ✅ No storage overhead (5-min cache expiry)

---

## Migration Impact

### What Still Works
- ✅ All chart intervals (24h, 7d, 30d, 90d, all)
- ✅ Historical price tracking (via `price_cache` table)
- ✅ Transaction-based portfolio calculations
- ✅ All existing API endpoints

### What Changed
1. **Database Schema**:
   - Removed: `portfolio_snapshots` table
   - Added: `calculate_portfolio_snapshots()` function
   - Updated: `price_cache` with composite primary key `(symbol, price_date)`

2. **Chart API Behavior**:
   - Now returns `cached_at` timestamp in response
   - First request: ~500ms (uncached)
   - Subsequent requests: <50ms (cached)
   - Cache invalidated on transaction changes

3. **Deployment**:
   - No Edge Function deployment needed
   - No pg_cron scheduling required
   - Simpler Vercel deployment (fewer services)

---

## Documentation Updates

The following files have been updated to reflect the removal:

1. ✅ **specs/001-MVP-features/progress.md**
   - T105 marked as obsolete
   - Implementation summary updated

2. ✅ **specs/001-MVP-features/tasks.md**
   - T074 marked as deprecated with migration note

3. ✅ **README.md**
   - Already documented new architecture (no changes needed)

4. ✅ **docs/ARCHITECTURE.md**
   - Already documents Redis-based approach (no changes needed)

5. ✅ **Deleted**: `supabase/functions/` directory

---

## Developer Notes

### If You Need Historical Snapshots

The new architecture doesn't pre-generate snapshots, but you can still get historical data:

```typescript
// Call the chart API - it handles caching automatically
const response = await fetch(`/api/portfolios/${portfolioId}/chart?interval=30d`);
const data = await response.json();

// Response includes:
// - snapshots: Array of {date, value} points
// - cached_at: When this data was cached
// - interval: Requested interval
```

### Cache Invalidation

Cache is automatically invalidated when:
- Transaction added (POST `/api/portfolios/[id]/transactions`)
- Transaction updated (PATCH `/api/portfolios/[id]/transactions/[txId]`)
- Transaction deleted (DELETE `/api/portfolios/[id]/transactions/[txId]`)
- Portfolio deleted (DELETE `/api/portfolios/[id]`)

### Monitoring

Check Redis cache performance in Vercel logs:
```
[chart-api] Cache hit for portfolio abc123, interval 30d
[chart-api] Cache miss for portfolio def456, interval 7d - calculating...
```

Target metrics:
- Cache hit rate: ≥80%
- Cached response: <50ms
- Uncached response: <500ms

---

## Related Documentation

- Feature 002 Spec: `specs/002-redis-snapshot-optimization/spec.md`
- Architecture Guide: `docs/ARCHITECTURE.md`
- Migration Status: `docs/FEATURE-STATUS-002-REDIS.md`
- Redis Verification: `docs/T037-REDIS-VERIFICATION.md`

---

## Questions?

If you have questions about this migration or need to restore snapshot functionality, refer to:
1. Feature 002 implementation plan
2. Git history (Edge Function code preserved in commit history)
3. Redis cache implementation in `lib/redis.ts`
