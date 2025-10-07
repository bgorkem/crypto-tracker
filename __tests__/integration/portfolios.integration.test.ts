import { describe, it, expect, beforeEach } from 'vitest';
import { getTestUser } from '../helpers/test-user-pool';
import { authenticateTestUser } from '../helpers/test-auth';

/**
 * Integration Test: Portfolio Creation and Holdings Calculation
 * 
 * This test verifies the complete flow:
 * 1. User registers and logs in
 * 2. Creates a portfolio
 * 3. Adds multiple BUY transactions
 * 4. System correctly calculates holdings with average cost
 * 5. Portfolio detail includes real-time market values
 */

describe('Portfolio Holdings Integration', () => {
  const BASE_URL = 'http://localhost:3000';
  let authToken: string;
  let portfolioId: string;

  beforeEach(async () => {
    // Use test pool user to avoid rate limiting
    const { email, password } = getTestUser();
    const { token } = await authenticateTestUser(email, password);
    authToken = token;
  });

  it('calculates holdings correctly after creating portfolio and transactions', async () => {
    // Step 1: Create portfolio
    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Portfolio',
        description: 'Testing holdings calculation',
      }),
    });

    expect(portfolioResponse.status).toBe(201);
    const portfolioData = await portfolioResponse.json();
    portfolioId = portfolioData.data.id;

    // Step 2: Add first BUY transaction
    const txn1Response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        symbol: 'BTC',
        side: 'BUY',
        quantity: 1,
        price: 40000,
        executed_at: '2024-01-01T00:00:00Z',
      }),
    });

    expect(txn1Response.status).toBe(201);

    // Step 3: Add second BUY transaction (same symbol, different price)
    const txn2Response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        symbol: 'BTC',
        side: 'BUY',
        quantity: 1,
        price: 50000,
        executed_at: '2024-01-02T00:00:00Z',
      }),
    });

    expect(txn2Response.status).toBe(201);

    // Step 4: Fetch portfolio details with holdings
    const detailResponse = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(detailResponse.status).toBe(200);
    const detailData = await detailResponse.json();

    // Verify holdings calculation
    const btcHolding = detailData.data.holdings.find((h: { symbol: string }) => h.symbol === 'BTC');
    expect(btcHolding).toBeDefined();
    expect(btcHolding.total_quantity).toBe(2); // 1 + 1
    expect(btcHolding.average_cost).toBe(45000); // (40000 + 50000) / 2
    expect(btcHolding.market_value).toBeGreaterThan(0);
    expect(btcHolding.current_price).toBeGreaterThan(0);

    // Verify summary
    expect(detailData.data.summary.total_cost).toBe(90000); // (1 * 40000) + (1 * 50000)
    expect(detailData.data.summary.total_value).toBeGreaterThan(0);
  });

  it('handles BUY and SELL transactions correctly', async () => {
    // Create portfolio
    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'BUY/SELL Test Portfolio',
      }),
    });

    portfolioId = (await portfolioResponse.json()).data.id;

    // BUY 2 BTC
    await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        symbol: 'BTC',
        side: 'BUY',
        quantity: 2,
        price: 40000,
        executed_at: '2024-01-01T00:00:00Z',
      }),
    });

    // SELL 1 BTC
    await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        symbol: 'BTC',
        side: 'SELL',
        quantity: 1,
        price: 50000,
        executed_at: '2024-01-02T00:00:00Z',
      }),
    });

    // Fetch holdings
    const detailResponse = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const detailData = await detailResponse.json();
    const btcHolding = detailData.data.holdings.find((h: { symbol: string }) => h.symbol === 'BTC');

    expect(btcHolding.total_quantity).toBe(1); // 2 - 1
    expect(btcHolding.average_cost).toBe(40000); // Original cost basis maintained
  });
});
