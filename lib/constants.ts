/**
 * Application Constants
 * Central location for all app-wide constants
 */

/**
 * Supported Cryptocurrency Symbols
 * IMPORTANT: Limited to tokens with verified Ethereum mainnet ERC20 contract addresses
 * that are supported by Moralis API v2.2
 * 
 * Note: Many tokens don't have verified ERC20 wrapped versions or aren't indexed by Moralis.
 * This is a limitation of the free tier Moralis API, not the application architecture.
 */
export const SUPPORTED_SYMBOLS = [
  // Top cryptocurrencies with verified ERC20 addresses (7 working)
  'BTC',   // Bitcoin (WBTC on Ethereum)
  'ETH',   // Ethereum (WETH on Ethereum)
  'USDT',  // Tether
  'BNB',   // Binance Coin
  'SOL',   // Solana (Wrapped SOL)
  'USDC',  // USD Coin
  'XRP',   // Ripple
  
  // The following symbols are commented out due to Moralis API limitations:
  // - No verified ERC20 contract addresses found
  // - API returns "Not Found" or "Bad Request" errors
  // - Would require native chain integration (non-Ethereum)
  
  // 'ADA',   // Cardano - Not Found
  // 'ATOM',  // Cosmos - Bad Request
  // 'AVAX',  // Avalanche - Not Found (native chain needed)
  // 'DOGE',  // Dogecoin - Not Found
  
  // // DeFi & Layer 1 (10)
  // 'DOT',   // Polkadot - Not Found
  // 'MATIC', // Polygon - Would need polygon chain endpoint
  // 'LINK',  // Chainlink
  // 'UNI',   // Uniswap
  // 'LTC',   // Litecoin - Not Found
  // 'NEAR',  // NEAR Protocol - Not Found
  // 'APT',   // Aptos - Not Found
  // 'ARB',   // Arbitrum - Not Found
  // 'OP',    // Optimism - Not Found
  
  // // Meme & Popular (5)
  // 'SHIB',  // Shiba Inu
  // 'PEPE',  // Pepe
  // 'WIF',   // dogwifhat
  // 'BONK',  // Bonk
  // 'FLOKI', // Floki Inu
  
  // // Emerging & Infrastructure (5)
  // 'SUI',   // Sui - Not Found
  // 'SEI',   // Sei - Not Found
  // 'INJ',   // Injective - Not Found
  // 'TIA',   // Celestia - Not Found
  // 'RUNE',  // THORChain - Not Found
] as const;

export type SupportedSymbol = typeof SUPPORTED_SYMBOLS[number];

/**
 * Price Data Staleness Threshold
 * Price data older than this is considered stale (in milliseconds)
 */
export const STALE_PRICE_THRESHOLD_MS = 30000; // 30 seconds per FR-012, FR-015

/**
 * React Query Configuration
 */
export const QUERY_CONFIG = {
  PRICE_STALE_TIME: 30000,      // 30s per NFR-015
  PRICE_REFETCH_INTERVAL: 30000, // Auto-refresh every 30s
} as const;

/**
 * UI Animation Durations
 */
export const ANIMATION_DURATION = {
  TICKER_SCROLL: 60000, // 60s for complete ticker scroll
} as const;
