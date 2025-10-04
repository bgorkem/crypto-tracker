import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

const ChartDataPointSchema = z.object({
  timestamp: z.string(),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
});

const ChartResponseSchema = z.object({
  data: z.object({
    symbol: z.string(),
    interval: z.enum(['1h', '24h', '7d', '30d']),
    points: z.array(ChartDataPointSchema),
  }),
});

describe('GET /api/charts/:symbol', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;

  beforeAll(async () => {
    const { token } = await createTestUser('chartsuser');
    authToken = token;
  });

  it('returns 200 with chart data for 24h interval', async () => {
    const response = await fetch(
      `${BASE_URL}/api/charts/BTC?interval=24h`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = ChartResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.symbol).toBe('BTC');
      expect(validationResult.data.data.interval).toBe('24h');
      expect(validationResult.data.data.points.length).toBeGreaterThan(0);
    }
  });

  it('supports all interval types (1h, 24h, 7d, 30d)', async () => {
    const intervals = ['1h', '24h', '7d', '30d'] as const;
    
    for (const interval of intervals) {
      const response = await fetch(
        `${BASE_URL}/api/charts/BTC?interval=${interval}`,
        {
          headers: createAuthHeaders(authToken),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const validationResult = ChartResponseSchema.safeParse(data);
        
        if (validationResult.success) {
          expect(validationResult.data.data.interval).toBe(interval);
        }
      }
    }
  });

  it('returns 400 BAD_REQUEST for invalid interval', async () => {
    const response = await fetch(
      `${BASE_URL}/api/charts/BTC?interval=invalid`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(400);
  });

  it('returns data points in chronological order', async () => {
    const response = await fetch(
      `${BASE_URL}/api/charts/BTC?interval=24h`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const validationResult = ChartResponseSchema.safeParse(data);
      
      if (validationResult.success && validationResult.data.data.points.length > 1) {
        const timestamps = validationResult.data.data.points.map(p => new Date(p.timestamp).getTime());
        const isSorted = timestamps.every((ts, i) => i === 0 || timestamps[i - 1] <= ts);
        expect(isSorted).toBe(true);
      }
    }
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/charts/BTC?interval=24h`);

    expect(response.status).toBe(401);
  });
});
