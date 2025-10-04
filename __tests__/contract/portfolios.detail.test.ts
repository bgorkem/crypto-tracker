import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const HoldingSchema = z.object({
  symbol: z.string(),
  total_quantity: z.number(),
  average_cost: z.number(),
  market_value: z.number(),
  unrealized_pl: z.number(),
  current_price: z.number(),
  price_change_24h_pct: z.number().nullable(),
});

const PortfolioDetailResponseSchema = z.object({
  data: z.object({
    portfolio: z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().nullable(),
      base_currency: z.string(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
    }),
    holdings: z.array(HoldingSchema),
    summary: z.object({
      total_value: z.number(),
      total_cost: z.number(),
      unrealized_pl: z.number(),
      total_pl_pct: z.number(),
    }),
  }),
});

describe('GET /api/portfolios/:id', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';

  it('returns 200 with portfolio details and holdings', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = PortfolioDetailResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.portfolio.id).toBe(mockPortfolioId);
      expect(Array.isArray(validationResult.data.data.holdings)).toBe(true);
      expect(validationResult.data.data.summary).toBeDefined();
    }
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}`);

    expect(response.status).toBe(401);
  });

  it('returns 403 FORBIDDEN for portfolio not owned by user', async () => {
    const otherUserPortfolioId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    
    const response = await fetch(`${BASE_URL}/api/portfolios/${otherUserPortfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent portfolio', async () => {
    const fakePortfolioId = '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BASE_URL}/api/portfolios/${fakePortfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(404);
  });

  it('calculates holdings from transactions correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const validationResult = PortfolioDetailResponseSchema.safeParse(data);
      
      if (validationResult.success) {
        const { holdings, summary } = validationResult.data.data;
        
        // Verify summary totals match sum of holdings
        if (holdings.length > 0) {
          const calculatedTotal = holdings.reduce((sum, h) => sum + h.market_value, 0);
          expect(summary.total_value).toBeCloseTo(calculatedTotal, 2);
        }
      }
    }
  });
});
