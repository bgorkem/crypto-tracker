import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const RegisterResponseSchema = z.object({
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

describe('POST /api/auth/register', () => {
  const BASE_URL = 'http://localhost:3000';

  it('returns 201 with user and session on valid request', async () => {
    // Generate unique email to avoid conflicts with existing test data
    const uniqueEmail = `newuser-${Date.now()}@testuser.com`;
    const requestData = {
      email: uniqueEmail,
      password: 'SecurePass123!',
    };

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    
    // Validate response schema
    const validationResult = RegisterResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.user.email).toBe(uniqueEmail);
      expect(validationResult.data.data.session.access_token).toBeTruthy();
    }
  });

  it('returns 400 INVALID_EMAIL on bad email format', async () => {
    const requestData = {
      email: 'not-an-email',
      password: 'SecurePass123!',
    };

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('INVALID_EMAIL');
    }
  });

  it('returns 400 WEAK_PASSWORD on password < 8 characters', async () => {
    const requestData = {
      email: 'user@testuser.com',
      password: 'weak',
    };

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('WEAK_PASSWORD');
    }
  });

  it('returns 409 EMAIL_EXISTS on duplicate email', async () => {
    // Generate unique email for this test
    const uniqueEmail = `existing-${Date.now()}@testuser.com`;
    const requestData = {
      email: uniqueEmail,
      password: 'SecurePass123!',
    };

    // First registration should succeed (will fail since no implementation)
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    // Second registration with same email should fail with 409
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(409);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('EMAIL_EXISTS');
    }
  });
});
