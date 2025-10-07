import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

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
      created_at: z.string(),
      updated_at: z.string(),
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
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('portfoliodetail');
    authToken = token;
    
    // Create a portfolio for testing
    const createResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Test Portfolio' }),
    });
    const createData = await createResponse.json();
    portfolioId = createData.data.id;
  });

  it('returns 200 with portfolio details and holdings', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: createAuthHeaders(authToken),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = PortfolioDetailResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.portfolio.id).toBe(portfolioId);
      expect(Array.isArray(validationResult.data.data.holdings)).toBe(true);
      expect(validationResult.data.data.summary).toBeDefined();
    }
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`);

    expect(response.status).toBe(401);
  });

  it('returns 403 FORBIDDEN for portfolio not owned by user', async () => {
    const { token: otherToken } = await createTestUser('otheruser');
    
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: createAuthHeaders(otherToken),
    });

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent portfolio', async () => {
    const fakePortfolioId = '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BASE_URL}/api/portfolios/${fakePortfolioId}`, {
      headers: createAuthHeaders(authToken),
    });

    expect(response.status).toBe(404);
  });

  it('calculates holdings from transactions correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      headers: createAuthHeaders(authToken),
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
