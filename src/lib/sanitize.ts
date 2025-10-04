import DOMPurify from 'isomorphic-dompurify';

/**
 * Input sanitization utilities to prevent XSS attacks
 * 
 * Uses DOMPurify for server-side HTML sanitization.
 * All free-text user inputs must be sanitized before storage.
 */

/**
 * Sanitize HTML content to prevent XSS
 * @param dirty - Untrusted input string
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Sanitize plain text input
 * Removes any HTML tags and dangerous characters
 * @param input - Untrusted text input
 * @returns Sanitized plain text
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and trim
  return sanitizeHtml(input).trim();
}

/**
 * Sanitize generic user input (alias for sanitizeText)
 * @param input - Untrusted input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return sanitizeText(input);
}

/**
 * Sanitize portfolio name
 * @param name - Portfolio name input
 * @returns Sanitized name (max 100 chars)
 */
export function sanitizePortfolioName(name: string): string {
  const sanitized = sanitizeText(name);
  return sanitized.slice(0, 100);
}

/**
 * Sanitize portfolio description
 * @param description - Portfolio description input
 * @returns Sanitized description (max 500 chars)
 */
export function sanitizePortfolioDescription(
  description: string | null
): string | null {
  if (!description) {
    return null;
  }

  const sanitized = sanitizeText(description);
  return sanitized.length > 0 ? sanitized.slice(0, 500) : null;
}

/**
 * Sanitize transaction notes
 * @param notes - Transaction notes input
 * @returns Sanitized notes (max 500 chars)
 */
export function sanitizeTransactionNotes(notes: string | null): string | null {
  if (!notes) {
    return null;
  }

  const sanitized = sanitizeText(notes);
  return sanitized.length > 0 ? sanitized.slice(0, 500) : null;
}

/**
 * Sanitize cryptocurrency symbol
 * Uppercase, alphanumeric only, max 20 chars
 * @param symbol - Crypto symbol (e.g., "BTC", "ETH")
 * @returns Sanitized uppercase symbol
 */
export function sanitizeCryptoSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') {
    return '';
  }

  // Remove non-alphanumeric characters and convert to uppercase
  return symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
}

/**
 * Validate and sanitize email address
 * @param email - Email address input
 * @returns Sanitized lowercase email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Sanitize all fields in an object
 * Useful for sanitizing request body data
 * @param obj - Object with string fields to sanitize
 * @returns New object with sanitized string fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T
): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
