interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price_per_unit?: number;
  price?: number;
  type?: 'BUY' | 'SELL';
  side?: 'BUY' | 'SELL';
  transaction_date?: string;
  executed_at?: string;
}

interface Holding {
  symbol: string;
  totalQuantity: number;
  averageCost: number;
  marketValue: number;
  unrealizedPL: number;
}

export function calculateHoldingsFromTransactions(transactions: Transaction[]): Holding[] {
  const holdingsMap = new Map<string, { totalQty: number; totalCost: number }>();
  
  transactions.forEach(tx => {
    const type = tx.type || tx.side || 'BUY';
    const price = tx.price_per_unit || tx.price || 0;
    
    if (!holdingsMap.has(tx.symbol)) {
      holdingsMap.set(tx.symbol, { totalQty: 0, totalCost: 0 });
    }
    
    const holding = holdingsMap.get(tx.symbol)!;
    
    if (type === 'BUY') {
      holding.totalQty += tx.quantity;
      holding.totalCost += tx.quantity * price;
    } else {
      holding.totalQty -= tx.quantity;
      holding.totalCost -= tx.quantity * price;
    }
  });
  
  return Array.from(holdingsMap.entries()).map(([symbol, data]) => {
    const averageCost = data.totalQty > 0 ? data.totalCost / data.totalQty : 0;
    const marketValue = data.totalQty * averageCost;
    const unrealizedPL = marketValue - data.totalCost;
    
    return {
      symbol,
      totalQuantity: data.totalQty,
      averageCost,
      marketValue,
      unrealizedPL
    };
  }).filter(h => h.totalQuantity > 0);
}
