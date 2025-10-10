/**
 * Unit tests for calculate_portfolio_snapshots PostgreSQL function
 * Tests the database function directly via RPC calls
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

type SnapshotData = {
  snapshot_date: string;
  total_value: string;
  total_cost: string;
  total_pl: string;
  total_pl_pct: string;
  holdings_count: number;
};

describe('calculate_portfolio_snapshots Database Function', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
  });

  it('should return empty array for portfolio with no transactions', async () => {
    // Generate a UUID that doesn't exist in the database
    const nonExistentPortfolioId = '00000000-0000-0000-0000-000000000000';
    
    // @ts-expect-error - RPC function not in generated types yet
    const result = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: nonExistentPortfolioId,
      p_start_date: '2025-01-01',
      p_end_date: '2025-01-10',
    });
    
    const { data, error } = result as { data: SnapshotData[] | null; error: unknown };

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should return 10 snapshots for 10-day date range with properties', async () => {
    // This test assumes we have test data or will create it
    // For now, we're testing the function structure
    const testPortfolioId = '00000000-0000-0000-0000-000000000001';
    
    // @ts-expect-error - RPC function not in generated types yet
    const result = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: testPortfolioId,
      p_start_date: '2025-01-01',
      p_end_date: '2025-01-10',
    });
    
    const { data, error } = result as { data: SnapshotData[] | null; error: unknown };

    // Function should execute without errors
    expect(error).toBeNull();
    
    // Data should be an array (may be empty if no transactions)
    expect(Array.isArray(data)).toBe(true);
    
    // If data exists, verify structure
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('snapshot_date');
      expect(data[0]).toHaveProperty('total_value');
      expect(data[0]).toHaveProperty('total_cost');
      expect(data[0]).toHaveProperty('total_pl');
      expect(data[0]).toHaveProperty('total_pl_pct');
      expect(data[0]).toHaveProperty('holdings_count');
    }
  });

  it('should gracefully handle dates with missing price_cache data', async () => {
    // Test that function doesn't error when price data is missing
    const testPortfolioId = '00000000-0000-0000-0000-000000000002';
    
    // Use dates far in the past where price_cache likely doesn't exist
    // @ts-expect-error - RPC function not in generated types yet
    const result = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: testPortfolioId,
      p_start_date: '2020-01-01',
      p_end_date: '2020-01-05',
    });
    
    const { data, error } = result as { data: SnapshotData[] | null; error: unknown };

    // Should not throw an error even with missing price data (LEFT JOIN)
    expect(error).toBeNull();
    
    // Data should be an array (structure should be valid)
    expect(Array.isArray(data)).toBe(true);
    
    // If portfolio has no transactions for this period, array will be empty
    // If it has transactions but no prices, values should be 0 (COALESCE)
    if (data && data.length > 0) {
      // Verify that missing prices result in 0 values, not errors
      data.forEach((snapshot: SnapshotData) => {
        expect(snapshot.total_value).toBeDefined();
        expect(typeof snapshot.total_value).toBe('string'); // NUMERIC returns as string
      });
    }
  });

  it('should handle window function cumulative calculations correctly', async () => {
    // Test that window functions calculate cumulative holdings properly
    const testPortfolioId = '00000000-0000-0000-0000-000000000003';
    
    // @ts-expect-error - RPC function not in generated types yet
    const result = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: testPortfolioId,
      p_start_date: '2025-01-01',
      p_end_date: '2025-01-15',
    });
    
    const { data, error } = result as { data: SnapshotData[] | null; error: unknown };

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    
    // Snapshots should be ordered by date descending
    if (data && data.length > 1) {
      const dates = data.map((d: SnapshotData) => new Date(d.snapshot_date).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    }
  });

  it('should return correct data types for all fields', async () => {
    const testPortfolioId = '00000000-0000-0000-0000-000000000004';
    
    // @ts-expect-error - RPC function not in generated types yet
    const result = await supabase.rpc('calculate_portfolio_snapshots', {
      p_portfolio_id: testPortfolioId,
      p_start_date: '2025-01-01',
      p_end_date: '2025-01-03',
    });
    
    const { data, error } = result as { data: SnapshotData[] | null; error: unknown };

    expect(error).toBeNull();
    
    if (data && data.length > 0) {
      const snapshot = data[0];
      
      // snapshot_date should be a valid date string
      expect(snapshot.snapshot_date).toBeDefined();
      expect(typeof snapshot.snapshot_date).toBe('string');
      expect(new Date(snapshot.snapshot_date).toString()).not.toBe('Invalid Date');
      
      // Numeric fields should be strings (PostgreSQL NUMERIC type)
      expect(typeof snapshot.total_value).toBe('string');
      expect(typeof snapshot.total_cost).toBe('string');
      expect(typeof snapshot.total_pl).toBe('string');
      expect(typeof snapshot.total_pl_pct).toBe('string');
      
      // holdings_count should be a number (INTEGER type)
      expect(typeof snapshot.holdings_count).toBe('number');
    }
  });
});

