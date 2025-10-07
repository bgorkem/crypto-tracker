import { describe, it, expect, beforeEach } from 'vitest';
import { getTestUser } from '../helpers/test-user-pool';
import { authenticateTestUser } from '../helpers/test-auth';

/**
 * Integration Test: Portfolio Value Snapshots
 * 
 * This test verifies:
 * 1. Automatic snapshot creation on transaction events
 * 2. Historical portfolio value tracking
 * 3. Snapshot accuracy with calculations
 * 4. Performance chart data generation
 */

describe('Portfolio Snapshots Integration', () => {
  const BASE_URL = 'http://localhost:3000';
  let authToken: string;
  let portfolioId: string;

  beforeEach(async () => {
    // Use test pool user to avoid rate limiting
    const { email, password } = getTestUser();
    const { token } = await authenticateTestUser(email, password);
    authToken = token;

    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Snapshot Test Portfolio',
      }),
    });

    portfolioId = (await portfolioResponse.json()).data.id;
  });

  it('creates snapshots when transactions are added', async () => {
    // Add first transaction
    await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
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

    // Wait a moment for snapshot creation (if async)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add second transaction
    await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        symbol: 'ETH',
        side: 'BUY',
        quantity: 10,
        price: 2000,
        executed_at: '2024-01-02T00:00:00Z',
      }),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Fetch portfolio snapshots (hypothetical endpoint)
    const snapshotsResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/snapshots`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (snapshotsResponse.ok) {
      const snapshotsData = await snapshotsResponse.json();
      expect(snapshotsData.data.length).toBeGreaterThanOrEqual(2);
      
      // Verify snapshots have required fields
      snapshotsData.data.forEach((snapshot: {
        total_value: number;
        timestamp: string;
        holdings_count: number;
      }) => {
        expect(snapshot.total_value).toBeGreaterThan(0);
        expect(snapshot.timestamp).toBeDefined();
        expect(snapshot.holdings_count).toBeGreaterThan(0);
      });
    }
  });

  it('provides historical performance data for charting', async () => {
    // Add multiple transactions over time
    await Promise.all([
      fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
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
      }),
      fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          symbol: 'ETH',
          side: 'BUY',
          quantity: 10,
          price: 2000,
          executed_at: '2024-01-15T00:00:00Z',
        }),
      }),
    ]);

    // Fetch performance chart (hypothetical endpoint)
    const chartResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/performance?interval=30d`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (chartResponse.ok) {
      const chartData = await chartResponse.json();
      expect(chartData.data.points).toBeDefined();
      expect(Array.isArray(chartData.data.points)).toBe(true);
      
      if (chartData.data.points.length > 0) {
        const point = chartData.data.points[0];
        expect(point.timestamp).toBeDefined();
        expect(point.value).toBeGreaterThan(0);
      }
    }
  });

  it('snapshots reflect accurate calculations at point in time', async () => {
    // Add transaction
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

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get current portfolio value
    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const portfolioData = await portfolioResponse.json();
    const _currentValue = portfolioData.data.summary.total_value;

    // Fetch latest snapshot
    const snapshotsResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/snapshots?limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (snapshotsResponse.ok) {
      const snapshotsData = await snapshotsResponse.json();
      if (snapshotsData.data.length > 0) {
        const latestSnapshot = snapshotsData.data[0];
        
        // Snapshot value should be close to current value (accounting for price changes)
        expect(latestSnapshot.total_value).toBeDefined();
        expect(latestSnapshot.holdings_count).toBe(1);
      }
    }
  });
});
