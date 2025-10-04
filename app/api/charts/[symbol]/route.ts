import { NextRequest, NextResponse } from 'next/server';

type Interval = '1h' | '24h' | '7d' | '30d';

interface ChartDataPoint {
  timestamp: string;
  price: number;
  volume: number;
}

/**
 * Generates mock chart data for a given symbol and interval
 */
function generateMockChartData(symbol: string, interval: Interval): ChartDataPoint[] {
  const now = new Date();
  const points: ChartDataPoint[] = [];
  
  // Determine time step and number of points based on interval
  const config = {
    '1h': { stepMinutes: 5, numPoints: 12 },      // 12 points, 5 min apart = 60 min
    '24h': { stepMinutes: 60, numPoints: 24 },    // 24 points, 1 hour apart = 24 hours
    '7d': { stepMinutes: 360, numPoints: 28 },    // 28 points, 6 hours apart = 7 days
    '30d': { stepMinutes: 1440, numPoints: 30 },  // 30 points, 1 day apart = 30 days
  };
  
  const { stepMinutes, numPoints } = config[interval];
  
  // Base prices for different symbols
  const basePrices: Record<string, number> = {
    BTC: 65000,
    ETH: 3500,
    SOL: 150,
    USDC: 1.0,
    USDT: 1.0,
    BNB: 600,
  };
  
  const basePrice = basePrices[symbol] || 100;
  const baseVolume = basePrice * 1000000; // Proportional to price
  
  // Generate points going backwards in time
  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * stepMinutes * 60 * 1000);
    
    // Add some realistic variation
    const priceVariation = (Math.random() - 0.5) * 0.05; // ±5%
    const volumeVariation = (Math.random() - 0.5) * 0.3; // ±30%
    
    points.push({
      timestamp: timestamp.toISOString(),
      price: basePrice * (1 + priceVariation),
      volume: baseVolume * (1 + volumeVariation),
    });
  }
  
  return points;
}

/**
 * GET /api/charts/:symbol
 * Fetch historical price chart data
 * 
 * Path params:
 * - symbol: Cryptocurrency symbol (e.g., "BTC")
 * 
 * Query params:
 * - interval: Time interval (1h, 24h, 7d, 30d)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const params = await context.params;
  const { symbol } = params;
  
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
  const interval = searchParams.get('interval') as Interval;

  // Validate interval
  const validIntervals: Interval[] = ['1h', '24h', '7d', '30d'];
  if (!interval || !validIntervals.includes(interval)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid interval. Must be one of: 1h, 24h, 7d, 30d' } },
      { status: 400 }
    );
  }

  try {
    // Generate chart data (mock data for now)
    // TODO: In production, fetch from TradingView or other chart data provider
    const points = generateMockChartData(symbol.toUpperCase(), interval);

    return NextResponse.json({
      data: {
        symbol: symbol.toUpperCase(),
        interval,
        points,
      },
    });
  } catch (error) {
    console.error('Error generating chart data:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch chart data' } },
      { status: 500 }
    );
  }
}
