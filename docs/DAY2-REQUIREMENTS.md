# Day 2 Requirements - Post-MVP Enhancements

**Last Updated**: 2025-01-05  
**Status**: Planned for post-MVP release

---

## Overview

This document tracks features and enhancements planned for **Day 2** (post-MVP) implementation. These are valuable improvements that are not critical for the initial MVP launch but should be prioritized in the first post-release sprint.

---

## 🎯 Day 2 Priority: Cryptocurrency Symbol Expansion

### D2-001: Expand Cryptocurrency Symbol Support from 7 to 30+

**Current State (MVP)**:
- 7 working symbols: BTC, ETH, USDT, BNB, SOL, USDC, XRP
- Limited by Moralis API free tier (ERC20-only on Ethereum)
- FR-009 partially met (7 symbols vs 30+ requirement)

**Day 2 Goal**:
- Support 30+ cryptocurrency symbols
- Full coverage of major cryptocurrencies, DeFi tokens, and popular altcoins
- Meet original FR-009 requirement completely

**Implementation Options**:

#### Option 1: CoinGecko API Integration (Recommended)
**Pros**:
- ✅ Free tier: 10-50 calls/minute
- ✅ Supports 10,000+ cryptocurrencies
- ✅ No chain limitations (aggregates from multiple sources)
- ✅ Simple REST API
- ✅ Reliable uptime and data quality

**Cons**:
- ⚠️ Rate limits on free tier (may need Pro for production: $129/mo)
- ⚠️ Requires new API client implementation

**Effort**: 1-2 days  
**Cost**: $0 (free tier sufficient for MVP traffic)

**Implementation Steps**:
1. Create `lib/coingecko.ts` API client
2. Add CoinGecko API key to environment variables
3. Update `app/api/prices/route.ts` to use CoinGecko for all symbols
4. Restore full 30-symbol list in `lib/constants.ts`
5. Update unit tests for expanded symbol coverage
6. Add error handling and fallback logic
7. Update documentation (spec.md, tasks.md)

**Reference Implementation**:
```typescript
// lib/coingecko.ts
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export async function getCoinPrices(symbols: string[]): Promise<PriceData[]> {
  const ids = symbols.map(s => symbolToCoingeckoId(s)).join(',');
  const response = await fetch(
    `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
  // ... parse and transform to PriceData format
}
```

#### Option 2: Moralis Pro Upgrade
**Pros**:
- ✅ Multi-chain support (Ethereum, Polygon, BSC, Avalanche, etc.)
- ✅ Higher rate limits (100k requests/month)
- ✅ Better token indexing
- ✅ Minimal code changes (same API structure)

**Cons**:
- 💰 $49/month ongoing cost
- ⚠️ Still limited to tokens with ERC20/BEP20 contracts

**Effort**: 0.5 days (just upgrade subscription)  
**Cost**: $49/month

#### Option 3: Hybrid Moralis + CoinGecko
**Pros**:
- ✅ Best of both worlds
- ✅ Redundancy/fallback capability
- ✅ Cost optimization (use free tiers first)

**Cons**:
- ⚠️ More complex implementation
- ⚠️ Increased maintenance burden

**Effort**: 2-3 days  
**Cost**: $0 (both free tiers)

**Recommended Approach**: **Option 1 (CoinGecko)** for Day 2
- Simple, free, and meets all requirements
- Can upgrade to Pro tier later if needed
- Allows quick restoration of 30+ symbol support

---

## Additional Day 2 Features

### D2-002: Portfolio Performance Charts Enhancement
**Description**: Add more advanced charting features to PortfolioValueChart (T090)
- Line chart + area chart toggle
- Candlestick view for individual assets
- Comparison mode (multiple portfolios)
- Export chart as PNG/CSV

**Depends On**: T090 (baseline chart implementation)  
**Effort**: 2-3 days  
**Priority**: Medium

### D2-003: Advanced Transaction Filters
**Description**: Expand transaction filtering beyond basic symbol + date range
- Filter by side (BUY/SELL)
- Filter by profit/loss status
- Amount range filters
- Multi-symbol selection
- Saved filter presets

**Depends On**: T092 (basic filters)  
**Effort**: 1-2 days  
**Priority**: Medium

### D2-004: Real-time WebSocket Price Updates
**Description**: Replace 30s polling with WebSocket price streams
- Instant price updates (no 30s delay)
- Reduced API usage and costs
- Better user experience for active traders

**Implementation**:
- Integrate WebSocket price feeds (Binance, CoinGecko WebSocket API)
- Update React Query to use WebSocket subscriptions
- Add connection status indicator

**Effort**: 3-4 days  
**Priority**: Low (Nice to have)

### D2-005: Price Alert Notifications
**Description**: Allow users to set price alerts for cryptocurrencies
- Target price alerts (notify when BTC > $50k)
- Percentage change alerts (notify when SOL moves ±10%)
- Email/push notification delivery
- Alert history tracking

**Effort**: 4-5 days  
**Priority**: Low

### D2-006: Multi-Currency Base Support
**Description**: Support base currencies beyond USD
- EUR, GBP, JPY, AUD, CAD base currencies
- Portfolio value displayed in selected base currency
- Conversion rate tracking
- User preference storage

**Effort**: 2-3 days  
**Priority**: Low

---

## Implementation Timeline

### Sprint 1 (Post-MVP) - Week 1
**Focus**: Critical feature parity and API improvements

| Day | Task | Effort | Owner |
|-----|------|--------|-------|
| Mon | D2-001: CoinGecko API integration | 1 day | TBD |
| Tue | D2-001: Symbol expansion testing | 0.5 day | TBD |
| Wed | D2-002: Chart enhancements (part 1) | 1 day | TBD |
| Thu | D2-002: Chart enhancements (part 2) | 1 day | TBD |
| Fri | D2-003: Advanced filters | 1 day | TBD |

### Sprint 2 (Post-MVP) - Week 2
**Focus**: Real-time features and polish

| Day | Task | Effort | Owner |
|-----|------|--------|-------|
| Mon | D2-004: WebSocket research & design | 0.5 day | TBD |
| Tue-Wed | D2-004: WebSocket implementation | 2 days | TBD |
| Thu | D2-004: Testing & optimization | 1 day | TBD |
| Fri | Buffer / Documentation | 1 day | TBD |

### Sprint 3+ (Future)
- D2-005: Price alerts (4-5 days)
- D2-006: Multi-currency support (2-3 days)
- Additional features based on user feedback

---

## Success Metrics

### D2-001: Symbol Expansion
- ✅ Support ≥30 cryptocurrency symbols
- ✅ All symbols return valid price data
- ✅ API response time <500ms for 30 symbols
- ✅ Zero errors in 24h monitoring period
- ✅ FR-009 fully satisfied

### D2-002: Chart Enhancements
- ✅ Chart render time <500ms per NFR-016
- ✅ Support all 5 time intervals (24h, 7d, 30d, 90d, all)
- ✅ Export functionality works in all browsers
- ✅ Responsive on mobile devices

### D2-003: Advanced Filters
- ✅ Filter response time <100ms
- ✅ Filters persist across page refreshes
- ✅ Multi-select works for ≥10 symbols
- ✅ Saved presets load correctly

### D2-004: WebSocket Updates
- ✅ Price updates <1s latency (vs 30s polling)
- ✅ Connection recovery within 5s
- ✅ Zero message loss during reconnection
- ✅ 50% reduction in API costs

---

## Migration Notes

### From Moralis to CoinGecko (D2-001)

**Breaking Changes**: None (internal API change only)

**Data Migration**: Not required (prices are real-time, no historical data stored)

**Rollback Plan**:
1. Keep Moralis integration in codebase
2. Add feature flag: `USE_COINGECKO=true/false`
3. Can switch back via environment variable
4. Monitor for 48h before removing Moralis code

**Testing Checklist**:
- [ ] All 30 symbols return valid prices
- [ ] 24h change percentages match market data
- [ ] PriceTicker auto-scroll works smoothly
- [ ] Stale detection triggers correctly
- [ ] Error handling gracefully degrades
- [ ] Rate limits don't cause failures
- [ ] E2E tests pass (dashboard-page.spec.ts)
- [ ] Contract tests pass (prices.test.ts)

---

## Dependencies & Risks

### D2-001 Risks
- **Risk**: CoinGecko rate limits exceeded  
  **Mitigation**: Implement caching layer (Redis), upgrade to Pro tier if needed

- **Risk**: CoinGecko API downtime  
  **Mitigation**: Keep Moralis as fallback, implement health check endpoint

- **Risk**: Symbol mapping issues (CoinGecko uses different IDs)  
  **Mitigation**: Create comprehensive symbol mapping table, add validation

### D2-004 Risks
- **Risk**: WebSocket connection instability  
  **Mitigation**: Implement exponential backoff, fallback to polling

- **Risk**: Increased server load from persistent connections  
  **Mitigation**: Connection pooling, auto-disconnect after 30min idle

---

## Documentation Updates Required

When implementing D2-001:
- [ ] Update `specs/001-MVP-features/spec.md` (remove limitation warning)
- [ ] Update `lib/constants.ts` (restore 30 symbols)
- [ ] Update `docs/MORALIS-API-LIMITATIONS.md` (mark as resolved)
- [ ] Create `docs/COINGECKO-INTEGRATION.md` (implementation guide)
- [ ] Update `README.md` (supported symbols list)
- [ ] Update `__tests__/unit/constants.test.ts` (30 symbol assertions)
- [ ] Update `docs/T089-COMPLETION-SUMMARY.md` (Day 2 enhancement completed)

---

## Reference Links

- [CoinGecko API Documentation](https://www.coingecko.com/en/api/documentation)
- [CoinGecko Pricing Plans](https://www.coingecko.com/en/api/pricing)
- [Moralis Pro Features](https://moralis.io/pricing/)
- [Original Requirement: FR-009](../specs/001-MVP-features/spec.md#functional-requirements)
- [API Limitation Analysis](./MORALIS-API-LIMITATIONS.md)

---

**Status**: 📋 **PLANNED**  
**Next Action**: Schedule D2-001 for Sprint 1 post-MVP  
**Owner**: TBD (assign during sprint planning)
