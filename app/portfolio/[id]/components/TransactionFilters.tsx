'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface TransactionFiltersProps {
  symbols: string[];
  onFilterChange: (filters: TransactionFilter) => void;
}

export interface TransactionFilter {
  symbol: string | null;
  type: 'ALL' | 'BUY' | 'SELL';
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export function TransactionFilters({ symbols, onFilterChange }: TransactionFiltersProps) {
  const [symbol, setSymbol] = useState<string | null>(null);
  const [type, setType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleFilterChange = (updates: Partial<TransactionFilter>) => {
    const newFilters = {
      symbol: updates.symbol !== undefined ? updates.symbol : symbol,
      type: updates.type !== undefined ? updates.type : type,
      sortBy: updates.sortBy !== undefined ? updates.sortBy : sortBy,
      sortOrder: updates.sortOrder !== undefined ? updates.sortOrder : sortOrder,
    };

    if (updates.symbol !== undefined) setSymbol(updates.symbol);
    if (updates.type !== undefined) setType(updates.type);
    if (updates.sortBy !== undefined) setSortBy(updates.sortBy);
    if (updates.sortOrder !== undefined) setSortOrder(updates.sortOrder);

    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setSymbol(null);
    setType('ALL');
    setSortBy('date');
    setSortOrder('desc');
    onFilterChange({
      symbol: null,
      type: 'ALL',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-muted/50 rounded-lg">
      {/* Symbol Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="symbol-filter" className="text-sm font-medium whitespace-nowrap">
          Symbol:
        </label>
        <Select
          value={symbol || 'all'}
          onValueChange={(value) => handleFilterChange({ symbol: value === 'all' ? null : value })}
        >
          <SelectTrigger id="symbol-filter" className="w-[140px]">
            <SelectValue placeholder="All symbols" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All symbols</SelectItem>
            {symbols.map((sym) => (
              <SelectItem key={sym} value={sym}>
                {sym}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-sm font-medium whitespace-nowrap">
          Type:
        </label>
        <Select
          value={type}
          onValueChange={(value) => handleFilterChange({ type: value as 'ALL' | 'BUY' | 'SELL' })}
        >
          <SelectTrigger id="type-filter" className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort By */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-by" className="text-sm font-medium whitespace-nowrap">
          Sort by:
        </label>
        <Select
          value={sortBy}
          onValueChange={(value) => handleFilterChange({ sortBy: value as 'date' | 'amount' })}
        >
          <SelectTrigger id="sort-by" className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="amount">Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Order */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-order" className="text-sm font-medium whitespace-nowrap">
          Order:
        </label>
        <Select
          value={sortOrder}
          onValueChange={(value) => handleFilterChange({ sortOrder: value as 'asc' | 'desc' })}
        >
          <SelectTrigger id="sort-order" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        className="ml-auto"
      >
        Reset Filters
      </Button>
    </div>
  );
}

// Helper function to apply filters to transactions
export function applyTransactionFilters(
  transactions: Array<{
    id: string;
    symbol: string;
    quantity: number;
    price_per_unit?: number;
    price?: number;
    type?: 'BUY' | 'SELL';
    side?: 'BUY' | 'SELL';
    transaction_date?: string;
    executed_at?: string;
  }>,
  filters: TransactionFilter
) {
  let filtered = [...transactions];

  // Filter by symbol
  if (filters.symbol) {
    filtered = filtered.filter((tx) => tx.symbol === filters.symbol);
  }

  // Filter by type
  if (filters.type !== 'ALL') {
    filtered = filtered.filter((tx) => {
      const txType = tx.type || tx.side || 'BUY';
      return txType === filters.type;
    });
  }

  // Sort
  if (filters.sortBy === 'date') {
    filtered.sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.executed_at || '').getTime();
      const dateB = new Date(b.transaction_date || b.executed_at || '').getTime();
      return filters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  } else {
    // Sort by amount (quantity * price)
    filtered.sort((a, b) => {
      const amountA = a.quantity * (a.price_per_unit || a.price || 0);
      const amountB = b.quantity * (b.price_per_unit || b.price || 0);
      return filters.sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
    });
  }

  return filtered;
}
