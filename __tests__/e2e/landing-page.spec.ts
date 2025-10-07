import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('displays hero section with title and CTAs', async ({ page }) => {
    await page.goto('/');
    
    // Verify hero title
    await expect(page.getByRole('heading', { name: /crypto portfolio tracker/i })).toBeVisible();
    
    // Verify CTA buttons
    await expect(page.getByRole('link', { name: /view dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
  });

  test('displays feature cards', async ({ page }) => {
    await page.goto('/');
    
    // Verify feature cards are present
    await expect(page.getByText(/real-time prices/i)).toBeVisible();
    await expect(page.getByText(/portfolio analytics/i)).toBeVisible();
    await expect(page.getByText(/transaction history/i)).toBeVisible();
  });

  test('navigate to dashboard from CTA', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /view dashboard/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('is accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first CTA
    await page.keyboard.press('Tab');
    const firstButton = page.getByRole('link', { name: /view dashboard/i });
    await expect(firstButton).toBeFocused();
    
    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/dashboard');
  });
});
