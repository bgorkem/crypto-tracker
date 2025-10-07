import { describe, it, expect } from 'vitest';

describe('Setup Verification', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should have testing-library matchers available', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    document.body.removeChild(element);
  });
});
