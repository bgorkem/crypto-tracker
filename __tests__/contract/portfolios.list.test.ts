import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const PortfolioSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  base_currency: z.string(),
  total_value: z.number(),
  unrealized_pl: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const PortfoliosListResponseSchema = z.object({
  data: z.object({
    portfolios: z.array(PortfolioSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});

describe('GET /api/portfolios', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token'; // Will be replaced with real auth in integration tests

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios`);

    expect(response.status).toBe(401);
  });

  it('returns 200 with empty portfolios array for new user', async () => {
    // This test assumes we have a valid auth token
    // For now, it will fail because no endpoint exists
    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      headers: {
        'Authorization': `Bearer ${authToken || 'mock-token'}`,
      },
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = PortfoliosListResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(Array.isArray(validationResult.data.data.portfolios)).toBe(true);
      expect(validationResult.data.data.total).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports pagination with limit and offset query params', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios?limit=10&offset=0`, {
      headers: {
        'Authorization': `Bearer ${authToken || 'mock-token'}`,
      },
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = PortfoliosListResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.limit).toBe(10);
      expect(validationResult.data.data.offset).toBe(0);
    }
  });
});
