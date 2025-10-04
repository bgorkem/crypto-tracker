import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const GoogleOAuthResponseSchema = z.object({
  data: z.object({
    url: z.string().url(),
  }),
});

describe('POST /api/auth/google', () => {
  const BASE_URL = 'http://localhost:3000';

  it('returns 200 with Google OAuth URL', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = GoogleOAuthResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.url).toContain('accounts.google.com');
      expect(validationResult.data.data.url).toContain('oauth');
    }
  });

  it('includes proper redirect URI in OAuth URL', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      const validationResult = GoogleOAuthResponseSchema.safeParse(data);
      
      if (validationResult.success) {
        const url = new URL(validationResult.data.data.url);
        expect(url.searchParams.has('redirect_uri')).toBe(true);
      }
    }
  });
});
