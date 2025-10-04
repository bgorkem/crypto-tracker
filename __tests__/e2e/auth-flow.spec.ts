import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Authentication Flow
 * 
 * This test verifies:
 * 1. User registration with email/password
 * 2. Email verification (simulated)
 * 3. Login with credentials
 * 4. Google OAuth flow initiation
 * 5. Session management and logout
 */

test.describe('Authentication Flow E2E', () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const password = 'SecureP@ss123';

  test('complete registration and login flow', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Should see landing page with sign up option
    await expect(page).toHaveTitle(/Crypto Portfolio Tracker/);
    
    // Click sign up button
    await page.click('text=Sign Up');
    
    // Fill registration form
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Should see verification message
    await expect(page.locator('text=/verify.*email/i')).toBeVisible({ timeout: 10000 });
    
    // For testing purposes, simulate email verification by navigating to login
    await page.goto('/auth/login');
    
    // Fill login form
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Should see user email or welcome message
    await expect(page.locator(`text=${uniqueEmail}`)).toBeVisible();
  });

  test('Google OAuth flow initiation', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Click Google sign-in button
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    
    // Intercept the OAuth redirect
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      googleButton.click(),
    ]);
    
    // Verify the popup URL is Google OAuth
    const popupUrl = popup.url();
    expect(popupUrl).toContain('accounts.google.com');
    expect(popupUrl).toContain('oauth');
    
    await popup.close();
  });

  test('logout flow clears session', async ({ page, context }) => {
    // First, login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Verify auth cookie/session exists
    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some(c => c.name.includes('auth') || c.name.includes('session'));
    expect(hasAuthCookie).toBe(true);
    
    // Click logout
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    
    // Should redirect to home or login
    await expect(page).toHaveURL(/\/(|auth\/login)$/, { timeout: 10000 });
    
    // Auth cookie should be cleared
    const cookiesAfterLogout = await context.cookies();
    const hasAuthCookieAfter = cookiesAfterLogout.some(c => 
      (c.name.includes('auth') || c.name.includes('session')) && c.value !== ''
    );
    expect(hasAuthCookieAfter).toBe(false);
    
    // Trying to access protected route should redirect
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test('shows validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Try invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'short');
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    await expect(page.locator('text=/password.*at least/i')).toBeVisible();
  });
});
