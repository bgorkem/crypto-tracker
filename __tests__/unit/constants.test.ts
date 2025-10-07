import { describe, it, expect } from 'vitest';
import { SUPPORTED_SYMBOLS, STALE_PRICE_THRESHOLD_MS, QUERY_CONFIG } from '@/lib/constants';

describe('Constants', () => {
  describe('SUPPORTED_SYMBOLS', () => {
    it('should contain exactly 7 working symbols (Moralis API limitation)', () => {
      expect(SUPPORTED_SYMBOLS).toHaveLength(7);
    });

    it('should include verified ERC20 tokens with Moralis support', () => {
      const workingCryptos = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP'];
      workingCryptos.forEach(symbol => {
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

    it('should include major stablecoins', () => {
      const stablecoins = ['USDT', 'USDC'];
      stablecoins.forEach(symbol => {
        expect(SUPPORTED_SYMBOLS).toContain(symbol);
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
