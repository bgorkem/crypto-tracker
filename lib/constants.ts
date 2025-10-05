/**
 * Application Constants
 * Central location for all app-wide constants
 */

/**
 * Supported Cryptocurrency Symbols (30 for MVP)
 * Used for price ticker, transaction validation, and portfolio tracking
 */
export const SUPPORTED_SYMBOLS = [
  // Top 10 by Market Cap (Essential)
  'BTC',   // Bitcoin
  'ETH',   // Ethereum
  'USDT',  // Tether
  'BNB',   // Binance Coin
  'SOL',   // Solana
  'USDC',  // USD Coin
  'XRP',   // Ripple
  'ADA',   // Cardano
  'AVAX',  // Avalanche
  'DOGE',  // Dogecoin
  
  // DeFi & Layer 1 (10)
  'DOT',   // Polkadot
  'MATIC', // Polygon
  'LINK',  // Chainlink
  'UNI',   // Uniswap
  'ATOM',  // Cosmos
  'LTC',   // Litecoin
  'NEAR',  // NEAR Protocol
  'APT',   // Aptos
  'ARB',   // Arbitrum
  'OP',    // Optimism
  
  // Meme & Popular (5)
  'SHIB',  // Shiba Inu
  'PEPE',  // Pepe
  'WIF',   // dogwifhat
  'BONK',  // Bonk
  'FLOKI', // Floki Inu
  
  // Emerging & Infrastructure (5)
  'SUI',   // Sui
  'SEI',   // Sei
  'INJ',   // Injective
  'TIA',   // Celestia
  'RUNE',  // THORChain
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
