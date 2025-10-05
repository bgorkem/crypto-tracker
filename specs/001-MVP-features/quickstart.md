# Quickstart: Crypto Portfolio Tracker MVP

**Date**: 2025-10-04  
**Feature**: 001-MVP-features  
**Purpose**: Fast onboarding for developers & testers

## Prerequisites

- Node.js 20+ & npm 10+
- Supabase account (free tier)
- Moralis API key (free tier)
- Git

## 1-Minute Setup

```bash
# Clone & install
git clone <repo-url>
cd crypto-tracker
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase & Moralis credentials

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

Create `.env.local` in project root:

```env
# Supabase (from https://app.supabase.com/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Admin key (server-side only)

# Moralis (from https://admin.moralis.io/settings)
MORALIS_API_KEY=your-moralis-api-key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Setup

### Option A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install supabase --save-dev

# Link to your project
npx supabase link --project-ref <your-project-ref>

# Run migrations
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --project-id <project-id> > lib/db/schema.ts
```

### Option B: Supabase Dashboard

1. Go to https://app.supabase.com/project/_/sql
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Run SQL in the editor
4. Verify tables created in Table Editor

---

## Test Data Seeding

```bash
# Run seed script (creates sample user, portfolio, transactions)
npx supabase db seed

# Or manually via SQL Editor:
# Copy contents of supabase/seed.sql and execute
```

**Sample Credentials** (after seeding):
- Email: `demo@testuser.com`
- Password: `DemoPassword123!`

---

## Running Tests

```bash
# Unit tests (fast)
npm run test:unit

# Integration tests (requires DB)
npm run test:integration

# E2E tests (requires dev server running)
npm run test:e2e

# All tests
npm run test

# Coverage report
npm run test:coverage
```

**Expected Output** (after full setup):
```
✓ Unit tests: All passing (calculations, services, utils)
✗ Integration tests: FAILING (no implementation yet - TDD)
✗ E2E tests: FAILING (no pages implemented yet - TDD)
Coverage: ~0% (baseline established)
```

---

## Development Workflow

### 1. Start Dev Server
```bash
npm run dev
# Server: http://localhost:3000
# API routes: http://localhost:3000/api/*
```

### 2. Run Tests in Watch Mode
```bash
npm run test:watch
```

### 3. Type Checking
```bash
npm run type-check
```

### 4. Linting
```bash
npm run lint
npm run lint:fix
```

---

## Primary User Flow Testing

Follow acceptance scenarios from spec.md:

### Scenario 1: User Registration
1. Navigate to http://localhost:3000/register
2. Fill email/password or click "Sign in with Google"
3. Verify redirect to empty dashboard

**Expected**:
- Empty state with "Create Portfolio" CTA
- User session persisted (check DevTools → Application → LocalStorage)

---

### Scenario 2: Create Portfolio with Transactions
1. Click "Create Portfolio"
2. Enter name: "My Crypto Portfolio"
3. Add initial transactions (bulk entry):
   - BTC: BUY 0.5 @ $28,000 on 2025-10-01
   - ETH: BUY 10.0 @ $1,800 on 2025-10-01
4. Click "Create"

**Expected**:
- Redirect to portfolio detail page
- Holdings table shows 2 rows (BTC, ETH)
- Total value calculated within 1s
- Chart displays value over time

---

### Scenario 3: Add Transaction
1. On portfolio detail page, click "Add Transaction"
2. Fill form: ETH, BUY, 5.0, $1,850, 2025-10-04
3. Submit

**Expected**:
- Holdings table updates immediately (<1s)
- ETH row shows new quantity (15.0) and updated avg cost
- Portfolio total value recalculated
- Chart data point added

---

### Scenario 4: Sell Validation Error
1. Click "Add Transaction"
2. Fill form: BTC, SELL, 10.0 (exceeds 0.5 holding)
3. Submit

**Expected**:
- Form shows error: "Insufficient holdings. Current: 0.5 BTC"
- No database mutation
- User remains on form

---

### Scenario 5: Real-Time Price Updates
1. Open portfolio dashboard
2. Wait 30 seconds (polling interval)

**Expected**:
- Price ticker panel updates with latest prices
- Holdings table market values recalculate
- Update within 250ms of price data receipt
- No full page refresh

---

### Scenario 6: Edit Transaction
1. On transactions list, click Edit icon
2. Change quantity: 0.5 → 0.6
3. Save

**Expected**:
- Transaction updated in list
- Holdings recalculated (avg cost, quantity)
- Chart data regenerated

---

### Scenario 7: Delete Transaction
1. On transactions list, click Delete icon
2. Confirm deletion

**Expected**:
- Transaction removed from list
- Holdings recalculated
- Chart data regenerated
- Success toast notification

---

### Scenario 8: Portfolio Switching
1. Create second portfolio "Alt Portfolio"
2. Add different transactions
3. Click portfolio selector dropdown
4. Select first portfolio

**Expected**:
- Dashboard updates without full page reload
- Charts/tables reflect new portfolio data
- Loading spinner during data fetch
- URL updates with portfolio ID

---

### Scenario 9: Stale Price Indicator
1. Stop Moralis API polling (simulate outage)
2. Wait 31 seconds

**Expected**:
- Price ticker shows stale indicator badge
- Last updated timestamp frozen
- No errors thrown
- Dashboard remains interactive

---

## Troubleshooting

### Issue: "Supabase connection failed"
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Check Supabase project is not paused (free tier auto-pauses after 1 week inactivity)

### Issue: "Moralis API rate limit exceeded"
- Free tier: 40,000 requests/day
- With 30s polling + 30 symbols = ~86,400 requests/day (exceeds free tier)
- **Solution**: Increase polling interval to 60s OR upgrade to paid tier

### Issue: "Transaction validation error"
- Ensure symbol is in supported list (check `/api/symbols`)
- Verify executed_at is not in the future
- For SELL, check current holdings balance

### Issue: "Tests failing with DB errors"
- Run `npx supabase db reset` to recreate schema
- Verify migrations applied: `npx supabase db status`

---

## Architecture Quick Reference

```
User Request → Next.js Middleware (auth check)
  → App Router Page (React Server Component)
    → Server Action / API Route
      → lib/services/* (business logic)
        → lib/calculations/* (pure functions)
          → lib/db/client (Supabase)
            → PostgreSQL Database
      
External: lib/services/prices.ts → Moralis API
```

**Key Files**:
- `app/(dashboard)/portfolios/[id]/page.tsx` - Portfolio detail page
- `lib/services/portfolios.ts` - Portfolio CRUD operations
- `lib/calculations/holdings.ts` - Holding calculations (100% coverage)
- `components/portfolio/HoldingsTable.tsx` - Holdings display component

---

## Next Steps

1. ✅ Verify quickstart works (all 9 scenarios)
2. ⏩ Run `/tasks` to generate implementation tasks
3. 🔨 Execute tasks in TDD order (tests first, then implementation)
4. 📊 Monitor coverage dashboard: `npm run test:coverage`
5. 🚀 Deploy to Vercel: `vercel deploy`

---

## Support

- **Docs**: See `/specs/001-MVP-features/` directory
- **API Reference**: See `/specs/001-MVP-features/contracts/api-contracts.md`
- **Data Model**: See `/specs/001-MVP-features/data-model.md`
- **Design Decisions**: See `/specs/001-MVP-features/research.md`
