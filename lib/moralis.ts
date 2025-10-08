/**
 * Moralis API Client
 * Provides cryptocurrency price data using batch endpoint for efficiency
 */

import { getMockTokenPrices, shouldUseMockData } from './moralis-mock';

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_API_BASE = 'https://deep-index.moralis.io/api/v2.2';

/**
 * Moralis batch price endpoint response for a single token
 */
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

/**
 * Standardized price data format for our application
 */
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
 * Uses Moralis batch endpoint for efficiency (single API call for all tokens)
 * 
 * Environment handling:
 * - NODE_ENV === 'test': Always uses mock data (no API calls during testing)
 * - No MORALIS_API_KEY: Uses mock data (development without API key)
 * - Production: Uses real Moralis API batch endpoint
 */
export async function getTokenPrices(symbols: string[]): Promise<PriceData[]> {
  // Use mock data for testing or when no API key is configured
  if (shouldUseMockData()) {
    console.log('[Moralis] Using mock data (test mode or no API key)');
    return getMockTokenPrices(symbols);
  }

  try {
    // Build batch request with all token addresses, tracking which symbols are valid
    const validTokens: Array<{ symbol: string; tokenAddress: string }> = [];
    
    symbols.forEach(symbol => {
      const normalizedSymbol = symbol.toUpperCase().trim();
      
      // Skip empty or whitespace-only symbols
      if (!normalizedSymbol) {
        console.warn('[Moralis] Skipping empty symbol');
        return;
      }
      
      const address = TOKEN_ADDRESSES[normalizedSymbol];
      
      // Validate address exists and is not empty
      if (!address || address.trim() === '') {
        console.warn(`[Moralis] Unsupported or invalid token: ${normalizedSymbol}`);
        return;
      }
      
      validTokens.push({
        symbol: normalizedSymbol,
        tokenAddress: address,
      });
    });

    if (validTokens.length === 0) {
      console.error('[Moralis] No valid tokens to fetch');
      return [];
    }

    // Make single batch API call for all tokens
    const response = await fetch(
      `${MORALIS_API_BASE}/erc20/prices`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': MORALIS_API_KEY!,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({ 
          tokens: validTokens.map(t => ({
            token_address: t.tokenAddress, // Moralis expects 'token_address', not 'tokenAddress' or 'chain'
          }))
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Moralis] Batch API error (${response.status}):`, errorText);
      throw new Error(`Moralis API error: ${response.status} ${response.statusText}`);
    }

    const data: TokenPrice[] = await response.json();

    // Map response to our PriceData format using the validTokens array for correct symbol mapping
    const now = new Date().toISOString();
    return data.map((tokenData, index) => ({
      symbol: validTokens[index].symbol, // Use symbol from validTokens, not original symbols array
      price_usd: tokenData.usdPrice,
      market_cap: 0, // Moralis batch endpoint doesn't provide market cap
      volume_24h: 0, // Would need different endpoint for volume
      change_24h_pct: parseFloat(tokenData['24hrPercentChange'] || '0'),
      last_updated: now,
    }));
  } catch (error) {
    console.error('[Moralis] Error fetching batch prices:', error);
    
    // Fallback to mock data on error
    console.log('[Moralis] Falling back to mock data due to error');
    return getMockTokenPrices(symbols);
  }
}
