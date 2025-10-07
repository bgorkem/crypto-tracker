import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createTestUser, createAuthHeaders, getBaseUrl } from '../helpers/auth-helpers';

const PortfolioResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    base_currency: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

describe('PATCH /api/portfolios/:id', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('portfolioupdate');
    authToken = token;
    
    // Create a portfolio for testing
    const createResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Test Portfolio' }),
    });
    const createData = await createResponse.json();
    portfolioId = createData.data.id;
  });

  it('returns 200 with updated portfolio', async () => {
    const updateData = {
      name: 'Updated Portfolio Name',
      description: 'Updated description',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      method: 'PATCH',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(updateData),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    const validationResult = PortfolioResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    
    if (validationResult.success) {
      expect(validationResult.data.data.name).toBe(updateData.name);
      expect(validationResult.data.data.description).toBe(updateData.description);
    }
  });

  it('returns 403 FORBIDDEN for portfolio not owned by user', async () => {
    const { token: otherToken } = await createTestUser('otheruser2');
    const updateData = { name: 'Hacked Name' };

    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      method: 'PATCH',
      headers: createAuthHeaders(otherToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(updateData),
    });

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent portfolio', async () => {
    const fakePortfolioId = '00000000-0000-0000-0000-000000000000';
    const updateData = { name: 'New Name' };

    const response = await fetch(`${BASE_URL}/api/portfolios/${fakePortfolioId}`, {
      method: 'PATCH',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(updateData),
    });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/portfolios/:id', () => {
  const BASE_URL = getBaseUrl();
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    const { token } = await createTestUser('portfoliodelete');
    authToken = token;
    
    // Create a portfolio for testing
    const createResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Test Portfolio for Deletion' }),
    });
    const createData = await createResponse.json();
    portfolioId = createData.data.id;
  });

  it('returns 204 No Content on successful deletion', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(authToken),
    });

    expect(response.status).toBe(204);
  });

  it('cascades deletion to transactions', async () => {
    // Create a new portfolio to delete
    const createResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: createAuthHeaders(authToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Portfolio to Delete' }),
    });
    const createData = await createResponse.json();
    const tempPortfolioId = createData.data.id;

    // Delete portfolio
    await fetch(`${BASE_URL}/api/portfolios/${tempPortfolioId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(authToken),
    });

    // Try to access transactions of deleted portfolio
    const txnResponse = await fetch(`${BASE_URL}/api/portfolios/${tempPortfolioId}/transactions`, {
      headers: createAuthHeaders(authToken),
    });

    expect(txnResponse.status).toBe(404);
  });

  it('returns 403 FORBIDDEN for portfolio not owned by user', async () => {
    const { token: otherToken } = await createTestUser('otheruser3');

    const response = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(otherToken),
    });

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent portfolio', async () => {
    const fakePortfolioId = '00000000-0000-0000-0000-000000000000';

    const response = await fetch(`${BASE_URL}/api/portfolios/${fakePortfolioId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(authToken),
    });

    expect(response.status).toBe(404);
  });
});
