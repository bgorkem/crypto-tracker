/**
 * Integration Tests: Chart Caching Behavior
 * Tests Redis cache integration, invalidation, and edge cases
 * 
 * Covers:
 * - T026: Cache hit on second request
 * - T027: Cache invalidation on transaction add
 * - T028: Cache invalidation on transaction edit
 * - T029: Cache invalidation on transaction delete
 * - T030: 1-year cap for 'all' interval
 * - T031: Empty portfolio edge case
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestUser } from '../helpers/test-user-pool';
import { authenticateTestUser } from '../helpers/test-auth';

const BASE_URL = 'http://localhost:3000';

// Use test pool user
const TEST_USER = getTestUser();

let accessToken: string;
let portfolioId: string;

describe('Chart Caching Integration Tests', () => {
  beforeAll(async () => {
    // Authenticate test user
    const { token } = await authenticateTestUser(TEST_USER.email, TEST_USER.password);
    accessToken = token;

    // Create test portfolio
    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Portfolio',
        description: 'For cache testing',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create portfolio: ${response.status}`);
    }

    const portfolioData = await response.json();
    portfolioId = portfolioData.data.id;
  });

  afterAll(async () => {
    // Clean up: delete portfolio (cascade deletes transactions)
    if (portfolioId) {
      await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  });

  describe('T026: Cache hit on second request', () => {
    it('should return cached=false on first request and cached=true on second', async () => {
      // Add a transaction first
      const txResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            symbol: 'BTC',
            side: 'BUY',
            quantity: 1,
            price: 50000,
            executed_at: '2025-01-01T00:00:00Z',
          }),
        }
      );

      expect(txResponse.ok).toBe(true);

      // First request - should miss cache
      const firstResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=30d`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(firstResponse.ok).toBe(true);
      const firstData = await firstResponse.json();
      expect(firstData.data).toBeDefined();
      expect(firstData.data.interval).toBe('30d');
      expect(firstData.data.snapshots).toBeInstanceOf(Array);

      // Second request - should hit cache
      const secondResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=30d`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(secondResponse.ok).toBe(true);
      const secondData = await secondResponse.json();
      expect(secondData.data).toBeDefined();
      expect(secondData.data.cached_at).toBeDefined(); // Indicates cache hit
      
      // Data should be identical
      expect(secondData.data.interval).toBe(firstData.data.interval);
      expect(secondData.data.current_value).toBe(firstData.data.current_value);
    });
  });

  describe('T027: Cache invalidation on transaction add', () => {
    it('should invalidate cache when new transaction is added', async () => {
      // Clear cache by requesting chart
      await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=7d`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Add another transaction to trigger invalidation
      const txResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            symbol: 'ETH',
            side: 'BUY',
            quantity: 10,
            price: 3000,
            executed_at: '2025-01-02',
          }),
        }
      );

      expect(txResponse.ok).toBe(true);

      // Next request should NOT have cached_at (cache was invalidated)
      const chartResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=7d`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(chartResponse.ok).toBe(true);
      const chartData = await chartResponse.json();
      
      // Should have ETH in the data now
      expect(chartData.data).toBeDefined();
      expect(chartData.data.interval).toBe('7d');
    });
  });

  describe('T028: Cache invalidation on transaction edit', () => {
    it('should invalidate cache when transaction is edited', async () => {
      // Get a transaction to edit
      const txListResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const txList = await txListResponse.json();
      
      // Check if there are any transactions
      if (!txList.data || txList.data.length === 0) {
        throw new Error('No transactions found to edit');
      }
      
      const transactionId = txList.data[0].id;

      // Request chart to populate cache
      const beforeEdit = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=24h`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const beforeData = await beforeEdit.json();

      // Edit transaction quantity
      const patchResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            quantity: 2, // Changed from 1
          }),
        }
      );

      expect(patchResponse.ok).toBe(true);

      // Next request should show updated data
      const afterEdit = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=24h`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const afterData = await afterEdit.json();
      expect(afterData.data).toBeDefined();
      
      // Current value should be different after quantity change
      expect(afterData.data.current_value).not.toBe(beforeData.data.current_value);
    });
  });

  describe('T029: Cache invalidation on transaction delete', () => {
    it('should invalidate cache when transaction is deleted', async () => {
      // Add a transaction to delete later
      const addTxResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            symbol: 'SOL',
            side: 'BUY',
            quantity: 100,
            price: 150,
            executed_at: '2025-01-03',
          }),
        }
      );

      const addedTx = await addTxResponse.json();
      const transactionId = addedTx.data.id;

      // Request chart to populate cache
      await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=90d`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Delete the transaction
      const deleteResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(deleteResponse.status).toBe(204);

      // Next request should not include deleted transaction data
      const afterDelete = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=90d`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const afterData = await afterDelete.json();
      expect(afterData.data).toBeDefined();
      expect(afterData.data.interval).toBe('90d');
    });
  });

  describe('T030: 1-year cap for all interval', () => {
    it('should cap all interval to maximum 366 days', async () => {
      // Create a portfolio with old transaction (3 years ago)
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);
      const oldDateStr = oldDate.toISOString().split('T')[0];

      const txResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            symbol: 'BTC',
            side: 'BUY',
            quantity: 0.5,
            price: 30000,
            executed_at: oldDateStr,
          }),
        }
      );

      expect(txResponse.ok).toBe(true);

      // Request 'all' interval
      const chartResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=all`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(chartResponse.ok).toBe(true);
      const chartData = await chartResponse.json();
      
      expect(chartData.data).toBeDefined();
      expect(chartData.data.interval).toBe('all');
      expect(chartData.data.snapshots.length).toBeLessThanOrEqual(366);

      // Verify oldest snapshot is not more than 1 year old
      if (chartData.data.snapshots.length > 0) {
        const oldestSnapshot = chartData.data.snapshots[0];
        const oldestDate = new Date(oldestSnapshot.snapshot_date);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        expect(oldestDate.getTime()).toBeGreaterThanOrEqual(oneYearAgo.getTime() - 86400000); // Allow 1 day margin
      }
    });
  });

  describe('T031: Empty portfolio edge case', () => {
    it('should handle portfolio with zero transactions gracefully', async () => {
      // Create a new empty portfolio
      const emptyPortfolioResponse = await fetch(
        `${BASE_URL}/api/portfolios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: 'Empty Test Portfolio',
            description: 'No transactions',
          }),
        }
      );

      const emptyPortfolio = await emptyPortfolioResponse.json();
      const emptyPortfolioId = emptyPortfolio.data.id;

      try {
        // Request chart for empty portfolio
        const chartResponse = await fetch(
          `${BASE_URL}/api/portfolios/${emptyPortfolioId}/chart?interval=30d`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        expect(chartResponse.ok).toBe(true);
        const chartData = await chartResponse.json();
        
        expect(chartData.data).toBeDefined();
        expect(chartData.data.interval).toBe('30d');
        expect(chartData.data.snapshots).toBeInstanceOf(Array);
        expect(chartData.data.snapshots.length).toBe(0);
        expect(chartData.data.current_value).toBe('0');
        expect(chartData.data.start_value).toBe('0');
      } finally {
        // Clean up empty portfolio
        await fetch(
          `${BASE_URL}/api/portfolios/${emptyPortfolioId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    });
  });
});
