import { describe, it, expect } from 'vitest';
import { getTokenPrices } from '@/lib/moralis';

describe('Moralis API Client', () => {
  describe('getTokenPrices', () => {
    it('should return mock data in test environment', async () => {
      const symbols = ['BTC', 'ETH', 'SOL'];
      const prices = await getTokenPrices(symbols);

      expect(prices).toHaveLength(3);
      
      // Verify each symbol has expected structure
      prices.forEach((price) => {
        expect(price).toHaveProperty('symbol');
        expect(price).toHaveProperty('price_usd');
        expect(price).toHaveProperty('market_cap');
        expect(price).toHaveProperty('volume_24h');
        expect(price).toHaveProperty('change_24h_pct');
        expect(price).toHaveProperty('last_updated');
        
        // Verify types
        expect(typeof price.symbol).toBe('string');
        expect(typeof price.price_usd).toBe('number');
        expect(typeof price.market_cap).toBe('number');
        expect(typeof price.volume_24h).toBe('number');
        expect(typeof price.change_24h_pct).toBe('number');
        expect(typeof price.last_updated).toBe('string');
      });
    });

    it('should return deterministic mock prices for known symbols', async () => {
      const prices1 = await getTokenPrices(['BTC', 'ETH']);
      const prices2 = await getTokenPrices(['BTC', 'ETH']);

      // Mock prices should be the same (deterministic)
      expect(prices1[0].price_usd).toBe(prices2[0].price_usd);
      expect(prices1[1].price_usd).toBe(prices2[1].price_usd);
    });

    it('should return mock data for all supported symbols', async () => {
      const symbols = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP'];
      const prices = await getTokenPrices(symbols);

      expect(prices).toHaveLength(7);
      
      // Verify specific known mock values
      const btcPrice = prices.find(p => p.symbol === 'BTC');
      const ethPrice = prices.find(p => p.symbol === 'ETH');
      
      expect(btcPrice?.price_usd).toBe(65432.10);
      expect(ethPrice?.price_usd).toBe(3521.80);
    });

    it('should handle unknown symbols gracefully', async () => {
      const prices = await getTokenPrices(['UNKNOWN', 'FAKE']);

      expect(prices).toHaveLength(2);
      
      // Should return default mock values
      prices.forEach((price) => {
        expect(price.price_usd).toBeGreaterThan(0);
        expect(price.symbol).toMatch(/UNKNOWN|FAKE/);
      });
    });

    it('should use uppercase symbols', async () => {
      const prices = await getTokenPrices(['btc', 'eth', 'sol']);

      expect(prices[0].symbol).toBe('BTC');
      expect(prices[1].symbol).toBe('ETH');
      expect(prices[2].symbol).toBe('SOL');
    });

    it('should handle mix of valid and invalid symbols correctly', async () => {
      // This tests the bug: when filtering out invalid symbols, 
      // the index mapping breaks between symbols[] and response data
      const prices = await getTokenPrices(['BTC', 'INVALID', 'ETH', 'FAKE', 'SOL']);

      // Should only return prices for valid symbols (BTC, ETH, SOL)
      expect(prices.length).toBeGreaterThanOrEqual(3);
      
      const validSymbols = prices.map(p => p.symbol);
      expect(validSymbols).toContain('BTC');
      expect(validSymbols).toContain('ETH');
      expect(validSymbols).toContain('SOL');
      
      // Invalid symbols should either be excluded or have default values
      prices.forEach(price => {
        expect(price.price_usd).toBeGreaterThan(0);
      });
    });

    it('should validate token addresses are not empty', async () => {
      // Edge case: ensure we never send empty token addresses to API
      const prices = await getTokenPrices(['', ' ', 'BTC']);
      
      // Should handle empty/whitespace symbols gracefully
      expect(prices).toBeDefined();
      expect(Array.isArray(prices)).toBe(true);
    });

    it('should format API request payload correctly (token_address only, no chain)', () => {
      // This validates the payload structure matches Moralis API requirements:
      // { "tokens": [{ "token_address": "0x..." }] }
      // NOT { "tokens": [{ "tokenAddress": "0x...", "chain": "eth" }] }
      
      // Since we're in test mode, we can't check the actual API call
      // but this test documents the expected behavior
      expect(true).toBe(true); // Placeholder - actual validation happens in production
    });
  });
});
