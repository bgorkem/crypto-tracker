import { describe, it, expect } from 'vitest';

interface Transaction {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
}

/**
 * Calculate the proportional cost basis for a SELL transaction using FIFO
 * @param symbol - The cryptocurrency symbol
 * @param sellQuantity - The quantity being sold
 * @param transactions - All transactions for the symbol, in chronological order
 * @returns The cost basis for the sold quantity
 */
function calculateCostBasis(_symbol: string, _sellQuantity: number, _transactions: Transaction[]): number {
  throw new Error('NOT_IMPLEMENTED');
}

describe('calculateCostBasis', () => {
  it('calculates cost basis for full position SELL using FIFO', () => {
    const transactions: Transaction[] = [
      {
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
        price_per_unit: 40000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
        price_per_unit: 45000,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const costBasis = calculateCostBasis('BTC', 2, transactions);

    // FIFO: (1 * 40000) + (1 * 45000) = 85000
    expect(costBasis).toBe(85000);
  });

  it('calculates cost basis for partial position SELL using FIFO', () => {
    const transactions: Transaction[] = [
      {
        symbol: 'ETH',
        type: 'BUY',
        quantity: 10,
        price_per_unit: 2000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        symbol: 'ETH',
        type: 'BUY',
        quantity: 5,
        price_per_unit: 2500,
        transaction_date: '2024-01-02T00:00:00Z',
      },
    ];

    const costBasis = calculateCostBasis('ETH', 12, transactions);

    // FIFO: (10 * 2000) + (2 * 2500) = 20000 + 5000 = 25000
    expect(costBasis).toBe(25000);
  });

  it('calculates cost basis from single purchase', () => {
    const transactions: Transaction[] = [
      {
        symbol: 'SOL',
        type: 'BUY',
        quantity: 100,
        price_per_unit: 50,
        transaction_date: '2024-01-01T00:00:00Z',
      },
    ];

    const costBasis = calculateCostBasis('SOL', 50, transactions);

    // 50 * 50 = 2500
    expect(costBasis).toBe(2500);
  });

  it('handles SELL transactions in chronological order', () => {
    const transactions: Transaction[] = [
      {
        symbol: 'BTC',
        type: 'BUY',
        quantity: 3,
        price_per_unit: 40000,
        transaction_date: '2024-01-01T00:00:00Z',
      },
      {
        symbol: 'BTC',
        type: 'SELL',
        quantity: 1,
        price_per_unit: 50000,
        transaction_date: '2024-01-02T00:00:00Z',
      },
      {
        symbol: 'BTC',
        type: 'BUY',
        quantity: 2,
        price_per_unit: 45000,
        transaction_date: '2024-01-03T00:00:00Z',
      },
    ];

    const costBasis = calculateCostBasis('BTC', 3, transactions);

    // After first SELL of 1, remaining from first BUY: 2 @ 40000
    // FIFO for 3: (2 * 40000) + (1 * 45000) = 80000 + 45000 = 125000
    expect(costBasis).toBe(125000);
  });
});
