-- Initial Schema Migration for Crypto Portfolio Tracker
-- Migration: 20240101000000_initial_schema
-- Description: Create core tables for users, portfolios, transactions, and snapshots

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE transaction_type AS ENUM ('BUY', 'SELL');

-- =============================================================================
-- USERS TABLE (managed by Supabase Auth, but we add a profile)
-- =============================================================================
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- =============================================================================
-- PORTFOLIOS TABLE
-- =============================================================================
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  description TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(base_currency) = 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_portfolios_created_at ON public.portfolios(created_at DESC);

-- =============================================================================
-- TRANSACTIONS TABLE (Event-sourced)
-- =============================================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK (char_length(symbol) > 0 AND char_length(symbol) <= 20),
  type transaction_type NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  price_per_unit NUMERIC(20, 2) NOT NULL CHECK (price_per_unit > 0),
  transaction_date TIMESTAMPTZ NOT NULL CHECK (transaction_date <= NOW()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX idx_transactions_symbol ON public.transactions(symbol);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_transactions_portfolio_date ON public.transactions(portfolio_id, transaction_date DESC);
CREATE INDEX idx_transactions_portfolio_symbol ON public.transactions(portfolio_id, symbol);

-- =============================================================================
-- PORTFOLIO_SNAPSHOTS TABLE (Historical value tracking)
-- =============================================================================
CREATE TABLE public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  total_value NUMERIC(20, 2) NOT NULL,
  total_cost NUMERIC(20, 2) NOT NULL,
  total_pl NUMERIC(20, 2) NOT NULL,
  total_pl_pct NUMERIC(10, 2) NOT NULL,
  holdings_count INTEGER NOT NULL DEFAULT 0,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_snapshots_portfolio_id ON public.portfolio_snapshots(portfolio_id);
CREATE INDEX idx_snapshots_date ON public.portfolio_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_portfolio_date ON public.portfolio_snapshots(portfolio_id, snapshot_date DESC);

-- =============================================================================
-- PRICE_CACHE TABLE (Cache Moralis API responses)
-- =============================================================================
CREATE TABLE public.price_cache (
  symbol TEXT PRIMARY KEY CHECK (char_length(symbol) > 0 AND char_length(symbol) <= 20),
  price_usd NUMERIC(20, 2) NOT NULL,
  market_cap NUMERIC(30, 2),
  volume_24h NUMERIC(30, 2),
  change_24h_pct NUMERIC(10, 2),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cache invalidation
CREATE INDEX idx_price_cache_last_updated ON public.price_cache(last_updated DESC);

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Portfolios: Users can only access their own portfolios
CREATE POLICY "Users can view own portfolios"
  ON public.portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios"
  ON public.portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions: Users can only access transactions in their portfolios
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Portfolio Snapshots: Users can only view snapshots of their portfolios
CREATE POLICY "Users can view own snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_snapshots.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own snapshots"
  ON public.portfolio_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_snapshots.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Price Cache: All authenticated users can read (for real-time prices)
CREATE POLICY "Authenticated users can view price cache"
  ON public.price_cache FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only service role can update price cache (via API)
CREATE POLICY "Service role can manage price cache"
  ON public.price_cache FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.user_profiles IS 'User profile data synchronized with Supabase Auth';
COMMENT ON TABLE public.portfolios IS 'User-created cryptocurrency portfolios';
COMMENT ON TABLE public.transactions IS 'Event-sourced transaction history (immutable after creation)';
COMMENT ON TABLE public.portfolio_snapshots IS 'Historical portfolio value snapshots for charting';
COMMENT ON TABLE public.price_cache IS 'Cached cryptocurrency prices from Moralis API (30s TTL)';

COMMENT ON COLUMN public.transactions.transaction_date IS 'User-specified date of transaction execution (must be <= NOW())';
COMMENT ON COLUMN public.transactions.notes IS 'User notes, sanitized to prevent XSS';
COMMENT ON COLUMN public.price_cache.last_updated IS 'Cache timestamp, invalidate if > 30 seconds old';
