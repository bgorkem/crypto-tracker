-- Migration: Drop portfolio_snapshots table
-- Feature: 002-redis-snapshot-optimization
-- Date: 2025-10-10
-- Reason: Replacing with Redis cache + on-demand calculation approach

-- Drop table (no active users, clean cutover - no data loss risk)
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;

-- Drop associated indexes (already removed with CASCADE, but explicit for clarity)
-- These were defined in the original schema:
-- - idx_snapshots_portfolio_date
-- - idx_snapshots_date  
-- - idx_snapshots_portfolio_id

-- Add schema-level comment to document the change
COMMENT ON SCHEMA public IS 'Portfolio snapshots table removed (2025-10-10) - using Redis cache + on-demand calculation via calculate_portfolio_snapshots() function';
