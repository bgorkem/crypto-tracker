# Price Ticker Component Design Specification

**Component**: `components/dashboard/PriceTicker.tsx`  
**Task**: T089  
**Date**: 2025-01-05  
**Status**: Design Approved - Ready for Implementation

---

## Overview

Horizontal auto-scrolling ticker strip displaying live cryptocurrency prices for 30 fixed symbols, positioned at the top of the dashboard. Updates every 30 seconds with color-coded 24h price changes and stale data indicators.

---

## Supported Cryptocurrencies (30 Fixed Symbols)

### Top 10 by Market Cap (Essential)
1. **BTC** - Bitcoin
2. **ETH** - Ethereum
3. **USDT** - Tether
4. **BNB** - Binance Coin
5. **SOL** - Solana
6. **USDC** - USD Coin
7. **XRP** - Ripple
8. **ADA** - Cardano
9. **AVAX** - Avalanche
10. **DOGE** - Dogecoin

### DeFi & Layer 1 Protocols (10)
11. **DOT** - Polkadot
12. **MATIC** - Polygon
13. **LINK** - Chainlink
14. **UNI** - Uniswap
15. **ATOM** - Cosmos
16. **LTC** - Litecoin
17. **NEAR** - NEAR Protocol
18. **APT** - Aptos
19. **ARB** - Arbitrum
20. **OP** - Optimism

### Meme & Popular (5)
21. **SHIB** - Shiba Inu
22. **PEPE** - Pepe
23. **WIF** - dogwifhat
24. **BONK** - Bonk
25. **FLOKI** - Floki Inu

### Emerging & Infrastructure (5)
26. **SUI** - Sui
27. **SEI** - Sei
28. **INJ** - Injective
29. **TIA** - Celestia
30. **RUNE** - THORChain

---

## Visual Design

### Desktop View (1920px)
```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🪙 BTC $43,521 +2.3% │ ETH $2,234 -1.1% │ SOL $98.45 +5.2% │ BNB $312 +0.8% ... │
└────────────────────────────────────────────────────────────────────────────────┘
       ↑ Green             ↑ Red              ↑ Green            ↑ Green
```

### With Stale Data Indicator
```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🪙 BTC $43,521 +2.3% │ ETH $2,234 -1.1% ⚠️Stale │ SOL $98.45 +5.2% │ BNB ... │
└────────────────────────────────────────────────────────────────────────────────┘
       ↑ Green             ↑ Gray text + badge       ↑ Green
```

### Tablet View (768px)
```
┌──────────────────────────────────────────────────────┐
│  🪙 BTC $43,521 +2.3% │ ETH $2,234 -1.1% │ SOL ... │
└──────────────────────────────────────────────────────┘
```

### Mobile View (375px)
```
┌─────────────────────────────────┐
│  🪙 BTC $43,521 +2.3% │ ETH ... │
└─────────────────────────────────┘
```

---

## Color Scheme

| State | Text Color | Badge | Background |
|-------|-----------|--------|------------|
| **Positive (≥0%)** | `text-green-400` (#4ade80) | - | `bg-slate-900` |
| **Negative (<0%)** | `text-red-400` (#f87171) | - | `bg-slate-900` |
| **Stale (>30s)** | `text-gray-400` (#9ca3af) | `⚠️ Stale` (outline) | `bg-slate-900` |
| **Symbol** | `text-white` (semibold) | - | - |
| **Price** | `text-white` or gray (stale) | - | - |

---

## Behavior Specifications

### Auto-Scrolling Animation
- **Speed**: Complete cycle in 60 seconds
- **Direction**: Right to left (←)
- **Easing**: `linear` (constant speed)
- **Loop**: Infinite (seamless by duplicating content)
- **Pause**: On hover (`:hover { animation-play-state: paused }`)

### Data Refresh
- **Interval**: Every 30 seconds (React Query `refetchInterval: 30000`)
- **Stale Time**: 30 seconds (React Query `staleTime: 30000`)
- **Stale Detection**: `Date.now() - new Date(price.received_at).getTime() > 30000`
- **Loading State**: Skeleton with shimmer animation (first load only)

### User Interactions
1. **Hover**: Pause scrolling animation
2. **Click (optional)**: Open quick-add dialog to add symbol to portfolio (future enhancement)
3. **No scrollbar**: `overflow-x: hidden` on container

---

## Component Structure

```tsx
PriceTicker (Client Component)
├── useQuery('prices', 'ticker') ← Fetches all 30 symbols
├── Loading State → TickerSkeleton
├── Data State → ScrollingTicker
│   ├── Duplicated Price Array (for infinite scroll)
│   ├── Price Item × 60 (30 real + 30 duplicate)
│   │   ├── Symbol (white, semibold)
│   │   ├── Price (color-coded)
│   │   ├── 24h Change % (color-coded)
│   │   └── Stale Badge (conditional)
│   └── CSS Animation (ticker keyframe)
└── Error State → ErrorBanner
```

---

## Technical Implementation

### React Query Hook
```tsx
const { data, isLoading, isError } = useQuery({
  queryKey: ['prices', 'ticker'],
  queryFn: async () => {
    const symbols = SUPPORTED_SYMBOLS.join(',');
    const res = await fetch(`/api/prices?symbols=${symbols}`);
    if (!res.ok) throw new Error('Failed to fetch prices');
    return res.json();
  },
  staleTime: 30000,      // 30s per NFR-015
  refetchInterval: 30000, // Auto-refresh every 30s
  refetchOnWindowFocus: true,
});
```

### CSS Animation (Tailwind Config)
```css
/* tailwind.config.ts */
{
  theme: {
    extend: {
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        ticker: 'ticker 60s linear infinite',
      },
    },
  },
}
```

### Stale Detection Logic
```tsx
const now = Date.now();
const isStale = (price: PriceData) => {
  return now - new Date(price.received_at).getTime() > 30000;
};
```

---

## API Contract

### Request
```http
GET /api/prices?symbols=BTC,ETH,USDT,BNB,SOL,USDC,XRP,ADA,AVAX,DOGE,DOT,MATIC,LINK,UNI,ATOM,LTC,NEAR,APT,ARB,OP,SHIB,PEPE,WIF,BONK,FLOKI,SUI,SEI,INJ,TIA,RUNE
Authorization: Bearer {token}
```

### Response (200 OK)
```json
{
  "data": [
    {
      "symbol": "BTC",
      "price_usd": 43521.45,
      "change_24h_pct": 2.34,
      "received_at": "2025-01-05T14:30:00.000Z"
    },
    {
      "symbol": "ETH",
      "price_usd": 2234.12,
      "change_24h_pct": -1.12,
      "received_at": "2025-01-05T14:30:00.000Z"
    }
    // ... 28 more symbols
  ]
}
```

---

## Accessibility (NFR-006)

### ARIA Labels
```tsx
<div
  role="marquee"
  aria-label="Live cryptocurrency price ticker showing 30 symbols with 24-hour price changes"
  aria-live="polite"
  aria-atomic="false"
>
```

### Keyboard Navigation
- **Tab**: Skip to next interactive element (no focus on ticker items in MVP)
- **Pause Animation**: Automatic on hover (no keyboard needed)

### Screen Reader Support
- Announce new prices on update (via `aria-live="polite"`)
- Alternative: Provide static price table below for screen readers

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Paint** | ≤200ms | Skeleton shows immediately |
| **Data Fetch** | ≤500ms | API response time (p95) |
| **Animation FPS** | ≥60fps | CSS transform (GPU-accelerated) |
| **Update Latency** | ≤250ms | From API response to UI update (NFR-003) |
| **Re-render Cost** | ≤16ms | React re-render on data update |

---

## Edge Cases & Error Handling

### Scenario 1: API Timeout
- **Trigger**: `/api/prices` takes >5s to respond
- **Behavior**: Show previous cached data + "⚠️ Updating..." badge
- **Recovery**: Retry after 30s interval

### Scenario 2: Partial Data Failure (FR-021)
- **Trigger**: Moralis returns prices for only 25/30 symbols
- **Behavior**: Display available symbols, mark missing ones as "N/A"
- **Recovery**: Next refresh attempts to fetch missing symbols

### Scenario 3: All Symbols Stale
- **Trigger**: No price update for >60s
- **Behavior**: Global banner "⚠️ Price data unavailable. Last update: X mins ago"
- **Recovery**: Continue attempting refresh every 30s

### Scenario 4: User Offline
- **Trigger**: Network disconnected
- **Behavior**: React Query shows cached data + "Offline" indicator
- **Recovery**: Auto-reconnect on network restore

---

## Testing Strategy

### Unit Tests
```tsx
// __tests__/unit/PriceTicker.test.tsx
describe('PriceTicker', () => {
  it('displays all 30 symbols', () => {});
  it('color codes positive changes in green', () => {});
  it('color codes negative changes in red', () => {});
  it('shows stale badge when data >30s old', () => {});
  it('pauses animation on hover', () => {});
});
```

### Integration Tests
```tsx
// __tests__/integration/prices-ticker.test.ts
describe('PriceTicker Integration', () => {
  it('fetches prices from /api/prices endpoint', () => {});
  it('refreshes data every 30 seconds', () => {});
  it('handles API errors gracefully', () => {});
});
```

### E2E Tests (Playwright)
```tsx
// __tests__/e2e/realtime-updates.spec.ts (T034)
test('price ticker updates without page refresh', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Wait for initial prices
  await expect(page.locator('[role="marquee"]')).toBeVisible();
  
  // Capture initial BTC price
  const initialPrice = await page.locator('text=BTC').textContent();
  
  // Wait 31 seconds (trigger refresh)
  await page.waitForTimeout(31000);
  
  // Verify price updated (or stale badge appeared)
  const updatedPrice = await page.locator('text=BTC').textContent();
  expect(updatedPrice).not.toBe(initialPrice);
});
```

---

## Future Enhancements (Post-MVP)

1. **Click to Add**: Click symbol to quick-add to active portfolio
2. **Customizable List**: User selects which 10-30 symbols to display
3. **Sparkline Charts**: Tiny 24h price chart next to each symbol
4. **Search/Filter**: Search bar to find specific symbol in ticker
5. **Audio Alerts**: Sound notification for significant price moves (>5%)
6. **WebSocket Updates**: Replace 30s polling with real-time WebSocket feed
7. **Multi-Currency**: Display prices in EUR, GBP, JPY (not just USD)

---

## Dependencies

### Backend
- ✅ **T070**: `/api/prices` endpoint implemented
- ✅ **T069**: Moralis API integration complete
- ✅ **T076**: `/api/symbols` endpoint (optional - for validation)

### Frontend
- ✅ **T042**: React Query provider configured (30s staleTime)
- ✅ **T044**: ShadCN UI Badge component installed
- ⏳ **T089**: This component (current task)

---

## Implementation Checklist

- [ ] Create `lib/constants.ts` with `SUPPORTED_SYMBOLS` array (30 symbols)
- [ ] Create `components/dashboard/PriceTicker.tsx` component
- [ ] Implement React Query hook with 30s refresh
- [ ] Add CSS animation for auto-scroll
- [ ] Implement color coding logic (green/red/gray)
- [ ] Add stale detection (>30s threshold)
- [ ] Create `TickerSkeleton` loading component
- [ ] Add hover-to-pause interaction
- [ ] Write unit tests (5 test cases)
- [ ] Update E2E test T034 to include ticker validation
- [ ] Add ARIA labels for accessibility
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Performance test: verify ≥60fps animation
- [ ] Integration test: verify API call with all 30 symbols

---

## Sign-off

**Design Approved By**: User (2025-01-05)  
**Requirements Met**: FR-009 ✅, FR-011 ✅, FR-012 ✅, FR-015 ✅, NFR-003 ✅  
**Ready for Implementation**: ✅ YES  
**Next Task**: T090 (PortfolioValueChart component)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-05
