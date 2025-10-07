/**
 * Test User Pool
 * 
 * Provides persistent test users to avoid Supabase auth rate limiting.
 * These users are created once and reused across test runs.
 * Data (portfolios/transactions) is cleaned between tests, not the users themselves.
 */

const TEST_USER_POOL = [
  'tester01@testpool.com',
  'tester02@testpool.com',
  'tester03@testpool.com',
  'tester04@testpool.com',
  'tester05@testpool.com',
  'tester06@testpool.com',
  'tester07@testpool.com',
  'tester08@testpool.com',
  'tester09@testpool.com',
  'tester10@testpool.com',
] as const;

const TEST_USER_PASSWORD = 'TestPool123!';

/**
 * Get a test user from the pool
 * Uses worker index or random selection to distribute load
 */
export function getTestUser(index?: number): { email: string; password: string } {
  const poolIndex = index !== undefined 
    ? index % TEST_USER_POOL.length 
    : Math.floor(Math.random() * TEST_USER_POOL.length);
  
  return {
    email: TEST_USER_POOL[poolIndex],
    password: TEST_USER_PASSWORD,
  };
}

/**
 * Check if email belongs to test pool
 */
export function isTestPoolUser(email: string): boolean {
  return (TEST_USER_POOL as readonly string[]).includes(email);
}

/**
 * Get all test pool emails
 */
export function getAllTestPoolEmails(): readonly string[] {
  return TEST_USER_POOL;
}
