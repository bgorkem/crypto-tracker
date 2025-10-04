import { describe, it, expect } from 'vitest';

/**
 * CRITICAL: This calculation function requires 100% test coverage per constitution
 * Testing holdings calculation algorithm from data-model.md
 */

// Type definitions (will be replaced with actual types later)
interface Transaction {
  portfolio_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executed_at: Date;
}

interface Holding {
  portfolio_id: string;
  symbol: string;
  total_quantity: number;
  average_cost: number;
  market_value: number;
  unrealized_pl: number;
}

// Placeholder function - will be implemented in lib/calculations/holdings.ts
function calculateHoldings(
  _transactions: Transaction[],
  _currentPrices: Map<string, number>
): Holding[] {
  // This function doesn't exist yet - test should fail
  throw new Error('NOT_IMPLEMENTED: calculateHoldings function not implemented');
}

describe('calculateHoldings', () => {
  it('calculates total quantity for BUY-only transactions', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.5,
        price: 28000,
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.3,
        price: 30000,
        executed_at: new Date('2025-10-02'),
      },
    ];

    const currentPrices = new Map([['BTC', 30000]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    expect(holdings).toHaveLength(1);
    expect(holdings[0].symbol).toBe('BTC');
    expect(holdings[0].total_quantity).toBe(0.8); // 0.5 + 0.3
  });

  it('calculates average cost correctly for multiple BUY transactions', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.5,
        price: 28000, // Cost: 14,000
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.3,
        price: 30000, // Cost: 9,000
        executed_at: new Date('2025-10-02'),
      },
    ];

    const currentPrices = new Map([['BTC', 32000]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Total cost: 14,000 + 9,000 = 23,000
    // Total quantity: 0.8
    // Average cost: 23,000 / 0.8 = 28,750
    expect(holdings[0].average_cost).toBeCloseTo(28750, 2);
  });

  it('reduces quantity correctly for SELL transactions', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 1.0,
        price: 28000,
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'SELL',
        quantity: 0.5,
        price: 30000,
        executed_at: new Date('2025-10-02'),
      },
    ];

    const currentPrices = new Map([['BTC', 30000]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    expect(holdings[0].total_quantity).toBe(0.5); // 1.0 - 0.5
  });

  it('adjusts cost basis proportionally on SELL', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'ETH',
        side: 'BUY',
        quantity: 10.0,
        price: 2000, // Total cost: 20,000
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'ETH',
        side: 'SELL',
        quantity: 5.0, // Sell half
        price: 2200,
        executed_at: new Date('2025-10-02'),
      },
    ];

    const currentPrices = new Map([['ETH', 2100]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Remaining quantity: 5.0
    // Average cost should remain: 2000 (proportional reduction)
    expect(holdings[0].total_quantity).toBe(5.0);
    expect(holdings[0].average_cost).toBeCloseTo(2000, 2);
  });

  it('handles zero holdings after complete SELL', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'SOL',
        side: 'BUY',
        quantity: 100.0,
        price: 20,
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'SOL',
        side: 'SELL',
        quantity: 100.0, // Sell everything
        price: 25,
        executed_at: new Date('2025-10-02'),
      },
    ];

    const currentPrices = new Map([['SOL', 25]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Should return empty holdings or filter out zero quantities
    const solHolding = holdings.find(h => h.symbol === 'SOL');
    if (solHolding) {
      expect(solHolding.total_quantity).toBe(0);
    }
  });

  it('calculates market value correctly', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.5,
        price: 28000,
        executed_at: new Date('2025-10-01'),
      },
    ];

    const currentPrices = new Map([['BTC', 35000]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Market value: 0.5 * 35,000 = 17,500
    expect(holdings[0].market_value).toBe(17500);
  });

  it('calculates unrealized P/L correctly', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.5,
        price: 28000, // Total cost: 14,000
        executed_at: new Date('2025-10-01'),
      },
    ];

    const currentPrices = new Map([['BTC', 32000]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Market value: 0.5 * 32,000 = 16,000
    // Total cost: 14,000
    // Unrealized P/L: 16,000 - 14,000 = 2,000
    expect(holdings[0].unrealized_pl).toBe(2000);
  });

  it('handles negative unrealized P/L (losses)', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 1.0,
        price: 30000, // Bought high
        executed_at: new Date('2025-10-01'),
      },
    ];

    const currentPrices = new Map([['BTC', 25000]]); // Price dropped
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Market value: 1.0 * 25,000 = 25,000
    // Total cost: 30,000
    // Unrealized P/L: 25,000 - 30,000 = -5,000
    expect(holdings[0].unrealized_pl).toBe(-5000);
  });

  it('groups transactions by symbol correctly', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.5,
        price: 28000,
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'ETH',
        side: 'BUY',
        quantity: 10.0,
        price: 1800,
        executed_at: new Date('2025-10-01'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 0.3,
        price: 30000,
        executed_at: new Date('2025-10-02'),
      },
    ];

    const currentPrices = new Map([
      ['BTC', 30000],
      ['ETH', 1900],
    ]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    expect(holdings).toHaveLength(2);
    
    const btcHolding = holdings.find(h => h.symbol === 'BTC');
    const ethHolding = holdings.find(h => h.symbol === 'ETH');
    
    expect(btcHolding).toBeDefined();
    expect(ethHolding).toBeDefined();
    expect(btcHolding?.total_quantity).toBe(0.8); // 0.5 + 0.3
    expect(ethHolding?.total_quantity).toBe(10.0);
  });

  it('processes transactions in chronological order', () => {
    const txns: Transaction[] = [
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'SELL', // This should be processed AFTER the buy
        quantity: 0.2,
        price: 31000,
        executed_at: new Date('2025-10-02'),
      },
      {
        portfolio_id: 'portfolio-1',
        symbol: 'BTC',
        side: 'BUY',
        quantity: 1.0,
        price: 28000,
        executed_at: new Date('2025-10-01'), // Earlier date
      },
    ];

    const currentPrices = new Map([['BTC', 30000]]);
    
    const holdings = calculateHoldings(txns, currentPrices);
    
    // Should process BUY first (Oct 1), then SELL (Oct 2)
    // Resulting quantity: 1.0 - 0.2 = 0.8
    expect(holdings[0].total_quantity).toBe(0.8);
  });
});
