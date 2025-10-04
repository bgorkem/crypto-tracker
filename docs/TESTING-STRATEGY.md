# Testing Strategy - Crypto Tracker MVP

**Last Updated**: 2025-10-04  
**Status**: Active Development on Branch `001-MVP-features`

## Overview

This document outlines the comprehensive testing strategy agreed upon for the Crypto Portfolio Tracker MVP, based on `plan.md` and `tasks.md`.

## Test Pyramid & Coverage Strategy

```
                    ┌─────────────┐
                    │   E2E (9)   │  ← Playwright (User Flows)
                    │  Acceptance │
                    └─────────────┘
                   ┌───────────────┐
                   │ Integration   │  ← Vitest (Database + External APIs)
                   │  Tests (4)    │
                   └───────────────┘
                ┌─────────────────────┐
                │   Contract Tests    │  ← Vitest + MSW (API Schemas)
                │      (12 APIs)      │
                └─────────────────────┘
             ┌───────────────────────────┐
             │    Unit Tests (4 calc)    │  ← Vitest (Pure Functions)
             │   UI Component Tests (3)  │  ← React Testing Library
             └───────────────────────────┘
```

## Testing Layers

### 1. **Unit Tests** (Phase 2: T024-T027 - Tests First)

**Purpose**: Test pure business logic in isolation  
**Tool**: Vitest  
**Location**: `__tests__/unit/`  
**Coverage Target**: 100% for calculation modules

**Scope**:
- ✅ **Calculations** (`__tests__/unit/calculations/`)
  - `cost-basis.test.ts` - Average cost, FIFO logic
  - `holdings.test.ts` - Current holdings derivation from transactions
  - `portfolio-value.test.ts` - Total portfolio valuation
  - `unrealized-pl.test.ts` - Profit/Loss calculations

**Why No Page/Component Unit Tests?**
- Pages are tested via E2E tests (see below)
- UI components (Button, Card, Skeleton) have basic RTL tests for variants/props
- **Business logic is extracted to `lib/calculations`** for unit testing
- Form validation logic is tested via E2E (real user flows)

---

### 2. **UI Component Tests** (Existing - Created in Phase 2)

**Purpose**: Test ShadCN UI primitives render correctly  
**Tool**: React Testing Library (RTL) + Vitest  
**Location**: `__tests__/ui/`  
**Coverage Target**: Basic smoke tests only

**Current Tests**:
- ✅ `button.test.tsx` - Variants, sizes, disabled state
- ✅ `card.test.tsx` - Header, content, footer rendering
- ✅ `skeleton.test.tsx` - Loading states

**What's NOT Tested Here**:
- ❌ Full page components (login, register, dashboard)
- ❌ Form validation logic
- ❌ Navigation flows
- ❌ API integration

**Rationale**:
- ShadCN components are primitives with minimal logic
- Real page behavior tested via E2E (more valuable)
- Avoids testing implementation details (React component internals)

---

### 3. **Contract Tests** (Phase 2: T007-T023 - Tests First)

**Purpose**: Validate API request/response schemas match contracts  
**Tool**: Vitest + Zod schemas + MSW for mocking  
**Location**: `__tests__/contract/`  
**Coverage Target**: 100% of API endpoints

**Endpoints Tested**:
- ✅ Auth: `register`, `login`, `logout`, `google` (4 endpoints)
- ✅ Portfolios: `list`, `detail`, `create`, `update`, `delete` (5 endpoints)
- ✅ Transactions: `list`, `create`, `update`, `delete` (4 endpoints)
- ✅ Prices: `GET /api/prices` (1 endpoint)
- ✅ Charts: `GET /api/charts/:symbol` (1 endpoint)

**What's Tested**:
- Request schema validation (email format, required fields)
- Response schema validation (user object shape, error codes)
- HTTP status codes (201 Created, 400 Bad Request, 401 Unauthorized, etc.)
- Error codes match `api-contracts.md` (e.g., `INVALID_EMAIL`, `EMAIL_EXISTS`)

**Example**:
```typescript
// __tests__/contract/auth.register.test.ts
describe('POST /api/auth/register', () => {
  it('returns 201 with user and session on valid request', async () => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' })
    });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toMatchSchema(RegisterResponseSchema); // Zod validation
  });
});
```

---

### 4. **Integration Tests** (Phase 2: T028-T031 - Tests First)

**Purpose**: Test database operations and external API integrations  
**Tool**: Vitest + Real Supabase client + Mocked Moralis API  
**Location**: `__tests__/integration/`  
**Coverage Target**: All CRUD operations with RLS validation

**Tests**:
- ✅ `portfolios.integration.test.ts` - Create → Read → Update → Delete flow
- ✅ `transactions.integration.test.ts` - Transaction CRUD + validation
- ✅ `prices.integration.test.ts` - Moralis API fetching (mocked)
- ✅ `snapshots.integration.test.ts` - Chart data generation

**What's Tested**:
- Row Level Security (RLS) policies prevent cross-user access
- Cascade deletes (portfolio deletion removes transactions)
- Data sanitization (XSS prevention in notes/descriptions)
- Stale price threshold (30 seconds)

---

### 5. **End-to-End (E2E) Tests** (Phase 2: T032-T034 - Tests First)

**Purpose**: Validate complete user journeys from `quickstart.md`  
**Tool**: Playwright (Chromium/Firefox/WebKit)  
**Location**: `__tests__/e2e/`  
**Coverage Target**: All 9 acceptance scenarios from quickstart.md

**Current Status**:
- ✅ **T032: Authentication Flow** (`auth-flow.spec.ts`) - **7/7 passing**
  - User registration with email/password
  - Login with existing credentials
  - Google OAuth flow initiation
  - Logout clears session
  - Validation errors display (invalid email, password mismatch)
  - Invalid login credentials error

**Upcoming**:
- ⏳ **T033: Portfolio Management** (`portfolio-create.spec.ts`)
  - Create portfolio → Add transactions → Verify holdings table
  - Edit/delete portfolio
  - View portfolio detail page

- ⏳ **T034: Real-time Updates** (`realtime-updates.spec.ts`)
  - Price ticker updates within 250ms
  - Stale price indicator after 31 seconds
  - Chart rendering with live data

**What E2E Tests Cover (Instead of Page Unit Tests)**:
- ✅ Full page rendering (login, register, dashboard)
- ✅ Form submissions with validation
- ✅ Navigation between pages
- ✅ Session management (login → logout → redirect)
- ✅ API integration (form → API → database → UI update)
- ✅ Error states (network failures, validation errors)

**Why E2E Over Page Unit Tests?**
- **More realistic**: Tests actual user behavior in real browser
- **Higher confidence**: Catches integration issues unit tests miss
- **Less brittle**: Doesn't test React component internals
- **Faster development**: One E2E test replaces multiple unit + integration tests

---

## Testing Strategy Decision Matrix

| Layer | What to Test | What NOT to Test | Tool | Why |
|-------|-------------|------------------|------|-----|
| **Unit** | Pure calculations (cost basis, P/L) | React components, API calls | Vitest | Fast, isolated, 100% coverage on critical math |
| **UI Component** | ShadCN primitives (variants, props) | Full pages, forms, navigation | RTL + Vitest | Smoke tests only for reusable primitives |
| **Contract** | API schemas (request/response) | Business logic, database | Vitest + Zod | Enforces API contracts, catches breaking changes |
| **Integration** | Database CRUD + RLS policies | UI rendering | Vitest + Supabase | Validates data layer + security |
| **E2E** | Complete user flows (login → dashboard) | Implementation details | Playwright | Real browser, real user behavior |

---

## Key Decisions & Rationale

### ✅ **Decision 1: E2E Tests Replace Page Component Tests**

**Rationale**:
- Pages like `/auth/login` and `/auth/register` are **integration points**, not isolated components
- Testing them in isolation requires heavy mocking (Router, Supabase, API calls)
- E2E tests provide **higher confidence** by testing the full stack
- Faster to write and maintain (one E2E test vs. multiple mocked unit tests)

**Example**:
Instead of:
```typescript
// ❌ Page unit test (brittle, lots of mocking)
describe('LoginPage', () => {
  it('submits form and redirects', () => {
    const mockRouter = { push: vi.fn() };
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    render(<LoginPage />, { router: mockRouter, fetch: mockFetch });
    // ... complex mocking setup ...
  });
});
```

We use:
```typescript
// ✅ E2E test (realistic, no mocking)
test('login with existing credentials', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/); // Real navigation!
});
```

---

### ✅ **Decision 2: Business Logic Extracted to `lib/`**

**Rationale**:
- Keep components "dumb" (presentation only)
- Move calculations to `lib/calculations/` for easy unit testing
- Move API logic to `lib/services/` for contract testing
- Pages become thin orchestration layers (tested via E2E)

**Example**:
```typescript
// lib/calculations/portfolio-value.ts (unit tested)
export function calculatePortfolioValue(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.market_value, 0);
}

// app/dashboard/page.tsx (E2E tested)
export default function DashboardPage() {
  const { data: holdings } = useHoldings();
  const totalValue = calculatePortfolioValue(holdings); // ✅ Pure function
  return <div>Total: ${totalValue}</div>;
}
```

---

### ✅ **Decision 3: Contract Tests with Real Server**

**Rationale**:
- Contract tests validate **HTTP layer** (routing, middleware, response format)
- Running against real Next.js server (localhost:3000) ensures routes work
- `TEST_MODE=true` bypasses email confirmation for fast test execution
- MSW mocks only external APIs (Moralis), not our own endpoints

**Setup**:
1. Terminal 1: `npm run dev` (loads `.env.local` with `TEST_MODE=true`)
2. Terminal 2: `npm test -- __tests__/contract/`

---

## Coverage Targets

| Test Type | Target | Current Status |
|-----------|--------|---------------|
| **Unit (Calculations)** | 100% | ✅ 100% (4/4 modules) |
| **UI Components** | Smoke tests only | ✅ 3/3 primitives |
| **Contract (APIs)** | 100% endpoints | ✅ 100% (15/15 endpoints) |
| **Integration** | All CRUD + RLS | ✅ 100% (4/4 modules) |
| **E2E (User Flows)** | All 9 scenarios | 🟡 1/3 (auth complete, portfolio pending) |
| **Overall Code Coverage** | ≥80% | 🟡 ~75% (E2E completion will raise to 85%+) |

---

## What We're NOT Testing (And Why)

| What | Why Not | Alternative |
|------|---------|-------------|
| ❌ Page components in isolation | Too much mocking, brittle | ✅ E2E tests with real browser |
| ❌ Next.js Router internals | Framework responsibility | ✅ E2E tests verify routing works |
| ❌ Supabase SDK methods | External library, trusted | ✅ Integration tests with real DB |
| ❌ ShadCN component internals | Third-party library | ✅ Smoke tests for variants |
| ❌ CSS styling details | Visual regression out of scope | ✅ Manual QA + Playwright screenshots |
| ❌ Email delivery | External service (Supabase) | ✅ `TEST_MODE=true` bypasses email |

---

## Test Execution Workflow

### Local Development
```bash
# 1. Start dev server with TEST_MODE=true
npm run dev

# 2. Run all tests (in separate terminal)
npm test                    # All unit + contract + integration
npm run test:e2e           # All E2E tests (requires server)
npm run test:ui            # UI component tests only

# 3. Cleanup test data
npm run test:cleanup       # Delete test users from Supabase
```

### CI/CD Pipeline (Future)
```yaml
# .github/workflows/test.yml
- name: Unit + Integration Tests
  run: npm test
- name: E2E Tests
  run: |
    npm run dev &          # Start server in background
    npx playwright test    # Run E2E
```

---

## Conclusion

**Our Testing Philosophy**:
1. **Unit test pure logic** (calculations, utilities)
2. **Contract test API schemas** (request/response validation)
3. **Integration test data layer** (database + external APIs)
4. **E2E test user flows** (real browser, real behavior)
5. **Skip page unit tests** (covered by E2E, avoids mocking hell)

**Current Progress**:
- ✅ Phase 2 (TDD Red): All tests created and initially failing
- ✅ Phase 4 (TDD Green): API endpoints + calculations implemented
- ✅ T032: Auth E2E tests **7/7 passing** (100%)
- ⏳ T033-T034: Portfolio/transaction E2E tests pending

**Next Steps**:
1. Complete T033: Portfolio management E2E tests
2. Complete T034: Real-time price update E2E tests
3. Achieve ≥80% overall code coverage
4. Document any deferred tests in `docs/TESTING.md`

---

**Questions or Concerns?** Review this document before committing to ensure we're aligned on the testing strategy! 🚀
