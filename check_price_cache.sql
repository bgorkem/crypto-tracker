SELECT symbol, price_usd, market_cap, volume_24h, change_24h_pct 
FROM public.price_cache 
ORDER BY market_cap DESC 
LIMIT 10;
