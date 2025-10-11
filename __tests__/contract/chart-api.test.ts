/**
 * Contract tests for chart API endpoint
 * Tests API response structure and behavior for backward compatibility
 * 
 * TDD: These tests are written FIRST and will initially fail
 * Implementation in app/api/portfolios/[id]/chart/route.ts will make them pass
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

// Response schema for chart API (backward compatibility)
const ChartResponseSchema = z.object({
  data: z.object({
    interval: z.enum(['24h', '7d', '30d', '90d', 'all']),
    snapshots: z.array(z.object({
      snapshot_date: z.string(),
      total_value: z.string(),
      total_cost: z.string(),
      total_pl: z.string(),
      total_pl_pct: z.string(),
      holdings_count: z.number(),
    })),
    current_value: z.string(),
    start_value: z.string(),
    change_abs: z.string(),
    change_pct: z.string(),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

describe('GET /api/portfolios/[id]/chart', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    // Create test user and portfolio
    const { token } = await createTestUser('chartapi');
    authToken = token;

    // Create a test portfolio
    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Test Chart Portfolio',
        description: 'For chart API tests',
      }),
    });

    const portfolioData = await portfolioResponse.json();
    portfolioId = portfolioData.data.id;
  });

  it('returns 200 with correct response structure for interval=30d', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=30d`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    
    // Validate response structure
    const result = ChartResponseSchema.safeParse(data);
    
    if (!result.success) {
      console.error('Validation errors:', result.error.errors);
    }
    
    expect(result.success).toBe(true);
    
    // Verify interval matches request
    expect(data.data.interval).toBe('30d');
    
    // Snapshots should be an array (may be empty for new portfolio)
    expect(Array.isArray(data.data.snapshots)).toBe(true);
    
    // All required fields should be present
    expect(data.data).toHaveProperty('current_value');
    expect(data.data).toHaveProperty('start_value');
    expect(data.data).toHaveProperty('change_abs');
    expect(data.data).toHaveProperty('change_pct');
  });

  it('returns 400 for invalid interval parameter', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=invalid`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    const result = ErrorResponseSchema.safeParse(data);
    
    expect(result.success).toBe(true);
    expect(data.error.code).toBe('INVALID_INTERVAL');
  });

  it('returns 401 for unauthorized access (no auth token)', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=30d`
    );

    expect(response.status).toBe(401);

    const data = await response.json();
    const result = ErrorResponseSchema.safeParse(data);
    
    expect(result.success).toBe(true);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns correct data for all supported intervals', async () => {
    const intervals = ['24h', '7d', '30d', '90d', 'all'] as const;

    for (const interval of intervals) {
      const response = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=${interval}`,
        {
          headers: createAuthHeaders(authToken),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      const result = ChartResponseSchema.safeParse(data);
      
      expect(result.success).toBe(true);
      expect(data.data.interval).toBe(interval);
    }
  });

  it('returns 404 for non-existent portfolio', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${nonExistentId}/chart?interval=30d`,
      {
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(404);

    const data = await response.json();
    const result = ErrorResponseSchema.safeParse(data);
    
    expect(result.success).toBe(true);
    expect(data.error.code).toBe('PORTFOLIO_NOT_FOUND');
  });

  it('returns 403 for portfolio owned by different user', async () => {
    // Create another user
    const { token: otherToken } = await createTestUser('chartapi-other');

    // Try to access first user's portfolio
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=30d`,
      {
        headers: createAuthHeaders(otherToken),
      }
    );

    expect(response.status).toBe(403);

    const data = await response.json();
    const result = ErrorResponseSchema.safeParse(data);
    
    expect(result.success).toBe(true);
    expect(data.error.code).toBe('FORBIDDEN');
  });
});
