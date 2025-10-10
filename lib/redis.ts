/**
 * Redis cache client for portfolio chart data
 * Uses Vercel KV (Redis) for fast, ephemeral caching
 */

import { kv } from '@vercel/kv';

/**
 * Chart data structure stored in Redis cache
 */
export interface ChartData {
  interval: '24h' | '7d' | '30d' | '90d' | 'all';
  snapshots: Array<{
    snapshot_date: string;
    total_value: string;
    total_cost: string;
    total_pl: string;
    total_pl_pct: string;
    holdings_count: number;
  }>;
  current_value: string;
  start_value: string;
  change_abs: string;
  change_pct: string;
  cached_at: string; // ISO timestamp when cached
}

/**
 * Cache key patterns for namespacing
 * Format: portfolio:{portfolioId}:chart:{interval}
 */
export const CACHE_KEYS = {
  /**
   * Generate cache key for chart data
   */
  chartData: (portfolioId: string, interval: ChartData['interval']) =>
    `portfolio:${portfolioId}:chart:${interval}`,

  /**
   * Generate wildcard pattern for all chart data of a portfolio
   */
  portfolioCharts: (portfolioId: string) => `portfolio:${portfolioId}:chart:*`,
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 * 5 minutes - balances freshness with reduced database load
 */
const CACHE_TTL = 60 * 5; // 5 minutes

/**
 * Service for managing portfolio chart data cache
 */
export class CacheService {
  /**
   * Get cached chart data for a portfolio and interval
   * 
   * @param portfolioId - Portfolio UUID
   * @param interval - Time interval (24h, 7d, 30d, 90d, all)
   * @returns Cached chart data or null if not found/error
   */
  static async getChartData(
    portfolioId: string,
    interval: ChartData['interval']
  ): Promise<ChartData | null> {
    try {
      const key = CACHE_KEYS.chartData(portfolioId, interval);
      const cached = await kv.get<string>(key);

      if (!cached) {
        return null;
      }

      // Parse JSON string to ChartData object
      return JSON.parse(cached) as ChartData;
    } catch (error) {
      // Graceful degradation: log error but return null
      // This allows the API to fall back to database calculation
      console.error('Redis cache read error:', error);
      return null;
    }
  }

  /**
   * Store chart data in cache with TTL
   * 
   * @param portfolioId - Portfolio UUID
   * @param interval - Time interval
   * @param data - Chart data to cache
   */
  static async setChartData(
    portfolioId: string,
    interval: ChartData['interval'],
    data: Omit<ChartData, 'cached_at'>
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.chartData(portfolioId, interval);
      
      // Add cached_at timestamp
      const cacheData: ChartData = {
        ...data,
        cached_at: new Date().toISOString(),
      };

      // Store as JSON string with TTL
      await kv.set(key, JSON.stringify(cacheData), {
        ex: CACHE_TTL,
      });
    } catch (error) {
      // Graceful degradation: log error but don't throw
      // Cache write failures shouldn't break the API response
      console.error('Redis cache write error:', error);
    }
  }

  /**
   * Invalidate all cached chart data for a portfolio
   * Called when portfolio transactions are modified
   * 
   * @param portfolioId - Portfolio UUID
   */
  static async invalidatePortfolio(portfolioId: string): Promise<void> {
    try {
      // Delete all 5 interval keys for this portfolio
      const intervals: ChartData['interval'][] = ['24h', '7d', '30d', '90d', 'all'];
      const keys = intervals.map(interval => CACHE_KEYS.chartData(portfolioId, interval));

      // Delete all keys atomically
      await kv.del(...keys);
    } catch (error) {
      // Log error but don't throw - cache invalidation failures are non-critical
      console.error('Redis cache invalidation error:', error);
    }
  }
}

// Export kv client for direct access if needed
export { kv };
