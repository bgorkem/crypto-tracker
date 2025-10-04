import { describe, it, expect, beforeAll } from 'vitest';

describe('POST /api/auth/logout', () => {
  const BASE_URL = 'http://localhost:3000';
  let authToken: string;

  beforeAll(async () => {
    // Create a test user and get a real auth token
    const uniqueEmail = `logoutuser-${Date.now()}@example.com`;
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!',
        displayName: 'Logout Test User'
      }),
    });
    
    const registerData = await registerResponse.json();
    authToken = registerData.data.session.access_token;
  });

  it('returns 204 No Content on successful logout', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(204);
    // Note: content-length might be null for 204 responses depending on server implementation
    const contentLength = response.headers.get('content-length');
    expect(contentLength === '0' || contentLength === null).toBe(true);
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    expect(response.status).toBe(401);
  });

  it.skip('invalidates session after logout', async () => {
    // TODO: This test requires /api/portfolios endpoint to be implemented
    // Skip for now - will be tested when portfolio endpoints are ready
    // Get a fresh token for this test
    const uniqueEmail = `sessiontest-${Date.now()}@example.com`;
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!',
      }),
    });
    
    const registerData = await registerResponse.json();
    const testToken = registerData.data.session.access_token;
    
    // First logout
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });

    // Then try to access protected endpoint
    const protectedResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });

    // Should be unauthorized after logout
    expect(protectedResponse.status).toBe(401);
  });
});
