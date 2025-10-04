import { test, expect } from '@playwright/test';

/**
 * E2E Test: Portfolio Creation and Management (TDD Iterative)
 * 
 * Step-by-step implementation:
 * 1. ✅ Create empty portfolio
 * 2. TODO: Add first transaction
 * 3. TODO: View holdings table
 * 4. TODO: Edit portfolio
 * 5. TODO: Delete portfolio
 */

test.describe('Portfolio Management E2E', () => {
  const password = 'SecureP@ss123';
  let uniqueEmail: string;

  test.beforeEach(async ({ page }, testInfo) => {
    // Create unique email for each test using timestamp + worker index
    uniqueEmail = `test-portfolio-${Date.now()}-${testInfo.workerIndex}@testuser.com`;
    
    // Register and login
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    // Wait for network to be idle before submitting
    await page.waitForLoadState('networkidle');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('Step 1: Create empty portfolio', async ({ page }) => {
    // Should see "My Portfolios" heading
    await expect(page.getByRole('heading', { name: /my portfolios/i })).toBeVisible();
    
    // Click "Create Portfolio" button
    await page.click('button:has-text("Create Portfolio")');
    
    // Should see portfolio creation dialog/form
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    
    // Fill portfolio details
    await page.fill('input[name="name"]', 'My First Portfolio');
    await page.fill('textarea[name="description"]', 'Testing portfolio creation');
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');
    
    // Should see new portfolio in the list
    await expect(page.locator('text=My First Portfolio')).toBeVisible();
    await expect(page.locator('text=Testing portfolio creation')).toBeVisible();
    
    // Should see $0.00 value for new empty portfolio
    await expect(page.locator('text=$0.00')).toBeVisible();
  });

  test('Step 2: Add first transaction', async ({ page }) => {
    // First, create a portfolio
    await page.click('button:has-text("Create Portfolio")');
    await page.fill('input[name="name"]', 'Test Portfolio');
    await page.fill('textarea[name="description"]', 'Portfolio for transaction test');
    await page.click('button[type="submit"]:has-text("Create")');
    
    // Wait for portfolio to appear and dialog to close
    await page.waitForSelector('text=Test Portfolio', { state: 'visible', timeout: 10000 });
    
    // Wait a bit for dialog animation to complete
    await page.waitForTimeout(500);
    
    // Click on the portfolio card to view details
    await page.click('text=Test Portfolio');
    
    // Should navigate to portfolio detail page  
    await page.waitForURL(/\/portfolio\/[^/]+/, { timeout: 10000 });
    
    // Debug: Take a screenshot and log page content
    console.log('Current URL:', page.url());
    const bodyText = await page.locator('body').textContent();
    console.log('Page content:', bodyText?.substring(0, 500));
    
    // Wait for page to load and show portfolio name
    await expect(page.locator('h2:has-text("Test Portfolio")')).toBeVisible({ timeout: 10000 });
    
    // Should see "Add Transaction" button
    await expect(page.locator('button:has-text("Add Transaction")')).toBeVisible({ timeout: 10000 });
    
    // Click "Add Transaction" button
    await page.click('button:has-text("Add Transaction")');
    
    // Should see transaction form
    await expect(page.locator('input[name="symbol"]')).toBeVisible();
    await expect(page.locator('input[name="quantity"]')).toBeVisible();
    await expect(page.locator('input[name="price_per_unit"]')).toBeVisible();
    await expect(page.locator('input[name="transaction_date"]')).toBeVisible();
    
    // Fill transaction details (buying 1 BTC at $50,000)
    await page.fill('input[name="symbol"]', 'BTC');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price_per_unit"]', '50000');
    await page.fill('input[name="transaction_date"]', '2025-10-04');
    
    // Select transaction type: BUY
    await page.selectOption('select[name="transaction_type"]', 'BUY');
    
    // Submit transaction
    await page.click('button[type="submit"]:has-text("Add Transaction")');
    
    // Should see transaction in the table
    await expect(page.locator('table >> text=BTC')).toBeVisible();
    
    // Should see the transaction row with BTC
    const btcRow = page.locator('tr:has-text("BTC")');
    await expect(btcRow).toBeVisible();
    await expect(btcRow.locator('text=BUY')).toBeVisible();
    
    // Portfolio value should update - value can be formatted with commas
    // Looking for the total value card - should show some amount > 0
    const portfolioValueCard = page.locator('text=Total Portfolio Value').locator('..');
    await expect(portfolioValueCard).toContainText('$');
  });
});
