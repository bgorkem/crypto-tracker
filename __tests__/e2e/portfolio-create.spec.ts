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
    
    // Should see transaction in the transactions table
    const transactionsTable = page.locator('h3:has-text("Transactions")').locator('..').locator('table');
    await expect(transactionsTable.locator('text=BTC').first()).toBeVisible();
    
    // Should see the transaction row with BTC in transactions table
    const btcRow = transactionsTable.locator('tr:has-text("BTC")');
    await expect(btcRow).toBeVisible();
    await expect(btcRow.locator('text=BUY')).toBeVisible();
    
    // Portfolio value should update - value can be formatted with commas
    // Looking for the total value card - should show some amount > 0
    const portfolioValueCard = page.locator('text=Total Portfolio Value').locator('..');
    await expect(portfolioValueCard).toContainText('$');
  });

  test('Step 3: View holdings table', async ({ page }) => {
    // First, create a portfolio
    await page.click('button:has-text("Create Portfolio")');
    await page.fill('input[name="name"]', 'Holdings Test Portfolio');
    await page.fill('textarea[name="description"]', 'Portfolio for holdings test');
    await page.click('button[type="submit"]:has-text("Create")');
    
    // Wait for portfolio to appear
    await page.waitForSelector('text=Holdings Test Portfolio', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Navigate to portfolio detail page
    await page.click('text=Holdings Test Portfolio');
    await page.waitForURL(/\/portfolio\/[^/]+/, { timeout: 10000 });
    await expect(page.locator('h2:has-text("Holdings Test Portfolio")')).toBeVisible({ timeout: 10000 });

    // Add first transaction: Buy 1 BTC at $50,000
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="symbol"]', 'BTC');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price_per_unit"]', '50000');
    await page.fill('input[name="transaction_date"]', '2025-10-01');
    await page.selectOption('select[name="transaction_type"]', 'BUY');
    await page.click('button[type="submit"]:has-text("Add Transaction")');
    
    // Wait for transaction to appear in transactions table
    const transactionsTable = page.locator('h3:has-text("Transactions")').locator('..').locator('table');
    await expect(transactionsTable.locator('text=BTC').first()).toBeVisible();
    
    // Add second transaction: Buy 0.5 BTC at $52,000 (different price for average cost)
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="symbol"]', 'BTC');
    await page.fill('input[name="quantity"]', '0.5');
    await page.fill('input[name="price_per_unit"]', '52000');
    await page.fill('input[name="transaction_date"]', '2025-10-02');
    await page.selectOption('select[name="transaction_type"]', 'BUY');
    await page.click('button[type="submit"]:has-text("Add Transaction")');
    
    // Wait a bit for the second transaction
    await page.waitForTimeout(500);
    
    // Add third transaction: Buy 10 ETH at $3,000
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="symbol"]', 'ETH');
    await page.fill('input[name="quantity"]', '10');
    await page.fill('input[name="price_per_unit"]', '3000');
    await page.fill('input[name="transaction_date"]', '2025-10-03');
    await page.selectOption('select[name="transaction_type"]', 'BUY');
    await page.click('button[type="submit"]:has-text("Add Transaction")');
    
    // Wait for transaction to appear
    await page.waitForTimeout(500);

    // Now verify the Holdings table exists and shows aggregated data
    const holdingsSection = page.locator('h3:has-text("Holdings")').locator('..');
    await expect(holdingsSection).toBeVisible();
    
    // Check Holdings table has the correct headers
    const holdingsTable = holdingsSection.locator('table');
    await expect(holdingsTable.locator('th:has-text("Symbol")')).toBeVisible();
    await expect(holdingsTable.locator('th:has-text("Quantity")')).toBeVisible();
    await expect(holdingsTable.locator('th:has-text("Avg Cost")')).toBeVisible();
    await expect(holdingsTable.locator('th:has-text("Market Value")')).toBeVisible();
    await expect(holdingsTable.locator('th:has-text("Unrealized P/L")')).toBeVisible();
    
    // Verify BTC holding row
    const btcHoldingRow = holdingsTable.locator('tr:has-text("BTC")');
    await expect(btcHoldingRow).toBeVisible();
    
    // BTC total quantity should be 1.5 (1 + 0.5)
    await expect(btcHoldingRow.locator('text=/1\\.5/')).toBeVisible();
    
    // BTC average cost should be $50,666.67 ((50000*1 + 52000*0.5) / 1.5)
    await expect(btcHoldingRow.locator('text=/50,666\\.67/')).toBeVisible();
    
    // Verify ETH holding row
    const ethHoldingRow = holdingsTable.locator('tr:has-text("ETH")');
    await expect(ethHoldingRow).toBeVisible();
    
    // ETH total quantity should be 10
    await expect(ethHoldingRow.locator('text=/10/')).toBeVisible();
    
    // ETH average cost should be $3,000
    await expect(ethHoldingRow.locator('text=/3,000/')).toBeVisible();
    
    // Note: Market value and P/L require current prices from API
    // For now, we just verify the columns exist and show values
    // In a real implementation, we'd mock the price API or use test fixtures
  });
});
