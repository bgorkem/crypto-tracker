/**
 * Moralis API Mock Data
 * Provides deterministic mock price data for testing and development
 */

import { PriceData } from './moralis';

/**
 * Mock price data with realistic values
 * These values are static for predictable testing
 */
const MOCK_PRICE_DATA: Record<string, Omit<PriceData, 'symbol' | 'last_updated'>> = {
  BTC: {
    price_usd: 65432.10,
    market_cap: 1280000000000,
    volume_24h: 28500000000,
    change_24h_pct: 2.5,
  },
  ETH: {
    price_usd: 3521.80,
    market_cap: 423000000000,
    volume_24h: 15200000000,
    change_24h_pct: -1.2,
  },
  USDT: {
    price_usd: 1.0,
    market_cap: 95000000000,
    volume_24h: 52000000000,
    change_24h_pct: 0.01,
  },
  BNB: {
    price_usd: 612.45,
    market_cap: 89000000000,
    volume_24h: 1800000000,
    change_24h_pct: 3.8,
  },
  SOL: {
    price_usd: 152.30,
    market_cap: 67000000000,
    volume_24h: 3200000000,
    change_24h_pct: 5.2,
  },
  USDC: {
    price_usd: 1.0,
    market_cap: 32000000000,
    volume_24h: 6800000000,
    change_24h_pct: -0.02,
  },
  XRP: {
    price_usd: 0.52,
    market_cap: 28000000000,
    volume_24h: 1200000000,
    change_24h_pct: -0.5,
  },
};

/**
 * Returns mock price data for specified symbols
 * Used during testing (NODE_ENV === 'test') and development (no API key)
 */
export function getMockTokenPrices(symbols: string[]): PriceData[] {
  const now = new Date().toISOString();
  
  return symbols.map(symbol => {
    const upperSymbol = symbol.toUpperCase();
    const mockData = MOCK_PRICE_DATA[upperSymbol];
    
    if (!mockData) {
      // Return default mock data for unknown symbols
      return {
        symbol: upperSymbol,
        price_usd: 100 + Math.random() * 10,
        market_cap: 1000000000,
        volume_24h: 50000000,
        change_24h_pct: (Math.random() - 0.5) * 10,
        last_updated: now,
      };
    }
    
    return {
      symbol: upperSymbol,
      ...mockData,
      last_updated: now,
    };
  });
}

/**
 * Check if we should use mock data
 * Returns true if:
 * - Running in test environment (NODE_ENV === 'test')
 * - No Moralis API key configured
 */
export function shouldUseMockData(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    !process.env.MORALIS_API_KEY
  );
}
