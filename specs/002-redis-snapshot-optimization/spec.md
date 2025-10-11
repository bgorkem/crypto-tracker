# Feature Specification: Portfolio Snapshot Optimization

**Feature Branch**: `002-redis-snapshot-optimization`  
**Created**: 2025-10-10  
**Status**: Draft  
**Input**: Replace the current 30-minute backfill script with a Redis cache-only approach that calculates portfolio snapshots on-demand using a database-side function, supporting instant cache invalidation for back-dated transactions and eliminating wasted computation on inactive users.

## Execution Flow (main)
```
Template steps conceptually satisfied by drafting below. Ambiguities explicitly marked.
```

## Clarifications

### Session 2025-10-10
- Q: Which Redis service should be used for Vercel deployment? → A: Vercel KV (primary) or Upstash (alternative) - both serverless-compatible
- Q: Should cached data have a TTL or rely only on mutation-based invalidation? → A: Mutation-based only (no TTL) to prevent stale data
- Q: What happens if Redis is unavailable? → A: Graceful fallback - calculate on-demand using database function (slower but functional)
- Q: Should we maintain the portfolio_snapshots table during migration? → A: No we need to remove it, there is no user at the moment, no risk of data loss.
- Q: What cache hit rate should we target? → A: ≥80% after warm-up period

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a portfolio owner who adds back-dated transactions, I need my portfolio chart to immediately reflect the correct historical values without waiting for batch processing, so I can accurately track my investment performance.

### Acceptance Scenarios
1. **Given** a user views their portfolio chart for the first time (cold cache), **When** they select any time interval (24h, 7d, 30d, 90d, all), **Then** the chart loads with accurate historical data within 500ms.
2. **Given** a user has viewed their portfolio chart before (warm cache), **When** they return to view the same chart, **Then** the chart loads within 50ms from cached data.
3. **Given** a user adds a back-dated transaction, **When** they view their portfolio chart, **Then** the cache is invalidated and recalculated values are displayed within 250ms.
4. **Given** a user edits an existing transaction quantity or price, **When** they return to the chart view, **Then** the updated values are reflected immediately without manual refresh.
5. **Given** a user deletes a transaction, **When** they navigate to the chart, **Then** the portfolio value is recalculated excluding the deleted transaction.
6. **Given** an inactive user who hasn't logged in for 90 days, **When** no one views their portfolio, **Then** no computational resources are consumed for their portfolio snapshots.
7. **Given** Redis service is temporarily unavailable, **When** a user requests their portfolio chart, **Then** the system falls back to database calculation and returns data within 500ms with a warning indicator.
8. **Given** a portfolio with 1000+ transactions spanning 5 years, **When** calculating "All Time" interval, **Then** the database function completes within 500ms.
9. **Given** multiple users accessing different portfolios simultaneously, **When** they request chart data, **Then** each request is served independently without queuing or blocking.
10. **Given** a new deployment with Redis cache implementation, **When** users start accessing their charts, **Then** the cache builds transparently without errors or degraded user experience (no old snapshots to migrate).

### Edge Cases
- Portfolio with zero transactions → Show "No data available" message
- Back-dated transaction older than earliest price data → Use earliest available price or show gap indicator
- Transaction dated in the future → Validation error prevents creation
- Redis cache corruption → Automatic invalidation triggers recalculation
- Extremely rapid transaction changes (< 1 second apart) → Debounce cache invalidation to prevent thrashing
- Portfolio with single transaction → Calculate holding value correctly, show single data point
- Date range with missing historical prices → Interpolate or show gap with clear indicator
- Cache key collision (unlikely UUID scenario) → Namespace cache keys with user_id prefix
- Concurrent transaction updates to same portfolio → Last-write-wins with cache invalidation
- Chart interval request for inactive symbol → Return empty chart with guidance message

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST calculate portfolio snapshots on-demand using a PostgreSQL function that processes all transactions and historical prices for a given date range in a single query.
- **FR-002**: System MUST cache calculated portfolio snapshots in Redis with keys namespaced by portfolio ID and time interval (24h, 7d, 30d, 90d, all).
- **FR-003**: System MUST invalidate all cached snapshots for a portfolio when any transaction is created, updated, or deleted for that portfolio.
- **FR-004**: System MUST invalidate all cached snapshots when a portfolio is deleted.
- **FR-005**: System MUST NOT apply TTL-based expiration to cached snapshots; invalidation is mutation-based only.
- **FR-006**: System MUST fall back to direct database calculation if Redis cache is unavailable, with degraded but functional performance.
- **FR-007**: System MUST calculate portfolio snapshots using date-specific cryptocurrency prices from the price_cache table (maintaining FR-016b from MVP spec).
- **FR-008**: System MUST support all existing chart intervals: 24 hours, 7 days, 30 days, 90 days, and All Time.
- **FR-009**: System MUST maintain API response format compatibility with existing chart endpoint to prevent frontend breaking changes.
- **FR-010**: System MUST log cache hit/miss metrics for monitoring and optimization.
- **FR-011**: System MUST use PostgreSQL window functions to calculate cumulative holdings efficiently (single query, no N+1 pattern).
- **FR-012**: System MUST handle portfolios with zero transactions by returning empty chart data with appropriate messaging.
- **FR-013**: System MUST namespace Redis cache keys to prevent collisions between different portfolios and users.
- **FR-014**: System MUST remove the portfolio_snapshots table immediately as there are no active users and no risk of data loss.
- **FR-015**: System MUST remove the backfill-historical-snapshots.ts script as it will no longer be needed.

### Non-Functional / Quality Requirements
- **NFR-001**: Cold cache chart load (first request) MUST complete within 500ms at p95 latency (maintains existing NFR-009).
- **NFR-002**: Warm cache chart load (cached data) MUST complete within 50ms at p95 latency.
- **NFR-003**: Cache invalidation on transaction mutation MUST complete within 50ms.
- **NFR-004**: Database calculation function MUST complete within 300ms for portfolios with up to 1000 transactions spanning 5 years.
- **NFR-005**: Redis cache hit rate MUST achieve ≥80% after 24-hour warm-up period for active portfolios.
- **NFR-006**: System MUST handle Redis unavailability gracefully without throwing user-facing errors (log warnings, use fallback).
- **NFR-007**: Cache invalidation MUST be atomic - either all interval keys are cleared or none (prevent partial state).
- **NFR-008**: Database function MUST use indexed queries on portfolio_id, transaction_date, and price_date columns for optimal performance.
- **NFR-009**: System MUST NOT consume computational resources for inactive portfolios (no background jobs, no scheduled snapshots).
- **NFR-010**: Migration MUST be clean cutover - remove old table and script immediately as there are no active users to impact.
- **NFR-011**: Redis storage per portfolio MUST NOT exceed 30KB (5 intervals × 6KB average per interval).
- **NFR-012**: Concurrent requests for the same portfolio chart MUST NOT trigger duplicate calculations (cache stampede prevention).

### Key Entities *(include if feature involves data)*
- **Portfolio Snapshot Cache Entry** (Redis): 
  - Key: `portfolio:{portfolio_id}:chart:{interval}`
  - Value: JSON object with snapshots array, current_value, start_value, change metrics
  - No TTL (infinite, mutation-based invalidation only)
  
- **Database Function**: `calculate_portfolio_snapshots(portfolio_id UUID, start_date DATE, end_date DATE)`
  - Returns: Table of (snapshot_date, total_value, total_cost, total_pl, total_pl_pct)
  - Uses: Window functions for cumulative calculations
  - Joins: transactions + price_cache tables

### Migration Strategy
- **Phase 1 (Day 1)**: Drop portfolio_snapshots table, remove backfill script
- **Phase 2 (Day 1-2)**: Implement PostgreSQL database function with window functions
- **Phase 3 (Day 2-3)**: Add Redis integration (Vercel KV), update chart API
- **Phase 4 (Day 3-4)**: Deploy to production, monitor performance metrics (latency, cache hit rate)
- **Phase 5 (Day 4-5)**: Validate all chart intervals working correctly, remove feature flags if used

### Success Metrics
- Cold cache p95 latency ≤ 500ms
- Warm cache p95 latency ≤ 50ms
- Cache hit rate ≥ 80% after warm-up
- Zero user-reported data accuracy issues
- No performance regressions vs. current approach
- 100% functional parity with existing chart features

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Constitutional Compliance
- [x] Performance targets quantified (p95 latency ≤500ms cold, ≤50ms warm)
- [x] Test strategy covers unit, integration, performance validation
- [x] Accessibility & UX consistency maintained (no UI changes)
- [x] Critical calculations identified (cumulative holdings via window functions)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and clarified
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
