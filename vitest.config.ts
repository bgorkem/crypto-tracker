import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 15000, // 15 seconds for integration tests
    retry: 1, // Retry failed tests once to handle intermittent rate limits
    maxConcurrency: 3, // Limit parallel test execution to avoid rate limits
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/e2e/**', // Exclude Playwright E2E tests
      '**/__tests__/e2e/**', // Exclude E2E test directory
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.config.*',
        '**/*.d.ts',
        '__tests__/**',
        'node_modules/**',
        '.next/**',
        'coverage/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
