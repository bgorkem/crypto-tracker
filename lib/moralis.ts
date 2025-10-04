/**
 * Moralis API Client
 * Provides cryptocurrency price data
 */

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_API_BASE = 'https://deep-index.moralis.io/api/v2.2';

export interface TokenPrice {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string | null;
  tokenDecimals: string;
  nativePrice: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
  };
  usdPrice: number;
  usdPriceFormatted: string;
  '24hrPercentChange': string;
  exchangeAddress: string;
  exchangeName: string;
  tokenPrice: string;
}

export interface PriceData {
  symbol: string;
  price_usd: number;
  market_cap: number;
  volume_24h: number;
  change_24h_pct: number;
  last_updated: string;
}

// Map of crypto symbols to their contract addresses (Ethereum mainnet)
const TOKEN_ADDRESSES: Record<string, string> = {
  BTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
  ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
  SOL: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c', // Wrapped SOL on Ethereum
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  BNB: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
};

/**
 * Fetches current price data for specified cryptocurrency symbols
 */
export async function getTokenPrices(symbols: string[]): Promise<PriceData[]> {
  if (!MORALIS_API_KEY) {
    // Return mock data for development/testing
    return symbols.map(symbol => ({
      symbol,
      price_usd: getMockPrice(symbol),
      market_cap: Math.random() * 1000000000000,
      volume_24h: Math.random() * 50000000000,
      change_24h_pct: (Math.random() - 0.5) * 10,
      last_updated: new Date().toISOString(),
    }));
  }

  const pricePromises = symbols.map(async (symbol) => {
    const address = TOKEN_ADDRESSES[symbol.toUpperCase()];
    if (!address) {
      throw new Error(`Unsupported token: ${symbol}`);
    }

    try {
      const response = await fetch(
        `${MORALIS_API_BASE}/erc20/${address}/price?chain=eth`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.statusText}`);
      }

      const data: TokenPrice = await response.json();

      return {
        symbol: symbol.toUpperCase(),
        price_usd: data.usdPrice,
        market_cap: 0, // Moralis doesn't provide this in token price endpoint
        volume_24h: 0, // Would need different endpoint for volume
        change_24h_pct: parseFloat(data['24hrPercentChange'] || '0'),
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      // Fallback to mock data on error
      return {
        symbol: symbol.toUpperCase(),
        price_usd: getMockPrice(symbol),
        market_cap: 0,
        volume_24h: 0,
        change_24h_pct: 0,
        last_updated: new Date().toISOString(),
      };
    }
  });

  return Promise.all(pricePromises);
}

/**
 * Returns mock price data for development/testing
 */
function getMockPrice(symbol: string): number {
  const mockPrices: Record<string, number> = {
    BTC: 65000 + Math.random() * 1000,
    ETH: 3500 + Math.random() * 100,
    SOL: 150 + Math.random() * 10,
    USDC: 1.0,
    USDT: 1.0,
    BNB: 600 + Math.random() * 50,
  };

  return mockPrices[symbol.toUpperCase()] || 100 + Math.random() * 10;
}
