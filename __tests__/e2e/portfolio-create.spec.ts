import { test, expect } from '@playwright/test';

/**
 * E2E Test: Portfolio Creation and Management
 * 
 * This test verifies:
 * 1. Creating a new portfolio
 * 2. Viewing portfolio list
 * 3. Adding transactions to portfolio
 * 4. Viewing portfolio details with holdings
 * 5. Editing and deleting portfolios
 */

test.describe('Portfolio Management E2E', () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const password = 'SecureP@ss123';

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    // Navigate to dashboard (assuming auto-login after registration)
    await page.goto('/dashboard');
  });

  test('create portfolio and add transactions', async ({ page }) => {
    // Click create portfolio button
    await page.click('button:has-text("Create Portfolio"), a:has-text("New Portfolio")');
    
    // Fill portfolio form
    await page.fill('input[name="name"]', 'My Crypto Portfolio');
    await page.fill('textarea[name="description"]', 'Testing portfolio creation');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create")');
    
    // Should see success message or redirect to portfolio
    await expect(page.locator('text=/portfolio.*created/i, text=My Crypto Portfolio')).toBeVisible({ 
      timeout: 10000 
    });
    
    // Click add transaction
    await page.click('button:has-text("Add Transaction"), button:has-text("New Transaction")');
    
    // Fill transaction form
    await page.selectOption('select[name="type"]', 'BUY');
    await page.fill('input[name="symbol"]', 'BTC');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price_per_unit"]', '45000');
    await page.fill('input[name="transaction_date"]', '2024-01-01T12:00');
    await page.fill('textarea[name="notes"]', 'First Bitcoin purchase');
    
    // Submit transaction
    await page.click('button[type="submit"]:has-text("Add Transaction")');
    
    // Should see transaction in list
    await expect(page.locator('text=BTC')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=1')).toBeVisible(); // quantity
    await expect(page.locator('text=45000, text=45,000')).toBeVisible(); // price
  });

  test('view portfolio with calculated holdings', async ({ page }) => {
    // Create portfolio with transactions (using UI or API)
    await page.goto('/dashboard');
    
    // Assume portfolio created, click to view details
    await page.click('text=My Crypto Portfolio');
    
    // Should see holdings section
    await expect(page.locator('h2:has-text("Holdings"), h3:has-text("Holdings")')).toBeVisible();
    
    // Should display calculated values
    await expect(page.locator('text=/total.*value/i')).toBeVisible();
    await expect(page.locator('text=/unrealized.*p.*l/i')).toBeVisible();
    
    // Holdings should show BTC if transaction was added
    const btcRow = page.locator('[data-testid="holding-row"]', { hasText: 'BTC' });
    if (await btcRow.isVisible()) {
      // Verify holding shows quantity and value
      await expect(btcRow.locator('text=1')).toBeVisible(); // quantity
      await expect(btcRow.locator('text=/\\$/').first()).toBeVisible(); // dollar values
    }
  });

  test('edit portfolio details', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click portfolio to view
    await page.click('text=My Crypto Portfolio');
    
    // Click edit button
    await page.click('button:has-text("Edit"), a:has-text("Edit")');
    
    // Update fields
    await page.fill('input[name="name"]', 'Updated Portfolio Name');
    await page.fill('textarea[name="description"]', 'Updated description');
    
    // Save
    await page.click('button[type="submit"]:has-text("Save")');
    
    // Should see updated name
    await expect(page.locator('text=Updated Portfolio Name')).toBeVisible({ timeout: 10000 });
  });

  test('delete portfolio with confirmation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click portfolio
    await page.click('text=Updated Portfolio Name, text=My Crypto Portfolio');
    
    // Click delete button
    await page.click('button:has-text("Delete")');
    
    // Should see confirmation dialog
    await expect(page.locator('text=/are you sure/i, text=/confirm/i')).toBeVisible();
    
    // Confirm deletion
    await page.click('button:has-text("Delete"), button:has-text("Confirm")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Portfolio should not appear in list
    await expect(page.locator('text=Updated Portfolio Name')).not.toBeVisible();
  });

  test('displays empty state when no portfolios exist', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should see empty state message
    await expect(page.locator('text=/no portfolios/i, text=/get started/i')).toBeVisible();
    
    // Should see CTA to create first portfolio
    await expect(page.locator('button:has-text("Create Portfolio"), a:has-text("Create Your First Portfolio")')).toBeVisible();
  });
});
