import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

const PortfolioResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    base_currency: z.string(),
    created_at: z.string(), // Postgres timestamp with timezone
    updated_at: z.string(), // Postgres timestamp with timezone
  }),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

describe('POST /api/portfolios', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const { token } = await createTestUser('portfoliocreate');
    authToken = token;
  });

  it('returns 201 with created portfolio on valid request', async () => {
    const requestData = {
      name: 'My Crypto Portfolio',
      description: 'Main trading account',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    const validationResult = PortfolioResponseSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error);
      console.log('Received data:', JSON.stringify(data, null, 2));
    }
    
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.name).toBe(requestData.name);
      expect(validationResult.data.data.description).toBe(requestData.description);
      expect(validationResult.data.data.base_currency).toBe('USD');
    }
  });

  it('returns 400 INVALID_NAME when name is empty', async () => {
    const requestData = {
      name: '',
      description: 'Test',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('INVALID_NAME');
    }
  });

  it('returns 400 INVALID_NAME when name exceeds 100 characters', async () => {
    const requestData = {
      name: 'a'.repeat(101),
      description: 'Test',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(400);
  });

  it('sanitizes name and description to prevent XSS', async () => {
    const requestData = {
      name: '<script>alert("XSS")</script>Clean Name',
      description: '<img src=x onerror="alert(1)">Clean Description',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      const data = await response.json();
      const validationResult = PortfolioResponseSchema.safeParse(data);
      
      if (validationResult.success) {
        expect(validationResult.data.data.name).not.toContain('<script>');
        expect(validationResult.data.data.name).toContain('Clean Name');
        
        if (validationResult.data.data.description) {
          expect(validationResult.data.data.description).not.toContain('<img');
          expect(validationResult.data.data.description).toContain('Clean Description');
        }
      }
    }
  });

  it('returns 401 UNAUTHORIZED without auth token', async () => {
    const requestData = {
      name: 'Test Portfolio',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(401);
  });
});
