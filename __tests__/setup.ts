import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { loadEnvConfig } from '@next/env';
import { resolve } from 'path';

// Load environment variables from .env.local for tests
const projectDir = resolve(__dirname, '..');
loadEnvConfig(projectDir);

// Setup global test environment
beforeAll(() => {
  // Setup code that runs once before all tests
});

afterEach(() => {
  // Cleanup after each test
});

afterAll(() => {
  // Cleanup code that runs once after all tests
});

// Mock Next.js router for testing
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: '/',
      query: {},
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));
