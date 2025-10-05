'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_SYMBOLS, STALE_PRICE_THRESHOLD_MS, QUERY_CONFIG } from '@/lib/constants';

interface PriceData {
  symbol: string;
  price_usd: number;
  change_24h_pct: number;
  received_at: string;
}

/**
 * PriceTicker Component
 * Displays horizontal auto-scrolling ticker with live cryptocurrency prices
 * 
 * Features:
 * - 30 crypto symbols with current prices
 * - Color-coded 24h % change (green/red)
 * - Stale indicator for data >30s old
 * - Auto-refresh every 30s
 * - Pause animation on hover
 * 
 * @see docs/PRICE-TICKER-DESIGN.md
 */
export function PriceTicker() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['prices', 'ticker'],
    queryFn: async () => {
      const symbols = SUPPORTED_SYMBOLS.join(',');
      const res = await fetch(`/api/prices?symbols=${symbols}`);
      if (!res.ok) {
        throw new Error('Failed to fetch prices');
      }
      const json = await res.json();
      return json.data as PriceData[];
    },
    staleTime: QUERY_CONFIG.PRICE_STALE_TIME,
    refetchInterval: QUERY_CONFIG.PRICE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <TickerSkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-slate-900 text-red-400 py-2 px-4 text-sm">
        ⚠️ Unable to load price data. Retrying...
      </div>
    );
  }

  const prices = data || [];
  const now = Date.now();

  return (
    <div 
      className="bg-slate-900 text-white overflow-hidden border-b border-slate-800"
      role="marquee"
      aria-label="Live cryptocurrency price ticker showing 30 symbols with 24-hour price changes"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex animate-ticker hover:pause-animation">
        {/* Duplicate array for seamless infinite scroll */}
        {[...prices, ...prices].map((price, idx) => {
          const isStale = now - new Date(price.received_at).getTime() > STALE_PRICE_THRESHOLD_MS;
          const changeClass = price.change_24h_pct >= 0 
            ? 'text-green-400' 
            : 'text-red-400';
          const priceClass = isStale ? 'text-gray-400' : 'text-white';
          
          return (
            <div 
              key={`${price.symbol}-${idx}`} 
              className="flex items-center gap-2 px-6 py-2 whitespace-nowrap"
            >
              <span className="font-semibold text-sm">🪙 {price.symbol}</span>
              <span className={`text-sm ${priceClass}`}>
                ${price.price_usd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              <span className={`text-xs font-medium ${isStale ? 'text-gray-400' : changeClass}`}>
                {price.change_24h_pct >= 0 ? '+' : ''}
                {price.change_24h_pct.toFixed(2)}%
              </span>
              {isStale && (
                <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                  ⚠️ Stale
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for PriceTicker
 */
function TickerSkeleton() {
  return (
    <div className="bg-slate-900 overflow-hidden border-b border-slate-800">
      <div className="flex">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-2 px-6 py-2 whitespace-nowrap">
            <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-10 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
