import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Integration Test: Real-time Price Updates
 * 
 * This test verifies:
 * 1. Fetching current prices from Moralis API
 * 2. Price data freshness (30-second threshold)
 * 3. Cache-Control headers for client-side caching
 * 4. Integration with portfolio holdings for market values
 */

describe('Price Updates Integration', () => {
  const BASE_URL = 'http://localhost:3000';
  let authToken: string;
  let portfolioId: string;

  beforeEach(async () => {
    // Setup: Register, login, create portfolio with transactions
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'SecureP@ss123',
      }),
    });

    const registerData = await registerResponse.json();
    authToken = registerData.data.session.access_token;

    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Price Test Portfolio',
      }),
    });

    portfolioId = (await portfolioResponse.json()).data.id;

    // Add transactions
    await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
        price_per_unit: 40000,
        transaction_date: '2024-01-01T00:00:00Z',
      }),
    });
  });

  it('fetches fresh prices and updates portfolio market values', async () => {
    // Fetch prices directly
    const pricesResponse = await fetch(`${BASE_URL}/api/prices?symbols=BTC,ETH`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(pricesResponse.status).toBe(200);
    const pricesData = await pricesResponse.json();
    
    expect(pricesData.data).toHaveLength(2);
    const btcPrice = pricesData.data.find((p: { symbol: string }) => p.symbol === 'BTC');
    expect(btcPrice.price_usd).toBeGreaterThan(0);
    expect(btcPrice.last_updated).toBeDefined();

    // Verify price freshness (within last 30 seconds)
    const lastUpdated = new Date(btcPrice.last_updated).getTime();
    const now = Date.now();
    const ageSeconds = (now - lastUpdated) / 1000;
    expect(ageSeconds).toBeLessThan(30);

    // Fetch portfolio with updated prices
    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const portfolioData = await portfolioResponse.json();
    const holding = portfolioData.data.holdings.find((h: { symbol: string }) => h.symbol === 'BTC');
    
    // Market value should use current price
    expect(holding.current_price).toBeCloseTo(btcPrice.price_usd, 2);
    expect(holding.market_value).toBeCloseTo(1 * btcPrice.price_usd, 2);
    expect(holding.unrealized_pl).toBeDefined();
  });

  it('includes proper cache headers for price requests', async () => {
    const pricesResponse = await fetch(`${BASE_URL}/api/prices?symbols=BTC`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const cacheControl = pricesResponse.headers.get('Cache-Control');
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('max-age=30');
  });

  it('handles multiple symbols in single request', async () => {
    const symbols = ['BTC', 'ETH', 'SOL', 'MATIC', 'AVAX'];
    const pricesResponse = await fetch(`${BASE_URL}/api/prices?symbols=${symbols.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const pricesData = await pricesResponse.json();
    expect(pricesData.data).toHaveLength(symbols.length);
    
    symbols.forEach((symbol) => {
      const price = pricesData.data.find((p: { symbol: string }) => p.symbol === symbol);
      expect(price).toBeDefined();
      expect(price.price_usd).toBeGreaterThan(0);
    });
  });
});
