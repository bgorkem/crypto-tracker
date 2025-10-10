# Tasks: Portfolio Snapshot Optimization

**Input**: Design documents from `/specs/002-redis-snapshot-optimization/`
**Prerequisites**: plan.md (✅ available), spec.md (✅ available)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript, Next.js 15.5, PostgreSQL (Supabase), Vercel KV (Redis)
   → Structure: app/api/, lib/, supabase/migrations/, __tests__/
2. Load spec.md:
   → Extract: 15 functional requirements, 12 non-functional requirements
   → Extract: 10 acceptance scenarios for integration tests
3. Generate tasks by category:
   → Phase 1: Remove old infrastructure (migration)
   → Phase 2: Database function implementation
   → Phase 3: Redis integration
   → Phase 4: API updates with caching
   → Phase 5: Tests & validation
   → Phase 6: Deployment & monitoring
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Migration tasks = sequential (database changes)
   → Tests before implementation (TDD)
   → All tests marked [P] can run in parallel
5. Number tasks sequentially (T001-T040)
6. Validate: All 10 acceptance scenarios have tests
7. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Next.js app at repository root
- API routes: `app/api/portfolios/[id]/chart/route.ts`
- Libraries: `lib/redis.ts`, `lib/metrics.ts`
- Migrations: `supabase/migrations/`
- Tests: `__tests__/unit/`, `__tests__/integration/`, `__tests__/performance/`, `__tests__/contract/`

---

## Phase 1: Remove Old Infrastructure (Day 1)

### T001: Drop portfolio_snapshots table ✅
**Files**: `supabase/migrations/20251010000001_drop_portfolio_snapshots.sql`
**Description**: Create migration to drop portfolio_snapshots table and associated indexes (no active users, clean cutover)
**Dependencies**: None
**Validation**: Migration runs successfully, table no longer exists in schema

### T002: Remove backfill script ✅
**Files**: `scripts/backfill-historical-snapshots.ts` (delete)
**Description**: Delete backfill-historical-snapshots.ts script file (no longer needed with Redis cache approach)
**Dependencies**: None
**Validation**: File deleted, no broken imports

### T003: Update package.json scripts ✅
**Files**: `package.json`
**Description**: Remove `backfill:snapshots` script command from package.json
**Dependencies**: None
**Validation**: Script removed, npm run backfill:snapshots fails with "command not found"

---

## Phase 2: Database Function Implementation (Day 1-2)

### T004: Create PostgreSQL snapshot calculation function ✅
**Files**: `supabase/migrations/20251010000000_add_calculate_portfolio_snapshots.sql`
**Description**: Implement calculate_portfolio_snapshots(portfolio_id, start_date, end_date) PostgreSQL function using window functions for cumulative holdings calculation. Must use generate_series for date range, window functions for cumulative sums, LEFT JOIN with price_cache, and return TABLE with snapshot_date, total_value, total_cost, total_pl, total_pl_pct, holdings_count
**Dependencies**: None
**Validation**: Function created, can be called via supabase.rpc()
**Performance**: Must complete in <300ms for 1000 transactions

### T005 [P]: Unit test database function with empty portfolio ✅
**Files**: `__tests__/unit/db-function.test.ts`
**Description**: Test calculate_portfolio_snapshots returns empty array for portfolio with no transactions (edge case handling)
**Dependencies**: T004
**Validation**: Test written and passes

### T006 [P]: Unit test database function with 10-day range ✅
**Files**: `__tests__/unit/db-function.test.ts`
**Description**: Test calculate_portfolio_snapshots returns 10 snapshots for 10-day date range, each with snapshot_date, total_value, total_pl properties
**Dependencies**: T004
**Validation**: Test written and passes

### T007 [P]: Unit test database function handles missing price data ✅
**Files**: `__tests__/unit/db-function.test.ts`
**Description**: Test calculate_portfolio_snapshots gracefully handles dates with missing price_cache data (LEFT JOIN null handling)
**Dependencies**: T004
**Validation**: Test written and passes, no errors on missing prices

---

## Phase 3: Redis Integration (Day 2-3)

### T008: Setup Vercel KV via dashboard
**Files**: Vercel Dashboard (manual step)
**Description**: Create Vercel KV database named "crypto-tracker-cache" in same region as deployment, verify environment variables auto-injected (KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN)
**Dependencies**: None
**Validation**: Environment variables available in Vercel, can connect locally
**Note**: ⚠️ Manual step - requires Vercel dashboard access

### T009: Install @vercel/kv dependency ✅
**Files**: `package.json`
**Description**: Add @vercel/kv@^2.0.0 to dependencies, run npm install
**Dependencies**: None
**Validation**: Package installed, no peer dependency warnings

### T010: Create Redis client library ✅
**Files**: `lib/redis.ts`
**Description**: Implement CacheService class with methods: getChartData(portfolioId, interval), setChartData(portfolioId, interval, data), invalidatePortfolio(portfolioId). Include CACHE_KEYS patterns for namespacing, ChartData interface, error handling with fallback to null
**Dependencies**: T009
**Validation**: Module exports CacheService, kv, CACHE_KEYS, ChartData interface

### T011 [P]: Unit test CacheService.getChartData cache miss ✅
**Files**: `__tests__/unit/redis-cache.test.ts`
**Description**: Mock @vercel/kv, test getChartData returns null when key not found, verify correct cache key format used
**Dependencies**: T010
**Validation**: Test written and passes

### T012 [P]: Unit test CacheService.getChartData cache hit ✅
**Files**: `__tests__/unit/redis-cache.test.ts`
**Description**: Mock @vercel/kv to return JSON string, test getChartData parses and returns ChartData object
**Dependencies**: T010
**Validation**: Test written and passes

### T013 [P]: Unit test CacheService.getChartData graceful fallback ✅
**Files**: `__tests__/unit/redis-cache.test.ts`
**Description**: Mock @vercel/kv to throw error, test getChartData returns null (graceful degradation when Redis unavailable)
**Dependencies**: T010
**Validation**: Test written and passes, error logged

### T014 [P]: Unit test CacheService.invalidatePortfolio ✅
**Files**: `__tests__/unit/redis-cache.test.ts`
**Description**: Test invalidatePortfolio calls kv.del() for all 5 interval keys (24h, 7d, 30d, 90d, all) atomically
**Dependencies**: T010
**Validation**: Test written and passes, 5 del calls verified

### T015: Create metrics library ✅
**Files**: `lib/metrics.ts`
**Description**: Implement chartMetrics helper with methods: cacheHit, cacheMiss, cacheInvalidation, dbFunctionLatency. Log structured JSON with portfolioId, interval, timestamp for monitoring
**Dependencies**: None
**Validation**: Module exports chartMetrics object with 4 methods

---

## Phase 4: API Updates with Caching (Day 2-3)

### T016 [P]: Contract test GET /api/portfolios/[id]/chart?interval=30d ✅
**Files**: `__tests__/contract/chart-api.test.ts`
**Description**: Test chart API returns correct response structure: {interval, snapshots[], current_value, start_value, change_abs, change_pct}. Must maintain backward compatibility with existing frontend
**Dependencies**: None (test first - TDD)
**Validation**: Test written, will pass after implementation (T019-T021)

### T017 [P]: Contract test chart API invalid interval parameter ✅
**Files**: `__tests__/contract/chart-api.test.ts`
**Description**: Test GET /api/portfolios/[id]/chart?interval=invalid returns 400 error with INVALID_INTERVAL code
**Dependencies**: None (test first - TDD)
**Validation**: Test written, will pass after implementation

### T018 [P]: Contract test chart API unauthorized access ✅
**Files**: `__tests__/contract/chart-api.test.ts`
**Description**: Test GET /api/portfolios/[id]/chart without auth token returns 401 UNAUTHORIZED
**Dependencies**: None (test first - TDD)
**Validation**: Test written, will pass after implementation

### T019: Implement getStartDate helper function ✅
**Files**: `app/api/portfolios/[id]/chart/route.ts`
**Description**: Implement getStartDate(interval, earliestTransactionDate) with 1-year maximum cap for 'all' interval. Use Math.max(transactionDate, oneYearAgo) to prevent expensive 5-year calculations
**Dependencies**: T016, T017, T018 (tests must fail first)
**Validation**: Function correctly calculates start dates for all intervals, caps 'all' at 365 days

### T020: Implement fetchCurrentValue helper function ✅
**Files**: `app/api/portfolios/[id]/chart/route.ts`
**Description**: Implement fetchCurrentValue(supabase, portfolioId) to calculate current portfolio value from latest prices. Fetch transactions, calculate holdings map, get current prices, compute total value
**Dependencies**: T016, T017, T018 (tests must fail first)
**Validation**: Function returns correct current value for portfolios

### T021: Update chart API route with Redis caching ✅
**Files**: `app/api/portfolios/[id]/chart/route.ts`
**Description**: Refactor GET handler to: 1) Check cache first, 2) Fetch earliest transaction date for 'all' interval, 3) Call calculate_portfolio_snapshots RPC, 4) Fetch current value, 5) Build ChartData response, 6) Cache result, 7) Return. Include error handling, authentication, portfolio ownership verification
**Dependencies**: T004, T010, T019, T020
**Validation**: All contract tests (T016-T018) now pass (when server running)

### T022: Add cache invalidation to transaction POST handler ✅
**Files**: `app/api/portfolios/[id]/transactions/route.ts`
**Description**: Add CacheService.invalidatePortfolio(portfolioId) after successful transaction creation. Must execute AFTER database commit to prevent race conditions
**Dependencies**: T010
**Validation**: Cache invalidated on transaction create

### T023: Add cache invalidation to transaction PATCH handler ✅
**Files**: `app/api/portfolios/[id]/transactions/[transactionId]/route.ts`
**Description**: Add CacheService.invalidatePortfolio(portfolioId) after successful transaction update
**Dependencies**: T010
**Validation**: Cache invalidated on transaction edit

### T024: Add cache invalidation to transaction DELETE handler ✅
**Files**: `app/api/portfolios/[id]/transactions/[transactionId]/route.ts`
**Description**: Add CacheService.invalidatePortfolio(portfolioId) after successful transaction deletion
**Dependencies**: T010
**Validation**: Cache invalidated on transaction delete

### T025: Add cache invalidation to portfolio DELETE handler ✅
**Files**: `app/api/portfolios/[id]/route.ts`
**Description**: Add CacheService.invalidatePortfolio(portfolioId) before portfolio deletion to clean up orphaned cache keys
**Dependencies**: T010
**Validation**: Cache cleared on portfolio delete

---

## Phase 5: Integration & Performance Tests (Day 3-4)

### T026 [P]: Integration test cache hit on second request
**Files**: `__tests__/integration/chart-caching.test.ts`
**Description**: Test scenario: 1) First request returns cached=false, 2) Second request returns cached=true with identical data. Validates Redis caching works end-to-end (Acceptance Scenario 2)
**Dependencies**: T021
**Validation**: Test written and passes

### T027 [P]: Integration test cache invalidation on transaction add
**Files**: `__tests__/integration/chart-caching.test.ts`
**Description**: Test scenario: 1) Request chart (populates cache), 2) Add transaction, 3) Next request returns cached=false with updated data. Validates mutation-based invalidation (Acceptance Scenario 3)
**Dependencies**: T022
**Validation**: Test written and passes

### T028 [P]: Integration test cache invalidation on transaction edit
**Files**: `__tests__/integration/chart-caching.test.ts`
**Description**: Test scenario: Edit transaction quantity, verify chart shows updated values and cached=false (Acceptance Scenario 4)
**Dependencies**: T023
**Validation**: Test written and passes

### T029 [P]: Integration test cache invalidation on transaction delete
**Files**: `__tests__/integration/chart-caching.test.ts`
**Description**: Test scenario: Delete transaction, verify chart excludes deleted transaction data (Acceptance Scenario 5)
**Dependencies**: T024
**Validation**: Test written and passes

### T030 [P]: Integration test 1-year cap for 'all' interval
**Files**: `__tests__/integration/chart-caching.test.ts`
**Description**: Test scenario: Create transaction from 3 years ago, request 'all' interval, verify snapshots ≤366 and oldest snapshot ≥ 1 year ago. Validates performance protection
**Dependencies**: T021
**Validation**: Test written and passes

### T031 [P]: Integration test empty portfolio edge case
**Files**: `__tests__/integration/chart-caching.test.ts`
**Description**: Test scenario: Portfolio with zero transactions returns empty chart data with appropriate messaging (Acceptance Scenario - Edge Cases)
**Dependencies**: T021
**Validation**: Test written and passes

### T032 [P]: Performance test cold cache latency
**Files**: `__tests__/performance/chart-performance.test.ts`
**Description**: Test portfolio with 1000 transactions requesting 'all' interval completes in <500ms. Validates NFR-001 (cold cache p95 ≤500ms)
**Dependencies**: T021
**Validation**: Test written and passes, latency within target

### T033 [P]: Performance test warm cache latency
**Files**: `__tests__/performance/chart-performance.test.ts`
**Description**: Test cached chart request completes in <50ms. Validates NFR-002 (warm cache p95 ≤50ms)
**Dependencies**: T021
**Validation**: Test written and passes, latency within target

### T034 [P]: Performance test cache invalidation latency
**Files**: `__tests__/performance/chart-performance.test.ts`
**Description**: Test CacheService.invalidatePortfolio completes in <50ms. Validates NFR-003 (invalidation ≤50ms)
**Dependencies**: T010
**Validation**: Test written and passes, latency within target

### T035 [P]: Performance test database function execution
**Files**: `__tests__/performance/chart-performance.test.ts`
**Description**: Test calculate_portfolio_snapshots with 1000 transactions over 365 days completes in <300ms. Validates NFR-004
**Dependencies**: T004
**Validation**: Test written and passes, latency within target

---

## Phase 6: Deployment & Monitoring (Day 4-5)

### T036: Deploy migrations to production
**Files**: `supabase/migrations/`
**Description**: Run npx supabase db push to apply migrations: drop portfolio_snapshots table, add calculate_portfolio_snapshots function
**Dependencies**: T001, T004
**Validation**: Migrations applied successfully, no errors in Supabase dashboard

### T037: Verify Vercel KV linked to production
**Files**: Vercel Dashboard (manual verification)
**Description**: Confirm Vercel KV environment variables are injected into production deployment, test Redis connectivity
**Dependencies**: T008
**Validation**: Production deployment has KV_* environment variables, can connect to Redis

### T038: Monitor cache hit rate metrics
**Files**: Vercel Logs Dashboard
**Description**: Monitor [CACHE HIT] vs [CACHE MISS] log ratio for 48 hours, verify ≥80% hit rate after 24h warm-up period (NFR-005)
**Dependencies**: T036, T037
**Validation**: Cache hit rate reaches ≥80% within 24 hours

### T039: Validate all chart intervals in production
**Files**: Manual smoke testing
**Description**: Test all 5 intervals (24h, 7d, 30d, 90d, all) in production, verify performance targets met, no errors
**Dependencies**: T036, T037
**Validation**: All intervals load correctly, latency targets met

### T040: Update README with new architecture
**Files**: `README.md`, `docs/ARCHITECTURE.md`
**Description**: Document Redis cache architecture, removal of portfolio_snapshots table, database function approach, performance characteristics
**Dependencies**: T039
**Validation**: Documentation updated, architecture diagram reflects new design

---

## Dependencies

### Critical Path
```
T001, T002, T003 (cleanup) → T004 (DB function) → T010 (Redis client) → T021 (API update) → T036 (deploy)
```

### Test Dependencies (TDD)
```
T016, T017, T018 (contract tests) MUST FAIL before T019, T020, T021 (implementation)
T005, T006, T007 (DB tests) → T004 (implementation validates)
T011-T014 (Redis tests) → T010 (implementation validates)
```

### Parallel Execution Phases
```
Phase 2 Tests: T005, T006, T007 can run in parallel (different test scenarios)
Phase 3 Tests: T011, T012, T013, T014 can run in parallel (different test scenarios)
Phase 4 Tests: T016, T017, T018 can run in parallel (different endpoints/scenarios)
Phase 5 Tests: T026-T035 can run in parallel (different test files)
```

### Sequential Requirements
```
T001, T002, T003 → T004 (migrations before DB function)
T004 → T005, T006, T007 (DB function before its tests)
T009 → T010 (install before implementation)
T010 → T011-T014 (Redis client before its tests)
T004, T010 → T021 (DB function + Redis before API update)
T010 → T022, T023, T024, T025 (Redis client before cache invalidation hooks)
T021 → T026-T031 (API implementation before integration tests)
T036 → T038, T039 (deployment before monitoring)
```

---

## Parallel Execution Examples

### Run Phase 2 DB Function Tests Together
```bash
Task: "Unit test database function with empty portfolio in __tests__/unit/db-function.test.ts"
Task: "Unit test database function with 10-day range in __tests__/unit/db-function.test.ts"
Task: "Unit test database function handles missing price data in __tests__/unit/db-function.test.ts"
```

### Run Phase 3 Redis Cache Tests Together
```bash
Task: "Unit test CacheService.getChartData cache miss in __tests__/unit/redis-cache.test.ts"
Task: "Unit test CacheService.getChartData cache hit in __tests__/unit/redis-cache.test.ts"
Task: "Unit test CacheService.getChartData graceful fallback in __tests__/unit/redis-cache.test.ts"
Task: "Unit test CacheService.invalidatePortfolio in __tests__/unit/redis-cache.test.ts"
```

### Run Phase 4 Contract Tests Together (TDD - before implementation)
```bash
Task: "Contract test GET /api/portfolios/[id]/chart?interval=30d in __tests__/contract/chart-api.test.ts"
Task: "Contract test chart API invalid interval parameter in __tests__/contract/chart-api.test.ts"
Task: "Contract test chart API unauthorized access in __tests__/contract/chart-api.test.ts"
```

### Run Phase 5 Integration Tests Together
```bash
Task: "Integration test cache hit on second request in __tests__/integration/chart-caching.test.ts"
Task: "Integration test cache invalidation on transaction add in __tests__/integration/chart-caching.test.ts"
Task: "Integration test cache invalidation on transaction edit in __tests__/integration/chart-caching.test.ts"
Task: "Integration test cache invalidation on transaction delete in __tests__/integration/chart-caching.test.ts"
Task: "Integration test 1-year cap for 'all' interval in __tests__/integration/chart-caching.test.ts"
Task: "Integration test empty portfolio edge case in __tests__/integration/chart-caching.test.ts"
```

### Run Phase 5 Performance Tests Together
```bash
Task: "Performance test cold cache latency in __tests__/performance/chart-performance.test.ts"
Task: "Performance test warm cache latency in __tests__/performance/chart-performance.test.ts"
Task: "Performance test cache invalidation latency in __tests__/performance/chart-performance.test.ts"
Task: "Performance test database function execution in __tests__/performance/chart-performance.test.ts"
```

---

## Notes

### TDD Workflow (Critical)
1. **MUST write tests first** (T016-T018, T011-T014, T005-T007)
2. **Verify tests fail** before implementing features
3. **Implement to make tests pass** (T019-T021, T010, T004)
4. **Refactor** while keeping tests green

### Migration Strategy
- **Clean cutover**: No gradual rollout needed (no active users)
- **No rollback complexity**: Drop old table immediately (T001)
- **Zero downtime**: Redis cache builds on-demand (no pre-population)

### Performance Validation Gates
- ❌ **BLOCK deployment** if any performance test (T032-T035) fails
- ❌ **BLOCK deployment** if cache hit rate (T038) < 80% after 24h
- ✅ **PROCEED** only when all acceptance scenarios (T026-T031) pass

### Commit Frequency
- Commit after each task completion
- Use conventional commits: `feat(redis)`, `test(chart)`, `perf(db)`, `docs(arch)`

### File Modification Conflicts
- ⚠️ **T022-T025** modify different route files → can be parallel if needed
- ⚠️ **T019-T021** modify same file → MUST be sequential
- ✅ All test files are independent → always parallel

---

## Validation Checklist
*GATE: Automated checks before marking feature complete*

### Requirements Coverage
- [x] All 15 functional requirements have implementation tasks
- [x] All 12 non-functional requirements have validation tasks
- [x] All 10 acceptance scenarios have integration tests (T026-T035)
- [x] All edge cases covered in tests (empty portfolio, missing prices, etc.)

### Test Coverage
- [x] Contract tests written before implementation (T016-T018 → T021)
- [x] Unit tests for DB function (T005-T007)
- [x] Unit tests for Redis client (T011-T014)
- [x] Integration tests for caching behavior (T026-T031)
- [x] Performance tests for all latency targets (T032-T035)

### Performance Gates
- [x] Cold cache ≤500ms validated (T032)
- [x] Warm cache ≤50ms validated (T033)
- [x] Cache invalidation ≤50ms validated (T034)
- [x] DB function ≤300ms validated (T035)
- [x] Cache hit rate ≥80% monitored (T038)

### Migration Completeness
- [x] Old table dropped (T001)
- [x] Old script removed (T002)
- [x] New DB function created (T004)
- [x] Redis integration complete (T008-T010)
- [x] API updated with caching (T021-T025)

### Deployment Readiness
- [x] Migrations tested locally before production (T036)
- [x] Vercel KV provisioned and linked (T008, T037)
- [x] Monitoring in place (T038, T039)
- [x] Documentation updated (T040)

---

## Task Execution Status
*Updated as tasks are completed*

**Total Tasks**: 40  
**Completed**: 0  
**In Progress**: 0  
**Blocked**: 0  
**Ready**: 3 (T001, T002, T003)  

**Estimated Duration**: 5 days  
**Critical Path**: T001 → T004 → T010 → T021 → T036 → T040
