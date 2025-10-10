/**
 * Unit tests for CacheService (Redis cache)
 * Uses mocks to test cache logic without real Redis connection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService, CACHE_KEYS, type ChartData } from '../../lib/redis';

// Mock @vercel/kv module
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import mocked kv after mock is defined
import { kv } from '@vercel/kv';

describe('CacheService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('getChartData', () => {
    it('should return null on cache miss (key not found)', async () => {
      // Mock kv.get to return null (cache miss)
      vi.mocked(kv.get).mockResolvedValue(null);

      const result = await CacheService.getChartData('portfolio-123', '30d');

      expect(result).toBeNull();
      expect(kv.get).toHaveBeenCalledWith('portfolio:portfolio-123:chart:30d');
      expect(kv.get).toHaveBeenCalledTimes(1);
    });

    it('should parse and return ChartData on cache hit', async () => {
      const mockChartData: ChartData = {
        interval: '30d',
        snapshots: [
          {
            snapshot_date: '2025-01-01',
            total_value: '10000.00',
            total_cost: '8000.00',
            total_pl: '2000.00',
            total_pl_pct: '25.00',
            holdings_count: 5,
          },
        ],
        current_value: '10000.00',
        start_value: '8000.00',
        change_abs: '2000.00',
        change_pct: '25.00',
        cached_at: '2025-01-10T12:00:00Z',
      };

      // Mock kv.get to return JSON string
      vi.mocked(kv.get).mockResolvedValue(JSON.stringify(mockChartData));

      const result = await CacheService.getChartData('portfolio-123', '30d');

      expect(result).toEqual(mockChartData);
      expect(kv.get).toHaveBeenCalledWith('portfolio:portfolio-123:chart:30d');
    });

    it('should return null and log error on Redis failure (graceful fallback)', async () => {
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock kv.get to throw error
      vi.mocked(kv.get).mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheService.getChartData('portfolio-123', '7d');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Redis cache read error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setChartData', () => {
    it('should store chart data with TTL and cached_at timestamp', async () => {
      const chartData = {
        interval: '24h' as const,
        snapshots: [],
        current_value: '5000.00',
        start_value: '4500.00',
        change_abs: '500.00',
        change_pct: '11.11',
      };

      await CacheService.setChartData('portfolio-456', '24h', chartData);

      expect(kv.set).toHaveBeenCalledWith(
        'portfolio:portfolio-456:chart:24h',
        expect.stringContaining('"cached_at"'),
        { ex: 300 } // 5 minutes TTL
      );
      expect(kv.set).toHaveBeenCalledTimes(1);

      // Verify cached_at is added
      const callArgs = vi.mocked(kv.set).mock.calls[0];
      const storedData = JSON.parse(callArgs[1] as string);
      expect(storedData).toHaveProperty('cached_at');
      expect(storedData.cached_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
    });

    it('should not throw on Redis write failure (graceful degradation)', async () => {
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock kv.set to throw error
      vi.mocked(kv.set).mockRejectedValue(new Error('Redis write failed'));

      const chartData = {
        interval: '7d' as const,
        snapshots: [],
        current_value: '5000.00',
        start_value: '4500.00',
        change_abs: '500.00',
        change_pct: '11.11',
      };

      // Should not throw
      await expect(
        CacheService.setChartData('portfolio-789', '7d', chartData)
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Redis cache write error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('invalidatePortfolio', () => {
    it('should delete all 5 interval keys atomically', async () => {
      await CacheService.invalidatePortfolio('portfolio-999');

      expect(kv.del).toHaveBeenCalledWith(
        'portfolio:portfolio-999:chart:24h',
        'portfolio:portfolio-999:chart:7d',
        'portfolio:portfolio-999:chart:30d',
        'portfolio:portfolio-999:chart:90d',
        'portfolio:portfolio-999:chart:all'
      );
      expect(kv.del).toHaveBeenCalledTimes(1);
    });

    it('should not throw on Redis deletion failure (graceful degradation)', async () => {
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock kv.del to throw error
      vi.mocked(kv.del).mockRejectedValue(new Error('Redis del failed'));

      // Should not throw
      await expect(
        CacheService.invalidatePortfolio('portfolio-000')
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Redis cache invalidation error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('CACHE_KEYS', () => {
    it('should generate correct cache key format', () => {
      expect(CACHE_KEYS.chartData('abc-123', '30d')).toBe(
        'portfolio:abc-123:chart:30d'
      );
    });

    it('should generate wildcard pattern for portfolio charts', () => {
      expect(CACHE_KEYS.portfolioCharts('abc-123')).toBe(
        'portfolio:abc-123:chart:*'
      );
    });
  });
});
