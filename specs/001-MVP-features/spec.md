# Feature Specification: Crypto Portfolio Tracker MVP

**Feature Branch**: `001-MVP-features`  
**Created**: 2025-10-04  
**Status**: Draft  
**Input**: Users can register (social login or email/password), create portfolios with initial positions, record/edit/delete buy/sell transactions, track value progress with realtime price updates from an external crypto price provider, automatic holding calculations, view 30+ major cryptocurrency prices, last 24hr changes, and portfolio value via charts in a dashboard.

## Execution Flow (main)
```
Template steps conceptually satisfied by drafting below. Ambiguities explicitly marked.
```

## Clarifications

### Session 2025-10-04
- Q: Which social authentication providers should be supported for user registration? → A: Google only
- Q: How long after creation should users be allowed to edit transactions? → A: Unrestricted (edit anytime)
- Q: At what transaction count should the system start using pagination or lazy loading? → A: 100 transactions
- Q: What should the default set of time intervals be for portfolio value charts? → A: 24 hours, 7 days, 30 days, 90 days, All time
- Q: When should the system consider price data "stale" and display a warning? → A: 30 seconds

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A new user signs up, creates a portfolio, adds initial BUY transactions for several assets, and immediately sees a dashboard with current prices, holdings quantities, cost basis, allocation percentages, 24h performance, and a value-over-time chart that updates as live price data arrives.

### Acceptance Scenarios
1. **Given** an unregistered visitor, **When** they register via email/password, **Then** their account is created and an empty dashboard with guidance is shown.
2. **Given** a user with no portfolios, **When** they create a portfolio with an initial set of transactions (bulk entry), **Then** holdings and total value appear within 1s.
3. **Given** a user with existing holdings, **When** they add a BUY transaction, **Then** the holding quantity, cost basis, and total portfolio value recalculate immediately (<1s perceived).
4. **Given** a user with a holding, **When** they submit a SELL exceeding available quantity, **Then** the system rejects it with a clear validation message and no state change.
5. **Given** a dashboard open, **When** new price data arrives, **Then** asset rows and total value update within 250ms of receipt.
6. **Given** a user editing a transaction, **When** they change quantity and save, **Then** the recalculated cost basis and unrealized P/L reflect the change.
7. **Given** a user deletes a transaction, **When** deletion succeeds, **Then** derived holdings and chart data are recalculated and displayed.
8. **Given** a user with multiple portfolios, **When** they switch the active portfolio, **Then** charts, tables, and metrics reflect the new selection with loading feedback.
9. **Given** a price feed outage, **When** the feed is unreachable, **Then** the dashboard shows a stale indicator and last-updated timestamp remains unchanged.

### Edge Cases
- SELL quantity > current holding → validation error, no mutation.
- Duplicate simultaneous submissions (double-click) → idempotent creation or prevention.
- Out-of-order price updates → latest timestamp wins; stale data ignored.
- Transaction timestamp in future → reject with explanation.
- Extremely volatile price swing (>20% in 5 min) → highlight affected assets (visual indicator) [NEEDS CLARIFICATION: highlight requirement?].
- Asset symbol not in supported list → reject with guidance to supported symbols list.
- Portfolio with zero holdings → show onboarding CTA (add transaction, import, learn). 

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST support user registration via email/password and Google OAuth.
- **FR-002**: System MUST support secure authentication and session handling for all protected routes.
- **FR-003**: System MUST allow users to create multiple portfolios (name required, description optional).
- **FR-004**: System MUST allow adding BUY and SELL transactions: symbol, quantity (>0), execution price (>0), timestamp (default now).
- **FR-005**: System MUST prevent SELL quantity greater than current holding.
- **FR-006**: System MUST allow editing transaction quantity, price, and timestamp at any time after creation.
- **FR-007**: System MUST allow deletion of transactions with immediate recalculation of derived holdings.
- **FR-008**: System MUST maintain derived holdings per (portfolio, symbol): total quantity, average cost, market value, unrealized P/L.
- **FR-009**: System MUST fetch price data for ≥30 supported symbols at configured interval or streaming feed.
- **FR-010**: System MUST compute total portfolio value = Σ (holding quantity × latest price) on each price or transaction change.
- **FR-011**: System MUST display 24h price change (absolute & percent) for each asset.
- **FR-012**: System must display warning/error indicator when price data is stale (>30 seconds old).
- **FR-013**: System MUST provide a value-over-time chart for at least 30 days with date range filters matching the dashboard intervals.
- **FR-014**: System MUST persist all user, portfolio, transaction data reliably with user scoping.
- **FR-015**: System MUST show last price update timestamp and stale indicator if no update for >30 seconds.
- **FR-016**: Dashboard must display portfolio value over time with chart/graph intervals: 24 hours, 7 days, 30 days, 90 days, All time
- **FR-017**: System MUST validate symbols against supported list; unsupported symbols rejected with error.
- **FR-018**: System MUST record an audit log (create/edit/delete transaction, portfolio changes).
- **FR-019**: System MUST support pagination or lazy loading when transaction count exceeds 100 transactions.
- **FR-020**: System MUST allow bulk initial transaction entry when creating a portfolio [NEEDS CLARIFICATION: maximum items?].
- **FR-021**: System MUST handle partial price feed failures (some symbols missing) by marking only affected rows as stale.
- **FR-022**: System MUST expose per-asset unrealized P/L and portfolio total P/L.
- **FR-023**: System MUST provide filtering by asset symbol and date range for transactions.
- **FR-024**: System MUST provide consistent loading, empty, error states for dashboard panels.
- **FR-025**: System MUST support portfolio switching without full page reload (state preservation for session).

### Non-Functional / Quality Requirements
- **NFR-001**: Dashboard interactive load ≤ 2s (median network conditions, warm cache).
- **NFR-002**: p95 API latency for transaction CRUD and portfolio summary ≤ 200ms.
- **NFR-003**: Real-time price propagation to UI ≤ 250ms from receipt.
- **NFR-004**: Price update interval/stream MUST avoid exceeding rate limits (no missed updates) [NEEDS CLARIFICATION: provider rate limit].
- **NFR-005**: Test coverage ≥ 80% lines overall; ≥100% critical calculation utilities.
- **NFR-006**: Accessibility: all interactive elements keyboard navigable; charts have textual summaries.
- **NFR-007**: Derived holding recalculation is atomic; no intermediate inconsistent states visible to user.
- **NFR-008**: Data model prevents double-counting (idempotency for duplicate submissions).
- **NFR-009**: Portfolio value chart renders in ≤ 500ms after data retrieval.
- **NFR-010**: Stale data indicator appears if no price update for > threshold (see FR-015).
- **NFR-011**: Error paths (feed outages, validation errors) must surface actionable guidance.
- **NFR-012**: Logging includes correlation IDs for user actions and price update batches.

### Key Entities *(include if feature involves data)*
- **User**: id, email, auth_provider, created_at
- **Portfolio**: id, user_id (FK), name, description, base_currency (default USD), created_at
- **Transaction**: id, portfolio_id (FK), symbol, side (BUY|SELL), quantity, price, executed_at, created_at, updated_at
- **Holding (derived)**: portfolio_id, symbol, total_quantity, average_cost, market_value, unrealized_pl (computed)
- **PriceEvent**: symbol, price, change_24h_abs, change_24h_pct, received_at
- **PortfolioValueSnapshot**: portfolio_id, total_value, captured_at (daily or event-triggered)


---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

### Constitutional Compliance
- [ ] Performance targets quantified (p95 latency ≤200ms, real-time ≤250ms)
- [ ] Test strategy covers unit, integration, UI automation, contract
- [ ] Accessibility & UX consistency criteria defined
- [ ] Critical financial calculations identified & test-covered

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
