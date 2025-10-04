import { describe, it, expect } from 'vitest';

interface Holding {
  symbol: string;
  total_quantity: number;
  average_cost: number;
}

interface Price {
  symbol: string;
  price_usd: number;
  change_24h_pct: number;
}

interface UnrealizedPL {
  symbol: string;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  market_value: number;
  total_cost: number;
}

/**
 * Calculate unrealized profit/loss for each holding
 * @param holdings - Current holdings with quantity and average cost
 * @param currentPrices - Current market prices
 * @returns Unrealized P/L for each holding
 */
function calculateUnrealizedPL(_holdings: Holding[], _currentPrices: Price[]): UnrealizedPL[] {
  throw new Error('NOT_IMPLEMENTED');
}

describe('calculateUnrealizedPL', () => {
  it('calculates unrealized profit for holdings in profit', () => {
    const holdings: Holding[] = [
      {
        symbol: 'BTC',
        total_quantity: 1,
        average_cost: 40000,
      },
    ];

    const currentPrices: Price[] = [
      {
        symbol: 'BTC',
        price_usd: 50000,
        change_24h_pct: 5,
      },
    ];

    const result = calculateUnrealizedPL(holdings, currentPrices);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('BTC');
    expect(result[0].market_value).toBe(50000); // 1 * 50000
    expect(result[0].total_cost).toBe(40000); // 1 * 40000
    expect(result[0].unrealized_pl).toBe(10000); // 50000 - 40000
    expect(result[0].unrealized_pl_pct).toBeCloseTo(25, 2); // (10000 / 40000) * 100
  });

  it('calculates unrealized loss for holdings at a loss', () => {
    const holdings: Holding[] = [
      {
        symbol: 'ETH',
        total_quantity: 10,
        average_cost: 3000,
      },
    ];

    const currentPrices: Price[] = [
      {
        symbol: 'ETH',
        price_usd: 2500,
        change_24h_pct: -10,
      },
    ];

    const result = calculateUnrealizedPL(holdings, currentPrices);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('ETH');
    expect(result[0].market_value).toBe(25000); // 10 * 2500
    expect(result[0].total_cost).toBe(30000); // 10 * 3000
    expect(result[0].unrealized_pl).toBe(-5000); // 25000 - 30000
    expect(result[0].unrealized_pl_pct).toBeCloseTo(-16.67, 2); // (-5000 / 30000) * 100
  });

  it('calculates P/L for multiple holdings', () => {
    const holdings: Holding[] = [
      { symbol: 'BTC', total_quantity: 2, average_cost: 40000 },
      { symbol: 'ETH', total_quantity: 10, average_cost: 2000 },
      { symbol: 'SOL', total_quantity: 100, average_cost: 50 },
    ];

    const currentPrices: Price[] = [
      { symbol: 'BTC', price_usd: 45000, change_24h_pct: 5 },
      { symbol: 'ETH', price_usd: 2200, change_24h_pct: 3 },
      { symbol: 'SOL', price_usd: 60, change_24h_pct: 8 },
    ];

    const result = calculateUnrealizedPL(holdings, currentPrices);

    expect(result).toHaveLength(3);
    
    // BTC: market 90000, cost 80000, P/L 10000 (12.5%)
    const btc = result.find(r => r.symbol === 'BTC');
    expect(btc?.unrealized_pl).toBe(10000);
    expect(btc?.unrealized_pl_pct).toBeCloseTo(12.5, 2);

    // ETH: market 22000, cost 20000, P/L 2000 (10%)
    const eth = result.find(r => r.symbol === 'ETH');
    expect(eth?.unrealized_pl).toBe(2000);
    expect(eth?.unrealized_pl_pct).toBeCloseTo(10, 2);

    // SOL: market 6000, cost 5000, P/L 1000 (20%)
    const sol = result.find(r => r.symbol === 'SOL');
    expect(sol?.unrealized_pl).toBe(1000);
    expect(sol?.unrealized_pl_pct).toBeCloseTo(20, 2);
  });

  it('handles holdings with zero cost basis (edge case)', () => {
    const holdings: Holding[] = [
      {
        symbol: 'FREE',
        total_quantity: 100,
        average_cost: 0,
      },
    ];

    const currentPrices: Price[] = [
      {
        symbol: 'FREE',
        price_usd: 10,
        change_24h_pct: 0,
      },
    ];

    const result = calculateUnrealizedPL(holdings, currentPrices);

    expect(result).toHaveLength(1);
    expect(result[0].market_value).toBe(1000);
    expect(result[0].total_cost).toBe(0);
    expect(result[0].unrealized_pl).toBe(1000);
    // P/L % should be Infinity or handled gracefully
    expect(result[0].unrealized_pl_pct).toBeDefined();
  });

  it('returns empty array when no holdings', () => {
    const result = calculateUnrealizedPL([], []);

    expect(result).toEqual([]);
  });
});
