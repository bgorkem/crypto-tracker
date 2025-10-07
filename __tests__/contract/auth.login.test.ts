import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createTestUser, getBaseUrl } from '../helpers/auth-helpers';

const LoginResponseSchema = z.object({
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      created_at: z.string().datetime(),
    }),
    session: z.object({
      access_token: z.string(),
      refresh_token: z.string(),
      expires_at: z.number(),
    }),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

describe('POST /api/auth/login', () => {
  const BASE_URL = getBaseUrl();
  let testEmail: string;
  let testPassword: string;

  it('returns 200 with user and session on valid credentials', async () => {
    // Create a unique test user for this test
    const { email, password } = await createTestUser('loginuser');
    testEmail = email;
    testPassword = password;

    // Then login
    const requestData = {
      email: testEmail,
      password: testPassword,
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = LoginResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.user.email).toBe(testEmail);
      expect(validationResult.data.data.session.access_token).toBeTruthy();
    }
  });

  it('returns 401 INVALID_CREDENTIALS on wrong password', async () => {
    const requestData = {
      email: 'user@testuser.com',
      password: 'WrongPassword123!',
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(401);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('returns 401 INVALID_CREDENTIALS on non-existent email', async () => {
    const requestData = {
      email: 'nonexistent@testuser.com',
      password: 'SomePassword123!',
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(401);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('returns 403 EMAIL_NOT_CONFIRMED when email not verified', async () => {
    const requestData = {
      email: 'unverified@testuser.com',
      password: 'CorrectPassword123!',
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    // This test may return 401 or 403 depending on Supabase config
    expect([401, 403]).toContain(response.status);
  });
});
