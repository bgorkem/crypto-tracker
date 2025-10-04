import { describe, it, expect } from 'vitest';

describe('POST /api/auth/logout', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';

  it('returns 204 No Content on successful logout', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('content-length')).toBe('0');
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    expect(response.status).toBe(401);
  });

  it('invalidates session after logout', async () => {
    // First logout
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    // Then try to access protected endpoint
    const protectedResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    // Should be unauthorized after logout
    expect(protectedResponse.status).toBe(401);
  });
});
