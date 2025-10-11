-- Migration: Add calculate_portfolio_snapshots function
-- Feature: 002-redis-snapshot-optimization
-- Date: 2025-10-10
-- Purpose: Calculate portfolio snapshots on-demand using proper cumulative aggregation

CREATE OR REPLACE FUNCTION calculate_portfolio_snapshots(
  p_portfolio_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  snapshot_date DATE,
  total_value NUMERIC(20, 2),
  total_cost NUMERIC(20, 2),
  total_pl NUMERIC(20, 2),
  total_pl_pct NUMERIC(10, 2),
  holdings_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Generate date series for the range
  date_series AS (
    SELECT generate_series(
      p_start_date,
      p_end_date,
      '1 day'::interval
    )::date AS snapshot_date
  ),
  
  -- For each date, calculate cumulative holdings from all transactions up to that date
  daily_holdings AS (
    SELECT 
      ds.snapshot_date,
      t.symbol,
      -- Sum all transactions up to this date for this symbol
      SUM(
        CASE 
          WHEN t.type = 'BUY' THEN t.quantity 
          ELSE -t.quantity 
        END
      ) AS quantity,
      -- Sum all costs up to this date for this symbol
      SUM(
        CASE 
          WHEN t.type = 'BUY' THEN t.quantity * t.price_per_unit
          ELSE -t.quantity * t.price_per_unit
        END
      ) AS cost_basis
    FROM date_series ds
    CROSS JOIN LATERAL (
      -- Get distinct symbols that have been traded up to this date
      SELECT DISTINCT symbol 
      FROM transactions 
      WHERE portfolio_id = p_portfolio_id 
        AND transaction_date::date <= ds.snapshot_date
    ) symbols
    LEFT JOIN transactions t 
      ON t.portfolio_id = p_portfolio_id 
      AND t.symbol = symbols.symbol
      AND t.transaction_date::date <= ds.snapshot_date
    GROUP BY ds.snapshot_date, t.symbol
    HAVING SUM(
      CASE 
        WHEN t.type = 'BUY' THEN t.quantity 
        ELSE -t.quantity 
      END
    ) > 0  -- Only include symbols with positive holdings
  ),
  
  -- Join with historical prices and calculate market values
  holdings_with_prices AS (
    SELECT 
      dh.snapshot_date,
      dh.symbol,
      dh.quantity,
      dh.cost_basis,
      pc.price_usd,
      (dh.quantity * COALESCE(pc.price_usd, 0)) AS market_value
    FROM daily_holdings dh
    LEFT JOIN price_cache pc 
      ON pc.symbol = dh.symbol 
      AND pc.price_date = dh.snapshot_date
  ),
  
  -- Aggregate by date
  daily_totals AS (
    SELECT 
      hwp.snapshot_date,
      COALESCE(SUM(hwp.market_value), 0) AS total_value,
      COALESCE(SUM(hwp.cost_basis), 0) AS total_cost,
      COUNT(DISTINCT hwp.symbol) AS holdings_count
    FROM holdings_with_prices hwp
    GROUP BY hwp.snapshot_date
  )
  
  -- Final calculation with P/L
  SELECT 
    dt.snapshot_date,
    dt.total_value,
    dt.total_cost,
    (dt.total_value - dt.total_cost) AS total_pl,
    CASE 
      WHEN dt.total_cost > 0 
      THEN ((dt.total_value - dt.total_cost) / dt.total_cost) * 100
      ELSE 0 
    END AS total_pl_pct,
    dt.holdings_count::INTEGER
  FROM daily_totals dt
  ORDER BY dt.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_portfolio_snapshots IS 
  'Calculates portfolio value snapshots for a date range. 
   For each date, sums all transactions up to that date to get cumulative position.
   Returns daily total_value, cost_basis, and P/L for charting.';
