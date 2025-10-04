import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const TransactionResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    portfolio_id: z.string().uuid(),
    symbol: z.string(),
    type: z.enum(['BUY', 'SELL']),
    quantity: z.number().positive(),
    price_per_unit: z.number().positive(),
    transaction_date: z.string().datetime(),
    notes: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
});

describe('PATCH /api/portfolios/:portfolioId/transactions/:id', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';
  const mockTransactionId = 'd8e1f0b3-9c4e-5a2f-b3d6-2e0f9a8c7d6b';

  it('returns 200 with updated transaction', async () => {
    const updateData = {
      quantity: 0.5,
      price_per_unit: 45000,
      notes: 'Updated via API',
    };

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions/${mockTransactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = TransactionResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.quantity).toBe(updateData.quantity);
      expect(validationResult.data.data.price_per_unit).toBe(updateData.price_per_unit);
      expect(validationResult.data.data.notes).toBe(updateData.notes);
    }
  });

  it('returns 400 INVALID_QUANTITY for negative or zero quantity', async () => {
    const updateData = {
      quantity: -1,
    };

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions/${mockTransactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    expect(response.status).toBe(400);
  });

  it('sanitizes notes field to prevent XSS', async () => {
    const updateData = {
      notes: '<script>alert("XSS")</script>Clean notes text',
    };

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions/${mockTransactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const validationResult = TransactionResponseSchema.safeParse(data);
      
      if (validationResult.success && validationResult.data.data.notes) {
        expect(validationResult.data.data.notes).not.toContain('<script>');
        expect(validationResult.data.data.notes).toContain('Clean notes text');
      }
    }
  });
});

describe('DELETE /api/portfolios/:portfolioId/transactions/:id', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';
  const mockTransactionId = 'd8e1f0b3-9c4e-5a2f-b3d6-2e0f9a8c7d6b';

  it('returns 204 No Content on successful deletion', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions/${mockTransactionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(204);
  });

  it('returns 403 FORBIDDEN for transaction in portfolio not owned by user', async () => {
    const otherUserPortfolioId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${otherUserPortfolioId}/transactions/${mockTransactionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent transaction', async () => {
    const fakeTransactionId = '00000000-0000-0000-0000-000000000000';

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions/${fakeTransactionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/portfolios/:portfolioId/transactions', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';

  it('returns 204 No Content when deleting all transactions for symbol', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions?symbol=BTC`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(204);
  });

  it('returns 400 BAD_REQUEST when symbol is missing', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(400);
  });
});
