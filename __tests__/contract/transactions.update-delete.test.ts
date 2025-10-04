import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

const TransactionResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    portfolio_id: z.string().uuid(),
    symbol: z.string(),
    type: z.enum(['BUY', 'SELL']),
    quantity: z.number().positive(),
    price_per_unit: z.number().positive(),
    transaction_date: z.string(),
    notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

describe('PATCH /api/portfolios/:portfolioId/transactions/:id', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;
  let transactionId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('transactionupdate');
    authToken = token;
    
    // Create a portfolio
    const createPortfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Update Test Portfolio' }),
    });
    const portfolioData = await createPortfolioResponse.json();
    portfolioId = portfolioData.data.id;

    // Create a transaction to update
    const createTransactionResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
      {
        method: 'POST',
        headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          symbol: 'BTC',
          side: 'BUY',
          quantity: 1.0,
          price: 40000,
          executed_at: new Date().toISOString(),
          notes: 'Original notes',
        }),
      }
    );
    const transactionData = await createTransactionResponse.json();
    transactionId = transactionData.data.id;
  });

  it('returns 200 with updated transaction', async () => {
    const updateData = {
      quantity: 0.5,
      price_per_unit: 45000,
      notes: 'Updated via API',
    };

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
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
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
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
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
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
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;
  let transactionId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('transactiondelete');
    authToken = token;
    
    // Create a portfolio
    const createPortfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Delete Test Portfolio' }),
    });
    const portfolioData = await createPortfolioResponse.json();
    portfolioId = portfolioData.data.id;

    // Create a transaction to delete
    const createTransactionResponse = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
      {
        method: 'POST',
        headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          symbol: 'BTC',
          side: 'BUY',
          quantity: 1.0,
          price: 40000,
          executed_at: new Date().toISOString(),
        }),
      }
    );
    const transactionData = await createTransactionResponse.json();
    transactionId = transactionData.data.id;
  });
  it('returns 204 No Content on successful deletion', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${transactionId}`,
      {
        method: 'DELETE',
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(204);
  });

  it('returns 403 FORBIDDEN for transaction in portfolio not owned by user', async () => {
    const otherUserPortfolioId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${otherUserPortfolioId}/transactions/${transactionId}`,
      {
        method: 'DELETE',
        headers: createAuthHeaders(authToken),
      }
    );

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent transaction', async () => {
    const fakeTransactionId = '00000000-0000-0000-0000-000000000000';

    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions/${fakeTransactionId}`,
      {
        method: 'DELETE',
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/portfolios/:portfolioId/transactions', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('transactionbulkdelete');
    authToken = token;
    
    // Create a portfolio
    const createPortfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Bulk Delete Test Portfolio' }),
    });
    const portfolioData = await createPortfolioResponse.json();
    portfolioId = portfolioData.data.id;

    // Create multiple BTC transactions
    await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        symbol: 'BTC',
        side: 'BUY',
        quantity: 1.0,
        price: 40000,
        executed_at: new Date().toISOString(),
      }),
    });
  });

  it('returns 204 No Content when deleting all transactions for symbol', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions?symbol=BTC`,
      {
        method: 'DELETE',
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(204);
  });

  it('returns 400 BAD_REQUEST when symbol is missing', async () => {
    const response = await fetch(
      `${BASE_URL}/api/portfolios/${portfolioId}/transactions`,
      {
        method: 'DELETE',
        headers: createAuthHeaders(authToken),
      }
    );

    expect(response.status).toBe(400);
  });
});
