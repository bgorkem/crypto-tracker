# crypto-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-11

## Active Technologies
- TypeScript 5.x (Next.js 15.5 with React 19) + Next.js 15.5, React 19, Supabase (PostgreSQL + Auth), Redis Cloud (caching), Tailwind 4, ShadCN UI, Moralis API (crypto prices), Recharts/TradingView (charting)

## Active Features
- **001-MVP-features**: Core portfolio tracking (complete)
- **002-redis-snapshot-optimization**: Redis caching for portfolio charts (merged to main)

## Project Structure
```
app/                    # Next.js App Router (pages + API routes)
components/             # React components (UI + feature components)
lib/                    # Business logic, utilities, API clients
__tests__/              # Test files (unit, integration, E2E)
supabase/migrations/    # Database schema migrations
specs/                  # Feature specifications (Spec Kit format)
docs/                   # Architecture & session documentation
```

## Commands
```bash
npm run dev             # Start development server (port 3000)
npm test                # Run unit tests (Vitest)
npm run test:e2e        # Run E2E tests (Playwright)
npm run lint            # Run ESLint
npm run build           # Build for production
```

## Code Style
- TypeScript 5.x: Follow standard conventions
- React 19: Use Server Components by default, Client Components with `'use client'`
- API Routes: Use standardized error handling via `lib/api-response.ts`

## Architecture Notes

**Chart Data Optimization** (Feature 002):
- Portfolio snapshots calculated on-demand via database function `calculate_portfolio_snapshots()`
- Redis cache layer (5-minute TTL) for chart data
- **No Supabase Edge Functions**: Daily snapshot generation removed (obsolete)
- Cache invalidation on transaction changes
- Target: <50ms cached, <500ms uncached, ≥80% cache hit rate

**Database**:
- Supabase PostgreSQL 15
- Composite primary key on `price_cache` table: `(symbol, price_date)`
- Historical price tracking via CoinGecko API

## Recent Changes
- 001-MVP-features: Core portfolio tracking complete (108/108 tasks)
- 002-redis-snapshot-optimization: Redis caching merged to main (38/40 tasks - 95%)
- **REMOVED**: Supabase Edge Functions (`supabase/functions/daily-snapshot/`) - replaced by Redis caching


<!-- MANUAL ADDITIONS START -->
## Development Workflow

**GitHub Spec Kit Integration**
- This workspace follows the [GitHub Spec Kit](https://github.com/github/spec-kit/) development workflow
- **REQUIRED**: At the start of each new session, read the Spec Kit workflow documentation and follow procedures accordingly
- All feature development should align with Spec Kit best practices:
  - Feature specifications in `specs/` directory
  - Test-driven development with clear test cases
  - Documentation updates alongside code changes
  - Proper branching strategy (feature branches from main)

## Development Server Rules

**CRITICAL: `npm run dev` Management**
- Always run `npm run dev` in a separate terminal to avoid interfering with other commands
- Before starting `npm run dev`, check if port 3000 is already in use:
  - Run: `lsof -ti:3000` to check for existing processes
  - If a process exists, terminate it: `kill -9 $(lsof -ti:3000)`
  - Then start the new dev server
- Use background mode (`isBackground: true`) when running `npm run dev` via `run_in_terminal`
- Never block other terminal operations with a running dev server

**Example workflow:**
```bash
# Check for existing process
lsof -ti:3000

# If found, kill it
kill -9 $(lsof -ti:3000)

# Start new dev server in background
npm run dev
```
<!-- MANUAL ADDITIONS END -->