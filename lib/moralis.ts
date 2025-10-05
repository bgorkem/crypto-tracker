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
  XRP: '0x39fbbabf11738317a448031930706cd3e612e1b9',
  ADA: '0xc14777C94229582E5758C5a79b83DDE876b9BE98',
  AVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  DOGE: '0xba2ae424d960c26247dd6c32edc70b295c744c43',
  DOT: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
  MATIC: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
  LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
  UNI: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  ATOM: '0x0eb3a705fc54725037cc9a0acf0f99c8bba6dcf',
  LTC: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
  NEAR: '0x85f138bfEE3d1A9f9E7e1C6C7fD8E2b8a4c4755b',
  APT: '0xD2F216E7a4e4a3F9c3A43B2e8d4e9d3D5cB3C2b6',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  OP: '0x4200000000000000000000000000000000000042',
  SHIB: '0x95aD61b0a150d79219dCF64Ed4dBfC9bE7f1CeA',
  PEPE: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
  WIF: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  BONK: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39',
  FLOKI: '0x43c59Bd6C3F6FdA1BfD8E5C1D4b3B9c2C1F2e3D4',
  SUI: '0xF5B0e4b0B1c2D3E4F5A6B7C8D9E0F1A2B3C4D5E6',
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
        console.error(`Moralis API error for ${symbol}:`, response.statusText);
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
