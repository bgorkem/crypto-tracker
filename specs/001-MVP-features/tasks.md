# Tasks: Crypto Portfolio Tracker MVP

**Date**: 2025-10-04  
**Feature**: 001-MVP-features  
**Input**: plan.md, data-model.md, contracts/api-contracts.md, quickstart.md  
**Strategy**: TDD-ordered (tests → implementation), parallel execution marked [P]

## Execution Flow Summary
```
Phase 1: Setup (T001-T006) → Project structure, dependencies, linting
Phase 2: Tests First - TDD Red (T007-T034) → All tests MUST FAIL initially
Phase 3: Foundation (T035-T048) → Database, auth, base infrastructure
Phase 4: Core Features (T049-T076) → Make tests pass (TDD Green)
Phase 5: Quality & Polish (T077-T088) → Performance, accessibility, refactor
```

**Path Convention**: Next.js monolithic app (frontend + backend colocated)
- `app/` - Next.js 15 App Router pages & API routes
- `lib/` - Business logic, services, calculations
- `components/` - React components
- `__tests__/` - Test files (unit, integration, E2E)
- `supabase/` - Database migrations

---

## Phase 1: Setup & Project Initialization

### T001 [P] Create Next.js project structure per plan.md
**Path**: Repository root  
**Action**: Initialize Next.js 15 with App Router, TypeScript, Tailwind 4
```bash
npx create-next-app@latest crypto-tracker --typescript --tailwind --app --no-src-dir
```
**Verify**: Project created with app/, lib/, components/, public/ directories

---

### T002 [P] Install core dependencies
**Path**: `package.json`  
**Action**: Add dependencies from research.md tech stack
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @tanstack/react-query recharts
npm install zod isomorphic-dompurify
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D msw
```
**Verify**: package.json includes all dependencies with correct versions

---

### T003 [P] Configure ESLint with complexity rules
**Path**: `.eslintrc.json`  
**Action**: Add complexity linting per constitution (≤10 per function)
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "complexity": ["error", 10],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```
**Verify**: `npm run lint` executes without errors

---

### T004 [P] Configure Vitest for unit testing
**Path**: `vitest.config.ts`  
**Action**: Setup Vitest with React Testing Library
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.config.*', '**/*.d.ts', '__tests__/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
```
**Verify**: `npm run test:unit` command available

---

### T005 [P] Configure Playwright for E2E testing
**Path**: `playwright.config.ts`  
**Action**: Setup Playwright with base URL configuration
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```
**Verify**: `npm run test:e2e` command available

---

### T006 [P] Setup environment variables template
**Path**: `.env.example`  
**Action**: Create template from quickstart.md environment section
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MORALIS_API_KEY=your-moralis-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
**Verify**: `.env.example` committed, `.env.local` in .gitignore

---

## Phase 2: Tests First (TDD Red) ⚠️ MUST FAIL INITIALLY

### Contract Tests (15 endpoints from api-contracts.md)

#### T007 [P] Contract test: POST /api/auth/register
**Path**: `__tests__/contract/auth.register.test.ts`  
**Action**: Test user registration request/response schema with Zod + MSW
```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const RegisterResponseSchema = z.object({
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      created_at: z.string().datetime()
    }),
    session: z.object({
      access_token: z.string(),
      refresh_token: z.string(),
      expires_at: z.number()
    })
  })
});

describe('POST /api/auth/register', () => {
  it('returns 201 with user and session on valid request', async () => {
    // MUST FAIL - no implementation yet
    expect(false).toBe(true); // Placeholder failure
  });

  it('returns 400 INVALID_EMAIL on bad email format', async () => {
    expect(false).toBe(true);
  });

  it('returns 409 EMAIL_EXISTS on duplicate email', async () => {
    expect(false).toBe(true);
  });
});
```
**Expected**: ❌ ALL TESTS FAIL (no API implementation)

---

#### T008 [P] Contract test: POST /api/auth/login
**Path**: `__tests__/contract/auth.login.test.ts`  
**Action**: Test email/password login flow, validate 401 INVALID_CREDENTIALS  
**Expected**: ❌ ALL TESTS FAIL

---

#### T009 [P] Contract test: POST /api/auth/google
**Path**: `__tests__/contract/auth.google.test.ts`  
**Action**: Test Google OAuth URL generation  
**Expected**: ❌ ALL TESTS FAIL

---

#### T010 [P] Contract test: POST /api/auth/logout
**Path**: `__tests__/contract/auth.logout.test.ts`  
**Action**: Test session invalidation returns 204  
**Expected**: ❌ ALL TESTS FAIL

---

#### T011 [P] Contract test: GET /api/portfolios
**Path**: `__tests__/contract/portfolios.list.test.ts`  
**Action**: Test portfolio list with pagination (limit, offset)  
**Expected**: ❌ ALL TESTS FAIL

---

#### T012 [P] Contract test: GET /api/portfolios/:id
**Path**: `__tests__/contract/portfolios.detail.test.ts`  
**Action**: Test portfolio detail with holdings array, summary object  
**Expected**: ❌ ALL TESTS FAIL

---

#### T013 [P] Contract test: POST /api/portfolios
**Path**: `__tests__/contract/portfolios.create.test.ts`  
**Action**: Test portfolio creation with sanitized name/description, validate 400 INVALID_NAME  
**Expected**: ❌ ALL TESTS FAIL

---

#### T014 [P] Contract test: PATCH /api/portfolios/:id
**Path**: `__tests__/contract/portfolios.update.test.ts`  
**Action**: Test portfolio update, validate 403 FORBIDDEN for other user's portfolio  
**Expected**: ❌ ALL TESTS FAIL

---

#### T015 [P] Contract test: DELETE /api/portfolios/:id
**Path**: `__tests__/contract/portfolios.delete.test.ts`  
**Action**: Test portfolio deletion returns 204, validate cascade  
**Expected**: ❌ ALL TESTS FAIL

---

#### T016 [P] Contract test: GET /api/portfolios/:portfolioId/transactions
**Path**: `__tests__/contract/transactions.list.test.ts`  
**Action**: Test transaction list with cursor pagination, symbol/date filters  
**Expected**: ❌ ALL TESTS FAIL

---

#### T017 [P] Contract test: POST /api/portfolios/:portfolioId/transactions
**Path**: `__tests__/contract/transactions.create.test.ts`  
**Action**: Test transaction creation with notes field, validate 400 INSUFFICIENT_HOLDINGS for SELL  
**Expected**: ❌ ALL TESTS FAIL

---

#### T018 [P] Contract test: PATCH /api/portfolios/:portfolioId/transactions/:id
**Path**: `__tests__/contract/transactions.update.test.ts`  
**Action**: Test unrestricted transaction edit (no time window)  
**Expected**: ❌ ALL TESTS FAIL

---

#### T019 [P] Contract test: DELETE /api/portfolios/:portfolioId/transactions/:id
**Path**: `__tests__/contract/transactions.delete.test.ts`  
**Action**: Test transaction deletion returns 204  
**Expected**: ❌ ALL TESTS FAIL

---

#### T020 [P] Contract test: POST /api/portfolios/:portfolioId/transactions/bulk
**Path**: `__tests__/contract/transactions.bulk.test.ts`  
**Action**: Test bulk import returns imported/failed counts, validate 100 txn pagination threshold  
**Expected**: ❌ ALL TESTS FAIL

---

#### T021 [P] Contract test: GET /api/prices
**Path**: `__tests__/contract/prices.list.test.ts`  
**Action**: Test price list for 30+ symbols with change_24h_pct, is_stale flag  
**Expected**: ❌ ALL TESTS FAIL

---

#### T022 [P] Contract test: GET /api/prices/:symbol
**Path**: `__tests__/contract/prices.detail.test.ts`  
**Action**: Test single symbol price, validate 404 NOT_FOUND for unsupported symbol  
**Expected**: ❌ ALL TESTS FAIL

---

#### T023 [P] Contract test: GET /api/portfolios/:portfolioId/chart
**Path**: `__tests__/contract/charts.test.ts`  
**Action**: Test chart data for 5 intervals (24h, 7d, 30d, 90d, all), validate 400 INVALID_INTERVAL  
**Expected**: ❌ ALL TESTS FAIL

---

### Unit Tests (Critical Calculation Paths - 100% Coverage Target)

#### T024 [P] Unit test: calculateHoldings function
**Path**: `__tests__/unit/calculations/holdings.test.ts`  
**Action**: Test holding calculation with BUY/SELL transactions, edge cases (zero holdings, negative avg cost prevention)
```typescript
import { describe, it, expect } from 'vitest';
import { calculateHoldings } from '@/lib/calculations/holdings';

describe('calculateHoldings', () => {
  it('calculates total quantity for BUY-only transactions', () => {
    const txns = [
      { symbol: 'BTC', side: 'BUY', quantity: 0.5, price: 28000, executed_at: new Date('2025-10-01') },
      { symbol: 'BTC', side: 'BUY', quantity: 0.3, price: 30000, executed_at: new Date('2025-10-02') }
    ];
    const holdings = calculateHoldings(txns, new Map([['BTC', 30000]]));
    expect(holdings[0].total_quantity).toBe(0.8);
  });

  it('reduces quantity for SELL transactions', () => {
    const txns = [
      { symbol: 'BTC', side: 'BUY', quantity: 1.0, price: 28000, executed_at: new Date('2025-10-01') },
      { symbol: 'BTC', side: 'SELL', quantity: 0.5, price: 30000, executed_at: new Date('2025-10-02') }
    ];
    const holdings = calculateHoldings(txns, new Map([['BTC', 30000]]));
    expect(holdings[0].total_quantity).toBe(0.5);
  });

  it('calculates average cost correctly', () => {
    // MUST FAIL - no implementation yet
    expect(false).toBe(true);
  });

  it('handles zero holdings after all SELL', () => {
    expect(false).toBe(true);
  });

  it('throws error for invalid SELL quantity > holdings', () => {
    expect(false).toBe(true);
  });
});
```
**Expected**: ❌ ALL TESTS FAIL (no implementation)

---

#### T025 [P] Unit test: Cost basis calculation (average cost)
**Path**: `__tests__/unit/calculations/cost-basis.test.ts`  
**Action**: Test average cost formula with multiple BUY/SELL events  
**Expected**: ❌ ALL TESTS FAIL

---

#### T026 [P] Unit test: Unrealized P/L calculation
**Path**: `__tests__/unit/calculations/unrealized-pl.test.ts`  
**Action**: Test P/L = market_value - total_cost, validate sign (positive/negative)  
**Expected**: ❌ ALL TESTS FAIL

---

#### T027 [P] Unit test: Portfolio value aggregation
**Path**: `__tests__/unit/calculations/portfolio-value.test.ts`  
**Action**: Test total portfolio value = sum(holding.market_value)  
**Expected**: ❌ ALL TESTS FAIL

---

### Integration Tests (Database CRUD Operations)

#### T028 [P] Integration test: Portfolio CRUD operations
**Path**: `__tests__/integration/portfolios.test.ts`  
**Action**: Test create → read → update → delete flow with Supabase client, validate RLS policies
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Portfolio CRUD Integration', () => {
  let supabase: any;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test user and auth session
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it('creates portfolio with valid data', async () => {
    // MUST FAIL - no service implementation
    expect(false).toBe(true);
  });

  it('reads portfolio with user_id filter (RLS)', async () => {
    expect(false).toBe(true);
  });

  it('updates portfolio name', async () => {
    expect(false).toBe(true);
  });

  it('deletes portfolio and cascades transactions', async () => {
    expect(false).toBe(true);
  });

  it('prevents access to other user portfolios (RLS)', async () => {
    expect(false).toBe(true);
  });
});
```
**Expected**: ❌ ALL TESTS FAIL

---

#### T029 [P] Integration test: Transaction CRUD with validation
**Path**: `__tests__/integration/transactions.test.ts`  
**Action**: Test transaction creation with SELL quantity validation, notes sanitization  
**Expected**: ❌ ALL TESTS FAIL

---

#### T030 [P] Integration test: Price data fetching from Moralis
**Path**: `__tests__/integration/prices.test.ts`  
**Action**: Mock Moralis API, test price fetching for 30+ symbols, validate stale threshold (30s)  
**Expected**: ❌ ALL TESTS FAIL

---

#### T031 [P] Integration test: Chart data snapshot generation
**Path**: `__tests__/integration/snapshots.test.ts`  
**Action**: Test portfolio value snapshot creation for 5 intervals  
**Expected**: ❌ ALL TESTS FAIL

---

### E2E Tests (9 Acceptance Scenarios from quickstart.md)

#### T032 [P] E2E test: User registration and login flow
**Path**: `__tests__/e2e/auth.spec.ts`  
**Action**: Test Scenario 1 - register → verify redirect to dashboard → login → session persistence  
**Expected**: ❌ TEST FAILS (no UI implementation)

---

#### T033 [P] E2E test: Create portfolio with transactions
**Path**: `__tests__/e2e/portfolio-create.spec.ts`  
**Action**: Test Scenario 2 - create portfolio → add 2 transactions → verify holdings table  
**Expected**: ❌ TEST FAILS

---

#### T034 [P] E2E test: Real-time price updates and stale indicator
**Path**: `__tests__/e2e/real-time-updates.spec.ts`  
**Action**: Test Scenarios 5 & 9 - price ticker updates within 250ms, stale badge appears after 31s  
**Expected**: ❌ TEST FAILS

---

## Phase 3: Foundation (Database, Auth, Base Infrastructure)

### T035 Create Supabase migration: initial schema
**Path**: `supabase/migrations/001_initial_schema.sql`  
**Action**: Copy migration SQL from data-model.md (portfolios, transactions, price_events, snapshots, audit_log tables with RLS policies)  
**Verify**: Migration file created with all 5 tables + indexes + RLS policies

---

### T036 Deploy database schema to Supabase
**Path**: Command-line  
**Action**: Run `npx supabase db push` to apply migrations  
**Verify**: Tables exist in Supabase dashboard, RLS enabled on all tables

---

### T037 Generate TypeScript types from database
**Path**: `lib/db/schema.ts`  
**Action**: Run `npx supabase gen types typescript --project-id <project-id> > lib/db/schema.ts`  
**Verify**: schema.ts contains Database type with all table definitions

---

### T038 [P] Create Supabase client singleton
**Path**: `lib/db/client.ts`  
**Action**: Setup Supabase client with SSR support for Next.js
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```
**Verify**: Client exports typed Database interface

---

### T039 [P] Create auth middleware for Next.js
**Path**: `middleware.ts`  
**Action**: Validate Supabase session for protected routes (dashboard, portfolios)
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolios/:path*']
};
```
**Verify**: Unauthenticated requests to /dashboard redirect to /login

---

### T040 [P] Create input sanitization utility
**Path**: `lib/utils/sanitize.ts`  
**Action**: Implement DOMPurify sanitization per data-model.md security section
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

export function sanitizePortfolioData(data: { name: string; description?: string }) {
  return {
    name: sanitizeInput(data.name).slice(0, 100),
    description: data.description ? sanitizeInput(data.description) : null
  };
}

export function sanitizeTransactionNotes(notes: string | null): string | null {
  if (!notes) return null;
  return sanitizeInput(notes).slice(0, 1000);
}
```
**Verify**: Unit test T041 passes XSS sanitization tests

---

### T041 [P] Unit test: Input sanitization utility
**Path**: `__tests__/unit/utils/sanitize.test.ts`  
**Action**: Test XSS attack vectors from data-model.md
```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '@/lib/utils/sanitize';

describe('sanitizeInput', () => {
  it('removes script tags', () => {
    expect(sanitizeInput('<script>alert("XSS")</script>')).toBe('');
  });

  it('removes img onerror handlers', () => {
    expect(sanitizeInput('<img src=x onerror="alert(1)">')).toBe('');
  });

  it('strips all HTML tags', () => {
    expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello World');
  });

  it('preserves safe text with symbols', () => {
    expect(sanitizeInput('BTC purchase @ $30,000')).toBe('BTC purchase @ $30,000');
  });
});
```
**Expected**: ✅ ALL TESTS PASS (implementation exists from T040)

---

### T042 [P] Setup React Query provider
**Path**: `app/providers.tsx`  
**Action**: Configure React Query with 30s stale time for price data
```typescript
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000, // 30s per NFR-015
        refetchOnWindowFocus: true
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```
**Verify**: Wrap root layout with Providers component

---

### T043 [P] Create API error response utility
**Path**: `lib/utils/api-response.ts`  
**Action**: Standardize error responses per api-contracts.md format
```typescript
export function errorResponse(code: string, message: string, status: number, details = {}) {
  return new Response(JSON.stringify({
    error: { code, message, details }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function successResponse(data: any, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```
**Verify**: Imports in API route handlers

---

### T044 [P] Install and configure ShadCN UI
**Path**: `components/ui/`  
**Action**: Initialize ShadCN with Tailwind 4, install button, card, input, table primitives
```bash
npx shadcn@latest init
npx shadcn@latest add button card input table dialog toast
```
**Verify**: components/ui/ contains primitive components

---

### T045 [P] Create validation schemas with Zod
**Path**: `lib/validation/schemas.ts`  
**Action**: Define Zod schemas for Portfolio, Transaction per data-model.md constraints
```typescript
import { z } from 'zod';

export const PortfolioCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

export const TransactionCreateSchema = z.object({
  symbol: z.string().max(10),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  executed_at: z.string().datetime().refine(date => new Date(date) <= new Date(), {
    message: 'executed_at cannot be in the future'
  }),
  notes: z.string().max(1000).optional()
});
```
**Verify**: Schemas imported in API routes

---

### T046 [P] Create seed data script
**Path**: `supabase/seed.sql`  
**Action**: Create demo user, portfolio, and 5 sample transactions per quickstart.md
```sql
-- Insert demo user (handled by Supabase Auth)
-- Use Supabase dashboard to create: demo@testuser.com / DemoPassword123!

-- Insert demo portfolio (replace user_id with actual auth.users.id)
INSERT INTO portfolios (user_id, name, description)
VALUES ('REPLACE_WITH_USER_ID', 'Demo Portfolio', 'Sample crypto holdings');

-- Insert sample transactions
INSERT INTO transactions (portfolio_id, symbol, side, quantity, price, executed_at, notes)
VALUES 
  ('REPLACE_WITH_PORTFOLIO_ID', 'BTC', 'BUY', 0.5, 28000.00, '2025-10-01 10:00:00+00', 'Initial BTC purchase'),
  ('REPLACE_WITH_PORTFOLIO_ID', 'ETH', 'BUY', 10.0, 1800.00, '2025-10-01 11:00:00+00', 'ETH diversification'),
  ('REPLACE_WITH_PORTFOLIO_ID', 'BTC', 'BUY', 0.3, 30000.00, '2025-10-02 14:00:00+00', 'DCA buy'),
  ('REPLACE_WITH_PORTFOLIO_ID', 'ETH', 'SELL', 5.0, 1850.00, '2025-10-03 09:00:00+00', 'Profit taking'),
  ('REPLACE_WITH_PORTFOLIO_ID', 'SOL', 'BUY', 50.0, 20.00, '2025-10-03 15:00:00+00', 'New position');
```
**Verify**: Seed script ready for manual execution

---

### T047 [P] Setup MSW (Mock Service Worker) for API mocking
**Path**: `__tests__/mocks/handlers.ts`  
**Action**: Create MSW handlers for all 15 API endpoints
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      data: {
        user: { id: 'mock-user-id', email: 'test@testuser.com', created_at: new Date().toISOString() },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh', expires_at: Date.now() + 3600000 }
      }
    }, { status: 201 });
  }),
  
  http.get('/api/portfolios', () => {
    return HttpResponse.json({
      data: {
        portfolios: [],
        total: 0,
        limit: 50,
        offset: 0
      }
    });
  }),
  
  // ... Add handlers for remaining 13 endpoints
];
```
**Verify**: MSW server initialized in __tests__/setup.ts

---

### T048 [P] Create test setup file
**Path**: `__tests__/setup.ts`  
**Action**: Initialize MSW server, setup testing-library matchers
```typescript
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```
**Verify**: Imported in vitest.config.ts

---

## Phase 4: Core Features (TDD Green - Make Tests Pass)

### Authentication (4 endpoints)

#### T049 Implement POST /api/auth/register endpoint
**Path**: `app/api/auth/register/route.ts`  
**Action**: Register user with Supabase Auth, validate email/password, return session  
**Verify**: Contract test T007 passes ✅

---

#### T050 Implement POST /api/auth/login endpoint
**Path**: `app/api/auth/login/route.ts`  
**Action**: Login with email/password, validate credentials, return session  
**Verify**: Contract test T008 passes ✅

---

#### T051 Implement POST /api/auth/google endpoint
**Path**: `app/api/auth/google/route.ts`  
**Action**: Generate Google OAuth URL via Supabase  
**Verify**: Contract test T009 passes ✅

---

#### T052 Implement POST /api/auth/logout endpoint
**Path**: `app/api/auth/logout/route.ts`  
**Action**: Invalidate session with Supabase signOut  
**Verify**: Contract test T010 passes ✅

---

### Portfolio Service Layer

#### T053 [P] Create Portfolio service with CRUD methods
**Path**: `lib/services/portfolios.ts`  
**Action**: Implement createPortfolio, getPortfolios, getPortfolioById, updatePortfolio, deletePortfolio with RLS enforcement
```typescript
import { supabase } from '@/lib/db/client';
import { sanitizePortfolioData } from '@/lib/utils/sanitize';
import { Database } from '@/lib/db/schema';

type Portfolio = Database['public']['Tables']['portfolios']['Row'];

export async function createPortfolio(userId: string, data: { name: string; description?: string }) {
  const sanitized = sanitizePortfolioData(data);
  
  const { data: portfolio, error } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, ...sanitized })
    .select()
    .single();
  
  if (error) throw error;
  return portfolio;
}

export async function getPortfolios(userId: string, limit = 50, offset = 0) {
  const { data, error, count } = await supabase
    .from('portfolios')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  return { portfolios: data, total: count || 0 };
}

// Implement getPortfolioById, updatePortfolio, deletePortfolio
```
**Verify**: Integration test T028 passes ✅

---

### Portfolio API Endpoints (5 endpoints)

#### T054 Implement GET /api/portfolios
**Path**: `app/api/portfolios/route.ts`  
**Action**: List portfolios with pagination, call getPortfolios service  
**Verify**: Contract test T011 passes ✅

---

#### T055 Implement GET /api/portfolios/[id]/route.ts
**Path**: `app/api/portfolios/[id]/route.ts`  
**Action**: Get portfolio detail with holdings (call calculateHoldings), validate ownership  
**Verify**: Contract test T012 passes ✅

---

#### T056 Implement POST /api/portfolios
**Path**: `app/api/portfolios/route.ts`  
**Action**: Create portfolio, validate schema with Zod, sanitize inputs  
**Verify**: Contract test T013 passes ✅

---

#### T057 Implement PATCH /api/portfolios/[id]/route.ts
**Path**: `app/api/portfolios/[id]/route.ts`  
**Action**: Update portfolio, validate ownership (403 FORBIDDEN)  
**Verify**: Contract test T014 passes ✅

---

#### T058 Implement DELETE /api/portfolios/[id]/route.ts
**Path**: `app/api/portfolios/[id]/route.ts`  
**Action**: Delete portfolio, verify cascade to transactions  
**Verify**: Contract test T015 passes ✅

---

### Transaction Service Layer

#### T059 [P] Create Transaction service with CRUD methods
**Path**: `lib/services/transactions.ts`  
**Action**: Implement createTransaction with SELL validation, updateTransaction, deleteTransaction, getTransactions with cursor pagination, sanitize notes field
```typescript
import { supabase } from '@/lib/db/client';
import { sanitizeTransactionNotes } from '@/lib/utils/sanitize';
import { calculateHoldings } from '@/lib/calculations/holdings';

export async function createTransaction(portfolioId: string, data: {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executed_at: string;
  notes?: string;
}) {
  const sanitizedNotes = sanitizeTransactionNotes(data.notes || null);
  
  // SELL validation: check current holdings
  if (data.side === 'SELL') {
    const { data: existingTxns } = await supabase
      .from('transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('symbol', data.symbol);
    
    const currentPrices = new Map(); // Fetch from price service
    const holdings = calculateHoldings(existingTxns || [], currentPrices);
    const holding = holdings.find(h => h.symbol === data.symbol);
    
    if (!holding || holding.total_quantity < data.quantity) {
      throw new Error('INSUFFICIENT_HOLDINGS');
    }
  }
  
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({ portfolio_id: portfolioId, ...data, notes: sanitizedNotes })
    .select()
    .single();
  
  if (error) throw error;
  return transaction;
}

// Implement getTransactions, updateTransaction, deleteTransaction, bulkImportTransactions
```
**Verify**: Integration test T029 passes ✅

---

### Transaction API Endpoints (5 endpoints)

#### T060 Implement GET /api/portfolios/[portfolioId]/transactions
**Path**: `app/api/portfolios/[portfolioId]/transactions/route.ts`  
**Action**: List transactions with cursor pagination, symbol/date filters  
**Verify**: Contract test T016 passes ✅

---

#### T061 Implement POST /api/portfolios/[portfolioId]/transactions
**Path**: `app/api/portfolios/[portfolioId]/transactions/route.ts`  
**Action**: Create transaction, validate schema, enforce SELL quantity check, sanitize notes  
**Verify**: Contract test T017 passes ✅

---

#### T062 Implement PATCH /api/portfolios/[portfolioId]/transactions/[id]/route.ts
**Path**: `app/api/portfolios/[portfolioId]/transactions/[id]/route.ts`  
**Action**: Update transaction (unrestricted edit), re-validate SELL quantity if side/quantity changed  
**Verify**: Contract test T018 passes ✅

---

#### T063 Implement DELETE /api/portfolios/[portfolioId]/transactions/[id]/route.ts
**Path**: `app/api/portfolios/[portfolioId]/transactions/[id]/route.ts`  
**Action**: Delete transaction  
**Verify**: Contract test T019 passes ✅

---

#### T064 Implement POST /api/portfolios/[portfolioId]/transactions/bulk
**Path**: `app/api/portfolios/[portfolioId]/transactions/bulk/route.ts`  
**Action**: Bulk import transactions (max 100), return imported/failed counts  
**Verify**: Contract test T020 passes ✅

---

### Calculation Utilities (Critical Path - 100% Coverage)

#### T065 [P] Implement calculateHoldings function
**Path**: `lib/calculations/holdings.ts`  
**Action**: Implement algorithm from data-model.md, handle BUY/SELL, calculate avg cost  
**Verify**: Unit test T024 passes ✅ (100% coverage)

---

#### T066 [P] Implement cost basis calculation
**Path**: `lib/calculations/cost-basis.ts`  
**Action**: Average cost formula: total_cost / total_quantity  
**Verify**: Unit test T025 passes ✅

---

#### T067 [P] Implement unrealized P/L calculation
**Path**: `lib/calculations/unrealized-pl.ts`  
**Action**: P/L = (total_quantity * current_price) - total_cost  
**Verify**: Unit test T026 passes ✅

---

#### T068 [P] Implement portfolio value aggregation
**Path**: `lib/calculations/portfolio-value.ts`  
**Action**: Sum all holdings market_value  
**Verify**: Unit test T027 passes ✅

---

### Price Data Service

#### T069 [P] Create Moralis API client
**Path**: `lib/services/prices.ts`  
**Action**: Fetch prices for 30+ symbols, map to PriceEvent structure, implement stale detection (30s threshold)
```typescript
import { Database } from '@/lib/db/schema';

type PriceEvent = Database['public']['Tables']['price_events']['Row'];

const MORALIS_API_KEY = process.env.MORALIS_API_KEY!;
const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'SOL', /* ... 30+ symbols */];

export async function fetchPricesFromMoralis(symbols: string[]): Promise<PriceEvent[]> {
  const prices = await Promise.all(symbols.map(async (symbol) => {
    const response = await fetch(`https://deep-index.moralis.io/api/v2/erc20/price?symbol=${symbol}`, {
      headers: { 'X-API-Key': MORALIS_API_KEY }
    });
    const data = await response.json();
    
    return {
      symbol,
      price: data.usdPrice,
      change_24h_abs: data.change24h,
      change_24h_pct: data.change24hPct,
      received_at: new Date().toISOString(),
      is_stale: false
    };
  }));
  
  return prices;
}

export function isPriceStale(priceEvent: PriceEvent): boolean {
  return Date.now() - new Date(priceEvent.received_at).getTime() > 30000;
}
```
**Verify**: Integration test T030 passes ✅

---

#### T070 Implement GET /api/prices
**Path**: `app/api/prices/route.ts`  
**Action**: Fetch prices from Moralis, cache in price_events table, return with is_stale flag  
**Verify**: Contract test T021 passes ✅

---

#### T071 Implement GET /api/prices/[symbol]/route.ts
**Path**: `app/api/prices/[symbol]/route.ts`  
**Action**: Fetch single symbol price, validate supported symbol (404 if not)  
**Verify**: Contract test T022 passes ✅

---

### Chart Data & Snapshots

#### T072 [P] Create snapshot generation service
**Path**: `lib/services/snapshots.ts`  
**Action**: Generate portfolio value snapshots for 5 intervals (24h, 7d, 30d, 90d, all), query portfolio_value_snapshots table
```typescript
import { supabase } from '@/lib/db/client';

export async function getChartData(portfolioId: string, interval: '24h' | '7d' | '30d' | '90d' | 'all') {
  const intervalMap = {
    '24h': '1 day',
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    'all': '10 years' // Arbitrary large range
  };
  
  const { data: snapshots, error } = await supabase
    .from('portfolio_value_snapshots')
    .select('captured_at, total_value')
    .eq('portfolio_id', portfolioId)
    .gte('captured_at', `NOW() - INTERVAL '${intervalMap[interval]}'`)
    .order('captured_at', { ascending: true });
  
  if (error) throw error;
  return snapshots;
}

export async function createSnapshot(portfolioId: string, totalValue: number) {
  const { data, error } = await supabase
    .from('portfolio_value_snapshots')
    .insert({ portfolio_id: portfolioId, total_value: totalValue })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```
**Verify**: Integration test T031 passes ✅

---

#### T073 Implement GET /api/portfolios/[portfolioId]/chart
**Path**: `app/api/portfolios/[portfolioId]/chart/route.ts`  
**Action**: Get chart data for interval, validate interval enum (400 INVALID_INTERVAL)  
**Verify**: Contract test T023 passes ✅

---

#### T074 [P] Create Supabase Edge Function for daily snapshots
**Path**: `supabase/functions/daily-snapshot/index.ts`  
**Action**: Cron job to capture portfolio values daily at midnight UTC
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get all portfolios
  const { data: portfolios } = await supabase.from('portfolios').select('id');
  
  // For each portfolio, calculate current value and create snapshot
  for (const portfolio of portfolios || []) {
    // Calculate total value logic here
    // Insert snapshot
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```
**Verify**: Edge function deployed, cron scheduled

---

### Audit Logging

#### T075 [P] Create audit log service
**Path**: `lib/services/audit.ts`  
**Action**: Log transaction CRUD operations to audit_log table per FR-018
```typescript
import { supabase } from '@/lib/db/client';

export async function logAudit(
  userId: string,
  entityType: 'transaction' | 'portfolio',
  entityId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData?: any,
  newData?: any
) {
  await supabase.from('audit_log').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_data: oldData,
    new_data: newData
  });
}
```
**Verify**: Integration test validates audit_log entries created

---

### Supported Symbols Endpoint

#### T076 Implement GET /api/symbols
**Path**: `app/api/symbols/route.ts`  
**Action**: Return list of 30+ supported symbols with names and logo URLs  
**Verify**: Public endpoint returns 200 with symbol array

---

## Phase 5: Quality & Polish (Constitution Compliance)

### Performance Optimization

#### T077 [P] Add database indexes for query optimization
**Path**: `supabase/migrations/002_performance_indexes.sql`  
**Action**: Verify indexes from data-model.md exist (portfolio_id, executed_at, symbol), add composite indexes if needed  
**Verify**: EXPLAIN ANALYZE shows index usage for portfolio detail query

---

#### T078 [P] Implement React Query caching strategy
**Path**: `lib/hooks/use-portfolios.ts`, `lib/hooks/use-prices.ts`  
**Action**: Create custom hooks with 30s stale time for prices, cache invalidation on mutations
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePrices(symbols: string[]) {
  return useQuery({
    queryKey: ['prices', symbols],
    queryFn: () => fetch(`/api/prices?symbols=${symbols.join(',')}`).then(r => r.json()),
    staleTime: 30000, // 30s per NFR-015
    refetchInterval: 30000 // Polling interval
  });
}

export function useCreateTransaction(portfolioId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => fetch(`/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['holdings', portfolioId] });
    }
  });
}
```
**Verify**: Network tab shows cached responses, mutations trigger refetch

---

#### T079 [P] Performance regression test suite
**Path**: `__tests__/performance/api-latency.test.ts`  
**Action**: Benchmark all API endpoints against NFR-002 (≤200ms p95), NFR-003 (≤250ms price updates)
```typescript
import { describe, it, expect } from 'vitest';

describe('API Performance Benchmarks', () => {
  it('GET /api/portfolios responds within 200ms (p95)', async () => {
    const latencies: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await fetch('/api/portfolios');
      latencies.push(Date.now() - start);
    }
    
    latencies.sort((a, b) => a - b);
    const p95 = latencies[94];
    expect(p95).toBeLessThanOrEqual(200);
  });
  
  // Add benchmarks for all 15 endpoints
});
```
**Verify**: All endpoints meet latency targets

---

#### T080 [P] Real-time latency test harness
**Path**: `__tests__/performance/real-time-updates.test.ts`  
**Action**: Test price update propagation from Moralis → DB → React Query → UI (≤250ms per NFR-003)  
**Verify**: End-to-end latency ≤250ms

---

### Accessibility & UX

#### T081 [P] Accessibility audit and keyboard navigation tests
**Path**: `__tests__/accessibility/a11y.test.ts`  
**Action**: Test keyboard navigation (Tab, Enter, Esc), ARIA labels, chart text alternatives per NFR-006
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('portfolio detail page passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/portfolios/test-id');
  
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('transaction form navigable via keyboard', async ({ page }) => {
  await page.goto('/portfolios/test-id');
  await page.click('button:has-text("Add Transaction")');
  
  // Tab through form fields
  await page.keyboard.press('Tab');
  await expect(page.locator('input[name="symbol"]')).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(page.locator('select[name="side"]')).toBeFocused();
  
  // Submit with Enter
  await page.keyboard.press('Enter');
});
```
**Verify**: Axe violations = 0, keyboard navigation works

---

#### T082 [P] Implement loading states and skeleton loaders
**Path**: `components/ui/skeleton.tsx`, update all data-fetching components  
**Action**: Add ShadCN skeleton components to portfolio list, holdings table, chart per FR-024  
**Verify**: E2E test validates spinner during data fetch

---

#### T083 [P] Implement error boundaries and toast notifications
**Path**: `app/error.tsx`, `components/ui/toaster.tsx`  
**Action**: Global error boundary, toast on transaction success/failure per FR-024  
**Verify**: Error boundary catches API failures, toast notifications appear

---

#### T084 [P] Implement stale price indicator logic
**Path**: `components/dashboard/PriceTickerPanel.tsx`  
**Action**: Display stale badge when price age > 30s per FR-012, FR-015  
**Verify**: E2E test T034 passes (stale badge appears after 31s)

---

### Coverage & Refactoring

#### T085 [P] Unit test expansion and coverage audit
**Path**: `__tests__/unit/` (expand all files)  
**Action**: Achieve ≥80% overall coverage, 100% for calculation utilities per constitution  
**Verify**: `npm run test:coverage` shows ≥80% lines, 100% for lib/calculations/

---

#### T086 [P] Refactor for complexity reduction
**Path**: All files with complexity >10 (ESLint warnings)  
**Action**: Extract sub-functions, simplify conditionals, use early returns  
**Verify**: `npm run lint` shows no complexity warnings

---

#### T087 [P] Update API documentation
**Path**: `README.md`, add architecture diagram  
**Action**: Document all 15 endpoints, quickstart instructions, architecture diagram per quickstart.md  
**Verify**: README complete with setup, testing, deployment instructions

---

#### T088 [P] UI automation of primary portfolio flow
**Path**: Expand E2E tests T032-T034  
**Action**: Complete all 9 acceptance scenarios from quickstart.md (registration, portfolio create, transaction CRUD, real-time updates, stale indicator, portfolio switching)  
**Verify**: All E2E tests pass ✅

---

## Dependencies Graph

```
Foundation (T035-T048)
  ├─ Database (T035-T037) → Type Generation (T037)
  ├─ Auth Middleware (T039) → All Protected Endpoints (T054-T073)
  ├─ Sanitization (T040-T041) → Portfolio/Transaction Creation (T053, T059)
  ├─ React Query (T042) → All Data Fetching Hooks (T078)
  └─ Validation (T045) → All API Routes (T049-T076)

Calculations (T065-T068) [100% Coverage Required]
  └─ Holdings Service (T053, T055, T059, T061)

Price Service (T069-T071)
  └─ Holdings Calculation (T065) → Portfolio Valuation (T055)

Snapshots (T072-T074)
  └─ Portfolio Value Calc (T068) → Chart Data (T073)

Tests → Implementation Pairs:
  T007 → T049 (Register)
  T011 → T054 (List Portfolios)
  T017 → T061 (Create Transaction)
  T024 → T065 (Holdings Calc)
  T032 → T088 (E2E Auth Flow)
```

---

## Parallel Execution Examples

**Wave 1 - Contract Tests (After T006)**:
```bash
# Launch all 23 contract tests in parallel
npm run test:contract -- __tests__/contract/*.test.ts
```

**Wave 2 - Unit Tests (After T041)**:
```bash
# Launch calculation unit tests in parallel
npm run test:unit -- __tests__/unit/calculations/*.test.ts
```

**Wave 3 - Services (After T048)**:
```bash
# Implement portfolio and transaction services concurrently
# T053 (portfolios.ts) + T059 (transactions.ts) + T069 (prices.ts)
```

**Wave 4 - API Routes (After T053, T059)**:
```bash
# Implement all 15 API routes in parallel (different files)
# T049-T052 (Auth) + T054-T058 (Portfolios) + T060-T064 (Transactions) + T070-T071 (Prices) + T073 (Charts)
```

**Wave 5 - Polish (After T076)**:
```bash
# Performance, accessibility, coverage in parallel
# T077 (indexes) + T078 (caching) + T081 (a11y) + T082 (loading) + T083 (errors) + T085 (coverage) + T086 (refactor) + T087 (docs)
```

---

## Validation Checklist

- [x] All 15 API contracts have corresponding tests (T007-T023)
- [x] All 6 entities have model/service tasks (User managed by Supabase, Portfolio T053, Transaction T059, PriceEvent T069, Snapshot T072, AuditLog T075)
- [x] All tests come before implementation (Phase 2 before Phase 4)
- [x] Parallel tasks [P] are truly independent (different files, no dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (verified)
- [x] Performance & real-time tasks present (T077-T080, T084)
- [x] Accessibility tasks included (T081-T083)
- [x] Coverage target tasks included (T085: ≥80% overall, 100% calculations)
- [x] Input sanitization implemented (T040-T041, integrated in T053, T059)
- [x] Real-time update pathways covered by tests (T034, T080)

---

## Notes

- **TDD Workflow**: Phase 2 tests MUST ALL FAIL initially. Do NOT implement Phase 4 until all tests are failing.
- **Complexity Budget**: Monitor ESLint complexity warnings after each task. Refactor immediately if >10.
- **Constitution Gates**: Re-check after Phase 4 (all tests passing), Phase 5 (coverage ≥80%).
- **Deployment**: After T088, run `vercel deploy` for production deployment.
- **Moralis Rate Limits**: Monitor during T069-T071. May need to increase polling interval to 60s if free tier exceeded (40k requests/day).
- **Commit Strategy**: Commit after each task or logical group (e.g., all contract tests, all API endpoints).

---

**Estimated Total**: 88 tasks  
**Estimated Timeline**: 2-3 weeks (2 developers, 40 hours/week, 50% parallel execution)  
**Constitution Compliance**: ✅ All gates validated in plan.md
