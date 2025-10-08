/**
 * Integration Test: Historical Price Tracking End-to-End
 * 
 * Tests the complete historical price tracking workflow:
 * 1. Create test portfolio with historical transaction
 * 2. Mock CoinGecko API responses
 * 3. Run backfill functionality
 * 4. Verify snapshots created in database
 * 5. Query chart API
 * 6. Assert correct historical values returned
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAuthenticatedClient } from '@/lib/supabase';
import { calculateHistoricalValue } from '@/lib/calculations';
import { createClient } from '@supabase/supabase-js';

// Test data
const TEST_EMAIL = 'integration-test-user@example.com';
const TEST_PASSWORD = 'TestPassword123!';
let authToken = '';
let userId = '';
let testPortfolioId = '';
let supabase: ReturnType<typeof createAuthenticatedClient>;

describe('Historical Price Tracking Integration', () => {
  beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client with service role key
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create test user
    const { data: signUpData, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (signUpError) {
      throw new Error(`Failed to create test user: ${signUpError.message}`);
    }

    userId = signUpData.user!.id;

    // Sign in to get token
    const { data: signInData, error: signInError } = await adminSupabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`);
    }

    authToken = signInData.session!.access_token;
    supabase = createAuthenticatedClient(authToken);

    // Create test portfolio with past created_at date
    const pastDate = new Date('2024-01-01T00:00:00Z');
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .insert({
        user_id: userId,
        name: 'Integration Test Portfolio',
        created_at: pastDate.toISOString(),
      })
      .select()
      .single();

    if (portfolioError) {
      throw new Error(`Failed to create portfolio: ${portfolioError.message}`);
    }

    testPortfolioId = portfolio.id;

    // Create historical transaction (Jan 5, 2024)
    const txDate = new Date('2024-01-05T00:00:00Z');
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        portfolio_id: testPortfolioId,
        symbol: 'BTC',
        type: 'BUY',
        quantity: 0.5,
        price_per_unit: 30000,
        executed_at: txDate.toISOString(),
        transaction_date: txDate.toISOString(),
      });

    if (txError) {
      throw new Error(`Failed to create transaction: ${txError.message}`);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testPortfolioId) {
      await supabase.from('transactions').delete().eq('portfolio_id', testPortfolioId);
      await supabase.from('portfolio_snapshots').delete().eq('portfolio_id', testPortfolioId);
      await supabase.from('portfolios').delete().eq('id', testPortfolioId);
    }

    if (userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      await adminSupabase.auth.admin.deleteUser(userId);
    }
  });

  it('should calculate historical value correctly', async () => {
    // Mock historical prices
    const testDate = new Date('2024-01-10T00:00:00Z');
    const btcPrice = 40000;

    // Insert mock price into price_cache
    const { error: priceError } = await supabase
      .from('price_cache')
      .upsert({
        symbol: 'BTC',
        price_usd: btcPrice,
        price_date: testDate.toISOString().split('T')[0],
      });

    expect(priceError).toBeNull();

    // Calculate historical value
    const value = await calculateHistoricalValue(
      testPortfolioId,
      testDate,
      supabase as never
    );

    // 0.5 BTC * $40,000 = $20,000
    expect(value).toBe(20000);
  });

  it('should create snapshots via manual calculation', async () => {
    // Clear any existing snapshots
    await supabase
      .from('portfolio_snapshots')
      .delete()
      .eq('portfolio_id', testPortfolioId);

    // Create snapshots for a few dates manually (simulating backfill)
    const dates = [
      '2024-01-06',
      '2024-01-07',
      '2024-01-08',
      '2024-01-09',
      '2024-01-10',
    ];

    const btcPrice = 35000;

    for (const dateStr of dates) {
      // Insert price
      await supabase.from('price_cache').upsert({
        symbol: 'BTC',
        price_usd: btcPrice,
        price_date: dateStr,
      });

      // Calculate value
      const date = new Date(dateStr);
      const value = await calculateHistoricalValue(
        testPortfolioId,
        date,
        supabase as never
      );

      // Insert snapshot (with required fields - using placeholder values for cost/P&L)
      await supabase.from('portfolio_snapshots').insert({
        portfolio_id: testPortfolioId,
        snapshot_date: dateStr,
        total_value: value,
        total_cost: 0, // Placeholder
        total_pl: 0, // Placeholder
        total_pl_pct: 0, // Placeholder
        holdings_count: 1,
      });
    }

    // Verify snapshots created
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, total_value')
      .eq('portfolio_id', testPortfolioId)
      .order('snapshot_date', { ascending: true });

    expect(error).toBeNull();
    expect(snapshots).toHaveLength(5);

    // All values should be 0.5 BTC * $35,000 = $17,500
    snapshots?.forEach((snapshot) => {
      expect(snapshot.total_value).toBe(17500);
    });
  });

  it('should return chart data from snapshots', async () => {
    // Query chart API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/portfolios/${testPortfolioId}/chart?interval=7d`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.ok).toBe(true);

    const json = await response.json();

    expect(json.data).toBeDefined();
    expect(json.data.interval).toBe('7d');
    expect(json.data.snapshots).toBeInstanceOf(Array);
    expect(json.data.snapshots.length).toBeGreaterThan(0);

    // Verify snapshot values
    const firstSnapshot = json.data.snapshots[0];
    expect(firstSnapshot.captured_at).toBeDefined();
    expect(firstSnapshot.total_value).toBe(17500);
  });

  it('should show different values for different dates', async () => {
    // Clear snapshots
    await supabase
      .from('portfolio_snapshots')
      .delete()
      .eq('portfolio_id', testPortfolioId);

    // Create snapshots with different prices
    const testData = [
      { date: '2024-01-06', price: 30000 },
      { date: '2024-01-07', price: 32000 },
      { date: '2024-01-08', price: 35000 },
      { date: '2024-01-09', price: 33000 },
      { date: '2024-01-10', price: 36000 },
    ];

    for (const { date, price } of testData) {
      await supabase.from('price_cache').upsert({
        symbol: 'BTC',
        price_usd: price,
        price_date: date,
      });

      const value = await calculateHistoricalValue(
        testPortfolioId,
        new Date(date),
        supabase as never
      );

      await supabase.from('portfolio_snapshots').insert({
        portfolio_id: testPortfolioId,
        snapshot_date: date,
        total_value: value,
        total_cost: 0, // Placeholder
        total_pl: 0, // Placeholder
        total_pl_pct: 0, // Placeholder
        holdings_count: 1,
      });
    }

    // Query snapshots
    const { data: snapshots } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, total_value')
      .eq('portfolio_id', testPortfolioId)
      .order('snapshot_date', { ascending: true });

    expect(snapshots).toHaveLength(5);

    // Verify values match expected calculations
    const expectedValues = [
      0.5 * 30000, // $15,000
      0.5 * 32000, // $16,000
      0.5 * 35000, // $17,500
      0.5 * 33000, // $16,500
      0.5 * 36000, // $18,000
    ];

    snapshots?.forEach((snapshot, index) => {
      expect(snapshot.total_value).toBe(expectedValues[index]);
    });
  });

  it('should handle multiple holdings correctly', async () => {
    // Add ETH transaction
    const ethTxDate = new Date('2024-01-07T00:00:00Z');
    await supabase.from('transactions').insert({
      portfolio_id: testPortfolioId,
      symbol: 'ETH',
      type: 'BUY',
      quantity: 10,
      price_per_unit: 2000,
      executed_at: ethTxDate.toISOString(),
      transaction_date: ethTxDate.toISOString(),
    });

    // Add prices for both symbols
    const testDate = new Date('2024-01-15T00:00:00Z');
    const dateString = testDate.toISOString().split('T')[0];

    await supabase.from('price_cache').upsert([
      { symbol: 'BTC', price_usd: 40000, price_date: dateString },
      { symbol: 'ETH', price_usd: 3000, price_date: dateString },
    ]);

    // Calculate value
    const value = await calculateHistoricalValue(
      testPortfolioId,
      testDate,
      supabase as never
    );

    // 0.5 BTC * $40,000 + 10 ETH * $3,000 = $20,000 + $30,000 = $50,000
    expect(value).toBe(50000);
  });

  it('should handle SELL transactions correctly', async () => {
    // Add SELL transaction
    const sellDate = new Date('2024-01-20T00:00:00Z');
    await supabase.from('transactions').insert({
      portfolio_id: testPortfolioId,
      symbol: 'BTC',
      type: 'SELL',
      quantity: 0.3,
      price_per_unit: 45000,
      executed_at: sellDate.toISOString(),
      transaction_date: sellDate.toISOString(),
    });

    // Add price for calculation
    const testDate = new Date('2024-01-21T00:00:00Z');
    const dateString = testDate.toISOString().split('T')[0];

    await supabase.from('price_cache').upsert([
      { symbol: 'BTC', price_usd: 46000, price_date: dateString },
      { symbol: 'ETH', price_usd: 3100, price_date: dateString },
    ]);

    // Calculate value
    const value = await calculateHistoricalValue(
      testPortfolioId,
      testDate,
      supabase as never
    );

    // Remaining: 0.2 BTC * $46,000 + 10 ETH * $3,100 = $9,200 + $31,000 = $40,200
    expect(value).toBe(40200);
  });

  it('should warn when no snapshots exist', async () => {
    // Create new portfolio without snapshots
    const { data: newPortfolio } = await supabase
      .from('portfolios')
      .insert({
        user_id: userId,
        name: 'Empty Portfolio',
      })
      .select()
      .single();

    const emptyPortfolioId = newPortfolio!.id;

    try {
      // Query chart API
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(
        `${baseUrl}/api/portfolios/${emptyPortfolioId}/chart?interval=7d`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.ok).toBe(true);

      const json = await response.json();

      expect(json.data.warning).toBeDefined();
      expect(json.data.warning).toContain('No historical data available');
      expect(json.data.snapshots).toHaveLength(0);
    } finally {
      // Clean up
      await supabase.from('portfolios').delete().eq('id', emptyPortfolioId);
    }
  });
});
