/**
 * Metrics and observability helpers for chart API
 * Logs structured JSON for monitoring and debugging
 */

import type { ChartData } from './redis';

interface BaseMetric {
  timestamp: string;
  portfolioId: string;
  interval: ChartData['interval'];
}

interface CacheHitMetric extends BaseMetric {
  event: 'cache_hit';
  cached_at: string; // When the data was cached
}

interface CacheMissMetric extends BaseMetric {
  event: 'cache_miss';
  reason: 'not_found' | 'error' | 'expired';
}

interface CacheInvalidationMetric extends BaseMetric {
  event: 'cache_invalidation';
}

interface DbFunctionLatencyMetric extends BaseMetric {
  event: 'db_function_latency';
  latency_ms: number;
  snapshot_count: number;
}

type _ChartMetric =
  | CacheHitMetric
  | CacheMissMetric
  | CacheInvalidationMetric
  | DbFunctionLatencyMetric;

/**
 * Chart metrics helper for observability
 */
export const chartMetrics = {
  /**
   * Log cache hit event
   */
  cacheHit(
    portfolioId: string,
    interval: ChartData['interval'],
    cachedAt: string
  ): void {
    const metric: CacheHitMetric = {
      event: 'cache_hit',
      timestamp: new Date().toISOString(),
      portfolioId,
      interval,
      cached_at: cachedAt,
    };

    console.log(JSON.stringify(metric));
  },

  /**
   * Log cache miss event
   */
  cacheMiss(
    portfolioId: string,
    interval: ChartData['interval'],
    reason: CacheMissMetric['reason'] = 'not_found'
  ): void {
    const metric: CacheMissMetric = {
      event: 'cache_miss',
      timestamp: new Date().toISOString(),
      portfolioId,
      interval,
      reason,
    };

    console.log(JSON.stringify(metric));
  },

  /**
   * Log cache invalidation event
   */
  cacheInvalidation(
    portfolioId: string,
    interval: ChartData['interval'] = '24h' // Default, but invalidation affects all intervals
  ): void {
    const metric: CacheInvalidationMetric = {
      event: 'cache_invalidation',
      timestamp: new Date().toISOString(),
      portfolioId,
      interval,
    };

    console.log(JSON.stringify(metric));
  },

  /**
   * Log database function execution latency
   */
  dbFunctionLatency(
    portfolioId: string,
    interval: ChartData['interval'],
    latencyMs: number,
    snapshotCount: number
  ): void {
    const metric: DbFunctionLatencyMetric = {
      event: 'db_function_latency',
      timestamp: new Date().toISOString(),
      portfolioId,
      interval,
      latency_ms: latencyMs,
      snapshot_count: snapshotCount,
    };

    console.log(JSON.stringify(metric));
  },
};
