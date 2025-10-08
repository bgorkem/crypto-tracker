/**
 * Unit Test: calculateHistoricalValue function
 * 
 * Tests the historical portfolio value calculation using date-specific prices
 */

import { describe, it, expect, vi } from 'vitest';
import { calculateHistoricalValue } from '@/lib/calculations';

describe('calculateHistoricalValue', () => {
  it('should calculate value for portfolio with single BTC holding', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: [
                {
                  id: '1',
                  symbol: 'BTC',
                  type: 'BUY',
                  quantity: 0.5,
                  price_per_unit: 30000,
                  transaction_date: '2024-01-01T00:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };

    // Mock price query to return price on second .from() call
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 0.5,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { symbol: 'BTC', price_usd: 50000, price_date: '2024-01-15' },
          ],
          error: null,
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    expect(value).toBe(25000); // 0.5 BTC * $50,000 = $25,000
  });

  it('should calculate value for portfolio with multiple holdings', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 0.5,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
              {
                id: '2',
                symbol: 'ETH',
                type: 'BUY',
                quantity: 10,
                price_per_unit: 2000,
                transaction_date: '2024-01-02T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { symbol: 'BTC', price_usd: 50000, price_date: '2024-01-15' },
            { symbol: 'ETH', price_usd: 3000, price_date: '2024-01-15' },
          ],
          error: null,
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    // 0.5 BTC * $50,000 + 10 ETH * $3,000 = $25,000 + $30,000 = $55,000
    expect(value).toBe(55000);
  });

  it('should only count transactions up to the specified date', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 0.5,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
              // This transaction is on Jan 10, should be included
              {
                id: '2',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 0.3,
                price_per_unit: 35000,
                transaction_date: '2024-01-10T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { symbol: 'BTC', price_usd: 40000, price_date: '2024-01-15' },
          ],
          error: null,
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    // 0.8 BTC (0.5 + 0.3) * $40,000 = $32,000
    expect(value).toBe(32000);
  });

  it('should handle SELL transactions correctly', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 1.0,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
              {
                id: '2',
                symbol: 'BTC',
                type: 'SELL',
                quantity: 0.4,
                price_per_unit: 35000,
                transaction_date: '2024-01-10T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { symbol: 'BTC', price_usd: 40000, price_date: '2024-01-15' },
          ],
          error: null,
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    // Remaining: 0.6 BTC * $40,000 = $24,000
    expect(value).toBe(24000);
  });

  it('should return 0 for portfolio with no transactions before date', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    };

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    expect(value).toBe(0);
  });

  it('should return 0 when all positions are closed (sold)', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 1.0,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
              {
                id: '2',
                symbol: 'BTC',
                type: 'SELL',
                quantity: 1.0,
                price_per_unit: 35000,
                transaction_date: '2024-01-10T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    expect(value).toBe(0);
  });

  it('should handle missing historical price data gracefully', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 0.5,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [], // No prices available
          error: null,
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    // Should return 0 when price data is missing
    expect(value).toBe(0);
  });

  it('should use available prices and skip symbols without prices', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                symbol: 'BTC',
                type: 'BUY',
                quantity: 0.5,
                price_per_unit: 30000,
                transaction_date: '2024-01-01T00:00:00Z',
              },
              {
                id: '2',
                symbol: 'ETH',
                type: 'BUY',
                quantity: 10,
                price_per_unit: 2000,
                transaction_date: '2024-01-02T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            // Only BTC price available, ETH missing
            { symbol: 'BTC', price_usd: 50000, price_date: '2024-01-15' },
          ],
          error: null,
        }),
      }),
    });

    const value = await calculateHistoricalValue(
      'portfolio-1',
      new Date('2024-01-15'),
      mockSupabase as never
    );

    // Only BTC should be counted: 0.5 * $50,000 = $25,000
    // ETH skipped due to missing price
    expect(value).toBe(25000);
  });
});
