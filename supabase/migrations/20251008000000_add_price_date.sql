-- Migration: Add price_date column to price_cache for historical price tracking
-- Feature: Phase 6 - Historical Price Tracking (T098)
-- Date: 2025-10-08

-- Add price_date column (nullable first to allow backfill)
ALTER TABLE price_cache ADD COLUMN IF NOT EXISTS price_date DATE;

-- Backfill existing records with today's date
UPDATE price_cache SET price_date = NOW()::DATE WHERE price_date IS NULL;

-- Make price_date required
ALTER TABLE price_cache ALTER COLUMN price_date SET NOT NULL;

-- Drop old primary key constraint if exists
ALTER TABLE price_cache DROP CONSTRAINT IF EXISTS price_cache_pkey;

-- Create composite primary key on (symbol, price_date)
ALTER TABLE price_cache ADD CONSTRAINT price_cache_pkey PRIMARY KEY (symbol, price_date);

-- Add index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_price_cache_date ON price_cache(price_date DESC);

-- Add index for symbol + date queries (composite)
CREATE INDEX IF NOT EXISTS idx_price_cache_symbol_date ON price_cache(symbol, price_date DESC);

-- Add comment for documentation
COMMENT ON COLUMN price_cache.price_date IS 'Date for which this price is valid (UTC). Allows historical price tracking.';
COMMENT ON TABLE price_cache IS 'Cryptocurrency price cache with historical tracking. Primary key is (symbol, price_date) to store daily prices.';
