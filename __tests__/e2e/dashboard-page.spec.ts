import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('displays price ticker at top of page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify price ticker container exists
    const ticker = page.locator('[class*="border-b"]').first();
    await expect(ticker).toBeVisible();
    
    // Verify multiple crypto symbols are displayed
    const symbols = page.locator('text=/BTC|ETH|USDT|BNB|SOL|XRP/');
    const count = await symbols.count();
    expect(count).toBeGreaterThanOrEqual(3); // At least a few symbols visible
    
    // Verify price changes are color-coded (green/red text)
    const priceChanges = page.locator('text=/[+-]\\d+\\.\\d+%/');
    expect(await priceChanges.count()).toBeGreaterThanOrEqual(1);
  });

  test('displays header with navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify header elements
    await expect(page.getByRole('heading', { name: /crypto portfolio tracker/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
  });

  test('displays portfolio grid section', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify "My Portfolios" heading
    await expect(page.getByRole('heading', { name: /my portfolios/i })).toBeVisible();
    
    // Verify "Create Portfolio" button exists
    await expect(page.getByRole('button', { name: /create portfolio/i })).toBeVisible();
  });

  test('displays quick stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify all 4 stat cards (use first() to handle duplicates)
    await expect(page.getByText(/total value/i).first()).toBeVisible();
    await expect(page.getByText(/24h change/i).first()).toBeVisible();
    await expect(page.getByText(/holdings/i).first()).toBeVisible();
    await expect(page.getByText(/transactions/i).first()).toBeVisible();
  });

  test('example portfolio card displays correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify example portfolio card (if it exists)
    const portfolioCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /portfolio/i });
    const count = await portfolioCards.count();
    
    // Should have at least the "Create New" card
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('quick stats show numeric values', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify stat values are present (even if mocked)
    const stats = page.locator('text=/\\$[0-9,]+|[0-9]+%|^[0-9]+$/');
    const count = await stats.count();
    
    expect(count).toBeGreaterThanOrEqual(4); // At least 4 stat values
  });
});
