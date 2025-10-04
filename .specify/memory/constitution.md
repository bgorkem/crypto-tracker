<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles: (initial adoption)
Added sections: Engineering Standards, Workflow & Quality Gates
Removed sections: None
Templates requiring updates:
	- .specify/templates/plan-template.md ✅ (Constitution Check checklist aligned)
	- .specify/templates/spec-template.md ✅ (Added constitutional compliance checklist)
	- .specify/templates/tasks-template.md ✅ (Added performance & quality tasks)
Follow-up TODOs: None
-->

# Crypto Tracker Constitution

## Core Principles

### I. Code Quality & Architecture Integrity
All source code MUST follow SOLID principles, enforce strict TypeScript typing (no `any` in
production code except with explicit `// @justified` comment), keep cyclomatic complexity ≤ 10 
per function, and limit file length to ≤ 400 logical lines (excluding tests). Public modules 
MUST expose minimal surface areas; dead code MUST be removed before merge. Architectural 
boundaries (UI ↔ services ↔ data access) MUST be explicit and dependency direction enforced.

**Rationale**: Enforced structure and type safety reduce regressions in a fast‑changing crypto 
domain and enable safe refactoring as features scale.

### II. Test-First Quality Assurance (NON-NEGOTIABLE)
All functional code MUST be preceded by failing tests (Red-Green-Refactor). Minimum coverage: 
80% overall, 100% for pure utility modules, and 100% of critical pricing & portfolio 
calculation paths. Each feature MUST include: unit tests, integration tests (API + DB), UI 
automation for primary user flows, and contract tests for external service boundaries.

**Rationale**: Financial data accuracy and system trust depend on comprehensive, intentional 
test design before implementation.

### III. User Experience Consistency & Clarity
UI components MUST use a shared design system (ShadCN + Tailwind tokens). Navigation patterns, 
loading states, error displays, and theming MUST remain consistent across pages. All interactive 
elements MUST provide accessible names and keyboard operability. Core screens MUST reach usable 
interactive state ≤ 2s (cold load) and dynamic interactions (tab switches, modal opens) ≤ 200ms. 
User-facing errors MUST provide actionable next steps (retry, adjust, support link).

**Rationale**: Consistency and speed reduce cognitive friction and prevent costly decision 
errors during volatile market conditions.

### IV. Performance & Real-Time Responsiveness
API requests MUST meet p95 latency ≤ 200ms (excluding third-party upstream delays). Real-time 
price and balance updates MUST propagate to the UI within 250ms of source event receipt. Pages 
MUST avoid layout shift beyond CLS 0.1 and maintain Lighthouse Performance ≥ 85 in staging. 
Database queries impacting critical dashboards MUST have indexed query plans verified.

**Rationale**: Timely, stable data presentation is essential for user trust and timely portfolio 
adjustments in 24/7 markets.

## Engineering Standards

### Technology & Stack
- Primary stack: Next.js 15.5 (React 19), TypeScript, Supabase (PostgreSQL + Auth), Tailwind 4, ShadCN UI.
- Only introduce new core dependencies with documented evaluation (benefit, risk, alternatives).
- All external APIs MUST have version pinning and retry/backoff policies.

### Observability & Reliability
- Structured logging (JSON) for server functions; no silent failures.
- Critical domain operations (portfolio valuation, price stream subscription) MUST emit metrics: latency, error rate, update frequency.
- Errors MUST be captured with correlation identifiers for cross-layer tracing.

### Security & Data Protection
- Authentication MUST use Supabase Auth—no custom password flows.
- Secrets NEVER hardcoded; environment management via platform provider.
- PII (if later introduced) MUST be classified and access-limited; current scope: minimal user profile + email.

### Change Control
- Feature flags for risky or progressive enhancements; default off until validated.
- Backward incompatible API changes REQUIRE migration notes + version bump.

## Workflow & Quality Gates

### Pre-Planning
- Specs MUST state measurable performance and UX targets referencing constitutional metrics.
- Ambiguities MUST be resolved (/clarify) before implementation planning.

### Pull Request Requirements
- Checklist MUST include: tests added, coverage threshold met, performance risk assessed, accessibility validated (aXe / eslint-plugin-jsx-a11y clean).
- No PR merges with failing CI stages or skipped tests.

### Continuous Integration Gates
1. Lint & type check (zero errors)  
2. Unit + integration + UI automation suites (100% pass)  
3. Coverage report ≥ 80% lines / 75% branches (hard fail below)  
4. Performance smoke: representative endpoint + page load baseline regression < 10%  
5. Security scan: no Critical/High issues  

### Release Readiness
- Changelog entry REQUIRED (user-impact + internal notes).
- Rollback plan documented for each production deployment.

## Governance

This constitution supersedes all other local conventions. Violations MUST be remediated prior 
to merge unless an explicit, time-boxed waiver (< 14 days) is recorded in a tracked issue with 
mitigation steps. Waivers auto-expire; unresolved ones trigger escalation.

### Amendment Process
1. Draft proposal summarizing required change + rationale (include risk & compatibility impact).
2. Classify version bump (PATCH/MINOR/MAJOR) per semantic governance rules.
3. Obtain approval from at least one maintainer + one QA or product stakeholder.
4. Update constitution file with Sync Impact Report + propagate template impacts.

### Versioning Policy
- MAJOR: Principle removal/redefinition reducing guarantees.
- MINOR: New principle, new mandatory gate, or strengthened metric.
- PATCH: Wording clarity, non-normative examples, typo fixes.

### Compliance Reviews
- Quarterly audit: sample 3 recent features for adherence (tests, performance, accessibility).
- Non-compliance generates actionable remediation tickets within one sprint.

**Version**: 1.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-04