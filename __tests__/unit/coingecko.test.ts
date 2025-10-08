import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import {
  getHistoricalPrice,
  getHistoricalPrices,
  mapSymbolToCoinGeckoId,
  getSupportedSymbols,
} from '@/lib/coingecko';

// Mock fetch globally
global.fetch = vi.fn() as Mock;

describe('CoinGecko API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapSymbolToCoinGeckoId', () => {
    it('should map BTC to bitcoin', () => {
      expect(mapSymbolToCoinGeckoId('BTC')).toBe('bitcoin');
    });

    it('should map ETH to ethereum', () => {
      expect(mapSymbolToCoinGeckoId('ETH')).toBe('ethereum');
    });

    it('should map SOL to solana', () => {
      expect(mapSymbolToCoinGeckoId('SOL')).toBe('solana');
    });

    it('should map USDC to usd-coin', () => {
      expect(mapSymbolToCoinGeckoId('USDC')).toBe('usd-coin');
    });

    it('should map USDT to tether', () => {
      expect(mapSymbolToCoinGeckoId('USDT')).toBe('tether');
    });

    it('should map BNB to binancecoin', () => {
      expect(mapSymbolToCoinGeckoId('BNB')).toBe('binancecoin');
    });

    it('should map XRP to ripple', () => {
      expect(mapSymbolToCoinGeckoId('XRP')).toBe('ripple');
    });

    it('should handle lowercase symbols', () => {
      expect(mapSymbolToCoinGeckoId('btc')).toBe('bitcoin');
    });

    it('should return null for unsupported symbols', () => {
      expect(mapSymbolToCoinGeckoId('DOGE')).toBeNull();
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return all supported symbols', () => {
      const symbols = getSupportedSymbols();
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('SOL');
      expect(symbols).toContain('USDC');
      expect(symbols).toContain('USDT');
      expect(symbols).toContain('BNB');
      expect(symbols).toContain('XRP');
      expect(symbols).toHaveLength(7);
    });
  });

  describe('getHistoricalPrice', () => {
    it('should fetch historical price for BTC successfully', async () => {
      const mockResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: {
            usd: 124773.50823074432,
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const date = new Date('2025-10-07');
      const result = await getHistoricalPrice('BTC', date);

      expect(result).toEqual({
        symbol: 'BTC',
        price_usd: 124773.50823074432,
        price_date: new Date('2025-10-07T00:00:00.000Z'),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('coins/bitcoin/history?date=07-10-2025'),
        expect.any(Object)
      );
    });

    it('should return null for unsupported symbols', async () => {
      const date = new Date('2025-10-07');
      const result = await getHistoricalPrice('DOGE', date);

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when API returns no price data', async () => {
      const mockResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {},
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const date = new Date('2025-10-07');
      const result = await getHistoricalPrice('BTC', date);

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const date = new Date('2025-10-07');
      const result = await getHistoricalPrice('BTC', date);

      expect(result).toBeNull();
    });

    it('should handle rate limit errors', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const date = new Date('2025-10-07');
      const result = await getHistoricalPrice('BTC', date);

      expect(result).toBeNull();
    });

    it('should format date correctly for CoinGecko API', async () => {
      const mockResponse = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        market_data: {
          current_price: {
            usd: 3521.80,
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const date = new Date('2025-01-05'); // January 5, 2025
      await getHistoricalPrice('ETH', date);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('date=05-01-2025'),
        expect.any(Object)
      );
    });
  });

  describe('getHistoricalPrices', () => {
    it('should fetch prices for multiple symbols', async () => {
      const mockBTCResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: {
            usd: 124773.50,
          },
        },
      };

      const mockETHResponse = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        market_data: {
          current_price: {
            usd: 3521.80,
          },
        },
      };

      (global.fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBTCResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockETHResponse,
        });

      const date = new Date('2025-10-07');
      const results = await getHistoricalPrices(['BTC', 'ETH'], date);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('BTC');
      expect(results[0].price_usd).toBe(124773.50);
      expect(results[1].symbol).toBe('ETH');
      expect(results[1].price_usd).toBe(3521.80);
    });

    it('should filter out unsupported symbols', async () => {
      const mockBTCResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: {
            usd: 124773.50,
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBTCResponse,
      });

      const date = new Date('2025-10-07');
      const results = await getHistoricalPrices(['BTC', 'DOGE'], date);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('BTC');
    });

    it('should filter out symbols with API errors', async () => {
      const mockBTCResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: {
            usd: 124773.50,
          },
        },
      };

      (global.fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBTCResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const date = new Date('2025-10-07');
      const results = await getHistoricalPrices(['BTC', 'ETH'], date);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('BTC');
    });

    it('should return empty array when all symbols fail', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const date = new Date('2025-10-07');
      const results = await getHistoricalPrices(['BTC', 'ETH'], date);

      expect(results).toHaveLength(0);
    });
  });
});
