# Historical Cryptocurrency Price Data - Research & Implementation Plan

**Date**: 2025-01-08  
**Context**: Portfolio chart needs historical prices for accurate value calculation  
**Current Issue**: Only have current prices, can't calculate historical portfolio values

---

## 📊 **Historical Price Data Sources**

### **Option 1: Moralis Historical Prices**

#### Does Moralis Support Historical Data?

**Current Endpoint (we use)**:
```
POST /erc20/prices
GET /erc20/{address}/price?chain=eth
```
Returns: **Current price only** ❌

**Historical Endpoint (if exists)**:
```
GET /erc20/{address}/price/historical?chain=eth&date=2025-10-07
```
Need to check: **Moralis API documentation**

**Pros**:
- ✅ Already integrated
- ✅ Same authentication
- ✅ Consistent data source

**Cons**:
- ❌ Unknown if free tier supports historical
- ❌ May require premium subscription
- ❌ Limited to tokens we currently support

---

### **Option 2: CoinGecko API (Free Tier)**

#### Endpoint:
```
GET /coins/{id}/history?date=08-10-2025
```

**What it provides**:
```json
{
  "id": "bitcoin",
  "market_data": {
    "current_price": {
      "usd": 65432.10
    }
  }
}
```

**Pros**:
- ✅ **FREE** for historical data
- ✅ Supports 10,000+ cryptocurrencies
- ✅ 10-50 calls/minute (free tier)
- ✅ Date format: DD-MM-YYYY
- ✅ Well documented

**Cons**:
- ❌ Different API than current setup
- ❌ Need to map symbols (BTC → bitcoin, ETH → ethereum)
- ❌ Rate limits may be restrictive for backfills

**Symbol Mapping Required**:
```javascript
const COINGECKO_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple'
};
```

---

### **Option 3: CoinMarketCap API (Free Tier)**

#### Endpoint:
```
GET /v1/cryptocurrency/quotes/historical?symbol=BTC&time_start=...&time_end=...
```

**Free Tier Limits**:
- 10,000 calls/month (333/day)
- Historical data available
- Requires API key

**Pros**:
- ✅ Professional-grade data
- ✅ Historical data included
- ✅ Good documentation

**Cons**:
- ❌ Monthly call limit (10k)
- ❌ May not be enough for daily snapshots + backfills
- ❌ Requires separate API integration

---

### **Option 4: Store Prices Daily (Build Our Own)**

#### Strategy:
1. **Extend price_cache table**:
```sql
ALTER TABLE price_cache ADD COLUMN price_date DATE;
ALTER TABLE price_cache DROP CONSTRAINT price_cache_pkey;
ALTER TABLE price_cache ADD PRIMARY KEY (symbol, price_date);
```

2. **Daily price snapshot**:
```javascript
// Run at midnight
async function storeDailyPrices() {
  const today = new Date().toISOString().split('T')[0];
  const prices = await getTokenPrices(['BTC', 'ETH', 'SOL', ...]);
  
  for (const price of prices) {
    await supabase.from('price_cache').insert({
      symbol: price.symbol,
      price_usd: price.price_usd,
      price_date: today,
      // ... other fields
    });
  }
}
```

3. **Query historical prices**:
```sql
SELECT * FROM price_cache 
WHERE symbol = 'BTC' 
  AND price_date = '2025-10-07'
```

**Pros**:
- ✅ No additional API needed
- ✅ Own historical data
- ✅ Fast queries (local database)
- ✅ No rate limits

**Cons**:
- ❌ Only have data from "now forward"
- ❌ No backfill for past dates
- ❌ Requires implementing daily job

---

## 🎯 **Recommended Solution: Hybrid Approach**

### **Phase 1: CoinGecko for Backfill (One-Time)**

Use CoinGecko's free historical API to backfill missing dates:

```javascript
async function backfillHistoricalPrices(symbol, fromDate, toDate) {
  const coinId = COINGECKO_IDS[symbol];
  const dates = getDatesInRange(fromDate, toDate);
  
  for (const date of dates) {
    const formattedDate = formatDate(date, 'DD-MM-YYYY');
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formattedDate}`
    );
    
    const data = await response.json();
    const price = data.market_data.current_price.usd;
    
    await supabase.from('price_cache').insert({
      symbol: symbol,
      price_usd: price,
      price_date: date,
      created_at: new Date().toISOString()
    });
    
    // Rate limit: wait 100ms between calls
    await sleep(100);
  }
}
```

**Usage**:
```javascript
// Backfill for portfolio created Oct 5
await backfillHistoricalPrices('BTC', '2025-10-05', '2025-10-08');
await backfillHistoricalPrices('ETH', '2025-10-05', '2025-10-08');
// ... for all 7 symbols
```

### **Phase 2: Daily Price Storage (Ongoing)**

Use current Moralis batch API + store with date:

```javascript
// Cron job runs at midnight
async function storeDailyPricesSnapshot() {
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch current prices (already implemented)
  const prices = await getTokenPrices(['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB', 'XRP']);
  
  // Store with today's date
  const records = prices.map(p => ({
    symbol: p.symbol,
    price_usd: p.price_usd,
    market_cap: p.market_cap,
    volume_24h: p.volume_24h,
    change_24h_pct: p.change_24h_pct,
    price_date: today,  // Add date column
    last_updated: p.last_updated
  }));
  
  await supabase.from('price_cache').insert(records);
}
```

### **Phase 3: Query Historical Prices**

```javascript
async function getPricesForDate(date, symbols) {
  const { data, error } = await supabase
    .from('price_cache')
    .select('symbol, price_usd')
    .eq('price_date', date)
    .in('symbol', symbols);
    
  return data || [];
}
```

---

## 📋 **Implementation Checklist**

### Database Changes
- [ ] Add `price_date` column to `price_cache`
- [ ] Change primary key to `(symbol, price_date)`
- [ ] Create index on `price_date` for fast queries

### CoinGecko Integration (Backfill)
- [ ] Create CoinGecko API client
- [ ] Implement symbol mapping (BTC → bitcoin)
- [ ] Build backfill function with rate limiting
- [ ] Handle API errors gracefully

### Daily Price Storage
- [ ] Modify `getTokenPrices()` to include date
- [ ] Create cron job or Edge Function
- [ ] Run at midnight to store daily prices
- [ ] Monitor for failures

### Snapshot Generation
- [ ] Use historical prices in snapshot calculation
- [ ] Query `price_cache` by date
- [ ] Calculate portfolio value with correct prices
- [ ] Store in `portfolio_snapshots`

---

## 💰 **Cost Analysis**

### CoinGecko (Free Tier)
```
Backfill: 
  7 symbols × 30 days = 210 calls (one-time)
  Rate: 10-50 calls/min
  Time: ~5-20 minutes

Daily Storage:
  7 symbols × 1 call/day = 7 calls/day
  Within free tier limits ✅
```

### Moralis (Current)
```
Daily Storage (use current API):
  1 batch call/day = 30 calls/month
  Well within free tier ✅
```

### Database Storage
```
Daily Price Records:
  7 symbols × 365 days = 2,555 rows/year
  Negligible storage cost ✅
```

---

## 🔧 **Quick Start: Get Historical Prices for Your Portfolio**

### For Testing (Manual):
```bash
# Get BTC price for Oct 7, 2025
curl "https://api.coingecko.com/api/v3/coins/bitcoin/history?date=07-10-2025"
```

### For Implementation:
```javascript
// lib/coingecko.ts
export async function getHistoricalPrice(symbol: string, date: string) {
  const coinId = COINGECKO_IDS[symbol];
  const formattedDate = formatDateDDMMYYYY(date); // "07-10-2025"
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formattedDate}`
  );
  
  const data = await response.json();
  return data.market_data.current_price.usd;
}
```

---

## ✅ **Answer to Your Question**

### **Does Moralis Give Historical Prices?**

**Need to check their docs**, but likely:
- ❌ **Free tier**: Only current prices
- ✅ **Premium tier**: May have historical endpoints
- 🤷 **Unknown**: Need to verify API documentation

### **Best Alternative: CoinGecko**

✅ **FREE historical prices**  
✅ **Simple API**: Just pass date parameter  
✅ **Covers all 7 symbols**  
✅ **No authentication required** (free tier)  
✅ **Daily data points available**  

**Recommended**: Use CoinGecko for historical backfill, then store daily prices going forward.

---

**Should I implement the CoinGecko historical price integration?**
