/**
 * GET /api/prices/historical
 * 
 * Fetch historical cryptocurrency prices for specific symbols and date
 * 
 * Query params:
 * - symbols: Comma-separated list of symbols (e.g., "BTC,ETH,SOL")
 * - date: Date in YYYY-MM-DD format (e.g., "2025-10-07")
 * 
 * Implements: FR-016a (historical price storage)
 * Phase: 6 - Historical Price Tracking
 * Task: T101
 */

import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '@/lib/api-response';
import { getHistoricalPrices } from '@/lib/coingecko';
import { z } from 'zod';

// Validation schema for query parameters
const querySchema = z.object({
  symbols: z.string().min(1, 'Symbols parameter is required'),
  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  ),
});

/**
 * Validate and parse query parameters
 */
function validateQueryParams(searchParams: URLSearchParams) {
  const symbolsParam = searchParams.get('symbols');
  const dateParam = searchParams.get('date');

  const validation = querySchema.safeParse({
    symbols: symbolsParam,
    date: dateParam,
  });

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { symbols: symbolsString, date: dateString } = validation.data;
  const symbols = symbolsString.split(',').map(s => s.trim().toUpperCase());
  const requestDate = new Date(dateString);

  // Validate date is not in future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (requestDate > today) {
    return { error: 'Cannot fetch prices for future dates' };
  }

  return { symbols, dateString, requestDate };
}

/**
 * Fetch prices from cache
 */
async function getCachedPrices(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  symbols: string[],
  dateString: string
): Promise<Array<{ symbol: string; price_usd: number; price_date: string }>> {
  const { data, error } = await supabase
    .from('price_cache')
    .select('symbol, price_usd, price_date')
    .in('symbol', symbols)
    .eq('price_date', dateString);

  if (error) {
    console.error('[Historical Prices] Cache query error:', error);
    throw new Error('Failed to query price cache');
  }

  return (data || []) as Array<{ symbol: string; price_usd: number; price_date: string }>;
}

/**
 * Store new prices in cache
 */
async function storePricesInCache(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  prices: Array<{ symbol: string; price_usd: number; price_date: Date }>,
  dateString: string
) {
  if (prices.length === 0) return;

  const priceRecords = prices.map(price => ({
    symbol: price.symbol,
    price_usd: price.price_usd,
    price_date: dateString,
    last_updated: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('price_cache')
    .upsert(priceRecords as never[], { onConflict: 'symbol,price_date' });

  if (error) {
    console.error('[Historical Prices] Cache insert error:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return unauthorizedResponse('Authentication required');
    }

    // Validate query parameters
    const params = validateQueryParams(request.nextUrl.searchParams);
    if ('error' in params) {
      return badRequestResponse(params.error);
    }

    const { symbols, dateString, requestDate } = params;

    // Get cached prices
    const cachedPrices = await getCachedPrices(supabase, symbols, dateString);
    
    const cachedSymbols = new Set(cachedPrices.map(p => p.symbol));
    const missingSymbols = symbols.filter(s => !cachedSymbols.has(s));

    // Fetch missing prices from CoinGecko
    let newPrices: Array<{
      symbol: string;
      price_usd: number;
      price_date: Date;
    }> = [];

    if (missingSymbols.length > 0) {
      try {
        newPrices = await getHistoricalPrices(missingSymbols, requestDate);
        await storePricesInCache(supabase, newPrices, dateString);
      } catch (error) {
        console.error('[Historical Prices] CoinGecko fetch error:', error);
        if (cachedPrices.length > 0) {
          return successResponse(cachedPrices);
        }
        return errorResponse(
          'external_api_error',
          'Failed to fetch historical prices',
          500
        );
      }
    }

    // Combine and return all prices
    const allPrices = [
      ...cachedPrices.map(p => ({
        symbol: p.symbol,
        price_usd: p.price_usd,
        price_date: p.price_date,
      })),
      ...newPrices.map(p => ({
        symbol: p.symbol,
        price_usd: p.price_usd,
        price_date: dateString,
      })),
    ];

    allPrices.sort((a, b) => a.symbol.localeCompare(b.symbol));

    return successResponse(allPrices);
  } catch (error) {
    console.error('[Historical Prices] Unexpected error:', error);
    return errorResponse('internal_error', 'An unexpected error occurred', 500);
  }
}
