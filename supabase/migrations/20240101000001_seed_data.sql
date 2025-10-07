-- Seed Data Migration for Development/Testing
-- Migration: 20240101000001_seed_data
-- Description: Insert sample data for development and testing

-- =============================================================================
-- PRICE CACHE - Initial crypto prices
-- =============================================================================
INSERT INTO public.price_cache (symbol, price_usd, market_cap, volume_24h, change_24h_pct, last_updated)
VALUES
  ('BTC', 45000.00, 880000000000, 25000000000, 2.5, NOW()),
  ('ETH', 2500.00, 300000000000, 15000000000, 3.2, NOW()),
  ('SOL', 60.00, 25000000000, 1500000000, 5.8, NOW()),
  ('MATIC', 0.85, 7500000000, 500000000, -1.2, NOW()),
  ('AVAX', 35.00, 12000000000, 800000000, 4.1, NOW()),
  ('DOT', 7.50, 9000000000, 350000000, -0.5, NOW()),
  ('LINK', 15.00, 8000000000, 600000000, 1.8, NOW()),
  ('UNI', 6.50, 4500000000, 200000000, 2.1, NOW()),
  ('ATOM', 10.00, 3000000000, 250000000, 3.5, NOW()),
  ('XRP', 0.55, 30000000000, 2000000000, -2.1, NOW())
ON CONFLICT (symbol) DO UPDATE
  SET
    price_usd = EXCLUDED.price_usd,
    market_cap = EXCLUDED.market_cap,
    volume_24h = EXCLUDED.volume_24h,
    change_24h_pct = EXCLUDED.change_24h_pct,
    last_updated = EXCLUDED.last_updated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.price_cache.symbol IS 'Cryptocurrency symbol (e.g., BTC, ETH)';
COMMENT ON COLUMN public.price_cache.price_usd IS 'Current price in USD';
COMMENT ON COLUMN public.price_cache.market_cap IS 'Total market capitalization in USD';
COMMENT ON COLUMN public.price_cache.volume_24h IS '24-hour trading volume in USD';
COMMENT ON COLUMN public.price_cache.change_24h_pct IS '24-hour price change percentage';
