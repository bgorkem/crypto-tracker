# Daily Snapshot Edge Function

Automated daily portfolio value snapshot generator for crypto-tracker.

## Overview

This Edge Function runs daily at 00:00 UTC to:
1. Fetch yesterday's cryptocurrency prices from CoinGecko
2. Store prices in `price_cache` table
3. Calculate portfolio values using those prices
4. Store snapshots in `portfolio_snapshots` table

## Deployment

### Prerequisites

- Supabase CLI installed: `npm i supabase -g`
- Supabase project linked: `supabase link --project-ref <project-ref>`

### Deploy Function

```bash
# Deploy the Edge Function
supabase functions deploy daily-snapshot

# Set environment variables (production)
supabase secrets set SUPABASE_URL=<your-project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Schedule Function

Use Supabase Cron to schedule the function:

1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL to create the schedule:

```sql
-- Schedule daily-snapshot to run at 00:00 UTC every day
SELECT cron.schedule(
  'daily-snapshot',                    -- job name
  '0 0 * * *',                         -- 00:00 UTC daily (cron expression)
  $$
    SELECT
      net.http_post(
        url := 'https://<project-ref>.supabase.co/functions/v1/daily-snapshot',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);
```

Replace `<project-ref>` with your Supabase project reference.

### Verify Schedule

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
WHERE jobname = 'daily-snapshot'
ORDER BY start_time DESC
LIMIT 10;
```

## Manual Invocation

You can manually trigger the function for testing:

```bash
# Using Supabase CLI
supabase functions invoke daily-snapshot

# Using curl
curl -X POST \
  'https://<project-ref>.supabase.co/functions/v1/daily-snapshot' \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json'
```

## Response Format

Success response:
```json
{
  "success": true,
  "date": "2024-01-15",
  "prices_stored": 7,
  "snapshots_created": 3
}
```

Error response:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Monitoring

Check function logs:

```bash
# View recent logs
supabase functions logs daily-snapshot

# Stream logs (real-time)
supabase functions logs daily-snapshot --stream
```

## Rate Limiting

The function includes rate limiting for CoinGecko API:
- 1.2 seconds between requests
- Maximum 50 calls/minute (free tier)
- 7 symbols = ~8.4 seconds total execution time

## Error Handling

The function handles:
- Missing price data (logs warning, continues)
- Portfolio transaction errors (logs error, skips portfolio)
- Database errors (throws error, fails)

## Supported Cryptocurrencies

- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- USDC (USD Coin)
- USDT (Tether)
- BNB (Binance Coin)
- XRP (Ripple)

To add more symbols, update both:
1. `supabase/functions/daily-snapshot/index.ts` (symbols array)
2. `supabase/functions/_shared/coingecko.ts` (SYMBOL_MAP)
