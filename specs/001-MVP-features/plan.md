
# Implementation Plan: Crypto Portfolio Tracker MVP

**Branch**: `001-MVP-features` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-MVP-features/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Real-time crypto portfolio tracker enabling users to register (email/password or Google OAuth), create multiple portfolios, record/edit/delete BUY/SELL transactions, view live price updates for 30+ cryptocurrencies, and track portfolio value over time with interactive charts. System automatically calculates holdings, cost basis, unrealized P/L, and provides real-time updates within 250ms of price changes.

## Technical Context
**Language/Version**: TypeScript 5.x (Next.js 15.5 with React 19)  
**Primary Dependencies**: Next.js 15.5, React 19, Supabase (PostgreSQL + Auth), Tailwind 4, ShadCN UI, Moralis API (crypto prices), Recharts/TradingView (charting)  
**Storage**: Supabase PostgreSQL for user/portfolio/transaction data; real-time subscriptions for price updates  
**Testing**: Vitest (unit), Playwright (E2E), MSW (API mocking), React Testing Library (components)  
**Target Platform**: Web (responsive desktop/mobile), deployed on Vercel/similar  
**Project Type**: Web application (Next.js frontend + API routes backend)  
**Performance Goals**: 
- Dashboard interactive load ≤ 2s
- Real-time price updates ≤ 250ms from receipt
- API p95 latency ≤ 200ms
- Chart rendering ≤ 500ms
**Constraints**: 
- Stale price data threshold: 30 seconds
- Pagination threshold: 100 transactions
- Google OAuth only (no other social providers for MVP)
- Base currency: USD only
**Scale/Scope**: 
- MVP: 30+ supported crypto symbols
- Expected load: <1000 concurrent users initially
- Transaction history: unlimited retention with pagination
- Real-time price updates: polling or WebSocket from Moralis

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality & Architecture Integrity**
- [x] Complexity budget defined (functions ≤10) - enforced via ESLint complexity rules
- [x] Layer boundaries identified (UI → services → data) - Next.js App Router (UI), Server Actions/API Routes (services), Supabase client (data)
- [x] Planned public API surface minimal & documented - REST API via Next.js routes, contract tests planned
- [x] Technical debt items (if any) captured - Deferred: bulk import limits, volatility highlights, multi-currency support

**Test-First Quality Assurance**
- [x] Test types enumerated (unit, integration, UI automation, contract) - Vitest (unit), Playwright (E2E), MSW (API contracts), RTL (components)
- [x] Critical calculation paths listed for 100% coverage - holding calculations, cost basis (FIFO/avg), portfolio valuation, P/L computations
- [x] Failing test scaffolds planned before coding - TDD workflow: contract tests → integration tests → implementation
- [x] Coverage target (≥80% overall) feasible - standard for TypeScript/React projects; 100% for calculation utilities

**User Experience Consistency**
- [x] Design system components reused (ShadCN/Tailwind tokens) - ShadCN UI primitives + Tailwind 4 design tokens throughout
- [x] Loading & error state patterns specified - Skeleton loaders, toast notifications, error boundaries per FR-024
- [x] Accessibility acceptance criteria drafted - Keyboard navigation, ARIA labels, chart text alternatives per NFR-006
- [x] Performance UX targets (≤2s initial, ≤200ms interactions) recorded - NFR-001 (2s load), NFR-002 (200ms API), NFR-003 (250ms updates)

**Performance & Real-Time Responsiveness**
- [x] p95 latency targets per endpoint defined (≤200ms) - NFR-002: CRUD operations, portfolio summary
- [x] Real-time update latency assumption (≤250ms) validated - NFR-003: price propagation from Moralis to UI
- [x] Indexing / caching considerations noted - DB indexes on portfolio_id, user_id, symbol; client-side React Query caching
- [x] Potential performance risks flagged early - Moralis API rate limits (NFR-004 deferred), chart rendering with large datasets (NFR-009: 500ms budget)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/                          # Next.js 15 App Router
├── (auth)/                  # Auth group routes
│   ├── login/
│   └── register/
├── (dashboard)/             # Protected dashboard routes
│   ├── layout.tsx          # Dashboard shell with nav
│   ├── page.tsx            # Main dashboard
│   ├── portfolios/         # Portfolio management
│   │   ├── [id]/          # Portfolio detail & transactions
│   │   └── new/
│   └── settings/
├── api/                     # API routes
│   ├── portfolios/
│   ├── transactions/
│   ├── prices/             # Price fetch/cache endpoints
│   └── webhooks/           # Moralis webhooks (if streaming)
├── layout.tsx              # Root layout
└── page.tsx                # Landing/marketing page

components/                   # React components
├── ui/                      # ShadCN primitives (button, card, etc.)
├── portfolio/               # Portfolio-specific components
│   ├── PortfolioCard.tsx
│   ├── PortfolioValueChart.tsx
│   └── HoldingsTable.tsx
├── transaction/
│   ├── TransactionForm.tsx
│   ├── TransactionList.tsx
│   └── BulkImport.tsx
└── dashboard/
    ├── PriceTickerPanel.tsx
    ├── AllocationChart.tsx
    └── StaleIndicator.tsx

lib/                         # Business logic & utilities
├── services/
│   ├── auth.ts             # Supabase auth wrappers
│   ├── portfolios.ts       # Portfolio CRUD
│   ├── transactions.ts     # Transaction operations
│   ├── prices.ts           # Moralis API client
│   └── holdings.ts         # Derived holding calculations
├── calculations/           # Pure calculation functions (100% coverage)
│   ├── cost-basis.ts       # Average cost, FIFO logic
│   ├── portfolio-value.ts  # Valuation formulas
│   └── unrealized-pl.ts    # P/L calculations
├── db/
│   ├── client.ts           # Supabase client singleton
│   ├── schema.ts           # TypeScript types from DB
│   └── migrations/         # SQL migration files
└── utils/
    ├── validation.ts       # Zod schemas
    └── formatting.ts       # Number/date formatters

__tests__/                   # Test files
├── unit/                    # Vitest unit tests
│   ├── calculations/       # 100% coverage target
│   └── services/
├── integration/             # API integration tests
│   └── api/
└── e2e/                     # Playwright E2E tests
    └── portfolio-flow.spec.ts

public/                      # Static assets
└── icons/                   # Crypto logos

supabase/                    # Supabase project files
├── migrations/              # DB migrations
└── seed.sql                # Development seed data
```

**Structure Decision**: Web application structure (Next.js 15 App Router). Frontend and backend colocated in a monolithic Next.js app with API routes. Supabase handles auth and database, Moralis provides external price data. Components follow atomic design principles (ui primitives → feature components → pages). Business logic isolated in `/lib/services` and `/lib/calculations` for testability.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each API endpoint (auth, portfolios, transactions, prices, charts) → contract test task **[Priority]**
- Each entity (Portfolio, Transaction, PriceEvent, Snapshot, AuditLog) → model creation task **[Priority]**
- Each calculation function (holdings, cost-basis, portfolio-value, P/L) → unit test + implementation **[Critical - 100% coverage]**
- Each user story from spec.md acceptance scenarios → E2E test task
- Implementation tasks to make tests pass (grouped by feature area)

**Ordering Strategy**:
1. **Phase 1**: Failing Tests (TDD Red)
   - Contract tests: API endpoint schemas, error codes, auth flows
   - Unit tests: Calculation utilities (holdings, cost-basis, P/L)
   - Integration tests: Database CRUD operations
   - E2E tests: 9 acceptance scenarios from quickstart.md

2. **Phase 2**: Foundation (TDD Green)
   - Database schema deployment (Supabase migrations)
   - Supabase client setup + type generation
   - Auth middleware (session validation)
   - Base API route handlers (error handling, CORS)

3. **Phase 3**: Core Features (TDD Refactor)
   - Auth flows (register, login, Google OAuth, logout)
   - Portfolio CRUD endpoints + services
   - Transaction CRUD endpoints + validation logic
   - Holding calculation engine (critical path)
   - Price fetching service (Moralis integration)
   - Chart data aggregation

4. **Phase 3.5**: Quality & Polish (Constitution Compliance)
   - Performance optimization (React Query caching, DB indexes)
   - Real-time updates (polling + Supabase subscriptions)
   - Accessibility audit (keyboard nav, ARIA labels, chart alternatives)
   - Error boundary + toast notifications
   - Loading states + skeleton loaders
   - Stale price indicator logic

5. **Phase 4**: UI Implementation
   - Landing page + marketing copy
   - Auth pages (register, login)
   - Dashboard shell (layout, nav, portfolio selector)
   - Portfolio detail page (holdings table, chart, transactions)
   - Transaction forms (create, edit, bulk import)
   - **Price ticker component** (T089 - FR-009, FR-011, FR-012, FR-015)
   - **Portfolio value chart component** (T090 - FR-013, FR-016)
   - **Dashboard integration with portfolio switcher** (T091 - FR-024, FR-025)
   - **Transaction filter controls** (T092 - FR-023)
   - Responsive mobile layout

**Dependency Order**:
- Database schema → Type generation → API routes → Services → UI components
- Auth middleware → All protected endpoints
- Price service → Holdings calculation → Portfolio valuation
- Prices API (T070) → PriceTicker component (T089) → Dashboard page (T091)
- Charts API (T072) → PortfolioValueChart component (T090) → Dashboard page (T091)
- Transactions API with filters (T060) → TransactionFilters component (T092)
- Calculation utilities (100% coverage) → Integration tests → E2E tests

**Complexity Tracking**:
- Target: All functions ≤ 10 cyclomatic complexity
- High-risk areas: `calculateHoldings` (nested loops), `validateSellTransaction` (conditional logic)
- Mitigation: Extract sub-functions, use early returns, simplify conditionals

**Performance Checkpoints**:
- After Phase 2: Benchmark DB query latency (target: ≤200ms p95)
- After Phase 3: Test holding calculation performance (target: <100ms for 100 txns)
- After Phase 4: Lighthouse audit (target: Performance ≥85, Accessibility 100)

---

## Progress Tracking

### Phase 0: Outline & Research
- [x] Technical context filled (no NEEDS CLARIFICATION remaining)
- [x] Stack selected (Next.js 15, Supabase, Moralis, Recharts, Vitest, Playwright)
- [x] Architecture decided (monolithic web app, event-sourced transactions, derived holdings)
- [x] research.md generated with 10 decision points documented

**Status**: ✅ COMPLETE

---

### Phase 1: Design & Contracts
- [x] data-model.md created (6 entities: User, Portfolio, Transaction, Holding, PriceEvent, Snapshot)
- [x] contracts/api-contracts.md created (15 endpoints across auth, portfolios, transactions, prices, charts)
- [x] quickstart.md created with 9 acceptance scenario tests
- [x] Constitutional check re-evaluated (all gates passing)

**Generated Artifacts**:
- `/specs/001-MVP-features/research.md`
- `/specs/001-MVP-features/data-model.md`
- `/specs/001-MVP-features/contracts/api-contracts.md`
- `/specs/001-MVP-features/quickstart.md`

**Status**: ✅ COMPLETE

---

### Constitution Re-Check (Post-Design)

**Code Quality & Architecture Integrity**: ✅ PASS
- Layering enforced: Next.js routes → services → calculations → DB
- Complexity risks identified and mitigated
- Public API surface documented in contracts

**Test-First Quality Assurance**: ✅ PASS
- Contract tests defined for all 15 endpoints
- Unit tests planned for 4 calculation modules (100% coverage target)
- E2E tests mapped from 9 acceptance scenarios
- TDD workflow documented in Phase 2 ordering

**User Experience Consistency**: ✅ PASS
- ShadCN components + Tailwind tokens enforced
- Loading/error states specified in quickstart scenarios
- Accessibility criteria: keyboard nav, ARIA, chart alternatives
- Performance targets reaffirmed (2s load, 200ms API, 250ms updates)

**Performance & Real-Time Responsiveness**: ✅ PASS
- DB indexes planned (portfolio_id, executed_at, symbol)
- Caching strategy: React Query 30s stale time
- Polling interval: 30s (aligns with stale threshold)
- Performance checkpoints scheduled after each phase

**Violations**: None

**Deferred Items** (Low Priority):
- Bulk import limit (recommend 100 txns)
- Volatility highlight UX (post-MVP)
- Moralis rate limit optimization (validate in Phase 3)

---

### Phase 2: Task Generation
**Status**: ⏳ PENDING - Awaiting `/tasks` command

**Blockers**: None

**Next Action**: Run `/tasks` to generate tasks.md from plan artifacts

---

## Summary

**Planning Status**: ✅ COMPLETE  
**Blockers**: None  
**Constitution Compliance**: ✅ ALL GATES PASSING  
**Ready for**: `/tasks` command

**Key Decisions**:
1. Stack: Next.js 15 + React 19 + TypeScript + Supabase + Moralis
2. Architecture: Monolithic web app with API routes, event-sourced transactions, derived holdings
3. Testing: Vitest (unit) + Playwright (E2E) + MSW (contracts)
4. Real-time: Hybrid polling (30s) + Supabase subscriptions
5. Charts: Recharts with 5 intervals (24h, 7D, 30D, 90D, All)

**Generated Artifacts**: 4 design docs + 1 implementation plan = 5 files

**Estimated Scope**: ~80 tasks across 4 phases (TDD workflow)

**Risk Factors**:
- Moralis API rate limits (free tier may be insufficient)
- Holding calculation complexity (mitigated with 100% test coverage)
- Real-time performance at scale (validated in Phase 3)

**Recommended Next Steps**:
1. Run `/tasks` to generate implementation task breakdown
2. Review tasks.md for accuracy and completeness
3. Begin Phase 1 (Failing Tests) execution
4. Monitor constitution compliance gates during implementation
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
