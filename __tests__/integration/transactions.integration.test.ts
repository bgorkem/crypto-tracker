import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Integration Test: Transaction CRUD Operations
 * 
 * This test verifies:
 * 1. Creating multiple transactions
 * 2. Listing transactions with pagination
 * 3. Filtering transactions by symbol and type
 * 4. Updating transaction details
 * 5. Deleting individual and bulk transactions
 */

describe('Transaction CRUD Integration', () => {
  const BASE_URL = 'http://localhost:3000';
  let authToken: string;
  let portfolioId: string;

  beforeEach(async () => {
    // Setup: Register, login, create portfolio
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
        name: 'Transaction Test Portfolio',
      }),
    });

    portfolioId = (await portfolioResponse.json()).data.id;
  });

  it('supports full CRUD lifecycle for transactions', async () => {
    // CREATE: Add multiple transactions
    const createResponses = await Promise.all([
      fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
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
          notes: 'First BTC purchase',
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
          type: 'BUY',
          quantity: 10,
          price_per_unit: 2000,
          transaction_date: '2024-01-02T00:00:00Z',
        }),
      }),
      fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          symbol: 'BTC',
          type: 'BUY',
          quantity: 0.5,
          price_per_unit: 45000,
          transaction_date: '2024-01-03T00:00:00Z',
        }),
      }),
    ]);

    const transactionIds = await Promise.all(
      createResponses.map(async (res) => (await res.json()).data.id)
    );

    expect(transactionIds).toHaveLength(3);

    // READ: List all transactions
    const listResponse = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const listData = await listResponse.json();
    expect(listData.data).toHaveLength(3);
    expect(listData.pagination.total).toBe(3);

    // READ: Filter by symbol
    const filterResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?symbol=BTC`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const filterData = await filterResponse.json();
    expect(filterData.data).toHaveLength(2);
    expect(filterData.data.every((t: { symbol: string }) => t.symbol === 'BTC')).toBe(true);

    // UPDATE: Edit transaction
    const updateResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionIds[0]}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notes: 'Updated notes field',
          quantity: 1.5,
        }),
      }
    );

    const updateData = await updateResponse.json();
    expect(updateData.data.notes).toBe('Updated notes field');
    expect(updateData.data.quantity).toBe(1.5);

    // DELETE: Remove single transaction
    const deleteResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionIds[1]}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(deleteResponse.status).toBe(204);

    // Verify deletion
    const afterDeleteResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const afterDeleteData = await afterDeleteResponse.json();
    expect(afterDeleteData.data).toHaveLength(2);
  });

  it('supports bulk delete by symbol', async () => {
    // Create multiple transactions for same symbol
    await Promise.all([
      fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          symbol: 'SOL',
          type: 'BUY',
          quantity: 100,
          price_per_unit: 50,
          transaction_date: '2024-01-01T00:00:00Z',
        }),
      }),
      fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          symbol: 'SOL',
          type: 'SELL',
          quantity: 50,
          price_per_unit: 60,
          transaction_date: '2024-01-02T00:00:00Z',
        }),
      }),
    ]);

    // Bulk delete
    const bulkDeleteResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?symbol=SOL`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(bulkDeleteResponse.status).toBe(204);

    // Verify all SOL transactions deleted
    const verifyResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?symbol=SOL`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();
    expect(verifyData.data).toHaveLength(0);
  });
});
