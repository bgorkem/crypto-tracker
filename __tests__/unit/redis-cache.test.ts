/**
 * Unit tests for CacheService (Redis cache)
 * Uses mocks to test cache logic without real Redis connection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock redis module with inline mock functions
vi.mock('redis', () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockDel = vi.fn();
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  
  return {
    createClient: vi.fn(() => ({
      get: mockGet,
      set: mockSet,
      del: mockDel,
      connect: mockConnect,
    })),
    // Export mocks for access in tests
    __mockGet: mockGet,
    __mockSet: mockSet,
    __mockDel: mockDel,
    __mockConnect: mockConnect,
  };
});

// Import after mocking
import { CacheService, CACHE_KEYS, type ChartData } from '../../lib/redis';
import * as redis from 'redis';

// Get mock functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGet = (redis as any).__mockGet;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSet = (redis as any).__mockSet;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDel = (redis as any).__mockDel;

describe('CacheService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('getChartData', () => {
    it('should return null when cache miss', async () => {
      // Mock cache miss
      mockGet.mockResolvedValue(null);

      const result = await CacheService.getChartData('portfolio-123', '30d');

      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('portfolio:portfolio-123:chart:30d');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return parsed data when cache hit', async () => {
      const mockChartData: ChartData = {
        interval: '30d',
        snapshots: [
          {
            snapshot_date: '2025-01-01',
            total_value: '10000.00',
            total_cost: '9000.00',
            total_pl: '1000.00',
            total_pl_pct: '11.11',
            holdings_count: 5,
          },
        ],
        current_value: '10000.00',
        start_value: '9000.00',
        change_abs: '1000.00',
        change_pct: '11.11',
        cached_at: '2025-01-01T00:00:00Z',
      };

      // Mock cache hit
      mockGet.mockResolvedValue(JSON.stringify(mockChartData));

      const result = await CacheService.getChartData('portfolio-123', '30d');

      expect(result).toEqual(mockChartData);
      expect(mockGet).toHaveBeenCalledWith('portfolio:portfolio-123:chart:30d');
    });

    it('should return null when Redis throws error', async () => {
      // Mock Redis error
      mockGet.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheService.getChartData('portfolio-123', '30d');

      expect(result).toBeNull();
    });
  });

  describe('setChartData', () => {
    it('should store data in cache with 5-minute TTL', async () => {
      const mockChartData: Omit<ChartData, 'cached_at'> = {
        interval: '7d',
        snapshots: [
          {
            snapshot_date: '2025-01-01',
            total_value: '5000.00',
            total_cost: '4800.00',
            total_pl: '200.00',
            total_pl_pct: '4.17',
            holdings_count: 3,
          },
        ],
        current_value: '5000.00',
        start_value: '4800.00',
        change_abs: '200.00',
        change_pct: '4.17',
      };

      await CacheService.setChartData('portfolio-456', '7d', mockChartData);

      expect(mockSet).toHaveBeenCalledTimes(1);
      
      // Verify call arguments
      const callArgs = mockSet.mock.calls[0];
      expect(callArgs[0]).toBe('portfolio:portfolio-456:chart:7d');
      expect(callArgs[2]).toEqual({ EX: 300 }); // 5 minutes

      // Verify stored data has timestamp added
      const storedData = JSON.parse(callArgs[1] as string);
      expect(storedData).toHaveProperty('cached_at');
      expect(storedData.cached_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // ISO format
      expect(storedData.interval).toBe('7d');
      expect(storedData.snapshots).toEqual(mockChartData.snapshots);
    });

    it('should not throw when Redis set fails', async () => {
      // Mock Redis error
      mockSet.mockRejectedValue(new Error('Redis write failed'));

      const mockChartData: Omit<ChartData, 'cached_at'> = {
        interval: '7d',
        snapshots: [],
        current_value: '0.00',
        start_value: '0.00',
        change_abs: '0.00',
        change_pct: '0.00',
      };

      // Should not throw
      await expect(
        CacheService.setChartData('portfolio-456', '7d', mockChartData)
      ).resolves.not.toThrow();
    });
  });

  describe('invalidatePortfolio', () => {
    it('should delete all cache keys for a portfolio', async () => {
      await CacheService.invalidatePortfolio('portfolio-789');

      expect(mockDel).toHaveBeenCalledWith([
        'portfolio:portfolio-789:chart:24h',
        'portfolio:portfolio-789:chart:7d',
        'portfolio:portfolio-789:chart:30d',
        'portfolio:portfolio-789:chart:90d',
        'portfolio:portfolio-789:chart:all', // Changed from '1y' to 'all'
      ]);
      expect(mockDel).toHaveBeenCalledTimes(1);
    });

    it('should not throw when Redis del fails', async () => {
      // Mock Redis error
      mockDel.mockRejectedValue(new Error('Redis del failed'));

      // Should not throw
      await expect(
        CacheService.invalidatePortfolio('portfolio-789')
      ).resolves.not.toThrow();
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
