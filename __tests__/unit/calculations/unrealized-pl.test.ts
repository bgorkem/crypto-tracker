import { describe, it, expect } from 'vitest';
import {
  calculateUnrealizedPL,
  calculateHoldings,
  type Transaction,
  type Price,
} from '../../../src/lib/calculations';

describe('calculateUnrealizedPL', () => {
  it('calculates unrealized profit for holdings in profit', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
        price_per_unit: 40000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 50000, change_24h_pct: 5 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculateUnrealizedPL(holdings, [currentPrices.BTC]);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('BTC');
    expect(result[0].market_value).toBe(50000); // 1 * 50000
    expect(result[0].total_cost).toBe(40000); // 1 * 40000
    expect(result[0].unrealized_pl).toBe(10000); // 50000 - 40000
    expect(result[0].unrealized_pl_pct).toBeCloseTo(25, 2); // (10000 / 40000) * 100
  });

  it('calculates unrealized loss for holdings at a loss', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'ETH',
        type: 'BUY',
        quantity: 10,
        price_per_unit: 3000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      ETH: { symbol: 'ETH', price_usd: 2500, change_24h_pct: -10 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculateUnrealizedPL(holdings, [currentPrices.ETH]);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('ETH');
    expect(result[0].market_value).toBe(25000); // 10 * 2500
    expect(result[0].total_cost).toBe(30000); // 10 * 3000
    expect(result[0].unrealized_pl).toBe(-5000); // 25000 - 30000
    expect(result[0].unrealized_pl_pct).toBeCloseTo(-16.67, 2); // (-5000 / 30000) * 100
  });

  it('calculates P/L for multiple holdings', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'BTC',
        type: 'BUY',
        quantity: 2,
        price_per_unit: 40000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        symbol: 'ETH',
        type: 'BUY',
        quantity: 10,
        price_per_unit: 2000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        symbol: 'SOL',
        type: 'BUY',
        quantity: 100,
        price_per_unit: 50,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 45000, change_24h_pct: 5 },
      ETH: { symbol: 'ETH', price_usd: 2200, change_24h_pct: 3 },
      SOL: { symbol: 'SOL', price_usd: 60, change_24h_pct: 8 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculateUnrealizedPL(holdings, Object.values(currentPrices));

    expect(result).toHaveLength(3);

    // BTC: market 90000, cost 80000, P/L 10000 (12.5%)
    const btc = result.find((r) => r.symbol === 'BTC');
    expect(btc?.unrealized_pl).toBe(10000);
    expect(btc?.unrealized_pl_pct).toBeCloseTo(12.5, 2);

    // ETH: market 22000, cost 20000, P/L 2000 (10%)
    const eth = result.find((r) => r.symbol === 'ETH');
    expect(eth?.unrealized_pl).toBe(2000);
    expect(eth?.unrealized_pl_pct).toBeCloseTo(10, 2);

    // SOL: market 6000, cost 5000, P/L 1000 (20%)
    const sol = result.find((r) => r.symbol === 'SOL');
    expect(sol?.unrealized_pl).toBe(1000);
    expect(sol?.unrealized_pl_pct).toBeCloseTo(20, 2);
  });

  it('handles holdings with zero cost basis (edge case)', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'FREE',
        type: 'BUY',
        quantity: 100,
        price_per_unit: 0,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      FREE: { symbol: 'FREE', price_usd: 10, change_24h_pct: 0 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculateUnrealizedPL(holdings, [currentPrices.FREE]);

    expect(result).toHaveLength(1);
    expect(result[0].market_value).toBe(1000);
    expect(result[0].total_cost).toBe(0);
    expect(result[0].unrealized_pl).toBe(1000);
    expect(result[0].unrealized_pl_pct).toBe(0); // Division by zero handled
  });

  it('returns empty array when no holdings', () => {
    const result = calculateUnrealizedPL([], []);

    expect(result).toEqual([]);
  });
});
