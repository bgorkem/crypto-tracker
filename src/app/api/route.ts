import { NextRequest, NextResponse } from 'next/server';
import { getTokenPrices } from '@/lib/moralis';

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
    // Fetch prices from Moralis
    const prices = await getTokenPrices(symbols);

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
