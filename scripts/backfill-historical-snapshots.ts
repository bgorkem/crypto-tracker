#!/usr/bin/env tsx

/**
 * Backfill Historical Portfolio Snapshots
 * 
 * This script generates historical portfolio value snapshots for all portfolios
 * by calculating daily values from creation date to present.
 * 
 * Usage:
 *   npm run backfill:snapshots              # All portfolios, all dates
 *   npm run backfill:snapshots -- --portfolio-id=<uuid>  # Specific portfolio
 *   npm run backfill:snapshots -- --from=2024-01-01      # Specific date range
 * 
 * Requirements:
 *   - Historical prices must exist in price_cache table
 *   - Portfolio must have transactions
 */

import { createClient } from '@supabase/supabase-js';
import { calculateHoldings, calculatePortfolioValue, type Transaction } from '../lib/calculations';

//load dotenv to load from env.local
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Portfolio {
  id: string;
  name: string;
  created_at: string;
}

interface Snapshot {
  portfolio_id: string;
  snapshot_date: string;
  total_value: number;
  total_cost: number;
  total_pl: number;
  total_pl_pct: number;
  holdings_count: number;
}

async function getPortfolios(portfolioId?: string): Promise<Portfolio[]> {
  let query = supabase
    .from('portfolios')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (portfolioId) {
    query = query.eq('id', portfolioId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch portfolios: ${error.message}`);
  }

  return data || [];
}

async function getExistingSnapshots(
  portfolioId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date')
    .eq('portfolio_id', portfolioId);

  if (error) {
    throw new Error(`Failed to fetch existing snapshots: ${error.message}`);
  }

  return new Set(
    (data || []).map((s) => s.snapshot_date.split('T')[0]) // YYYY-MM-DD format
  );
}

// TODO: Refactor this to reduce complexity
// eslint-disable-next-line complexity
async function backfillPortfolio(
  portfolio: Portfolio,
  fromDate?: Date
): Promise<void> {
  console.log(`\n📊 Processing portfolio: ${portfolio.name} (${portfolio.id})`);

  // Get existing snapshots to avoid duplicates
  const existingSnapshots = await getExistingSnapshots(portfolio.id);
  console.log(`   Found ${existingSnapshots.size} existing snapshots`);

  // Determine date range - start from earliest transaction, not portfolio creation
  let startDate: Date;
  if (fromDate) {
    startDate = fromDate;
  } else {
    // Fetch earliest transaction date
    const { data: earliestTx, error: txError } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('portfolio_id', portfolio.id)
      .order('transaction_date', { ascending: true })
      .limit(1)
      .single();

    if (txError || !earliestTx) {
      console.log('   ℹ️  No transactions found, skipping portfolio');
      return;
    }

    startDate = new Date(earliestTx.transaction_date);
  }

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0); // Midnight today

  // Generate snapshots for each day
  const snapshots: Snapshot[] = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  let skipped = 0;
  let calculated = 0;

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];

    // Skip if snapshot already exists
    if (existingSnapshots.has(dateString)) {
      skipped++;
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Calculate historical value
    try {
      // 1. Fetch all transactions up to this date
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('id, symbol, type, quantity, price_per_unit, transaction_date')
        .eq('portfolio_id', portfolio.id)
        .lte('transaction_date', currentDate.toISOString());

      if (txnError) {
        console.error(`   ⚠️  Failed to fetch transactions for ${dateString}:`, txnError);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 2. Skip if no transactions yet
      if (!transactions || transactions.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 3. Fetch historical prices for this date
      const symbols = [...new Set(transactions.map(t => t.symbol))];
      const { data: prices, error: priceError } = await supabase
        .from('price_cache')
        .select('symbol, price_usd, change_24h_pct')
        .in('symbol', symbols)
        .eq('price_date', dateString);

      if (priceError) {
        console.error(`   ⚠️  Failed to fetch prices for ${dateString}:`, priceError);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 4. Skip if no price data available
      if (!prices || prices.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 5. Build price map
      const priceMap: Record<string, { symbol: string; price_usd: number; change_24h_pct: number }> = {};
      for (const price of prices) {
        priceMap[price.symbol] = {
          symbol: price.symbol,
          price_usd: price.price_usd,
          change_24h_pct: price.change_24h_pct || 0,
        };
      }

      // 6. Calculate holdings and portfolio value
      const holdings = calculateHoldings(
        transactions as Transaction[],
        priceMap
      );

      const portfolioValue = calculatePortfolioValue(holdings, []);

      snapshots.push({
        portfolio_id: portfolio.id,
        snapshot_date: dateString,
        total_value: portfolioValue.total_value,
        total_cost: portfolioValue.total_cost,
        total_pl: portfolioValue.total_pl,
        total_pl_pct: portfolioValue.total_pl_pct,
        holdings_count: portfolioValue.holdings_count,
      });

      calculated++;
    } catch (error) {
      console.error(`   ⚠️  Failed to calculate value for ${dateString}:`, error);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Bulk insert snapshots
  if (snapshots.length > 0) {
    console.log(`   Inserting ${snapshots.length} new snapshots...`);

    const { error } = await supabase
      .from('portfolio_snapshots')
      .insert(snapshots);

    if (error) {
      throw new Error(`Failed to insert snapshots: ${error.message}`);
    }

    console.log(`   ✅ Inserted ${snapshots.length} snapshots`);
  } else {
    console.log(`   ℹ️  No new snapshots to insert`);
  }

  console.log(`   Summary: ${calculated} calculated, ${skipped} skipped`);
}

async function main() {
  console.log('🚀 Starting historical snapshot backfill...\n');

  // Parse command-line arguments
  const args = process.argv.slice(2);
  const portfolioId = args
    .find((arg) => arg.startsWith('--portfolio-id='))
    ?.split('=')[1];
  const fromDateArg = args
    .find((arg) => arg.startsWith('--from='))
    ?.split('=')[1];

  const fromDate = fromDateArg ? new Date(fromDateArg) : undefined;

  if (fromDate && isNaN(fromDate.getTime())) {
    console.error('❌ Invalid --from date. Use format: YYYY-MM-DD');
    process.exit(1);
  }

  // Fetch portfolios
  const portfolios = await getPortfolios(portfolioId);

  if (portfolios.length === 0) {
    console.log('ℹ️  No portfolios found');
    process.exit(0);
  }

  console.log(`Found ${portfolios.length} portfolio(s) to process`);

  // Process each portfolio
  for (const portfolio of portfolios) {
    await backfillPortfolio(portfolio, fromDate);
  }

  console.log('\n✅ Backfill complete!');
}

// Run script
main().catch((error) => {
  console.error('\n❌ Backfill failed:', error);
  process.exit(1);
});
