import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const PortfolioResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    base_currency: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
});

describe('PATCH /api/portfolios/:id', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';

  it('returns 200 with updated portfolio', async () => {
    const updateData = {
      name: 'Updated Portfolio Name',
      description: 'Updated description',
    };

    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
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
    const otherUserPortfolioId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const updateData = { name: 'Hacked Name' };

    const response = await fetch(`${BASE_URL}/api/portfolios/${otherUserPortfolioId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateData),
    });

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent portfolio', async () => {
    const fakePortfolioId = '00000000-0000-0000-0000-000000000000';
    const updateData = { name: 'New Name' };

    const response = await fetch(`${BASE_URL}/api/portfolios/${fakePortfolioId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateData),
    });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/portfolios/:id', () => {
  const BASE_URL = 'http://localhost:3000';
  const authToken = 'mock-token';
  const mockPortfolioId = 'c7f0e9a2-8b3d-4f1e-a2c5-1d9e8f7b6a5c';

  it('returns 204 No Content on successful deletion', async () => {
    const response = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(204);
  });

  it('cascades deletion to transactions', async () => {
    // Delete portfolio
    await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    // Try to access transactions of deleted portfolio
    const txnResponse = await fetch(`${BASE_URL}/api/portfolios/${mockPortfolioId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(txnResponse.status).toBe(404);
  });

  it('returns 403 FORBIDDEN for portfolio not owned by user', async () => {
    const otherUserPortfolioId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const response = await fetch(`${BASE_URL}/api/portfolios/${otherUserPortfolioId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect([403, 404]).toContain(response.status);
  });

  it('returns 404 NOT_FOUND for non-existent portfolio', async () => {
    const fakePortfolioId = '00000000-0000-0000-0000-000000000000';

    const response = await fetch(`${BASE_URL}/api/portfolios/${fakePortfolioId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(404);
  });
});
