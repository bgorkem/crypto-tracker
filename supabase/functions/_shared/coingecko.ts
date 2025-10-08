/**
 * Shared CoinGecko API Client for Supabase Edge Functions
 * 
 * This is a simplified version for Deno runtime
 */

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

const SYMBOL_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDC: 'usd-coin',
  USDT: 'tether',
  BNB: 'binancecoin',
  XRP: 'ripple',
};

interface HistoricalPrice {
  symbol: string;
  price_usd: number;
  price_date: string;
}

/**
 * Map trading symbol to CoinGecko ID
 */
function mapSymbolToCoinGeckoId(symbol: string): string | null {
  return SYMBOL_MAP[symbol.toUpperCase()] || null;
}

/**
 * Format date to DD-MM-YYYY for CoinGecko API
 */
function formatDateForCoinGecko(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Fetch historical price for a single symbol
 */
export async function getHistoricalPrice(
  symbol: string,
  date: Date
): Promise<HistoricalPrice | null> {
  const coinId = mapSymbolToCoinGeckoId(symbol);

  if (!coinId) {
    console.error(`[CoinGecko] Unknown symbol: ${symbol}`);
    return null;
  }

  const dateString = formatDateForCoinGecko(date);
  const url = `${COINGECKO_API_URL}/coins/${coinId}/history?date=${dateString}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[CoinGecko] API error for ${symbol}:`, response.status);
      return null;
    }

    const data = await response.json();

    if (!data.market_data?.current_price?.usd) {
      console.error(`[CoinGecko] No price data for ${symbol} on ${dateString}`);
      return null;
    }

    return {
      symbol,
      price_usd: data.market_data.current_price.usd,
      price_date: date.toISOString().split('T')[0],
    };
  } catch (error) {
    console.error(`[CoinGecko] Fetch error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical prices for multiple symbols
 * Includes rate limiting (1.2s between requests)
 */
export async function getHistoricalPrices(
  symbols: string[],
  date: Date
): Promise<HistoricalPrice[]> {
  const results: HistoricalPrice[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    // Rate limit: 1.2 seconds between requests (50 calls/min max)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    const price = await getHistoricalPrice(symbol, date);

    if (price) {
      results.push(price);
    }
  }

  return results;
}
