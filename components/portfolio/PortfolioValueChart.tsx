'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Interval = '24h' | '7d' | '30d' | '90d' | 'all';

interface ChartSnapshot {
  captured_at: string;
  total_value: number;
}

interface ChartData {
  interval: Interval;
  snapshots: ChartSnapshot[];
  current_value: string;
  start_value: string;
  change_abs: string;
  change_pct: string;
}

interface PortfolioValueChartProps {
  portfolioId: string;
  accessToken: string;
}

const INTERVAL_LABELS: Record<Interval, string> = {
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  all: 'All Time',
};

// Format currency
const formatCurrency = (value: number | string) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

// Format percentage
const formatPercentage = (value: number | string) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const sign = numValue >= 0 ? '+' : '';
  return `${sign}${numValue.toFixed(2)}%`;
};

// Custom tooltip component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      date: string;
      value: number;
      timestamp: string;
    };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-background border border-border p-3 rounded-md shadow-lg">
        <p className="text-sm font-medium">{dataPoint.date}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(dataPoint.value)}
        </p>
      </div>
    );
  }
  return null;
}

// Chart content based on state
interface ChartContentProps {
  isLoading: boolean;
  error: Error | null;
  chartData: Array<{ date: string; value: number; timestamp: string }>;
}

function ChartContent({ isLoading, error, chartData }: ChartContentProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Failed to load chart data. Please try again.
        </p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No data available for this time period
        </p>
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0"
            opacity={0.5}
          />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            tick={{ fill: '#64748b' }}
            fontSize={12}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#64748b' }}
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="linear"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorValue)"
            dot={false}
            activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Accessibility: Data table fallback */}
      <div className="sr-only" role="table" aria-label="Portfolio value data">
        <div role="row">
          <div role="columnheader">Date</div>
          <div role="columnheader">Value</div>
        </div>
        {chartData.map((point, index) => (
          <div key={index} role="row">
            <div role="cell">{point.date}</div>
            <div role="cell">{formatCurrency(point.value)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function PortfolioValueChart({ portfolioId, accessToken }: PortfolioValueChartProps) {
  const [selectedInterval, setSelectedInterval] = useState<Interval>('30d');

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-chart', portfolioId, selectedInterval],
    queryFn: async () => {
      const response = await fetch(
        `/api/portfolios/${portfolioId}/chart?interval=${selectedInterval}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const json = await response.json();
      return json.data as ChartData;
    },
    staleTime: 30000, // 30 seconds
  });

  // Format data for Recharts
  const chartData = data?.snapshots.map((snapshot) => ({
    date: new Date(snapshot.captured_at).toLocaleDateString(),
    value: snapshot.total_value,
    timestamp: snapshot.captured_at,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Value</CardTitle>
            <CardDescription>
              {data && (
                <span className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(data.current_value)}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      parseFloat(data.change_pct) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercentage(data.change_pct)}
                  </span>
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {(Object.keys(INTERVAL_LABELS) as Interval[]).map((interval) => (
              <Button
                key={interval}
                variant={selectedInterval === interval ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedInterval(interval)}
                aria-label={`View ${INTERVAL_LABELS[interval]}`}
              >
                {INTERVAL_LABELS[interval]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContent isLoading={isLoading} error={error} chartData={chartData} />
      </CardContent>
    </Card>
  );
}

