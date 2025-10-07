import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

const PriceSchema = z.object({
  symbol: z.string(),
  price_usd: z.number().positive(),
  market_cap: z.number().nonnegative(),
  volume_24h: z.number().nonnegative(),
  change_24h_pct: z.number(),
  last_updated: z.string(),
});

const PriceResponseSchema = z.object({
  data: z.array(PriceSchema),
});

describe('GET /api/prices', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;

  beforeAll(async () => {
    const { token } = await createTestUser('pricesuser');
    authToken = token;
  });

  it('returns 200 with prices for specified symbols', async () => {
    const response = await fetch(
      `${BASE_URL}/api/prices?symbols=BTC,ETH,SOL`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = PriceResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.length).toBe(3);
      const symbols = validationResult.data.data.map(p => p.symbol);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('SOL');
    }
  });

  it('returns 400 BAD_REQUEST when symbols parameter is missing', async () => {
    const response = await fetch(`${BASE_URL}/api/prices`, {
      headers: createAuthHeaders(authToken),
    });

    expect(response.status).toBe(400);
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/prices?symbols=BTC`);

    expect(response.status).toBe(401);
  });

  it('caches prices for 30 seconds', async () => {
    // First request
    const response1 = await fetch(`${BASE_URL}/api/prices?symbols=BTC`, {
      headers: createAuthHeaders(authToken),
    });

    if (response1.ok) {
      const cacheControl = response1.headers.get('Cache-Control');
      expect(cacheControl).toContain('max-age=30');
    }
  });
});
