import { describe, it, expect } from 'vitest';
import {
  calculateHoldings,
  type Transaction,
  type Price,
} from '@/lib/calculations';

describe('calculateHoldings', () => {
  it('calculates total quantity for BUY-only transactions', () => {
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
        symbol: 'BTC',
        type: 'BUY',
        quantity: 0.5,
        price_per_unit: 45000,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 50000, change_24h_pct: 5 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings).toHaveLength(1);
    expect(holdings[0].symbol).toBe('BTC');
    expect(holdings[0].total_quantity).toBe(1.5); // 1 + 0.5
  });

  it('calculates average cost correctly for multiple BUY transactions', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'ETH',
        type: 'BUY',
        quantity: 10,
        price_per_unit: 2000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        symbol: 'ETH',
        type: 'BUY',
        quantity: 5,
        price_per_unit: 2500,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      ETH: { symbol: 'ETH', price_usd: 2400, change_24h_pct: 3 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings[0].average_cost).toBeCloseTo(2166.67, 2); // (10*2000 + 5*2500) / 15
  });

  it('reduces quantity correctly for SELL transactions', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'SOL',
        type: 'BUY',
        quantity: 100,
        price_per_unit: 50,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        symbol: 'SOL',
        type: 'SELL',
        quantity: 30,
        price_per_unit: 60,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      SOL: { symbol: 'SOL', price_usd: 65, change_24h_pct: 8 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings[0].total_quantity).toBe(70); // 100 - 30
  });

  it('adjusts cost basis proportionally on SELL', () => {
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
        symbol: 'BTC',
        type: 'SELL',
        quantity: 1,
        price_per_unit: 50000,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 45000, change_24h_pct: 2 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings[0].average_cost).toBe(40000); // Sold half, cost basis unchanged
  });

  it('handles zero holdings after complete SELL', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'MATIC',
        type: 'BUY',
        quantity: 1000,
        price_per_unit: 0.8,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        symbol: 'MATIC',
        type: 'SELL',
        quantity: 1000,
        price_per_unit: 1.0,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      MATIC: { symbol: 'MATIC', price_usd: 0.9, change_24h_pct: -5 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings).toHaveLength(0); // No holdings remaining
  });

  it('calculates market value correctly', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'AVAX',
        type: 'BUY',
        quantity: 50,
        price_per_unit: 30,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      AVAX: { symbol: 'AVAX', price_usd: 35, change_24h_pct: 4 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings[0].market_value).toBe(1750); // 50 * 35
  });

  it('calculates unrealized P/L correctly', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'DOT',
        type: 'BUY',
        quantity: 100,
        price_per_unit: 7,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      DOT: { symbol: 'DOT', price_usd: 10, change_24h_pct: 6 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings[0].unrealized_pl).toBe(300); // (100 * 10) - (100 * 7)
  });

  it('handles negative unrealized P/L (losses)', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'LINK',
        type: 'BUY',
        quantity: 100,
        price_per_unit: 20,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      LINK: { symbol: 'LINK', price_usd: 15, change_24h_pct: -10 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings[0].unrealized_pl).toBe(-500); // (100 * 15) - (100 * 20)
  });

  it('groups transactions by symbol correctly', () => {
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
      {
        id: '3',
        symbol: 'BTC',
        type: 'BUY',
        quantity: 0.5,
        price_per_unit: 45000,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      BTC: { symbol: 'BTC', price_usd: 50000, change_24h_pct: 5 },
      ETH: { symbol: 'ETH', price_usd: 2400, change_24h_pct: 3 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    expect(holdings).toHaveLength(2);
    expect(holdings.find((h) => h.symbol === 'BTC')?.total_quantity).toBe(1.5);
    expect(holdings.find((h) => h.symbol === 'ETH')?.total_quantity).toBe(10);
  });

  it('processes transactions in chronological order', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        symbol: 'XRP',
        type: 'SELL',
        quantity: 500,
        price_per_unit: 0.6,
        transaction_date: '2024-01-03T00:00:00Z',
      },
      {
        id: '2',
        symbol: 'XRP',
        type: 'BUY',
        quantity: 1000,
        price_per_unit: 0.5,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        symbol: 'XRP',
        type: 'BUY',
        quantity: 500,
        price_per_unit: 0.55,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const currentPrices: Record<string, Price> = {
      XRP: { symbol: 'XRP', price_usd: 0.6, change_24h_pct: 2 },
    };

    const holdings = calculateHoldings(transactions, currentPrices);

    // Should process in order: BUY 1000, BUY 500, SELL 500 = 1000 remaining
    expect(holdings[0].total_quantity).toBe(1000);
  });
});
