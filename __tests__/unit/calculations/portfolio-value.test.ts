import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioValue,
  calculateHoldings,
  type Transaction,
  type Price,
} from '../../../src/lib/calculations';

describe('calculatePortfolioValue', () => {
  it('calculates total portfolio value from multiple holdings', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
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
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 50000, change_24h_pct: 5 },
      ETH: { symbol: 'ETH', price_usd: 2500, change_24h_pct: 3 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculatePortfolioValue(holdings, Object.values(currentPrices));

    expect(result.total_value).toBe(75000); // (1 * 50000) + (10 * 2500)
    expect(result.total_cost).toBe(60000); // (1 * 40000) + (10 * 2000)
    expect(result.total_pl).toBe(15000); // 75000 - 60000
    expect(result.total_pl_pct).toBeCloseTo(25, 2); // (15000 / 60000) * 100
    expect(result.holdings_count).toBe(2);
  });

  it('handles single holding portfolio', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'BTC',
        type: 'BUY',
        quantity: 0.5,
        price_per_unit: 45000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 50000, change_24h_pct: 5 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculatePortfolioValue(holdings, [currentPrices.BTC]);

    expect(result.total_value).toBe(25000); // 0.5 * 50000
    expect(result.total_cost).toBe(22500); // 0.5 * 45000
    expect(result.total_pl).toBe(2500); // 25000 - 22500
    expect(result.total_pl_pct).toBeCloseTo(11.11, 2);
    expect(result.holdings_count).toBe(1);
  });

  it('returns zero values for empty portfolio', () => {
    const result = calculatePortfolioValue([], []);

    expect(result.total_value).toBe(0);
    expect(result.total_cost).toBe(0);
    expect(result.total_pl).toBe(0);
    expect(result.total_pl_pct).toBe(0);
    expect(result.holdings_count).toBe(0);
  });

  it('includes timestamp in result', () => {
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

    const beforeTime = new Date().toISOString();
    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculatePortfolioValue(holdings, [currentPrices.BTC]);
    const afterTime = new Date().toISOString();

    expect(result.last_updated).toBeDefined();
    expect(result.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.last_updated >= beforeTime).toBe(true);
    expect(result.last_updated <= afterTime).toBe(true);
  });

  it('handles portfolio with negative P/L', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
        price_per_unit: 60000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        symbol: 'ETH',
        type: 'BUY',
        quantity: 10,
        price_per_unit: 3000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 50000, change_24h_pct: -5 },
      ETH: { symbol: 'ETH', price_usd: 2500, change_24h_pct: -10 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);
    const result = calculatePortfolioValue(holdings, Object.values(currentPrices));

    expect(result.total_value).toBe(75000);
    expect(result.total_cost).toBe(90000);
    expect(result.total_pl).toBe(-15000);
    expect(result.total_pl_pct).toBeCloseTo(-16.67, 2);
  });
});
