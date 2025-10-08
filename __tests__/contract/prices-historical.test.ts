/**
 * Contract Test: GET /api/prices/historical
 * 
 * Validates the API contract for fetching historical cryptocurrency prices
 * 
 * TDD: This test should FAIL initially until T101 is implemented
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser } from '../helpers/auth-helpers';
import { createClient } from '@supabase/supabase-js';

describe('Contract: GET /api/prices/historical', () => {
  let authToken: string;

  beforeEach(async () => {
    const testUser = await createTestUser();
    authToken = testUser.token;
  });

  it('should fetch historical prices for single symbol', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC&date=2025-10-07',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          symbol: 'BTC',
          price_usd: expect.any(Number),
          price_date: '2025-10-07',
        }),
      ]),
    });
  });

  it('should fetch historical prices for multiple symbols', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC,ETH,SOL&date=2025-10-07',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(3);
    
    const symbols = data.data.map((p: { symbol: string }) => p.symbol);
    expect(symbols).toContain('BTC');
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('SOL');

    data.data.forEach((price: { symbol: string; price_usd: number; price_date: string }) => {
      expect(price.price_usd).toBeGreaterThan(0);
      expect(price.price_date).toBe('2025-10-07');
    });
  });

  it('should filter out unsupported symbols', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC,DOGE,INVALID&date=2025-10-07',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].symbol).toBe('BTC');
  });

  it('should return 400 for missing date parameter', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toMatchObject({
      success: false,
      error: expect.objectContaining({
        message: expect.stringContaining('date'),
      }),
    });
  });

  it('should return 400 for invalid date format', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC&date=invalid-date',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toMatchObject({
      success: false,
      error: expect.objectContaining({
        message: expect.stringContaining('date'),
      }),
    });
  });

  it('should return 400 for missing symbols parameter', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?date=2025-10-07',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toMatchObject({
      success: false,
      error: expect.objectContaining({
        message: expect.stringContaining('symbols'),
      }),
    });
  });

  it('should cache prices in price_cache table', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // First request - fetches from CoinGecko
    const response1 = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC&date=2025-10-07',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    const firstPrice = data1.data[0].price_usd;

    // Check database for cached price
    const { data: cachedPrice } = await supabase
      .from('price_cache')
      .select('*')
      .eq('symbol', 'BTC')
      .eq('price_date', '2025-10-07')
      .single();

    expect(cachedPrice).toBeTruthy();
    expect(cachedPrice?.price_usd).toBe(firstPrice);

    // Second request - should use cached data
    const response2 = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC&date=2025-10-07',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2.data[0].price_usd).toBe(firstPrice);
  });

  it('should handle future dates gracefully', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];

    const response = await fetch(
      `http://localhost:3000/api/prices/historical?symbols=BTC&date=${dateStr}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Future dates might not have data, but API should handle gracefully
    expect([200, 400]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await fetch(
      'http://localhost:3000/api/prices/historical?symbols=BTC&date=2025-10-07'
    );

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toMatchObject({
      success: false,
      error: expect.objectContaining({
        message: expect.stringContaining('unauthorized'),
      }),
    });
  });
});
