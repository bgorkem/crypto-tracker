// @ts-ignore: Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore: Deno types
import { getHistoricalPrices } from '../_shared/coingecko.ts';

interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
}

interface Holding {
  symbol: string;
  total_quantity: number;
  average_cost: number;
  market_value: number;
  unrealized_pl: number;
  current_price: number;
  price_change_24h_pct: number | null;
}

interface Price {
  symbol: string;
  price_usd: number;
  change_24h_pct: number;
}

/**
 * Calculate current holdings from transaction history
 */
function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, Price>
): Holding[] {
  const symbolMap = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    if (!symbolMap.has(txn.symbol)) {
      symbolMap.set(txn.symbol, []);
    }
    symbolMap.get(txn.symbol)!.push(txn);
  }

  const holdings: Holding[] = [];

  for (const [symbol, symbolTxns] of symbolMap.entries()) {
    const sortedTxns = symbolTxns.sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime()
    );

    let totalQuantity = 0;
    let totalCost = 0;

    for (const txn of sortedTxns) {
      if (txn.type === 'BUY') {
        totalQuantity += txn.quantity;
        totalCost += txn.quantity * txn.price_per_unit;
      } else if (txn.type === 'SELL') {
        const sellRatio = txn.quantity / totalQuantity;
        const costReduction = totalCost * sellRatio;
        totalQuantity -= txn.quantity;
        totalCost -= costReduction;
      }
    }

    if (totalQuantity > 0) {
      const averageCost = totalCost / totalQuantity;
      const currentPrice = currentPrices[symbol]?.price_usd || 0;
      const marketValue = totalQuantity * currentPrice;
      const unrealizedPL = marketValue - totalCost;

      holdings.push({
        symbol,
        total_quantity: totalQuantity,
        average_cost: averageCost,
        market_value: marketValue,
        unrealized_pl: unrealizedPL,
        current_price: currentPrice,
        price_change_24h_pct: currentPrices[symbol]?.change_24h_pct || null,
      });
    }
  }

  return holdings;
}

/**
 * Daily Snapshot Edge Function
 * 
 * Runs daily at 00:00 UTC to:
 * 1. Fetch yesterday's cryptocurrency prices
 * 2. Store prices in price_cache
 * 3. Calculate portfolio values
 * 4. Store snapshots in portfolio_snapshots
 */
serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dateString = yesterday.toISOString().split('T')[0];

    console.log(`[Daily Snapshot] Running for date: ${dateString}`);

    // 1. Fetch yesterday's prices from CoinGecko
    const symbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB', 'XRP'];
    console.log(`[Daily Snapshot] Fetching prices for: ${symbols.join(', ')}`);

    const prices = await getHistoricalPrices(symbols, yesterday);

    if (prices.length === 0) {
      console.error('[Daily Snapshot] No prices fetched from CoinGecko');
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch prices',
          success: false 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Store prices in price_cache (upsert to avoid duplicates)
    console.log(`[Daily Snapshot] Storing ${prices.length} prices in cache`);

    const { error: priceError } = await supabase
      .from('price_cache')
      .upsert(
        prices.map((p) => ({
          symbol: p.symbol,
          price_usd: p.price_usd,
          price_date: dateString,
        })),
        { onConflict: 'symbol,price_date' }
      );

    if (priceError) {
      console.error('[Daily Snapshot] Failed to store prices:', priceError);
      throw priceError;
    }

    // 3. Fetch all portfolios
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, name');

    if (portfolioError) {
      console.error('[Daily Snapshot] Failed to fetch portfolios:', portfolioError);
      throw portfolioError;
    }

    if (!portfolios || portfolios.length === 0) {
      console.log('[Daily Snapshot] No portfolios to process');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No portfolios to process',
          prices_stored: prices.length,
          snapshots_created: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Daily Snapshot] Processing ${portfolios.length} portfolios`);

    // 4. Calculate value for each portfolio and create snapshots
    const snapshots = [];

    for (const portfolio of portfolios) {
      try {
        // Fetch transactions up to yesterday
        const { data: transactions, error: txnError } = await supabase
          .from('transactions')
          .select('id, symbol, type, quantity, price_per_unit, transaction_date')
          .eq('portfolio_id', portfolio.id)
          .lte('transaction_date', yesterday.toISOString());

        if (txnError) {
          console.error(`[Daily Snapshot] Error fetching transactions for ${portfolio.id}:`, txnError);
          continue;
        }

        if (!transactions || transactions.length === 0) {
          console.log(`[Daily Snapshot] No transactions for portfolio ${portfolio.name}`);
          continue;
        }

        // Build price lookup
        const priceMap: Record<string, Price> = {};
        for (const price of prices) {
          priceMap[price.symbol] = {
            symbol: price.symbol,
            price_usd: price.price_usd,
            change_24h_pct: 0, // Not needed for historical
          };
        }

        // Calculate holdings
        const holdings = calculateHoldings(transactions, priceMap);

        if (holdings.length === 0) {
          console.log(`[Daily Snapshot] No holdings for portfolio ${portfolio.name}`);
          snapshots.push({
            portfolio_id: portfolio.id,
            snapshot_date: dateString,
            total_value: 0,
          });
          continue;
        }

        // Calculate total value
        const totalValue = holdings.reduce((sum, h) => sum + h.market_value, 0);

        snapshots.push({
          portfolio_id: portfolio.id,
          snapshot_date: dateString,
          total_value: totalValue,
        });

        console.log(`[Daily Snapshot] Portfolio ${portfolio.name}: $${totalValue.toFixed(2)}`);
      } catch (err) {
        console.error(`[Daily Snapshot] Error processing portfolio ${portfolio.id}:`, err);
      }
    }

    // 5. Insert snapshots (upsert to avoid duplicates)
    if (snapshots.length > 0) {
      const { error: snapshotError } = await supabase
        .from('portfolio_snapshots')
        .upsert(snapshots, { onConflict: 'portfolio_id,snapshot_date' });

      if (snapshotError) {
        console.error('[Daily Snapshot] Failed to store snapshots:', snapshotError);
        throw snapshotError;
      }
    }

    console.log(`[Daily Snapshot] ✅ Complete: ${snapshots.length} snapshots created`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateString,
        prices_stored: prices.length,
        snapshots_created: snapshots.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Daily Snapshot] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
