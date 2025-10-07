'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price_per_unit?: number;
  price?: number;
  type?: 'BUY' | 'SELL';
  side?: 'BUY' | 'SELL';
}

interface PortfolioStatsProps {
  transactions: Transaction[];
}

interface PriceData {
  symbol: string;
  price_usd: number;
}

export function PortfolioStats({ transactions }: PortfolioStatsProps) {
  const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      // Get unique symbols from transactions
      const symbols = Array.from(new Set(transactions.map(tx => tx.symbol)));
      
      if (symbols.length === 0) {
        setIsLoadingPrices(false);
        return;
      }

      const supabase = createClient();
      const { data: prices } = await supabase
        .from('price_cache')
        .select('symbol, price_usd')
        .in('symbol', symbols);

      if (prices) {
        const priceMap = new Map(prices.map((p: PriceData) => [p.symbol, p.price_usd]));
        setCurrentPrices(priceMap);
      }
      
      setIsLoadingPrices(false);
    };

    fetchPrices();
  }, [transactions]);

  const calculateCurrentValue = () => {
    // Calculate current holdings
    const holdingsMap = new Map<string, number>();
    
    transactions.forEach(tx => {
      const type = tx.type || tx.side || 'BUY';
      const currentQty = holdingsMap.get(tx.symbol) || 0;
      
      if (type === 'BUY') {
        holdingsMap.set(tx.symbol, currentQty + tx.quantity);
      } else {
        holdingsMap.set(tx.symbol, currentQty - tx.quantity);
      }
    });

    // Calculate total value using current market prices
    let totalValue = 0;
    holdingsMap.forEach((quantity, symbol) => {
      if (quantity > 0) {
        const currentPrice = currentPrices.get(symbol) || 0;
        totalValue += quantity * currentPrice;
      }
    });

    return totalValue;
  };

  const totalValue = calculateCurrentValue();

  return (
    <div className="mb-8 p-6 border rounded">
      <p className="text-sm text-gray-600">Total Portfolio Value</p>
      {isLoadingPrices ? (
        <p className="text-4xl font-bold">Loading...</p>
      ) : (
        <p className="text-4xl font-bold">${totalValue.toFixed(2)}</p>
      )}
    </div>
  );
}
