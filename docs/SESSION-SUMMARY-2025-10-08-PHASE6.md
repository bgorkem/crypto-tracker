# Session Summary: Phase 6 - Historical Price Tracking Added to MVP

**Date**: 2025-10-08  
**Branch**: `001-MVP-features`  
**Status**: ✅ Specification Complete, Ready for Implementation

---

## What Happened

User correctly identified that we should add historical price tracking requirements to the existing **001-MVP-features** specification rather than creating a separate feature. The MVP is not finished yet, and this is a critical missing piece.

---

## Changes Made

### 1. Updated Feature Specification (`spec.md`)

**Added Requirements** (FR-016a to FR-016d):
- **FR-016a**: System MUST store daily historical cryptocurrency prices for all supported symbols with date dimension
- **FR-016b**: System MUST calculate historical portfolio values using date-specific cryptocurrency prices (not current prices for all dates)
- **FR-016c**: System MUST support backfilling historical prices for existing portfolios created before historical price tracking was implemented
- **FR-016d**: System MUST generate daily portfolio value snapshots at midnight UTC using historical prices for accurate performance tracking

**Added Acceptance Scenarios**:
- **Scenario 13**: Historical chart displays portfolio values calculated with date-specific prices
- **Scenario 14**: Portfolios created before historical tracking show backfilled data

**Added Edge Cases**:
- Missing historical price data for specific date → use last available price before that date or display gap indicator
- Historical price API rate limit exceeded → queue requests and retry with exponential backoff
- Chart display with insufficient data points (< 2) → show "Insufficient data" message with guidance

### 2. Created Phase 6 Tasks (`tasks.md`)

**Added 11 New Tasks** (T098-T108):

#### Database & API Infrastructure
- **T098**: Database migration - Add `price_date` column to `price_cache` table
- **T099**: Create CoinGecko API client for historical prices
- **T100**: Contract test for `GET /api/prices/historical` (TDD Red)
- **T101**: Implement `GET /api/prices/historical` endpoint

#### Historical Value Calculation
- **T102**: Create `calculateHistoricalValue()` function in `lib/calculations.ts`
- **T103**: Unit test for historical value calculation (TDD Red)

#### Snapshot Generation & Backfill
- **T104**: Create backfill script (`scripts/backfill-historical-snapshots.ts`)
- **T105**: Create Supabase Edge Function for daily snapshots (`supabase/functions/daily-snapshot/`)

#### Chart Integration
- **T106**: Update chart API to use historical prices (remove synthetic data)
- **T107**: Integration test for historical price backfill and chart accuracy
- **T108**: Update documentation for historical price tracking

**Dependencies Graph Updated**: Added Phase 6 dependencies showing T098-T108 relationships

### 3. Updated Progress Tracking (`progress.md`)

**Added Phase 6 Section**:
- Status: 0/11 tasks (0%)
- Critical issue documented: Charts show flat lines at $0 because they use current prices for all dates
- Related documentation linked: `HISTORICAL-PRICE-RESEARCH.md`, `CHART-DISPLAY-FIX.md`

**Updated Summary**:
- Total tasks: 88 → 108 (20 new tasks added: 11 historical + 4 UI + 5 layout)
- Overall progress: 84/108 (78%)
- Estimated Phase 6 timeline: ~3 days (21 hours)

**Priority Order Updated**:
1. **CRITICAL**: Phase 6 (Historical Price Tracking) - fixes broken charts
2. **HIGH**: Complete remaining UI components
3. **OPTIONAL**: Bulk import features

### 4. Added Research Documentation

**File**: `docs/HISTORICAL-PRICE-RESEARCH.md`
- Comprehensive analysis of historical price API options
- CoinGecko API validation (FREE tier, 10-50 calls/min)
- Symbol mapping table (BTC→bitcoin, ETH→ethereum, etc.)
- Implementation strategy (backfill + daily snapshots)
- Cost analysis and rate limit considerations

---

## Critical Problem Identified

**Issue**: Portfolio charts currently display incorrectly
- Shows flat lines at $0 or current value
- No meaningful historical performance data

**Root Cause**: 
```typescript
// Current implementation (WRONG)
const { data: prices } = await supabase
  .from('price_cache')
  .select('symbol, price_usd')
  .in('symbol', symbols)  // ❌ No date filtering!
```

Portfolio values for ALL historical dates are calculated using TODAY's prices, which is incorrect.

**Example of Broken Behavior**:
- Portfolio created Oct 5 with 1 BTC @ $64,000
- Chart shows:
  - Oct 5: $124,773 (uses current price ❌)
  - Oct 6: $124,773 (uses current price ❌)
  - Oct 7: $124,773 (uses current price ❌)

**Correct Behavior Should Be**:
- Oct 5: 1 BTC × $64,500 (Oct 5 price) = $64,500 ✅
- Oct 6: 1 BTC × $65,200 (Oct 6 price) = $65,200 ✅
- Oct 7: 1 BTC × $124,773 (Oct 7 price) = $124,773 ✅

---

## Solution Architecture

### Phase 6 Implementation Plan

1. **Database Schema** (T098)
   ```sql
   ALTER TABLE price_cache ADD COLUMN price_date DATE NOT NULL;
   ALTER TABLE price_cache ADD PRIMARY KEY (symbol, price_date);
   CREATE INDEX idx_price_cache_date ON price_cache(price_date);
   ```

2. **CoinGecko API Client** (T099)
   - Endpoint: `https://api.coingecko.com/api/v3/coins/{coin_id}/history?date=DD-MM-YYYY`
   - Free tier: 10-50 calls/min (sufficient)
   - Symbol mapping: BTC→bitcoin, ETH→ethereum, SOL→solana, etc.

3. **Historical Price API** (T100-T101)
   ```typescript
   GET /api/prices/historical?symbols=BTC,ETH&date=2025-10-07
   // Returns: [{ symbol: 'BTC', price_usd: 124773.50, price_date: '2025-10-07' }]
   ```

4. **Historical Value Calculation** (T102-T103)
   ```typescript
   async function calculateHistoricalValue(portfolioId: string, date: Date): Promise<number> {
     // 1. Get transactions up to date
     // 2. Calculate holdings
     // 3. Fetch historical prices for that date
     // 4. Compute: Σ (quantity × historical_price)
   }
   ```

5. **Backfill & Daily Snapshots** (T104-T105)
   - One-time backfill: Fill historical data for existing portfolios
   - Daily Edge Function: Run at midnight UTC, fetch yesterday's prices, generate snapshots

6. **Chart Integration** (T106-T107)
   ```typescript
   // Replace synthetic data with real historical snapshots
   const snapshots = await supabase
     .from('portfolio_snapshots')
     .select('captured_at, total_value')
     .eq('portfolio_id', portfolioId)
     .gte('captured_at', startDate)
     .order('captured_at', { ascending: true })
   ```

---

## Validation & Testing Strategy

### TDD Approach (Tests Before Implementation)
- **T100**: Contract test for historical prices API (MUST FAIL initially)
- **T103**: Unit test for historical value calculation (MUST FAIL initially)
- **T107**: Integration test for entire historical price flow

### Test Coverage
- Unit tests: `calculateHistoricalValue()` function with edge cases
- Contract tests: Historical prices API endpoint validation
- Integration tests: Backfill → snapshots → chart display flow
- E2E tests: User views chart, sees accurate historical performance

---

## Technical Validation

### CoinGecko API Tested ✅
```bash
curl "https://api.coingecko.com/api/v3/coins/bitcoin/history?date=07-10-2025"
# Response: Bitcoin = $124,773.51 on Oct 7, 2025 ✅
```

### Rate Limits Analyzed ✅
- **Free Tier**: 10-50 calls/min
- **Daily Snapshot**: 7 symbols = 7 calls/day (well within limits)
- **Backfill**: 7 symbols × 30 days = 210 calls (~5 minutes to complete safely)

### Symbol Mapping Verified ✅
| Crypto | Moralis Symbol | CoinGecko ID |
|--------|---------------|--------------|
| Bitcoin | BTC | bitcoin |
| Ethereum | ETH | ethereum |
| Solana | SOL | solana |
| USD Coin | USDC | usd-coin |
| Tether | USDT | tether |
| Binance Coin | BNB | binancecoin |
| Ripple | XRP | ripple |

---

## Git History

**Commit**: `0baa841`
```
feat: Add historical price tracking to MVP feature spec (Phase 6)

- Added FR-016a to FR-016d for historical price requirements
- Added acceptance scenarios 13-14 for chart accuracy
- Added edge cases for missing data and rate limits
- Created T098-T108 tasks (11 new tasks for Phase 6)
- Updated progress.md with Phase 6 status (0/11 tasks)
- Added HISTORICAL-PRICE-RESEARCH.md with CoinGecko research

Total Tasks: 88 → 108 (20 new tasks added)
Overall Progress: 84/108 (78%)
```

**Files Changed**:
- `specs/001-MVP-features/spec.md` - Added FR-016a-d, scenarios, edge cases
- `specs/001-MVP-features/tasks.md` - Added T098-T108, updated dependencies
- `specs/001-MVP-features/progress.md` - Added Phase 6 section, updated summary
- `docs/HISTORICAL-PRICE-RESEARCH.md` - New file with CoinGecko research

**Branch**: `001-MVP-features` (pushed to origin)

---

## Next Steps

### Immediate Actions (When Resuming Work)

1. **Start Phase 6 Implementation** (T098-T108)
   ```bash
   # 1. Database migration
   npm run migration:create add_price_date
   
   # 2. CoinGecko client
   touch lib/coingecko.ts
   
   # 3. Contract test (TDD Red)
   touch __tests__/contract/prices-historical.test.ts
   npm test -- prices-historical  # Should FAIL
   
   # 4. Implement endpoint
   touch app/api/prices/historical/route.ts
   npm test -- prices-historical  # Should PASS
   ```

2. **Priority Order**:
   - Day 1: T098-T101 (Database + API infrastructure)
   - Day 2: T102-T105 (Calculations + Backfill + Daily function)
   - Day 3: T106-T108 (Chart integration + Tests + Docs)

3. **Success Criteria**:
   - ✅ Charts display real historical performance (not flat lines)
   - ✅ Portfolio created Oct 5 shows different values for Oct 5, 6, 7
   - ✅ Daily snapshots generated automatically at midnight UTC
   - ✅ Existing portfolios backfilled with historical data
   - ✅ All tests passing (contract, unit, integration)

---

## Key Decisions & Rationale

### Why Add to 001-MVP-features Instead of New Feature?

**User's Insight**: ✅ Correct decision
- MVP is not finished yet (78% complete)
- Historical price tracking is core to chart functionality (FR-016)
- Chart feature incomplete without accurate historical data
- Better to extend existing spec than fragment into multiple features

### Why CoinGecko Over Moralis?

**Research Findings**:
- Moralis: No free historical prices ❌
- CoinGecko: FREE historical data ✅
- CoinMarketCap: Limited free tier (30 days only)
- **Decision**: CoinGecko for backfill, Moralis for current prices

### Why Hybrid Approach (Backfill + Daily)?

**Strategy**:
1. **Phase 1**: CoinGecko backfill (one-time for existing portfolios)
2. **Phase 2**: Daily Moralis storage (ongoing, store with date)
3. **Phase 3**: Query historical prices by date from cache

**Benefits**:
- One-time CoinGecko usage for backfill (210 calls total)
- Ongoing daily storage from Moralis (7 calls/day)
- Build own historical dataset over time
- Reduce dependency on external APIs

---

## Lessons Learned

1. **Spec-Kit Process Correction**: User correctly stopped premature implementation
   - Agent was about to code CoinGecko integration without specification
   - Proper flow: Specify → Plan → Tasks → Implement
   - This session followed correct process ✅

2. **Feature Scope Management**: Add to existing feature when appropriate
   - Don't create new feature for incomplete existing work
   - MVP should be truly complete before moving on

3. **Research Before Specification**: Technical research completed first
   - CoinGecko API validated before adding to spec
   - Rate limits analyzed before committing to solution
   - Symbol mapping tested before implementation

4. **TDD Discipline**: Tests defined before implementation
   - T100: Contract test (historical prices API)
   - T103: Unit test (historical value calculation)
   - T107: Integration test (entire flow)
   - All marked to FAIL initially (TDD Red phase)

---

## Current State

### Branch Status
- **Branch**: `001-MVP-features`
- **Remote**: Pushed to `origin/001-MVP-features`
- **PR**: Can create PR to `main` when ready

### Feature Completion
- **Overall**: 84/108 tasks (78%)
- **Phase 1-5**: Mostly complete
- **Phase 6**: 0/11 tasks (ready to start)

### Critical Path
```
Phase 6 (Historical Prices) → Chart Fix → Feature Complete → Production Ready
```

---

## Summary

Successfully added **Phase 6: Historical Price Tracking** to the MVP feature specification with 11 new tasks (T098-T108). This phase will fix the critical chart display issue by implementing date-specific price tracking and historical portfolio value calculation.

**Key Achievement**: Followed Spec-Kit process correctly by specifying requirements and tasks before implementation.

**Ready for Next Session**: 
- Specification complete ✅
- Tasks defined with TDD approach ✅
- Research validated (CoinGecko API working) ✅
- Dependencies mapped ✅
- Timeline estimated (~3 days) ✅

**Next Action**: Start T098 (database migration) to begin Phase 6 implementation.
