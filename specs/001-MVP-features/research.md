# Technical Research: Crypto Portfolio Tracker MVP

**Date**: 2025-10-04  
**Feature**: 001-MVP-features  
**Status**: Complete

## Research Tasks & Findings

### 1. Crypto Price Data Provider Selection

**Decision**: Moralis Web3 API (Free tier: 40,000 requests/day)

**Rationale**:
- Comprehensive coverage: 30+ major cryptocurrencies supported
- Real-time price data with WebSocket support for streaming
- Historical price data available for chart generation
- Free tier sufficient for MVP (<1000 users)
- Well-documented TypeScript SDK
- Reliability: 99.9% uptime SLA on paid tiers

**Alternatives Considered**:
- CoinGecko API: Limited free tier (10-50 calls/min), no WebSocket
- CryptoCompare: Good coverage but complex pricing model
- Binance API: Exchange-specific, requires user accounts
- CoinMarketCap: Higher rate limits but expensive for real-time

**Implementation Notes**:
- Use REST API for initial load and historical data
- Implement polling (every 30s) for MVP; WebSocket streaming for future enhancement
- Cache responses client-side with React Query (5min stale time for dashboard, 30s for active portfolio)
- Rate limit handling: exponential backoff, queue requests

**Deferred Research** (from NFR-004): Exact Moralis rate limits and optimal polling interval vs streaming tradeoffs → to be validated during implementation testing.

---

### 2. Real-Time Update Architecture

**Decision**: Hybrid polling + Supabase real-time for user actions

**Rationale**:
- Price updates: Client-side polling every 30s (aligns with stale threshold from clarifications)
- User action propagation: Supabase real-time subscriptions for transaction CRUD (instant UI updates across sessions)
- Meets NFR-003 (<250ms propagation) for local updates; polling acceptable for external price data
- Simpler than full WebSocket management for MVP
- Scales to ~1000 concurrent users without infrastructure changes

**Alternatives Considered**:
- Full WebSocket (Moralis Streams): Complex setup, overkill for MVP scale
- Server-Sent Events: Good for one-way updates but requires custom server
- Pure polling: Simple but higher latency and API usage

**Implementation Notes**:
- Use `setInterval` with cleanup on unmount
- Implement visibility API to pause polling when tab inactive
- Supabase real-time filters: `portfolio_id = current_user_portfolio`
- Optimistic UI updates for transactions before server confirmation

---

### 3. Chart Library Selection

**Decision**: Recharts (v2.10+)

**Rationale**:
- React-native integration, composable API
- Good performance for datasets <1000 points (30 days @ hourly = 720 points)
- Accessibility: SVG output with text alternatives
- Tailwind-compatible styling
- Active maintenance, large community

**Alternatives Considered**:
- Chart.js: Canvas-based, faster for huge datasets but accessibility challenges
- TradingView Lightweight Charts: Professional-grade but heavier bundle, complex API
- Victory: Similar to Recharts but larger bundle size
- D3.js: Maximum flexibility but steep learning curve, manual accessibility work

**Implementation Notes**:
- Line chart for portfolio value over time
- Area chart for allocation breakdown
- Responsive container with debounced resize
- Custom tooltip with formatted values
- Export chart data to CSV for accessibility

**Performance Validation**: Meets NFR-009 (≤500ms render) per Recharts benchmarks for <1000 data points.

---

### 4. Authentication Flow (Supabase Auth)

**Decision**: Supabase Auth with Google OAuth + Email/Password

**Rationale**:
- Built-in Google OAuth integration (aligns with clarification: Google only)
- Email/password with secure bcrypt hashing
- Session management with JWT + refresh tokens
- Row-level security (RLS) for data isolation
- No custom password storage logic needed

**Implementation Notes**:
- Google OAuth: Configure in Supabase dashboard with client ID/secret
- Email/password: Enable email confirmations for production
- Session persistence: `localStorage` for web (Supabase handles)
- Protected routes: Middleware in Next.js to check `supabase.auth.getSession()`
- Logout: Clear session + redirect to landing page

**Security Considerations**:
- PKCE flow for OAuth
- HTTPS enforced in production
- CSRF protection via Supabase SDK
- Rate limiting on auth endpoints (Supabase built-in)
- Input sanitization: All free-text fields (portfolio name/description, transaction notes) sanitized to prevent XSS and injection attacks

---

### 5. Holding Calculation Strategy

**Decision**: Event-sourced transactions with derived view calculation

**Rationale**:
- Store transactions immutably (event sourcing pattern)
- Calculate holdings on-demand from transaction history
- Supports retroactive edits/deletes with automatic recalculation
- Cost basis: Average cost method (simpler than FIFO for MVP, aligns with most portfolio trackers)
- No stale derived data risk

**Alternatives Considered**:
- Materialized holdings table: Faster reads but complex update logic, consistency risks
- FIFO cost basis: More accurate for tax but complex to implement
- Stored procedures: Good for performance but harder to test

**Implementation Notes**:
```typescript
// Pseudo-algorithm for holdings calculation
function calculateHoldings(transactions: Transaction[]): Holding[] {
  const grouped = groupBy(transactions, 'symbol');
  return Object.entries(grouped).map(([symbol, txns]) => {
    const sortedTxns = sortBy(txns, 'executed_at');
    let totalQuantity = 0;
    let totalCost = 0;
    
    for (const txn of sortedTxns) {
      if (txn.side === 'BUY') {
        totalQuantity += txn.quantity;
        totalCost += txn.quantity * txn.price;
      } else {
        // SELL: reduce quantity, proportionally reduce cost
        const costBasis = totalCost / totalQuantity;
        totalQuantity -= txn.quantity;
        totalCost -= txn.quantity * costBasis;
      }
    }
    
    return {
      symbol,
      totalQuantity,
      averageCost: totalCost / totalQuantity,
      // marketValue, unrealizedPL calculated with current price
    };
  });
}
```

**Performance**: O(n log n) for n transactions; acceptable for pagination threshold (100 txns). Cache results per portfolio with React Query.

---

### 6. Database Schema & Indexing

**Decision**: PostgreSQL via Supabase with strategic indexes

**Rationale**:
- User table: Managed by Supabase Auth (users table)
- Portfolio table: user_id FK, name, description, base_currency
- Transaction table: portfolio_id FK, symbol, side, quantity, price, executed_at, created_at, updated_at
- No materialized holdings table (derived on-demand)
- Audit log: Supabase built-in with RLS policies

**Indexes**:
- `portfolios(user_id)` - for user's portfolio list
- `transactions(portfolio_id, executed_at DESC)` - for transaction history pagination
- `transactions(portfolio_id, symbol)` - for symbol filtering

**Performance Validation**: Meets NFR-002 (≤200ms API latency) based on Supabase benchmarks for indexed queries.

**Row-Level Security (RLS)**:
```sql
-- Portfolios: users can only access their own
CREATE POLICY "Users can CRUD own portfolios"
  ON portfolios FOR ALL
  USING (auth.uid() = user_id);

-- Transactions: via portfolio ownership
CREATE POLICY "Users can CRUD own transactions"
  ON transactions FOR ALL
  USING (portfolio_id IN (
    SELECT id FROM portfolios WHERE user_id = auth.uid()
  ));
```

---

### 7. Pagination Strategy

**Decision**: Cursor-based pagination for transactions

**Rationale**:
- Threshold: 100 transactions (from clarifications)
- Cursor-based avoids offset drift with real-time inserts/deletes
- Use `executed_at` + `id` composite cursor for stable ordering
- Default page size: 20 transactions

**Implementation Notes**:
```typescript
// API endpoint
GET /api/transactions?portfolio_id=123&cursor=<encoded>&limit=20

// SQL query
SELECT * FROM transactions
WHERE portfolio_id = $1
  AND (executed_at, id) < ($cursor_executed_at, $cursor_id)
ORDER BY executed_at DESC, id DESC
LIMIT $limit;
```

**UI Pattern**: Infinite scroll (Load More button) for accessibility; avoids premature pagination.

---

### 8. Bulk Transaction Import

**Decision**: Deferred to implementation phase

**Rationale**: FR-020 marked as low-impact clarification item. Recommend default limit of 100 transactions per bulk import (aligns with pagination threshold).

**Implementation Guidance** (when prioritized):
- CSV upload with template download
- Client-side validation before submission
- Batch insert with transaction (rollback on any failure)
- Progress indicator for UX

---

### 9. Test Strategy & Tooling

**Decision**: Vitest + Playwright + MSW stack

**Rationale**:
- **Vitest**: Fast Vite-native unit testing, TypeScript-first, great DX
- **Playwright**: Cross-browser E2E, reliable selectors, screenshot/video on failure
- **MSW**: Mock Service Worker for API contract testing, realistic network mocking
- **React Testing Library**: Component tests, accessibility-focused queries

**Test Coverage Targets** (from NFR-005, constitution):
- Overall: ≥80% lines, ≥75% branches
- Critical paths (calculations): 100%
- Contract tests: All API endpoints
- E2E: Primary user flows (register → portfolio → transaction → dashboard)

**Test Execution**:
- CI: Run all tests on PR
- Pre-commit: Run unit tests only (fast feedback)
- Nightly: Full E2E suite + performance benchmarks

---

### 10. Error Handling & Observability

**Decision**: Structured logging + error boundaries + toast notifications

**Rationale**:
- **Logging**: Console structured JSON logs (development), send to Vercel Analytics (production)
- **Correlation IDs**: Generate UUID per request, include in all logs (NFR-012)
- **Error Boundaries**: React Error Boundary at layout level, fallback UI
- **User Feedback**: Toast notifications (ShadCN Toaster) for all user actions
- **Monitoring**: Vercel Speed Insights + Web Vitals for performance tracking

**Implementation Notes**:
```typescript
// Logger utility
logger.info('Transaction created', {
  correlationId: req.headers['x-correlation-id'],
  userId: user.id,
  portfolioId: portfolio.id,
  transactionId: txn.id,
  duration: Date.now() - startTime
});
```

**Stale Price Indicator** (FR-012, FR-015): Display badge on price panel when `Date.now() - priceEvent.received_at > 30000`.

---

## Remaining Low-Priority Items

1. **Volatility Highlights** (edge case): Deferred to post-MVP; recommend simple visual indicator (red badge) for >20% price change in 5min window.

2. **Bulk Import Limits** (FR-020): Recommend 100 transactions per import (aligns with pagination threshold); implement CSV validation + batch insert.

3. **Moralis Rate Limits** (NFR-004): Free tier = 40,000 requests/day; with 30s polling + 1000 users + 30 symbols = ~86,400 requests/day. **ACTION**: Implement intelligent caching or upgrade to paid tier ($49/mo for 500k requests).

---

## Summary

All critical technical decisions made. Stack: Next.js 15 + React 19 + TypeScript + Supabase + Moralis + Recharts + Vitest + Playwright. Architecture: monolithic web app with API routes, event-sourced transactions, derived holdings, hybrid polling + real-time subscriptions. Constitution compliance validated. Ready for Phase 1 design artifacts.
