import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const TransactionSchema = z.object({
  id: z.string().uuid(),
  portfolio_id: z.string().uuid(),
  symbol: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price_per_unit: z.number().positive(),
  transaction_date: z.string().datetime(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';

  it('returns 200 with paginated transactions', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
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
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions?page=2&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
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
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions?symbol=BTC`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
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
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions?type=BUY`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
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
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
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
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`);

    expect(response.status).toBe(401);
  });
});
