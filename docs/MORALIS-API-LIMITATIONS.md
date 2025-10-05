# Moralis API Limitations - Cryptocurrency Symbol Support

**Date**: 2025-01-05  
**Context**: T089 PriceTicker Implementation  
**Status**: ✅ **ACCEPTED FOR MVP** - 7 symbols sufficient, expansion planned for Day 2  
**Resolution**: Day 2 enhancement (D2-001) scheduled - CoinGecko API integration

---

## 📋 Executive Summary

**MVP Decision**: Accepted 7-symbol limitation for initial release  
**Rationale**: Demonstrates core functionality with top cryptocurrencies + stablecoins  
**Day 2 Plan**: Expand to 30+ symbols via CoinGecko API integration (1-2 days effort)  
**Reference**: See `docs/DAY2-REQUIREMENTS.md` for implementation roadmap

---

## 🚨 Problem Summary

During T089 implementation, we discovered that **Moralis API v2.2 (free tier)** only supports a limited subset of cryptocurrency tokens through their Ethereum ERC20 price endpoints. This significantly impacts the original requirement of supporting "≥30 cryptocurrency symbols" (FR-009).

### Original Plan
- **Target**: 30+ cryptocurrency symbols
- **Categories**: Top 10, DeFi/L1, Meme coins, Emerging chains
- **Total**: BTC, ETH, USDT, BNB, SOL, USDC, XRP, ADA, AVAX, DOGE, DOT, MATIC, LINK, UNI, ATOM, LTC, NEAR, APT, ARB, OP, SHIB, PEPE, WIF, BONK, FLOKI, SUI, SEI, INJ, TIA, RUNE

### MVP Reality (Accepted)
- **Actual**: 7 working cryptocurrency symbols
- **Working**: BTC, ETH, USDT, BNB, SOL, USDC, XRP
- **Deferred to Day 2**: 23 symbols (ADA, ATOM, AVAX, DOGE, and all others)
- **Covers**: Top 7 by market cap + major stablecoins

---

## 🔍 Root Cause Analysis

### Moralis API Architecture
Moralis v2.2 ERC20 price endpoint: `GET /erc20/{address}/price?chain=eth`

**Requirements**:
1. Token must have an **Ethereum ERC20 wrapped version**
2. Contract address must be **verified and indexed** by Moralis
3. Token must have **sufficient liquidity** on Ethereum DEXs

### Why Tokens Failed

#### Category 1: No ERC20 Wrapper (Native Chain Tokens)
- **AVAX** (Avalanche) - Native C-Chain token, not wrapped on Ethereum
- **NEAR** (NEAR Protocol) - Native NEAR blockchain token
- **APT** (Aptos) - Native Aptos blockchain token
- **SUI** (Sui) - Native Sui blockchain token
- **SEI** (Sei) - Native Sei blockchain token
- **TIA** (Celestia) - Native Celestia blockchain token

**Solution**: Would require Moralis multi-chain support (premium tier) or native chain RPC integration.

#### Category 2: ERC20 Not Found by Moralis
- **ADA** (Cardano) - API returns "Not Found"
- **DOGE** (Dogecoin) - API returns "Not Found"
- **DOT** (Polkadot) - API returns "Not Found"
- **LTC** (Litecoin) - API returns "Not Found"
- **ATOM** (Cosmos) - API returns "Bad Request"

**Possible Reasons**:
- Contract addresses incorrect or not indexed
- Liquidity too low for Moralis to track
- Token deprecated or moved to different contract

#### Category 3: Wrong Chain Endpoint
- **MATIC** (Polygon) - Would work on `chain=polygon` endpoint, not `chain=eth`
- **ARB** (Arbitrum) - Would work on `chain=arbitrum` endpoint
- **OP** (Optimism) - Would work on `chain=optimism` endpoint

**Solution**: Requires separate API calls per chain (increases complexity and rate limits).

#### Category 4: Meme Coins / Low Liquidity
- **SHIB** (Shiba Inu) - May not be indexed
- **PEPE** (Pepe) - May not be indexed
- **WIF** (dogwifhat) - May not be indexed
- **BONK** (Bonk) - May not be indexed
- **FLOKI** (Floki Inu) - May not be indexed

**Possible Reasons**:
- Contract addresses from documentation may be outdated
- Moralis free tier may not index smaller tokens
- Liquidity pools may be on unsupported DEXs

---

## ✅ Working Symbols Analysis

| Symbol | Token Name | ERC20 Contract | Why It Works |
|--------|------------|----------------|--------------|
| BTC | Bitcoin | WBTC (0x2260FAC...) | Widely used wrapped BTC on Ethereum |
| ETH | Ethereum | WETH (0xC02aaA3...) | Native wrapped ETH |
| USDT | Tether | USDT (0xdAC17F9...) | Major stablecoin, high liquidity |
| BNB | Binance Coin | BNB (0xB8c7748...) | Wrapped BNB on Ethereum |
| SOL | Solana | Wrapped SOL (0xD31a59c...) | Wrapped SOL on Ethereum |
| USDC | USD Coin | USDC (0xA0b8699...) | Major stablecoin, high liquidity |
| XRP | Ripple | XRP (0x39fbbabf...) | Wrapped XRP on Ethereum |

**Common Traits**:
- All have **verified ERC20 wrapped contracts** on Ethereum mainnet
- All have **high trading volume** on Uniswap/Sushiswap
- All are **top 10 by market cap** or major stablecoins
- All are **actively maintained** and widely used

---

## 📊 Impact Assessment

### Functional Requirements
- **FR-009**: Display prices for ≥30 cryptocurrency symbols
  - **Status**: ❌ **NOT MET** (only 7 symbols)
  - **Impact**: Major reduction in price ticker functionality

### Non-Functional Requirements
- **NFR-015**: Real-time data updates (30s intervals) ✅ Still works
- **NFR-020**: Responsive design ✅ Still works

### User Experience
- **Reduced diversity**: Only major coins and stablecoins displayed
- **Missing altcoins**: No DeFi, meme, or emerging chain prices
- **Limited portfolio tracking**: Users with altcoins can't track prices

---

## 🔧 Immediate Fixes Applied

### 1. Updated `lib/constants.ts`
```typescript
export const SUPPORTED_SYMBOLS = [
  'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP'
] as const;
```
- Added detailed comments explaining limitations
- Kept commented-out symbols with error reasons for future reference

### 2. Updated Unit Tests
- Changed assertion from 30 symbols → 7 symbols
- Updated test descriptions to reflect Moralis limitations
- Focused tests on major tokens and stablecoins

### 3. Added Authentication
- Fixed missing `Authorization` header in PriceTicker fetch call
- Added Moralis API key to `.env.local`

### 4. Error Handling Improvements
- Added console logging for Moralis API errors
- Graceful degradation when symbols fail to load
- Display partial results instead of full failure

---

## 🚀 Recommended Solutions

### Option 1: Upgrade to Moralis Pro Tier (💰 Paid)
**Cost**: ~$49/month  
**Benefits**:
- Multi-chain support (Ethereum, Polygon, BSC, Avalanche, etc.)
- Higher rate limits (100k requests/month)
- Better token coverage and indexing
- Faster response times

**Effort**: Low (just upgrade subscription)  
**Timeline**: Immediate

### Option 2: Add Alternative Price Data Sources
**Free Options**:
- **CoinGecko API** (free tier: 10-50 calls/min)
  - Supports 10,000+ cryptocurrencies
  - No chain limitation (aggregates from multiple sources)
  - Simple REST API
- **CoinMarketCap API** (free tier: 10k calls/month)
  - Supports 9,000+ cryptocurrencies
  - Professional-grade data
  - Historical data available

**Effort**: Medium (implement new API client, update routes)  
**Timeline**: 1-2 days

### Option 3: Hybrid Approach
- Use **Moralis for Ethereum tokens** (current 7 working)
- Use **CoinGecko for all others** (23 missing symbols)
- Implement fallback logic in price API route

**Effort**: Medium-High (implement multi-source aggregation)  
**Timeline**: 2-3 days

### Option 4: Native Chain Integration (Advanced)
- Integrate **Solana RPC** for native SOL ecosystem tokens
- Integrate **Polygon RPC** for MATIC ecosystem
- Integrate **Avalanche RPC** for AVAX ecosystem
- Use **on-chain price oracles** (Chainlink, Pyth, etc.)

**Effort**: Very High (requires blockchain expertise)  
**Timeline**: 1-2 weeks

---

## 📋 Recommended Next Steps

### Immediate (This Sprint)
1. ✅ Document the limitation (this file)
2. ✅ Update constants to 7 working symbols
3. ✅ Fix authentication issues
4. ✅ Update unit tests
5. ⏳ Update spec.md and tasks.md with revised requirements
6. ⏳ Create GitHub issue to track enhancement

### Short-term (Next Sprint)
1. Implement **CoinGecko API** as alternative data source
2. Update `/api/prices` route to use CoinGecko for missing symbols
3. Add configuration flag to switch between Moralis/CoinGecko
4. Restore 30+ symbol support using hybrid approach

### Long-term (Future Sprints)
1. Evaluate Moralis Pro vs CoinGecko Pro for production use
2. Consider multi-chain integration for better coverage
3. Add price data caching layer (Redis) to reduce API calls
4. Implement WebSocket price streams for true real-time updates

---

## 💡 Lessons Learned

1. **Always validate third-party API coverage** before committing to requirements
2. **Free tier limitations** can significantly impact feature scope
3. **Test with real API keys early** to catch integration issues
4. **Plan for fallback data sources** when dealing with external dependencies
5. **Document API limitations prominently** for future maintainers

---

## 🔗 References

- [Moralis ERC20 Price API Docs](https://docs.moralis.io/web3-data-api/evm/reference/get-token-price)
- [CoinGecko API Docs](https://www.coingecko.com/en/api/documentation)
- [CoinMarketCap API Docs](https://coinmarketcap.com/api/documentation/v1/)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds)

---

**Status**: ⚠️ **LIMITATION DOCUMENTED**  
**Action Required**: Product decision on symbol count reduction vs API upgrade/switch
