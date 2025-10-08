/**
 * CoinGecko API Client for Historical Cryptocurrency Prices
 * Free tier: 10-50 calls/min
 * API Docs: https://docs.coingecko.com/reference/coins-id-history
 */

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Symbol mapping: Moralis symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDC: 'usd-coin',
  USDT: 'tether',
  BNB: 'binancecoin',
  XRP: 'ripple',
};

/**
 * Map a Moralis symbol to CoinGecko coin ID
 * @param symbol - Moralis symbol (e.g., 'BTC')
 * @returns CoinGecko coin ID (e.g., 'bitcoin') or null if unsupported
 */
export function mapSymbolToCoinGeckoId(symbol: string): string | null {
  return SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()] || null;
}

/**
 * Format a Date object to CoinGecko's required format (DD-MM-YYYY)
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDateForCoinGecko(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Rate limiter for CoinGecko API (free tier: 10-50 calls/min)
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private readonly minInterval = 1200; // 1.2 seconds between calls (50 calls/min)

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const task = this.queue.shift();

    if (task) {
      await task();
      await new Promise((resolve) => setTimeout(resolve, this.minInterval));
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.process();
    }
  }
}

const rateLimiter = new RateLimiter();

/**
 * Response type from CoinGecko historical price API
 */
interface CoinGeckoHistoricalResponse {
  id: string;
  symbol: string;
  name: string;
  market_data?: {
    current_price?: {
      usd?: number;
    };
  };
}

/**
 * Historical price data structure
 */
export interface HistoricalPrice {
  symbol: string;
  price_usd: number;
  price_date: Date;
}

/**
 * Fetch historical price for a single cryptocurrency symbol from CoinGecko
 * @param symbol - Moralis symbol (e.g., 'BTC')
 * @param date - Date to fetch price for
 * @returns Historical price data or null if not found
 */
export async function getHistoricalPrice(
  symbol: string,
  date: Date
): Promise<HistoricalPrice | null> {
  const coinId = mapSymbolToCoinGeckoId(symbol);
  if (!coinId) {
    console.warn(`[CoinGecko] Unsupported symbol: ${symbol}`);
    return null;
  }

  const dateStr = formatDateForCoinGecko(date);
  const url = `${COINGECKO_API_BASE}/coins/${coinId}/history?date=${dateStr}`;

  try {
    const response = await rateLimiter.execute(async () => {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('CoinGecko rate limit exceeded');
        }
        throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<CoinGeckoHistoricalResponse>;
    });

    const priceUsd = response.market_data?.current_price?.usd;

    if (priceUsd === undefined) {
      console.warn(`[CoinGecko] No price data for ${symbol} on ${dateStr}`);
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      price_usd: priceUsd,
      price_date: new Date(date.toISOString().split('T')[0]), // Normalize to midnight UTC
    };
  } catch (error) {
    console.error(`[CoinGecko] Error fetching ${symbol} for ${dateStr}:`, error);
    return null;
  }
}

/**
 * Fetch historical prices for multiple cryptocurrency symbols from CoinGecko
 * @param symbols - Array of Moralis symbols (e.g., ['BTC', 'ETH'])
 * @param date - Date to fetch prices for
 * @returns Array of historical price data (excludes symbols with errors)
 */
export async function getHistoricalPrices(
  symbols: string[],
  date: Date
): Promise<HistoricalPrice[]> {
  const results = await Promise.all(
    symbols.map((symbol) => getHistoricalPrice(symbol, date))
  );

  // Filter out null results (unsupported symbols or errors)
  return results.filter((result): result is HistoricalPrice => result !== null);
}

/**
 * Get all supported symbols
 * @returns Array of supported Moralis symbols
 */
export function getSupportedSymbols(): string[] {
  return Object.keys(SYMBOL_TO_COINGECKO_ID);
}
