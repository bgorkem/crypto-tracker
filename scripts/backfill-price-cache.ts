#!/usr/bin/env tsx

/**
 * Backfill Price Cache Script
 * 
 * Fetches historical cryptocurrency prices from CoinGecko for the last 30 days
 * and populates the price_cache table.
 * 
 * Usage:
 *   npm run backfill:prices              # Last 30 days
 *   npm run backfill:prices -- --days=60 # Custom number of days
 * 
 * Requirements:
 *   - CoinGecko API access (no key required for free tier)
 *   - Supabase database configured
 */

import { createClient } from '@supabase/supabase-js';
import { getHistoricalPrice } from '../lib/coingecko';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

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

// Supported symbols
const SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB', 'XRP'];

interface PriceRecord {
  symbol: string;
  price_usd: number;
  price_date: string;
}

// TODO: Refactor this to reduce complexity
// eslint-disable-next-line complexity
async function backfillPrices(days: number): Promise<void> {
  console.log(`🚀 Starting price backfill for ${days} days...\n`);
  console.log(`Symbols: ${SYMBOLS.join(', ')}\n`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const priceRecords: PriceRecord[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Iterate through each day
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() - i);
    const dateString = currentDate.toISOString().split('T')[0];

    console.log(`📅 Processing ${dateString}...`);

    // Check if prices already exist for this date
    const { data: existing, error: checkError } = await supabase
      .from('price_cache')
      .select('symbol')
      .eq('price_date', dateString);

    if (checkError) {
      console.error(`   ⚠️  Error checking existing prices: ${checkError.message}`);
      continue;
    }

    const existingSymbols = new Set(existing?.map(p => p.symbol) || []);
    const symbolsToFetch = SYMBOLS.filter(s => !existingSymbols.has(s));

    if (symbolsToFetch.length === 0) {
      console.log(`   ✓ All prices already exist, skipping`);
      continue;
    }

    console.log(`   Fetching ${symbolsToFetch.length} symbols...`);

    // Fetch prices for each symbol
    for (const symbol of symbolsToFetch) {
      try {
        const price = await getHistoricalPrice(symbol, currentDate);

        if (price) {
          priceRecords.push({
            symbol,
            price_usd: price.price_usd,
            price_date: dateString,
          });
          successCount++;
          console.log(`   ✓ ${symbol}: $${price.price_usd.toFixed(2)}`);
        } else {
          errorCount++;
          console.log(`   ✗ ${symbol}: No price data available`);
        }

        // Rate limiting: Wait 2.5 seconds between requests (CoinGecko free tier: ~10-50 calls/min)
        // The coingecko lib has internal rate limiting of 1.2s, we add extra buffer
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (error) {
        errorCount++;
        console.error(`   ✗ ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('');
  }

  // Bulk insert all collected prices
  if (priceRecords.length > 0) {
    console.log(`\n💾 Inserting ${priceRecords.length} price records...`);

    const { error: insertError } = await supabase
      .from('price_cache')
      .upsert(priceRecords, { onConflict: 'symbol,price_date' });

    if (insertError) {
      throw new Error(`Failed to insert prices: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${priceRecords.length} prices`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total prices fetched: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Records inserted: ${priceRecords.length}`);
}

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const daysArg = args
    .find((arg) => arg.startsWith('--days='))
    ?.split('=')[1];

  const days = daysArg ? parseInt(daysArg, 10) : 30;

  if (isNaN(days) || days <= 0) {
    console.error('❌ Invalid --days value. Must be a positive number.');
    process.exit(1);
  }

  try {
    await backfillPrices(days);
    console.log('\n✅ Price backfill complete!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
