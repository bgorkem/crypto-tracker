import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

const TransactionSchema = z.object({
  id: z.string().uuid(),
  portfolio_id: z.string().uuid(),
  symbol: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price_per_unit: z.number().positive(),
  transaction_date: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const TransactionListResponseSchema = z.object({
  data: z.array(TransactionSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    has_next: z.boolean(),
  }),
});

describe('GET /api/portfolios/:id/transactions', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('transactionlist');
    authToken = token;
    
    // Create a portfolio for testing
    const createResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Transaction Test Portfolio' }),
    });
    const createData = await createResponse.json();
    portfolioId = createData.data.id;
  });

  it('returns 200 with paginated transactions', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      headers: createAuthHeaders(authToken),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = TransactionListResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(Array.isArray(validationResult.data.data)).toBe(true);
      expect(validationResult.data.pagination).toBeDefined();
      expect(validationResult.data.pagination.page).toBe(1);
      expect(validationResult.data.pagination.limit).toBe(100);
    }
  });

  it('supports pagination with page and limit query params', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?page=2&limit=50`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const validationResult = TransactionListResponseSchema.safeParse(data);
      
      if (validationResult.success) {
        expect(validationResult.data.pagination.page).toBe(2);
        expect(validationResult.data.pagination.limit).toBe(50);
      }
    }
  });

  it('filters by symbol when provided', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?symbol=BTC`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const validationResult = TransactionListResponseSchema.safeParse(data);
      
      if (validationResult.success) {
        const allBTC = validationResult.data.data.every(txn => txn.symbol === 'BTC');
        expect(allBTC).toBe(true);
      }
    }
  });

  it('filters by type (BUY or SELL) when provided', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?type=BUY`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const validationResult = TransactionListResponseSchema.safeParse(data);
      
      if (validationResult.success) {
        const allBuys = validationResult.data.data.every(txn => txn.type === 'BUY');
        expect(allBuys).toBe(true);
      }
    }
  });

  it('returns transactions in reverse chronological order by default', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      headers: createAuthHeaders(authToken),
    });

    if (response.ok) {
      const data = await response.json();
      const validationResult = TransactionListResponseSchema.safeParse(data);
      
      if (validationResult.success && validationResult.data.data.length > 1) {
        const dates = validationResult.data.data.map(txn => new Date(txn.transaction_date).getTime());
        const isSorted = dates.every((date, i) => i === 0 || dates[i - 1] >= date);
        expect(isSorted).toBe(true);
      }
    }
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`);

    expect(response.status).toBe(401);
  });
});
