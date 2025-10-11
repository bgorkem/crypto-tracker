-- Add price_date column and update primary key to (symbol, price_date)
-- This allows tracking historical prices per day

-- Drop the existing primary key constraint (if it exists and is only on symbol)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'price_cache_pkey' 
    AND conrelid = 'public.price_cache'::regclass
    AND array_length(conkey, 1) = 1
  ) THEN
    ALTER TABLE public.price_cache DROP CONSTRAINT price_cache_pkey;
  END IF;
END $$;

-- Add price_date column if it doesn't exist (defaults to current date in UTC)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'price_cache' 
    AND column_name = 'price_date'
  ) THEN
    ALTER TABLE public.price_cache 
      ADD COLUMN price_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Create new composite primary key on (symbol, price_date) if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'price_cache_pkey' 
    AND conrelid = 'public.price_cache'::regclass
  ) THEN
    ALTER TABLE public.price_cache 
      ADD CONSTRAINT price_cache_pkey PRIMARY KEY (symbol, price_date);
  END IF;
END $$;

-- Add index for querying latest prices by symbol (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_price_cache_symbol_date 
  ON public.price_cache(symbol, price_date DESC);

-- Add comments explaining the schema
COMMENT ON TABLE public.price_cache IS 'Historical cryptocurrency price cache. Stores one price record per symbol per day.';
COMMENT ON COLUMN public.price_cache.price_date IS 'Date of the price snapshot (UTC). Forms composite primary key with symbol.';
