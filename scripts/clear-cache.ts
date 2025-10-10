import { createClient } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function clearCache() {
  const redis = createClient({
    url: process.env.REDIS_URL,
  });

  await redis.connect();
  
  console.log('Clearing all portfolio chart cache keys...');
  
  // Get all keys matching the pattern
  const keys = await redis.keys('portfolio:*:chart:*');
  
  if (keys.length > 0) {
    console.log(`Found ${keys.length} cache keys to delete`);
    await redis.del(keys);
    console.log('✅ Cache cleared successfully');
  } else {
    console.log('No cache keys found');
  }
  
  await redis.quit();
}

clearCache().catch(console.error);
