/**
 * Core calculation functions for cryptocurrency portfolio holdings
 * 
 * Implements event-sourced calculations from transaction history.
 * Uses FIFO (First In, First Out) for cost basis calculations.
 */

export interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
}

export interface Holding {
  symbol: string;
  total_quantity: number;
  average_cost: number;
  market_value: number;
  unrealized_pl: number;
  current_price: number;
  price_change_24h_pct: number | null;
}

export interface Price {
  symbol: string;
  price_usd: number;
  change_24h_pct: number;
}

/**
 * Calculate current holdings from transaction history
 * @param transactions - All transactions for a portfolio
 * @param currentPrices - Current market prices for all symbols
 * @returns Array of holdings with calculated values
 */
export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, Price>
): Holding[] {
  // Group transactions by symbol
  const symbolMap = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    if (!symbolMap.has(txn.symbol)) {
      symbolMap.set(txn.symbol, []);
    }
    symbolMap.get(txn.symbol)!.push(txn);
  }

  const holdings: Holding[] = [];

  for (const [symbol, symbolTxns] of symbolMap.entries()) {
    // Sort by transaction date (chronological order)
    const sortedTxns = symbolTxns.sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime()
    );

    let totalQuantity = 0;
    let totalCost = 0;

    // Process transactions chronologically
    for (const txn of sortedTxns) {
      if (txn.type === 'BUY') {
        totalQuantity += txn.quantity;
        totalCost += txn.quantity * txn.price_per_unit;
      } else if (txn.type === 'SELL') {
        // Calculate proportional cost basis reduction
        const sellRatio = txn.quantity / totalQuantity;
        const costReduction = totalCost * sellRatio;

        totalQuantity -= txn.quantity;
        totalCost -= costReduction;
      }
    }

    // Only include holdings with positive quantity
    if (totalQuantity > 0) {
      const averageCost = totalCost / totalQuantity;
      const currentPrice = currentPrices[symbol]?.price_usd || 0;
      const marketValue = totalQuantity * currentPrice;
      const unrealizedPL = marketValue - totalCost;

      holdings.push({
        symbol,
        total_quantity: totalQuantity,
        average_cost: averageCost,
        market_value: marketValue,
        unrealized_pl: unrealizedPL,
        current_price: currentPrice,
        price_change_24h_pct: currentPrices[symbol]?.change_24h_pct || null,
      });
    }
  }

  return holdings;
}

/**
 * Calculate cost basis for a SELL transaction using FIFO
 * @param symbol - Cryptocurrency symbol
 * @param sellQuantity - Quantity being sold
 * @param transactions - All transactions for the symbol (chronological)
 * @returns Cost basis for the sold quantity
 */
export function calculateCostBasis(
  symbol: string,
  sellQuantity: number,
  transactions: Transaction[]
): number {
  // Filter and sort transactions for this symbol
  const symbolTxns = transactions
    .filter((t) => t.symbol === symbol)
    .sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime()
    );

  let remainingToSell = sellQuantity;
  let costBasis = 0;

  // Track remaining quantities from each BUY
  const buyQueue: Array<{ quantity: number; price: number }> = [];

  for (const txn of symbolTxns) {
    if (txn.type === 'BUY') {
      buyQueue.push({
        quantity: txn.quantity,
        price: txn.price_per_unit,
      });
    } else if (txn.type === 'SELL') {
      // Remove sold quantities from buy queue (FIFO)
      let sellRemaining = txn.quantity;

      while (sellRemaining > 0 && buyQueue.length > 0) {
        const firstBuy = buyQueue[0];
        const takeQuantity = Math.min(sellRemaining, firstBuy.quantity);

        firstBuy.quantity -= takeQuantity;
        sellRemaining -= takeQuantity;

        if (firstBuy.quantity === 0) {
          buyQueue.shift();
        }
      }
    }
  }

  // Calculate cost basis from remaining buy queue
  while (remainingToSell > 0 && buyQueue.length > 0) {
    const firstBuy = buyQueue[0];
    const takeQuantity = Math.min(remainingToSell, firstBuy.quantity);

    costBasis += takeQuantity * firstBuy.price;
    remainingToSell -= takeQuantity;
    firstBuy.quantity -= takeQuantity;

    if (firstBuy.quantity === 0) {
      buyQueue.shift();
    }
  }

  return costBasis;
}

/**
 * Calculate unrealized profit/loss for holdings
 * @param holdings - Current holdings
 * @param currentPrices - Current market prices
 * @returns Unrealized P/L for each holding
 */
export function calculateUnrealizedPL(
  holdings: Holding[],
  _currentPrices: Price[]
): Array<{
  symbol: string;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  market_value: number;
  total_cost: number;
}> {
  return holdings.map((holding) => {
    const totalCost = holding.total_quantity * holding.average_cost;
    const unrealizedPL = holding.unrealized_pl;
    const unrealizedPLPct =
      totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

    return {
      symbol: holding.symbol,
      unrealized_pl: unrealizedPL,
      unrealized_pl_pct: unrealizedPLPct,
      market_value: holding.market_value,
      total_cost: totalCost,
    };
  });
}

/**
 * Calculate total portfolio value
 * @param holdings - Current holdings
 * @param currentPrices - Current market prices
 * @returns Aggregated portfolio metrics
 */
export function calculatePortfolioValue(
  holdings: Holding[],
  _currentPrices: Price[]
): {
  total_value: number;
  total_cost: number;
  total_pl: number;
  total_pl_pct: number;
  holdings_count: number;
  last_updated: string;
} {
  let totalValue = 0;
  let totalCost = 0;

  for (const holding of holdings) {
    totalValue += holding.market_value;
    totalCost += holding.total_quantity * holding.average_cost;
  }

  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  return {
    total_value: totalValue,
    total_cost: totalCost,
    total_pl: totalPL,
    total_pl_pct: totalPLPct,
    holdings_count: holdings.length,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Calculate historical portfolio value at a specific date
 * @param portfolioId - Portfolio UUID
 * @param date - Date to calculate value for
 * @param supabase - Supabase client instance
 * @returns Total portfolio value in USD
 */
export async function calculateHistoricalValue(
  portfolioId: string,
  date: Date,
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          lte: (column: string, value: string) => Promise<{
            data: Transaction[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  }
): Promise<number> {
  // 1. Fetch all transactions up to the specified date
  const { data: transactions, error: txnError } = await supabase
    .from('transactions')
    .select('id, symbol, type, quantity, price_per_unit, transaction_date')
    .eq('portfolio_id', portfolioId)
    .lte('transaction_date', date.toISOString());

  if (txnError) {
    throw new Error(`Failed to fetch transactions: ${txnError.message}`);
  }

  // 2. Return 0 if no transactions
  if (!transactions || transactions.length === 0) {
    return 0;
  }

  // 3. Calculate holdings using existing calculateHoldings function
  // We need to provide prices, but we'll use dummy prices since we only need quantities
  const dummyPrices: Record<string, Price> = {};
  const holdings = calculateHoldings(transactions, dummyPrices);

  // 4. Return 0 if no open positions
  if (holdings.length === 0) {
    return 0;
  }

  // 5. Fetch historical prices for all symbols from price_cache
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

  const { data: prices, error: priceError } = await (supabase
    .from('price_cache')
    .select('symbol, price_usd, price_date')
    .eq('price_date', dateString) as unknown as Promise<{
    data:
      | Array<{ symbol: string; price_usd: number; price_date: string }>
      | null;
    error: { message: string } | null;
  }>);

  if (priceError) {
    throw new Error(`Failed to fetch historical prices: ${priceError.message}`);
  }

  // 6. Build price lookup map
  const priceMap = new Map<string, number>();
  if (prices) {
    for (const price of prices) {
      priceMap.set(price.symbol, price.price_usd);
    }
  }

  // 7. Calculate total value
  let totalValue = 0;

  for (const holding of holdings) {
    const historicalPrice = priceMap.get(holding.symbol);

    // Skip if no historical price available
    if (historicalPrice === undefined) {
      continue;
    }

    totalValue += holding.total_quantity * historicalPrice;
  }

  return totalValue;
}
