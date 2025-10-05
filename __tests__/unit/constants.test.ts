import { describe, it, expect } from 'vitest';
import { SUPPORTED_SYMBOLS, STALE_PRICE_THRESHOLD_MS, QUERY_CONFIG } from '@/lib/constants';

describe('Constants', () => {
  describe('SUPPORTED_SYMBOLS', () => {
    it('should contain exactly 30 symbols', () => {
      expect(SUPPORTED_SYMBOLS).toHaveLength(30);
    });

    it('should include top cryptocurrencies', () => {
      const topCryptos = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'USDC', 'ADA', 'AVAX', 'DOGE'];
      topCryptos.forEach(symbol => {
        expect(SUPPORTED_SYMBOLS).toContain(symbol);
      });
    });

    it('should include DeFi and Layer 1 tokens', () => {
      const defiL1 = ['DOT', 'MATIC', 'LINK', 'UNI', 'ATOM'];
      defiL1.forEach(symbol => {
        expect(SUPPORTED_SYMBOLS).toContain(symbol);
      });
    });

    it('should include meme coins', () => {
      const memeCoins = ['SHIB', 'PEPE', 'WIF', 'BONK'];
      memeCoins.forEach(symbol => {
        expect(SUPPORTED_SYMBOLS).toContain(symbol);
      });
    });

    it('should include emerging/newer chains', () => {
      const emergingChains = ['SUI', 'SEI', 'APT', 'INJ', 'TIA', 'RUNE'];
      emergingChains.forEach(symbol => {
        expect(SUPPORTED_SYMBOLS).toContain(symbol);
      });
    });

    it('should not contain duplicates', () => {
      const uniqueSymbols = new Set(SUPPORTED_SYMBOLS);
      expect(uniqueSymbols.size).toBe(SUPPORTED_SYMBOLS.length);
    });

    it('should only contain uppercase symbols', () => {
      SUPPORTED_SYMBOLS.forEach(symbol => {
        expect(symbol).toBe(symbol.toUpperCase());
      });
    });
  });

  describe('STALE_PRICE_THRESHOLD_MS', () => {
    it('should be 30 seconds (30000ms)', () => {
      expect(STALE_PRICE_THRESHOLD_MS).toBe(30000);
    });
  });

  describe('QUERY_CONFIG', () => {
    it('should have PRICE_STALE_TIME of 30 seconds', () => {
      expect(QUERY_CONFIG.PRICE_STALE_TIME).toBe(30000);
    });

    it('should have PRICE_REFETCH_INTERVAL of 30 seconds', () => {
      expect(QUERY_CONFIG.PRICE_REFETCH_INTERVAL).toBe(30000);
    });
  });
});
