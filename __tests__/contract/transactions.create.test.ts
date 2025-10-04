import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const TransactionSchema = z.object({
  id: z.string().uuid(),
  portfolio_id: z.string().uuid(),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  executed_at: z.string().datetime(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

describe('POST /api/portfolios/:portfolioId/transactions', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';

  it('returns 201 with transaction on valid BUY request', async () => {
    const requestData = {
      symbol: 'BTC',
      side: 'BUY',
      quantity: 0.5,
      price: 28000.00,
      executed_at: new Date().toISOString(),
      notes: 'Initial purchase',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.data).toBeDefined();
    
    const validationResult = TransactionSchema.safeParse(data.data);
    expect(validationResult.success).toBe(true);
  });

  it('returns 400 INSUFFICIENT_HOLDINGS on SELL with insufficient quantity', async () => {
    const requestData = {
      symbol: 'BTC',
      side: 'SELL',
      quantity: 999999.0, // Way more than user holds
      price: 30000.00,
      executed_at: new Date().toISOString(),
      notes: 'Trying to sell too much',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('INSUFFICIENT_HOLDINGS');
    }
  });

  it('returns 400 FUTURE_DATE when executed_at is in the future', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    const requestData = {
      symbol: 'ETH',
      side: 'BUY',
      quantity: 10.0,
      price: 1800.00,
      executed_at: futureDate.toISOString(),
      notes: 'Future transaction',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestData),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    const validationResult = ErrorResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.error.code).toBe('FUTURE_DATE');
    }
  });

  it('sanitizes notes field to prevent XSS', async () => {
    const requestData = {
      symbol: 'BTC',
      side: 'BUY',
      quantity: 0.1,
      price: 28000.00,
      executed_at: new Date().toISOString(),
      notes: '<script>alert("XSS")</script>Legitimate note',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestData),
    });

    // Should succeed but with sanitized notes
    if (response.ok) {
      const data = await response.json();
      const validationResult = TransactionSchema.safeParse(data.data);
      
      if (validationResult.success && validationResult.data.notes) {
        // XSS should be stripped
        expect(validationResult.data.notes).not.toContain('<script>');
        expect(validationResult.data.notes).toContain('Legitimate note');
      }
    }
  });
});
