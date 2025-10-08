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
  });
});
