import { describe, it, expect } from 'vitest';

interface Holding {
  symbol: string;
  total_quantity: number;
  average_cost: number;
}

interface Price {
  symbol: string;
  price_usd: number;
}

interface PortfolioValue {
  total_value: number;
  total_cost: number;
  total_pl: number;
  total_pl_pct: number;
  holdings_count: number;
  last_updated: string;
}

/**
 * Calculate total portfolio value from holdings and current prices
 * @param holdings - Current holdings with quantity and average cost
 * @param currentPrices - Current market prices
 * @returns Aggregated portfolio value metrics
 */
function calculatePortfolioValue(_holdings: Holding[], _currentPrices: Price[]): PortfolioValue {
  throw new Error('NOT_IMPLEMENTED');
}

describe('calculatePortfolioValue', () => {
  it('calculates total portfolio value from multiple holdings', () => {
    const holdings: Holding[] = [
      { symbol: 'BTC', total_quantity: 1, average_cost: 40000 },
      { symbol: 'ETH', total_quantity: 10, average_cost: 2000 },
    ];

    const currentPrices: Price[] = [
      { symbol: 'BTC', price_usd: 50000 },
      { symbol: 'ETH', price_usd: 2500 },
    ];

    const result = calculatePortfolioValue(holdings, currentPrices);

    expect(result.total_value).toBe(75000); // (1 * 50000) + (10 * 2500)
    expect(result.total_cost).toBe(60000); // (1 * 40000) + (10 * 2000)
    expect(result.total_pl).toBe(15000); // 75000 - 60000
    expect(result.total_pl_pct).toBeCloseTo(25, 2); // (15000 / 60000) * 100
    expect(result.holdings_count).toBe(2);
  });

  it('handles single holding portfolio', () => {
    const holdings: Holding[] = [
      { symbol: 'BTC', total_quantity: 0.5, average_cost: 45000 },
    ];

    const currentPrices: Price[] = [
      { symbol: 'BTC', price_usd: 50000 },
    ];

    const result = calculatePortfolioValue(holdings, currentPrices);

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
    const holdings: Holding[] = [
      { symbol: 'BTC', total_quantity: 1, average_cost: 40000 },
    ];

    const currentPrices: Price[] = [
      { symbol: 'BTC', price_usd: 50000 },
    ];

    const beforeTime = new Date().toISOString();
    const result = calculatePortfolioValue(holdings, currentPrices);
    const afterTime = new Date().toISOString();

    expect(result.last_updated).toBeDefined();
    expect(result.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.last_updated >= beforeTime).toBe(true);
    expect(result.last_updated <= afterTime).toBe(true);
  });

  it('handles portfolio with negative P/L', () => {
    const holdings: Holding[] = [
      { symbol: 'BTC', total_quantity: 1, average_cost: 60000 },
      { symbol: 'ETH', total_quantity: 10, average_cost: 3000 },
    ];

    const currentPrices: Price[] = [
      { symbol: 'BTC', price_usd: 50000 },
      { symbol: 'ETH', price_usd: 2500 },
    ];

    const result = calculatePortfolioValue(holdings, currentPrices);

    expect(result.total_value).toBe(75000);
    expect(result.total_cost).toBe(90000);
    expect(result.total_pl).toBe(-15000);
    expect(result.total_pl_pct).toBeCloseTo(-16.67, 2);
  });
});
