#!/usr/bin/env tsx
/**
 * Cleanup script to delete test users from Supabase
 * Run this manually after tests: npm run test:cleanup
 */

import { config } from 'dotenv';
import { deleteAllTestUsers } from '../__tests__/helpers/test-cleanup';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  console.log('🧹 Starting test user cleanup...\n');
  
  try {
    await deleteAllTestUsers();
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

main();
