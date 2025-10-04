import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';

const PortfolioSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  base_currency: z.string(),
  total_value: z.number().nullable(),
  unrealized_pl: z.number().nullable(),
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
  let authToken: string;

  beforeAll(async () => {
    // Create and login a test user
    const testEmail = `portfoliouser-${Date.now()}@testuser.com`;
    const password = 'TestPassword123!';

    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password }),
    });

    const registerData = await registerResponse.json();
    authToken = registerData.data.session.access_token;
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios`);

    expect(response.status).toBe(401);
  });

  it('returns 200 with empty portfolios array for new user', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
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
        'Authorization': `Bearer ${authToken}`,
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
