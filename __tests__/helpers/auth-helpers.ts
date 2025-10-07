/**
 * Test authentication helpers
 * 
 * Provides reusable functions for creating test users and getting auth tokens
 * in contract tests.
 */

import { getTestUser } from './test-user-pool';
import { authenticateTestUser } from './test-auth';

const BASE_URL = 'http://localhost:3000';

/**
 * Create a test user and return their auth token
 * Uses test pool to avoid rate limiting
 * 
 * @param _prefix - Optional prefix (ignored, kept for API compatibility)
 * @returns Object with email and auth token
 */
export async function createTestUser(_prefix: string = 'testuser'): Promise<{
  email: string;
  password: string;
  token: string;
}> {
  const { email, password } = getTestUser();
  const { token } = await authenticateTestUser(email, password);

  return { email, password, token };
}

/**
 * Login an existing user and return their auth token
 * 
 * @param email - User email
 * @param password - User password
 * @returns Auth token
 */
export async function loginTestUser(email: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login test user: ${response.status}`);
  }

  const data = await response.json();
  return data.data.session.access_token;
}

/**
 * Create authenticated headers with bearer token
 * 
 * @param token - Auth token
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object
 */
export function createAuthHeaders(
  token: string,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    ...additionalHeaders,
  };
}

/**
 * Get the base URL for API requests
 */
export function getBaseUrl(): string {
  return BASE_URL;
}
