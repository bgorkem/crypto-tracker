import { NextRequest, NextResponse } from 'next/server';
import { getTokenPrices } from '@/lib/moralis';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/prices
 * Fetch current cryptocurrency prices
 * 
 * Query params:
 * - symbols: Comma-separated list of symbols (e.g., "BTC,ETH,SOL")
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.error('Missing or invalid authentication token');
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Symbols parameter is required' } },
      { status: 400 }
    );
  }

  // Parse symbols
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());

  try {
    // Create admin Supabase client for caching (service role can bypass RLS)
    const adminClient = createAdminClient();

    // Fetch prices from Moralis
    const prices = await getTokenPrices(symbols);

    // Update price cache in database using admin client
    if (prices.length > 0) {
      // Get current date in UTC for price_date
      const priceDate = new Date().toISOString().split('T')[0];
      
      const { error: upsertError } = await adminClient
        .from('price_cache')
        .upsert(
          prices.map(p => ({
            symbol: p.symbol,
            price_date: priceDate,
            price_usd: p.price_usd,
            market_cap: p.market_cap,
            volume_24h: p.volume_24h,
            change_24h_pct: p.change_24h_pct,
            last_updated: p.last_updated,
          })),
          { 
            onConflict: 'symbol,price_date',
            ignoreDuplicates: false 
          }
        );

      if (upsertError) {
        console.error('Error updating price cache:', upsertError);
      }
    }

    return NextResponse.json(
      { data: prices },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=30',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch prices' } },
      { status: 500 }
    );
  }
}
